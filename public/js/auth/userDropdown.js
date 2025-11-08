export async function loadUserDropdown(authManager) {
  const authUser = document.getElementById("authUser");
  if (!authUser) return;

  try {
    const response = await fetch("./components/user-dropdown.html");
    const dropdownHTML = await response.text();
    authUser.innerHTML = dropdownHTML;

    updateUserDropdownInfo(authManager);
    setupLogoutListener(authManager);
  } catch (error) {
    console.error("Error loading user dropdown:", error);
  }
}

function updateUserDropdownInfo(authManager) {
  if (!authManager.currentUser) return;

  // Actualizar avatar
  const userAvatar = document.querySelector(".user-avatar");
  if (userAvatar) {
    userAvatar.textContent = getUserInitials(authManager.currentUser);
  }

  // Actualizar nombre
  const userName = document.querySelector(".user-name");
  if (userName) {
    userName.textContent =
      authManager.currentUser.display_name ||
      authManager.currentUser.email.split("@")[0];
  }

  // Actualizar email
  const userEmail = document.querySelector(".user-email");
  if (userEmail) {
    userEmail.textContent = authManager.currentUser.email;
  }

  // Mostrar/ocultar enlace de admin
  const adminLinkItem = document.getElementById("admin-link-item");
  if (adminLinkItem) {
    const isAdmin = authManager.currentUser.rol === "admin";
    adminLinkItem.style.display = isAdmin ? "block" : "none";
  }
}

function setupLogoutListener(authManager) {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => authManager.logout());
  }
}

function getUserInitials(currentUser) {
  if (currentUser?.display_name) {
    const names = currentUser.display_name.split(" ");
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return currentUser.display_name[0].toUpperCase();
  }

  if (currentUser?.nombre && currentUser?.apellido) {
    return (currentUser.nombre[0] + currentUser.apellido[0]).toUpperCase();
  } else if (currentUser?.nombre) {
    return currentUser.nombre[0].toUpperCase();
  }

  if (currentUser?.email) {
    return currentUser.email[0].toUpperCase();
  }

  return "U";
}
