import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

console.log("Script TarjetasDebito.js iniciado");

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
                resolve(user);
            } else {
                console.log("No hay usuario autenticado");
                reject(new Error("No hay usuario autenticado"));
            }
        });
    });
}

// Función para cargar las tarjetas del usuario
async function cargarTarjetas(user) {
    if (!user || !user.uid) {
        console.error("Error: Usuario no válido para cargar tarjetas");
        return;
    }

    console.log("Iniciando carga de tarjetas para userId:", user.uid);
    
    const contenedorTarjetas = document.getElementById('contenedorTarjetas');
    const mensajeSinTarjetas = document.getElementById('mensajeSinTarjetas');
    
    if (!contenedorTarjetas || !mensajeSinTarjetas) {
        console.error("Error: No se encontraron elementos del DOM necesarios");
        return;
    }

    try {
        console.log("Buscando tarjetas para el usuario:", user.uid);
        const tarjetasRef = collection(db, 'tarjetas');
        const q = query(tarjetasRef, where('userId', '==', user.uid));
        console.log("Query creada, ejecutando getDocs...");
        const querySnapshot = await getDocs(q);

        console.log("Número de tarjetas encontradas:", querySnapshot.size);

        if (querySnapshot.empty) {
            console.log("No se encontraron tarjetas");
            mensajeSinTarjetas.style.display = 'block';
            contenedorTarjetas.innerHTML = '';
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
async function agregarTarjeta(event, user) {
    if (!user || !user.uid) {
        console.error("Error: Usuario no válido para agregar tarjeta");
        return;
    }

    console.log("Iniciando proceso de agregar tarjeta...");
    event.preventDefault();
    
    const numeroTarjeta = document.getElementById('numeroTarjeta').value;
    const fechaVencimiento = document.getElementById('fechaVencimiento').value;
    const cvv = document.getElementById('cvv').value;
    const tipoTarjeta = document.getElementById('tipoTarjeta').value;

    try {
        console.log("Agregando tarjeta para el usuario:", user.uid);
        
        // Agregar la nueva tarjeta
        await addDoc(collection(db, 'tarjetas'), {
            userId: user.uid,
            numeroTarjeta,
            fechaVencimiento,
            cvv,
            tipoTarjeta,
            fechaCreacion: new Date()
        });
        console.log("Tarjeta agregada exitosamente");

        // Cerrar modal y recargar tarjetas
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalAgregarTarjeta'));
        modal.hide();
        document.getElementById('formAgregarTarjeta').reset();
        
        // Recargar las tarjetas con el usuario actual
        await cargarTarjetas(user);
        
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
        // Obtener el usuario actual antes de eliminar
        const user = await waitForAuth();
        if (!user) {
            throw new Error("No hay usuario autenticado");
        }

        // Eliminar la tarjeta
        await deleteDoc(doc(db, 'tarjetas', tarjetaId));
        console.log("Tarjeta eliminada exitosamente");
        
        // Mostrar mensaje de éxito
        mostrarToast('Tarjeta eliminada exitosamente', 'success');
        
        // Recargar las tarjetas con el usuario actual
        await cargarTarjetas(user);
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
            const user = await waitForAuth();
            console.log("Autenticación lista, usuario:", user.uid);

            // Cargar tarjetas inicialmente
            await cargarTarjetas(user);

            // Configurar el formulario de agregar tarjeta
            const formAgregarTarjeta = document.getElementById('formAgregarTarjeta');
            if (formAgregarTarjeta) {
                console.log("Formulario de tarjeta encontrado, configurando evento...");
                formAgregarTarjeta.addEventListener('submit', (event) => agregarTarjeta(event, user));
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
            console.error("Error en la autenticación:", error);
            window.location.href = "../index.html";
        }
    });
} catch (error) {
    console.error("Error crítico en la inicialización de TarjetasDebito.js:", error);
} 
