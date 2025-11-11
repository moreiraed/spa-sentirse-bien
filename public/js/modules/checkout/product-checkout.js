// public/js/modules/checkout/product-checkout.js
// GESTOR DE CHECKOUT DE PRODUCTOS (¡Con descuentos acumulables!)

import * as ui from "./ui.js";
import * as api from "./api.js";
import { ReservationContext } from "./context.js";
import {
  ProductCashStrategy,
  ProductDebitStrategy,
  NoDiscountStrategy,
  ProductFrequentCustomerStrategy, // <-- ¡CAMBIO! Importamos la nueva estrategia
} from "../payment/product-strategies.js"; 

let productCartItems = [];
let productContext;
let isFrequentCustomer = false; // <-- ¡CAMBIO! Nuevo estado para el descuento

// --- ¡CAMBIO IMPORTANTE! ---
// La inicialización ahora es asíncrona para esperar la info del usuario
export async function initProductCheckout() {
  // 1. Cargar el carrito
  const productCarritoJSON = localStorage.getItem("carritoProductos");
  productCartItems = productCarritoJSON ? JSON.parse(productCarritoJSON) : [];
  const productSubtotal = ui.renderProductCartItems(productCartItems);
  productContext = new ReservationContext(productSubtotal);

  // 2. ¡CAMBIO! Verificar si el cliente es frecuente
  // Solo lo verificamos si hay un usuario logueado
  if (window.currentUser && window.currentUser.id) {
    isFrequentCustomer = await api.isFrequentCustomer(window.currentUser.id);
  } else {
    isFrequentCustomer = false;
  }
  
  // 3. Configurar listeners
  setupProductListeners();

  // 4. Calcular totales iniciales
  if (document.getElementById('productos-tab').classList.contains('active')) {
    updateProductPaymentStrategy(); // <-- ¡CAMBIO! Adaptado a setStrategies
    updateProductTotals();
    validateProductRules();
  } else {
    // Aunque no esté activa, calculamos los descuentos para la UI interna
    updateProductPaymentStrategy(); // <-- ¡CAMBIO! Adaptado a setStrategies
    updateProductTotalsUI();
  }
}

function setupProductListeners() {
  // Listener de Métodos de Pago
  const radioInputs = document.querySelectorAll('#payment-options-wrapper input[name="payment"]');
  radioInputs.forEach((input) => {
    // Solo actualizamos si la pestaña de productos está activa
    input.addEventListener("change", () => {
      if (document.getElementById('productos-tab').classList.contains('active')) {
        handleProductPaymentChange();
      } else {
        // Si la pestaña no está activa, solo actualiza la estrategia y la UI interna
        updateProductPaymentStrategy();
        updateProductTotalsUI();
      }
    });
  });

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
}

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
  updateProductTotals(); // ¡CAMBIO! Esta función ahora usa el contexto
  validateProductRules();
}

export function handleProductPaymentChange() {
  validateProductRules();
  updateProductPaymentStrategy();
  updateProductTotals();
}

// --- ¡CAMBIO IMPORTANTE! ---
function updateProductPaymentStrategy() {
  const { payment_method } = ui.getFormValues();
  
  // 1. Creamos un array de estrategias
  let strategies = [];

  // 2. Añadimos la estrategia de Cliente Frecuente
  // Esta se añade SIEMPRE. Su lógica interna ('calculate')
  // decidirá si aplica el descuento o no, basado en el 'context.isFrequent'.
  strategies.push(new ProductFrequentCustomerStrategy());

  // 3. Añadimos la estrategia por método de pago
  if (payment_method === "cash") {
    strategies.push(new ProductCashStrategy());
  } else if (payment_method === "debit_card") {
    strategies.push(new ProductDebitStrategy());
  } else {
    // Para 'credit_card' u otro
    strategies.push(new NoDiscountStrategy());
  }
  
  // 4. Pasamos el array de estrategias al contexto
  productContext.setStrategies(strategies);
}

// Actualiza el Resumen de Pago (Total, Subtotal, Descuento)
// --- ¡CAMBIO IMPORTANTE! ---
export function updateProductTotals() {
  const { payment_method } = ui.getFormValues();
  
  // ¡CAMBIO! Creamos el contexto con toda la info necesaria
  const context = {
    payment_method: payment_method,
    isFrequent: isFrequentCustomer // <-- Pasamos el estado del cliente
  };
  
  // El contexto sumará los descuentos de ambas estrategias si aplican
  const { discountAmount, newTotal } = productContext.calculateTotal(context);
  
  ui.updateTotalsUI({
    subtotal: productContext.subtotal,
    discountAmount: discountAmount,
    newTotal: newTotal,
  });
  // También actualiza la UI interna
  updateProductTotalsUI();
}

// Actualiza solo la UI interna del carrito de productos
// --- ¡CAMBIO IMPORTANTE! ---
function updateProductTotalsUI() {
  const { payment_method } = ui.getFormValues();
  
  // ¡CAMBIO! Creamos el contexto
  const context = {
    payment_method: payment_method,
    isFrequent: isFrequentCustomer
  };
  
  const { discountAmount } = productContext.calculateTotal(context);
  
  ui.updateProductTotalsUI({
    subtotal: productContext.subtotal,
    discountAmount: discountAmount,
  });
}

function validateProductRules() {
  const { payment_method } = ui.getFormValues();
  // El 'true' al final significa que no se requiere fecha
  return ui.validateBusinessRules(payment_method, null, true);
}

// --- ¡CAMBIO IMPORTANTE! ---
export async function handleConfirmProducts() {
  console.log("Confirmando COMPRA de productos...");

  if (!validateProductRules()) {
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

  const { payment_method } = ui.getFormValues();
  
  // ¡CAMBIO! Creamos el contexto para el cálculo final
  const context = {
    payment_method: payment_method,
    isFrequent: isFrequentCustomer
  };
  const { discountAmount, newTotal } = productContext.calculateTotal(context);

  const purchaseData = {
    user_id: window.currentUser.id,
    subtotal: productContext.subtotal,
    discount_applied: discountAmount, // <-- Total de descuentos acumulados
    total_price: newTotal,            // <-- Total final
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
      window.location.hash = "#pedidos";
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

function showSafeToast(message, type = "info") {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    alert(message);
  }
}