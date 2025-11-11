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
 * --- ¡MODIFICADO! ---
 * @returns {{delivery_method: st * (CORREGIDO: Busca los inputs en su nueva ubicación global)
 * @returns {{delivery_method: string, payment_method: string}}
 */
export function getFormValues() {
  const delivery_method = document.querySelector(
    'input[name="delivery"]:checked'
  )?.value;

  // El input de 'payment' ahora está en el wrapper de la columna derecha
  const payment_method = document.querySelector(
    '#payment-options-wrapper input[name="payment"]:checked'
  )?.value;

  // Busca en todo el documento, no solo en un contenedor específico
  const selected_card = document.querySelector(
    'input[name="saved_card"]:checked'
  );
  const selected_card_id = selected_card?.value;

  return { delivery_method, payment_method, selected_card_id };
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

/**
 * Muestra u oculta el contenedor de selección de tarjeta.
 * @param {boolean} show - True para mostrar, false para ocultar.
 */
export function toggleCardSelectionUI(show) {
  const container = document.getElementById("card-selection-ui");
  if (container) {
    container.style.display = show ? "block" : "none";
  }
}

/**
 * Renderiza la lista de tarjetas guardadas como radio buttons.
 * @param {Array} cards - El array de tarjetas desde la API.
 * @param {string} paymentMethod - El método de pago seleccionado ('debit_card' o 'credit_card').
 */
export function renderSavedCards(cards, paymentMethod = null) {
  const container = document.getElementById("saved-cards-container");
  if (!container) return;

  // FILTRAR tarjetas por tipo si se especifica
  let filteredCards = cards;
  if (paymentMethod && cards) {
    const targetType = paymentMethod === "debit_card" ? "debito" : "credito"; // <-- SIN ACENTO
    filteredCards = cards.filter(
      (card) => card.tipo && card.tipo.toLowerCase() === targetType
    );
  }

  if (!filteredCards || filteredCards.length === 0) {
    container.innerHTML = `
      <p class="text-muted small">No tienes tarjetas de ${
        paymentMethod === "debit_card" ? "débito" : "crédito"
      } guardadas.</p>
    <button class="btn btn-sm btn-outline-primary w-100" id="add-new-card-btn">
      <i class="bi bi-plus-circle me-2"></i>Agregar una nueva tarjeta
    </button>`;

    // AGREGAR EL LISTENER PARA EL BOTÓN
    const addCardBtn = document.getElementById("add-new-card-btn");
    if (addCardBtn) {
      addCardBtn.addEventListener("click", () => {
        showNewCardForm();
      });
    }
    return;
  }

  // Generar HTML para cada tarjeta FILTRADA
  container.innerHTML = filteredCards
    .map(
      (card, index) => `
    <div class="form-check card-select-option mb-2">
      <input 
        class="form-check-input" 
        type="radio" 
        name="saved_card" 
        id="card-${card.id}" 
        value="${card.id}"
        ${index === 0 ? "checked" : ""} 
      >
      <label class="form-check-label w-100" for="card-${card.id}">
        <i class="bi ${getCardIcon(card.marca)} me-2"></i>
        <strong>${
          card.marca.charAt(0).toUpperCase() + card.marca.slice(1)
        }</strong> 
        <span class="badge bg-secondary ms-1">${card.tipo || "crédito"}</span>
        <br>
        <span class="text-muted small">Termina en ${card.ultimos4} • ${
        card.titular
      }</span>
      </label>
    </div>
  `
    )
    .join("");

  // Añadir la opción de "Usar otra tarjeta"
  container.innerHTML += `
    <div class="form-check card-select-option-new mt-2">
      <input class="form-check-input" type="radio" name="saved_card" id="card-new" value="new">
      <label class="form-check-label" for="card-new">
        <i class="bi bi-plus-circle me-2"></i>Usar una tarjeta nueva
      </label>
    </div>`;

  // Agregar listener para la opción "nueva tarjeta"
  const newCardOption = document.getElementById("card-new");
  if (newCardOption) {
    newCardOption.addEventListener("change", function () {
      if (this.checked) {
        showNewCardForm();
      }
    });
  }
}

/**
 * Muestra el formulario para agregar una nueva tarjeta
 */
export function showNewCardForm() {
  const container = document.getElementById("saved-cards-container");
  const newCardForm = document.getElementById("new-card-form-container");
  
  if (!container || !newCardForm) return;
  
  // Ocultar la selección de tarjetas y mostrar el formulario
  container.style.display = 'none';
  newCardForm.style.display = 'block';
  
  // Aquí puedes inicializar el formulario de tarjeta
  // Por ejemplo, integrar con Stripe Elements o un formulario personalizado
  newCardForm.innerHTML = `
    <div class="card-form">
      <h6 class="mb-3">Agregar Nueva Tarjeta</h6>
      
      <div class="mb-3">
        <label class="form-label small">Nombre del Titular</label>
        <input type="text" class="form-control" id="card-holder-name" placeholder="Como aparece en la tarjeta">
      </div>
      
      <div class="mb-3">
        <label class="form-label small">Número de Tarjeta</label>
        <input type="text" class="form-control" id="card-number" placeholder="1234 5678 9012 3456" maxlength="19">
      </div>
      
      <div class="row">
        <div class="col-6">
          <label class="form-label small">Fecha Exp.</label>
          <input type="text" class="form-control" id="card-expiry" placeholder="MM/AA" maxlength="5">
        </div>
        <div class="col-6">
          <label class="form-label small">CVV</label>
          <input type="text" class="form-control" id="card-cvv" placeholder="123" maxlength="4">
        </div>
      </div>
      
      <div class="form-check mt-3">
        <input class="form-check-input" type="checkbox" id="save-card-checkbox" checked>
        <label class="form-check-label small" for="save-card-checkbox">
          Guardar esta tarjeta para futuras compras
        </label>
      </div>
      
      <div class="d-flex gap-2 mt-4">
        <button type="button" class="btn btn-secondary btn-sm" id="cancel-card-btn">
          Cancelar
        </button>
        <button type="button" class="btn btn-primary btn-sm" id="save-card-btn">
          Guardar Tarjeta
        </button>
      </div>
    </div>
  `;
  
  // Agregar listeners para los botones del formulario
  document.getElementById('cancel-card-btn').addEventListener('click', () => {
    container.style.display = 'block';
    newCardForm.style.display = 'none';
    newCardForm.innerHTML = '';
  });
  
  document.getElementById('save-card-btn').addEventListener('click', handleSaveNewCard);
  
  // Formateadores automáticos para los inputs
  setupCardInputFormatters();
}

/**
 * Configura formateadores para los inputs de tarjeta
 */
function setupCardInputFormatters() {
  const cardNumber = document.getElementById('card-number');
  const cardExpiry = document.getElementById('card-expiry');
  
  if (cardNumber) {
    cardNumber.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
      let formattedValue = '';
      
      for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) formattedValue += ' ';
        formattedValue += value[i];
      }
      
      e.target.value = formattedValue;
    });
  }
  
  if (cardExpiry) {
    cardExpiry.addEventListener('input', function(e) {
      let value = e.target.value.replace(/[^0-9]/g, '');
      if (value.length >= 2) {
        e.target.value = value.substring(0, 2) + '/' + value.substring(2, 4);
      }
    });
  }
}

