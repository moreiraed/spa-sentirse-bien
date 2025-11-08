import { serviciosManager } from "../modules/services/index.js";

export class AdminServices {
  constructor(adminManager) {
    this.adminManager = adminManager;
  }

  async loadServices() {
    try {
      const services = await serviciosManager.getAllServices();
      this.renderServicesTable(services || []);
    } catch (error) {
      console.error("Error loading services:", error);
      this.renderServicesTable([]);
    }
  }

  renderServicesTable(services) {
    const tbody = document.getElementById("services-table-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (services.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-muted">
            No hay servicios registrados
          </td>
        </tr>`;
      return;
    }

    const formatPrice = serviciosManager.formatPrice.bind(serviciosManager);

    services.forEach((service) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${service.title}</td>
        <td>${service.category}</td>
        <td>${service.duration || "N/A"} min</td>
        <td>${formatPrice(service.price)}</td>
        <td>
          <span class="badge bg-${service.active ? "success" : "danger"}">
            ${service.active ? "Activo" : "Inactivo"}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" data-edit-id="${
            service.id
          }">
            <i class="bi bi-pencil" data-edit-id="${service.id}"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" data-delete-id="${
            service.id
          }">
            <i class="bi bi-trash" data-delete-id="${service.id}"></i>
          </button>
        </td>
      `;

      tr.querySelector(`[data-edit-id]`).addEventListener("click", () =>
        this.handleEditService(service.id)
      );
      tr.querySelector(`[data-delete-id]`).addEventListener("click", () =>
        this.handleDeleteService(service.id, service.title)
      );

      tbody.appendChild(tr);
    });
  }

  handleCreateService() {
    const form = document.getElementById("servicio-form");
    form.reset();
    form.classList.remove("was-validated");

    document.getElementById("servicio-id").value = "";
    document.getElementById("servicio-active").checked = true;
    document.getElementById("servicioModalTitle").textContent =
      "Crear Servicio";

    const modal = new bootstrap.Modal(document.getElementById("servicioModal"));
    modal.show();
  }

  handleEditService(id) {
    const service = serviciosManager.getServicioById(id);
    if (!service) {
      const errorMsg = "Error: Servicio no encontrado.";
      if (typeof showToast === "function") {
        showToast(errorMsg, "danger");
      } else {
        alert(errorMsg);
      }
      return;
    }

    const form = document.getElementById("servicio-form");
    form.classList.remove("was-validated");

    document.getElementById("servicio-id").value = service.id;
    document.getElementById("servicio-title").value = service.title;
    document.getElementById("servicio-description").value = service.description;
    document.getElementById("servicio-category").value = service.category;
    document.getElementById("servicio-price").value = service.price;
    document.getElementById("servicio-duration").value = service.duration;
    document.getElementById("servicio-image_url").value =
      service.image_url || "";
    document.getElementById("servicio-active").checked = service.active;

    document.getElementById("servicioModalTitle").textContent =
      "Editar Servicio";

    const modal = new bootstrap.Modal(document.getElementById("servicioModal"));
    modal.show();
  }

  async handleSaveService(event) {
    event.preventDefault();
    const form = event.target;
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const serviceId = document.getElementById("servicio-id").value;
    const servicioData = {
      title: document.getElementById("servicio-title").value,
      description: document.getElementById("servicio-description").value,
      category: document.getElementById("servicio-category").value,
      price: parseFloat(document.getElementById("servicio-price").value),
      duration: parseInt(document.getElementById("servicio-duration").value),
      image_url: document.getElementById("servicio-image_url").value || null,
      active: document.getElementById("servicio-active").checked,
    };

    try {
      let successMsg = "";

      if (serviceId) {
        await serviciosManager.updateServicio(Number(serviceId), servicioData);
        successMsg = "Servicio actualizado con éxito";
      } else {
        await serviciosManager.createServicio(servicioData);
        successMsg = "Servicio creado con éxito";
      }

      if (typeof showToast === "function") {
        showToast(successMsg, "success");
      } else {
        alert(successMsg);
      }

      this.loadServices();
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("servicioModal")
      );
      modal.hide();
    } catch (error) {
      console.error("Error guardando servicio:", error);
      if (typeof showToast === "function") {
        showToast(`Error: ${error.message}`, "danger");
      } else {
        alert(`Error: ${error.message}`);
      }
    }
  }

  async handleDeleteService(id, title) {
    if (
      !confirm(`¿Estás seguro de que quieres eliminar el servicio "${title}"?`)
    ) {
      return;
    }

    try {
      await serviciosManager.deleteServicio(id);
      const successMsg = "Servicio eliminado con éxito";
      if (typeof showToast === "function") {
        showToast(successMsg, "success");
      } else {
        alert(successMsg);
      }
      this.loadServices();
    } catch (error) {
      console.error("Error eliminando servicio:", error);
      if (typeof showToast === "function") {
        showToast(`Error: ${error.message}`, "danger");
      } else {
        alert(`Error: ${error.message}`);
      }
    }
  }
}
