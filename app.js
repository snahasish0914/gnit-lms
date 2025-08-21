
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
    await loadMonthEvents(new Date().getFullYear(), new Date().getMonth(), user);
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

let currentYear, currentMonth;

// Main render function (draws calendar grid for current month)
function renderCalendar(events) {
  const el = document.getElementById("calendar");
  el.innerHTML = "";

  if (currentYear === undefined || currentMonth === undefined) {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
  }

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  // Map events by date
  const eventMap = {};
  events.forEach(e => { eventMap[e.start] = e; });

  // === Header with navigation ===
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.marginBottom = "8px";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "◀";
  prevBtn.className = "btn secondary";
  prevBtn.onclick = () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    loadMonthEvents(currentYear, currentMonth); // fetch new month
  };

  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.textContent = new Date(currentYear, currentMonth).toLocaleString("default", { month: "long", year: "numeric" });

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "▶";
  nextBtn.className = "btn secondary";
  nextBtn.onclick = () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    loadMonthEvents(currentYear, currentMonth); // fetch new month
  };

  header.appendChild(prevBtn);
  header.appendChild(title);
  header.appendChild(nextBtn);
  el.appendChild(header);

  // === Grid ===
  const weekdays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(7, 1fr)";
  grid.style.gap = "4px";
  el.appendChild(grid);

  weekdays.forEach(d => {
    const div = document.createElement("div");
    div.textContent = d;
    div.style.fontWeight = "600";
    div.style.textAlign = "center";
    grid.appendChild(div);
  });

  // Empty cells before first day
  for (let i = 0; i < startWeekday; i++) {
    const empty = document.createElement("div");
    grid.appendChild(empty);
  }

  // Days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const cell = document.createElement("div");
    cell.textContent = day;
    cell.style.padding = "6px";
    cell.style.borderRadius = "6px";
    cell.style.textAlign = "center";
    cell.style.cursor = "pointer";

    if (eventMap[dateStr]) {
      const e = eventMap[dateStr];
      cell.style.background = e.backgroundColor;
      cell.style.color = "#fff";
      cell.title = e.title; // tooltip
    } else {
      cell.style.background = "#f3f4f6"; // light gray
    }

    // Click → open modal
    cell.addEventListener("click", () => {
      document.getElementById("modalTitle").textContent = `Classes on ${dateStr}`;
      document.getElementById("modalContent").innerHTML = "<p>Loading...</p>";
      document.getElementById("classDetailsModal").style.display = "block";
      loadDayDetails(dateStr);
    });

    grid.appendChild(cell);
  }
}
async function loadMonthEvents(year, month) {
  const start = `${year}-${String(month+1).padStart(2,"0")}-01`;
  const endDate = new Date(year, month+1, 0).getDate();
  const end = `${year}-${String(month+1).padStart(2,"0")}-${endDate}`;

  // Query schedule for this month only
  const q = query(
    collection(db,'schedule'),
    orderBy('date','asc')
  );
  const snap = await getDocs(q);

  const events = [];
  let totalAll = 0;
  let attendedAll = 0;

  for (const d of snap.docs) {
    const date = d.id;
    if (date < start || date > end) continue; // skip outside month

    const total = d.data().classCount || 0;
    if (total <= 0) continue;

    totalAll += total;

    const userAttRef = doc(db,'attendance', date, 'students', auth.currentUser.uid);
    const attSnap = await getDoc(userAttRef);
    const attended = attSnap.exists() ? (attSnap.data().attendedClasses || 0) : 0;
    attendedAll += attended;

    // Color logic
    let color = '#ef4444'; // red = absent
    if (attended === total) color = '#10b981'; // green full
    else if (attended > 0 && attended < total) color = '#f59e0b'; // yellow partial

    events.push({
      title: `${attended}/${total}`,
      start: date,
      backgroundColor: color
    });
  }

  setKpis(totalAll, attendedAll);
  renderCalendar(events);
}
async function loadDayDetails(dateStr) {
  try {
    const schedDoc = await getDoc(doc(db, 'schedule', dateStr));
    if (!schedDoc.exists()) {
      document.getElementById("modalContent").innerHTML = `<p>No classes scheduled.</p>`;
      return;
    }
    const data = schedDoc.data();
    const attSnap = await getDoc(doc(db, 'attendance', dateStr, 'students', auth.currentUser.uid));
    const attData = attSnap.exists() ? attSnap.data() : null;

    let html = `
      <table class="table">
        <thead><tr><th>Period</th><th>Subject</th><th>Faculty</th><th>Status</th></tr></thead>
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
    document.getElementById("modalContent").innerHTML = `<p style="color:red;">Error: ${e.message}</p>`;
  }
}
async function loadMonthEvents(year, month) {
  const start = `${year}-${String(month+1).padStart(2,"0")}-01`;
  const endDate = new Date(year, month+1, 0).getDate();
  const end = `${year}-${String(month+1).padStart(2,"0")}-${endDate}`;

  // Query schedule for this month only
  const q = query(
    collection(db,'schedule'),
    orderBy('date','asc')
  );
  const snap = await getDocs(q);

  const events = [];
  let totalAll = 0;
  let attendedAll = 0;

  for (const d of snap.docs) {
    const date = d.id;
    if (date < start || date > end) continue; // skip outside month

    const total = d.data().classCount || 0;
    if (total <= 0) continue;

    totalAll += total;

    const userAttRef = doc(db,'attendance', date, 'students', auth.currentUser.uid);
    const attSnap = await getDoc(userAttRef);
    const attended = attSnap.exists() ? (attSnap.data().attendedClasses || 0) : 0;
    attendedAll += attended;

    // Color logic
    let color = '#ef4444'; // red = absent
    if (attended === total) color = '#10b981'; // green full
    else if (attended > 0 && attended < total) color = '#f59e0b'; // yellow partial

    events.push({
      title: `${attended}/${total}`,
      start: date,
      backgroundColor: color
    });
  }

  setKpis(totalAll, attendedAll);
  renderCalendar(events);
}

