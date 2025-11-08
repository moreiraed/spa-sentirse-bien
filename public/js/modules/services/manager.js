// public/js/modules/services/manager.js
import * as api from "./api.js"; // Importa todo desde api.js
import * as ui from "./ui.js"; // Importa todo desde ui.js

export class ServiciosManager {
  constructor() {
    this.allServicesCache = []; // Caché para TODOS los servicios (para Admin)
    this.activeServicesCache = []; // Caché para servicios activos (para Clientes)
    this.categories = [];
    this.isLoaded = false;
  }

  /**
   * Obtiene servicios activos, usa caché si está disponible.
   */
  async getActiveServices() {
    if (this.isLoaded && this.activeServicesCache.length > 0) {
      return this.activeServicesCache;
    }
    
    const data = await api.fetchActiveServices(); // Llama a la API
    this.activeServicesCache = data;
    this.isLoaded = true; // Marcamos que la carga inicial se hizo
    this.categories = [...new Set(data.map((item) => item.category))].sort();
    return this.activeServicesCache;
  }

  /**
   * Obtiene TODOS los servicios, usa caché si está disponible.
   */
  async getAllServices() {
    // Para el admin, podríamos querer forzar la recarga
    // Pero por ahora, usemos un caché simple
    if (this.allServicesCache.length > 0) {
        return this.allServicesCache;
    }
    const data = await api.fetchAllServices();
    this.allServicesCache = data;
    return data;
  }

  /**
   * Limpia todos los cachés.
   */
  async refreshAllCaches() {
    this.isLoaded = false;
    this.activeServicesCache = [];
    this.allServicesCache = [];
    
    // Volver a llenar los cachés
    await this.getActiveServices();
    await this.getAllServices();
  }

  // --- Métodos de Acceso al Caché ---

  getServicioById(id) {
    // Busca en ambos cachés
    let service = this.activeServicesCache.find((s) => s.id === id);
    if (!service) {
      service = this.allServicesCache.find((s) => s.id === id);
    }
    return service || null;
  }

  getCategorias() {
    return this.categories;
  }

  // --- Métodos CRUD (orquestan API y caché) ---

  async createServicio(servicioData) {
    const result = await api.createService(servicioData);
    await this.refreshAllCaches(); // Importante: refrescar el caché
    return result;
  }

  async updateServicio(id, servicioData) {
    const result = await api.updateService(id, servicioData);
    await this.refreshAllCaches(); // Importante: refrescar el caché
    return result;
  }

  async deleteServicio(id) {
    const result = await api.deleteService(id);
    await this.refreshAllCaches(); // Importante: refrescar el caché
    return result;
  }

  // --- Métodos de UI (orquestan UI) ---

  /**
   * Renderiza las tarjetas de servicio en la página de clientes.
   * (Esta es tu antigua función renderServicios)
   */
  async renderServicios(
    containerId = "services-container",
    categoryFilter = null
  ) {
    const container = document.getElementById(containerId);
    if (!container) return;

    ui.showLoader(container); // Llama a la UI

    const servicios = await this.getActiveServices();

    if (servicios.length === 0) {
      ui.showEmptyMessage(container); // Llama a la UI
      return;
    }

    container.innerHTML = ""; // Limpiar
    
    const serviciosFiltrados = categoryFilter
      ? servicios.filter((s) => s.category === categoryFilter)
      : servicios;

    serviciosFiltrados.forEach((servicio) => {
      const serviceCard = ui.createServiceCard(servicio); // Llama a la UI
      container.appendChild(serviceCard);
    });
    
    // OJO: El router.js ahora maneja los initReservaButtons,
    // así que quitamos esa llamada de aquí.
  }

  // Expone las funciones de formato de la UI
  formatPrice(price) {
    return ui.formatPrice(price);
  }
}