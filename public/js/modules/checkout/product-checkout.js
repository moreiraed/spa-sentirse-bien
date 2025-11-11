// public/js/modules/checkout/product-checkout.js
// GESTOR DE CHECKOUT DE PRODUCTOS

import * as ui from "./ui.js";
import * as api from "./api.js";
import { ReservationContext } from "./context.js";
import {
  ProductCashStrategy,
  ProductDebitStrategy,
  NoDiscountStrategy,
} from "../payment/product-strategies.js"; // <-- Importa de la nueva ubicación

let productCartItems = [];
let productContext;

export function initProductCheckout() {
  // 1. Cargar el carrito de PRODUCTOS
  const productCarritoJSON = localStorage.getItem("carritoProductos");
  productCartItems = productCarritoJSON ? JSON.parse(productCarritoJSON) : [];
  const productSubtotal = ui.renderProductCartItems(productCartItems);
  productContext = new ReservationContext(productSubtotal);

  // 2. Configurar listeners
  setupProductListeners();

  // 3. Calcular y mostrar los totales iniciales (si la pestaña de productos está activa)
  if (document.getElementById('productos-tab').classList.contains('active')) {
    updateProductPaymentStrategy();
    updateProductTotals();
    validateProductRules();
  } else {
    // Aunque no esté activa, calculamos los descuentos para la UI interna
    updateProductPaymentStrategy();
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
  updateProductTotals(); // Actualiza el resumen de pago si la pestaña está activa
  validateProductRules();
}

export function handleProductPaymentChange() {
  validateProductRules();
  updateProductPaymentStrategy();
  updateProductTotals();
}

function updateProductPaymentStrategy() {
  const { payment_method } = ui.getFormValues();

  if (payment_method === "cash") {
    productContext.setStrategy(new ProductCashStrategy());
  } else if (payment_method === "debit_card") {
    productContext.setStrategy(new ProductDebitStrategy());
  } else {
    productContext.setStrategy(new NoDiscountStrategy());
  }
}

// Actualiza el Resumen de Pago (Total, Subtotal, Descuento)
export function updateProductTotals() {
  const { discountAmount, newTotal } = productContext.calculateTotal();
  ui.updateTotalsUI({
    subtotal: productContext.subtotal,
    discountAmount: discountAmount,
    newTotal: newTotal,
  });
  // También actualiza la UI interna de la tarjeta de productos
  updateProductTotalsUI();
}

// Actualiza solo la UI interna del carrito de productos
function updateProductTotalsUI() {
  const { discountAmount, newTotal } = productContext.calculateTotal();
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