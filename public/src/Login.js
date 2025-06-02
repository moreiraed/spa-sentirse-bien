import {
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

// Logout
window.logout = function () {
    signOut(auth);
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
  if (toastCooldown) return; // Bloquea si está en cooldown

  toastCooldown = true;
  mostrarToast(message, type); // Llama a tu función real

  setTimeout(() => {
    toastCooldown = false; // Se desbloquea después de 2s
  }, 2000);
}


function mostrarToast(message, type) {
  // Crear un nuevo div para el toast
  const toast = document.createElement("div");
  toast.classList.add(
    "toast",
    "align-items-center",
    "border-0",
    "fade",
    `bg-${type}`
  );

  // Cambiar el color del texto según tipo
  if (type === "warning") {
    toast.classList.add("text-dark"); // Texto negro para warning
  } else {
    toast.classList.add("text-white"); // Blanco para success, danger
  }

  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");

  // Crear la cabecera del toast
  const toastHeader = document.createElement("div");
  toastHeader.classList.add("toast-header");

  // Crear la imagen
  const currentPath = window.location.pathname;
  const isInPagesFolder = currentPath.includes("/pages/");
  const img = document.createElement("img");

  img.src = isInPagesFolder
    ? "../assets/icon/icon.png"
    : "assets/icon/icon.png";
  img.classList.add("rounded", "me-2");
  img.alt = "Icono";

  // Crear el texto de la cabecera
  const strong = document.createElement("strong");
  strong.classList.add("me-auto");
  strong.textContent = "Notificación";

  // Crear la hora
  const small = document.createElement("small");
  small.textContent = "Hace un momento";

  // Crear el botón de cierre
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.classList.add("btn-close");
  closeButton.setAttribute("data-bs-dismiss", "toast");
  closeButton.setAttribute("aria-label", "Cerrar");

  // Añadir los elementos a la cabecera
  toastHeader.appendChild(img);
  toastHeader.appendChild(strong);
  toastHeader.appendChild(small);
  toastHeader.appendChild(closeButton);

  // Crear el cuerpo del toast
  const toastBody = document.createElement("div");
  toastBody.classList.add("toast-body");
  toastBody.textContent = message;

  // Añadir la cabecera y el cuerpo al toast
  toast.appendChild(toastHeader);
  toast.appendChild(toastBody);

  // Añadir el toast al contenedor de toasts
  const toastContainer = document.getElementById("toast-container");
  if (toastContainer) {
    toastContainer.appendChild(toast);
    const bootstrapToast = new bootstrap.Toast(toast);
    bootstrapToast.show();

    // Eliminar el toast después de un tiempo
    setTimeout(() => {
      toast.remove();
    }, 3000); // El toast se elimina después de 5 segundos
  } else {
    console.error("El contenedor de toasts no existe en el DOM");
  }
}