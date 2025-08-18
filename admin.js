
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

// ===== Add new period row =====
const addRowBtn = document.getElementById('addRowBtn');
const classDetailsTable = document.getElementById('classDetailsTable').querySelector('tbody');

addRowBtn.addEventListener('click', () => {
  const rowCount = classDetailsTable.children.length + 1;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="number" min="1" value="${rowCount}"></td>
    <td><input type="text" placeholder="Subject"></td>
    <td><input type="text" placeholder="Faculty"></td>
  `;
  classDetailsTable.appendChild(tr);
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  const d = document.getElementById('classDate').value;
  if(!d){ alert('Pick a date'); return; }

  // collect class details
  const rows = document.querySelectorAll('#classDetailsTable tbody tr');
  const periods = [];
  rows.forEach(r => {
    const p = parseInt(r.children[0].querySelector('input').value || '0',10);
    const subject = r.children[1].querySelector('input').value.trim();
    const faculty = r.children[2].querySelector('input').value.trim();
    if(p && subject && faculty){
      periods.push({ period:p, subject, faculty });
    }
  });

  try{
    await setDoc(doc(db,'schedule', d), {
      date: d,
      classCount: periods.length,
      periods,
      updatedAt: Date.now()
    });
    await loadSchedule();
    alert('Saved!');
  }catch(e){ alert('Error saving schedule: '+ e.message); }
});

async function loadSchedule(){
  const tbody = document.querySelector('#scheduleTable tbody');
  const toggleBtn = document.getElementById('toggleScheduleBtn');
  tbody.innerHTML = '';

  const qy = query(collection(db,'schedule'), orderBy('date','asc'));
  const snap = await getDocs(qy);

  let total = 0;
  const rows = [];
  snap.forEach(docu => {
    const row = docu.data();
    total += (row.classCount || 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${row.date}</td><td>${row.classCount}</td>`;
    rows.push(tr);
  });

  document.getElementById('totalClasses').textContent = `${total} total classes`;

  // limit display to first 10
  const limit = 5;
  rows.forEach((tr, i) => {
    if (i < limit) tbody.appendChild(tr);
  });

  // Show toggle button only if more than limit
  if (rows.length > limit) {
    toggleBtn.style.display = 'inline-block';
    let expanded = false;
    toggleBtn.textContent = "Show More";

    toggleBtn.onclick = () => {
      expanded = !expanded;
      tbody.innerHTML = '';
      if (expanded) {
        rows.forEach(tr => tbody.appendChild(tr));
        toggleBtn.textContent = "Show Less";
      } else {
        rows.slice(0, limit).forEach(tr => tbody.appendChild(tr));
        toggleBtn.textContent = "Show More";
      }
    };
  } else {
    toggleBtn.style.display = 'none';
  }
}

// ===== Attendance marking =====
const attendanceDateEl = document.getElementById('attendanceDate');
const attendanceTotalEl = document.getElementById('attendanceTotal');
const loadStudentsBtn = document.getElementById('loadStudentsBtn');
const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');
const attendanceTBody = document.getElementById('attendanceTBody');

loadStudentsBtn.addEventListener('click', async () => {
  const date = attendanceDateEl.value;
  if (!date) { alert('Pick a date first'); return; }

  const schedDoc = await getDoc(doc(db,'schedule', date));
  const total = schedDoc.exists() ? (schedDoc.data().classCount || 0) : 0;
  attendanceTotalEl.value = total;

  attendanceTBody.innerHTML = '';

  // Load existing attendance first
  const existingSnap = await getDocs(collection(db, 'attendance', date, 'students'));
  const existing = {};
  existingSnap.forEach(edoc => { existing[edoc.id] = edoc.data(); });

  // Load all students
  const studentsSnap = await getDocs(collection(db,'students'));
  studentsSnap.forEach(sdoc => {
    const s = sdoc.data();
    const id = sdoc.id;
    const prev = existing[id];
    const tr = document.createElement('tr');

    if (prev) {
      // Already has attendance → show value + pencil
      tr.innerHTML = `
        <td>${s.name || 'Unnamed'}</td>
        <td>${s.email || ''}</td>
        <td>
          <span id="att-val-${id}">${prev.attendedClasses}/${prev.totalClasses}</span>
          <button class="edit-btn" data-id="${id}" style="margin-left:8px">✏️</button>
        </td>`;
    } else {
      // No attendance yet → show input
      tr.innerHTML = `
        <td>${s.name || 'Unnamed'}</td>
        <td>${s.email || ''}</td>
        <td><input type="number" min="0" max="${total}" id="att-${id}" placeholder="0"></td>`;
    }

    attendanceTBody.appendChild(tr);
  });

  // Enable editing when pencil clicked
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.target.dataset.id;
      const span = document.getElementById(`att-val-${id}`);
      const current = span.textContent.split('/')[0]; // attended
      span.outerHTML = `<input type="number" min="0" max="${total}" id="att-${id}" value="${current}">`;
      e.target.remove(); // remove pencil
    });
  });
});

saveAttendanceBtn.addEventListener('click', async () => {
  const date = attendanceDateEl.value;
  const total = parseInt(attendanceTotalEl.value || '0', 10);
  if (!date) { alert('Pick a date first'); return; }

  const studentsSnap = await getDocs(collection(db,'students'));
  const ops = [];

  for (const sdoc of studentsSnap.docs){
    const el = document.getElementById(`att-${sdoc.id}`);
    let attended;

    if (el) {
      attended = parseInt(el.value || '0', 10);
      if (attended < 0) attended = 0;
      if (attended > total) attended = total;
    } else {
      // keep old value if no new input
      const prev = await getDoc(doc(db,'attendance', date, 'students', sdoc.id));
      attended = prev.exists() ? (prev.data().attendedClasses || 0) : 0;
    }

    ops.push(setDoc(doc(db,'attendance', date, 'students', sdoc.id), {
      uid: sdoc.id,
      name: sdoc.data().name || '',
      email: sdoc.data().email || '',
      attendedClasses: attended,
      totalClasses: total,
      updatedAt: Date.now()
    }, { merge: true }));
  }

  try { await Promise.all(ops); alert('Attendance saved.'); }
  catch(e){ alert('Error saving attendance: '+ e.message); }
});
