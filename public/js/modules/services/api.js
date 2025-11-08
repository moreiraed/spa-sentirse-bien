// public/js/modules/services/api.js
import { supabase } from "../../core/supabase.js";

/**
 * Obtiene solo los servicios activos de Supabase.
 */
export async function fetchActiveServices() {
  const { data, error } = await supabase
    .from("services")
    .select(
      "id, active, category, description, duration, image_url, price, title"
    )
    .eq("active", true)
    .order("category")
    .order("title");

  if (error) {
    console.error("Error en fetchActiveServices:", error);
    throw error; // Propagamos el error para que el manager lo maneje
  }
  
  return data || [];
}

/**
 * Obtiene TODOS los servicios (para el admin).
 */
export async function fetchAllServices() {
    const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("title");
    
    if (error) {
        console.error("Error en fetchAllServices:", error);
        throw error;
    }
    
    return data || [];
}

/**
 * Crea un nuevo servicio en Supabase.
 */
export async function createService(servicioData) {
  const { data, error } = await supabase
    .from("services")
    .insert([servicioData])
    .select()
    .single();

  if (error) {
    console.error("Error en createService:", error);
    throw error;
  }
  return data;
}

/**
 * Actualiza un servicio existente en Supabase.
 */
export async function updateService(id, servicioData) {
  const { error } = await supabase
    .from("services")
    .update(servicioData)
    .eq("id", id);
  if (error) {
    console.error("Error en updateService:", error);
    throw error;
  }
  return true;
}

/**
 * Elimina un servicio de Supabase.
 */
export async function deleteService(id) {
  const { error } = await supabase.from("services").delete().eq("id", id);

  if (error) {
    console.error("Error en deleteService:", error);
    throw error;
  }
  return true;
}