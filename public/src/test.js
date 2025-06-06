import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import { auth } from "./firebase-config.js";

onAuthStateChanged(auth, (user) => {
  if (user) {
    // Usuario logueado
    console.log("Usuario logueado:", user);

    // Por ejemplo, muestra su email
    document.getElementById("userEmail").textContent = user.email;

    // Puedes mostrar otros datos con user.displayName, user.photoURL, etc.
  } else {
    // Usuario NO está logueado
    console.log("No hay usuario logueado");
    // Aquí podrías redirigir a login o mostrar un mensaje
  }
});