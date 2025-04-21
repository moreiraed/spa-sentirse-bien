import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import { auth, db } from "./firebase-config.js";

// ==============================
// Función para registrar usuario
// ==============================
window.register = async function () {
  const nombre = document.getElementById("nombreRegistro").value.trim();
  const email = document.getElementById("emailRegistro").value.trim();
  const password = document.getElementById("passwordRegistro").value;

  if (!nombre || !email || !password) {
    mostrarToast("Por favor completá todos los campos.", "warning");
    return;
  }

  if (password.length < 6) {
    mostrarToast("La contraseña debe tener al menos 6 caracteres.", "warning");
    return;
  }

  const btnRegistro = document.getElementById("btnRegistro");
  const spinner = document.getElementById("spinnerBtn");
  spinner.classList.remove("d-none");
  btnRegistro.disabled = true;

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), { nombre, email });
    await sendEmailVerification(user);

    // Cierra modal de registro
    const modalElement = document.getElementById("SigUpModal");
    const modal =
      bootstrap.Modal.getInstance(modalElement) ||
      new bootstrap.Modal(modalElement);
    modal.hide();

    // Muestra modal de cuenta creada
    document.getElementById("emailVerificacionTexto").innerText = email;
    const modalVerificacion = new bootstrap.Modal(
      document.getElementById("modalCuentaCreada")
    );
    modalVerificacion.show();
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      mostrarToast("Este correo ya está registrado.", "danger");
    } else if (error.code === "auth/invalid-email") {
      mostrarToast("El correo no es válido.", "danger");
    } else {
      mostrarToast("Error: " + error.message, "danger");
    }
  } finally {
    spinner.classList.add("d-none");
    btnRegistro.disabled = false;
  }
};

// ==============================
// Reenviar verificación para "Modal de verificación pendiente"
// ==============================
document.querySelectorAll(".btn-reenviar-verificacion").forEach((boton) => {
  boton.addEventListener("click", async function (e) {
    e.preventDefault();

    const texto = boton.querySelector(".texto-reenviar");
    const spinner = boton.querySelector(".spinner-reenviar");

    boton.disabled = true;
    texto.textContent = "Reenviando...";
    spinner.classList.remove("d-none");

    try {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        await sendEmailVerification(user);
        mostrarToast("Correo de verificación reenviado.", "info");
      } else {
        mostrarToast("Usuario no autenticado.", "danger");
      }
    } catch (err) {
      console.error("Error al reenviar verificación:", err);
      mostrarToast("Error al reenviar el correo.", "danger");
    } finally {
      spinner.classList.add("d-none");

      // Temporizador con cuenta regresiva
      let segundosRestantes = 30;
      boton.disabled = true;
      boton.classList.add("disabled"); // Por si usás estilos visuales

      const intervalo = setInterval(() => {
        segundosRestantes--;
        texto.textContent = `Reintentar en ${segundosRestantes}s...`;

        if (segundosRestantes <= 0) {
          clearInterval(intervalo);
          texto.textContent = "Reenviar verificación";
          boton.disabled = false;
          boton.classList.remove("disabled");
        }
      }, 1000);
    }
  });
});

// ==============================
// Verificar y continuar
// ==============================
document.getElementById("btnVerificarYContinuar").onclick = async function () {
  const user = auth.currentUser;

  if (!user) {
    mostrarToast("No hay usuario activo.", "danger");
    return;
  }

  await user.reload();

  if (user.emailVerified) {
    mostrarToast("¡Correo verificado! Ahora podés pedir tu turno.", "success");

    const modalCuenta = bootstrap.Modal.getInstance(
      document.getElementById("modalCuentaCreada")
    );
    modalCuenta.hide();
  } else {
    mostrarToast(
      "Tu correo aún no fue verificado. Revisá tu bandeja de entrada.",
      "warning"
    );
  }
};

// ==============================
// Toast de notificación
// ==============================
function mostrarToast(mensaje, tipo = "success") {
  const toastElement = document.getElementById("toastNotificacion");
  const toastMensaje = document.getElementById("toastMensaje");

  toastMensaje.textContent = mensaje;

  toastElement.classList.remove(
    "bg-success",
    "bg-danger",
    "bg-warning",
    "bg-info"
  );
  toastElement.classList.add("bg-" + tipo);

  const toast = new bootstrap.Toast(toastElement);
  toast.show();
}
