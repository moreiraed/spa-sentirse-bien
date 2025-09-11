import { onAuthStateChanged,signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
    doc,
    getDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { auth, db} from "./firebase-config.js";

// Función para cerrar sesión
window.logout = function() {
  signOut(auth).then(() => {
    console.log("Sesión cerrada con éxito");

    window.location.href = "../index.html";  

  }).catch((error) => {
    console.error("Error al cerrar sesión:", error.message);
  });
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
