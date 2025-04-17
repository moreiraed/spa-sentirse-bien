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
    alert("Por favor completa todos los campos.");
    return;
  }

  if (password.length < 6) {
    alert("La contraseña debe tener al menos 6 caracteres.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      nombre,
      email,
    });

    await sendEmailVerification(user);
    alert("Cuenta creada. Verifica tu correo.");
  } catch (error) {
    alert("Error: " + error.message);
  }
};
