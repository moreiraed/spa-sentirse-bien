import { onAuthStateChanged,signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

// Función para cerrar sesión
window.logout = function() {
  signOut(auth).then(() => {
    console.log("Sesión cerrada con éxito");

    window.location.href = "../index.html";  

  }).catch((error) => {
    console.error("Error al cerrar sesión:", error.message);
  });
};

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
