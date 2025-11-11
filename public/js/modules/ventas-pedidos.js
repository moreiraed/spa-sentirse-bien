import { supabase } from "../core/supabase.js";

const CONTAINER_ID = "pedidos-list-container";
let modulePedidos = [];
let pedidoModal = null;

/**
 * Función principal para la vista de ventas
 */
export function initVentasPedidosPage() {
  console.log("Inicializando página Ventas - Pedidos");

  const modalEl = document.getElementById("pedidoDetalleModal");
  if (modalEl) {
    pedidoModal = new bootstrap.Modal(modalEl);
  }

  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadTodosLosPedidos);
  }

  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    container.addEventListener("click", (e) => {
      const detalleBtn = e.target.closest(".btn-ver-detalles");
      if (detalleBtn) {
        const pedidoId = detalleBtn.dataset.pedidoId;
        showPedidoModal(pedidoId);
      }

      const procesarPagoBtn = e.target.closest(".btn-procesar-pago");
      if (procesarPagoBtn) {
        const pedidoId = procesarPagoBtn.dataset.pedidoId;
        procesarPagoEfectivo(pedidoId);
      }
    });
  }

  loadTodosLosPedidos();
}

/**
 * Carga todos los pedidos de todos los usuarios
 */
async function loadTodosLosPedidos() {
  try {
    showLoadingState();
    const pedidos = await fetchTodosLosPedidos();
    modulePedidos = pedidos;

    if (pedidos.length === 0) {
      showEmptyState();
    } else {
      renderPedidosVentas(pedidos);
    }
  } catch (error) {
    console.error("Error cargando pedidos:", error);
    showErrorState(error.message);
  }
}

/**
 * API: Busca en Supabase TODOS los pedidos
 */
