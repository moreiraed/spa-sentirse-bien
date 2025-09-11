import { auth, db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Función para verificar y mostrar el botón de admin
export async function verificarAdminButton() {
  try {
    console.log("Iniciando verificación de admin...");
    const user = auth.currentUser;
    if (!user) {
      console.log("No hay usuario autenticado");
      return;
    }

    console.log("Usuario autenticado:", user.uid);
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      console.log("No existe documento del usuario");
      return;
    }

    const data = userDoc.data();
    console.log("Datos del usuario:", data);
    const btnPanelAdmin = document.getElementById("btnPanelAdmin");
    console.log("Botón encontrado:", btnPanelAdmin);
    
    if (btnPanelAdmin && data.rol === "admin") {
      console.log("Usuario es admin, mostrando botón");
      btnPanelAdmin.classList.remove("d-none");
      btnPanelAdmin.onclick = () => window.location.href = "admin.html";
    } else {
      console.log("Usuario no es admin o botón no encontrado");
    }
  } catch (error) {
    console.error("Error al verificar rol de admin:", error);
  }
} 