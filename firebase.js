
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

export const firebaseConfig = {
    // Replace with your own Firebase config
    apiKey: "AIzaSyBimjSAEhXgUr8XiJcdU5qMAmqBoZD7zBc",
    authDomain: "attendanceportal-c745d.firebaseapp.com",
    databaseURL: "https://attendanceportal-c745d-default-rtdb.firebaseio.com",
    projectId: "attendanceportal-c745d",
    storageBucket: "attendanceportal-c745d.firebasestorage.appspot.com",
    messagingSenderId: "18278101782",
    appId: "1:18278101782:web:f1877ef2ddef8268c89637"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const provider = new GoogleAuthProvider();

export {
  signInWithPopup, onAuthStateChanged, signOut,
  collection, doc, getDoc, setDoc, getDocs, query, orderBy
};
