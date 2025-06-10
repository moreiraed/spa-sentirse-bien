import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
    doc,
    getDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import { auth, db } from "./firebase-config.js";

// Función para iniciar sesión
window.login = async function (event) {
    event.preventDefault(); // Prevenir el comportamiento de envío predeterminado del formulario

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        mostrarToastSeguro("Por favor completá todos los campos.", "warning");
        return;
    }

    const loginButton = document.getElementById("loginButton");
    const loader = document.getElementById("loader");

    if (!loginButton || !loader) {
        console.error("Elemento del loader o del botón de login no encontrado");
        return;
    }

    const originalButtonText = loginButton.innerHTML;

    try {
        loader.style.display = "inline-block";
        loginButton.innerHTML =
            '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Cargando...';
        loginButton.disabled = true;

        await signInWithEmailAndPassword(auth, email, password);

        const modal = bootstrap.Modal.getInstance(
            document.getElementById("loginModal")
        );
        if (modal) modal.hide();

    } catch (error) {
        let mensaje = "Correo o contraseña incorrectos.";

        switch (error.code) {
            case "auth/invalid-email":
                mensaje = "El correo electrónico ingresado no es válido.";
                break;
            case "auth/user-not-found":
                mensaje = "No existe una cuenta con este correo.";
                break;
            case "auth/wrong-password":
                mensaje = "La contraseña es incorrecta.";
                break;
        }

        mostrarToastSeguro(mensaje, "danger");
    } finally {
        loader.style.display = "none";
        loginButton.innerHTML = originalButtonText;
        loginButton.disabled = false;
    }
};

// Usamos un MutationObserver para observar cambios en el DOM
document.addEventListener("DOMContentLoaded", function () {
    const modalsContainer = document.getElementById("modals-container");

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            // Verifica si el modal de login fue añadido al DOM
            if (
                mutation.type === "childList" &&
                document.getElementById("loginModal")
            ) {
                const formLogin = document.getElementById("formLogin");
                if (formLogin) {
                    formLogin.addEventListener("submit", login);
                    observer.disconnect(); // Dejar de observar después de agregar el listener
                } else {
                    console.error("Formulario de login no encontrado en el modal.");
                }
            }
        }
    });

    // Configurar el observer para observar cambios en el contenedor de modales
    observer.observe(modalsContainer, { childList: true });
});

// Función para cerrar sesión
window.logout = async function() {
    try {
      const auth = getAuth();
      await signOut(auth);
      // Forzar recarga de la página después de cerrar sesión
      window.location.reload();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      alert("Ocurrió un error al cerrar sesión");
    }
  };

// Mostrar UI inmediatamente según el estado en sessionStorage
const cachedUser = sessionStorage.getItem('firebaseUser');

const userMenu = document.getElementById("userMenu");
const loginBtn = document.getElementById("loginNavItem");
const registerBtn = document.getElementById("registerNavItem");
const ctaReserva = document.getElementById("cta-reserva");
const welcomeMessage = document.getElementById("welcome-message");
const userName = document.getElementById("user-name");

if (cachedUser === 'authenticated') {
    // Mostrar inmediatamente la UI de usuario autenticado
    if (userMenu) userMenu.classList.remove("d-none");
    if (loginBtn) loginBtn.classList.add("d-none");
    if (registerBtn) registerBtn.classList.add("d-none");
    if (ctaReserva) ctaReserva.classList.add("d-none");
    if (welcomeMessage) welcomeMessage.classList.remove("d-none");
} else if (cachedUser === 'not-authenticated') {
    // Mostrar inmediatamente la UI de invitado
    if (userMenu) userMenu.classList.add("d-none");
    if (loginBtn) loginBtn.classList.remove("d-none");
    if (registerBtn) registerBtn.classList.remove("d-none");
    if (ctaReserva) ctaReserva.classList.remove("d-none");
    if (welcomeMessage) welcomeMessage.classList.add("d-none");
}

