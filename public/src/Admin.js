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
    // Si no hay usuario, retornamos false (no es admin)
    if (!user) return false;

    // Mostrar el loader mientras verificamos
    document.getElementById('loading-container').style.display = 'flex';

    // Obtenemos el documento del usuario desde Firebase
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    // Si no existe el documento del usuario, retornamos false (no es admin)
    if (!userDoc.exists()) {
        document.getElementById('loading-container').style.display = 'none';
        return false;
    }

    // Obtenemos los datos del usuario
    const userData = userDoc.data();

    // Si es admin, mostramos el contenido
    if (userData.rol === "admin") {
        document.getElementById('loading-container').style.display = 'none';  // Ocultamos el loader
        document.getElementById('contenido').style.display = 'block';          // Mostramos el contenido
        return true;
    } else {
        // Si no es admin, mostramos el loader y luego redirigimos o mostramos mensaje
        document.getElementById('loading-container').style.display = 'none'; // Ocultamos el loader
        alert("No tienes permisos para acceder a esta página.");
        // Puedes redirigir a otra página aquí si lo deseas
        // window.location.href = "/no-autorizado"; 
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
            <td>
                <button class="btn btn-sm btn-success" onclick="aprobarSolicitud('${doc.id}')">
                    Aprobar
                </button>
                <button class="btn btn-sm btn-danger" onclick="rechazarSolicitud('${doc.id}')">
                    Rechazar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

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

    // Cargar solicitudes pendientes
    await cargarSolicitudes();
}); 