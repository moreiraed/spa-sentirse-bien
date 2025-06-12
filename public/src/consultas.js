import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  Timestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

let consultasContainer = document.getElementById("consultas-container");
let currentFilter = "todos";
let consultasData = [];

// Función para cargar las consultas
async function cargarConsultas() {
  try {
    const consultasRef = collection(db, "contactos");
    const q = query(consultasRef, orderBy("fecha", "desc"));
    const querySnapshot = await getDocs(q);
    
    consultasData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    mostrarConsultas();
  } catch (error) {
    console.error("Error al cargar consultas:", error);
    mostrarToast("Error al cargar las consultas", "error");
  }
}

// Función para mostrar las consultas filtradas
function mostrarConsultas() {
  consultasContainer.innerHTML = "";
  
  const consultasFiltradas = consultasData.filter(consulta => {
    if (currentFilter === "todos") return true;
    if (currentFilter === "pendientes") return !consulta.atendido;
    if (currentFilter === "atendidos") return consulta.atendido;
    return true;
  });

  if (consultasFiltradas.length === 0) {
    consultasContainer.innerHTML = `
      <div class="alert alert-info">
        No hay consultas ${currentFilter === "todos" ? "" : currentFilter}.
      </div>
    `;
    return;
  }

  consultasFiltradas.forEach(consulta => {
    const fecha = consulta.fecha instanceof Timestamp 
      ? consulta.fecha.toDate().toLocaleDateString() 
      : new Date(consulta.fecha).toLocaleDateString();

    const card = document.createElement("div");
    card.className = `card mb-3 ${consulta.atendido ? 'border-success' : 'border-warning'}`;
    card.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h5 class="card-title">${consulta.nombre}</h5>
            <h6 class="card-subtitle mb-2 text-muted">${consulta.tipoConsulta}</h6>
          </div>
          <span class="badge ${consulta.atendido ? 'bg-success' : 'bg-warning'}">
            ${consulta.atendido ? 'Atendido' : 'Pendiente'}
          </span>
        </div>
        <p class="card-text">${consulta.mensaje.substring(0, 100)}${consulta.mensaje.length > 100 ? '...' : ''}</p>
        <div class="d-flex justify-content-between align-items-center">
          <small class="text-muted">Fecha: ${fecha}</small>
          <button class="btn btn-primary btn-sm" onclick="verDetalleConsulta('${consulta.id}')">
            Ver Detalles
          </button>
        </div>
      </div>
    `;
    consultasContainer.appendChild(card);
  });
}

// Función para ver el detalle de una consulta
async function verDetalleConsulta(consultaId) {
  const consulta = consultasData.find(c => c.id === consultaId);
  if (!consulta) return;

  const fecha = consulta.fecha instanceof Timestamp 
    ? consulta.fecha.toDate().toLocaleDateString() 
    : new Date(consulta.fecha).toLocaleDateString();

  document.getElementById("consulta-nombre").textContent = consulta.nombre;
  document.getElementById("consulta-email").textContent = consulta.email;
  document.getElementById("consulta-telefono").textContent = consulta.telefono;
  document.getElementById("consulta-fecha").textContent = fecha;
  document.getElementById("consulta-tipo").textContent = consulta.tipoConsulta;
  document.getElementById("consulta-servicio").textContent = consulta.servicio || "No especificado";
  document.getElementById("consulta-estado").textContent = consulta.estado;
  document.getElementById("consulta-newsletter").textContent = consulta.newsletter ? "Sí" : "No";
  document.getElementById("consulta-mensaje").textContent = consulta.mensaje;

  const btnMarcarAtendido = document.getElementById("btn-marcar-atendido");
  btnMarcarAtendido.disabled = consulta.atendido;
  btnMarcarAtendido.onclick = () => marcarComoAtendido(consultaId);

  const modal = new bootstrap.Modal(document.getElementById("modalDetalleConsulta"));
  modal.show();
}

// Función para marcar una consulta como atendida
async function marcarComoAtendido(consultaId) {
  try {
    const consultaRef = doc(db, "contactos", consultaId);
    await updateDoc(consultaRef, {
      atendido: true,
      estado: "Atendido"
    });

    // Actualizar los datos locales
    const consultaIndex = consultasData.findIndex(c => c.id === consultaId);
    if (consultaIndex !== -1) {
      consultasData[consultaIndex].atendido = true;
      consultasData[consultaIndex].estado = "Atendido";
    }

    mostrarToast("Consulta marcada como atendida", "success");
    mostrarConsultas();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById("modalDetalleConsulta"));
    modal.hide();
  } catch (error) {
    console.error("Error al marcar consulta como atendida:", error);
    mostrarToast("Error al actualizar la consulta", "error");
  }
}

// Función para mostrar toasts
function mostrarToast(mensaje, tipo) {
  const toastContainer = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-white bg-${tipo} border-0`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");
  
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${mensaje}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
  
  toast.addEventListener("hidden.bs.toast", () => {
    toast.remove();
  });
}

// Inicializar eventos
document.addEventListener("DOMContentLoaded", () => {
  // Cargar consultas iniciales
  cargarConsultas();

  // Configurar filtros
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener("click", (e) => {
      document.querySelectorAll('[data-filter]').forEach(btn => btn.classList.remove("active"));
      e.target.classList.add("active");
      currentFilter = e.target.dataset.filter;
      mostrarConsultas();
    });
  });
});

// Exportar funciones necesarias
window.verDetalleConsulta = verDetalleConsulta; 