// Escuchar cambios de autenticación de Firebase
onAuthStateChanged(auth, async (user) => {
    if (user) {
        sessionStorage.setItem('firebaseUser', 'authenticated');

        // Actualizar UI para usuario autenticado
        if (userMenu) userMenu.classList.remove("d-none");
        if (loginBtn) loginBtn.classList.add("d-none");
        if (registerBtn) registerBtn.classList.add("d-none");
        if (ctaReserva) ctaReserva.classList.add("d-none");
        if (welcomeMessage) welcomeMessage.classList.remove("d-none");

        try {
            // Obtener datos del usuario desde Firestore
            const userDoc = doc(db, "users", user.uid);
            const userSnapshot = await getDoc(userDoc);

            if (userSnapshot.exists()) {
                const userData = userSnapshot.data();
                const userFullName = userData.username || "Usuario";
                if (userName) userName.textContent = userFullName;
            } else {
                if (userName) userName.textContent = "Usuario";
            }
        } catch (error) {
            console.error("Error al obtener los datos del usuario:", error);
        }
    } else {
        sessionStorage.setItem('firebaseUser', 'not-authenticated');

        // Actualizar UI para invitado
        if (userMenu) userMenu.classList.add("d-none");
        if (loginBtn) loginBtn.classList.remove("d-none");
        if (registerBtn) registerBtn.classList.remove("d-none");
        if (ctaReserva) ctaReserva.classList.remove("d-none");
        if (welcomeMessage) welcomeMessage.classList.add("d-none");
    }

    document.querySelectorAll(".auth-dependent").forEach((el) => {
      el.style.opacity = "1";
    });
});

let toastCooldown = false;

function mostrarToastSeguro(message, type) {
  if (toastCooldown) return;

  const existingToasts = document.querySelectorAll(
    "#toast-container .toast.show, #toast-container .toast.fade:not(.hide)"
  );
  if (existingToasts.length > 0) return; // Evita mostrar si hay uno visible

  toastCooldown = true;

  const toastElement = mostrarToast(message, type);
  if (!toastElement) {
    toastCooldown = false;
    return;
  }

  const bsToast = new bootstrap.Toast(toastElement);
  bsToast.show();

  // Ocultar el toast después de 3s
  setTimeout(() => {
    bsToast.hide();
  }, 3000);

  // Cuando se oculta completamente
  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove();
    toastCooldown = false;
  });
}


function mostrarToast(message, type) {
  const toast = document.createElement("div");
  toast.classList.add(
    "toast",
    "align-items-center",
    "border-0",
    "fade",
    `bg-${type}`
  );
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");

  if (type === "warning") toast.classList.add("text-dark");
  else toast.classList.add("text-white");

  const header = document.createElement("div");
  header.classList.add("toast-header");

  const currentPath = window.location.pathname;
  const img = document.createElement("img");
  img.src = currentPath.includes("/pages/")
    ? "../assets/icon/icon.png"
    : "assets/icon/icon.png";
  img.classList.add("rounded", "me-2");
  img.alt = "Icono";

  const strong = document.createElement("strong");
  strong.classList.add("me-auto");
  strong.textContent = "Notificación";

  const small = document.createElement("small");
  small.textContent = "Hace un momento";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.classList.add("btn-close");
  closeBtn.setAttribute("data-bs-dismiss", "toast");
  closeBtn.setAttribute("aria-label", "Cerrar");

  header.appendChild(img);
  header.appendChild(strong);
  header.appendChild(small);
  header.appendChild(closeBtn);

  const body = document.createElement("div");
  body.classList.add("toast-body");
  body.textContent = message;

  toast.appendChild(header);
  toast.appendChild(body);

  const container = document.getElementById("toast-container");
  if (container) {
    container.appendChild(toast);
    return toast; // ✅ devolvemos el DOM
  } else {
    console.error("El contenedor de toasts no existe en el DOM");
    return null;
  }
}  