# 📅 Firebase Attendance Portal

A simple and beautiful **Attendance Management Portal** built with **HTML, CSS, JavaScript, and Firebase**.  
Includes **Google Login** for students and a separate **Admin Panel** to manage class schedules.

---

## 🚀 Features

### 👨‍🎓 Student Portal (`student.html`)
- Google Sign-in for authentication.
- View total classes, attended classes, and attendance percentage.
- Mark attendance for scheduled past dates.
- Live percentage calculation.

### 🛠 Admin Panel (`admin.html`)
- Restricted access (only approved admin emails).
- Add/update class schedules date-wise (with number of classes on that date).
- View all scheduled classes and total class count.

---

## 📂 Project Structure
```
attendance-portal/
├── admin.html        # Admin panel
├── admin.js          # Admin panel logic
├── app.js            # Student panel logic
├── firebase.js       # Firebase configuration & SDK imports
├── student.html      # Student dashboard
├── styles.css        # Common styling
├── utils.js          # Helper functions
├── firestore.rules   # Firestore security rules
└── README.md         # Project documentation
```

---

## 🔧 Setup Instructions

### 1️⃣ Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/attendance-portal.git
cd attendance-portal
```

### 2️⃣ Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a new project.
3. Enable **Google Authentication** under **Authentication → Sign-in method**.
4. Create a **Firestore Database** (in Production mode).
5. Copy your Firebase config from **Project Settings → General**.

### 3️⃣ Update Firebase Config
Open `firebase.js` and replace:
```js
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```
with **your own values**.

### 4️⃣ Set Admin Email
In `admin.js`:
```js
const ADMIN_EMAILS = [
  "youremail@gmail.com"
];
```
Replace with the Gmail address you’ll use for admin access.

### 5️⃣ Set Firestore Rules
In Firebase Console → Firestore → **Rules**, paste the content of `firestore.rules` and update the admin emails there as well.

### 6️⃣ Run the Project
- **Local:** Use any HTTP server (e.g., VSCode Live Server, Python `http.server`) because ES Modules won’t run via double-click.
- **Deploy:** You can deploy using Firebase Hosting, Netlify, or Vercel.

---

## 📊 Data Model

### Schedule Collection (`schedule`)
```json
{
  "date": "YYYY-MM-DD",
  "classCount": 2
}
```

### Attendance Collection (`attendance`)
```json
{
  "uid": "USER_ID",
  "date": "YYYY-MM-DD",
  "status": "present",
  "timestamp": 1692000000000
}
```

---

## 🔒 Security Rules
```js
// Only admins can modify schedule.
// Students can only write their own attendance.
```
Full rules are in `firestore.rules`.

---

## 📸 Screenshots
*(Add screenshots of the student dashboard and admin panel here)*

---

## 📝 License
This project is open-source and free to use for educational purposes.

---

💡 *Built with love using HTML, CSS, JS, and Firebase.*
