// public/js/modules/mis-reservas/index.js
import { supabase } from '../../core/supabase.js';
import * as api from "./api.js";
import * as ui from "./ui.js";

// --- Estado Global del Módulo ---
let paymentModal = null;
let currentBookingToPay = null;
let finalPaymentDetails = {};
let moduleBookings = [];
let isProcessingPayment = false; // <-- ¡NUEVA BANDERA DE SEGURIDAD!

/**
 * Función principal llamada por el Router.
 */
export function initMisReservasPage() {
  const modalEl = document.getElementById("paymentSimulationModal");
  if (modalEl) {
    paymentModal = new bootstrap.Modal(modalEl);
  } else {
    console.warn("Modal de simulación de pago no encontrado.");
  }

  loadUserBookings(); // Carga inicial
  setupListeners();
}

/**
 * Configura los listeners de la página
 */
function setupListeners() {
  // ===================================================
  // ¡ESTE BLOQUE ES EL QUE FALTA!
  // ===================================================
  // Listener para los botones "Pagar Ahora" (delegación)
  const container = document.getElementById("reservas-list-container");
  if (container) {
    container.addEventListener("click", (event) => {
      console.log("Debug: Clic detectado en el contenedor de reservas."); // <-- DEBUG

      const payButton = event.target.closest(".btn-pay-now");
      if (payButton) {
        console.log("Debug: Clic fue en un botón .btn-pay-now."); // <-- DEBUG
        const bookingId = payButton.getAttribute("data-booking-id");
        handlePayNowClick(bookingId); // <-- ¡AQUÍ SE LLAMA!
      }
    });
  } else {
    console.error("Error: No se encontró #reservas-list-container.");
  }
  // ===================================================

  // Listener para el botón "Pagar" DENTRO del modal
  const modalPayBtn = document.getElementById("btn-modal-pagar");
  if (modalPayBtn) {
    modalPayBtn.addEventListener("click", handleModalPayment);
  }

  // Listener para el botón "Imprimir"
  const printBtn = document.getElementById("btn-print-receipt");
  if (printBtn) {
    printBtn.addEventListener("click", handlePrint);
  }
}

/**
 * Orquestador: Carga datos de la API y llama a la UI.
 */
async function loadUserBookings() {
  const container = document.getElementById("reservas-list-container");
  const loader = document.getElementById("reservas-loader");
  const emptyMsg = document.getElementById("reservas-empty-msg");

  if (!container || !loader || !emptyMsg) {
    console.error(
      "[DEBUG] Falla Crítica: No se encontraron los elementos base (container, loader o emptyMsg). Revisa los IDs en mis-reservas.html."
    );
    return;
  }

  if (!window.currentUser || !window.currentUser.id) {
    ui.showMessage("Debes iniciar sesión para ver tus reservas.");
    return;
  }

  console.log("[DEBUG] Paso 1: Mostrando loader...");
  ui.showLoader(true);
  ui.showMessage(""); // Ocultar mensajes
  container.innerHTML = ""; // Limpiar

  try {
    console.log("[DEBUG] Paso 2: Llamando a api.fetchUserBookings...");
    const bookings = await api.fetchUserBookings(window.currentUser.id);

    console.log(
      "[DEBUG] Paso 3: Datos recibidos en index.js. Ocultando loader..."
    );
    ui.showLoader(false);

    moduleBookings = bookings;

    if (moduleBookings.length > 0) {
      console.log("[DEBUG] Paso 4: Renderizando bookings...");
      ui.renderBookings(
        moduleBookings,
        document.getElementById("reservas-list-container")
      );
      console.log("[DEBUG] Paso 5: Renderizado completo.");
    } else {
      console.log(
        "[DEBUG] Paso 4: No hay bookings. Mostrando mensaje de vacío."
      );
      ui.showMessage("Aún no tienes ninguna reserva registrada.");
    }
  } catch (error) {
    console.error("[DEBUG] ¡ERROR ATRAPADO!", error);

    try {
      console.log("[DEBUG] Paso Catch 1: Intentando ocultar loader...");
      ui.showLoader(false);
      console.log(
        "[DEBUG] Paso Catch 2: Intentando mostrar mensaje de error..."
      );
      ui.showMessage(
        "Error al cargar tus reservas. Por favor, intenta de nuevo."
      );
    } catch (uiError) {
      console.error(
        "[DEBUG] ¡FALLA CRÍTICA! El bloque 'catch' también falló. Revisa los IDs de 'reservas-loader' y 'reservas-empty-msg' en tu HTML.",
        uiError
      );
    }
  }
}

