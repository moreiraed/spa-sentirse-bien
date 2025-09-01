import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  updateDoc,
  deleteDoc,
  addDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import { auth, db } from "./firebase-config.js";

// Variable para controlar si es admin
let isAdmin = false;

// Verificar autenticación y rol
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Verificar rol del usuario
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      isAdmin = userDoc.data().rol === 'admin';
      // Mostrar botón de restaurar servicios solo para admin
      const restoreBtn = document.getElementById('restore-services-btn');
      if (restoreBtn) {
        restoreBtn.style.display = isAdmin ? 'block' : 'none';
      }
    }
  }
  initFiltersAndServices();
});

// Función de inicialización
function initFiltersAndServices() {
  const defaultCategory = 'todos'; // Categoría por defecto
  
  // Marcar el botón "Todos" como activo inicialmente
  document.querySelector(`.filter-btn[data-category="${defaultCategory}"]`).classList.add('active');
  
  // Cargar servicios sin filtro inicial (todos)
  cargarServicios();
  
  // Configurar los event listeners de los filtros
  setupFilterButtons();
}

// Función para configurar los botones de filtro
function setupFilterButtons() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remover clase 'active' de todos los botones
      filterButtons.forEach(btn => btn.classList.remove('active'));
      
      // Agregar clase 'active' al botón clickeado
      this.classList.add('active');
      
      // Obtener la categoría seleccionada
      const category = this.dataset.category;
      
      // Cargar servicios filtrados (null para 'todos')
      cargarServicios(category === 'todos' ? null : category);
    });
  });
}


