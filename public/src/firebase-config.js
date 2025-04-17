// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCWwxt3l9j8gnU_-mByHDb9_PWEKx5OZGk",
  authDomain: "spa-sentirse-bien-403fe.firebaseapp.com",
  projectId: "spa-sentirse-bien-403fe",
  storageBucket: "spa-sentirse-bien-403fe.firebasestorage.app",
  messagingSenderId: "27773872738",
  appId: "1:27773872738:web:b11afa81ddec96b9343f3b",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, app };
