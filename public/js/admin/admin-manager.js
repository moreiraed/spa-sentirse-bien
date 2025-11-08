import { AdminAuth } from "./admin-auth.js";
import { AdminStats } from "./admin-stats.js";
import { AdminUsers } from "./admin-users.js";
import { AdminProfessionals } from "./admin-professionals.js";
import { AdminServices } from "./admin-services.js";
import { AdminContact } from "./admin-contact.js";
import { AdminSuppliers } from "./admin-suppliers.js";
import { AdminUI } from "./admin-ui.js";

export class AdminManager {
  constructor() {
    this.isAdmin = false;
    this.auth = new AdminAuth(this);
    this.stats = new AdminStats(this);
    this.users = new AdminUsers(this);
    this.professionals = new AdminProfessionals(this);
    this.services = new AdminServices(this);
    this.contact = new AdminContact(this);
    this.suppliers = new AdminSuppliers(this);
    this.ui = new AdminUI(this);
    this.init();
  }

  async init() {
    await this.auth.checkAdminAccess();
    this.ui.setupAdminRoute();
  }

  async loadAdminData() {
    if (!(await this.auth.verifyAdminPermissions())) return;

    try {
      await this.stats.loadAdminStats();
      await this.professionals.loadProfessionals();
      await this.users.loadUsers();
      await this.services.loadServices();
      await this.contact.loadContactMessages();
      await this.suppliers.loadSuppliers();
      this.ui.setupAdminListeners();
    } catch (error) {
      console.error("Error loading admin data:", error);
    }
  }
}

// Inicializar el admin manager
let adminManager;

export function initAdmin() {
  adminManager = new AdminManager();
  window.adminManager = adminManager;
  return adminManager;
}
