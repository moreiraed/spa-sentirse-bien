// public/js/modules/reservas/api.js
import { supabase } from "../../core/supabase.js";

export async function saveBooking(bookingData, cartItems) {
  // 1. Mapeamos el carrito al JSON (esto no cambia)
  const items_json = cartItems.map((item) => ({
    service_id: item.id,
    price_at_purchase: item.price,
    professional_id: item.professional_id || null,
  }));

  // 2. Preparamos los argumentos para la función RPC (¡ESTO CAMBIA!)
  //    Ahora coincide con la nueva función SQL del Paso 2
  const rpc_args = {
    user_id_input: bookingData.user_id,
    subtotal_input: bookingData.subtotal, // <-- Único valor de precio
    payment_method_input: bookingData.payment_method,
    delivery_method_input: bookingData.delivery_method,
    items: items_json,
    appointment_datetime_input: bookingData.appointment_datetime,
  };

  // 3. Llamamos a la función 'create_booking_with_items'
  const { data, error } = await supabase.rpc(
    "create_booking_with_items",
    rpc_args
  );

  if (error) {
    console.error("Error al guardar la reserva:", error);
    throw error;
  }

  console.log("Reserva creada con éxito, ID:", data);
  return { success: true, bookingId: data };
}

/**
 * NUEVO: Guarda una COMPRA DE PRODUCTOS por separado.
 * Crea una 'booking' (para el registro financiero) y
 * luego guarda los items en la nueva tabla 'booking_products'.
 * @param {object} purchaseData - Los datos generales (total, subtotal, etc.)
 * @param {Array} productItems - El carrito de productos
 */
export async function saveProductPurchase(purchaseData, productItems) {
  try {
    // --- PASO 1: Crear la 'booking' principal ---
    // (Esto registra la transacción monetaria)
    const newBookingData = {
      user_id: purchaseData.user_id,
      total_price: purchaseData.total_price,
      subtotal: purchaseData.subtotal,
      discount_applied: purchaseData.discount_applied,
      payment_method: purchaseData.payment_method,
      delivery_method: purchaseData.delivery_method, // 'product_purchase'
    };

    // Insertamos la 'booking' y pedimos que nos devuelva el 'id'
    const { data: newBooking, error: bookingError } = await supabase
      .from("bookings")
      .insert(newBookingData)
      .select("id")
      .single();

    if (bookingError) {
      console.error(
        "Error al crear la booking (Paso 1 - Productos):",
        bookingError
      );
      throw bookingError;
    }

    const newBookingId = newBooking.id;
    console.log("Booking (para productos) creada con ID:", newBookingId);

    // --- PASO 2: Guardar los items en la nueva tabla 'booking_products' ---

    // Mapeamos el carrito de PRODUCTOS a la nueva tabla
    const product_json = productItems.map((item) => ({
      booking_id: newBookingId,
      product_id: item.id,
      quantity: item.quantity,
      price_at_purchase: item.price,
    }));

    // Insertamos todos los productos
    const { error: itemsError } = await supabase
      .from("booking_products")
      .insert(product_json);

    if (itemsError) {
      console.error(
        "Error al guardar los items de producto (Paso 2):",
        itemsError
      );
      // (En un sistema real, aquí se debería borrar la 'booking' creada)
      throw itemsError;
    }

    console.log("Items de producto guardados exitosamente.");
    return { success: true, bookingId: newBookingId };
  } catch (error) {
    console.error(
      "Error en el proceso de 'saveProductPurchase':",
      error.message
    );
    return { success: false, error: error };
  }
}

/**
 * Verifica si un usuario es cliente frecuente (3+ servicios en los últimos 30 días).
 * @param {string} userId - El ID del usuario.
 * @returns {boolean} - True si es cliente frecuente, false si no.
 */
export async function isFrequentCustomer(userId) {
  if (!userId) {
    console.log("isFrequentCustomer: No hay usuario, devolviendo false.");
    return false;
  }

  try {
    // 1. Calcular la fecha de hace 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 2. Consultar Supabase
    const { count, error } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true }) // head:true solo pide el conteo
      .eq("user_id", userId) // Del usuario actual
      .gte("created_at", thirtyDaysAgo.toISOString()) // En los últimos 30 días
      .not("appointment_datetime", "is", null); // ¡Importante! Filtra solo SERVICIOS

    if (error) {
      console.error("Error al verificar cliente frecuente:", error);
      return false;
    }

    console.log(`Verificación de cliente frecuente: ${count} servicios encontrados.`);
    return count >= 3; [cite_start]// Cumple el requisito [cite: 5]
  } catch (error) {
    console.error("Error en la lógica de isFrequentCustomer:", error);
    return false;
  }
}

/**
 * Confirma una compra de productos y actualiza el stock
 * @param {string} bookingId - ID de la booking a confirmar
 */
export async function confirmProductPurchase(bookingId) {
  try {
    const { data, error } = await supabase.rpc(
      "confirm_product_purchase",
      { booking_id_input: bookingId }
    );

    if (error) {
      console.error("Error al confirmar compra y actualizar stock:", error);
      throw error;
    }

    console.log("Compra confirmada y stock actualizado:", data);
    return { success: true };
  } catch (error) {
    console.error("Error en confirmProductPurchase:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Solo actualiza el estado y el trigger se encarga del stock
 */
export async function updateBookingStatus(bookingId, newStatus) {
  const { data, error } = await supabase
    .from("bookings")
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", bookingId)
    .select();

  if (error) {
    console.error("Error al actualizar estado de booking:", error);
    throw error;
  }

  return { success: true, data };
}

/**
 * Obtiene las tarjetas guardadas de un usuario.
 * @param {string} userId - El ID del usuario.
 * @returns {Array} - Una lista de tarjetas.
 */
export async function getSavedCards(userId) {
  if (!userId) {
    console.log("getSavedCards: No hay usuario, devolviendo array vacío.");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("user_cards")
      .select("id, ultimos4, marca, tipo, titular")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      console.error("Error al obtener tarjetas guardadas:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Error en la lógica de getSavedCards:", error);
    return [];
  }
}