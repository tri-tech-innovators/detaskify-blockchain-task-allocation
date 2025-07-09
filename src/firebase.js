import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc // ✅ Add this here
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBCKCLCIy4habiJ3I8ljN0CcecBr1z-4RE",
  authDomain: "task-allocation-4a18f.firebaseapp.com",
  projectId: "task-allocation-4a18f",
  storageBucket: "task-allocation-4a18f.appspot.com",
  messagingSenderId: "774480390247",
  appId: "1:774480390247:web:d5964a67e98ecf13bb0cc2",
  measurementId: "G-3366VGX48J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export {
  db,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc // ✅ Export it here
};
