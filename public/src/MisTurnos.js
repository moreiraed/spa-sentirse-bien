import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  deleteDoc,
  getDoc,
  updateDoc,
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
  .turno-estado-pago {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.9em;
    font-weight: 500;
    margin-top: 8px;
  }
  .turno-estado-pago.abonado {
    background-color: rgba(40, 167, 69, 0.1);
    color: #28a745;
  }
  .turno-estado-pago.pendiente {
    background-color: rgba(255, 193, 7, 0.1);
    color: #ffc107;
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
  .btn-container {
    display: flex;
    gap: 10px;
    margin-top: 18px;
  }
  .btn-container button {
    flex: 1;
  }
  .imprimir-btn {
    background-color: #6F5448;
    color: #fff;
    border: none;
    padding: 8px 0;
    border-radius: 8px;
    font-weight: 500;
    transition: background 0.2s, box-shadow 0.2s;
    box-shadow: 0 2px 8px rgba(168, 159, 145, 0.08);
  }
  .imprimir-btn:hover {
    background-color: rgba(116, 58, 4, 0.6);
    border-color: #6F5448;
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

  // Verificar si el usuario es profesional
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();

  let turnosQuery;
  if (userData?.rol === "profesional") {
    // Si es profesional, buscar turnos donde él es el profesional asignado
    turnosQuery = query(
      collection(db, "reservas"),
      where("profesional", "==", `${userData.nombre} ${userData.apellido}`),
      orderBy("fecha", "asc"),
      orderBy("hora", "asc")
    );
  } else {
    // Si es usuario normal, buscar sus propios turnos
    turnosQuery = query(
      collection(db, "reservas"),
      where("userId", "==", user.uid),
      orderBy("fecha", "asc"),
      orderBy("hora", "asc")
    );
  }

  const snapshot = await getDocs(turnosQuery);

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
        ${userData?.rol === "profesional" ? "No tenés turnos asignados." : "Aún no tenés turnos reservados."}
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
    div.classList.add("turno-item");

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
        ${userData?.rol !== "profesional" ? `
          <div class="turno-profesional">
            <i class="bi bi-person me-2"></i>
            ${turno.profesional}
          </div>
        ` : `
          <div class="turno-cliente">
            <i class="bi bi-person me-2"></i>
            Cliente: ${turno.nombre} ${turno.apellido}
          </div>
        `}
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
        <div class="turno-estado-pago ${turno.pago === 'debitCard' ? 'abonado' : 'pendiente'}">
          <i class="bi ${turno.pago === 'debitCard' ? 'bi-check-circle' : 'bi-clock'} me-2"></i>
          ${turno.pago === 'debitCard' ? 'Abonado' : 'Pago pendiente'}
        </div>
        <div class="turno-timestamp">
          <i class="bi bi-clock-history me-2"></i>
          Reservado el ${new Date(turno.timestamp?.toDate()).toLocaleString()}
        </div>
      </div>
      ${userData?.rol !== "profesional" ? `
        <button class="cancelar-btn">
          <i class="bi bi-x-circle me-2"></i>Cancelar turno
        </button>
      ` : `
        <div class="btn-container">
          <button class="btn btn-success">
            <i class="bi bi-check-circle me-2"></i>Marcar como completado
          </button>
          <button class="imprimir-btn">
            <i class="bi bi-printer me-2"></i>Imprimir
          </button>
        </div>
      `}
    `;

    // Añadimos el evento al botón según el rol
    if (userData?.rol !== "profesional") {
      div.querySelector(".cancelar-btn").addEventListener("click", () => {
        cancelarTurno(turno.id, div);
      });
    } else {
      div.querySelector(".btn-success").addEventListener("click", () => {
        marcarTurnoCompletado(turno.id, div);
      });
      div.querySelector(".imprimir-btn").addEventListener("click", () => {
        imprimirTurno(turno);
      });
    }

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

// Función para marcar un turno como completado (solo para profesionales)
async function marcarTurnoCompletado(turnoId, turnoDiv) {
  const confirmar = confirm("¿Estás seguro de que querés marcar este turno como completado?");
  if (!confirmar) return;

  try {
    await updateDoc(doc(db, "reservas", turnoId), {
      estado: "completado",
      fechaCompletado: new Date()
    });

    // Agregar animación para que el turno desaparezca
    turnoDiv.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    turnoDiv.style.opacity = "0";
    turnoDiv.style.transform = "scale(0.9)";

    setTimeout(() => {
      turnoDiv.remove();
    }, 500);

    // Mostrar un mensaje de éxito
    mostrarToast("Turno marcado como completado.", "success");
  } catch (error) {
    console.error("Error al marcar el turno como completado:", error);
    mostrarToast(
      "Ocurrió un error al marcar el turno como completado. Intentá más tarde.",
      "danger"
    );
  }
}

// Función para imprimir el turno
function imprimirTurno(turno) {
  const ventanaImpresion = window.open('', '_blank');
  ventanaImpresion.document.write(`
    <html>
      <head>
        <title>Turno - ${turno.servicio}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');
          
          body {
            font-family: 'Poppins', Arial, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            background-color: #fff;
            color: #333;
          }
          
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #D9D2C5;
          }
          
          .logo {
            max-width: 200px;
            margin-bottom: 20px;
          }
          
          .header h1 {
            color: #6F5448;
            font-size: 28px;
            margin: 0;
            font-weight: 600;
          }
          
          .info-turno {
            background-color: #f8f9fa;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 8px rgba(168, 159, 145, 0.08);
          }
          
          .info-turno p {
            margin: 15px 0;
            font-size: 16px;
            display: flex;
            align-items: center;
          }
          
          .info-turno strong {
            color: #6F5448;
            min-width: 150px;
            display: inline-block;
          }
          
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #D9D2C5;
            color: #666;
            font-size: 14px;
          }
          
          @media print {
            body {
              padding: 20px;
            }
            
            .info-turno {
              box-shadow: none;
              border: 1px solid #D9D2C5;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="../assets/icon/icon.png" alt="Spa Logo" class="logo">
          <h1>Turno Reservado</h1>
        </div>
        <div class="info-turno">
          <p><strong>Servicio:</strong> ${turno.servicio}</p>
          <p><strong>Cliente:</strong> ${turno.nombre} ${turno.apellido}</p>
          <p><strong>Profesional:</strong> ${turno.profesional}</p>
          <p><strong>Fecha:</strong> ${turno.fecha}</p>
          <p><strong>Hora:</strong> ${turno.hora}</p>
          <p><strong>Método de pago:</strong> ${turno.pago || "No especificado"}</p>
          ${turno.comentario ? `<p><strong>Comentario:</strong> ${turno.comentario}</p>` : ''}
        </div>
        <div class="footer">
          <p>Spa Sentirse Bien - Tu bienestar es nuestra prioridad</p>
          <p>Reservado el ${new Date(turno.timestamp?.toDate()).toLocaleString()}</p>
        </div>
      </body>
    </html>
  `);
  ventanaImpresion.document.close();
  ventanaImpresion.print();
}
