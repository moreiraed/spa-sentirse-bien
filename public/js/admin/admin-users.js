import { supabase } from "../core/supabase.js";

export class AdminUsers {
  constructor(adminManager) {
    this.adminManager = adminManager;
  }

  async loadUsers() {
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .neq("rol", "professional") // Excluir profesionales
        .order("created_at", { ascending: false });

      if (error) throw error;
      this.renderUsersTable(users || []);
    } catch (error) {
      console.error("Error loading users:", error);
      this.renderUsersTable([]);
    }
  }

  renderUsersTable(users) {
    const tbody = document.getElementById("users-table-body");
    if (!tbody) return;

    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-muted">
            No hay usuarios registrados
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = users
      .map(
        (user) => `
      <tr>
        <td>${user.nombre || user.display_name || "Usuario"}</td>
        <td>${user.email}</td>
        <td>
          <span class="badge bg-${
            user.rol === "admin"
              ? "warning"
              : user.rol === "ventas"
              ? "success"
              : "info"
          }">
            ${
              user.rol === "admin"
                ? "Administrador"
                : user.rol === "ventas"
                ? "Ventas"
                : "Usuario"
            }
          </span>
        </td>
        <td>${new Date(user.created_at).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="adminManager.users.editUser('${
            user.id
          }')">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="adminManager.users.deleteUser('${
            user.id
          }', '${user.nombre} ${user.apellido || ""}')">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `
      )
      .join("");
  }

  filterUsers(filterType) {

    const tbody = document.getElementById("users-table-body");
    if (!tbody) return;

    const allRows = tbody.querySelectorAll("tr");

    allRows.forEach((row) => {
      if (row.querySelector("td[colspan]")) return;

      const roleBadge = row.querySelector(".badge");
      const role = roleBadge ? roleBadge.textContent.trim() : "";

      let shouldShow = true;

      switch (filterType) {
        case "admin":
          shouldShow = role === "Administrador";
          break;
        case "user":
          shouldShow = role === "Usuario";
          break;
        case "ventas":
          shouldShow = role === "Ventas";
          break;
        case "all":
        default:
          shouldShow = true;
      }

      row.style.display = shouldShow ? "" : "none";
    });

    const visibleRows = Array.from(allRows).filter(
      (row) => row.style.display !== "none" && !row.querySelector("td[colspan]")
    );

    if (visibleRows.length === 0) {
      tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-muted">
          No hay usuarios que coincidan con el filtro
        </td>
      </tr>
    `;
    }
  }

  async editUser(id) {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!user) throw new Error("Usuario no encontrado");

      // Llenar el formulario de edición
      document.getElementById("edit-user-id").value = user.id;
      document.getElementById("edit-user-nombre").value = user.nombre || "";
      document.getElementById("edit-user-apellido").value = user.apellido || "";
      document.getElementById("edit-user-email").value = user.email || "";
      document.getElementById("edit-user-telefono").value = user.telefono || "";
      document.getElementById("edit-user-rol").value = user.rol || "user";
      document.getElementById("edit-user-is_active").value = user.is_active
        ? "true"
        : "false";

      // Verificar si es el usuario protegido (draana@spasentirsebien.com)
      const isProtectedUser = user.email === "draana@spasentirsebien.com";
      const rolSelect = document.getElementById("edit-user-rol");

      if (isProtectedUser) {
        // Deshabilitar el campo de rol y mostrar mensaje
        rolSelect.disabled = true;
        rolSelect.title = "Este usuario no puede modificar su rol";

        // Agregar texto informativo
        let infoText = document.getElementById("protected-user-info");
        if (!infoText) {
          infoText = document.createElement("div");
          infoText.id = "protected-user-info";
          infoText.className = "alert alert-warning mt-2";
          infoText.innerHTML =
            '<i class="bi bi-shield-exclamation me-2"></i>Este usuario administrador no puede modificar su rol por seguridad.';
          rolSelect.parentNode.appendChild(infoText);
        }
      } else {
        // Habilitar el campo si no es el usuario protegido
        rolSelect.disabled = false;
        rolSelect.title = "";

        // Remover mensaje informativo si existe
        const infoText = document.getElementById("protected-user-info");
        if (infoText) {
          infoText.remove();
        }
      }

      // Resetear validación
      const form = document.getElementById("edit-user-form");
      form.classList.remove("was-validated");

      // Mostrar modal
      const modal = new bootstrap.Modal(
        document.getElementById("editUserModal")
      );
      modal.show();
    } catch (error) {
      console.error("Error cargando usuario para editar:", error);
      if (typeof showToast === "function") {
        showToast(`Error al cargar usuario: ${error.message}`, "error");
      } else {
        alert(`Error al cargar usuario: ${error.message}`);
      }
    }
  }

  async handleUpdateUser(event) {
    event.preventDefault();

    const form = event.target;
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const userId = document.getElementById("edit-user-id").value;

    // Obtener datos actuales del usuario para validación
    const { data: currentUser } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    const userData = {
      nombre: document.getElementById("edit-user-nombre").value,
      apellido: document.getElementById("edit-user-apellido").value,
      telefono: document.getElementById("edit-user-telefono").value,
      rol: document.getElementById("edit-user-rol").value,
      is_active:
        document.getElementById("edit-user-is_active").value === "true",
      updated_at: new Date().toISOString(),
    };

    // Validar que no se intente modificar el rol del usuario protegido
    if (currentUser && currentUser.email === "draana@spasentirsebien.com") {
      // Obtener el rol actual de la base de datos para mantenerlo
      const { data: originalUser } = await supabase
        .from("users")
        .select("rol")
        .eq("id", userId)
        .single();

      if (originalUser && userData.rol !== originalUser.rol) {
        if (typeof showToast === "function") {
          showToast(
            "No se puede modificar el rol de este usuario administrador",
            "warning"
          );
        } else {
          alert("No se puede modificar el rol de este usuario administrador");
        }
        // Restaurar el rol original
        userData.rol = originalUser.rol;
      }
    }

    // Obtener el botón y elementos del loader
    const submitBtn = document.getElementById("btn-actualizar-usuario");
    const btnText = submitBtn.querySelector(".btn-text");
    const btnLoader = submitBtn.querySelector(".btn-loader");

    try {
      // Bloquear botón y mostrar loader
      submitBtn.disabled = true;
      btnText.textContent = "Actualizando...";
      btnLoader.classList.remove("d-none");

      // Mostrar toast de carga
      if (typeof showToast === "function") {
        showToast("Actualizando usuario...", "info");
      }

      // Actualizar en la base de datos
      const { error } = await supabase
        .from("users")
        .update(userData)
        .eq("id", userId);

      if (error) throw error;

      // Éxito
      if (typeof showToast === "function") {
        showToast("Usuario actualizado exitosamente", "success");
      }

      // Cerrar modal y recargar lista
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("editUserModal")
      );
      modal.hide();

      // Recargar la lista de usuarios
      await this.loadUsers();
    } catch (error) {
      console.error("Error actualizando usuario:", error);
      if (typeof showToast === "function") {
        showToast(`Error: ${error.message}`, "error");
      } else {
        alert(`Error: ${error.message}`);
      }
    } finally {
      // Siempre restaurar el botón
      if (submitBtn) {
        submitBtn.disabled = false;
        btnText.textContent = "Actualizar Usuario";
        btnLoader.classList.add("d-none");
      }
    }
  }

  async deleteUser(id, userName) {
    if (
      !confirm(
        `¿Estás seguro de que quieres eliminar al usuario "${userName}"?\n\nEsta acción eliminará completamente el usuario y no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      // Verificar si el usuario es el mismo que está logeado
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && user.id === id) {
        throw new Error("No puedes eliminar tu propio usuario");
      }

      // Obtener la sesión actual
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No hay sesión activa");
      }

      // Mostrar toast de carga
      if (typeof showToast === "function") {
        showToast("Eliminando usuario...", "info");
      }

      // Llamar al Edge Function para eliminar usuario
      const response = await fetch(
        "https://mvbpdtdvbgdknvirbsvs.supabase.co/functions/v1/admin-delete-user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ targetUserId: id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al eliminar usuario");
      }

      // Éxito - mostrar toast de éxito
      if (typeof showToast === "function") {
        showToast("Usuario eliminado exitosamente", "success");
      } else {
        alert("Usuario eliminado exitosamente");
      }

      // Recargar la lista de usuarios
      await this.loadUsers();
    } catch (error) {
      // Mostrar toast de error
      if (typeof showToast === "function") {
        showToast(`Error: ${error.message}`, "error");
      } else {
        alert(`Error: ${error.message}`);
      }
    }
  }

  async handleCreateUser(event) {
    event.preventDefault();

    const form = event.target;
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const formData = new FormData(form);
    const userData = {
      nombre: formData.get("nombre"),
      apellido: formData.get("apellido") || "",
      email: formData.get("email"),
      telefono: formData.get("telefono") || "",
      password: formData.get("password"),
      rol: formData.get("rol"),
    };

    // Obtener el botón y elementos del loader
    const submitBtn = document.getElementById("btn-crear-usuario");
    const btnText = submitBtn.querySelector(".btn-text");
    const btnLoader = submitBtn.querySelector(".btn-loader");

    try {
      // Bloquear botón y mostrar loader
      submitBtn.disabled = true;
      btnText.textContent = "Creando...";
      btnLoader.classList.remove("d-none");

      // Obtener la sesión actual correctamente
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No hay sesión activa");
      }

      // Llamar a Edge Function
      const response = await fetch(
        "https://mvbpdtdvbgdknvirbsvs.supabase.co/functions/v1/admin-create-user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(userData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al crear usuario");
      }

      // Éxito
      if (typeof showToast === "function") {
        showToast("Usuario creado exitosamente", "success");
      }

      // Cerrar modal y recargar lista
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("createUserModal")
      );
      modal.hide();

      // Recargar la lista de usuarios
      await this.loadUsers();

      // Resetear formulario
      form.reset();
      form.classList.remove("was-validated");
    } catch (error) {
      console.error("Error creando usuario:", error);
      if (typeof showToast === "function") {
        showToast(`Error: ${error.message}`, "error");
      } else {
        alert(`Error: ${error.message}`);
      }
    } finally {
      // Siempre restaurar el botón sin importar el resultado
      if (submitBtn) {
        submitBtn.disabled = false;
        btnText.textContent = "Crear Usuario";
        btnLoader.classList.add("d-none");
      }
    }
  }
}
