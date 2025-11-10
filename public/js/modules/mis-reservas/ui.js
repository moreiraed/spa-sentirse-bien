// public/js/modules/mis-reservas/ui.js

/**
 * Muestra el spinner de carga.
 */
export function showLoader(show = true) {
  const loader = document.getElementById("reservas-loader");
  if (loader) loader.style.display = show ? "block" : "none";
}

/**
 * Muestra el mensaje de "vacío" o de "error".
 */
export function showMessage(message) {
  const emptyMsg = document.getElementById("reservas-empty-msg");
  if (emptyMsg) {
    emptyMsg.style.display = "block";
    emptyMsg.querySelector(".alert").textContent = message;
  }
}

/**
 * Renderiza la lista de reservas en el contenedor.
 * (Esta función no cambia, es correcta como estaba)
 */
export function renderBookings(bookings, container) {
  const template = document.getElementById("reserva-card-template");
  if (!template) {
    console.error("Template de tarjeta de reserva no encontrado.");
    return;
  }

  container.innerHTML = ""; // Limpiar contenedor

  bookings.forEach((booking) => {
    const clone = template.content.cloneNode(true);
    const now = new Date();
    const appointmentTime = new Date(booking.appointment_datetime);
    const hoursRemaining = (appointmentTime - now) / 3600000;

    // Rellenar datos
    clone.querySelector('[data-id="booking-id"]').textContent = booking.id;
    clone.querySelector('[data-id="booking-date"]').textContent =
      formatAppointmentDate(booking.appointment_datetime);
    clone.querySelector('[data-id="booking-total"]').textContent = formatPrice(
      booking.subtotal
    );
    clone.querySelector('[data-id="booking-payment-method"]').textContent =
      formatPaymentMethod(booking.payment_method);

    const paymentBadge = clone.querySelector(
      '[data-id="booking-payment-status"]'
    );
    const payButton = clone.querySelector('[data-id="btn-pay-now"]');

    // ===================================================
    // ¡ESTE ES EL BLOQUE DE LÓGICA COMPLETO!
    // ===================================================
    if (booking.payment_status === "paid") {
      paymentBadge.textContent = "Pagado";
      paymentBadge.classList.add("bg-success");
      // Mostrar el precio final que se pagó (con descuento si aplicó)
      clone.querySelector('[data-id="booking-total"]').textContent =
        formatPrice(booking.total_price);
    } else if (booking.payment_method === "cash") {
      paymentBadge.textContent = "Pendiente (en sucursal)";
      paymentBadge.classList.add("bg-info");
    } else if (booking.payment_method === "debit_card") {
      // REGLA 2: Límite de 24hs para pagar
      if (hoursRemaining <= 24) {
        paymentBadge.textContent = "Pago Vencido";
        paymentBadge.classList.add("bg-danger");
      } else {
        paymentBadge.textContent = "Pendiente de Pago";
        paymentBadge.classList.add("bg-warning");
        // Mostrar el botón
        payButton.style.display = "block";
        payButton.setAttribute("data-booking-id", booking.id);
      }
    }
    // ===================================================

    // Rellenar Items (servicios)
    const itemsList = clone.querySelector('[data-id="items-list"]');
    booking.booking_items.forEach((item) => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between";

      // Lógica para mostrar profesional
      const title = item.services ? item.services.title : "Servicio eliminado";
      let profName = "Profesional no asignado";
      if (item.professionals && item.professionals.users) {
        profName = `${item.professionals.users.nombre} ${
          item.professionals.users.apellido || ""
        }`;
      }

      li.innerHTML = `
        <span class="d-flex flex-column">
          <span>${title}</span>
          <small class="text-muted">con: ${profName}</small>
        </span>
        <strong>${formatPrice(item.price_at_purchase)}</strong>
      `;
      itemsList.appendChild(li);
    });

    container.appendChild(clone);
  });
}

// ===============================================
// --- SECCIÓN DE MODAL DE PAGO (MODIFICADA) ---
// ===============================================

/**
 * MODIFICADO: Rellena y muestra el modal de simulación de pago.
 * @param {object} modalInstance - La instancia del modal de Bootstrap.
 * @param {object} priceDetails - Un objeto con { subtotal, discountAmount, priceToPay }.
 */
