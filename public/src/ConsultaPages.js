import {
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import { db } from "./firebase-config.js";

const consultForm = document.querySelector("#consultaModal form");
const btnConsulta = document.querySelector("#btnConsulta");
const btnText = document.querySelector("#btn-text-consulta");
const btnSpinner = document.querySelector("#btn-spinner-consulta");
const spinnerText = document.querySelector("#spinner-text-consulta");

// Función para enviar la consulta
consultForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombreConsulta = document.getElementById("nombreConsulta").value;
  const emailConsulta = document.getElementById("emailConsulta").value;
  const mensajeConsulta = document.getElementById("mensajeConsulta").value;

  if (!nombreConsulta || !emailConsulta || !mensajeConsulta) {
    mostrarToast("Por favor, rellena todos los campos.", "warning");
    return;
  }

  // Deshabilitar el botón y mostrar el spinner
  btnConsulta.disabled = true;
  btnText.classList.add("d-none");
  btnSpinner.classList.remove("d-none");
  spinnerText.classList.remove("d-none");

  consultForm.reset();
  const modalConsulta = bootstrap.Modal.getInstance(
    document.getElementById("modalConsulta")
  );
  if (modalConsulta) modalConsulta.hide();

  try {
    await addDoc(collection(db, "consultas"), {
      nombre: nombreConsulta,
      email: emailConsulta,
      mensaje: mensajeConsulta,
      timestamp: new Date(),
    });

    mostrarToast("Consulta enviada con éxito", "success");
    consultForm.reset();
  } catch (error) {
    console.error("Error al enviar la consulta:", error);
    mostrarToast("Error al enviar la consulta. Intentá más tarde.", "danger");
  } finally {
    // Volver a habilitar el botón y ocultar el spinner
    btnConsulta.disabled = false;
    btnText.classList.remove("d-none");
    btnSpinner.classList.add("d-none");
    spinnerText.classList.add("d-none");
  }
});

function mostrarToast(message, type) {
  // Crear un nuevo div para el toast
  const toast = document.createElement("div");
  toast.classList.add(
    "toast",
    "align-items-center",
    "border-0",
    "fade",
    `bg-${type}`
  );

  // Cambiar el color del texto según tipo
  if (type === "warning") {
    toast.classList.add("text-dark"); // Texto negro para warning
  } else {
    toast.classList.add("text-white"); // Blanco para success, danger
  }

  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");

  // Crear la cabecera del toast
  const toastHeader = document.createElement("div");
  toastHeader.classList.add("toast-header");

  // Crear la imagen
  const img = document.createElement("img");
  img.src = "../assets/icon/icon.png";
  img.classList.add("rounded", "me-2");
  img.alt = "Icono";

  // Crear el texto de la cabecera
  const strong = document.createElement("strong");
  strong.classList.add("me-auto");
  strong.textContent = "Notificación";

  // Crear la hora
  const small = document.createElement("small");
  small.textContent = "Hace un momento";

  // Crear el botón de cierre
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.classList.add("btn-close");
  closeButton.setAttribute("data-bs-dismiss", "toast");
  closeButton.setAttribute("aria-label", "Cerrar");

  // Añadir los elementos a la cabecera
  toastHeader.appendChild(img);
  toastHeader.appendChild(strong);
  toastHeader.appendChild(small);
  toastHeader.appendChild(closeButton);

  // Crear el cuerpo del toast
  const toastBody = document.createElement("div");
  toastBody.classList.add("toast-body");
  toastBody.textContent = message;

  // Añadir la cabecera y el cuerpo al toast
  toast.appendChild(toastHeader);
  toast.appendChild(toastBody);

  // Añadir el toast al contenedor de toasts
  const toastContainer = document.getElementById("toast-container");
  if (toastContainer) {
    toastContainer.appendChild(toast);
    const bootstrapToast = new bootstrap.Toast(toast);
    bootstrapToast.show();

    // Eliminar el toast después de un tiempo
    setTimeout(() => {
      toast.remove();
    }, 5000); // El toast se elimina después de 5 segundos
  } else {
    console.error("El contenedor de toasts no existe en el DOM");
  }
}
