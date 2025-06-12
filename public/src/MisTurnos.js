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
  #lista-turnos {
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin-top: 20px;
    padding-bottom: 100px;
  }

  .turno-item {
    background: #fff;
    border-radius: 18px;
    box-shadow: 0 4px 16px rgba(168, 159, 145, 0.08);
    padding: 1.5rem 1.5rem 1rem 1.5rem;
    margin-bottom: 0;
    border: 1.5px solid #D9D2C5;
    transition: box-shadow 0.2s, border-color 0.2s;
    position: relative;
  }
  .turno-item:hover {
    box-shadow: 0 8px 24px rgba(168, 159, 145, 0.15);
    border-color: #A89F91;
  }
  .turno-fecha {
    font-size: 1.1em;
    color: #A89F91;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .turno-servicio {
    font-size: 1.15em;
    color: #222;
    font-weight: 500;
    margin-bottom: 6px;
  }
  .turno-profesional {
    color: #666;
    margin-bottom: 6px;
  }
  .turno-hora {
    color: #A89F91;
    font-weight: 500;
    margin-bottom: 8px;
  }
  .turno-comentario {
    background: #f8f9fa;
    color: #4F4F4F;
    border-radius: 8px;
    padding: 8px 12px;
    margin: 10px 0 8px 0;
    font-size: 0.98em;
  }
  .turno-metodo-pago {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 0 0 0;
    color: #A89F91;
    font-weight: 500;
  }
  .turno-metodo-pago i {
    color: #A89F91;
  }
  .turno-timestamp {
    font-size: 0.85em;
    color: #888;
    margin-top: 8px;
  }
  .cancelar-btn {
    background-color:  #6F5448;
    color: #fff;
    border: none;
    padding: 8px 0;
    border-radius: 8px;
    width: 100%;
    margin-top: 18px;
    font-weight: 500;
    transition: background 0.2s, box-shadow 0.2s;
    box-shadow: 0 2px 8px rgba(168, 159, 145, 0.08);
  }
  .cancelar-btn:hover {
    background-color:rgba(116, 58, 4, 0.6);
    border-color: #6F5448;
    color: black;
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
    where("userId", "==", user.uid),
    orderBy("fecha", "asc"),
    orderBy("hora", "asc")
  );

  const snapshot = await getDocs(q);

  console.log("Fetching reservations for user:", user.uid);
  console.log("Number of reservations found:", snapshot.size);
  snapshot.forEach((doc) => {
    console.log("Reservation data:", doc.id, doc.data());
  });

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
      "turno-item"
    );

    // Añadimos el contenido dinámico de cada turno
    div.innerHTML = `
      <div class="turno-info">
        <div class="turno-fecha">
          <i class="bi bi-calendar-date me-2"></i>
          ${turno.fecha}
        </div>
        <div class="turno-servicio">
          <i class="bi bi-spa me-2"></i>
          ${turno.servicio}
        </div>
        <div class="turno-profesional">
          <i class="bi bi-person me-2"></i>
          ${turno.profesional}
        </div>
        <div class="turno-hora">
          <i class="bi bi-clock me-2"></i>
          ${turno.hora}
        </div>
        ${turno.comentario ? `
          <div class="turno-comentario">
            <i class="bi bi-chat-left-text me-2"></i>
            ${turno.comentario}
          </div>
        ` : ''}
        <div class="turno-metodo-pago">
          <i class="bi bi-credit-card"></i>
          ${turno.pago || "No especificado"}
        </div>
        <div class="turno-timestamp">
          <i class="bi bi-clock-history me-2"></i>
          Reservado el ${new Date(turno.timestamp?.toDate()).toLocaleString()}
        </div>
      </div>
      <button class="cancelar-btn">
        <i class="bi bi-x-circle me-2"></i>Cancelar turno
      </button>
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
