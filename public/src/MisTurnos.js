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

// Inyectar CSS dinámicamente
const css = `
  /* Estilos para el contenedor de los turnos */
  #lista-turnos {
    display: grid;
    grid-template-columns: repeat(3, 1fr); /* 3 columnas */
    gap: 20px;
    margin-top: 20px;
  }

  /* Estilo individual para cada turno */
  .turno-item {
    padding: 20px;
    border-radius: 12px;
    background-color: #f8f9fa;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .turno-item:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  }

  /* Colores para el fondo de los turnos */
  .turno-item-info {
    background-color: #e9f7df; /* Fondo verde suave */
  }

  .turno-item-warning {
    background-color: #ffefdb; /* Fondo amarillo suave */
  }

  .turno-item-danger {
    background-color: #ffdddd; /* Fondo rojo suave */
  }

  /* Estilo para el botón de cancelar */
  .cancelar-btn {
    background-color: #ff4d4d;
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 8px;
    transition: background-color 0.3s ease;
  }

  .cancelar-btn:hover {
    background-color: #cc3f3f;
  }

  /* Animación de carga */
  .alert-info {
    font-size: 16px;
    font-weight: bold;
  }

  @media (max-width: 768px) {
    /* Estilos para el contenedor de los turnos */
    #lista-turnos {
      grid-template-columns: repeat(1, 1fr); /* 1 columna */
    }
  }
`;

const style = document.createElement("style");
style.textContent = css;
document.head.appendChild(style);

// Contenedor donde se agregarán los turnos
const listaTurnos = document.getElementById("lista-turnos");

// Estado de autenticación "seguridad"
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../index.html";
    return;
  }

  // Mostrar el mensaje de "Cargando..." cuando empezamos a traer los datos
  listaTurnos.innerHTML = `  
  <div class="alert alert-info mx-auto my-5 p-4 text-center" 
    style="max-width: 450px; background-color: rgba(40, 167, 69, 0.1); border-radius: 12px; border: 1px solid #28a745;">
    Cargando turnos...
  </div>
`;

  const turnosRef = collection(db, "reservas");
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
  <div class="alert alert-info mx-auto my-5 p-4 text-center" 
    style="max-width: 450px; background-color: rgba(0, 123, 255, 0.1); border-radius: 12px; border: 1px solid #007bff;">
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
      turno.estado === "activo" ? "turno-item-info" : "turno-item-warning"
    );

    // Añadimos el contenido dinámico de cada turno
    div.innerHTML = `
      <p><strong>Fecha:</strong> ${turno.fecha}</p>
      <p><strong>Hora:</strong> ${turno.hora}</p>
      <p><strong>Servicio:</strong> ${turno.servicio}</p>
      <p><strong>Comentario:</strong> ${
        turno.comentario || "Sin comentario"
      }</p>
      <p><strong>Medio de Pago:</strong> ${
        turno.metodoPago || "No especificado"
      }</p>
      <p class="text-muted"><small>Reservado el ${new Date(
        turno.timestamp?.toDate()
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
    await deleteDoc(doc(db, "reservas", turnoId));

    // Agregar animación para que el turno desaparezca
    turnoDiv.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    turnoDiv.style.opacity = "0";
    turnoDiv.style.transform = "scale(0.9)";

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
  toast.classList.add(type === "warning" ? "text-dark" : "text-white");
  toast.setAttribute("role", "alert");

  const toastHeader = document.createElement("div");
  toastHeader.classList.add("toast-header");
  const img = document.createElement("img");
  img.src = "../assets/icon/icon.png";
  img.classList.add("rounded", "me-2");
  img.alt = "Icono";

  const strong = document.createElement("strong");
  strong.classList.add("me-auto");
  strong.textContent = "Notificación";

  const small = document.createElement("small");
  small.textContent = "Hace un momento";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.classList.add("btn-close");
  closeButton.setAttribute("data-bs-dismiss", "toast");

  toastHeader.appendChild(img);
  toastHeader.appendChild(strong);
  toastHeader.appendChild(small);
  toastHeader.appendChild(closeButton);

  const toastBody = document.createElement("div");
  toastBody.classList.add("toast-body");
  toastBody.textContent = message;

  toast.appendChild(toastHeader);
  toast.appendChild(toastBody);

  const toastContainer = document.getElementById("toast-container");
  if (toastContainer) {
    toastContainer.appendChild(toast);
    const bootstrapToast = new bootstrap.Toast(toast);
    bootstrapToast.show();

    setTimeout(() => {
      toast.remove();
    }, 5000);
  } else {
    console.error("El contenedor de toasts no existe en el DOM");
  }
}