/**
 * Maneja el guardado de una nueva tarjeta
 */
async function handleSaveNewCard() {
  const saveBtn = document.getElementById('save-card-btn');
  const holderName = document.getElementById('card-holder-name')?.value;
  const cardNumber = document.getElementById('card-number')?.value;
  const cardExpiry = document.getElementById('card-expiry')?.value;
  const cardCvv = document.getElementById('card-cvv')?.value;
  const saveCard = document.getElementById('save-card-checkbox')?.checked;
  
  // Validación básica
  if (!holderName || !cardNumber || !cardExpiry || !cardCvv) {
    showSafeToast('Por favor completa todos los campos', 'warning');
    return;
  }
  
  // Extraer últimos 4 dígitos
  const lastFour = cardNumber.replace(/\s/g, '').slice(-4);
  
  // Determinar marca de tarjeta (simplificado)
  const cardBrand = determineCardBrand(cardNumber);
  
  try {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Guardando...';
    
    // Aquí iría la lógica para guardar la tarjeta en tu backend
    // Por ahora simulamos que se guardó exitosamente
    
    showSafeToast('Tarjeta guardada exitosamente', 'success');
    
    // Cerrar formulario y recargar tarjetas
    const container = document.getElementById("saved-cards-container");
    const newCardForm = document.getElementById("new-card-form-container");
    
    container.style.display = 'block';
    newCardForm.style.display = 'none';
    newCardForm.innerHTML = '';
    
    // Recargar la lista de tarjetas
    if (window.currentUser) {
      const cards = await api.getSavedCards(window.currentUser.id);
      renderSavedCards(cards);
    }
    
  } catch (error) {
    console.error('Error guardando tarjeta:', error);
    showSafeToast('Error al guardar la tarjeta', 'danger');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Guardar Tarjeta';
  }
}

/**
 * Determina la marca de la tarjeta basado en el número
 */
function determineCardBrand(cardNumber) {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  
  if (/^4/.test(cleanNumber)) return 'visa';
  if (/^5[1-5]/.test(cleanNumber)) return 'mastercard';
  if (/^3[47]/.test(cleanNumber)) return 'amex';
  if (/^6(?:011|5)/.test(cleanNumber)) return 'discover';
  
  return 'unknown';
}

function showSafeToast(message, type = "info") {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    alert(message);
  }
}

function getCardIcon(marca) {
  switch (marca.toLowerCase()) {
    case 'visa':
      return 'bi-credit-card-2-front-fill';
    case 'mastercard':
      return 'bi-credit-card-fill';
    default:
      return 'bi-credit-card';
  }
}