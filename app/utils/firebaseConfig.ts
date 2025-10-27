import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBT4GKdslwDkk1J3qZOM_Mkx6sBaqDN6Kc",
  authDomain: "next-foodtracker-firebase.firebaseapp.com",
  projectId: "next-foodtracker-firebase",
  storageBucket: "next-foodtracker-firebase.firebasestorage.app",
  messagingSenderId: "641704598178",
  appId: "1:641704598178:web:2aee27659bd926ea3ed5fb",
};

let app;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
  console.error("Firebase initialization error:", error);
  throw new Error("Failed to initialize Firebase. Please check your configuration.");
}

let firebasedb: Firestore;
try {
  firebasedb = getFirestore(app);
} catch (error) {
  console.error("Firestore initialization error:", error);
  throw new Error("Failed to initialize Firestore. Please check your configuration.");
}

export { firebasedb };