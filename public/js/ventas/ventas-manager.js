import { supabase } from "../core/supabase.js";

export class VentasManager {
  constructor() {
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.cargarDatosIniciales();
    this.cargarControlStock();
  }

  setupEventListeners() {
    // Generar informe
    document
      .getElementById("btn-generar-informe")
      ?.addEventListener("click", () => {
        this.generarInformeVentas();
      });

    // Exportar informe
    document
      .getElementById("btn-exportar-informe")
      ?.addEventListener("click", () => {
        this.exportarInforme();
      });

    // Exportar stock
    document
      .getElementById("btn-exportar-stock")
      ?.addEventListener("click", () => {
        this.exportarStock();
      });

    // Filtros de stock
    document.querySelectorAll(".filter-stock-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.filtrarStock(e.target.dataset.filter);
      });
    });
  }

  // Cargar datos iniciales
  async cargarDatosIniciales() {
    try {
      // Establecer fechas por defecto (últimos 7 días)
      const fechaFin = new Date();
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - 7);

      document.getElementById("fecha-inicio").value = fechaInicio
        .toISOString()
        .split("T")[0];
      document.getElementById("fecha-fin").value = fechaFin
        .toISOString()
        .split("T")[0];

      // Cargar estadísticas iniciales
      await this.cargarEstadisticasIniciales();
    } catch (error) {
      console.error("Error cargando datos iniciales:", error);
    }
  }

  // Cargar estadísticas iniciales
  async cargarEstadisticasIniciales() {
    try {
      const fechaInicio = document.getElementById("fecha-inicio").value;
      const fechaFin = document.getElementById("fecha-fin").value;

      if (!fechaInicio || !fechaFin) return;

      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          booking_products (
            *,
            products (*)
          ),
          payments (*),
          users (nombre, apellido, email)
        `
        )
        .gte("created_at", `${fechaInicio}T00:00:00`)
        .lte("created_at", `${fechaFin}T23:59:59`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      this.procesarDatosVentas(bookings);
      this.renderizarDetalleVentas(bookings);
    } catch (error) {
      console.error("Error cargando estadísticas iniciales:", error);
      // Mostrar estado vacío
      this.mostrarEstadoVacio();
    }
  }

  // generarInformeVentas
  async generarInformeVentas() {
    try {
      const fechaInicio = document.getElementById("fecha-inicio").value;
      const fechaFin = document.getElementById("fecha-fin").value;
      const tipoFiltro = document.getElementById("tipo-filtro").value;

      // Validar fechas
      if (!fechaInicio || !fechaFin) {
        this.mostrarToast("Selecciona un rango de fechas", "warning");
        return;
      }

      // Mostrar loading
      this.mostrarLoading(true);

      // Obtener ventas del rango de fechas
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          booking_products (
            *,
            products (*)
          ),
          payments (*),
          users (nombre, apellido, email)
        `
        )
        .gte("created_at", `${fechaInicio}T00:00:00`)
        .lte("created_at", `${fechaFin}T23:59:59`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      this.procesarDatosVentas(bookings);
      this.renderizarDetalleVentas(bookings);

      this.mostrarToast("Informe generado correctamente", "success");
    } catch (error) {
      console.error("Error generando informe:", error);
      this.mostrarToast("Error al generar el informe", "danger");
    } finally {
      this.mostrarLoading(false);
    }
  }

  // MÉTODO PARA MOSTRAR/OCULTAR LOADING
  mostrarLoading(mostrar) {
    const tbody = document.getElementById("detalle-ventas-body");
    if (!tbody) return;

    if (mostrar) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-2">Generando informe...</p>
          </td>
        </tr>
      `;
    }
  }

  // MÉTODO PARA MOSTRAR ESTADO VACÍO
  mostrarEstadoVacio() {
    const tbody = document.getElementById("detalle-ventas-body");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-4 text-muted">
            No hay datos para mostrar. Genera un informe seleccionando un rango de fechas.
          </td>
        </tr>
      `;
    }

    // Resetear estadísticas
    document.getElementById("total-ventas").textContent = "$0";
    document.getElementById("total-efectivo").textContent = "$0";
    document.getElementById("total-debito").textContent = "$0";
    document.getElementById("total-credito").textContent = "$0";
  }

  procesarDatosVentas(bookings) {
    let totalVentas = 0;
    let totalEfectivo = 0;
    let totalDebito = 0;
    let totalCredito = 0;

    bookings.forEach((booking) => {
      // if (booking.status === 'completed') {
      totalVentas += parseFloat(booking.total_price || 0);

      // Sumar por método de pago - CORREGIR NOMBRES
      if (booking.payment_method === "cash") {
        totalEfectivo += parseFloat(booking.total_price || 0);
      } else if (booking.payment_method === "debit_card") {
        totalDebito += parseFloat(booking.total_price || 0);
      } else if (booking.payment_method === "credit_card") {
        totalCredito += parseFloat(booking.total_price || 0);
      }
    });

    // Actualizar resumen
    document.getElementById(
      "total-ventas"
    ).textContent = `$${totalVentas.toLocaleString()}`;
    document.getElementById(
      "total-efectivo"
    ).textContent = `$${totalEfectivo.toLocaleString()}`;
    document.getElementById(
      "total-debito"
    ).textContent = `$${totalDebito.toLocaleString()}`;
    document.getElementById(
      "total-credito"
    ).textContent = `$${totalCredito.toLocaleString()}`;
  }

  renderizarDetalleVentas(bookings) {
    const tbody = document.getElementById("detalle-ventas-body");

    if (!bookings || bookings.length === 0) {
      this.mostrarEstadoVacio();
      return;
    }

    let html = "";

    bookings.forEach((booking) => {
      // Para cada producto en el booking
      booking.booking_products?.forEach((item) => {
        const fecha = new Date(booking.created_at).toLocaleDateString();

        // Obtener nombre del cliente o email (limitado)
        let cliente = "N/A";
        if (booking.users) {
          if (booking.users.nombre && booking.users.apellido) {
            cliente =
              `${booking.users.nombre} ${booking.users.apellido}`.substring(
                0,
                20
              );
          } else if (booking.users.email) {
            cliente = booking.users.email.substring(0, 20);
          }
        }

        const tipo = item.products ? "Producto" : "Servicio";
        const nombre = item.products?.name || "Producto no disponible";
        const cantidad = item.quantity || 1;
        const precioUnit = parseFloat(item.price_at_purchase || 0);
        const subtotal = cantidad * precioUnit;
        const metodoPagoTraducido = this.traducirMetodoPago(
          booking.payment_method
        );
        const estadoTraducido = this.traducirEstado(booking.status);

        html += `
          <tr>
            <td>${fecha}</td>
            <td title="${
              booking.users?.nombre || booking.users?.email || ""
            }">${cliente}${
          (booking.users?.nombre && booking.users.nombre.length > 20) ||
          (booking.users?.email && booking.users.email.length > 20)
            ? "..."
            : ""
        }</td>
            <td><span class="badge ${
              tipo === "Producto" ? "badge-admin" : "badge-professional"
            }">${tipo}</span></td>
            <td>${nombre}</td>
            <td>${cantidad}</td>
            <td>$${precioUnit.toLocaleString()}</td>
            <td>$${subtotal.toLocaleString()}</td>
            <td><span class="badge ${this.getBadgeClassPayment(
              booking.payment_method
            )}">${this.traducirMetodoPago(booking.payment_method)}</span></td>
            <td><span class="badge ${this.getBadgeClassStatus(
              booking.status
            )}">${this.traducirEstado(booking.status)}</span></td>
          </tr>
        `;
      });
    });

    tbody.innerHTML = html;
  }

  async cargarControlStock() {
    try {
      // Mostrar loading
      const tbody = document.getElementById("stock-table-body");
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
            </td>
          </tr>
        `;
      }

      // Obtener productos con stock
      const { data: products, error } = await supabase
        .from("products")
        .select("*")
        .order("stock", { ascending: true });

      if (error) throw error;

      this.renderizarControlStock(products);
    } catch (error) {
      console.error("Error cargando control de stock:", error);
      this.mostrarToast("Error al cargar el control de stock", "danger");
    }
  }

  renderizarControlStock(products) {
    const tbody = document.getElementById("stock-table-body");

    if (!products || products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-muted">
            No hay productos en inventario
          </td>
        </tr>
      `;
      return;
    }

    const html = products
      .map((product) => {
        const stockStatus = this.getStockStatus(product.stock);
        const statusClass = this.getStockStatusClass(stockStatus);

        return `
        <tr>
          <td>${product.name}</td>
          <td>${product.category || "Sin categoría"}</td>
          <td>${product.stock || 0}</td>
          <td><span class="badge ${statusClass}">${stockStatus}</span></td>
          <td>${new Date(product.created_at).toLocaleDateString()}</td>
          <td>
            <button class="btn btn-table btn-admin-outline btn-sm" onclick="ventasManager.actualizarStock('${
              product.id
            }')">
              <i class="bi bi-arrow-clockwise"></i>
            </button>
          </td>
        </tr>
      `;
      })
      .join("");

    tbody.innerHTML = html;
  }

  // CORREGIDO: Solo usa stock ya que no tienes min_stock
  getStockStatus(stock) {
    if (stock === 0 || !stock) return "Agotado";
    if (stock <= 5) return "Stock Bajo";
    return "Disponible";
  }

  getStockStatusClass(status) {
    switch (status) {
      case "Agotado":
        return "badge-admin";
      case "Stock Bajo":
        return "badge-ventas";
      case "Disponible":
        return "badge-professional";
      default:
        return "badge-user";
    }
  }

  // NUEVO MÉTODO: Traducir métodos de pago
  traducirMetodoPago(method) {
    switch (method) {
      case "cash":
        return "Efectivo";
      case "debit_card":
        return "Débito";
      case "credit_card":
        return "Crédito";
      case "transfer":
        return "Transferencia";
      default:
        return method || "No especificado";
    }
  }

  // NUEVO MÉTODO: Traducir estados
  traducirEstado(status) {
    switch (status) {
      case "completed":
        return "Completado";
      case "pending":
        return "Pendiente";
      case "cancelled":
        return "Cancelado";
      case "confirmed":
        return "Confirmado";
      default:
        return status || "Desconocido";
    }
  }

  getBadgeClassPayment(method) {
    switch (method) {
      case "cash":
        return "badge-success";
      case "debit_card":
        return "badge-info";
      case "credit_card":
        return "badge-warning";
      case "transfer":
        return "badge-primary";
      default:
        return "badge-secondary";
    }
  }

  getBadgeClassStatus(status) {
    switch (status) {
      case "completed":
      case "confirmed":
        return "badge-professional";
      case "pending":
        return "badge-ventas";
      case "cancelled":
        return "badge-admin";
      default:
        return "badge-user";
    }
  }

  exportarInforme() {
    // Implementar exportación a Excel/PDF
    this.mostrarToast("Funcionalidad de exportación en desarrollo", "info");
  }

  exportarStock() {
    // Implementar exportación de stock
    this.mostrarToast("Exportación de stock en desarrollo", "info");
  }

  filtrarStock(filter) {
    // Implementar filtrado de stock
    this.mostrarToast(`Filtrando por: ${filter}`, "info");
  }

  actualizarStock(productId) {
    // Implementar actualización de stock
    this.mostrarToast("Actualización de stock en desarrollo", "info");
  }

  mostrarToast(mensaje, tipo) {
    if (typeof showToast === "function") {
      showToast(mensaje, tipo);
    } else {
      alert(mensaje);
    }
  }
}

export function initVentasPage() {
  window.ventasManager = new VentasManager();
}
