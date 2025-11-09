// public/js/modules/checkout/index.js
// VERSIÓN FUSIONADA (Lo mejor de "index-viejo.js" y "index.js")

// 1. IMPORTAR TODOS LOS MÓDULOS
import * as ui from "./ui.js";
import * as api from "./api.js";
import { ReservationContext } from "./context.js";
import {
  DebitCardStrategy,
  CashStrategy,
  NoDiscountStrategy,
  ProductCashStrategy,
  ProductDebitStrategy
} from "../payment/strategies.js";

// 2. DEFINIR EL ESTADO DE LA PÁGINA
let serviceCartItems = [];
let serviceContext;
let productCartItems = [];
let productContext;
let activeTab = 'servicios';

// --- FUSIÓN: Variable del calendario (de index.js) ---
let selectedDateTime = null;

/**
 * FUNCIÓN PRINCIPAL (Llamada por el Router)
 * (Lógica de index-viejo.js + initCalendar)
 */
export function initCheckoutPage() {
  // 1. Cargar el carrito de SERVICIOS
  const serviceCarritoJSON = localStorage.getItem("carritoServicios");
  serviceCartItems = serviceCarritoJSON ? JSON.parse(serviceCarritoJSON) : [];
  const serviceSubtotal = ui.renderCartItems(serviceCartItems);
  serviceContext = new ReservationContext(serviceSubtotal);

  // 2. Cargar el carrito de PRODUCTOS
  const productCarritoJSON = localStorage.getItem("carritoProductos");
  productCartItems = productCarritoJSON ? JSON.parse(productCarritoJSON) : [];
  const productSubtotal = ui.renderProductCartItems(productCartItems);
  productContext = new ReservationContext(productSubtotal);

  // --- FUSIÓN: Inicializar el calendario (de index.js) ---
  initCalendar();
  
  // 3. Configurar los listeners
  setupListeners();

  // 4. Calcular y mostrar los totales iniciales
  updatePaymentStrategy();
  updateTotals();
  updateProductTotalsUI(); 

  // 5. Validar estado inicial
  const { payment_method } = ui.getFormValues();
  // --- FUSIÓN: Usar la validación con fecha (de index.js) ---
  ui.validateBusinessRules(payment_method, null, selectedDateTime);
}

/**
 * Configura los listeners para PESTAÑAS, PAGOS, BOTÓN y CANTIDADES.
 * (Lógica de index-viejo.js + listener de borrado de servicios)
 */
function setupListeners() {
  // --- Listeners de Pestañas (de index-viejo.js) ---
  const tabButtons = document.querySelectorAll('#checkoutTabs button[data-bs-toggle="tab"]');
  tabButtons.forEach(tab => {
    tab.addEventListener('shown.bs.tab', handleTabChange);
  });

  // --- Listener de Métodos de Pago (Unificado) ---
  const radioInputs = document.querySelectorAll('#payment-options-wrapper input[name="payment"]');
  radioInputs.forEach((input) => {
    input.addEventListener("change", handlePaymentChange);
  });

  // --- Listener del Botón Principal (Unificado) ---
  const confirmButton = document.getElementById("btn-confirmar-checkout");
  confirmButton.addEventListener("click", handleConfirmCheckout);
  
  // --- Listeners de Carrito de Productos (de index-viejo.js) ---
  const productContainer = document.getElementById("productos-items-container");
  if (productContainer) {
    productContainer.addEventListener("change", (e) => {
      if (e.target.classList.contains("product-quantity-input")) {
        handleProductCartChange(e.target.dataset.id, e.target.value);
      }
    });
    productContainer.addEventListener("click", (e) => {
      const removeBtn = e.target.closest(".btn-remove-product");
      if (removeBtn) {
        handleProductCartChange(removeBtn.dataset.id, 0);
      }
    });
  }
  
  // --- FUSIÓN: Listener de Carrito de Servicios (de index.js) ---
  const serviceContainer = document.getElementById("servicios-items-container");
  if (serviceContainer) {
    serviceContainer.addEventListener("click", handleRemoveServiceClick);
  }
}

/**
 * NUEVO (de index.js): Se dispara al hacer clic en el contenedor de items de SERVICIOS.
 * (Adaptado para que funcione con la lógica de index-viejo.js)
 */
