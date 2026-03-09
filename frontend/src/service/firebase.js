import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";

// ATENÇÃO EQUIPA: Vocês precisam ir à Consola do Firebase (console.firebase.google.com),
// criar um projeto Web e colar as vossas chaves reais aqui dentro!
const firebaseConfig = {
    apiKey: "AIzaSyCUqDryo4hiXbbq0vBgiSMn52mtpfHKorg",
    authDomain: "futgo-50ab3.firebaseapp.com",
    projectId: "futgo-50ab3",
    storageBucket: "futgo-50ab3.firebasestorage.app",
    messagingSenderId: "1037379736383",
    appId: "1:1037379736383:web:d1265dbd703c1af466f98a"
};

// Inicializa os serviços
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Exportamos tudo o que o App.jsx vai precisar
export { auth, db, signInAnonymously, onAuthStateChanged, collection, onSnapshot };