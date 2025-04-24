import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import { auth } from "./firebase-config.js"

// Función para iniciar sesión
window.login = async function (event) {
  event.preventDefault(); // Prevenir el comportamiento de envío predeterminado del formulario

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    mostrarToast("Por favor completá todos los campos.", "warning");
    return;
  }

  const loginButton = document.getElementById("loginButton");
  const loader = document.getElementById("loader");

  // Comprobamos que el loader y el botón existen antes de manipularlos
  if (!loginButton || !loader) {
    console.error("Elemento del loader o del botón de login no encontrado");
    return;
  }

  // Guardamos el texto original del botón
  const originalButtonText = loginButton.innerHTML;

  try {
    // Mostrar el loader y ocultar el texto del botón
    loader.style.display = "inline-block";
    loginButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Cargando...';
    loginButton.disabled = true;

    // Intentar hacer login
    await signInWithEmailAndPassword(auth, email, password);

    // Si el login fue exitoso, ocultar el modal
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("SigInModal")
    );
    if (modal) modal.hide();

  } catch (error) {
    // Mostrar el mensaje de error
    alert(error.message);
  } finally {
    // Esconder el loader y restaurar el texto del botón cuando termine el proceso
    loader.style.display = "none";
    loginButton.innerHTML = originalButtonText; // Restauramos el texto original
    loginButton.disabled = false; // Habilitar el botón nuevamente
  }
};

// Asignar la función de login al evento de envío del formulario
document.getElementById("formLogin").addEventListener("submit", login);

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
  // Verificamos que los elementos existen antes de intentar manipularlos
  const userMenu = document.getElementById("userMenu");
  const loginBtn = document.getElementById("SigInHidden");
  const registerBtn = document.getElementById("SigUpHidden");

  // Revisamos si los elementos existen
  if (!userMenu || !loginBtn || !registerBtn) {
    console.error("Alguno de los elementos no se ha encontrado.");
    return;
  }

  if (user) {
    // Mostrar menú de usuario
    userMenu.classList.remove("d-none");

    // Ocultar botones de login y registro
    loginBtn.classList.add("d-none");
    registerBtn.classList.add("d-none");
  } else {
    // Ocultar menú de usuario
    userMenu.classList.add("d-none");

    // Mostrar botones de login y registro
    loginBtn.classList.remove("d-none");
    registerBtn.classList.remove("d-none");
  }
});
