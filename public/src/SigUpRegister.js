import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import { auth, db } from "./firebase-config.js";

// SigUp
window.register = async function () {

  const nombre = document.getElementById("nombreRegistro").value.trim();
  const email = document.getElementById("emailRegistro").value.trim();
  const password = document.getElementById("passwordRegistro").value;

  if (!nombre || !email || !password) {
    mostrarAlerta("Por favor completa todos los campos.", "warning");
    return;
  }

  if (password.length < 6) {
    mostrarAlerta("La contraseña debe tener al menos 6 caracteres.", "warning");
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

    // Reenviar correo si clickea
    document.getElementById("reenviarVerificacion").onclick = async function (e) {
      e.preventDefault();
      await sendEmailVerification(user);
      document.getElementById("estadoVerificacion").innerText =
        "Correo reenviado. Verificá tu bandeja de entrada.";
    };

    // Comprobar si ya verificó y avanzar
    document.getElementById("btnVerificarYContinuar").onclick =
      async function () {
        await user.reload(); // Actualiza el estado del usuario

        if (user.emailVerified) {
          // Redirigís a perfil o servicios
          window.location.href = "#/servicios"; 
        } else {
          document.getElementById("estadoVerificacion").innerText =
            "Tu correo aún no está verificado. Revisá tu bandeja o reenvialo.";
        }
      };
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      mostrarAlerta("Este correo ya está registrado.", "danger");
    } else if (error.code === "auth/invalid-email") {
      mostrarAlerta("El correo no es válido.", "danger");
    } else {
      mostrarAlerta("Error: " + error.message, "danger");
    }
  } finally {
    spinner.classList.add("d-none");
    btnRegistro.disabled = false;
  }
};
