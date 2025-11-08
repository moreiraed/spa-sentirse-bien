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
