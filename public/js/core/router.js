import { serviciosManager } from "../modules/services/index.js";
import { getProfessionalsForService } from "../modules/professionals/api.js";

export class Router {
  constructor() {
    this.routes = {
      home: "./pages/home.html",
      servicios: "./pages/servicios.html",
      contacto: "./pages/contacto.html",
      productos: "./pages/productos.html",
      perfil: "./pages/perfil.html",
      checkout: "./pages/checkout.html",
      reservas: "./pages/mis-reservas.html",
      admin: "./pages/admin.html",
      ventas: "./pages/ventas.html",
      privacidad: "./pages/privacidad.html",
      terminos: "./pages/terminos.html",
      pedidos: "./pages/mis-pedidos.html",
    };
    this.currentPage = "home";
    this.isNavigating = false;
  }

  init() {
    // Cargar página inicial basada en la URL
    const path = window.location.hash.replace("#", "") || "home";
    this.navigateTo(path, false);
  }

  async waitForAuth() {
    // Si ya hay usuario, continuar
    if (window.currentUser) return true;

    // Si authManager existe, esperar a que se inicialice
    if (window.App?.authManager) {
      return new Promise((resolve) => {
        // Timeout de seguridad (5 segundos máximo)
        const timeout = setTimeout(() => {
          console.warn("Timeout esperando por autenticación");
          resolve(false);
        }, 5000);

        window.App.authManager.onAuthInitialized((user) => {
          clearTimeout(timeout);
          resolve(!!user);
        });
      });
    }

    return false;
  }

