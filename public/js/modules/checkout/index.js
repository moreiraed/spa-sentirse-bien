// public/js/modules/checkout/index.js
// VERSIÓN FUSIONADA (CON REDIRECCIÓN CORREGIDA)

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
let selectedDateTime = null;

/**
 * FUNCIÓN PRINCIPAL (Llamada por el Router)
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

  // 3. Inicializar el calendario
  initCalendar();
  
  // 4. Configurar los listeners
  setupListeners();

  // 5. Calcular y mostrar los totales iniciales
  updatePaymentStrategy();
  updateTotals();
  updateProductTotalsUI(); 

  // 6. Validar estado inicial
  const { payment_method } = ui.getFormValues();
  ui.validateBusinessRules(payment_method, null, selectedDateTime);
}

/**
 * Configura los listeners
 */
function setupListeners() {
  // Listeners de Pestañas
  const tabButtons = document.querySelectorAll('#checkoutTabs button[data-bs-toggle="tab"]');
  tabButtons.forEach(tab => {
    tab.addEventListener('shown.bs.tab', handleTabChange);
  });

  // Listener de Métodos de Pago
  const radioInputs = document.querySelectorAll('#payment-options-wrapper input[name="payment"]');
  radioInputs.forEach((input) => {
    input.addEventListener("change", handlePaymentChange);
  });

  // Listener del Botón Principal
  const confirmButton = document.getElementById("btn-confirmar-checkout");
  confirmButton.addEventListener("click", handleConfirmCheckout);
  
  // Listeners de Carrito de Productos
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
  
  // Listener de Carrito de Servicios
  const serviceContainer = document.getElementById("servicios-items-container");
  if (serviceContainer) {
    serviceContainer.addEventListener("click", handleRemoveServiceClick);
  }
}

/**
 * (Listener de borrado de servicios)
 */
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
  
  if (activeTab === 'servicios') {
    updateTotals();
  }
  
  const { payment_method } = ui.getFormValues();
  ui.validateBusinessRules(payment_method, null, selectedDateTime);
  
  showSafeToast("Servicio eliminado del carrito", "info");
}

/**
 * (Listener de cambio de pestaña)
 */
function handleTabChange(event) {
  activeTab = event.target.id === 'servicios-tab' ? 'servicios' : 'productos';
  console.log("Pestaña activa:", activeTab);

  const confirmButton = document.getElementById("btn-confirmar-checkout");
  
  if (activeTab === 'servicios') {
    ui.updatePaymentLabels('servicios');
    confirmButton.innerHTML = "Confirmar Reserva";
  } else {
    ui.updatePaymentLabels('productos');
    confirmButton.innerHTML = "Confirmar Compra";
  }

  updateTotals();
  
  const { payment_method } = ui.getFormValues();
  const dateToValidate = (activeTab === 'servicios') ? selectedDateTime : true;
  ui.validateBusinessRules(payment_method, null, dateToValidate);
}

/**
 * (Listener de cambio de pago)
 */
function handlePaymentChange() {
  const { payment_method } = ui.getFormValues();
  const dateToValidate = (activeTab === 'servicios') ? selectedDateTime : true;
  ui.validateBusinessRules(payment_method, null, dateToValidate);
  updatePaymentStrategy();
  updateTotals();
  updateProductTotalsUI();
}

/**
 * (Listener de cambio en carrito de productos)
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
 * (Helper: Actualiza estrategias de pago)
 */
function updatePaymentStrategy() {
  const { payment_method } = ui.getFormValues();

  // Estrategia de SERVICIOS
  if (payment_method === "debit_card") {
    serviceContext.setStrategy(new DebitCardStrategy());
  } else if (payment_method === "cash") {
    serviceContext.setStrategy(new CashStrategy());
  } else {
    serviceContext.setStrategy(new NoDiscountStrategy());
  }

  // Estrategia de PRODUCTOS
  if (payment_method === "cash") {
    productContext.setStrategy(new ProductCashStrategy());
  } else if (payment_method === "debit_card") {
    productContext.setStrategy(new ProductDebitStrategy());
  } else {
    productContext.setStrategy(new NoDiscountStrategy());
  }
}

/**
 * (Helper: Actualiza el Resumen de Pago)
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
 * (Helper: Actualiza UI interna de productos)
 */
function updateProductTotalsUI() {
  const { discountAmount, newTotal } = productContext.calculateTotal();
  ui.updateProductTotalsUI({
    subtotal: productContext.subtotal,
    discountAmount: discountAmount,
  });
}

/**
 * (Handler: Botón principal de Confirmar)
 */
function handleConfirmCheckout() {
  if (activeTab === 'servicios') {
    handleConfirmServices();
  } else {
    handleConfirmProducts();
  }
}

/**
 * (Lógica de API: Confirmar Servicios)
 */
async function handleConfirmServices() {
  console.log("Confirmando RESERVA de servicios...");
  const { delivery_method, payment_method } = ui.getFormValues();

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

/**
 * (Lógica de API: Confirmar Productos)
 */
async function handleConfirmProducts() {
  console.log("Confirmando COMPRA de productos...");
  const { payment_method } = ui.getFormValues();

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
      
      // ----------------------------------------------------
      // --- ¡AQUÍ ESTÁ EL CAMBIO! ---
      // ----------------------------------------------------
      window.location.hash = "#pedidos"; // <-- CORREGIDO
      // ----------------------------------------------------

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
 * (Helper: Inicializa Calendario)
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
      handlePaymentChange(); 
    },
  });
}

/**
 * (Helper: Muestra Toasts)
 */
function showSafeToast(message, type = "info") {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    alert(message);
  }
}