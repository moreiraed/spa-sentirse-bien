// public/js/modules/professionals/api.js

import { supabase } from "../../core/supabase.js";

/**
 * Busca los profesionales cuya 'specialty' coincide
 * con el 'title' del servicio.
 * @param {string} serviceTitle - El título del servicio (ej. "Lifting de Pestañas")
 */
export async function getProfessionalsForService(serviceTitle) {
  const { data, error } = await supabase
    .from("professionals")
    .select(
      `
      id,
      specialty,
      bio,
      experience_years,
      users ( nombre, apellido ) 
    `
    )
    // Comparamos la especialidad del profesional con el título del servicio
    .eq("specialty", serviceTitle)
    .eq("is_active", true); // Nos aseguramos de traer solo profesionales activos

  if (error) {
    console.error("Error buscando profesionales por especialidad:", error);
    return [];
  }

  // La consulta ya devuelve la lista de profesionales directamente
  return data;
}
