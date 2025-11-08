import { loadUserDropdown } from "./userDropdown.js";

export function updateAuthUI(authManager) {
  const authSkeleton = document.getElementById("authSkeleton");
  const authButtons = document.getElementById("authButtons");
  const authUser = document.getElementById("authUser");

  if (!authSkeleton || !authButtons || !authUser) {
    console.warn("Auth UI elements not found");
    return;
  }

  // Ocultar skeleton siempre
  authSkeleton.style.display = "none";

  if (authManager.currentUser) {
    // Usuario autenticado - mostrar dropdown, ocultar botones
    authButtons.style.display = "none";
    authUser.style.display = "block";

    // Forzar estilos para asegurar visibilidad
    authButtons.classList.add("d-none");
    authUser.classList.remove("d-none");

    loadUserDropdown(authManager);
  } else {
    // Usuario no autenticado - mostrar botones, ocultar dropdown
    authButtons.style.display = "flex";
    authUser.style.display = "none";

    // Forzar estilos
    authButtons.classList.remove("d-none");
    authUser.classList.add("d-none");
  }
}

export function showAuthLoader(type, show) {
  const config = {
    login: {
      button: document.getElementById("loginButton"),
      loader: document.getElementById("loginLoader"),
    },
    register: {
      button: document.querySelector('#formRegister button[type="submit"]'),
    },
  };

  const { button, loader } = config[type];

  if (!button) return;

  if (show) {
    button.disabled = true;
    button.classList.add("btn-loading");

    if (loader) loader.style.display = "block";

    if (type === "register") {
      button.classList.add("btn-loading");
    }
  } else {
    button.disabled = false;
    button.classList.remove("btn-loading");

    if (loader) loader.style.display = "none";

    if (type === "register") {
      button.innerHTML = '<i class="bi bi-person-plus me-2"></i> Crear cuenta';
    }
  }
}
