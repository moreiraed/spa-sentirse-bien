import { ProfileValidator } from "./perfil-validador.js";
import { ProfileUI } from "./perfil-ui.js";
import { ProfileAPI } from "./perfil-API.js";
import { ProfileSecurity } from "./perfil-seguridad.js";
import { ProfileTarjetas } from "./perfil-tarjetas.js";
import { showToast } from "../auth/auth-utils.js";

export class ProfileManager {
  constructor() {
    this.validator = new ProfileValidator();
    this.ui = new ProfileUI();
    this.api = new ProfileAPI();
    this.security = new ProfileSecurity();
    this.tarjetasManager = new ProfileTarjetas();
    this.init();
  }

  async init() {
    if (!this.checkAuth()) {
      this.redirectToHome();
      return;
    }

    await this.loadUserData();
    this.setupEventListeners();
    this.setupTabNavigation();
    this.validator.setupValidations();

    // Hacer global para acceso desde HTML
    window.profileManager = this;
  }

  checkAuth() {
    if (!window.currentUser) {
      return false;
    }
    return true;
  }

  redirectToHome() {
    showToast("Debes iniciar sesión para acceder al perfil", "warning");
    setTimeout(() => {
      window.history.replaceState(null, "", "#home");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, 100);
  }

  async loadUserData() {
    try {
      const user = window.currentUser;

      if (user.id && (!user.nombre || !user.apellido)) {
        const userData = await this.api.loadUserFromSupabase(user.id);
        if (userData) {
          Object.assign(user, userData);
        }
      }

      this.ui.updateUI(user);

      // Cargar y renderizar tarjetas desde Supabase
      await this.tarjetasManager.renderTarjetas();
    } catch (error) {
      console.error("Error cargando datos del usuario:", error);
      showToast("Error al cargar los datos del perfil", "error");
    }
  }

  setupEventListeners() {
    const profileForm = document.getElementById("profile-form");
    if (profileForm) {
      profileForm.addEventListener("submit", (e) =>
        this.handleProfileUpdate(e)
      );
    }

    // Configurar listeners para tarjetas
    this.tarjetasManager.setupCardFormListeners();

    this.security.setupSecurityListeners();
  }

  setupTabNavigation() {
    const tabLinks = document.querySelectorAll("[data-profile-tab]");

    tabLinks.forEach((link) => {
      link.addEventListener("click", async (e) => {
        e.preventDefault();
        tabLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");

        const tabName = link.getAttribute("data-profile-tab");
        this.ui.showTab(tabName);

        // Si es la pestaña de tarjetas, actualizar la lista
        if (tabName === "tarjetas") {
          await this.tarjetasManager.renderTarjetas();
        }
      });
    });
  }

  async handleProfileUpdate(e) {
    e.preventDefault();

    if (!this.validator.validateForm()) {
      showToast("Por favor, corrige los errores en el formulario", "error");
      return;
    }

    const saveButton = document.getElementById("save-profile-btn");
    this.ui.showButtonLoading(saveButton, true);

    try {
      const user = window.currentUser;
      if (!user) {
        throw new Error("No hay usuario autenticado");
      }

      const profileData = this.validator.getFormData();

      if (!profileData.nombre || !profileData.apellido) {
        throw new Error("Nombre y apellido son requeridos");
      }

      const updatedUser = await this.api.updateUserProfile(
        user.id,
        profileData
      );
      Object.assign(user, updatedUser);
      window.currentUser = user;

      this.ui.updateSidebar(user);
      showToast("Perfil actualizado correctamente", "success");
    } catch (error) {
      console.error("Error actualizando perfil:", error);
      showToast(error.message || "Error al actualizar el perfil", "error");
    } finally {
      this.ui.showButtonLoading(saveButton, false);
    }
  }

  // Manejar agregar tarjeta (más limpio)
  async handleCardAdd(e) {
    e.preventDefault();

    if (!this.tarjetasManager.validarFormularioTarjeta()) {
      return;
    }

    const cardForm = e.target;
    const submitButton = cardForm.querySelector('button[type="submit"]');

    this.ui.showButtonLoading(
      submitButton,
      true,
      "Agregando...",
      "Agregar tarjeta"
    );

    try {
      const tarjetaData = this.tarjetasManager.getCardFormData();
      await this.tarjetasManager.agregarTarjeta(tarjetaData);

      this.tarjetasManager.renderTarjetas();
      showToast("Tarjeta agregada correctamente", "success");
      cardForm.reset();
    } catch (error) {
      console.error("Error agregando tarjeta:", error);
      showToast(error.message || "Error al agregar la tarjeta", "error");
    } finally {
      this.ui.showButtonLoading(submitButton, false, "", "Agregar tarjeta");
    }
  }

  // Método para eliminar tarjeta (llamado desde el HTML)
  eliminarTarjeta(tarjetaId) {
    if (confirm("¿Estás seguro de que quieres eliminar esta tarjeta?")) {
      this.tarjetasManager.eliminarTarjeta(tarjetaId);
      this.tarjetasManager.renderTarjetas();
      showToast("Tarjeta eliminada correctamente", "success");
    }
  }
}

// Inicialización global
window.profileManager = null;

export function initProfilePage() {
  window.profileManager = new ProfileManager();
}
