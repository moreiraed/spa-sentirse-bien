import { auth, db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Verificar si el usuario es administrador
async function verificarAdmin(user) {
  if (!user) return false;

  document.getElementById('loading-container').style.display = 'flex';

  const userDoc = await getDoc(doc(db, "users", user.uid));

  if (!userDoc.exists()) {
    document.getElementById('loading-container').style.display = 'none';
    return false;
  }

  const userData = userDoc.data();

  if (userData.rol === "admin") {
    document.getElementById('loading-container').style.display = 'none';
    document.getElementById('contenido').style.display = 'block';
    return true;
  } else {
    document.getElementById('loading-container').style.display = 'none';
    alert("No tienes permisos para acceder a esta página.");
    return false;
  }
}
// Cargar solicitudes pendientes
async function cargarSolicitudes() {
  const solicitudesRef = collection(db, "users");
  const q = query(solicitudesRef, where("rol", "==", "verificacion_en_proceso"));
  const querySnapshot = await getDocs(q);

  const tbody = document.getElementById("solicitudesTableBody");
  tbody.innerHTML = "";

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const solicitud = data.solicitudProfesional;

    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${data.username}</td>
            <td>${solicitud.nombreCompleto}</td>
            <td>${solicitud.profesion}</td>
            <td>${solicitud.matricula}</td>
            <td>${new Date(solicitud.fechaSolicitud.toDate()).toLocaleDateString()}</td>
            <td class="text-nowrap">
                <button class="btn btn-sm btn-details me-2" onclick="aprobarSolicitud('${doc.id}')">
                    <i class="bi bi-check-circle"></i> Aprobar
                </button>
                <button class="btn btn-sm btn-delete" onclick="rechazarSolicitud('${doc.id}')">
                    <i class="bi bi-x-circle"></i> Rechazar
                </button>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

// Cargar profesionales ordenados alfabéticamente (versión simplificada)
async function cargarProfesionales() {
  const profesionalesRef = collection(db, "users");
  const q = query(profesionalesRef, where("rol", "==", "profesional"));
  const querySnapshot = await getDocs(q);

  const profesionales = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    profesionales.push({
      id: doc.id,
      ...data,
      nombreCompleto: `${data.nombre} ${data.apellido}`.toLowerCase(),
      fechaSolicitud: data.solicitudProfesional?.fechaSolicitud || null
    });
  });

  profesionales.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));

  const tbody = document.getElementById("profesionalesTableBody");
  tbody.innerHTML = "";

  profesionales.forEach((profesional) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${profesional.nombre} ${profesional.apellido}</td>
            <td>${profesional.email}</td>
            <td>${profesional.rol}</td>
            <td class="text-nowrap">
                <button class="btn btn-sm btn-details me-2" onclick="mostrarDetallesProfesional('${profesional.id}')">
                    <i class="bi bi-eye"></i> Detalles
                </button>
                <button class="btn btn-sm btn-delete" onclick="mostrarConfirmacionEliminar('${profesional.id}')">
                    <i class="bi bi-trash"></i> Eliminar
                </button>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

// Mostrar detalles del profesional en modal
window.mostrarDetallesProfesional = async function (userId) {
  try {
    const userRef = doc(db, "users", userId);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const solicitud = data.solicitudProfesional || {};

      // Llenar el modal con los datos
      document.getElementById('detalle-nombre').textContent = `${data.nombre} ${data.apellido}`;
      document.getElementById('detalle-username').textContent = data.username;
      document.getElementById('detalle-email').textContent = data.email;
      document.getElementById('detalle-dni').textContent = data.dni || 'No especificado';
      document.getElementById('detalle-rol').textContent = data.rol;
      document.getElementById('detalle-matricula').textContent = solicitud.matricula || 'No especificado';
      document.getElementById('detalle-profesion').textContent = solicitud.profesion || 'No especificado';

      // Formatear fecha
      const fecha = solicitud.fechaSolicitud?.toDate();
      document.getElementById('detalle-fecha').textContent = fecha ? fecha.toLocaleDateString() : 'No especificada';

      // Formatear servicios
      const servicios = solicitud.servicios || [];
      document.getElementById('detalle-servicios').textContent = servicios.length > 0
        ? servicios.join(', ')
        : 'No especificado';

      // Mostrar el modal
      const modal = new bootstrap.Modal(document.getElementById('detallesProfesionalModal'));
      modal.show();
    } else {
      mostrarToast("No se encontraron datos del profesional", "warning");
    }
  } catch (error) {
    console.error("Error al obtener detalles del profesional:", error);
    mostrarToast("Error al cargar los detalles", "danger");
  }
};

