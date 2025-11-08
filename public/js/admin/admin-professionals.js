import { supabase } from "../core/supabase.js";

export class AdminProfessionals {
  constructor(adminManager) {
    this.adminManager = adminManager;
  }

  async loadProfessionals() {
    try {
      const { data: professionals, error } = await supabase
        .from("professionals")
        .select(
          `
        *,
        users!inner(*)
      `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      this.renderProfessionalsTable(professionals || []);
    } catch (error) {
      console.error("Error loading professionals:", error);
      this.renderProfessionalsTable([]);
    }
  }

  renderProfessionalsTable(professionals) {

    const tbody = document.getElementById("professionals-table-body");

    if (!tbody) {
      console.error(
        "[DEBUG] No se encontró el tbody con id 'professionals-table-body'"
      );
      return;
    }

    if (professionals.length === 0) {
      tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4 text-muted">
                No hay profesionales registrados
                </td>
            </tr>
            `;
      return;
    }

    tbody.innerHTML = professionals
      .map((pro, index) => {

        const user = pro.users || {};

        let nombreCompleto = "N/A";
        if (user.nombre && user.apellido) {
          nombreCompleto = `${user.nombre} ${user.apellido}`.trim();
        } else if (user.nombre) {
          nombreCompleto = user.nombre;
        } else if (pro.name) {
          nombreCompleto = pro.name;
        } else {
          nombreCompleto = user.email || pro.email || "Profesional";
        }

        const email = user.email || pro.email || "N/A";
        const telefono = user.telefono || pro.phone || "N/A";
        const estadoUsuario = user.is_active ? "Activo" : "Inactivo";
        const tieneCuenta = !!user.id;

        return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="professional-avatar bg-primary rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                                <span class="text-white fw-bold">${nombreCompleto.charAt(
                                  0
                                )}</span>
                            </div>
                            <div>
                                <div class="fw-semibold">${nombreCompleto}</div>
                                <small class="text-muted">${email}</small>
                                ${
                                  !tieneCuenta
                                    ? '<small class="text-warning d-block"><i class="bi bi-exclamation-triangle"></i> Sin cuenta de acceso</small>'
                                    : ""
                                }
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-primary">${
                          pro.specialty || "N/A"
                        }</span>
                    </td>
                    <td>${telefono}</td>
                    <td>${pro.experience_years || 0} años</td>
                    <td>
                        <span class="badge bg-${
                          pro.is_active ? "success" : "danger"
                        }">
                            ${pro.is_active ? "Activo" : "Inactivo"}
                        </span>
                    </td>
                    <td>
                        <span class="badge bg-${
                          tieneCuenta
                            ? user.is_active
                              ? "success"
                              : "secondary"
                            : "warning"
                        }">
                            ${tieneCuenta ? estadoUsuario : "Sin cuenta"}
                        </span>
                    </td>
                    <td>${new Date(pro.created_at).toLocaleDateString()}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="adminManager.professionals.editProfessional('${
                              pro.id
                            }')" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info me-1" onclick="adminManager.professionals.viewProfessional('${
                              pro.id
                            }')" title="Ver detalles">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="adminManager.professionals.deleteProfessional('${
                              pro.id
                            }', '${nombreCompleto.replace(
          /'/g,
          "\\'"
        )}')" title="Eliminar">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
                `;
      })
      .join("");

  }

  viewProfessional(id) {
    console.log("Ver detalles del profesional:", id);
    // Aquí puedes implementar un modal de detalles
  }

