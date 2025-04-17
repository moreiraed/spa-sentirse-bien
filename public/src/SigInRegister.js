import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import { auth } from "./firebase-config.js"

// Login
window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("SigInModal")
    );
    if (modal) modal.hide();

  } catch (error) {
    alert(error.message);
  }
};

// Logout
window.logout = function () {
  signOut(auth);
};

onAuthStateChanged(auth, (user) => {
  const userMenu = document.getElementById("userMenu");
  if (user) {
    // Usuario logueado: mostrar menú
    if (userMenu) userMenu.classList.remove("d-none");
  } else {
    // No logueado: ocultar menú
    if (userMenu) userMenu.classList.add("d-none");
  }
});

onAuthStateChanged(auth, (user) => {
  const userMenu = document.getElementById("userMenu");
  const loginBtn = document.getElementById("SigInHidden");
  const registerBtn = document.getElementById("SigUpHidden");

  if (user) {
    // Mostrar menú de usuario
    if (userMenu) userMenu.classList.remove("d-none");
    // Ocultar botones de login y registro
    if (loginBtn) loginBtn.classList.add("d-none");
    if (registerBtn) registerBtn.classList.add("d-none");
  } else {
    // Ocultar menú de usuario
    if (userMenu) userMenu.classList.add("d-none");
    // Mostrar botones de login y registro
    if (loginBtn) loginBtn.classList.remove("d-none");
    if (registerBtn) registerBtn.classList.remove("d-none");
  }
});
