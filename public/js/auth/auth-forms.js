import { showToast, initFloatingLabels, initPasswordToggles } from "./auth-utils.js";

export function initAuthForms(authManager) {
  initFloatingLabels();
  initPasswordToggles();
  setupLoginForm(authManager);
  setupRegisterForm(authManager);
}

function setupLoginForm(authManager) {
  const formLogin = document.getElementById("formLogin");
  if (!formLogin) {
    return;
  }

  // Remover event listener anterior si existe
  formLogin.removeEventListener("submit", formLogin._submitHandler);

  formLogin._submitHandler = async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const result = await authManager.login(email, password);

    if (result.success) {
      closeModal("loginModal");
      formLogin.reset();
      showToast("¡Bienvenido! Has iniciado sesión correctamente.", "success");
    } else {
      showToast(result.error, "error");
    }
  };

  formLogin.addEventListener("submit", formLogin._submitHandler);
}

function setupRegisterForm(authManager) {
  const formRegister = document.getElementById("formRegister");
  if (!formRegister) {
    return;
  }

  // Remover event listener anterior si existe
  formRegister.removeEventListener("submit", formRegister._submitHandler);

  formRegister._submitHandler = async (e) => {
    e.preventDefault();

    const name = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;

    const result = await authManager.register(name, email, password);

    if (result.success) {
      closeModal("registerModal");
      formRegister.reset();
      showToast(result.message, "success");
    } else {
      showToast(result.error, "error");
    }
  };

  formRegister.addEventListener("submit", formRegister._submitHandler);
}

function closeModal(modalId) {
  const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
  if (modal) modal.hide();
}
