export class ProfileUI {
  updateUI(user) {
    this.updateSidebar(user);
    this.populateForm(user);
  }

  updateSidebar(user) {
    const avatar = document.getElementById("profile-avatar");
    const name = document.getElementById("profile-name");
    const email = document.getElementById("profile-email");
    const badge = document.getElementById("profile-badge");

    if (avatar) {
      const initials = this.generateInitials(user);
      avatar.src = this.createAvatarPlaceholder(initials);
      avatar.alt = `${user.nombre || user.display_name || "Usuario"} Avatar`;
    }

    if (name) {
      name.textContent =
        user.display_name ||
        `${user.nombre || ""} ${user.apellido || ""}`.trim() ||
        "Usuario";
    }

    if (email) {
      email.textContent = user.email || "usuario@ejemplo.com";
    }

    if (badge) {
      badge.textContent =
        user.rol === "admin"
          ? "Administrador"
          : user.rol === "professional"
          ? "Profesional"
          : "Usuario";
      badge.className = `badge px-3 py-2 fw-bold ${
        user.rol === "admin"
          ? "bg-warning"
          : user.rol === "professional"
          ? "bg-primary"
          : "bg-secondary"
      }`;
    }

  }

  generateInitials(user) {
    if (user.nombre && user.apellido) {
      return (user.nombre.charAt(0) + user.apellido.charAt(0)).toUpperCase();
    } else if (user.display_name) {
      return user.display_name
        .split(" ")
        .map((n) => n.charAt(0))
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }
    return "US";
  }

  createAvatarPlaceholder(initials) {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");

    const colors = [
      "#007bff",
      "#28a745",
      "#dc3545",
      "#6f42c1",
      "#e83e8c",
      "#fd7e14",
    ];
    const colorIndex = initials.charCodeAt(0) % colors.length;

    ctx.fillStyle = colors[colorIndex];
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, 50, 50);

    return canvas.toDataURL();
  }

  populateForm(user) {
    document.getElementById("nombre").value = user.nombre || "";
    document.getElementById("apellido").value = user.apellido || "";
    document.getElementById("email").value = user.email || "";
    document.getElementById("telefono").value = user.telefono || "";
    document.getElementById("dni").value = user.dni || "";
  }

  showTab(tabName) {
    document.getElementById("datos-personales-panel").classList.add("d-none");
    document.getElementById("seguridad-panel").classList.add("d-none");

    const selectedPanel = document.getElementById(`${tabName}-panel`);
    if (selectedPanel) {
      selectedPanel.classList.remove("d-none");
    }
  }

  showButtonLoading(button, isLoading) {
    const buttonText = button.querySelector(".btn-text");
    const buttonLoader = button.querySelector(".btn-loader");

    if (isLoading) {
      buttonText.textContent = "Guardando...";
      buttonLoader.classList.remove("d-none");
      button.disabled = true;
    } else {
      buttonText.textContent = "Guardar cambios";
      buttonLoader.classList.add("d-none");
      button.disabled = false;
    }
  }
}
