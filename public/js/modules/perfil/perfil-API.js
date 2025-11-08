import { supabase } from "../../core/supabase.js";

export class ProfileAPI {
  async loadUserFromSupabase(userId) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error cargando usuario desde Supabase:", error);
      return null;
    }
  }

  async updateUserProfile(userId, profileData) {
    try {
      const { data, error } = await supabase
        .from("users")
        .update(profileData)
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error actualizando perfil:", error);
      throw error;
    }
  }
}