// Función para mostrar formulario de agregar servicio
async function mostrarFormularioAgregar() {
  // Cargar categorías desde Firestore
  const categoriesSnapshot = await getDocs(collection(db, "categories"));
  const categories = categoriesSnapshot.docs.map((doc) => ({
    id: doc.id,...doc.data(),
  }));

  // Crear opciones del select
  const categoryOptions = categories
    .map((cat) => `<option value="${cat.id}">${cat.name}</option>`)
    .join("");

  const modalHTML = `
    <div class="modal fade" id="addServiceModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">Agregar Nuevo Servicio</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="addServiceForm">
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Título*</label>
                  <input type="text" class="form-control" name="title" required>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Categoría*</label>
                  <select class="form-select" name="category" required>
                    <option value="">Seleccione una categoría</option>
                    ${categoryOptions}
                  </select>
                </div>
              </div>
              
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Precio*</label>
                  <div class="input-group">
                    <span class="input-group-text">$</span>
                    <input type="number" class="form-control" name="price" step="100" required>
                  </div>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Duración (minutos)*</label>
                  <input type="number" class="form-control" name="duration" required>
                </div>
              </div>
              
              <div class="mb-3">
                <label class="form-label">Descripción*</label>
                <textarea class="form-control" name="description" rows="3" required></textarea>
              </div>
              
              <div class="mb-3">
                <label class="form-label">URL de la Imagen*</label>
                <input type="url" class="form-control" name="imageUrl" required>
              </div>
              
              <div class="text-center mt-4">
                <button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar Servicio</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  // Agregar modal al body
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById("addServiceModal"));
  modal.show();

  // Manejar envío del formulario
  document
    .getElementById("addServiceForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(e.target);
      const newService = {
        title: formData.get("title"),
        category: formData.get("category"),
        description: formData.get("description"),
        duration: formData.get("duration"),
        price: parseFloat(formData.get("price")),
        imageUrl: formData.get("imageUrl"),
        active: true, // Por defecto activo
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      try {
        // Importar addDoc si no está ya importado
        const { addDoc } = await import(
          "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js"
        );

        await addDoc(collection(db, "services"), newService);
        bootstrap.Modal.getInstance(
          document.getElementById("addServiceModal")
        ).hide();
        //modal.hide();
        cargarServicios();

        // Mostrar notificación de éxito
        mostrarToast("Servicio agregado correctamente");
      } catch (error) {
        console.error("Error agregando servicio:", error);
        mostrarToast("Error al agregar el servicio", "danger");
      }
    });

  // Limpiar modal cuando se cierre
  document
    .getElementById("addServiceModal")
    .addEventListener("hidden.bs.modal", () => {
      document.getElementById("addServiceModal").remove();
    });
}

// Función principal para cargar los servicios (puede filtrar por categoría)
async function cargarServicios(category = null) {
  const serviciosContainer = document.getElementById("servicios-container");
  const serviciosLoader = document.getElementById("servicios-loader");

  // Mostrar loader y ocultar contenedor
  serviciosLoader.style.display = "block";
  serviciosContainer.style.display = "none";

  try {
    let q;
    if (category) {
      q = query(
        collection(db, "services"),
        where("active", "==", true),
        where("category", "==", category)
      );
    } else {
      q = query(collection(db, "services"), where("active", "==", true));
    }

    const querySnapshot = await getDocs(q);
    renderServices(querySnapshot);
    
  } catch (error) {
    console.error("Error al cargar servicios:", error);
    serviciosContainer.innerHTML = `
      <div class="col-12">
        <p class="text-danger">Error al cargar los servicios. Por favor intenta nuevamente.</p>
      </div>
      ${isAdmin ? renderAddServiceCardHTML() : ""}
    `;
    if (isAdmin) {
      document.querySelector('.add-service-card')?.addEventListener("click", mostrarFormularioAgregar);
    }
  } finally {
    // Ocultar loader y mostrar contenedor
    serviciosLoader.style.display = "none";
    serviciosContainer.style.display = "flex";
  }
}

function renderServices(querySnapshot) {
  const serviciosContainer = document.getElementById("servicios-container");
  serviciosContainer.innerHTML = "";
  serviciosContainer.style.opacity = "0"; // Inicia invisible

  if (querySnapshot.empty) {
    serviciosContainer.innerHTML = `
      <div class="col-12">
        <p class="text-center py-5">No hay servicios disponibles en esta categoría.</p>
      </div>
    `;
    serviciosContainer.style.opacity = "1";
    return;
  } else {
    querySnapshot.forEach((doc) => {
      const servicio = doc.data();
      crearCardServicio(servicio, doc.id);
    });
  }

  // Agregar tarjeta "Añadir servicio"
  if (isAdmin) {
    serviciosContainer.innerHTML += renderAddServiceCardHTML();
    document
      .querySelector(".add-service-card")
      ?.addEventListener("click", mostrarFormularioAgregar);
  }

  // Listeners para botones de admin
  if (isAdmin) {
    document
      .querySelectorAll(".delete-btn")
      .forEach((btn) => btn.addEventListener("click", eliminarServicio));
    document
      .querySelectorAll(".edit-btn")
      .forEach((btn) => btn.addEventListener("click", iniciarEdicion));
  }

  // Transición suave después de renderizar
  setTimeout(() => {
    serviciosContainer.style.transition = "opacity 0.5s ease";
    serviciosContainer.style.opacity = "1";
  }, 50);
}

function crearCardServicio(servicio, id) {
  const serviciosContainer = document.getElementById("servicios-container");

  // Crear la tarjeta
  const card = document.createElement("div");
  card.classList.add("col-md-3", "col-sm-6", "col-12");
  card.id = `service-${id}`;

  // Crear el HTML de la tarjeta
  card.innerHTML = `
    <div class="card h-100 border-0 overflow-hidden transition-all hover-scale position-relative">
      ${
        isAdmin
          ? `
        <div class="admin-controls">
          <button class="btn btn-sm btn-danger position-absolute top-0 start-0 m-2 delete-btn" data-id="${id}" title="Eliminar servicio">
            <i class="bi bi-x-lg"></i>
          </button>
          <button class="btn btn-sm btn-warning position-absolute top-0 end-0 m-2 edit-btn" data-id="${id}" title="Editar servicio">
            <i class="bi bi-pencil-fill"></i>
          </button>
        </div>
      `
          : ""
      }
      <div class="overflow-hidden">
        <img src="${
          servicio.imageUrl
        }" class="card-img-top transition-all" alt="${servicio.title}">
      </div>
      <div class="card-body d-flex flex-column servicio-fondo">
        <h5 class="card-title mb-3 fw-bold servicio-titulo">${
          servicio.title
        }</h5>
        <p class="card-text servicio-texto">${servicio.description}</p>
        <div class="mt-auto pt-3 border-top">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <small class="servicio-texto"><i class="bi bi-clock"></i> <span class="servicio-duracion">${
              servicio.duration
            }</span> min</small>
            <small class="servicio-texto fw-bold">${new Intl.NumberFormat(
              "es-AR",
              {
                style: "currency",
                currency: "ARS",
                minimumFractionDigits: 0,
              }
            )
              .format(servicio.price)
              .replace("ARS", "$")}</small>
          </div>
        </div>
      </div>
    </div>
  `;

  // Crear el botón de reserva
  const botonReserva = document.createElement("a");
  botonReserva.href = "#";
  botonReserva.className =
    "btn btn-success w-100 py-2 rounded-pill d-flex align-items-center justify-content-center";
  botonReserva.innerHTML =
    '<i class="bi bi-calendar-check me-2"></i>Reservar turno';

    botonReserva.addEventListener("click", async (e) => {
      e.preventDefault();

      // Esperar a que el modal esté listo si se carga dinámicamente
      if (!window.abrirModalReserva) {
        console.log("Esperando carga del modal...");
        await new Promise((resolve) => {
          document.addEventListener("modalReservaReady", resolve);
        });
      }

      // Verificar autenticación
      const user = auth.currentUser;
      if (!user) {
        mostrarToast("Debes iniciar sesión para reservar", "warning");
        
        // Esperar a que el modal de login esté cargado
        if (!document.getElementById("modalLogin")) {
          // Disparar evento para cargar el modal de login
          const event = new CustomEvent("cargarModalLogin");
          document.dispatchEvent(event);
          
          // Esperar a que el modal esté cargado
          await new Promise((resolve) => {
            const checkModal = setInterval(() => {
              if (document.getElementById("modalLogin")) {
                clearInterval(checkModal);
                resolve();
              }
            }, 100);
          });
        }
        
        // Ahora que el modal está cargado, podemos abrirlo
        const modalLogin = new bootstrap.Modal(document.getElementById("modalLogin"));
        modalLogin.show();
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists) {
          mostrarToast("Completa tu perfil antes de reservar", "warning");
          window.location.href = "perfil.html";
          return;
        }

        const userData = userDoc.data();
        const camposFaltantes = [];
        
        if (!userData.nombre?.trim()) camposFaltantes.push("Nombre");
        if (!userData.apellido?.trim()) camposFaltantes.push("Apellido");
        if (!userData.dni?.trim()) camposFaltantes.push("DNI");

        if (camposFaltantes.length > 0) {
          const botonesAccion = `
            <button type="button" class="btn btn-sm btn-light me-2" onclick="window.location.href='perfil.html'">
              Ir al perfil
            </button>
            <button type="button" class="btn btn-sm btn-outline-light" data-bs-dismiss="toast">
              Más tarde
            </button>
          `;
          
          mostrarToast(
            `Completa estos campos en tu perfil: ${camposFaltantes.join(", ")}`,
            "warning",
            botonesAccion
          );
          return;
        }

        // Abrir modal con los datos del servicio
        if (typeof abrirModalReserva === "function") {
          abrirModalReserva({
            id: id,
            title: servicio.title,
            duration: servicio.duration,
            price: servicio.price,
            imageUrl: servicio.imageUrl,
          });
        }
      } catch (error) {
        console.error("Error verificando usuario:", error);
        mostrarToast("Error al verificar tus datos", "danger");
      }
    });

  // Agregar el botón a la tarjeta
  card
    .querySelector(".card-body .mt-auto.pt-3.border-top")
    .appendChild(botonReserva);

  // Agregar la tarjeta al contenedor
  serviciosContainer.appendChild(card);
}


function renderAddServiceCardHTML() {
  return `
    <div class="col-md-3 col-sm-6 col-12">
      <div class="card h-100 border-2 border-dashed add-service-card" style="cursor:pointer;">
        <div class="card-body d-flex flex-column justify-content-center align-items-center text-center p-4">
          <div class="add-service-content">
            <i class="bi bi-plus-lg fs-1 text-muted mb-3"></i>
            <h5 class="text-muted mb-0">Agregar servicio</h5>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Función para eliminar servicio
