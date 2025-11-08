import { ProfileValidator } from "./perfil-validador.js";
import { ProfileUI } from "./perfil-ui.js";
import { ProfileAPI } from "./perfil-API.js";
import { ProfileSecurity } from "./perfil-seguridad.js";
import { showToast } from "../../auth/auth-utils.js";
export class ProfileManager {
  constructor() {
    this.validator = new ProfileValidator();
    this.ui = new ProfileUI();
    this.api = new ProfileAPI();
    this.security = new ProfileSecurity();
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

    this.security.setupSecurityListeners();
  }

  setupTabNavigation() {
    const tabLinks = document.querySelectorAll("[data-profile-tab]");

    tabLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        tabLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");

        const tabName = link.getAttribute("data-profile-tab");
        this.ui.showTab(tabName);
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
}

export function initProfilePage() {
  new ProfileManager();
}
