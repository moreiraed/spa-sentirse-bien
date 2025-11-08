/**
 * Renderiza los items del carrito de SERVICIOS en el contenedor.
 * @param {Array} cartItems - El array de 'carritoServicios'.
 * @returns {number} - El subtotal calculado.
 */
export function renderCartItems(cartItems) {
  // Apunta al nuevo ID dentro de la pestaña de servicios
  const containerId = "servicios-items-container";
  const container = document.getElementById(containerId);

  if (!container) {
    console.error(`Contenedor UI no encontrado: ${containerId}`);
    return 0;
  }

  container.innerHTML = ""; // Limpiar
  let subtotal = 0;

  if (!cartItems || cartItems.length === 0) {
    container.innerHTML = '<p class="text-muted">Tu carrito de reservas está vacío.</p>';
    document.getElementById("btn-confirmar-checkout").disabled = true; // Apuntar al ID genérico
    return 0;
  }

  cartItems.forEach(item => {
    const itemPrice = parseFloat(item.price);
    if (isNaN(itemPrice)) return;

    container.innerHTML += `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="text-truncate" style="max-width: 65%;">${item.title}</span>
        <div class="d-flex align-items-center">
          <span class="fw-bold me-3">${formatPrice(itemPrice)}</span>
          <button class="btn btn-sm btn-outline-danger btn-remove-item" data-item-id="${item.id}">
            <i class="bi bi-trash" style="pointer-events: none;"></i>
          </button>
        </div>
      </div>
    `;
    subtotal += itemPrice;
  });

  return subtotal;
}

/**
 * Actualiza los campos de Subtotal, Descuento y Total en el DOM.
 * @param {object} summary - Un objeto con { subtotal, discountAmount, newTotal }.
 */
export function updateTotalsUI(summary) {
  document.getElementById("resumen-subtotal").textContent = formatPrice(summary.subtotal);
  document.getElementById("resumen-descuento").textContent = `-${formatPrice(summary.discountAmount)}`;
  document.getElementById("resumen-total").textContent = formatPrice(summary.newTotal);
}

/**
 * Lee los valores actuales de los inputs del formulario (radios).
 * (CORREGIDO: Busca los inputs en su nueva ubicación global)
 * @returns {{delivery_method: string, payment_method: string}}
 */
export function getFormValues() {
  // El input de 'delivery' ahora está oculto
  const delivery_method = document.querySelector('input[name="delivery"]:checked')?.value;
  
  // El input de 'payment' ahora está en el wrapper de la columna derecha
  const payment_method = document.querySelector('#payment-options-wrapper input[name="payment"]:checked')?.value;
  
  return { delivery_method, payment_method };
}

/**
 * Valida las reglas de negocio y actualiza la UI (alerta y botón).
 * @param {string} payment_method - El método de pago seleccionado.
 * @returns {boolean} - True si es válido, False si hay un error.
 */
export function validateBusinessRules(payment_method) {
  const alertBox = document.getElementById("reserva-reglas-alert");
  const confirmBtn = document.getElementById("btn-confirmar-checkout"); // Apuntar al ID genérico

  // Regla 2: Se debe seleccionar un método de pago
  if (!payment_method) {
     alertBox.innerHTML = '<i class="bi bi-info-circle-fill me-2"></i>Por favor, selecciona un método de pago.';
     alertBox.classList.remove('alert-danger');
     alertBox.classList.add('alert-info');
     confirmBtn.disabled = true;
     return false; // Regla fallida
  }

  // Si todo está bien
  alertBox.innerHTML = '<i class="bi bi-info-circle-fill me-2"></i>Todo listo para confirmar.';
  alertBox.classList.remove('alert-danger');
  alertBox.classList.add('alert-info');
  confirmBtn.disabled = false;
  return true; // Válido
}

// --- Función Helper ---
/**
 * Formatea un número al estilo de moneda COP.
 * @param {number} price - El precio a formatear.
 * @returns {string} - El precio formateado (ej. "$50.000").
 */
