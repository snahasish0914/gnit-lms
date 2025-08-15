
import { auth, db, provider, signInWithPopup, onAuthStateChanged, signOut, collection, doc, setDoc, getDocs, orderBy, query, serverTimestamp } from './firebase.js';
import { ymd } from './utils.js';

// 2) Add admin emails here
const ADMIN_EMAILS = [
  "snahasishdey143@gmail.com"
];

const logoutBtn = document.getElementById('logoutBtn');
logoutBtn.addEventListener('click', () => signOut(auth));

function ensureAdmin(user){
  const email = user?.email || '';
  const ok = ADMIN_EMAILS.includes(email);
  if(!ok){
    alert('You are not authorized for admin. Redirecting to student portal.');
    window.location.href = 'index.html';
  }
}

onAuthStateChanged(auth, async (user) => {
  if(!user){
    await signInWithPopup(auth, provider);
  } else {
    ensureAdmin(user);
    await loadSchedule();
  }
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  const d = document.getElementById('classDate').value;
  const c = parseInt(document.getElementById('classCount').value || '0', 10);
  if(!d || c<1){ alert('Pick a date and a class count ≥ 1'); return; }
  try{
    await setDoc(doc(db,'schedule', d), { date:d, classCount:c, updatedAt: Date.now() });
    await loadSchedule();
    alert('Saved!');
  }catch(e){
    console.error(e);
    alert('Error saving schedule: '+ e.message);
  }
});

async function loadSchedule(){
  const tbody = document.querySelector('#scheduleTable tbody');
  tbody.innerHTML = '';
  const q = query(collection(db,'schedule'), orderBy('date','asc'));
  const snap = await getDocs(q);
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