// Aprobar solicitud
window.aprobarSolicitud = async function (userId) {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      rol: "profesional",
      "solicitudProfesional.estado": "aprobado"
    });

    mostrarToast("Solicitud aprobada correctamente", "success");
    await cargarSolicitudes();
    await cargarProfesionales();
  } catch (error) {
    console.error("Error al aprobar solicitud:", error);
    mostrarToast("Error al aprobar la solicitud", "danger");
  }
};

// Rechazar solicitud
window.rechazarSolicitud = async function (userId) {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      rol: "usuario",
      "solicitudProfesional.estado": "rechazado"
    });

    mostrarToast("Solicitud rechazada", "success");
    await cargarSolicitudes();
  } catch (error) {
    console.error("Error al rechazar solicitud:", error);
    mostrarToast("Error al rechazar la solicitud", "danger");
  }
};

// Eliminar profesional
// Variable para almacenar el ID del profesional a eliminar
let profesionalAEliminar = null;

// Función para mostrar el modal de confirmación
window.mostrarConfirmacionEliminar = function (userId) {
  profesionalAEliminar = userId;
  const modal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
  modal.show();
};

// Función para eliminar profesional (ahora se llama desde el modal)
window.eliminarProfesional = async function () {
  if (!profesionalAEliminar) return;

  try {
    const userRef = doc(db, "users", profesionalAEliminar);
    await updateDoc(userRef, {
      rol: "usuario",
      "solicitudProfesional.estado": "eliminado"
    });

    mostrarToast("Profesional eliminado correctamente", "success");
    await cargarProfesionales();

    // Cerrar el modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
    modal.hide();
  } catch (error) {
    console.error("Error al eliminar profesional:", error);
    mostrarToast("Error al eliminar al profesional", "danger");
  } finally {
    profesionalAEliminar = null;
  }
};

// Event listener para el botón de confirmación
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('confirmDeleteBtn').addEventListener('click', eliminarProfesional);
});

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

// ************************ Gestion de turnos ************************

