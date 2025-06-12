import { auth, db } from "./firebase-config.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Función para convertir archivo a base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Función para manejar la solicitud de rol profesional
export async function solicitarRolProfesional(event) {
    event.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
        mostrarToast("Debes iniciar sesión para realizar esta acción", "warning");
        return;
    }

    const nombreCompleto = document.getElementById("nombreCompleto").value;
    const profesion = document.getElementById("profesion").value;
    const matricula = document.getElementById("matricula").value;

    // Obtener servicios seleccionados
    const serviciosSeleccionados = [];
    document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
        serviciosSeleccionados.push(checkbox.value);
    });

    if (!nombreCompleto || !profesion || !matricula || serviciosSeleccionados.length === 0) {
        mostrarToast("Por favor completa todos los campos obligatorios y selecciona al menos un servicio", "warning");
        return;
    }

    // Obtener el botón de envío y mostrar loader
    const submitButton = document.querySelector('#formSolicitudProfesional button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Enviando...
    `;
    submitButton.disabled = true;

    try {
        // Actualizar datos del usuario
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            rol: "verificacion_en_proceso",
            solicitudProfesional: {
                nombreCompleto,
                profesion,
                matricula,
                servicios: serviciosSeleccionados,
                fechaSolicitud: new Date(),
                estado: "pendiente"
            }
        });

        // Cerrar el modal
        const modal = bootstrap.Modal.getInstance(document.getElementById("modalSolicitudProfesional"));
        modal.hide();

        // Actualizar UI
        const btnSolicitar = document.getElementById("btnSolicitarProfesional");
        btnSolicitar.textContent = "Verificación en proceso";
        btnSolicitar.disabled = true;
        btnSolicitar.classList.remove("btn-success");
        btnSolicitar.classList.add("btn-secondary");

        mostrarToast("Solicitud enviada correctamente", "success");
    } catch (error) {
        console.error("Error al procesar la solicitud:", error);
        mostrarToast("Error al procesar la solicitud", "danger");
        
        // Restaurar el botón en caso de error
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
    }
}

// Función para mostrar el estado actual de la solicitud
export async function mostrarEstadoSolicitud() {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const btnSolicitar = document.getElementById("btnSolicitarProfesional");
    const loaderSolicitud = document.getElementById("loaderSolicitud");

    // Mostrar loader mientras se verifica
    loaderSolicitud.classList.remove("d-none");
    btnSolicitar.classList.add("d-none");

    if (userSnap.exists()) {
        const userData = userSnap.data();

        // Si el usuario es admin, ocultar el botón
        if (userData.rol === "admin") {
            btnSolicitar.style.display = "none";
            loaderSolicitud.classList.add("d-none");
            return;
        }

        if (userData.rol === "verificacion_en_proceso") {
            btnSolicitar.textContent = "Verificación en proceso";
            btnSolicitar.disabled = true;
            btnSolicitar.classList.remove("btn-success");
            btnSolicitar.classList.add("btn-secondary");
            btnSolicitar.classList.add("d-none");
        } else if (userData.rol === "profesional") {
            btnSolicitar.textContent = "Profesional Verificado";
            btnSolicitar.disabled = true;
            btnSolicitar.classList.remove("btn-success");
            btnSolicitar.classList.add("btn-success");
            btnSolicitar.classList.add("d-none");
        } else if (!userData.rol || userData.rol === "usuario") {
            btnSolicitar.classList.remove("d-none");
        }
    }

    // Ocultar loader después de verificar
    loaderSolicitud.classList.add("d-none");
}

// Función auxiliar para mostrar toasts
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