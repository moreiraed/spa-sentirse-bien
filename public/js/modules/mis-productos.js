export function initMisProductosPage() {
  console.log("Inicializando página Mis Productos");

  // Elementos del DOM
  const productosContainer = document.getElementById("productos-container");
  const refreshBtn = document.getElementById("refreshBtn");

  // Cargar productos al inicializar
  loadMisProductos();

  // Event listener para el botón de actualizar
  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadMisProductos);
  }

  // Función principal para cargar productos
  async function loadMisProductos() {
    try {
      showLoadingState();

      // Simular carga de datos (reemplazar con llamada real a Supabase)
      const productos = await fetchMisProductos();

      if (productos.length === 0) {
        showEmptyState();
      } else {
        renderProductos(productos);
      }
    } catch (error) {
      console.error("Error cargando mis productos:", error);
      showErrorState(error.message);
    }
  }

  // Función para obtener productos (simulada por ahora)
  async function fetchMisProductos() {
    // Simular delay de red
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Por ahora retornamos array vacío - luego integrar con Supabase después
    return [];

    /* Ejemplo de estructura:
        return [
            {
                id: 1,
                nombre: "Producto Ejemplo",
                precio: 29.99,
                imagen: "ruta/imagen.jpg",
                fechaCompra: "2024-01-15",
                estado: "entregado"
            }
        ];
        */
  }

  // Función para mostrar estado de carga
  function showLoadingState() {
    if (productosContainer) {
      productosContainer.innerHTML = `
                <div class="col-12 text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando productos...</span>
                    </div>
                    <p class="mt-2 text-muted">Cargando tus productos...</p>
                </div>
            `;
    }
  }

  // Función para mostrar estado vacío
  function showEmptyState() {
    if (productosContainer) {
      productosContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-cart-x display-1 text-muted"></i>
                    <h4 class="mt-3 text-muted">No tienes productos</h4>
                    <p class="text-muted">Los productos que compres aparecerán aquí.</p>
                    <a href="#productos" class="btn btn-primary mt-3" data-spa-link="productos">
                        <i class="bi bi-bag me-2"></i>Ir a Productos
                    </a>
                </div>
            `;

      // Agregar event listener al botón
      const goToProductsBtn = productosContainer.querySelector(
        '[data-spa-link="productos"]'
      );
      if (goToProductsBtn) {
        goToProductsBtn.addEventListener("click", (e) => {
          e.preventDefault();
          if (window.App?.router) {
            window.App.router.navigateTo("productos");
          }
        });
      }
    }
  }

  // Función para mostrar error
  function showErrorState(message) {
    if (productosContainer) {
      productosContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-exclamation-triangle display-1 text-danger"></i>
                    <h4 class="mt-3 text-danger">Error al cargar productos</h4>
                    <p class="text-muted">${
                      message || "Intenta nuevamente más tarde."
                    }</p>
                    <button class="btn btn-outline-primary mt-3" id="retryBtn">
                        <i class="bi bi-arrow-clockwise me-2"></i>Reintentar
                    </button>
                </div>
            `;

      // Agregar event listener al botón de reintentar
      const retryBtn = document.getElementById("retryBtn");
      if (retryBtn) {
        retryBtn.addEventListener("click", loadMisProductos);
      }
    }
  }

  // Función para renderizar productos
  function renderProductos(productos) {
    if (productosContainer) {
      productosContainer.innerHTML = productos
        .map(
          (producto) => `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card h-100">
                        <img src="${
                          producto.imagen
                        }" class="card-img-top" alt="${
            producto.nombre
          }" style="height: 200px; object-fit: cover;">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${producto.nombre}</h5>
                            <p class="card-text text-muted">Comprado el: ${new Date(
                              producto.fechaCompra
                            ).toLocaleDateString()}</p>
                            <div class="mt-auto">
                                <span class="badge ${getEstadoBadgeClass(
                                  producto.estado
                                )}">${producto.estado}</span>
                                <div class="d-flex justify-content-between align-items-center mt-2">
                                    <strong class="text-primary">$${
                                      producto.precio
                                    }</strong>
                                    <button class="btn btn-outline-primary btn-sm">Ver Detalles</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `
        )
        .join("");
    }
  }

  // Función helper para clases de badges de estado
  function getEstadoBadgeClass(estado) {
    const estados = {
      entregado: "bg-success",
      "en camino": "bg-warning",
      procesando: "bg-info",
      cancelado: "bg-danger",
    };
    return estados[estado] || "bg-secondary";
  }
}

// Exportar por defecto también
export default initMisProductosPage;
