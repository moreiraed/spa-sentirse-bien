export class AdminUI {
  constructor(adminManager) {
    this.adminManager = adminManager;
  }

  updateAdminDropdown() {
    const adminLinkItem = document.getElementById("admin-link-item");
    if (adminLinkItem) {
      adminLinkItem.style.display = this.adminManager.isAdmin
        ? "block"
        : "none";
    }
  }

  setupAdminRoute() {
    if (typeof window.App !== "undefined" && window.App.router) {
      window.App.router.routes.admin = "./pages/admin.html";
    }
  }

  setupAdminListeners() {
    // Listener para abrir el modal de crear usuario
    const createUserBtn = document.getElementById("btn-abrir-crear-usuario");
    if (createUserBtn) {
      createUserBtn.addEventListener("click", () => {
        const modal = new bootstrap.Modal(
          document.getElementById("createUserModal")
        );
        modal.show();
      });
    }

    // Listener para el formulario de crear usuario
    const createUserForm = document.getElementById("create-user-form");
    if (createUserForm) {
      createUserForm.addEventListener("submit", (e) =>
        this.adminManager.users.handleCreateUser(e)
      );
    }

    // Listener para el formulario de editar usuario
    const editUserForm = document.getElementById("edit-user-form");
    if (editUserForm) {
      editUserForm.addEventListener("submit", (e) =>
        this.adminManager.users.handleUpdateUser(e)
      );
    }

    // Setup event listeners para profesionales
    if (
      this.adminManager.professionals &&
      typeof this.adminManager.professionals.setupEventListeners === "function"
    ) {
      setTimeout(() => {
        this.adminManager.professionals.setupEventListeners();
      }, 100);
    }

    // Setup event listeners para proveedores
    if (
      this.adminManager.suppliers &&
      typeof this.adminManager.suppliers.setupEventListeners === "function"
    ) {
      setTimeout(() => {
        this.adminManager.suppliers.setupEventListeners();
      }, 100);
    }

    // Listener para abrir modal de agregar profesional
    const addProModal = document.getElementById("addProfessionalModal");
    if (addProModal) {
      addProModal.addEventListener("show.bs.modal", () => {
        const form = document.getElementById("add-professional-form");
        if (form) {
          form.reset();
          form.classList.remove("was-validated");

          // MOSTRAR SIEMPRE los campos de contraseña
          const accountFields = document.getElementById("account-fields");
          if (accountFields) {
            accountFields.style.display = "block";
          }

          // HACER REQUERIDOS los campos de contraseña
          const passwordFields = document.querySelectorAll(
            "#account-fields input[type='password']"
          );
          passwordFields.forEach((field) => {
            field.classList.remove("is-invalid");
            field.required = true;
          });
        }
      });
    }

    // Listener para resetear modal de editar profesional
    const editProModal = document.getElementById("editProfessionalModal");
    if (editProModal) {
      editProModal.addEventListener("show.bs.modal", () => {
        const form = document.getElementById("edit-professional-form");
        if (form) {
          form.classList.remove("was-validated");
        }
      });
    }

    // Delegación de eventos para filtros de usuarios
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("filter-users-btn")) {
        e.preventDefault();
        const filter = e.target.getAttribute("data-filter");
        this.adminManager.users.filterUsers(filter);

        const dropdownToggle = document.querySelector(
          ".dropdown-filter .dropdown-toggle"
        );
        if (dropdownToggle) {
          let filterText = "Filtrar";
          if (filter === "all") filterText = "Todos";
          if (filter === "admin") filterText = "Administradores";
          if (filter === "user") filterText = "Usuarios";
          if (filter === "ventas") filterText = "Ventas";
          dropdownToggle.textContent = filterText;
        }
      }
    });

    // Listener para el formulario de servicio
    const form = document.getElementById("servicio-form");
    if (form) {
      form.addEventListener("submit", (e) =>
        this.adminManager.services.handleSaveService(e)
      );
    }

    // Listener para el botón "Crear Servicio"
    const createBtn = document.getElementById("btn-crear-servicio");
    if (createBtn) {
      createBtn.addEventListener("click", () =>
        this.adminManager.services.handleCreateService()
      );
    }

    // Setup event listeners para contactos
    if (
      this.adminManager.contact &&
      typeof this.adminManager.contact.setupEventListeners === "function"
    ) {
      setTimeout(() => {
        this.adminManager.contact.setupEventListeners();
      }, 100);
    }
  }
}