async function fetchTodosLosPedidos() {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      created_at,
      subtotal,
      discount_applied,
      total_price,
      payment_method,
      status,
      user_id,
      profiles:user_id(nombre, apellido, email),
      booking_products (
        quantity,
        price_at_purchase,
        products (
          name,
          image_url
        )
      )
    `
    )
    .is("appointment_datetime", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all orders:", error);
    throw new Error("No se pudieron cargar los pedidos.");
  }
  return data;
}

/**
 * Renderiza la lista de pedidos para ventas
 */
function renderPedidosVentas(pedidos) {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Fecha</th>
            <th>Total</th>
            <th>Método Pago</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${pedidos.map(renderPedidoRowVentas).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderPedidoRowVentas(pedido) {
  const fechaPedido = new Date(pedido.created_at).toLocaleDateString();
  const totalPedido = formatPrice(pedido.total_price);
  const estado = pedido.status || "Pendiente";

  // Obtener nombre del cliente
  const cliente = pedido.profiles
    ? `${pedido.profiles.nombre || ""} ${
        pedido.profiles.apellido || ""
      }`.trim() ||
      pedido.profiles.email ||
      `Usuario ${pedido.user_id.substring(0, 8)}`
    : `Usuario ${pedido.user_id.substring(0, 8)}`;

  // Determinar si el botón debe estar habilitado o deshabilitado
  const puedeProcesar =
    pedido.payment_method === "cash" &&
    pedido.status !== "confirmed" &&
    pedido.status !== "paid";

  const botonClase = puedeProcesar ? "btn-success" : "btn-secondary";
  const botonDisabled = puedeProcesar ? "" : "disabled";
  const botonTitle = puedeProcesar ? "Marcar como pagado" : "Pago ya procesado";

  const botonProcesarPago = `
    <button class="btn ${botonClase} btn-sm btn-procesar-pago" 
            data-pedido-id="${pedido.id}" 
            ${botonDisabled}
            title="${botonTitle}">
      <i class="bi bi-cash-coin me-1"></i> Procesar Pago
    </button>
  `;

  return `
    <tr>
      <td><strong>#${pedido.id}</strong></td>
      <td>${cliente}</td>
      <td>${fechaPedido}</td>
      <td>${totalPedido}</td>
      <td>${formatPaymentMethod(pedido.payment_method)}</td>
      <td><span class="badge ${getEstadoBadgeClass(
        estado
      )}">${estado}</span></td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary btn-ver-detalles" data-pedido-id="${
            pedido.id
          }" title="Ver detalles">
            <i class="bi bi-eye"></i>
          </button>
          ${botonProcesarPago}
        </div>
      </td>
    </tr>
  `;
}

/**
 * Procesa el pago en efectivo de un pedido
 */
async function procesarPagoEfectivo(pedidoId) {
  // Verificar nuevamente antes de procesar
  const pedido = modulePedidos.find((p) => p.id.toString() === pedidoId);
  if (!pedido) {
    showToast("No se encontró el pedido", "danger");
    return;
  }

  if (pedido.status === "confirmed" || pedido.status === "paid") {
    showToast("Este pedido ya fue procesado", "warning");
    return;
  }

  if (pedido.payment_method !== "cash") {
    showToast("Solo se pueden procesar pagos en efectivo", "warning");
    return;
  }

  if (
    !confirm(
      '¿Confirmar que se recibió el pago en efectivo? Esta acción cambiará el estado del pedido a "Pagado".'
    )
  ) {
    return;
  }

  try {
    console.log("Procesando pago para pedido:", pedidoId);
    console.log("Datos del pedido:", {
      id: pedidoId,
      payment_method: pedido.payment_method,
      current_status: pedido.status,
    });

    // Primero intentemos con una actualización más simple
    const updateData = {
      status: "paid",
      updated_at: new Date().toISOString(),
    };

    console.log("Enviando update:", updateData);

    const { data, error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", pedidoId)
      .select(); // Agregar .select() para ver la respuesta

    if (error) {
      console.error("Error de Supabase:", error);
      throw error;
    }

    console.log("Update exitoso:", data);

    showToast(
      'Pago procesado correctamente. El pedido ahora está marcado como "Pagado".',
      "success"
    );

    // Recargar la lista
    loadTodosLosPedidos();

    // Cerrar modal si está abierto
    if (pedidoModal) {
      pedidoModal.hide();
    }
  } catch (error) {
    console.error("Error completo procesando pago:", error);

    // Mostrar mensaje más específico
    if (error.message) {
      showToast(`Error: ${error.message}`, "danger");
    } else if (error.code) {
      showToast(
        `Error ${error.code}: No se pudo procesar el pago`,
        "danger"
      );
    } else {
      showToast("Error desconocido al procesar el pago", "danger");
    }
  }
}

/**
 * Modal de detalles (similar al original pero con info de cliente)
 */
function showPedidoModal(pedidoId) {
  const pedido = modulePedidos.find((p) => p.id.toString() === pedidoId);
  if (!pedido) {
    console.error("No se encontró el pedido con ID:", pedidoId);
    return;
  }

  // Información del cliente
  const cliente = pedido.profiles
    ? `${pedido.profiles.nombre || ""} ${
        pedido.profiles.apellido || ""
      }`.trim() ||
      pedido.profiles.email ||
      `Usuario ${pedido.user_id.substring(0, 8)}`
    : `Usuario ${pedido.user_id.substring(0, 8)}`;

  // Rellenar campos del modal
  document.getElementById(
    "pedidoDetalleModalLabel"
  ).textContent = `Detalles del Pedido #${pedido.id}`;
  document.getElementById("modal-fecha").textContent = new Date(
    pedido.created_at
  ).toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" });
  document.getElementById("modal-pago").textContent = formatPaymentMethod(
    pedido.payment_method
  );

  // Agregar información del cliente si no existe
  const modalBody = document.querySelector("#pedidoDetalleModal .modal-body");
  let clienteInfo = modalBody.querySelector("#modal-cliente");
  if (!clienteInfo) {
    const fechaElement = document.getElementById("modal-fecha").parentElement;
    clienteInfo = document.createElement("p");
    clienteInfo.innerHTML =
      '<strong>Cliente:</strong> <span id="modal-cliente">--</span>';
    fechaElement.parentNode.insertBefore(clienteInfo, fechaElement.nextSibling);
  }
  document.getElementById("modal-cliente").textContent = cliente;

  // Estado
  const estadoBadge = document.getElementById("modal-estado");
  const estado = pedido.status || "Pendiente";
  estadoBadge.textContent = estado;
  estadoBadge.className = `badge ${getEstadoBadgeClass(estado)}`;

  // --- Botón de Procesar Pago ---
  const modalFooter = document.querySelector(
    "#pedidoDetalleModal .modal-footer"
  );
  let procesarPagoBtnModal = modalFooter.querySelector(
    ".btn-procesar-pago-modal"
  );

  const puedeProcesarModal =
    pedido.payment_method === "cash" &&
    pedido.status !== "confirmed" &&
    pedido.status !== "paid";

  if (!procesarPagoBtnModal) {
    procesarPagoBtnModal = document.createElement("button");
    procesarPagoBtnModal.className = "btn btn-success btn-procesar-pago-modal";
    procesarPagoBtnModal.innerHTML =
      '<i class="bi bi-cash-coin me-1"></i> Procesar Pago';
    procesarPagoBtnModal.onclick = () => procesarPagoEfectivo(pedidoId);
    modalFooter.insertBefore(procesarPagoBtnModal, modalFooter.firstChild);
  }

  if (puedeProcesarModal) {
    procesarPagoBtnModal.className = "btn btn-success btn-procesar-pago-modal";
    procesarPagoBtnModal.disabled = false;
    procesarPagoBtnModal.title = "Marcar como pagado";
    procesarPagoBtnModal.style.display = "inline-block";
  } else {
    procesarPagoBtnModal.className =
      "btn btn-secondary btn-procesar-pago-modal";
    procesarPagoBtnModal.disabled = true;
    procesarPagoBtnModal.title = "Pago ya procesado";
    procesarPagoBtnModal.style.display = "inline-block";
  }

  // --- Lista de productos ---
  const listaProductosEl = document.getElementById("modal-productos-lista");
  listaProductosEl.innerHTML = pedido.booking_products
    .map(renderProductoDetalleModal)
    .join("");

  // --- Totales ---
  document.getElementById("modal-subtotal").textContent = formatPrice(
    pedido.subtotal || 0
  );
  document.getElementById("modal-descuento").textContent = `-${formatPrice(
    pedido.discount_applied || 0
  )}`;
  document.getElementById("modal-total").textContent = formatPrice(
    pedido.total_price || 0
  );

  // Mostrar modal
  if (pedidoModal) {
    pedidoModal.show();
  }
}