  async navigateTo(page, pushState = true) {
    if (!this.routes[page]) {
      console.error("Página no encontrada:", page);
      return;
    }

    if (this.isNavigating) {
      console.log("Navegación en progreso, esperando...");
      return;
    }

    this.isNavigating = true;

    try {
      // Verfificacion para páginas protegidas
      if (this.requiresAuth(page)) {
        console.log("Página protegida detectada:", page);

        // Mostrar Skeleton
        this.showSkeletonLoader(page);

        // Esperar a que AuthManager este inicializado
        if (window.App?.authManager && !window.App.authManager.isInitialized) {
          console.log("Esperando inicialización de AuthManager...");
          await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              console.warn("Timeout esperando AuthManager");
              resolve();
            }, 5000);

            window.App.authManager.onAuthInitialized((user) => {
              clearTimeout(timeout);
              resolve();
            });
          });
        }

        // Verificar si hay usuario DESPUÉS de la inicialización
        if (!window.currentUser) {
          console.log("Usuario no autenticado");
          this.redirectToHome();
          return;
        }

        // Verificación adicional para admin
        if (page === "admin" && window.currentUser.rol !== "admin") {
          console.log("Sin permisos de admin");
          this.redirectToHome();
          return;
        }

        console.log("Usuario autenticado, cargando contenido real...");
        // Continuar con la carga del contenido real
      } else {
        // Para páginas públicas, mostrar loader normal
        this.showLoader();
      }

      // Cargar contenido real que reemplazara al Skeleton
      const response = await fetch(this.routes[page]);
      const html = await response.text();

      // Actualizar el contenido Principal (Reemplaza el Skeleton)
      document.getElementById("main-content").innerHTML = html;

      // Actualizar estado actual
      this.currentPage = page;

      // Actualizar URL si es necesario
      if (pushState) {
        window.history.pushState({ page }, "", `#${page}`);
      }

      // Actualizar navbar activo
      this.updateActiveNavLink(page);

      // Inicializar componentes específicos de la página
      this.initPageSpecificComponents(page);

      console.log(`Navegado a: ${page}`);
    } catch (error) {
      console.error("Error navegando:", error);
      document.getElementById("main-content").innerHTML = `
        <div class="container py-5">
          <div class="alert alert-danger">
            Error cargando la página. Por favor, intenta nuevamente.
          </div>
        </div>
      `;
    } finally {
      this.isNavigating = false;
    }
  }

  requiresAuth(page) {
    const protectedPages = [
      "perfil",
      "checkout",
      "reservas",
      "admin",
      "ventas",
      "pedidos",
    ];
    return protectedPages.includes(page);
  }

  redirectToHome() {
    // Mostrar toast
    if (typeof showToast === "function") {
      showToast("Debes iniciar sesión para acceder a esta página", "warning");
    }

    // Redirigir inmediatamente al home
    setTimeout(() => {
      window.history.replaceState({ page: "home" }, "", "#home");
      this.navigateTo("home", false);
    }, 100);
  }

  handlePopState(event) {
    const page = window.location.hash.replace("#", "") || "home";
    this.navigateTo(page, false);
  }

  updateActiveNavLink(page) {
    // Remover active de todos los links que no estén en dropdown
    document.querySelectorAll("[data-spa-link]").forEach((link) => {
      // Solo remover active de links que no estén dentro de un dropdown-menu
      if (!link.closest(".dropdown-menu")) {
        link.classList.remove("active");
      }
    });

    // Agregar active solo a links que no estén en dropdown
    const currentLink = document.querySelector(
      `[data-spa-link="${page}"]:not(.dropdown-menu [data-spa-link])`
    );
    if (currentLink) {
      currentLink.classList.remove("active");
      currentLink.classList.add("active");
    }
  }

  showSkeletonLoader(page) {
    // Usar el skeleton manager global
    if (
      window.skeletonManager &&
      typeof window.skeletonManager.showSkeleton === "function"
    ) {
      window.skeletonManager.showSkeleton(page);
    } else {
      // Fallback si el skeleton manager no está disponible
      console.warn("SkeletonManager no disponible, usando loader por defecto");
      this.showLoader();
    }
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

  hideLoader() {
    // El loader se reemplaza automáticamente con el contenido
  }

  initPageSpecificComponents(page) {
    switch (page) {
      case "servicios":
        this.initServiciosPage();
        break;
      case "home":
        this.initHomePage();
        break;
      case "perfil":
        this.initProfilePage();
        break;
      case "admin":
        this.initAdminPage();
      case "ventas":
        this.initVentasPage();
        break;
      case "productos":
        this.initProductsPage();
        break;
      case "checkout":
        this.initCheckoutPage();
        break;
      case "contacto":
        this.initContactPage();
        break;
      case "reservas":
        this.initMisReservasPage();
        break;
      case "pedidos":
        this.initMisPedidosPage();
        break;

      // Agregar más casos según sea necesario
    }
  }

  initAdminPage() {
    import("../admin/admin-manager.js")
      .then((module) => {
        const adminManager = module.initAdmin();
        adminManager.loadAdminData();
      })
      .catch((error) => {
        console.error("Error inicializando página de admin:", error);
      });
  }

  initVentasPage() {
    import("../ventas/ventas-manager.js")
      .then((module) => {
        module.initVentasPage();
      })
      .catch((error) => {
        console.error("Error inicializando página de ventas:", error);
      });
  }

  initProfilePage() {
    import("../perfil/perfil-manager.js")
      .then((module) => {
        module.initProfilePage();
      })
      .catch((error) => {
        console.error("Error inicializando página de perfil:", error);
      });
  }

  initContactPage() {
    import("../modules/contacto.js")
      .then((module) => {
        module.initContactPage();
      })
      .catch((error) => {
        console.error("Error inicializando página de contacto:", error);
      });
  }

  initMisPedidosPage() {
    import("../modules/mis-pedidos.js")
      .then((module) => {
        module.initMisPedidosPage();
      })
      .catch((error) => {
        console.error("Error inicializando página de Mis Pedidos:", error);
      });
  }

  initProductsPage() {
    import("../modules/productos.js")
      .then((module) => {
        module.initProductsPage();
      })
      .catch((error) => {
        console.error("Error inicializando página de productos:", error);
      });
  }

  initServiciosPage() {
    // Inicializar filtros de servicios
    this.initServiceFilters();

    // Cargar y renderizar servicios desde Supabase
    serviciosManager.renderServicios();

    // Inicializar botones de reserva
    this.initReservaButtons();
  }

  initHomePage() {
    // Inicializar carousel si es necesario
    const carousel = document.getElementById("carouselServicios");
    if (carousel) {
      new bootstrap.Carousel(carousel);
    }
  }

  initServiceFilters() {
    const filterButtons = document.querySelectorAll(".filter-btn");

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const category = button.getAttribute("data-category");

        // Actualizar botón activo
        filterButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        // Filtrar servicios (ahora funciona con carga dinámica)
        const serviceCards = document.querySelectorAll(".service-card");
        serviceCards.forEach((card) => {
          if (
            category === "Todos" ||
            card.getAttribute("data-category") === category
          ) {
            card.parentElement.style.display = "block";
          } else {
            card.parentElement.style.display = "none";
          }
        });
      });
    });
  }

  initCheckoutPage() {
    import("../modules/checkout/index.js")
      .then((module) => {
        module.initCheckoutPage();
      })
      .catch((error) => {
        console.error("Error inicializando página de checkout:", error);
      });
  }

  initReservaButtons() {
    // Aquí puedes agregar la lógica para los botones de reserva
    document.addEventListener("click", (e) => {
      if (
        e.target.classList.contains("btn-reservar") ||
        e.target.classList.contains("btn-reservar-grupal")
      ) {
        this.handleReservaClick(e);
      }
    });
  }
  // (Dentro de la clase Router en router.js)

  async handleReservaClick(event) {
    const button = event.target.closest("button");
    if (!button) return;

    // 1. Verificar autenticación
    if (!window.currentUser) {
      try {
        const loginModal = new bootstrap.Modal(
          document.getElementById("loginModal")
        );
        loginModal.show();
      } catch (error) {
        console.error("Error al mostrar el modal de login:", error);
      }
      return;
    }

    // 2. Obtener la info del servicio
    let servicioInfo;
    const servicioDataJSON = button.getAttribute("data-servicio");
    const servicioId = button.getAttribute("data-servicio-id");

    try {
      if (servicioDataJSON) {
        const data = JSON.parse(servicioDataJSON);
        servicioInfo = {
          id: data.id || `static-${data.title.toLowerCase().replace(" ", "-")}`,
          ...data,
        };
      } else if (servicioId) {
        servicioInfo = serviciosManager.getServicioById(Number(servicioId));
      }

      if (!servicioInfo) {
        throw new Error("Información del servicio no encontrada.");
      }

      // 3. Mostrar el modal
      const modalEl = document.getElementById("professionalSelectorModal");
      const modal =
        bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);

      document.getElementById("modal-service-name").textContent =
        servicioInfo.title;
      const listContainer = document.getElementById(
        "professional-list-container"
      );
      listContainer.innerHTML =
        '<div class="text-center"><div class="spinner-border text-success"></div></div>';

      modal.show();

      // 4. Buscar los profesionales en la API
      const professionals = await getProfessionalsForService(
        servicioInfo.title
      );

      // 5. Renderizar la lista de profesionales
      if (!professionals || professionals.length === 0) {
        listContainer.innerHTML =
          '<p class="text-muted">No se encontraron profesionales disponibles para este servicio.</p>';
      } else {
        // --- ESTE ES EL BLOQUE QUE FALTABA ---
        listContainer.innerHTML = ""; // Limpiar loader

        professionals.forEach((prof) => {
          try {
            const profElement = document.createElement("a");
            profElement.href = "#";
            profElement.className =
              "list-group-item list-group-item-action professional-select-btn";

            // Lógica de nombre robusta
            let nombre = `Profesional #${prof.id}`;
            if (prof.users && prof.users.nombre) {
              nombre = `${prof.users.nombre} ${
                prof.users.apellido || ""
              }`.trim();
            }

            profElement.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
              <h6 class="mb-1">${nombre}</h6>
              <small>${prof.experience_years || 0} años exp.</small>
            </div>
            <p class="mb-1 small text-muted">${
              prof.specialty || "Especialista"
            }</p>
          `;

            // Acción final: Añadir al carrito
            profElement.addEventListener("click", (e) => {
              e.preventDefault();
              this.addServiceToCart(servicioInfo, prof.id);
              modal.hide();
            });

            listContainer.appendChild(profElement);
          } catch (renderError) {
            console.error(
              "[DEBUG] ¡Error al renderizar un profesional!:",
              renderError,
              prof
            );
          }
        });
      }
    } catch (error) {
      console.error("Error en handleReservaClick (profesionales):", error);
      this.showSafeToast(`Error: ${error.message}`, "danger");
    }
  }

  addServiceToCart(servicioInfo, professionalId) {
    try {
      const carritoJSON = localStorage.getItem("carritoServicios");
      let carrito = carritoJSON ? JSON.parse(carritoJSON) : [];

      // Adjuntamos el ID del profesional al item del carrito
      const itemConProfesional = {
        ...servicioInfo,
        professional_id: professionalId,
      };

      const yaExiste = carrito.find(
        (item) => item.id === itemConProfesional.id
      );
      if (yaExiste) {
        this.showSafeToast("Este servicio ya está en tu carrito", "info");
        return; // Detener la función
      }

      carrito.push(itemConProfesional);
      localStorage.setItem("carritoServicios", JSON.stringify(carrito));

      this.showSafeToast(`${servicioInfo.title} añadido al carrito`, "success");
    } catch (error) {
      console.error("Error en addServiceToCart:", error);
      this.showSafeToast("Error al añadir al carrito.", "danger");
    }
  }

  initMisReservasPage() {
    import("../modules/mis-reservas/index.js") // <-- El archivo que crearemos
      .then((module) => {
        module.initMisReservasPage(); // La función que crearemos
      })
      .catch((error) => {
        console.error("Error inicializando página de Mis Reservas:", error);
      });
  }

  showSafeToast(message, type = "info") {
    if (typeof window.showToast === "function") {
      window.showToast(message, type);
    } else {
      alert(message);
    }
  }
}