/**
 * Lógica de Negocio: Se dispara al hacer clic en "Pagar Ahora".
 */
function handlePayNowClick(bookingId) {
  // (Esta función es correcta como está en tu archivo)
  // ...
  const bookingToPay = moduleBookings.find(
    (b) => b.id.toString() === bookingId
  );
  if (!bookingToPay) return;

  // (Lógica de 48hs)
  const now = new Date();
  const appointmentTime = new Date(bookingToPay.appointment_datetime);
  const hoursRemaining = (appointmentTime - now) / 3600000;
  let priceToPay = bookingToPay.subtotal;
  let discountAmount = 0;
  if (hoursRemaining >= 48) {
    discountAmount = priceToPay * 0.85;
    priceToPay = priceToPay - discountAmount;
  }

  currentBookingToPay = bookingToPay;
  finalPaymentDetails = {
    subtotal: bookingToPay.subtotal,
    discountAmount: discountAmount,
    priceToPay: priceToPay,
  };

  ui.showPaymentModal(paymentModal, finalPaymentDetails);
}

/**
 * Lógica de Negocio: Se dispara al pagar en el modal.
 */
async function handleModalPayment() {
  // ===============================================
  // ¡AQUÍ ESTÁ LA SOLUCIÓN!
  // Si ya estamos procesando un pago, no hagas nada.
  if (isProcessingPayment) {
    console.warn("Pago ya en progreso. Clic ignorado.");
    return;
  }
  isProcessingPayment = true; // <-- Activamos la bandera
  // ===============================================

  if (!currentBookingToPay) {
    ui.showSafeToast("Error: No hay reserva seleccionada.", "danger");
    isProcessingPayment = false; // <-- Reseteamos la bandera
    return;
  }

  // 1. Mostrar loader en modal
  ui.showModalLoader(paymentModal);

  try {
    // 2. Simular espera
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // 3. Llamar a la función que actualiza Supabase
    await executeUpdatePayment();

    supabase.functions
      .invoke("send-receipt-email", {
        body: {
          booking: currentBookingToPay, // La info de la reserva
          userEmail: window.currentUser.email, // El email del usuario
          priceDetails: finalPaymentDetails, // El desglose de precios
        },
      })
      .then((response) => {
        if (response.error)
          console.error("Error al enviar email:", response.error);
        else console.log("Email enviado exitosamente.");
      });

    // 4. ÉXITO: Mostrar la vista de éxito/comprobante
    ui.showPaymentSuccess(currentBookingToPay, finalPaymentDetails);
    ui.showSafeToast("¡Pago completado con éxito!", "success");

    // 5. Recargar la lista de reservas en segundo plano
    loadUserBookings();
  } catch (error) {
    // 6. ERROR: Ocultar modal y mostrar error
    ui.hidePaymentModal(paymentModal);
    ui.showSafeToast(error.message || "Error al procesar el pago.", "danger");
  } finally {
    // 7. Limpiar estado (esto ahora es seguro)
    currentBookingToPay = null;
    finalPaymentDetails = {};
    isProcessingPayment = false; // <-- Reseteamos la bandera
  }
}

/**
 * Orquestador: Llama a la API para actualizar el pago.
 */
async function executeUpdatePayment() {
  // (Validación de currentUser que añadimos antes)
  if (!window.currentUser || !window.currentUser.id) {
    throw new Error("Tu sesión ha expirado.");
  }

  const bookingId = currentBookingToPay.id; // <-- Esta línea ya no fallará
  const discountAmount = finalPaymentDetails.discountAmount;
  const finalPrice = finalPaymentDetails.priceToPay;
  const transactionId = `sim-${Date.now()}`;

  const paymentData = {
    booking_id: bookingId,
    user_id: window.currentUser.id,
    amount_paid: finalPrice,
    discount_applied: discountAmount,
    payment_method: "debit_card",
    transaction_id: transactionId,
  };

  try {
    await api.registerPaymentAndUpdateBooking(paymentData);
  } catch (error) {
    console.error("Error en executeUpdatePayment:", error);
    throw error;
  }
  // (Quitamos el 'finally' de aquí, se movió a handleModalPayment)
}

/**
 * NUEVA: Maneja el clic en "Imprimir Comprobante".
 */
function handlePrint() {
  window.print();
}
