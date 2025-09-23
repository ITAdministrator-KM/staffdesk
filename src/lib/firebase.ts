// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC4BICBDmJjulryjYxmPx5woWM9cZaWfqw",
  authDomain: "staffdeskdsk.firebaseapp.com",
  projectId: "staffdeskdsk",
  storageBucket: "staffdeskdsk.appspot.com",
  messagingSenderId: "811988342154",
  appId: "1:811988342154:web:55ac8c7f6e0f726300e473",
  measurementId: "G-CKQB6Q4K81"
};

// Initialize Firebase app
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Export app for reference
export { app };