  async handleCreateProfessional(event) {
    event.preventDefault();

    const form = document.getElementById("add-professional-form");
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      const firstInvalid = form.querySelector(":invalid");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const formData = new FormData(form);
    const professionalData = {
      nombre: formData.get("nombre"),
      apellido: formData.get("apellido"),
      email: formData.get("email"),
      telefono: formData.get("telefono"),
      specialty: formData.get("especialidad"),
      experience_years: parseInt(formData.get("experiencia")) || 0,
      bio: formData.get("bio"),
    };

    const password = formData.get("password");
    const confirmPassword = formData.get("confirm_password");

    // Validar contraseñas - USAR alert en lugar de showToast
    if (password !== confirmPassword) {
      document
        .getElementById("pro-confirm-password")
        .classList.add("is-invalid");
      alert("Las contraseñas no coinciden");
      return;
    }

    if (!password || password.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    const submitBtn = document.getElementById("save-professional");
    const btnText = submitBtn.querySelector(".btn-text");
    const btnLoader = submitBtn.querySelector(".btn-loader");

    try {
      submitBtn.disabled = true;
      btnText.textContent = "Guardando...";
      btnLoader.classList.remove("d-none");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error("No hay sesión activa");

      // Llamar Edge Function
      const response = await fetch(
        "https://mvbpdtdvbgdknvirbsvs.supabase.co/functions/v1/admin-create-professional",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            professionalData,
            password,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Error al crear profesional");

      // USAR alert para éxito
      alert("Profesional creado exitosamente con cuenta de acceso");

      // Cerrar modal y recargar
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("addProfessionalModal")
      );
      modal.hide();
      await this.loadProfessionals();
      form.reset();
      form.classList.remove("was-validated");
    } catch (error) {
      console.error("Error creando profesional:", error);
      let errorMessage = "Error creando profesional";

      if (error.message.includes("already registered")) {
        errorMessage = "Este email ya está registrado";
      } else {
        errorMessage = `Error: ${error.message}`;
      }

      // USAR alert para errores
      alert(errorMessage);
    } finally {
      submitBtn.disabled = false;
      btnText.textContent = "Guardar Profesional";
      btnLoader.classList.add("d-none");
    }
  }

  async editProfessional(id) {
    try {
      const { data: professional, error } = await supabase
        .from("professionals")
        .select(
          `
          *,
          users(*)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!professional) throw new Error("Profesional no encontrado");

      // Llenar el formulario de edición
      this.fillEditForm(professional);

      // Mostrar modal
      const modal = new bootstrap.Modal(
        document.getElementById("editProfessionalModal")
      );
      modal.show();
    } catch (error) {
      console.error("Error cargando profesional:", error);
      alert(`Error al cargar profesional: ${error.message}`);
    }
  }

  fillEditForm(professional) {
    const user = professional.users || {};

    // Datos básicos
    document.getElementById("edit-pro-id").value = professional.id;
    document.getElementById("edit-pro-user-id").value = user.id || "";
    document.getElementById("edit-pro-nombre").value = user.nombre || "";
    document.getElementById("edit-pro-apellido").value = user.apellido || "";
    document.getElementById("edit-pro-email").value = user.email || "";
    document.getElementById("edit-pro-telefono").value = user.telefono || "";

    // Datos profesionales
    document.getElementById("edit-pro-especialidad").value =
      professional.specialty || "";
    document.getElementById("edit-pro-experiencia").value =
      professional.experience_years || 0;
    document.getElementById("edit-pro-bio").value = professional.bio || "";

    // Estados
    document.getElementById("edit-pro-is-active").value = professional.is_active
      ? "true"
      : "false";
    document.getElementById("edit-pro-user-active").value = user.is_active
      ? "true"
      : "false";

    // Resetear validación
    const form = document.getElementById("edit-professional-form");
    form.classList.remove("was-validated");
  }

  async handleUpdateProfessional(event) {
    event.preventDefault();

    const form = event.target;
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const professionalId = document.getElementById("edit-pro-id").value;
    const userId = document.getElementById("edit-pro-user-id").value;

    const professionalData = {
      specialty: document.getElementById("edit-pro-especialidad").value,
      experience_years:
        parseInt(document.getElementById("edit-pro-experiencia").value) || 0,
      bio: document.getElementById("edit-pro-bio").value,
      is_active: document.getElementById("edit-pro-is-active").value === "true",
    };

    const userData = {
      nombre: document.getElementById("edit-pro-nombre").value,
      apellido: document.getElementById("edit-pro-apellido").value,
      telefono: document.getElementById("edit-pro-telefono").value,
      is_active:
        document.getElementById("edit-pro-user-active").value === "true",
      updated_at: new Date().toISOString(),
    };

    const submitBtn = document.getElementById("update-professional");
    const btnText = submitBtn.querySelector(".btn-text");
    const btnLoader = submitBtn.querySelector(".btn-loader");

    try {
      // Bloquear botón y mostrar loader
      submitBtn.disabled = true;
      btnText.textContent = "Actualizando...";
      btnLoader.classList.remove("d-none");

      // Actualizar profesional
      const { error: proError } = await supabase
        .from("professionals")
        .update(professionalData)
        .eq("id", professionalId);

      if (proError) throw proError;

      // Actualizar usuario si existe
      if (userId) {
        const { error: userError } = await supabase
          .from("users")
          .update(userData)
          .eq("id", userId);

        if (userError) throw userError;
      }

      // Éxito
      alert("rofesional actualizado exitosamente");

      // Cerrar modal y recargar lista
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("editProfessionalModal")
      );
      modal.hide();

      // Recargar la lista de profesionales
      await this.loadProfessionals();
    } catch (error) {
      console.error("Error actualizando profesional:", error);
      alert(`Error: ${error.message}`);
    } finally {
      // Restaurar botón
      submitBtn.disabled = false;
      btnText.textContent = "Actualizar Profesional";
      btnLoader.classList.add("d-none");
    }
  }

  async deleteProfessional(id, name) {
    if (
      !confirm(
        `¿Estás seguro de eliminar al profesional "${name}"?\n\nEsta acción eliminará completamente al profesional y su cuenta de usuario asociada (si existe). Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error("No hay sesión activa");

      // Llamar Edge Function para eliminar profesional
      const response = await fetch(
        "https://mvbpdtdvbgdknvirbsvs.supabase.co/functions/v1/admin-delete-professional",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            professionalId: id,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Error al eliminar profesional");
      }

      if (typeof showToast === "function") {
        showToast("Profesional eliminado exitosamente", "success");
      } else {
        alert("Profesional eliminado exitosamente");
      }

      await this.loadProfessionals();
    } catch (error) {
      console.error("Error eliminando profesional:", error);

      let errorMessage = `Error: ${error.message}`;
      if (error.message.includes("Professional not found")) {
        errorMessage = "Profesional no encontrado";
      } else if (error.message.includes("Admin access required")) {
        errorMessage = "No tienes permisos de administrador para esta acción";
      }

      if (typeof showToast === "function") {
        showToast(`❌ ${errorMessage}`, "error");
      } else {
        alert(`❌ ${errorMessage}`);
      }
    }
  }

  setupEventListeners() {
    // Toggle campos de cuenta
    const createAccountCheckbox = document.getElementById("pro-create-account");
    const accountFields = document.getElementById("account-fields");

    if (createAccountCheckbox && accountFields) {
      createAccountCheckbox.addEventListener("change", function () {
        accountFields.style.display = this.checked ? "block" : "none";

        // Hacer requeridos los campos de contraseña si se crea cuenta
        const passwordFields = accountFields.querySelectorAll(
          'input[type="password"]'
        );
        passwordFields.forEach((field) => {
          field.required = this.checked;
          if (!this.checked) {
            field.value = ""; // Limpiar campos si se desactiva
          }
        });

        // Remover validación si se desactiva
        if (!this.checked) {
          passwordFields.forEach((field) => {
            field.classList.remove("is-invalid");
          });
        }
      });
    }

    // Validación de confirmación de contraseña
    const confirmPasswordField = document.getElementById(
      "pro-confirm-password"
    );
    const passwordField = document.getElementById("pro-password");

    if (confirmPasswordField && passwordField) {
      confirmPasswordField.addEventListener("input", function () {
        const password = passwordField.value;
        if (this.value !== password) {
          this.classList.add("is-invalid");
        } else {
          this.classList.remove("is-invalid");
        }
      });

      passwordField.addEventListener("input", function () {
        const confirmPassword = confirmPasswordField.value;
        if (confirmPassword && confirmPassword !== this.value) {
          confirmPasswordField.classList.add("is-invalid");
        } else {
          confirmPasswordField.classList.remove("is-invalid");
        }
      });
    }

    // Form submit - Crear profesional
    const form = document.getElementById("add-professional-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleCreateProfessional(e);
      });
    }

    // Form submit - Editar profesional (¡ESTE ES EL QUE FALTABA!)
    const editForm = document.getElementById("edit-professional-form");
    if (editForm) {
      editForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleUpdateProfessional(e);
      });
    }

    // Botón de guardar profesional
    const saveBtn = document.getElementById("save-professional");
    if (saveBtn) {
      saveBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const form = document.getElementById("add-professional-form");
        if (form) {
          const submitEvent = new Event("submit", {
            bubbles: true,
            cancelable: true,
          });
          form.dispatchEvent(submitEvent);
        }
      });
    }
  }
}
