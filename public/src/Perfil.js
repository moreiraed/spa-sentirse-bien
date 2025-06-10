import {
  onAuthStateChanged,
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import { auth, db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { solicitarRolProfesional, mostrarEstadoSolicitud } from "./SolicitudProfesional.js";

function actualizarEstadoVerificacion(user) {
  const emailInput = document.getElementById("email");
  const emailGroup = document.getElementById("emailGroup");

  if (user.emailVerified) {
    document.getElementById("alertaVerificacion").classList.add("d-none");
    document.getElementById("estadoVerificacionOk").classList.remove("d-none");

    emailInput.classList.remove("is-invalid");
    emailInput.classList.add("is-valid");
    emailGroup.style.border = "1px solid #28a745";
  } else {
    document.getElementById("alertaVerificacion").classList.remove("d-none");
    document.getElementById("estadoVerificacionOk").classList.add("d-none");

    emailInput.classList.remove("is-valid");
    emailInput.classList.add("is-invalid");
    emailGroup.style.border = "1px solid #dc3545"; 
  }
}

// Escuchar el estado de autenticación
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../index.html";
  } else {
    document.getElementById("loading-container").style.display = "none";
    document.getElementById("contenido").style.display = "block";
    
    document.getElementById("email").value = user.email;

    // Establecer placeholders en "Cargando..." hasta que los datos estén listos
    document.getElementById("nombre").placeholder = "Cargando...";
    document.getElementById("apellido").placeholder = "Cargando...";
    document.getElementById("dni").placeholder = "Cargando...";
    document.getElementById("usuario").placeholder = "Cargando...";

    await user.reload();
    actualizarEstadoVerificacion(user);

    // Cargar datos de Firestore
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      // Actualizar los valores de los campos y placeholders con los datos de Firestore
      document.getElementById("nombre").value = data.nombre || "";
      document.getElementById("apellido").value = data.apellido || "";
      document.getElementById("dni").value = data.dni || "";
      document.getElementById("usuario").value = data.username || "";

      // Mostrar servicios de especialización si es profesional
      if (data.rol === "profesional" && data.solicitudProfesional?.servicios) {
        const serviciosEspecializacion = document.getElementById("serviciosEspecializacion");
        const listaServicios = document.getElementById("listaServicios");
        
        serviciosEspecializacion.classList.remove("d-none");
        listaServicios.innerHTML = "";

        data.solicitudProfesional.servicios.forEach(servicio => {
          const servicioElement = document.createElement("div");
          servicioElement.className = "col-12 col-md-6 col-lg-4";
          servicioElement.innerHTML = `
            <div class="card h-100 border-0 shadow-sm">
              <div class="card-body text-center">
                <i class="bi bi-check-circle-fill text-success fs-4 mb-2"></i>
                <h6 class="card-title mb-0">${servicio}</h6>
              </div>
            </div>
          `;
          listaServicios.appendChild(servicioElement);
        });
      }

      // Manejar la visibilidad del botón de solicitud profesional
      const btnSolicitar = document.getElementById("btnSolicitarProfesional");
      const loaderSolicitud = document.getElementById("loaderSolicitud");
      
      // Ocultar el loader
      loaderSolicitud.classList.add("d-none");
      
      // Mostrar el botón solo si el usuario no tiene un rol específico
      if (!data.rol || data.rol === "usuario") {
        btnSolicitar.classList.remove("d-none");
      } else {
        btnSolicitar.classList.add("d-none");
      }

      // Actualizar los placeholders en caso de que estén vacíos
      document.getElementById("nombre").placeholder =
        data.nombre || "Nombre real";
      document.getElementById("apellido").placeholder =
        data.apellido || "Apellido";
      document.getElementById("dni").placeholder = data.dni || "DNI";
      document.getElementById("usuario").placeholder =
        data.username || "Nombre de usuario";
    } else {
      // Si no existen datos, establecer placeholders por defecto
      document.getElementById("nombre").placeholder = "Nombre real";
      document.getElementById("apellido").placeholder = "Apellido";
      document.getElementById("dni").placeholder = "DNI";
      document.getElementById("usuario").placeholder = "Nombre de usuario";
    }

    // Guardar cambios
    document
      .getElementById("btnGuardarPerfil")
      .addEventListener("click", async () => {
        const nombre = document.getElementById("nombre").value;
        const apellido = document.getElementById("apellido").value;
        const dni = document.getElementById("dni").value;

        try {
          await setDoc(userRef, { nombre, apellido, dni }, { merge: true });
          alert("Datos guardados correctamente.");
        } catch (error) {
          console.error("Error al guardar perfil:", error);
          alert("Hubo un error al guardar tus datos.");
        }
      });

    // Reenviar verificación
    document
      .getElementById("btnReenviarVerificacion")
      .addEventListener("click", async () => {
        try {
          await sendEmailVerification(user);
          document.getElementById("alertaVerificacion").innerHTML = `
          Se ha reenviado el correo de verificación a <strong>${user.email}</strong>.
          <br><small>Revisá tu bandeja de entrada o spam.</small>
        `;
        } catch (error) {
          console.error("Error al reenviar verificación:", error);
          document.getElementById("alertaVerificacion").innerHTML = `
          <strong class="text-danger">Error al reenviar el correo:</strong> ${error.message}
        `;
        }
      });
    // Llamar a las funciones de cambiar contraseña
    document
      .getElementById("guardarPassword")
      .addEventListener("click", cambiarPassword);

    // Configurar el botón de solicitud de rol profesional
    const btnSolicitar = document.getElementById("btnSolicitarProfesional");
    if (btnSolicitar) {
      btnSolicitar.addEventListener("click", () => {
        const modal = new bootstrap.Modal(document.getElementById("modalSolicitudProfesional"));
        modal.show();
      });
    }

    // Configurar el formulario de solicitud
    const formSolicitud = document.getElementById("formSolicitudProfesional");
    if (formSolicitud) {
      formSolicitud.addEventListener("submit", solicitarRolProfesional);
    }

    // Mostrar estado actual de la solicitud
    await mostrarEstadoSolicitud();
  }
});

// Verificación en vivo
setInterval(async () => {
  const user = auth.currentUser;
  if (user) {
    await user.reload();
    actualizarEstadoVerificacion(user);
  }
}, 5000);

// Cambiar contraseña
async function cambiarPassword() {
  const nueva = document.getElementById("nuevaPassword").value;
  const confirmar = document.getElementById("confirmarPassword").value;
  const contraseñaActual = document.getElementById("contraseñaActual").value;

  if (nueva !== confirmar || nueva.length < 6) {
    // Mostrar toast de error
    mostrarToast(
      "Las contraseñas deben coincidir y tener al menos 6 caracteres.",
      "danger"
    );
    return;
  }

  if (!contraseñaActual) {
    // Mostrar toast de advertencia
    mostrarToast("Por favor ingresa tu contraseña actual.", "warning");
    return;
  }

  const user = auth.currentUser;

  try {
    // Reautenticar al usuario con la contraseña actual
    const credenciales = EmailAuthProvider.credential(
      user.email,
      contraseñaActual
    );
    await reauthenticateWithCredential(user, credenciales);

    // Si la reautenticación fue exitosa, actualizamos la contraseña
    await updatePassword(user, nueva);

    mostrarToast("Contraseña actualizada correctamente.", "success");

    // Cerrar el modal
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("modalEditarPassword")
    );
    modal.hide();
  } catch (error) {
    console.error("Error al cambiar la contraseña:", error);
    mostrarToast("Error: " + error.message, "danger");
  }
}

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