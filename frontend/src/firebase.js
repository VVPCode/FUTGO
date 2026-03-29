import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";

// Substitua com os SEUS dados da consola do Firebase (Project Settings -> General -> Web App)
const firebaseConfig = {
  apiKey: "AIzaSyCUqDryo4hiXbbq0vBgiSMn52mtpfHKorg",
  authDomain: "futgo-50ab3.firebaseapp.com",
  projectId: "futgo-50ab3",
  storageBucket: "futgo-50ab3.firebasestorage.app",
  messagingSenderId: "1037379736383",
  appId: "1:1037379736383:web:d1265dbd703c1af466f98a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();