
import { auth, db, onAuthStateChanged, signOut, collection, doc, setDoc, getDoc, getDocs, orderBy, query } from './firebase.js';

const ADMIN_EMAILS = ["snahasishdey141@gmail.com"]; // replace with your admin email(s)

document.getElementById('logoutBtn').addEventListener('click', () => {
  signOut(auth).then(()=> window.location.href='index.html')
               .catch(e=> alert('Logout failed: '+e.message));
});

function ensureAdmin(user){
  const email = user?.email || '';
  if(!ADMIN_EMAILS.includes(email)){
    alert('You are not authorized for admin. Redirecting to student portal.');
    window.location.href = 'index.html';
  }
}

onAuthStateChanged(auth, async (user) => {
  if(!user){ window.location.href = 'index.html'; }
  else { ensureAdmin(user); await loadSchedule(); }
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  const d = document.getElementById('classDate').value;
  const c = parseInt(document.getElementById('classCount').value || '0', 10);
  if(!d || c<1){ alert('Pick a date and a class count ≥ 1'); return; }
  try{
    await setDoc(doc(db,'schedule', d), { date:d, classCount:c, updatedAt: Date.now() });
    await loadSchedule(); alert('Saved!');
  }catch(e){ alert('Error saving schedule: '+ e.message); }
});

async function loadSchedule(){
  const tbody = document.querySelector('#scheduleTable tbody');
  tbody.innerHTML = '';
  const qy = query(collection(db,'schedule'), orderBy('date','asc'));
  const snap = await getDocs(qy);
  let total = 0;
  snap.forEach(docu => {
    const row = docu.data();
    total += (row.classCount || 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${row.date}</td><td>${row.classCount}</td>`;
    tbody.appendChild(tr);
  });
  document.getElementById('totalClasses').textContent = `${total} total classes`;
}

// ===== Attendance marking =====
const attendanceDateEl = document.getElementById('attendanceDate');
const attendanceTotalEl = document.getElementById('attendanceTotal');
const loadStudentsBtn = document.getElementById('loadStudentsBtn');
const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');
const attendanceTBody = document.querySelector('#attendanceTable tbody');

loadStudentsBtn.addEventListener('click', async () => {
  const date = attendanceDateEl.value;
  if(!date){ alert('Pick a date first'); return; }
  const schedDoc = await getDoc(doc(db,'schedule', date));
  const total = schedDoc.exists() ? (schedDoc.data().classCount || 0) : 0;
  attendanceTotalEl.value = total;

  attendanceTBody.innerHTML = '';
  const studentsSnap = await getDocs(collection(db,'students'));
  studentsSnap.forEach(sdoc => {
    const s = sdoc.data();
    const inputId = `att-${sdoc.id}`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.name || 'Unnamed'}</td><td>${s.email || ''}</td>
      <td><input type="number" min="0" max="${total}" id="${inputId}" placeholder="0"></td>`;
    attendanceTBody.appendChild(tr);
  });

  const existingSnap = await getDocs(collection(db, 'attendance', date, 'students'));
  existingSnap.forEach(edoc => {
    const data = edoc.data();
    const el = document.getElementById(`att-${edoc.id}`);
    if(el){ el.value = data.attendedClasses ?? 0; }
  });
});

saveAttendanceBtn.addEventListener('click', async () => {
  const date = attendanceDateEl.value;
  const total = parseInt(attendanceTotalEl.value || '0', 10);
  if(!date){ alert('Pick a date first'); return; }

  const studentsSnap = await getDocs(collection(db,'students'));
  const ops = [];
  for (const sdoc of studentsSnap.docs){
    const el = document.getElementById(`att-${sdoc.id}`);
    if(!el) continue;
    let attended = parseInt(el.value || '0', 10);
    if(attended < 0) attended = 0;
    if(attended > total) attended = total;

    ops.push(setDoc(doc(db,'attendance', date, 'students', sdoc.id), {
      uid: sdoc.id,
      name: sdoc.data().name || '',
      email: sdoc.data().email || '',
      attendedClasses: attended,
      totalClasses: total,
      updatedAt: Date.now()
    }, { merge: true }));
  }
  try{ await Promise.all(ops); alert('Attendance saved.'); }
  catch(e){ alert('Error saving attendance: '+ e.message); }
});