async function eliminarServicio(e) {
  const id = e.target.closest(".delete-btn").dataset.id;
  if (confirm("¿Estás seguro de eliminar este servicio?")) {
    try {
      await deleteDoc(doc(db, "services", id));
      document.getElementById(`service-${id}`).remove();
    } catch (error) {
      console.error("Error eliminando:", error);
      mostrarToast("Error al eliminar servicio", "danger");
    }
  }
}

// Función para editar servicio
function iniciarEdicion(e) {
  e.preventDefault();
  const id = e.currentTarget.dataset.id;
  const card = document.getElementById(`service-${id}`);

  if (!card) {
    console.error("No se encontró la tarjeta del servicio");
    return;
  }

  // Obtener valores actuales con selectores más robustos
  const currentValues = {
    title: card.querySelector(".card-title")?.textContent || "",
    description: card.querySelector(".card-text")?.textContent || "",
    duration:
      card
        .querySelector(".servicio-duracion")
        ?.textContent.replace(" min", "")
        .trim() || "0", // Asegúrate de que este selector esté apuntando al valor correcto
    price:
      card
        .querySelector(".servicio-texto.fw-bold")
        ?.textContent.replace("$", "")
        .replace(",", "")
        .replace(" ", "") || "0", // Limpiar caracteres extraños
    imageUrl: card.querySelector("img")?.src || "",
  };

  console.log("Valores actuales:", currentValues);

  // Crear modal de edición
  const modalHTML = `
    <div class="modal fade" id="editModal-${id}" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">Editar Servicio</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="editForm-${id}">
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Título</label>
                  <input type="text" class="form-control" name="title" value="${currentValues.title}" required>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Precio</label>
                  <div class="input-group">
                    <span class="input-group-text">$</span>
                    <input type="number" class="form-control" name="price" value="${currentValues.price}" step="100" required>
                  </div>
                </div>
              </div>
              
              <div class="mb-3">
                <label class="form-label">Descripción</label>
                <textarea class="form-control" name="description" rows="3" required>${currentValues.description}</textarea>
              </div>
              
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Duración (minutos)</label>
                  <input type="number" class="form-control" name="duration" value="${currentValues.duration}" required>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">URL de la Imagen</label>
                  <input type="url" class="form-control" name="imageUrl" value="${currentValues.imageUrl}" required>
                </div>
              </div>
              
              <div class="text-center mt-4">
                <button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  // Agregar modal al body
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById(`editModal-${id}`));
  modal.show();

  // Manejar envío del formulario
  document
    .getElementById(`editForm-${id}`)
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(e.target);
      const updatedData = {
        title: formData.get("title"),
        description: formData.get("description"),
        duration: formData.get("duration"),
        price: parseFloat(formData.get("price")), // Asegurarse de convertir correctamente el precio
        imageUrl: formData.get("imageUrl"),
        updatedAt: new Date(),
      };

      try {
        await updateDoc(doc(db, "services", id), updatedData);
        modal.hide();
        cargarServicios();

        // Mostrar notificación de éxito
        mostrarToast("Servicio actualizado correctamente");
      } catch (error) {
        console.error("Error actualizando:", error);
        mostrarToast("Error al actualizar el servicio", "danger");
      }
    });

  // Limpiar modal cuando se cierre
  document
    .getElementById(`editModal-${id}`)
    .addEventListener("hidden.bs.modal", () => {
      document.getElementById(`editModal-${id}`).remove();
    });
}

// Función para mostrar toasts con acciones
let toastCooldown = false;

function mostrarToast(
  mensaje,
  tipo = "info",
  acciones = null
) {
  if (toastCooldown) return;

  const existingToasts = document.querySelectorAll(
    "#toast-container .toast.show, #toast-container .toast.fade:not(.hide)"
  );
  if (existingToasts.length > 0) return;

  toastCooldown = true;

  const container =
    document.getElementById("toast-container") || crearToastContainer();

  const toast = document.createElement("div");
  toast.classList.add(
    "toast",
    "align-items-center",
    "border-0",
    "fade",
    `bg-${tipo}`
  );
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");

  if (tipo === "warning") toast.classList.add("text-dark");
  else toast.classList.add("text-white");

  // Header con ícono y título
  const header = document.createElement("div");
  header.classList.add("toast-header");

  const currentPath = window.location.pathname;
  const img = document.createElement("img");
  img.src = currentPath.includes("/pages/")
    ? "../assets/icon/LogoSpa2.png"
    : "assets/icon/LogoSpa2.png";
  img.classList.add("rounded", "me-2");
  img.alt = "Icono";

  const strong = document.createElement("strong");
  strong.classList.add("me-auto");
  strong.textContent = "Notificación";

  const small = document.createElement("small");
  small.textContent = "Hace un momento";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.classList.add("btn-close");
  closeBtn.setAttribute("data-bs-dismiss", "toast");
  closeBtn.setAttribute("aria-label", "Cerrar");

  header.appendChild(img);
  header.appendChild(strong);
  header.appendChild(small);
  header.appendChild(closeBtn);

  // Cuerpo del toast
  const body = document.createElement("div");
  body.classList.add("toast-body");
  body.innerHTML = mensaje;

  if (acciones) {
    const accionesWrapper = document.createElement("div");
    accionesWrapper.classList.add("mt-2", "pt-2", "border-top", "border-light");
    accionesWrapper.innerHTML = acciones;
    body.appendChild(accionesWrapper);
  }

  toast.appendChild(header);
  toast.appendChild(body);
  container.appendChild(toast);

  const bsToast = new bootstrap.Toast(toast, {
    autohide: acciones ? false : true,
    delay: 3000
  });

  bsToast.show();

  if (!acciones) {
    setTimeout(() => bsToast.hide(), 3000);
  }

  toast.addEventListener("hidden.bs.toast", () => {
    toast.remove();
    toastCooldown = false;
  });
}

// Función para crear el contenedor de toasts si no existe
function crearToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
  document.body.appendChild(container);
  return container;
}

// Función para restaurar servicios desde el backup
async function restaurarServicios() {
  if (!confirm('¿Estás seguro de que deseas restaurar los servicios desde el backup? Esta acción reemplazará los servicios actuales.')) {
    return;
  }

  try {
    // Obtener servicios del backup
    const backupSnapshot = await getDocs(collection(db, "backup-services"));
    
    if (backupSnapshot.empty) {
      mostrarToast("No hay servicios en el backup para restaurar", "warning");
      return;
    }

    // Eliminar servicios actuales
    const currentServicesSnapshot = await getDocs(collection(db, "services"));
    const deletePromises = currentServicesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Restaurar servicios desde el backup
    const restorePromises = backupSnapshot.docs.map(doc => {
      const serviceData = doc.data();
      return addDoc(collection(db, "services"), {
        ...serviceData,
        active: true
      });
    });

    await Promise.all(restorePromises);
    mostrarToast("Servicios restaurados exitosamente", "success");
    
    // Recargar la lista de servicios
    cargarServicios();
  } catch (error) {
    console.error("Error al restaurar servicios:", error);
    mostrarToast("Error al restaurar los servicios", "danger");
  }
}

// Agregar event listener para el botón de restaurar
document.addEventListener('DOMContentLoaded', () => {
  const restoreBtn = document.getElementById('restore-services-btn');
  if (restoreBtn) {
    restoreBtn.addEventListener('click', restaurarServicios);
  }
});

// --- Lógica para botones de servicios grupales ---
document.addEventListener('DOMContentLoaded', () => {
  const botonesGrupales = document.querySelectorAll('.btn-reservar-grupal');
  if (!botonesGrupales.length) return;

  botonesGrupales.forEach(btn => {
    btn.addEventListener('click', async () => {
      // Verificar autenticación con observer
      await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe(); // Dejamos de escuchar después del primer evento
          
          if (!user) {
            // Usuario NO logueado
            if (typeof mostrarToast === 'function') {
              mostrarToast('Debes iniciar sesión para reservar', 'warning');
            } else {
              alert('Debes iniciar sesión para reservar');
            }
            resolve();
            return;
          }
          
          // Usuario SÍ logueado
          console.log('Usuario autenticado:', user.email);
          
          // Proceder con la reserva
          try {
            const servicioData = JSON.parse(btn.getAttribute('data-servicio'));
            if (typeof abrirModalReserva === 'function') {
              abrirModalReserva(servicioData);
            }
          } catch (error) {
            console.error('Error al procesar reserva:', error);
          }
          
          resolve();
        });
      });
    });
  });
});