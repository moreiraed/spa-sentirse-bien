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
window.mostrarDetallesProfesional = async function(userId) {
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
window.aprobarSolicitud = async function(userId) {
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
window.rechazarSolicitud = async function(userId) {
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
window.mostrarConfirmacionEliminar = function(userId) {
    profesionalAEliminar = userId;
    const modal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
    modal.show();
};

// Función para eliminar profesional (ahora se llama desde el modal)
window.eliminarProfesional = async function() {
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