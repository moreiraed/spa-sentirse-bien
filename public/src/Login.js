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
        loginButton.innerHTML =
            '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Cargando...';
        loginButton.disabled = true;

        // Intentar hacer login
        await signInWithEmailAndPassword(auth, email, password);

        // Si el login fue exitoso, ocultar el modal
        const modal = bootstrap.Modal.getInstance(
            document.getElementById("loginModal")
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

