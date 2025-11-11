// public/js/modules/checkout/index.js
// ORQUESTADOR DE CHECKOUT

import * as ui from "./ui.js";
// Importa los MÓDULOS de checkout
import { 
  initServiceCheckout, 
  handleServicePaymentChange, 
  updateServiceTotals, 
  handleConfirmServices 
} from "./service-checkout.js";

import { 
  initProductCheckout, 
  handleProductPaymentChange, 
  updateProductTotals, 
  handleConfirmProducts 
} from "./product-checkout.js";

let activeTab = 'servicios'; // 'servicios' o 'productos'

/**
 * FUNCIÓN PRINCIPAL (Llamada por el Router)
 */
export function initCheckoutPage() {
  // 1. Determinar la pestaña activa
  activeTab = document.getElementById('servicios-tab').classList.contains('active') ? 'servicios' : 'productos';

  // 2. Inicializar los dos controladores
  initServiceCheckout();
  initProductCheckout();
  
  // 3. Configurar listeners compartidos
  setupSharedListeners();

  // 4. Actualizar estado inicial del botón
  updateButtonAndLabels(activeTab);
}

function setupSharedListeners() {
  // Listener de Pestañas
  const tabButtons = document.querySelectorAll('#checkoutTabs button[data-bs-toggle="tab"]');
  tabButtons.forEach(tab => {
    tab.addEventListener('shown.bs.tab', handleTabChange);
  });

  // Listener del Botón Principal
  const confirmButton = document.getElementById("btn-confirmar-checkout");
  confirmButton.addEventListener("click", handleConfirmCheckout);
}

/**
 * (Listener de cambio de pestaña)
 * Orquesta qué controlador debe actualizar la UI
 */
function handleTabChange(event) {
  activeTab = event.target.id === 'servicios-tab' ? 'servicios' : 'productos';
  console.log("Pestaña activa:", activeTab);

  updateButtonAndLabels(activeTab);

  // Llama a la función de actualización del controlador correspondiente
  if (activeTab === 'servicios') {
    handleServicePaymentChange(); // Re-calcula y actualiza UI de servicios
  } else {
    handleProductPaymentChange(); // Re-calcula y actualiza UI de productos
  }
}

/**
 * (Handler: Botón principal de Confirmar)
 * Orquesta qué controlador debe manejar el guardado
 */
function handleConfirmCheckout() {
  if (activeTab === 'servicios') {
    handleConfirmServices();
  } else {
    handleConfirmProducts();
  }
}

/**
* (Helper: Actualiza UI compartida)
*/
function updateButtonAndLabels(activeTab) {
  const confirmButton = document.getElementById("btn-confirmar-checkout");
  
  if (activeTab === 'servicios') {
    ui.updatePaymentLabels('servicios');
    confirmButton.innerHTML = "Confirmar Reserva";
  } else {
    ui.updatePaymentLabels('productos');
    confirmButton.innerHTML = "Confirmar Compra";
  }
}