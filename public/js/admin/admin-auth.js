export class AdminAuth {
  constructor(adminManager) {
    this.adminManager = adminManager;
  }

  async checkAdminAccess() {
    try {
      const user = window.currentUser;
      this.adminManager.isAdmin = user && user.rol === "admin";
      this.adminManager.ui.updateAdminDropdown();
      return this.adminManager.isAdmin;
    } catch (error) {
      console.error("Error checking admin access:", error);
      return false;
    }
  }

  async verifyAdminPermissions() {
    if (!this.adminManager.isAdmin) {
      console.warn(
        "Intento de acceso no autorizado al panel de administración"
      );

      if (typeof showToast === "function") {
        showToast(
          "No tienes permisos para acceder al panel de administración",
          "error"
        );
      }

      setTimeout(() => {
        window.history.replaceState({ page: "home" }, "", "#home");
        if (typeof window.App !== "undefined" && window.App.router) {
          window.App.router.navigateTo("home", false);
        }
      }, 100);

      return false;
    }
    return true;
  }
}
