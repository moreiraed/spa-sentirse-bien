import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

console.log("Script TarjetasDebito.js iniciado");

// Variable global para mantener el usuario actual
let currentUser = null;

// Función para obtener los elementos del DOM necesarios
function getDOMElements() {
    const contenedorTarjetas = document.getElementById('contenedorTarjetas');
    const mensajeSinTarjetas = document.getElementById('mensajeSinTarjetas');
    
    if (!contenedorTarjetas) {
        console.error("Error: No se encontró el contenedor de tarjetas");
        return null;
    }

    // Si no existe el mensaje sin tarjetas, lo creamos
    if (!mensajeSinTarjetas) {
        console.log("Creando elemento mensajeSinTarjetas");
        const mensajeElement = document.createElement('div');
        mensajeElement.id = 'mensajeSinTarjetas';
        mensajeElement.className = 'col-12 text-center py-4';
        mensajeElement.innerHTML = `
            <i class="bi bi-credit-card-2-front fs-1 text-muted"></i>
            <p class="text-muted mt-2">No tienes tarjetas registradas</p>
        `;
        mensajeElement.style.display = 'none';
        contenedorTarjetas.appendChild(mensajeElement);
        return { contenedorTarjetas, mensajeSinTarjetas: mensajeElement };
    }
    
    return { contenedorTarjetas, mensajeSinTarjetas };
}

// Función para esperar a que la autenticación esté lista
function waitForAuth() {
    return new Promise((resolve, reject) => {
        if (!auth) {
            reject(new Error("Auth no está inicializado"));
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe(); // Desuscribirse después del primer cambio
            if (user) {
                console.log("Usuario autenticado encontrado:", user.uid);
                currentUser = user; // Guardar el usuario actual
                resolve(user);
            } else {
                console.log("No hay usuario autenticado");
                currentUser = null;
                reject(new Error("No hay usuario autenticado"));
            }
        });
    });
}

// Función para cargar las tarjetas del usuario
async function cargarTarjetas() {
    if (!currentUser || !currentUser.uid) {
        console.error("Error: Usuario no válido para cargar tarjetas");
        return;
    }

    console.log("Iniciando carga de tarjetas para userId:", currentUser.uid);
    
    const elements = getDOMElements();
    if (!elements) {
        console.error("No se pudieron obtener los elementos del DOM");
        return;
    }
    
    const { contenedorTarjetas, mensajeSinTarjetas } = elements;

    try {
        // Limpiar el contenedor primero
        contenedorTarjetas.innerHTML = '';
        mensajeSinTarjetas.style.display = 'none';

        console.log("Buscando tarjetas para el usuario:", currentUser.uid);
        const tarjetasRef = collection(db, 'tarjetas');
        const q = query(tarjetasRef, where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);

        console.log("Número de tarjetas encontradas:", querySnapshot.size);

        if (querySnapshot.empty) {
            console.log("No se encontraron tarjetas");
            mensajeSinTarjetas.style.display = 'block';
            return;
        }

        // Crear un fragmento para mejorar el rendimiento
        const fragment = document.createDocumentFragment();
        
        querySnapshot.forEach((doc) => {
            const tarjeta = doc.data();
            const tarjetaElement = crearTarjetaElement(tarjeta, doc.id);
            fragment.appendChild(tarjetaElement);
        });

        // Agregar todas las tarjetas de una vez
        contenedorTarjetas.appendChild(fragment);
        
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
    const tipoTarjeta = tarjeta.tipoTarjeta || 'visa'; // Por defecto visa si no está especificado

    // Definir estilos según el tipo de tarjeta
    const estilosTarjeta = {
        visa: {
            background: 'linear-gradient(135deg, #1a1f71 0%, #0d47a1 100%)',
            logo: 'bi-credit-card-2-front',
            logoColor: '#ffffff'
        },
        mastercard: {
            background: 'linear-gradient(135deg, #ff8008 0%, #ffc837 100%)',
            logo: 'bi-credit-card',
            logoColor: '#ffffff'
        }
    };

    const estilo = estilosTarjeta[tipoTarjeta] || estilosTarjeta.visa;

    col.innerHTML = `
        <div class="card h-100 border-0 shadow-sm" style="background: ${estilo.background};">
            <div class="card-body text-white">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h6 class="mb-1">Tarjeta ${tipoTarjeta === 'visa' ? 'Visa' : 'MasterCard'}</h6>
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
                        <i class="bi ${estilo.logo} me-2" style="color: ${estilo.logoColor}"></i>
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
async function agregarTarjeta(event) {
    if (!currentUser || !currentUser.uid) {
        console.error("Error: Usuario no válido para agregar tarjeta");
        return;
    }

    event.preventDefault();
    
    const form = event.target;
    const numeroTarjeta = form.numeroTarjeta.value;
    const fechaVencimiento = form.fechaVencimiento.value;
    const cvv = form.cvv.value;
    const tipoTarjeta = form.tipoTarjeta.value;

    try {
        // Agregar la nueva tarjeta
        await addDoc(collection(db, 'tarjetas'), {
            userId: currentUser.uid,
            numeroTarjeta,
            fechaVencimiento,
            cvv,
            tipoTarjeta,
            fechaCreacion: new Date()
        });

        // Cerrar modal y limpiar formulario
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalAgregarTarjeta'));
        modal.hide();
        form.reset();
        
        // Recargar las tarjetas inmediatamente
        await cargarTarjetas();
        mostrarToast('Tarjeta agregada exitosamente', 'success');
    } catch (error) {
        console.error('Error al agregar tarjeta:', error);
        mostrarToast('Error al agregar la tarjeta', 'error');
    }
}

// Función para eliminar una tarjeta
async function eliminarTarjeta(tarjetaId) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta tarjeta?')) {
        return;
    }

    try {
        if (!currentUser || !currentUser.uid) {
            throw new Error("No hay usuario autenticado");
        }

        // Eliminar la tarjeta
        await deleteDoc(doc(db, 'tarjetas', tarjetaId));
        
        // Recargar las tarjetas inmediatamente
        await cargarTarjetas();
        mostrarToast('Tarjeta eliminada exitosamente', 'success');
    } catch (error) {
        console.error('Error al eliminar tarjeta:', error);
        mostrarToast('Error al eliminar la tarjeta', 'error');
    }
}

// Hacer la función eliminarTarjeta disponible globalmente
window.eliminarTarjeta = eliminarTarjeta;

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
try {
    console.log("Intentando inicializar TarjetasDebito.js");
    
    document.addEventListener('DOMContentLoaded', async () => {
        console.log("DOM cargado, esperando autenticación...");
        
        try {
            // Esperar a que la autenticación esté lista
            await waitForAuth();
            console.log("Autenticación lista, usuario:", currentUser.uid);

            // Verificar que los elementos del DOM estén disponibles
            const elements = getDOMElements();
            if (!elements) {
                throw new Error("No se encontraron los elementos necesarios del DOM");
            }

            // Cargar tarjetas inicialmente
            await cargarTarjetas();

            // Configurar el formulario de agregar tarjeta
            const formAgregarTarjeta = document.getElementById('formAgregarTarjeta');
            if (formAgregarTarjeta) {
                console.log("Formulario de tarjeta encontrado, configurando evento...");
                formAgregarTarjeta.addEventListener('submit', agregarTarjeta);
            } else {
                console.log("Formulario de tarjeta no encontrado en el DOM");
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
        } catch (error) {
            console.error("Error en la inicialización:", error);
            mostrarToast('Error al inicializar la página', 'error');
        }
    });
} catch (error) {
    console.error("Error crítico en la inicialización de TarjetasDebito.js:", error);
} 
