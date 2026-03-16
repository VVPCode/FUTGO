// ATENÇÃO EQUIPA: Vocês precisam ir à Consola do Firebase...
const firebaseConfig = {
    apiKey: "AIzaSyCUqDryo4hiXbbq0vBgiSMn52mtpfHKorg",
    authDomain: "futgo-50ab3.firebaseapp.com",
    projectId: "futgo-50ab3",
    storageBucket: "futgo-50ab3.firebasestorage.app",
    messagingSenderId: "1037379736383",
    appId: "1:1037379736383:web:d1265dbd703c1af466f98a"
};

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";

// Inicializa os serviços
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Configuração do Google ---
const googleProvider = new GoogleAuthProvider();
const logarComGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

// Exportamos tudo
export { auth, db, signInAnonymously, onAuthStateChanged, collection, onSnapshot, logarComGoogle };