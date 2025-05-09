import {
  deleteUser,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import { db, auth } from "./firebase-config.js";

async function eliminarCuenta() {
  const user = auth.currentUser;

  if (!user) {
    alert("No se encontró el usuario autenticado.");
    return;
  }

  const uid = user.uid;

  try {
    // 1. Eliminar documento del usuario en Firestore
    await deleteDoc(doc(db, "users", uid));
    console.log("Documento del usuario eliminado de Firestore.");

    // 2. Eliminar cuenta de Firebase Auth
    await deleteUser(user);
    console.log("Cuenta de usuario eliminada de Firebase Auth.");

    alert("Tu cuenta ha sido eliminada exitosamente.");
    // Opcional: Redireccionar al login o a la página de inicio
    window.location.href = "./index.html";
  } catch (error) {
    console.error("Error al eliminar la cuenta:", error);

    if (error.code === "auth/requires-recent-login") {
      alert(
        "Debes iniciar sesión nuevamente para eliminar tu cuenta. Por favor, vuelve a loguearte."
      );
      // Podrías redirigir al usuario al login o mostrar un modal de re-autenticación
    } else {
      alert(
        "Ocurrió un error al eliminar la cuenta. Intenta de nuevo más tarde."
      );
    }
  }
}

window.eliminarCuenta = eliminarCuenta;