import { supabase } from "../core/supabase.js";

export class AdminStats {
  constructor(adminManager) {
    this.adminManager = adminManager;
  }

  async loadAdminStats() {
    try {
      // Obtener todos los usuarios
      const { data: allUsers, error: usersError } = await supabase
        .from("users")
        .select("id");

      // Obtener IDs de usuarios que son profesionales
      const { data: professionals, error: prosError } = await supabase
        .from("professionals")
        .select("user_id");

      if (!usersError && !prosError) {
        // Crear set de IDs de profesionales para búsqueda rápida
        const professionalUserIds = new Set(
          professionals.map((pro) => pro.user_id).filter((id) => id)
        );

        // Filtrar usuarios que NO son profesionales
        const regularUsers = allUsers.filter(
          (user) => !professionalUserIds.has(user.id)
        );

        const statsElement = document.getElementById("admin-stats");
        if (statsElement) {
          statsElement.textContent = `${regularUsers.length} usuarios, ${professionals.length} profesionales`;
        }
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }
}
