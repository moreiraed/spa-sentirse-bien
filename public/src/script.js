import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Obtener el formulario y asignarle un event listener
const form = document.getElementById("turno-form");

form.addEventListener("submit", async (event) => {
  event.preventDefault(); // Evita que el formulario se recargue al enviar

  // Obtener los valores de los campos del formulario
  const nombre = document.getElementById("nombre").value;
  const correo = document.getElementById("correo").value;
  const fecha = document.getElementById("fecha").value;

  try {
    // Agregar los datos a Firebase
    const docRef = await addDoc(collection(db, "turnos"), {
      nombre: nombre,
      correo: correo,
      fecha: fecha,
      createdAt: new Date(),
    });
    alert("Turno solicitado con éxito!");
    form.reset(); // Limpiar el formulario
  } catch (e) {
    console.error("Error al añadir el turno: ", e);
    alert("Hubo un error al solicitar el turno.");
  }
});