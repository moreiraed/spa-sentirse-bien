// Cargar modales
document.addEventListener("DOMContentLoaded", () => {
  // Función para ajustar la ruta dependiendo de la página actual
  function getModalPath() {
    // Verificamos la ubicación actual del archivo HTML
    if (window.location.pathname.includes("pages")) {
      return "../pages/modal-Servicios.html"; // Si estamos dentro de "pages", subimos un nivel
    } else {
      return "./pages/modal.html"; // Si estamos en la raíz, la ruta es relativa a la raíz
    }
  }

  // Cargar modales con la ruta ajustada
  fetch(getModalPath()) // Usamos la ruta calculada
    .then((response) => response.text())
    .then((html) => {
      document.getElementById("modals-container").innerHTML = html;
      initializeModalFeatures(); // Inicializar funcionalidades
    })
    .catch((error) => console.error("Error al cargar modales:", error));
});

// Funcionalidades para los modales
function initializeModalFeatures() {
    // 1. Mostrar/ocultar contraseña (para todos los campos)
    document.querySelectorAll(".toggle-password").forEach((button) => {
        button.addEventListener("click", function () {
            const input = this.closest(".form-group").querySelector("input");
            const icon = this.querySelector("i");
            input.type = input.type === "password" ? "text" : "password";
            icon.classList.toggle("bi-eye");
            icon.classList.toggle("bi-eye-slash");
        });
    });

    // 2. Floating labels
    document.querySelectorAll(".custom-input").forEach((input) => {
        const updateValueClass = () => {
            if (input.value.trim() !== "") {
                input.classList.add("has-value");
            } else {
                input.classList.remove("has-value");
            }
        };
        input.addEventListener("input", updateValueClass);
        updateValueClass(); // Inicializar al cargar
    });

    // 3. Resetear campos al cerrar modal
    function resetModalFields(modalId) {
        const modal = document.getElementById(modalId);
        modal.addEventListener("hidden.bs.modal", () => {
            const inputs = modal.querySelectorAll(".custom-input");
            const passwordToggles = modal.querySelectorAll(".toggle-password");

            inputs.forEach((input) => {
                input.value = "";
                input.classList.remove("has-value");
            });

            passwordToggles.forEach((btn) => {
                const input = btn.closest(".form-group").querySelector("input");
                const icon = btn.querySelector("i");
                input.type = "password";
                icon.classList.remove("bi-eye");
                icon.classList.add("bi-eye-slash");
            });
        });
    }

    resetModalFields("loginModal");
    resetModalFields("registerModal");
}