function handleRemoveServiceClick(event) {
  const deleteButton = event.target.closest(".btn-remove-item");
  if (!deleteButton) return; 

  const itemId = deleteButton.getAttribute("data-item-id");

  // 1. Filtrar el array local
  serviceCartItems = serviceCartItems.filter(
    (item) => item.id.toString() !== itemId.toString()
  );

  // 2. Actualizar localStorage
  localStorage.setItem("carritoServicios", JSON.stringify(serviceCartItems));

  // 3. Refrescar la UI (lógica adaptada de index-viejo.js)
  const newServiceSubtotal = ui.renderCartItems(serviceCartItems);
  serviceContext.subtotal = newServiceSubtotal;
  
  if (activeTab === 'servicios') {
    updateTotals();
  }
  
  const { payment_method } = ui.getFormValues();
  ui.validateBusinessRules(payment_method, null, selectedDateTime);
  
  showSafeToast("Servicio eliminado del carrito", "info");
}

/**
 * (de index-viejo.js): Se dispara CADA VEZ que el usuario cambia de pestaña.
 * (Modificado para usar la validación con fecha)
 */
function handleTabChange(event) {
  activeTab = event.target.id === 'servicios-tab' ? 'servicios' : 'productos';
  console.log("Pestaña activa:", activeTab);

  const confirmButton = document.getElementById("btn-confirmar-checkout");
  
  // 1. Actualizar etiquetas de descuento y texto del botón
  if (activeTab === 'servicios') {
    ui.updatePaymentLabels('servicios');
    confirmButton.innerHTML = "Confirmar Reserva";
  } else {
    ui.updatePaymentLabels('productos');
    confirmButton.innerHTML = "Confirmar Compra";
  }

  // 2. Recalcular y mostrar el total de la pestaña activa en el resumen principal
  updateTotals();
  
  // 3. Validar el estado
  const { payment_method } = ui.getFormValues();
  // --- FUSIÓN: Usar la validación con fecha (true para productos) ---
  const dateToValidate = (activeTab === 'servicios') ? selectedDateTime : true;
  ui.validateBusinessRules(payment_method, null, dateToValidate);
}

/**
 * (de index-viejo.js): Se dispara CADA VEZ que el usuario cambia una opción de PAGO.
 * (Modificado para usar la validación con fecha)
 */
function handlePaymentChange() {
  const { payment_method } = ui.getFormValues();

  // 1. Validar reglas de negocio
  // --- FUSIÓN: Usar la validación con fecha (true para productos) ---
  const dateToValidate = (activeTab === 'servicios') ? selectedDateTime : true;
  ui.validateBusinessRules(payment_method, null, dateToValidate);

  // 2. Actualizar AMBAS estrategias (servicios y productos)
  updatePaymentStrategy();

  // 3. Recalcular y mostrar el total (solo de la pestaña activa)
  updateTotals();
  
  // 4. Recalcular también el sub-resumen de productos
  updateProductTotalsUI();
}

/**
 * (de index-viejo.js): Se dispara al cambiar cantidad o eliminar un PRODUCTO.
 * (Sin cambios)
 */
function handleProductCartChange(productId, newQuantity) {
  const quantity = parseInt(newQuantity);
  if (isNaN(quantity) || quantity < 0) return;

  if (quantity === 0) {
    productCartItems = productCartItems.filter((item) => item.id.toString() !== productId.toString());
  } else {
    productCartItems = productCartItems.map((item) => {
      if (item.id.toString() === productId.toString()) {
        return { ...item, quantity: quantity };
      }
      return item;
    });
  }

  localStorage.setItem("carritoProductos", JSON.stringify(productCartItems));

  const newProductSubtotal = ui.renderProductCartItems(productCartItems);
  productContext.subtotal = newProductSubtotal;
  updateProductTotalsUI();
  
  if (activeTab === 'productos') {
    updateTotals();
  }
}

/**
 * (de index-viejo.js): Aplica la estrategia correcta a CADA contexto.
 * (Sin cambios)
 */
function updatePaymentStrategy() {
  const { payment_method } = ui.getFormValues();

  // 1. Estrategia de SERVICIOS
  if (payment_method === "debit_card") {
    serviceContext.setStrategy(new DebitCardStrategy());
  } else if (payment_method === "cash") {
    serviceContext.setStrategy(new CashStrategy());
  } else {
    serviceContext.setStrategy(new NoDiscountStrategy());
  }

  // 2. Estrategia de PRODUCTOS
  if (payment_method === "cash") {
    productContext.setStrategy(new ProductCashStrategy());
  } else if (payment_method === "debit_card") {
    productContext.setStrategy(new ProductDebitStrategy());
  } else {
    productContext.setStrategy(new NoDiscountStrategy());
  }
}

