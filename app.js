
import { auth, db, provider, signInWithPopup, onAuthStateChanged, signOut, collection, doc, setDoc, getDoc, getDocs, query, orderBy } from './firebase.js';
import { fmtPct } from './utils.js';

const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');

loginBtn.addEventListener('click', () => signInWithPopup(auth, provider));
logoutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if(user){
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    userName.textContent = user.displayName || user.email;
    await ensureStudentDoc(user);
    await renderDashboard(user);
  }else{
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    userName.textContent = '';
    setKpis(0,0);
    renderCalendar([]); // empty calendar
  }
});

async function ensureStudentDoc(user){
  const ref = doc(db, 'students', user.uid);
  const snap = await getDoc(ref);
  if(!snap.exists()){
    await setDoc(ref, { uid: user.uid, name: user.displayName || '', email: user.email || '' });
  }
}

function setKpis(total, attended){
  document.getElementById('kpiTotal').textContent = total;
  document.getElementById('kpiAttended').textContent = attended;
  const pct = total ? (attended/total)*100 : 0;
  document.getElementById('kpiPct').textContent = fmtPct(pct);
}

// Build events for FullCalendar from Firestore
async function renderDashboard(user){
  // Load all schedule documents
  const schedQ = query(collection(db,'schedule'), orderBy('date','asc'));
  const schedSnap = await getDocs(schedQ);

  // For each schedule date, read attendance for this user
  const events = [];
  let totalAll = 0;
  let attendedAll = 0;

  for (const d of schedSnap.docs){
    const date = d.id; // YYYY-MM-DD
    const total = d.data().classCount || 0;
    if(total <= 0) continue;

    totalAll += total;

    const userAttRef = doc(db,'attendance', date, 'students', user.uid);
    const attSnap = await getDoc(userAttRef);
    const attended = attSnap.exists() ? (attSnap.data().attendedClasses || 0) : 0;
    attendedAll += attended;

    // Color logic
    let color = '#ef4444'; // red none
    if(attended === total) color = '#10b981'; // green full
    else if(attended > 0 && attended < total) color = '#f59e0b'; // yellow partial

    events.push({
      title: `${attended}/${total}`,
      start: date,
      allDay: true,
      display: 'background', // color the background of the day cell
      backgroundColor: color,
      interactive: false
    });
  }

  setKpis(totalAll, attendedAll);
  renderCalendar(events);
}

function renderCalendar(events){
  const el = document.getElementById('calendar');
  el.innerHTML = '';
  const calendar = new FullCalendar.Calendar(el, {
    initialView: 'dayGridMonth',
    height: 'auto',
    firstDay: 0,
    headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
    events,
    dayCellContent: function(arg) {
      // find event for this day
      const match = events.find(e => e.start === arg.dateStr);
      let extra = '';
      if (match) {
        extra = `<div style="font-size:11px; font-weight:600; color:#000000;">
                   ${match.title}
                 </div>`;
      }
      return { html: `<div>${arg.dayNumberText}${extra}</div>` };
    },
    dateClick: async (info) => {
  const d = info.dateStr;

  // Show modal immediately with loading text
  document.getElementById("modalTitle").textContent = `Classes on ${d}`;
  document.getElementById("modalContent").innerHTML = `<div class="loader"></div><p style="text-align:center;">Loading...</p>`;
  document.getElementById("classDetailsModal").style.display = "block";

  try {
    // Fetch schedule
    const schedDoc = await getDoc(doc(db, 'schedule', d));
    if (!schedDoc.exists()) {
      document.getElementById("modalContent").innerHTML = `<p>No classes scheduled.</p>`;
      return;
    }
    const data = schedDoc.data();

    // Fetch student attendance once
    const attSnap = await getDoc(doc(db, 'attendance', d, 'students', auth.currentUser.uid));
    const attData = attSnap.exists() ? attSnap.data() : null;

    let html = `
      <table class="table">
        <thead><tr><th>Period</th><th>Subject</th><th>Faculty</th><th>Attendance</th></tr></thead>
        <tbody>
    `;

    for (const p of data.periods) {
      let status = "Absent";
      if (attData) {
        status = (attData.attendedClasses && attData.attendedClasses >= p.period) ? "Present" : "Absent";
      }
      html += `<tr><td>${p.period}</td><td>${p.subject}</td><td>${p.faculty}</td><td>${status}</td></tr>`;
    }

    html += `</tbody></table>`;
    document.getElementById("modalContent").innerHTML = html;

  } catch (e) {
    document.getElementById("modalContent").innerHTML = `<p style="color:red;">Error loading data: ${e.message}</p>`;
  }
}
  });
  calendar.render();
}