function formatPrice(price) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

// ===========================================
// === FUNCIONES PARA EL CARRITO DE PRODUCTOS ===
// (Añadidas en nuestro Paso 4)
// ===========================================

/**
 * Renderiza los items del carrito de PRODUCTOS en el contenedor.
 * @param {Array} productItems - El array de 'carritoProductos'.
 * @returns {number} - El subtotal de productos calculado.
 */
export function renderProductCartItems(productItems) {
  const container = document.getElementById("productos-items-container");
  if (!container) {
    console.error("Contenedor UI no encontrado: #productos-items-container");
    return 0;
  }

  container.innerHTML = ""; // Limpiar
  let subtotal = 0;

  if (!productItems || productItems.length === 0) {
    container.innerHTML = '<p class="text-muted">Tu carrito de productos está vacío.</p>';
    // Si no hay productos, deshabilitamos el botón SÓLO SI la pestaña de productos está activa
    if (document.getElementById('productos-tab')?.classList.contains('active')) {
      document.getElementById("btn-confirmar-checkout").disabled = true;
    }
    return 0;
  }

  const list = document.createElement('ul');
  list.className = 'list-group list-group-flush';

  productItems.forEach(item => {
    const itemPrice = parseFloat(item.price);
    const itemQuantity = parseInt(item.quantity);
    if (isNaN(itemPrice) || isNaN(itemQuantity)) return;

    const lineTotal = itemPrice * itemQuantity;
    subtotal += lineTotal;

    const li = document.createElement('li');
    li.className = 'list-group-item d-flex align-items-center';
    li.innerHTML = `
      <div class="flex-grow-1">
        <strong>${item.name}</strong>
        <br>
        <small class="text-muted">${formatPrice(itemPrice)} c/u</small>
      </div>
      <div class="mx-3">
        <input 
          type="number" 
          class="form-control form-control-sm product-quantity-input" 
          value="${itemQuantity}" 
          min="1" 
          max="${item.stock || 99}" 
          data-id="${item.id}" 
          style="width: 70px;"
        >
      </div>
      <div class"fw-bold mx-3" style="min-width: 80px; text-align: right;">
        ${formatPrice(lineTotal)}
      </div>
      <button 
        class="btn btn-outline-danger btn-sm btn-remove-product" 
        data-id="${item.id}" 
        title="Eliminar"
      >
        <i class="bi bi-trash"></i>
      </button>
    `;
    list.appendChild(li);
  });

  container.appendChild(list);
  return subtotal; // Devolvemos el subtotal para los cálculos
}

/**
 * Actualiza los campos de Subtotal y Descuento DENTRO de la pestaña de productos.
 * @param {object} summary - Un objeto con { subtotal, discountAmount }.
 */
export function updateProductTotalsUI(summary) {
  const subtotalEl = document.getElementById("productos-subtotal");
  const discountEl = document.getElementById("productos-descuento");

  if (subtotalEl) {
    subtotalEl.textContent = formatPrice(summary.subtotal);
  }
  if (discountEl) {
    discountEl.textContent = `-${formatPrice(summary.discountAmount)}`;
  }
}

/**
 * Cambia las etiquetas de los métodos de pago según la pestaña activa.
 * @param {string} activeTab - Puede ser 'servicios' o 'productos'.
 */
export function updatePaymentLabels(activeTab) {
  const debitLabel = document.getElementById("payment-debit-label");
  const cashLabel = document.getElementById("payment-cash-label");

  if (activeTab === 'servicios') {
    if (debitLabel) debitLabel.textContent = "Tarjeta de Débito (15% OFF)";
    if (cashLabel) cashLabel.textContent = "Efectivo"; // Como en el HTML original
  } else if (activeTab === 'productos') {
    if (debitLabel) debitLabel.textContent = "Tarjeta de Débito (Sin descuento)";
    if (cashLabel) cashLabel.textContent = "Efectivo (10% OFF)";
  }
}