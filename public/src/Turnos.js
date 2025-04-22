import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

async function mostrarTurnos() {
  try {
    console.log("DB es:", db);
    const tabla = document.getElementById("tabla-turnos");
    const turnosRef = collection(db, "turnos");
    const snapshot = await getDocs(turnosRef);

    snapshot.forEach(doc => {
      const data = doc.data();
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${data.fecha}</td>
        <td>${data.hora}</td>
        <td>${data.servicio}</td>
      `;
      tabla.appendChild(fila);
    });
  } catch (error) {
    console.error("Error al cargar turnos:", error);
  }
}

mostrarTurnos();

