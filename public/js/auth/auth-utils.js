// Función para mostrar toasts
export function showToast(message, type = "info") {
  let toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.className = "toast-container position-fixed top-0 end-0 p-3";
    document.body.appendChild(toastContainer);
  }

  const toastId = "toast-" + Date.now();
  const bgColor =
    type === "success"
      ? "bg-success"
      : type === "error"
      ? "bg-danger"
      : "bg-info";

  const toastHTML = `
    <div id="${toastId}" class="toast align-items-center text-white ${bgColor} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `;

  toastContainer.insertAdjacentHTML("beforeend", toastHTML);

  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement);
  toast.show();

  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove();
  });
}

// Obtener mensaje de error amigable
export function getErrorMessage(error) {
  const errorMessages = {
    "Invalid login credentials": "Email o contraseña incorrectos.",
    "Email not confirmed":
      "Por favor verifica tu email antes de iniciar sesión.",
    "User already registered": "Este email ya está registrado.",
    "Password should be at least 6 characters":
      "La contraseña debe tener al menos 6 caracteres.",
    "To signup, please provide your email":
      "Por favor proporciona un email válido.",
  };

  return (
    errorMessages[error.message] ||
    error.message ||
    "Ha ocurrido un error. Por favor intenta nuevamente."
  );
}

// Inicializar floating labels
export function initFloatingLabels() {
  document.querySelectorAll(".custom-input").forEach((input) => {
    if (input.value) input.classList.add("has-value");

    input.addEventListener("input", function () {
      this.classList.toggle("has-value", !!this.value);
    });

    input.addEventListener("focus", function () {
      this.classList.add("has-value");
    });

    input.addEventListener("blur", function () {
      if (!this.value) this.classList.remove("has-value");
    });
  });
}

// Inicializar toggles de contraseña
export function initPasswordToggles() {
  document.addEventListener("click", (e) => {
    if (e.target.closest(".toggle-password")) {
      const button = e.target.closest(".toggle-password");
      const input = button.parentElement.querySelector("input");
      const icon = button.querySelector("i");

      if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("bi-eye-slash", "bi-eye");
      } else {
        input.type = "password";
        icon.classList.replace("bi-eye", "bi-eye-slash");
      }
    }
  });
}