function renderProductoDetalleModal(item) {
  const producto = item.products;
  const imageUrl = producto.image_url || "./assets/img/default-service.webp";

  return `
    <li class="list-group-item d-flex align-items-center">
      <img src="${imageUrl}" alt="${
    producto.name
  }" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" class="me-3">
      <div class="flex-grow-1">
        <strong>${producto.name}</strong>
        <br>
        <small class="text-muted">
          Cantidad: ${item.quantity} x ${formatPrice(item.price_at_purchase)}
        </small>
      </div>
      <strong class="ms-3">${formatPrice(
        item.quantity * item.price_at_purchase
      )}</strong>
    </li>
  `;
}

function showLoadingState() {
  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    container.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="mt-2 text-muted">Cargando pedidos...</p>
      </div>
    `;
  }
}

function showEmptyState() {
  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-cart-x display-1 text-muted"></i>
        <h4 class="mt-3 text-muted">No hay pedidos</h4>
        <p class="text-muted">Los pedidos de los clientes aparecerán aquí.</p>
      </div>
    `;
  }
}

function showErrorState(message) {
  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-exclamation-triangle display-1 text-danger"></i>
        <h4 class="mt-3 text-danger">Error al cargar pedidos</h4>
        <p class="text-muted">${message || "Intenta nuevamente más tarde."}</p>
        <button class="btn btn-outline-primary mt-3" id="retryBtn">
          <i class="bi bi-arrow-clockwise me-2"></i>Reintentar
        </button>
      </div>
    `;
    container
      .querySelector("#retryBtn")
      ?.addEventListener("click", loadTodosLosPedidos);
  }
}

function getEstadoBadgeClass(estado) {
  const estados = {
    paid: "bg-success",
    confirmed: "bg-success",
    delivered: "bg-success",
    shipped: "bg-warning",
    processing: "bg-info",
    cancelled: "bg-danger",
    pending: "bg-secondary",
  };
  return estados[estado.toLowerCase()] || "bg-dark";
}

function formatPrice(price) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatPaymentMethod(method) {
  const methods = {
    debit_card: "Tarjeta de Débito",
    cash: "Efectivo",
    product_purchase: "Compra Producto",
  };
  return methods[method] || method;
}

function showToast(message, type = "info") {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    // Fallback si showToast no está disponible globalmente
    console.log(`[${type.toUpperCase()}] ${message}`);
    alert(message); // Fallback básico
  }
}
