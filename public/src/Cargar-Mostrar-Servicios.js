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
          <button class="btn btn-sm btn-danger delete-btn" data-id="${doc.id}">
            <i class="bi bi-x-lg"></i>
          </button>
          <button class="btn btn-sm btn-warning edit-btn" data-id="${doc.id}">
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
  const id = e.target.closest(".edit-btn").dataset.id;
  const card = document.getElementById(`service-${id}`);

  // Crear formulario de edición
  const editForm = `
    <div class="edit-form p-3">
      <div class="mb-3">
        <label>Título</label>
        <input type="text" class="form-control edit-title" value="${
          card.querySelector(".card-title").textContent
        }">
      </div>
      <div class="mb-3">
        <label>Descripción</label>
        <textarea class="form-control edit-description">${
          card.querySelector(".card-text").textContent
        }</textarea>
      </div>
      <div class="row mb-3">
        <div class="col-6">
          <label>Duración (min)</label>
          <input type="number" class="form-control edit-duration" value="${card
            .querySelector(".servicio-texto:nth-of-type(1)")
            .textContent.replace(" min", "")}">
        </div>
        <div class="col-6">
          <label>Precio</label>
          <input type="number" class="form-control edit-price" value="${card
            .querySelector(".servicio-texto.fw-bold")
            .textContent.replace("$", "")
            .replace(",", "")}">
        </div>
      </div>
      <div class="mb-3">
        <label>URL Imagen</label>
        <input type="text" class="form-control edit-image" value="${
          card.querySelector("img").src
        }">
      </div>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-secondary cancel-edit">Cancelar</button>
        <button class="btn btn-primary save-edit" data-id="${id}">Guardar</button>
      </div>
    </div>
  `;

  // Reemplazar contenido de la tarjeta con el formulario
  card.querySelector(".card-body").innerHTML = editForm;

  // Event listeners para los botones del formulario
  card
    .querySelector(".cancel-edit")
    .addEventListener("click", () => cargarServicios());
  card.querySelector(".save-edit").addEventListener("click", guardarCambios);
}

// Función para guardar cambios
async function guardarCambios(e) {
  const id = e.target.dataset.id;
  const card = document.getElementById(`service-${id}`);

  const updatedData = {
    title: card.querySelector(".edit-title").value,
    description: card.querySelector(".edit-description").value,
    duration: card.querySelector(".edit-duration").value,
    price: parseFloat(card.querySelector(".edit-price").value),
    imageUrl: card.querySelector(".edit-image").value,
    updatedAt: new Date(),
  };

  try {
    await updateDoc(doc(db, "services", id), updatedData);
    cargarServicios();
  } catch (error) {
    console.error("Error actualizando:", error);
    alert("Error al actualizar servicio");
  }
}

