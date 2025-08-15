
import { auth, db, provider, signInWithPopup, onAuthStateChanged, signOut, collection, doc, setDoc, getDocs, query, where, orderBy } from './firebase.js';

const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const todayBadge = document.getElementById('todayBadge');

loginBtn.addEventListener('click', () => signInWithPopup(auth, provider));
logoutBtn.addEventListener('click', () => signOut(auth));

function fmtPct(n){ return (isNaN(n)? 0 : Math.round(n)) + '%'; }

function ymd(d){
  const dt = (d instanceof Date)? d : new Date(d);
  const mm = String(dt.getMonth()+1).padStart(2,'0');
  const dd = String(dt.getDate()).padStart(2,'0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

const today = ymd(new Date());
todayBadge.textContent = `Today: ${today}`;

onAuthStateChanged(auth, async (user) => {
  if(user){
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    userName.textContent = user.displayName || user.email;
    await renderFor(user);
  }else{
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    userName.textContent = '';
    await renderFor(null);
  }
});

async function renderFor(user){
  const tbody = document.querySelector('#daysTable tbody');
  tbody.innerHTML = '';
  const schedQ = query(collection(db,'schedule'), orderBy('date','asc'));
  const schedSnap = await getDocs(schedQ);
  const schedule = [];
  let totalClasses = 0;
  schedSnap.forEach(d => {
    const row = d.data();
    totalClasses += (row.classCount || 0);
    schedule.push(row);
  });

  let attendedDates = new Set();
  if(user){
    const attQ = query(collection(db,'attendance'), where('uid','==',user.uid));
    const attSnap = await getDocs(attQ);
    attSnap.forEach(d => attendedDates.add(d.data().date));
  }

  let attendedClasses = 0;

  for(const row of schedule){
    const marked = attendedDates.has(row.date);
    if(marked){ attendedClasses += (row.classCount || 0); }

    const tr = document.createElement('tr');
    const status = marked ? '<span class="badge">Present</span>' : '<span class="small">Not Marked</span>';
    const disabled = (!user || marked || row.date>today) ? 'disabled' : '';
    tr.innerHTML = `
      <td>${row.date}</td>
      <td>${row.classCount}</td>
      <td>${status}</td>
      <td>
        <button class="btn success" data-date="${row.date}" ${disabled}>Mark Present</button>
      </td>`;
    tbody.appendChild(tr);
  }

  if(user){
    const pct = totalClasses ? (attendedClasses/totalClasses)*100 : 0;
    document.getElementById('kpiTotal').textContent = totalClasses;
    document.getElementById('kpiAttended').textContent = attendedClasses;
    document.getElementById('kpiPct').textContent = fmtPct(pct);
  }else{
    document.getElementById('kpiTotal').textContent = totalClasses;
    document.getElementById('kpiAttended').textContent = 0;
    document.getElementById('kpiPct').textContent = '0%';
  }

  // attach listeners
  tbody.querySelectorAll('button[data-date]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if(!auth.currentUser){ alert('Please sign in.'); return; }
      const d = btn.getAttribute('data-date');
      try{
        await setDoc(doc(db,'attendance', `${auth.currentUser.uid}_${d}`), {
          uid: auth.currentUser.uid,
          date: d,
          status: 'present',
          timestamp: Date.now()
        });
        await renderFor(auth.currentUser);
      }catch(e){
        console.error(e);
        alert('Error marking present: '+ e.message);
      }
    });
  });
}
