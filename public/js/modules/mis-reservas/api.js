// public/js/modules/mis-reservas/api.js

import { supabase } from "../../core/supabase.js";

/**
 * Busca todas las reservas (y sus items) para el usuario actual.
 */
export async function fetchUserBookings(userId) {
  
  console.log("[DEBUG API] Ejecutando consulta fetchUserBookings...");
  
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_items (
        price_at_purchase,
        services ( title ) 
      )
    `)
    .eq('user_id', userId)
    .not('appointment_datetime', 'is', null)
    .order('appointment_datetime', { ascending: true });

  if (error) {
    console.error("[DEBUG API] ¡ERROR DE SUPABASE!", error);
    throw error;
  }
  
  console.log("[DEBUG API] Datos devueltos:", bookings);
  return bookings || [];
}

/**
 * ¡NUEVA FUNCIÓN!
 * Registra el pago en la tabla 'payments' y actualiza la 'booking'
 * llamando a la función RPC 'register_payment'.
 */
export async function registerPaymentAndUpdateBooking(paymentData) {
  // Preparamos los argumentos para la función RPC
  const rpc_args = {
    p_booking_id: paymentData.booking_id,
    p_user_id: paymentData.user_id,
    p_amount_paid: paymentData.amount_paid,
    p_discount_applied: paymentData.discount_applied,
    p_payment_method: paymentData.payment_method,
    p_transaction_id: paymentData.transaction_id,
  };

  const { error } = await supabase.rpc("register_payment", rpc_args);

  if (error) {
    console.error("Error al registrar el pago:", error);
    throw error;
  }

  return { success: true };
}
