// public/js/modules/checkout/service-checkout.js
// GESTOR DE CHECKOUT DE SERVICIOS

import * as ui from "./ui.js";
import * as api from "./api.js";
import { ReservationContext } from "./context.js";
import {
  DebitCardStrategy,
  CashStrategy,
  NoDiscountStrategy,
} from "../payment/service-strategies.js"; // <-- Importa de la nueva ubicación

let serviceCartItems = [];
let serviceContext;
let selectedDateTime = null;

export function initServiceCheckout() {
  // 1. Cargar el carrito de SERVICIOS
  const serviceCarritoJSON = localStorage.getItem("carritoServicios");
  serviceCartItems = serviceCarritoJSON ? JSON.parse(serviceCarritoJSON) : [];
  const serviceSubtotal = ui.renderCartItems(serviceCartItems);
  serviceContext = new ReservationContext(serviceSubtotal);

  // 2. Inicializar el calendario
  initCalendar();

  // 3. Configurar listeners
  setupServiceListeners();

  // 4. Calcular y mostrar los totales iniciales (si la pestaña de servicios está activa)
  if (document.getElementById('servicios-tab').classList.contains('active')) {
    updateServicePaymentStrategy();
    updateServiceTotals();
    validateServiceRules();
  }
}

function setupServiceListeners() {
  // Listener de Métodos de Pago
  const radioInputs = document.querySelectorAll('#payment-options-wrapper input[name="payment"]');
  radioInputs.forEach((input) => {
    // Solo actualizamos si la pestaña de servicios está activa
    input.addEventListener("change", () => {
      if (document.getElementById('servicios-tab').classList.contains('active')) {
        handleServicePaymentChange();
      }
    });
  });

  // Listener de Carrito de Servicios
  const serviceContainer = document.getElementById("servicios-items-container");
  if (serviceContainer) {
    serviceContainer.addEventListener("click", handleRemoveServiceClick);
  }
}

function handleRemoveServiceClick(event) {
  const deleteButton = event.target.closest(".btn-remove-item");
  if (!deleteButton) return; 

  const itemId = deleteButton.getAttribute("data-item-id");
  serviceCartItems = serviceCartItems.filter(
    (item) => item.id.toString() !== itemId.toString()
  );
  localStorage.setItem("carritoServicios", JSON.stringify(serviceCartItems));

  const newServiceSubtotal = ui.renderCartItems(serviceCartItems);
  serviceContext.subtotal = newServiceSubtotal;

  updateServiceTotals();
  validateServiceRules();

  showSafeToast("Servicio eliminado del carrito", "info");
}

export function handleServicePaymentChange() {
  validateServiceRules();
  updateServicePaymentStrategy();
  updateServiceTotals();
}

function updateServicePaymentStrategy() {
  const { payment_method } = ui.getFormValues();

  if (payment_method === "debit_card") {
    serviceContext.setStrategy(new DebitCardStrategy());
  } else if (payment_method === "cash") {
    serviceContext.setStrategy(new CashStrategy());
  } else {
    serviceContext.setStrategy(new NoDiscountStrategy());
  }
}

export function updateServiceTotals() {
  const { discountAmount, newTotal } = serviceContext.calculateTotal();
  ui.updateTotalsUI({
    subtotal: serviceContext.subtotal,
    discountAmount: discountAmount,
    newTotal: newTotal,
  });
}

function validateServiceRules() {
  const { payment_method, delivery_method } = ui.getFormValues();
  return ui.validateBusinessRules(payment_method, delivery_method, selectedDateTime);
}

export async function handleConfirmServices() {
  console.log("Confirmando RESERVA de servicios...");

  if (!validateServiceRules()) {
    showSafeToast("Por favor, corrige los errores en tu pedido.", "danger");
    return;
  }
  if (!window.currentUser) {
    showSafeToast("Debes iniciar sesión para reservar.", "warning");
    return;
  }
  if (serviceCartItems.length === 0) {
    showSafeToast("Tu carrito de servicios está vacío.", "warning");
    return;
  }

  const { payment_method, delivery_method } = ui.getFormValues();
  const { discountAmount, newTotal } = serviceContext.calculateTotal();

  const bookingData = {
    user_id: window.currentUser.id,
    subtotal: serviceContext.subtotal,
    discount_applied: discountAmount,
    total_price: newTotal,
    payment_method: payment_method,
    delivery_method: delivery_method,
    appointment_datetime: selectedDateTime ? selectedDateTime.toISOString() : null
  };

  const confirmBtn = document.getElementById("btn-confirmar-checkout");
  try {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = "Procesando Reserva...";
    const result = await api.saveBooking(bookingData, serviceCartItems);
    if (result.success) {
      showSafeToast("¡Reserva creada con éxito!", "success");
      localStorage.removeItem("carritoServicios");
      window.location.hash = "#reservas"; 
    } else {
      throw new Error("La API de guardado de servicios no tuvo éxito.");
    }
  } catch (error) {
    console.error("Error al confirmar la reserva:", error);
    showSafeToast("Error al procesar tu reserva. Intenta de nuevo.", "danger");
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = "Confirmar Reserva";
  }
}

function initCalendar() {
  const minDate = new Date().fp_incr(2);
  flatpickr("#datepicker-checkout", {
    enableTime: true,
    dateFormat: "Y-m-d H:i",
    minDate: minDate,
    time_24hr: true,
    minuteIncrement: 30,
    onChange: function (selectedDates) {
      selectedDateTime = selectedDates[0];
      handleServicePaymentChange(); 
    },
  });
}

function showSafeToast(message, type = "info") {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    alert(message);
  }
}