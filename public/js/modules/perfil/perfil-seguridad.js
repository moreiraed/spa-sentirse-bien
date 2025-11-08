import { showToast } from "../../auth/auth-utils.js";
import { supabase } from "../../core/supabase.js";

export class ProfileSecurity {
  constructor() {
    this.isChangingPassword = false;
    this.isDeletingAccount = false;
  }

  setupSecurityListeners() {
    this.setupPasswordForm();
    this.setupDeleteModal();
  }

  setupPasswordForm() {
    const passwordForm = document.getElementById("change-password-form");
    if (passwordForm) {
      passwordForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handlePasswordChange(e);
      });
    }
  }

  async handlePasswordChange(e) {
    if (this.isChangingPassword) return;

    const form = e.target;
    const currentPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const changeButton = document.getElementById("change-password-btn");

    // Validaciones
    if (
      !this.validatePasswordForm(currentPassword, newPassword, confirmPassword)
    ) {
      return;
    }

    this.isChangingPassword = true;
    this.showButtonLoading(changeButton, true, "Cambiando...");

    try {
      // 1. Reautenticar con la contraseña actual
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: window.currentUser.email,
          password: currentPassword,
        });

      if (authError) {
        if (authError.message === "Invalid login credentials") {
          throw new Error("La contraseña actual es incorrecta");
        }
        throw authError;
      }

      // 2. Actualizar la contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // 3. Limpiar formulario y mostrar éxito
      form.reset();
      showToast("Contraseña cambiada exitosamente", "success");
    } catch (error) {
      console.error("Error cambiando contraseña:", error);
      showToast(error.message || "Error al cambiar la contraseña", "error");
    } finally {
      this.isChangingPassword = false;
      this.showButtonLoading(changeButton, false, "Cambiar contraseña");
    }
  }

  validatePasswordForm(currentPassword, newPassword, confirmPassword) {
    // Validar que todos los campos estén llenos
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("Todos los campos son requeridos", "error");
      return false;
    }

    // Validar longitud mínima
    if (newPassword.length < 6) {
      showToast(
        "La nueva contraseña debe tener al menos 6 caracteres",
        "error"
      );
      return false;
    }

    // Validar que las nuevas contraseñas coincidan
    if (newPassword !== confirmPassword) {
      showToast("Las nuevas contraseñas no coinciden", "error");
      return false;
    }

    // Validar que no sea la misma contraseña
    if (currentPassword === newPassword) {
      showToast("La nueva contraseña debe ser diferente a la actual", "error");
      return false;
    }

    return true;
  }

  setupDeleteModal() {
    const deleteModal = document.getElementById("deleteAccountModal");
    if (deleteModal) {
      deleteModal.addEventListener("show.bs.modal", () => {
        this.initializeDeleteModal();
      });
    }
  }

  initializeDeleteModal() {
    const confirmCheckbox = document.getElementById("confirmDelete");
    const deletePassword = document.getElementById("deletePassword");
    const confirmButton = document.getElementById("confirmDeleteAccount");

    confirmCheckbox.checked = false;
    deletePassword.value = "";
    confirmButton.disabled = true;

    const validateDeleteButton = () => {
      confirmButton.disabled = !(
        confirmCheckbox.checked && deletePassword.value.length >= 6
      );
    };

    confirmCheckbox.addEventListener("change", validateDeleteButton);
    deletePassword.addEventListener("input", validateDeleteButton);

    confirmButton.addEventListener("click", () => {
      this.handleAccountDeletion(deletePassword.value);
    });
  }

  async handleAccountDeletion(password) {
    if (this.isDeletingAccount) return;

    const confirmButton = document.getElementById("confirmDeleteAccount");

    this.isDeletingAccount = true;
    this.showButtonLoading(confirmButton, true, "Eliminando...");

    try {
      // 1. Verificar la contraseña reautenticando
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: window.currentUser.email,
        password: password,
      });

      if (authError) {
        if (authError.message === "Invalid login credentials") {
          throw new Error("La contraseña es incorrecta");
        }
        throw authError;
      }

      // 2. Confirmación final con el usuario
      const confirmed = await this.showFinalConfirmation();
      if (!confirmed) {
        throw new Error("Eliminación cancelada por el usuario");
      }

      // 3. Llamar a la Edge Function para eliminar usuario
      await this.deleteUserWithEdgeFunction();

      // 4. Cerrar sesión y redirigir
      await supabase.auth.signOut();

      showToast("Tu cuenta ha sido eliminada exitosamente", "success");

      // Redirigir al home después de un breve delay
      setTimeout(() => {
        window.history.replaceState(null, "", "#home");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }, 2000);
    } catch (error) {
      console.error("Error eliminando cuenta:", error);

      if (error.message !== "Eliminación cancelada por el usuario") {
        showToast(error.message || "Error al eliminar la cuenta", "error");
      }
    } finally {
      this.isDeletingAccount = false;
      this.showButtonLoading(confirmButton, false, "Eliminar cuenta");

      // Cerrar el modal si hay error
      if (!this.isDeletingAccount) {
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("deleteAccountModal")
        );
        modal.hide();
      }
    }
  }

  async deleteUserWithEdgeFunction() {
    // Obtener la sesión actual para el token
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("No hay sesión activa");
    }

    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: {
        userId: window.currentUser.id,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error("Error calling delete-user function:", error);
      throw new Error(
        "No se pudo eliminar la cuenta. Por favor, contacta al administrador."
      );
    }

    if (!data.success) {
      throw new Error(data.error || "Error al eliminar la cuenta");
    }

    return data;
  }

  async showFinalConfirmation() {
    return new Promise((resolve) => {
      // Crear modal de confirmación final
      const finalConfirmHTML = `
        <div class="modal fade" id="finalConfirmModal" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title text-danger">⚠️ Confirmación Final</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <p class="fw-bold">¿Estás absolutamente seguro?</p>
                <p>Esta acción <span class="text-danger">NO SE PUEDE DESHACER</span>. Se eliminarán:</p>
                <ul>
                  <li>Tu cuenta permanentemente</li>
                  <li>Todos tus datos personales (nombre, email, teléfono, DNI)</li>
                  <li>Tu historial de reservas</li>
                  <li>Acceso a todos los servicios</li>
                </ul>
                <p>Escribe <strong>ELIMINAR CUENTA</strong> para confirmar:</p>
                <input type="text" class="form-control" id="finalConfirmText" placeholder="ELIMINAR CUENTA">
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-danger" id="finalConfirmBtn" disabled>
                  Sí, eliminar mi cuenta permanentemente
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Agregar modal al DOM
      document.body.insertAdjacentHTML("beforeend", finalConfirmHTML);

      const finalModal = new bootstrap.Modal(
        document.getElementById("finalConfirmModal")
      );
      const finalConfirmBtn = document.getElementById("finalConfirmBtn");
      const finalConfirmText = document.getElementById("finalConfirmText");

      // Configurar validación
      finalConfirmText.addEventListener("input", () => {
        finalConfirmBtn.disabled = finalConfirmText.value !== "ELIMINAR CUENTA";
      });

      // Permitir confirmar con Enter
      finalConfirmText.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && finalConfirmText.value === "ELIMINAR CUENTA") {
          finalConfirmBtn.click();
        }
      });

      // Manejar confirmación
      finalConfirmBtn.addEventListener("click", () => {
        finalModal.hide();
        resolve(true);
      });

      // Manejar cancelación
      document
        .getElementById("finalConfirmModal")
        .addEventListener("hidden.bs.modal", () => {
          document.getElementById("finalConfirmModal").remove();
          resolve(false);
        });

      finalModal.show();

      // Focus en el input
      setTimeout(() => {
        finalConfirmText.focus();
      }, 500);
    });
  }

  showButtonLoading(button, isLoading, text = "") {
    const buttonText = button.querySelector(".btn-text");
    const buttonLoader = button.querySelector(".btn-loader");

    if (isLoading) {
      buttonText.textContent = text;
      buttonLoader.classList.remove("d-none");
      button.disabled = true;
    } else {
      buttonText.textContent = text;
      buttonLoader.classList.add("d-none");
      button.disabled = false;
    }
  }
}
