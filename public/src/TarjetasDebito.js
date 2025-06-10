import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db, auth } from "./firebase-config.js";

// Función para cargar las tarjetas del usuario
export async function cargarTarjetas() {
    const contenedorTarjetas = document.getElementById('contenedorTarjetas');
    const mensajeSinTarjetas = document.getElementById('mensajeSinTarjetas');
    
    try {
        const userId = auth.currentUser.uid;
        const tarjetasRef = collection(db, 'tarjetas');
        const q = query(tarjetasRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            mensajeSinTarjetas.style.display = 'block';
            return;
        }

        mensajeSinTarjetas.style.display = 'none';
        contenedorTarjetas.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const tarjeta = doc.data();
            const tarjetaElement = crearTarjetaElement(tarjeta, doc.id);
            contenedorTarjetas.appendChild(tarjetaElement);
        });
    } catch (error) {
        console.error('Error al cargar tarjetas:', error);
        mostrarToast('Error al cargar las tarjetas', 'error');
    }
}

// Función para crear el elemento HTML de una tarjeta
function crearTarjetaElement(tarjeta, tarjetaId) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4';
    
    const ultimos4 = tarjeta.numeroTarjeta.slice(-4);

    col.innerHTML = `
        <div class="card h-100 border-0 shadow-sm" style="background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);">
            <div class="card-body text-white">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h6 class="mb-1">Tarjeta de Débito</h6>
                        <small class="text-white-50">Termina en ${ultimos4}</small>
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-link text-white p-0" type="button" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item text-danger" href="#" onclick="eliminarTarjeta('${tarjetaId}')">
                                <i class="bi bi-trash me-2"></i>Eliminar tarjeta
                            </a></li>
                        </ul>
                    </div>
                </div>
                <div class="mb-3">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-credit-card-2-front me-2"></i>
                        <span>**** **** **** ${ultimos4}</span>
                    </div>
                    <div class="d-flex align-items-center mt-2">
                        <i class="bi bi-calendar me-2"></i>
                        <span>Vence: ${tarjeta.fechaVencimiento}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

// Función para agregar una nueva tarjeta
export async function agregarTarjeta(event) {
    event.preventDefault();
    
    const numeroTarjeta = document.getElementById('numeroTarjeta').value;
    const fechaVencimiento = document.getElementById('  ').value;
    const cvv = document.getElementById('cvv').value;

    try {
        const userId = auth.currentUser.uid;
        
        // Agregar la nueva tarjeta
        await addDoc(collection(db, 'tarjetas'), {
            userId,
            numeroTarjeta,
            fechaVencimiento,
            cvv,
            fechaCreacion: new Date()
        });

        // Cerrar modal y recargar tarjetas
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalAgregarTarjeta'));
        modal.hide();
        document.getElementById('formAgregarTarjeta').reset();
        await cargarTarjetas();
        
        mostrarToast('Tarjeta agregada exitosamente', 'success');
    } catch (error) {
        console.error('Error al agregar tarjeta:', error);
        mostrarToast('Error al agregar la tarjeta', 'error');
    }
}

// Función para eliminar una tarjeta
export async function eliminarTarjeta(tarjetaId) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta tarjeta?')) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'tarjetas', tarjetaId));
        await cargarTarjetas();
        mostrarToast('Tarjeta eliminada exitosamente', 'success');
    } catch (error) {
        console.error('Error al eliminar tarjeta:', error);
        mostrarToast('Error al eliminar la tarjeta', 'error');
    }
}

// Función para mostrar toasts
function mostrarToast(mensaje, tipo) {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${tipo === 'success' ? 'success' : 'danger'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
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
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Inicializar eventos cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    const formAgregarTarjeta = document.getElementById('formAgregarTarjeta');
    if (formAgregarTarjeta) {
        formAgregarTarjeta.addEventListener('submit', agregarTarjeta);
    }

    // Formatear número de tarjeta mientras se escribe
    const numeroTarjeta = document.getElementById('numeroTarjeta');
    if (numeroTarjeta) {
        numeroTarjeta.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }

    // Formatear fecha de vencimiento mientras se escribe
    const fechaVencimiento = document.getElementById('fechaVencimiento');
    if (fechaVencimiento) {
        fechaVencimiento.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2);
            }
            e.target.value = value;
        });
    }

    // Formatear CVV mientras se escribe
    const cvv = document.getElementById('cvv');
    if (cvv) {
        cvv.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }

    // Cargar tarjetas al iniciar
    cargarTarjetas();
}); 
