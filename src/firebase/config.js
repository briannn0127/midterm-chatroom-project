import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCxEz9X_zLM8Wus41a9bWcSSi2hItjbDfA",
  authDomain: "chatroom-midterm-e6701.firebaseapp.com",
  projectId: "chatroom-midterm-e6701",
  storageBucket: "chatroom-midterm-e6701.firebasestorage.app",
  messagingSenderId: "671841854500",
  appId: "1:671841854500:web:a0492d532b8ea18cd1a4b1"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();