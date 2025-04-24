import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import { auth, db } from "./firebase-config.js";

// 1. Función para verificar si la hora está disponible
async function verificarHoraDisponible(servicio, fecha, hora) {
  const turnosRef = collection(db, "turnos");
  const qHora = query(
    turnosRef,
    where("servicio", "==", servicio),
    where("fecha", "==", fecha),
    where("hora", "==", hora)
  );

  const snapshot = await getDocs(qHora);

  // Si ya hay un turno para esa hora, retornamos false
  return snapshot.size === 0;
}

// 2. Función para actualizar las horas disponibles dinámicamente
async function actualizarHorasDisponibles(servicio, fecha) {
  const horas = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
  ];

  const selectHoras = document.getElementById("hora");
  selectHoras.innerHTML = '<option value="">Selecciona una hora</option>';

  if (!fecha) return;

  const turnosRef = collection(db, "turnos");
  const q = query(
    turnosRef,
    where("servicio", "==", servicio),
    where("fecha", "==", fecha)
  );
  const snapshot = await getDocs(q);

  // Contar cantidad de turnos por hora
  const conteoHoras = {};
  snapshot.forEach((doc) => {
    const hora = doc.data().hora;
    conteoHoras[hora] = (conteoHoras[hora] || 0) + 1;
  });

  horas.forEach((hora) => {
    const cantidad = conteoHoras[hora] || 0;
    const option = document.createElement("option");
    option.value = hora;

    if (cantidad >= 5) {
      option.textContent = `${hora} - No disponible`;
      option.disabled = true;
      option.style.color = "#999"; // gris clarito
    } else {
      option.textContent = hora;
    }

    selectHoras.appendChild(option);
  });

  // Limitar a 30 turnos por día
  if (snapshot.size >= 30) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No hay más turnos disponibles para este día";
    option.disabled = true;
    selectHoras.innerHTML = ""; // limpiamos y solo mostramos este mensaje
    selectHoras.appendChild(option);
  }
}

// 3. Validación de fecha: solo se pueden seleccionar días hábiles (lunes a viernes)
document.getElementById("fecha").addEventListener("change", async function () {
  const servicio = document.getElementById("service-name").textContent;
  const fechaSeleccionada = new Date(this.value);
  const diaSemana = fechaSeleccionada.getUTCDay(); // 0 = domingo, 6 = sábado

  if (diaSemana === 0 || diaSemana === 6) {
    document.getElementById("aviso-dia").classList.remove("d-none");
    this.value = "";
    document.getElementById("hora").innerHTML =
      '<option value="">Selecciona una hora</option>';
    return;
  } else {
    document.getElementById("aviso-dia").classList.add("d-none");
  }

  await actualizarHorasDisponibles(servicio, this.value);
});

// 4. Lógica del formulario (submit)
const form = document.getElementById("form-turno");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const servicio = document.getElementById("service-name").textContent;
  const fecha = document.getElementById("fecha").value;
  const hora = document.getElementById("hora").value;
  const comentario = document.getElementById("comentario").value;

  const user = auth.currentUser;

  const cerrarModalTurno = () => {
    const modalTurno = bootstrap.Modal.getInstance(
      document.getElementById("modalTurno")
    );
    if (modalTurno) modalTurno.hide();
  };

  if (!user) {
    cerrarModalTurno();
    const modalLogin = new bootstrap.Modal(
      document.getElementById("modalRequiereLogin")
    );
    modalLogin.show();
    return;
  }

  if (!user.emailVerified) {
    cerrarModalTurno();
    const modalVerifica = new bootstrap.Modal(
      document.getElementById("modalVerificaCorreo")
    );
    modalVerifica.show();
    return;
  }

  const turnosRef = collection(db, "turnos");
  const qHora = query(
    turnosRef,
    where("servicio", "==", servicio),
    where("fecha", "==", fecha),
    where("hora", "==", hora)
  );
  const qDia = query(
    turnosRef,
    where("servicio", "==", servicio),
    where("fecha", "==", fecha)
  );

  const [snapshotHora, snapshotDia] = await Promise.all([
    getDocs(qHora),
    getDocs(qDia),
  ]);

  if (snapshotHora.size >= 5) {
    mostrarToast(
      "Ese horario ya está completo. Por favor, elige otro.",
      "warning"
    );
    return;
  }

  if (snapshotDia.size >= 50) {
    mostrarToast("Ese día ya no tiene más turnos disponibles.", "warning");
    return;
  }

  // Verificar si el usuario ya tiene un turno en ese horario
  const turnoExistente = snapshotHora.docs.find(
    (doc) => doc.data().uid === user.uid
  );

  if (turnoExistente) {
    mostrarToast("Ya reservaste un turno en este horario.", "warning");
    return;
  }

  try {
    const perfilRef = doc(db, "users", user.uid);
    const perfilSnap = await getDoc(perfilRef);
  
    if (!perfilSnap.exists()) {
      mostrarToast(
        "Por favor, completa tu Nombre Completo, Apellido y DNI en tu perfil.",
        "danger"
      );
      return;
    }
  
    const perfilData = perfilSnap.data();
    const nombre = perfilData?.nombre?.trim();
    const apellido = perfilData?.apellido?.trim();
    const dni = perfilData?.dni?.trim();
  
    const camposFaltantes = [];
  
    if (!nombre) camposFaltantes.push("Nombre Completo");
    if (!apellido) camposFaltantes.push("Apellido");
    if (!dni) camposFaltantes.push("DNI");
  
    if (camposFaltantes.length === 3) {
      mostrarToast(
        "Por favor, completa tu Nombre Completo, Apellido y DNI en tu perfil.",
        "danger"
      );
      return;
    }
  
    if (camposFaltantes.length > 0) {
      const campos = camposFaltantes.join(", ");
      mostrarToast(
        `Tu perfil está incompleto. Faltan los siguientes campos: ${campos}.`,
        "danger"
      );
      return;
    }

    const perfil = perfilSnap.data();

    await addDoc(turnosRef, {
      uid: user.uid,
      nombreUsuario: perfil.nombreUsuario || "",
      nombre: perfil.nombre || "",
      apellido: perfil.apellido || "",
      dni: perfil.dni || "",
      email: user.email,
      servicio,
      fecha,
      hora,
      comentario,
      timestamp: new Date(),
    });

    mostrarToast("Turno reservado con éxito", "success");
    form.reset();

    const modalTurno = bootstrap.Modal.getInstance(
      document.getElementById("modalTurno")
    );
    if (modalTurno) modalTurno.hide();
  } catch (error) {
    console.error("Error al guardar turno:", error);
    mostrarToast("Error al guardar el turno. Intentá más tarde.", "danger");
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

export function selectService(serviceName) {
  document.getElementById("service-name").textContent = serviceName;

  const fechaInput = document.getElementById("fecha");
  const hoy = new Date();
  const fechaMin = hoy.toISOString().split("T")[0];
  fechaInput.value = "";
  fechaInput.setAttribute("min", fechaMin);

  // Oculta el aviso si estaba visible
  document.getElementById("aviso-dia").classList.add("d-none");
}
