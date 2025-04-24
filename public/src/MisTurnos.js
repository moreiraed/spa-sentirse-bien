import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import { db, auth } from "./firebase-config.js";

// Contenedor donde se agregarán los turnos
const listaTurnos = document.getElementById("lista-turnos");

// Estado de autenticación "seguridad"
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../index.html";
    return;
  }

  const turnosRef = collection(db, "turnos");
  const q = query(
    turnosRef,
    where("uid", "==", user.uid),
    orderBy("fecha", "asc"),
    orderBy("hora", "asc")
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    // Si no hay turnos, mostramos el mensaje de que no hay turnos
    listaTurnos.innerHTML = `
      <div class="alert alert-info mx-auto my-5 p-4 text-center" style="max-width: 450px; background-color: rgba(0, 123, 255, 0.1); border-radius: 12px; border: 1px solid #007bff;">
        Aún no tenés turnos reservados.
      </div>
    `;
    return;
  }

  // Limpiamos el contenedor antes de agregar los turnos
  listaTurnos.innerHTML = "";

  snapshot.forEach((doc) => {
    const turno = { id: doc.id, ...doc.data() };

    // Creamos el contenedor para el turno
    const div = document.createElement("div");
    div.classList.add(
      "turno-item",
      "col-12",
      "mb-3",
      "p-3",
      "border",
      "rounded"
    );

    // Añadimos el contenido dinámico de cada turno
    div.innerHTML = `
      <p><strong>Fecha para ir a su Turno:</strong> ${turno.fecha}</p>
      <p><strong>Hora:</strong> ${turno.hora}</p>
      <p><strong>Tipo Servicio:</strong> ${turno.servicio}</p>
      <p><strong>Comentario:</strong> ${
        turno.comentario || "Sin comentario"
      }</p>
      <p class="text-muted"><small>El Turno fue reservado el ${new Date(
        turno.timestamp?.toDate?.()
      ).toLocaleString()}</small></p>
      <button class="btn btn-danger btn-sm cancelar-btn">Cancelar</button>
    `;

    // Añadimos el evento al botón "Cancelar"
    div.querySelector(".cancelar-btn").addEventListener("click", () => {
      cancelarTurno(turno.id, div);
    });

    // Añadimos el turno a la lista
    listaTurnos.appendChild(div);
  });
});

// Función para cancelar el turno
async function cancelarTurno(turnoId, turnoDiv) {
  const confirmar = confirm("¿Estás seguro de que querés cancelar este turno?");
  if (!confirmar) return;

  try {
    await deleteDoc(doc(db, "turnos", turnoId));

    // Agregar animación para que el turno desaparezca
    turnoDiv.style.transition = "opacity 0.5s ease";
    turnoDiv.style.opacity = "0";

    setTimeout(() => {
      turnoDiv.remove();
    }, 500);

    // Mostrar un mensaje de éxito 
    mostrarToast("Turno cancelado correctamente.", "success");
  } catch (error) {
    console.error("Error al cancelar el turno:", error);
    mostrarToast(
      "Ocurrió un error al cancelar el turno. Intentá más tarde.",
      "danger"
    );
  }
}

// Función para mostrar el mensaje de confirmación o error
function mostrarToast(message, type) {
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
