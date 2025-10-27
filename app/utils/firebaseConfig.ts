import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBT4GKdslwDkk1J3qZOM_Mkx6sBaqDN6Kc",
  authDomain: "next-foodtracker-firebase.firebaseapp.com",
  projectId: "next-foodtracker-firebase",
  storageBucket: "next-foodtracker-firebase.firebasestorage.app",
  messagingSenderId: "641704598178",
  appId: "1:641704598178:web:2aee27659bd926ea3ed5fb",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const firebasedb = getFirestore(app);