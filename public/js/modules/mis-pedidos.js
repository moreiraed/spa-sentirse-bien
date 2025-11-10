// public/js/modules/mis-pedidos.js
import { supabase } from "../core/supabase.js";

const CONTAINER_ID = "pedidos-list-container"; 
let modulePedidos = [];
let pedidoModal = null;

/**
 * Función principal llamada por el Router
 */
export function initMisPedidosPage() {
  console.log("Inicializando página Mis Pedidos (v4 - Totales Abajo)");

  const modalEl = document.getElementById('pedidoDetalleModal');
  if (modalEl) {
    pedidoModal = new bootstrap.Modal(modalEl);
  }

  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadMisPedidos);
  }

  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    container.addEventListener('click', (e) => {
      const detalleBtn = e.target.closest('.btn-ver-detalles');
      if (detalleBtn) {
        const pedidoId = detalleBtn.dataset.pedidoId;
        showPedidoModal(pedidoId);
      }
    });
  }

  loadMisPedidos();
}

/**
 * Orquestador: Carga los pedidos y maneja los estados de UI
 */
async function loadMisPedidos() {
  try {
    showLoadingState();
    const pedidos = await fetchMisPedidos();
    modulePedidos = pedidos; 

    if (pedidos.length === 0) {
      showEmptyState();
    } else {
      renderPedidos(pedidos);
    }
  } catch (error) {
    console.error("Error cargando mis pedidos:", error);
    showErrorState(error.message);
  }
}

/**
 * API: Busca en Supabase los pedidos del usuario
 * (MODIFICADO: Pide 'subtotal')
 */
async function fetchMisPedidos() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Usuario no autenticado.");
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      created_at,
      subtotal,           
      discount_applied, 
      total_price,
      payment_method, 
      status,  
      booking_products (
        quantity,
        price_at_purchase,
        products (
          name,
          image_url
        )
      )
    `)
    .eq('user_id', user.id)
    .is('appointment_datetime', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching orders:", error);
    throw new Error("No se pudieron cargar los pedidos.");
  }
  return data;
}

// --- FUNCIONES DE RENDERIZADO (Lista) ---

function renderPedidos(pedidos) {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  container.innerHTML = `
    <ul class="list-group list-group-flush">
      ${pedidos.map(renderPedidoRow).join("")}
    </ul>
  `;
}

function renderPedidoRow(pedido) {
  const fechaPedido = new Date(pedido.created_at).toLocaleDateString();
  const totalPedido = formatPrice(pedido.total_price);
  const estado = pedido.status || 'Pendiente'; 

  return `
    <li class="list-group-item d-flex justify-content-between align-items-center flex-wrap">
      <div class="me-3 mb-2 mb-md-0">
        <strong class="d-block">Pedido #${pedido.id}</strong>
        <small class="text-muted">Fecha: ${fechaPedido}</small>
      </div>
      <div class="me-3 mb-2 mb-md-0">
        <span class="badge ${getEstadoBadgeClass(estado)}">${estado}</span>
      </div>
      <div class="me-3 mb-2 mb-md-0">
        <strong>Total: ${totalPedido}</strong>
      </div>
      <div>
        <button class="btn btn-outline-primary btn-sm btn-ver-detalles" data-pedido-id="${pedido.id}">
          <i class="bi bi-eye me-1"></i> Ver Detalles
        </button>
      </div>
    </li>
  `;
}

// --- FUNCIÓN DEL MODAL (MODIFICADA) ---

function showPedidoModal(pedidoId) {
  const pedido = modulePedidos.find(p => p.id.toString() === pedidoId);
  if (!pedido) {
    console.error("No se encontró el pedido con ID:", pedidoId);
    return;
  }

  // Rellenar campos de Info General (arriba)
  document.getElementById('pedidoDetalleModalLabel').textContent = `Detalles del Pedido #${pedido.id}`;
  document.getElementById('modal-fecha').textContent = new Date(pedido.created_at).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' });
  document.getElementById('modal-pago').textContent = formatPaymentMethod(pedido.payment_method);
  
  const estadoBadge = document.getElementById('modal-estado');
  const estado = pedido.status || 'Pendiente';
  estadoBadge.textContent = estado;
  estadoBadge.className = `badge ${getEstadoBadgeClass(estado)}`;

  // Rellenar la lista de productos
  const listaProductosEl = document.getElementById('modal-productos-lista');
  listaProductosEl.innerHTML = pedido.booking_products.map(renderProductoDetalleModal).join("");

  // --- RELLENAR CAMPOS DE TOTALES (abajo) ---
  document.getElementById('modal-subtotal').textContent = formatPrice(pedido.subtotal || 0);
  document.getElementById('modal-descuento').textContent = `-${formatPrice(pedido.discount_applied || 0)}`;
  document.getElementById('modal-total').textContent = formatPrice(pedido.total_price || 0);
  // --- FIN ---

  if (pedidoModal) {
    pedidoModal.show();
  }
}

function renderProductoDetalleModal(item) {
  const producto = item.products;
  const imageUrl = producto.image_url || './assets/img/default-service.webp';
  
  return `
    <li class="list-group-item d-flex align-items-center">
      <img src="${imageUrl}" alt="${producto.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" class="me-3">
      <div class="flex-grow-1">
        <strong>${producto.name}</strong>
        <br>
        <small class="text-muted">
          Cantidad: ${item.quantity} x ${formatPrice(item.price_at_purchase)}
        </small>
      </div>
      <strong class="ms-3">${formatPrice(item.quantity * item.price_at_purchase)}</strong>
    </li>
  `;
}


// --- FUNCIONES DE ESTADO (sin cambios) ---

function showLoadingState() {
  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    container.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="mt-2 text-muted">Cargando tus pedidos...</p>
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
        <h4 class="mt-3 text-muted">No tienes pedidos</h4>
        <p class="text-muted">Los productos que compres aparecerán aquí.</p>
        <a href="#productos" class="btn btn-primary mt-3">
          <i class="bi bi-bag me-2"></i>Ir a Productos
        </a>
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
    container.querySelector("#retryBtn")?.addEventListener("click", loadMisPedidos);
  }
}

// --- FUNCIONES HELPER ---

function getEstadoBadgeClass(estado) {
  const estados = {
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
    'debit_card': 'Tarjeta de Débito',
    'cash': 'Efectivo',
    'product_purchase': 'N/A'
  };
  return methods[method] || method;
}