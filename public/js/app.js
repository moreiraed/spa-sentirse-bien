// app.js
import { supabase, checkAuth } from "./core/supabase.js";
import { AuthManager, initAuthForms } from "./auth/auth-export.js";
import { Router } from "./core/router.js";

class App {
  constructor() {
    this.router = new Router();
    this.authManager = new AuthManager();
    this.init();
  }

  async init() {
    // Cargar componentes estáticos
    await this.loadStaticComponents();

    // Cargar skeleton manager
    await import("./core/skeleton-manager.js");

    // Inicializar formularios de autenticación
    initAuthForms(this.authManager);

    // Obtener Pagina Actual
    const initialPage = window.location.hash.replace("#", "") || "home";

    console.log("Página inicial:", initialPage);

    if (this.isProtectedPage(initialPage)) {
      console.log("Página protegida detectada al recargar");

      // MOSTRAR SKELETON INMEDIATAMENTE AL RECARGAR
      if (window.skeletonManager) {
        window.skeletonManager.showSkeleton(initialPage);
      } else {
        this.showLoader();
      }

      // Esperar autenticación ANTES de cargar contenido real
      console.log("Esperando verificación de auth...");
      await this.authManager.checkAuthState();

      // SOLO si está autenticado, inicializar router y cargar contenido real
      if (window.currentUser) {
        console.log("Usuario autenticado, cargando contenido real...");
        this.router.init();
      } else {
        console.log("Usuario no autenticado, redirigiendo...");
        // El redirect se maneja en AuthManager
      }
    } else {
      console.log("Página pública, carga inmediata");
      // Para páginas públicas, cargar inmediatamente
      this.router.init();
      // Verificar auth en background
      this.authManager.checkAuthState();
    }

    // Configurar event listeners globales
    this.setupGlobalListeners();
  }

  isProtectedPage(page) {
    const protectedPages = [
      "perfil",
      "reservas",
      "admin",
      "misproductos",
      "ventas",
      "ventas-pedidos",
      "pedidos",
    ];
    return protectedPages.includes(page);
  }

  showLoader() {
    document.getElementById("main-content").innerHTML = `
      <div class="container py-5">
        <div class="text-center">
          <div class="spinner-border text-success" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="mt-2">Cargando...</p>
        </div>
      </div>
    `;
  }

  async loadStaticComponents() {
    try {
      // Cargar navbar
      const navbarResponse = await fetch("./components/nav.html");
      const navbarHTML = await navbarResponse.text();
      document.getElementById("navbar").innerHTML = navbarHTML;

      // Cargar footer
      const footerResponse = await fetch("./components/footer.html");
      const footerHTML = await footerResponse.text();
      document.getElementById("footer").innerHTML = footerHTML;

      // Cargar modales de auth
      const authModalsResponse = await fetch("./components/auth-modals.html");
      const authModalsHTML = await authModalsResponse.text();
      document.getElementById("auth-modals").innerHTML = authModalsHTML;

      console.log("Componentes estáticos cargados correctamente");
    } catch (error) {
      console.error("Error cargando componentes:", error);
    }
  }

  setupGlobalListeners() {
    document.addEventListener("click", (e) => {
      if (e.target.matches("[data-spa-link]")) {
        e.preventDefault();
        const page = e.target.getAttribute("data-spa-link");
        this.router.navigateTo(page);
      }
    });

    window.addEventListener("popstate", (e) => {
      this.router.handlePopState(e);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new App();
});

window.App = App;