// Cargar turnos organizados por día y servicio
// Cargar turnos organizados por día y servicio
// Cargar turnos organizados por día y servicio
async function cargarTurnos() {
  try {
    const turnosRef = collection(db, "reservas");
    const q = query(turnosRef, where("estado", "==", "activo"));
    const querySnapshot = await getDocs(q);

    // Organizar turnos por fecha y servicio
    const turnosPorDia = {};

    querySnapshot.forEach((doc) => {
      const turno = doc.data();
      const fechaStr = turno.fecha; // "14 de Junio, 2025"

      // Convertir la cadena de fecha a objeto Date para ordenamiento
      const fechaDate = parseFechaString(fechaStr);

      // Crear una clave de fecha formateada para agrupar
      const fechaKey = fechaStr; // Mantenemos el formato original para mostrar

      if (!turnosPorDia[fechaKey]) {
        turnosPorDia[fechaKey] = {
          dateObj: fechaDate, // Guardamos el objeto Date para ordenar
          servicios: {}
        };
      }

      if (!turnosPorDia[fechaKey].servicios[turno.servicio]) {
        turnosPorDia[fechaKey].servicios[turno.servicio] = [];
      }

      turnosPorDia[fechaKey].servicios[turno.servicio].push({
        id: doc.id,
        ...turno,
        timestamp: turno.timestamp
      });
    });

    // Ordenar las fechas cronológicamente usando los objetos Date
    const fechasOrdenadas = Object.keys(turnosPorDia).sort((a, b) => {
      return turnosPorDia[a].dateObj - turnosPorDia[b].dateObj;
    });

    // Generar el HTML para mostrar los turnos
    const turnosContainer = document.getElementById('turnos-container');
    turnosContainer.innerHTML = '';

    if (fechasOrdenadas.length === 0) {
      turnosContainer.innerHTML = `
        <div class="alert alert-info">
          No hay turnos activos en este momento.
        </div>
      `;
      return;
    }

    fechasOrdenadas.forEach(fechaKey => {
      const { servicios } = turnosPorDia[fechaKey];
      const serviciosOrdenados = Object.keys(servicios).sort();

      // Crear contenedor para la fecha
      const fechaContainer = document.createElement('div');
      fechaContainer.className = 'mb-5';
      fechaContainer.innerHTML = `
        <h4 class="mb-3 turnos-fecha">
          <i class="bi bi-calendar-date me-2"></i>
          ${fechaKey}
        </h4>
      `;

      // Crear contenedor para los servicios de esta fecha
      const serviciosContainer = document.createElement('div');
      serviciosContainer.className = 'row g-4';

      serviciosOrdenados.forEach(servicio => {
        const turnosDelServicio = servicios[servicio];

        // Ordenar turnos por hora
        turnosDelServicio.sort((a, b) => {
          const horaA = convertirHoraAMinutos(a.hora);
          const horaB = convertirHoraAMinutos(b.hora);
          return horaA - horaB;
        });

        // Crear tarjeta para el servicio (resto del código igual...)
        const servicioCol = document.createElement('div');
        servicioCol.className = 'col-md-6 col-lg-4 service-card';

        const servicioCard = document.createElement('div');
        servicioCard.className = 'card h-100 shadow-sm';
        servicioCard.innerHTML = `
          <div class="card-header bg-light">
            <h5 class="mb-0">
              <i class="bi bi-spa me-2"></i>
              ${servicio}
            </h5>
          </div>
          <div class="card-body p-0" style="overflow: visible;">
            <ul class="list-group list-group-flush">
              ${turnosDelServicio.map(turno => `
                <li class="list-group-item" style="position: relative;">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <div class="fw-bold">${turno.nombre} ${turno.apellido}</div>
                      <div class="text-muted small">
                        <i class="bi bi-clock me-1"></i>
                        ${turno.hora}
                      </div>
                    </div>
                    <div class="dropdown dropstart"> <!-- Cambiado a dropstart para mejor posicionamiento -->
                      <button class="btn btn-sm btn-outline-secondary dropdown-toggle" 
                              type="button" data-bs-toggle="dropdown" aria-expanded="false"
                              style="z-index: 1;">
                        
                      </button>
                      <ul class="dropdown-menu dropdown-menu-end" style="position: absolute; z-index: 1000;">
                        <li>
                          <button class="dropdown-item" 
                                  onclick="mostrarDetallesTurno('${turno.id}')">
                            <i class="bi bi-eye me-2"></i>Ver detalles
                          </button>
                        </li>
                        <li>
                          <button class="dropdown-item text-success" 
                                  onclick="marcarTurnoCompletado('${turno.id}')">
                            <i class="bi bi-check-circle me-2"></i>Completar
                          </button>
                        </li>
                        <li>
                          <button class="dropdown-item text-danger" 
                                  onclick="cancelarTurno('${turno.id}')">
                            <i class="bi bi-x-circle me-2"></i>Cancelar
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </li>
              `).join('')}
            </ul>
          </div>
          <div class="card-footer bg-light text-muted small">
            ${turnosDelServicio.length} ${turnosDelServicio.length === 1 ? 'turno' : 'turnos'}
          </div>
        `;

        servicioCol.appendChild(servicioCard);
        serviciosContainer.appendChild(servicioCol);
      });

      fechaContainer.appendChild(serviciosContainer);
      turnosContainer.appendChild(fechaContainer);
    });

  } catch (error) {
    console.error("Error al cargar turnos:", error);
    mostrarToast("Error al cargar los turnos", "danger");
  }
}

// Función para convertir la cadena de fecha "14 de Junio, 2025" a objeto Date
function parseFechaString(fechaStr) {
  const meses = {
    'Enero': 0, 'Febrero': 1, 'Marzo': 2, 'Abril': 3, 'Mayo': 4, 'Junio': 5,
    'Julio': 6, 'Agosto': 7, 'Septiembre': 8, 'Octubre': 9, 'Noviembre': 10, 'Diciembre': 11
  };

  const partes = fechaStr.split(' de ');
  const dia = parseInt(partes[0]);
  const mesYAnio = partes[1].split(', ');
  const mes = meses[mesYAnio[0]];
  const anio = parseInt(mesYAnio[1]);

  return new Date(anio, mes, dia);
}

// Función auxiliar para convertir hora a minutos para ordenar
function convertirHoraAMinutos(horaStr) {
  const [horaMinuto, periodo] = horaStr.split(' ');
  const [hora, minuto] = horaMinuto.split(':').map(Number);
  let hora24 = hora;

  if (periodo === 'PM' && hora !== 12) {
    hora24 += 12;
  } else if (periodo === 'AM' && hora === 12) {
    hora24 = 0;
  }

  return hora24 * 60 + minuto;
}