/**
 * (de index-viejo.js): Recalcula el RESUMEN PRINCIPAL (derecha).
 * (Sin cambios)
 */
function updateTotals() {
  let subtotal = 0;
  let discountAmount = 0;
  let newTotal = 0;

  if (activeTab === 'servicios') {
    const summary = serviceContext.calculateTotal();
    subtotal = serviceContext.subtotal;
    discountAmount = summary.discountAmount;
    newTotal = summary.newTotal;
  } else {
    const summary = productContext.calculateTotal();
    subtotal = productContext.subtotal;
    discountAmount = summary.discountAmount;
    newTotal = summary.newTotal;
  }

  ui.updateTotalsUI({
    subtotal: subtotal,
    discountAmount: discountAmount,
    newTotal: newTotal,
  });
}

/**
 * (de index-viejo.js): Recalcula la UI INTERNA de la pestaña de productos.
 * (Sin cambios)
 */
function updateProductTotalsUI() {
  const { discountAmount, newTotal } = productContext.calculateTotal();
  ui.updateProductTotalsUI({
    subtotal: productContext.subtotal,
    discountAmount: discountAmount,
  });
}

/**
 * (de index-viejo.js): Decide qué función llamar basado en 'activeTab'.
 * (Sin cambios)
 */
function handleConfirmCheckout() {
  if (activeTab === 'servicios') {
    handleConfirmServices();
  } else {
    handleConfirmProducts();
  }
}

/**
 * (de index-viejo.js): Lógica para confirmar SÓLO SERVICIOS.
 * (Modificado para incluir la fecha)
 */
async function handleConfirmServices() {
  console.log("Confirmando RESERVA de servicios...");
  const { delivery_method, payment_method } = ui.getFormValues();

  // --- FUSIÓN: Usar la validación con fecha ---
  if (!ui.validateBusinessRules(payment_method, delivery_method, selectedDateTime)) {
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

  const { discountAmount, newTotal } = serviceContext.calculateTotal();

  const bookingData = {
    user_id: window.currentUser.id,
    subtotal: serviceContext.subtotal,
    discount_applied: discountAmount,
    total_price: newTotal,
    payment_method: payment_method,
    delivery_method: delivery_method, // 'in_spa'
    // --- FUSIÓN: Añadir la fecha de la reserva (de index.js) ---
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
      window.location.hash = "#reservas"; // Cambiado de #home a #reservas
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

/**
 * (de index-viejo.js): Lógica para confirmar SÓLO PRODUCTOS.
 * (Sin cambios)
 */
async function handleConfirmProducts() {
  console.log("Confirmando COMPRA de productos...");
  const { payment_method } = ui.getFormValues();

  // (Validación simple, 'true' para la fecha)
  if (!ui.validateBusinessRules(payment_method, null, true)) {
    showSafeToast("Por favor, selecciona un método de pago.", "danger");
    return;
  }
  if (!window.currentUser) {
    showSafeToast("Debes iniciar sesión para comprar.", "warning");
    return;
  }
  if (productCartItems.length === 0) {
    showSafeToast("Tu carrito de productos está vacío.", "warning");
    return;
  }

  const { discountAmount, newTotal } = productContext.calculateTotal();

  const purchaseData = {
    user_id: window.currentUser.id,
    subtotal: productContext.subtotal,
    discount_applied: discountAmount,
    total_price: newTotal,
    payment_method: payment_method,
    delivery_method: 'product_purchase', 
  };
  
  const confirmBtn = document.getElementById("btn-confirmar-checkout");
  try {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = "Procesando Compra...";

    const result = await api.saveProductPurchase(purchaseData, productCartItems);
    
    if (result.success) {
      showSafeToast("¡Compra de productos realizada con éxito!", "success");
      localStorage.removeItem("carritoProductos");
      window.location.hash = "#reservas"; // Cambiado de #home a #reservas
    } else {
      throw new Error("La API de guardado de productos no tuvo éxito.");
    }
  } catch (error) {
    console.error("Error al confirmar la compra:", error);
    showSafeToast("Error al procesar tu compra. Intenta de nuevo.", "danger");
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = "Confirmar Compra";
  }
}

/**
 * NUEVO (de index.js): Inicializa Flatpickr
 */
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
      // Llamamos a la función de refresco del archivo viejo
      handlePaymentChange(); 
    },
  });
}

/**
 * Función helper para mostrar notificaciones (toast) de forma segura.
 * (Sin cambios)
 */
function showSafeToast(message, type = "info") {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    alert(message);
  }
}