// public/js/modules/mis-pedidos.js
import { supabase } from "../core/supabase.js";

// El ID del contenedor principal en tu mis-pedidos.html
const CONTAINER_ID = "productos-container";

/**
 * Función principal llamada por el Router
 */
export function initMisPedidosPage() {
  console.log("Inicializando página Mis Pedidos");

  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadMisPedidos);
  }

  // Carga inicial
  loadMisPedidos();
}

/**
 * Orquestador: Carga los pedidos y maneja los estados de UI
 */
async function loadMisPedidos() {
  try {
    showLoadingState();

    const pedidos = await fetchMisPedidos();

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
 * (Solo donde appointment_datetime ES NULL)
 */
async function fetchMisPedidos() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Usuario no autenticado.");
  }

  const { data, error } = await supabase
    .from('bookings') // La tabla de "recibos"
    .select(`
      id,
      created_at,
      total_price,
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
    .is('appointment_datetime', null) // <-- ¡EL FILTRO CLAVE!
    .order('created_at', { ascending: false }); // Los más nuevos primero

  if (error) {
    console.error("Error fetching orders:", error);
    throw new Error("No se pudieron cargar los pedidos.");
  }
  return data;
}

// --- FUNCIONES DE RENDERIZADO ---

function renderPedidos(pedidos) {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  // Usamos un Acordeón de Bootstrap para los pedidos
  container.innerHTML = `
    <div class="col-12">
      <div class="accordion" id="pedidosAccordion">
        ${pedidos.map((pedido, index) => renderPedidoCard(pedido, index)).join("")}
      </div>
    </div>
  `;
}

function renderPedidoCard(pedido, index) {
  const fechaPedido = new Date(pedido.created_at).toLocaleDateString();
  const totalPedido = formatPrice(pedido.total_price);
  
  // (V2) Esto usará 'status' para "Procesando", "Enviado", etc.
  // Por ahora, usamos el 'status' o un texto por defecto.
  const estado = pedido.status || 'Pendiente'; 

  return `
    <div class="accordion-item">
      <h2 class="accordion-header" id="heading-${pedido.id}">
        <button 
          class="accordion-button ${index > 0 ? 'collapsed' : ''}" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#collapse-${pedido.id}" 
          aria-expanded="${index === 0 ? 'true' : 'false'}" 
          aria-controls="collapse-${pedido.id}"
        >
          <div class="d-flex justify-content-between w-100 me-3">
            <span><strong>Pedido #${pedido.id}</strong></span>
            <span class="d-none d-md-block">Fecha: ${fechaPedido}</span>
            <span>Total: ${totalPedido}</span>
            <span class="badge ${getEstadoBadgeClass(estado)}">${estado}</span>
          </div>
        </button>
      </h2>
      <div 
        id="collapse-${pedido.id}" 
        class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" 
        aria-labelledby="heading-${pedido.id}" 
        data-bs-parent="#pedidosAccordion"
      >
        <div class="accordion-body">
          <ul class="list-group list-group-flush">
            ${pedido.booking_products.map(renderProductoDetalle).join("")}
          </ul>
        </div>
      </div>
    </div>
  `;
}

function renderProductoDetalle(item) {
  const producto = item.products; // El objeto 'products' anidado
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


// --- FUNCIONES DE ESTADO (las que ya tenías) ---

function showLoadingState() {
  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
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
      <div class="col-12 text-center py-5">
        <i class="bi bi-cart-x display-1 text-muted"></i>
        <h4 class="mt-3 text-muted">No tienes pedidos</h4>
        <p class="text-muted">Los productos que compres aparecerán aquí.</p>
        <a href="#productos" class="btn btn-primary mt-3">
          <i class="bi bi-bag me-2"></i>Ir a Productos
        </a>
      </div>
    `;
    // No necesitas el listener de SPA-link si tu router ya maneja los 'href'
  }
}

function showErrorState(message) {
  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
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

// --- FUNCIONES HELPER (las que ya tenías) ---

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
    currency: "ARS", // O la moneda que uses
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}