// Función para mostrar detalles del turno en modal
window.mostrarDetallesTurno = async function (turnoId) {
  try {
    const turnoRef = doc(db, "reservas", turnoId);
    const docSnap = await getDoc(turnoRef);

    if (docSnap.exists()) {
      const turno = docSnap.data();

      // Llenar el modal con los datos
      document.getElementById('detalle-turno-nombre').textContent = `${turno.nombre} ${turno.apellido}`;
      document.getElementById('detalle-turno-email').textContent = turno.userEmail;
      document.getElementById('detalle-turno-dni').textContent = turno.dni;
      document.getElementById('detalle-turno-fecha').textContent = turno.fecha;
      document.getElementById('detalle-turno-hora').textContent = turno.hora;
      document.getElementById('detalle-turno-servicio').textContent = turno.servicio;
      document.getElementById('detalle-turno-profesional').textContent = turno.profesional;
      document.getElementById('detalle-turno-pago').textContent = turno.pago || 'No especificado';
      document.getElementById('detalle-turno-comentario').textContent = turno.comentario || 'Ninguno';
      document.getElementById('detalle-turno-timestamp').textContent =
        turno.timestamp ? new Date(turno.timestamp.toDate()).toLocaleString() : 'No disponible';

      // Mostrar el modal
      const modal = new bootstrap.Modal(document.getElementById('detallesTurnoModal'));
      modal.show();
    } else {
      mostrarToast("No se encontraron datos del turno", "warning");
    }
  } catch (error) {
    console.error("Error al obtener detalles del turno:", error);
    mostrarToast("Error al cargar los detalles del turno", "danger");
  }
};

// Función para marcar un turno como completado
window.marcarTurnoCompletado = async function (turnoId) {
  if (confirm("¿Marcar este turno como completado?")) {
    try {
      const turnoRef = doc(db, "reservas", turnoId);
      await updateDoc(turnoRef, {
        estado: "completado"
      });

      mostrarToast("Turno marcado como completado", "success");
      await cargarTurnos();
    } catch (error) {
      console.error("Error al completar turno:", error);
      mostrarToast("Error al completar el turno", "danger");
    }
  }
};

// Función para cancelar un turno
window.cancelarTurno = async function (turnoId) {
  if (confirm("¿Cancelar este turno?")) {
    try {
      const turnoRef = doc(db, "reservas", turnoId);
      await updateDoc(turnoRef, {
        estado: "cancelado"
      });

      mostrarToast("Turno cancelado", "success");
      await cargarTurnos();
    } catch (error) {
      console.error("Error al cancelar turno:", error);
      mostrarToast("Error al cancelar el turno", "danger");
    }
  }
};

// Modificar el onAuthStateChanged para incluir cargarTurnos
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../index.html";
    return;
  }

  const esAdmin = await verificarAdmin(user);
  if (!esAdmin) {
    window.location.href = "../index.html";
    return;
  }

  await cargarSolicitudes();
  await cargarProfesionales();
  await cargarTurnos();
});



// Verificar autenticación y permisos
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../index.html";
    return;
  }

  const esAdmin = await verificarAdmin(user);
  if (!esAdmin) {
    window.location.href = "../index.html";
    return;
  }

  await cargarSolicitudes();
  await cargarProfesionales();
});


// Función para imprimir los detalles del turno
window.imprimirTurno = function () {
  const modalContent = document.querySelector('#detallesTurnoModal .modal-content').cloneNode(true);

  // botones del footer para imprimir
  const footer = modalContent.querySelector('.modal-footer');
  footer.remove();

  // Crear ventana de impresión
  const ventanaImpresion = window.open('', '_blank');
  ventanaImpresion.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Detalles del Turno</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.5/dist/css/bootstrap.min.css" rel="stylesheet">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
            <style>
                body { padding: 20px; }
                .modal-content { border: none; box-shadow: none; }
                .modal-header { border-bottom: 1px solid #dee2e6; }
                .bg-light { background-color: #f8f9fa!important; }
            </style>
        </head>
        <body>
            ${modalContent.outerHTML}
            <script>
                window.onload = function() { window.print(); setTimeout(() => { window.close(); }, 500); }
            </script>
        </body>
        </html>
    `);
  ventanaImpresion.document.close();
};