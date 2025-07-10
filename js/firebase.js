// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getDatabase, ref, set, get, child, push, update, remove } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB4YatKHj5oLfGjEKRrw9hDiCYGw779jNk",
    authDomain: "nutrition-clinic-8b6c1.firebaseapp.com",
    databaseURL: "https://nutrition-clinic-8b6c1-default-rtdb.firebaseio.com",
    projectId: "nutrition-clinic-8b6c1",
    storageBucket: "nutrition-clinic-8b6c1.appspot.com",
    messagingSenderId: "19162768170",
    appId: "1:19162768170:web:984048337c74015a4cf453"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

export { database, ref, set, get, child, push, update, remove, auth, signInWithEmailAndPassword, signOut };