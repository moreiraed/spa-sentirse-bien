import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  updateDoc,
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
    }
  }
  cargarServicios();
});

// Función para cargar y mostrar los servicios
async function cargarServicios() {
  const serviciosContainer = document.getElementById("servicios-container");
  serviciosContainer.innerHTML = ""; // Limpiar contenedor

  try {
    const q = query(collection(db, "services"), where("active", "==", "true"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      serviciosContainer.innerHTML = `<p class="text-center py-5">No hay servicios disponibles.</p>`;
      return;
    }

    querySnapshot.forEach((doc) => {
      const servicio = doc.data();
      const precioFormateado = new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 0,
      })
        .format(servicio.price)
        .replace("ARS", "$");

      // Botones de admin (solo si isAdmin es true)
      const adminButtons = isAdmin
        ? `
        <div class="admin-controls">
          <button class="btn btn-sm btn-danger position-absolute top-0 start-0 m-2 delete-btn" data-id="${doc.id}" title="Eliminar servicio">
            <i class="bi bi-x-lg"></i>
          </button>
          <button class="btn btn-sm btn-warning position-absolute top-0 end-0 m-2 edit-btn" data-id="${doc.id}" title="Editar servicio">
            <i class="bi bi-pencil-fill"></i>
          </button>
        </div>
      `
        : "";

      const servicioHTML = `
        <div class="col-md-3 col-sm-6 col-12" id="service-${doc.id}">
          <div class="card h-100 border-0 overflow-hidden transition-all hover-scale position-relative">
            ${adminButtons}
            <div class="overflow-hidden">
              <img src="${servicio.imageUrl}" class="card-img-top transition-all" alt="${servicio.title}">
            </div>
            <div class="card-body d-flex flex-column servicio-fondo">
              <h5 class="card-title mb-3 fw-bold servicio-titulo">${servicio.title}</h5>
              <p class="card-text servicio-texto">${servicio.description}</p>
              <div class="mt-auto pt-3 border-top">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <small class="servicio-texto"><i class="bi bi-clock"></i> ${servicio.duration} min</small>
                  <small class="servicio-texto fw-bold">${precioFormateado}</small>
                </div>
                <a href="pages/servicios.html" class="btn btn-success w-100 py-2 rounded-pill d-flex align-items-center justify-content-center">
                  <i class="bi bi-calendar-check me-2"></i>Reservar turno
                </a>
              </div>
            </div>
          </div>
        </div>
      `;

      serviciosContainer.innerHTML += servicioHTML;
    });

    // Agregar event listeners para los botones de admin
    if (isAdmin) {
      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", eliminarServicio);
      });

      document.querySelectorAll(".edit-btn").forEach((btn) => {
        btn.addEventListener("click", iniciarEdicion);
      });
    }
  } catch (error) {
    console.error("Error:", error);
    serviciosContainer.innerHTML = `<p class="text-danger">Error al cargar servicios.</p>`;
  }
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
      alert("Error al eliminar servicio");
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
    title: card.querySelector(".card-title").textContent,
    description: card.querySelector(".card-text").textContent,
    duration: card
      .querySelector(".servicio-texto:nth-of-type(1)")
      .textContent.replace(" min", "")
      .trim(),
    price: card
      .querySelector(".servicio-texto.fw-bold")
      .textContent.replace("$", "")
      .replace(",", ""),
    imageUrl: card.querySelector("img").src,
  };

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
        price: parseFloat(formData.get("price")),
        imageUrl: formData.get("imageUrl"),
        updatedAt: new Date(),
      };

      try {
        await updateDoc(doc(db, "services", id), updatedData);
        modal.hide();
        cargarServicios();

        // Mostrar notificación de éxito
        alert("Servicio actualizado correctamente");
      } catch (error) {
        console.error("Error actualizando:", error);
        alert("Error al actualizar el servicio");
      }
    });

  // Limpiar modal cuando se cierre
  document
    .getElementById(`editModal-${id}`)
    .addEventListener("hidden.bs.modal", () => {
      document.getElementById(`editModal-${id}`).remove();
    });
}