export function showPaymentModal(modalInstance, priceDetails) {
  // Rellenar el desglose de precios
  document.getElementById("modal-subtotal").textContent = formatPrice(
    priceDetails.subtotal
  );
  document.getElementById("modal-discount").textContent = `-${formatPrice(
    priceDetails.discountAmount
  )}`;
  document.getElementById("modal-total-amount").textContent = formatPrice(
    priceDetails.priceToPay
  );

  // Asegurarse de que el modal esté en el estado inicial (formulario)
  document.getElementById("payment-form").style.display = "block";
  document.getElementById("payment-loader").style.display = "none";
  document.getElementById("payment-success").style.display = "none";

  document.getElementById("footer-pay-view").style.display = "block";
  document.getElementById("footer-success-view").style.display = "none";

  if (modalInstance) {
    modalInstance.show();
  }
}

/**
 * MODIFICADO: Muestra el loader DENTRO del modal de pago.
 */
export function showModalLoader(modalInstance) {
  document.getElementById("payment-form").style.display = "none";
  document.getElementById("payment-loader").style.display = "block";
  document.getElementById("payment-success").style.display = "none";

  // Ocultar los botones de "Pagar"
  document.getElementById("footer-pay-view").style.display = "none";
}

/**
 * NUEVA: Muestra la vista de Éxito y el Comprobante.
 */
export function showPaymentSuccess(booking, priceDetails) {
  // ... (código para ocultar loader y mostrar 'payment-success')
  document.getElementById("payment-form").style.display = "none";
  document.getElementById("payment-loader").style.display = "none";
  document.getElementById("payment-success").style.display = "block";
  document.getElementById("footer-pay-view").style.display = "none";
  document.getElementById("footer-success-view").style.display = "block";

  // --- MODIFICACIÓN: Generar el HTML del comprobante ---
  const receiptContainer = document.getElementById("receipt-content");
  receiptContainer.innerHTML = `
    <p><strong>Reserva #:</strong> ${booking.id}</p>
    <p><strong>Fecha del Turno:</strong> ${formatAppointmentDate(
      booking.appointment_datetime
    )}</p>
    <hr>
    <p><strong>Detalle:</strong></p>
    <ul class="list-unstyled">
      ${booking.booking_items
        .map((item) => {
          // 1. Obtener el título del servicio
          const title = item.services ? item.services.title : "Servicio";

          // 2. OBTENER EL NOMBRE DEL PROFESIONAL (Lógica actualizada)
          let profName = "Profesional no asignado";
          if (item.professionals && item.professionals.users) {
            profName = `${item.professionals.users.nombre} ${
              item.professionals.users.apellido || ""
            }`.trim();
          }

          // 3. Renderizar el HTML
          return `
          <li class="d-flex justify-content-between mb-2">
            <span class="d-flex flex-column">
              <span>${title}</span>
              <small class="text-muted">con: ${profName}</small>
            </span>
            <span>${formatPrice(item.price_at_purchase)}</span>
          </li>
        `;
        })
        .join("")}
    </ul>
    <hr>
    <div class="d-flex justify-content-between">
      <span>Subtotal:</span>
      <span>${formatPrice(priceDetails.subtotal)}</span>
    </div>
    <div class="d-flex justify-content-between text-success">
      <span>Ahorro:</span>
      <span>-${formatPrice(priceDetails.discountAmount)}</span>
    </div>
    <div class="d-flex justify-content-between fw-bold mt-2">
      <span>Total Pagado:</span>
      <span>${formatPrice(priceDetails.priceToPay)}</span>
    </div>
  `;
}

/**
 * (Sin cambios) Oculta el modal de pago.
 */
export function hidePaymentModal(modalInstance) {
  if (modalInstance) {
    modalInstance.hide();
  }
}

// --- Funciones Helper de Formato ---

export function formatPrice(price) {
  if (price === null || price === undefined) return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatPaymentMethod(method) {
  if (method === "debit_card") return "Tarjeta de Débito";
  if (method === "cash") return "Efectivo";
  return "No especificado";
}

function formatAppointmentDate(dateTimeString) {
  if (!dateTimeString) return "Fecha no definida";
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  return new Date(dateTimeString).toLocaleString("es-AR", options);
}

export function showSafeToast(message, type = "info") {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    alert(message);
  }
}
