import {
  onAuthStateChanged,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import { auth } from "./firebase-config.js";

// Función que actualiza el estado de verificación del correo
function actualizarEstadoVerificacion(user) {
  const emailInput = document.getElementById("email");

  if (user.emailVerified) {
    document.getElementById("alertaVerificacion").classList.add("d-none");
    document.getElementById("estadoVerificacionOk").classList.remove("d-none");

    emailInput.classList.remove("is-invalid");
    emailInput.classList.add("is-valid");
  } else {
    document.getElementById("alertaVerificacion").classList.remove("d-none");
    document.getElementById("estadoVerificacionOk").classList.add("d-none");

    emailInput.classList.remove("is-valid");
    emailInput.classList.add("is-invalid");
  }
}

// Escuchar el estado de autenticación
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    document.getElementById("email").value = user.email;
    document.getElementById("uid").value = user.uid;

    // Verificar al cargar
    user.reload().then(() => {
      actualizarEstadoVerificacion(user);
    });

    // Acción del botón "Reenviar verificación"
    document
      .getElementById("btnReenviarVerificacion")
      .addEventListener("click", async () => {
        try {
          await sendEmailVerification(user);
          document.getElementById("alertaVerificacion").innerHTML = `
            Se ha reenviado el correo de verificación a <strong>${user.email}</strong>.
            <br><small>Revisá tu bandeja de entrada o spam.</small>
          `;
        } catch (error) {
          console.error("Error al reenviar verificación:", error);
          document.getElementById("alertaVerificacion").innerHTML = `
            <strong class="text-danger">Error al reenviar el correo:</strong> ${error.message}
          `;
        }
      });
  }
});

// Actualizar verificación en vivo cada 5 segundos
setInterval(async () => {
  const user = auth.currentUser;
  if (user) {
    await user.reload();
    actualizarEstadoVerificacion(user);
  }
}, 5000);
