import { supabase } from "../core/supabase.js";
import { StockManager } from "./stock-manager.js";
import { PDFExporter } from "./pdf-exporter.js";

export class VentasManager {
  constructor() {
    // Verificar si estamos en la página de ventas
    const currentPage = window.location.hash.replace("#", "");
    if (currentPage !== "ventas") {
      console.log("No en página de ventas, omitiendo inicialización");
      return;
    }

    this.stockManager = new StockManager();
    this.pdfExporter = new PDFExporter();
    this.ventasActuales = null;
    this.filtrosVentas = {
      busqueda: "",
      tipo: "todos",
    };
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.cargarDatosIniciales();
    this.stockManager.cargarControlStock();
    this.cargarCategoriasFiltro();
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
        this.stockManager.exportarStock();
      });

    document
      .getElementById("buscador-ventas")
      ?.addEventListener("input", (e) => {
        this.filtrosVentas.busqueda = e.target.value.toLowerCase();
        this.aplicarFiltrosVentas();
      });

    document
      .getElementById("limpiar-filtros-ventas")
      ?.addEventListener("click", () => {
        this.limpiarFiltrosVentas();
      });

    document.getElementById("tipo-filtro")?.addEventListener("change", (e) => {
      this.filtrosVentas.tipo = e.target.value;
      this.aplicarFiltrosVentas();
    });

    // Filtros de stock
    document.querySelectorAll(".filter-stock-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.stockManager.filtrarStock(e.target.dataset.filter);
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

      const bookings = await this.obtenerVentasPorFecha(fechaInicio, fechaFin);

      // Guardar ventas actuales para filtrar
      this.ventasActuales = bookings;

      this.procesarDatosVentas(bookings);
      this.renderizarDetalleVentas(bookings);
    } catch (error) {
      console.error("Error cargando estadísticas iniciales:", error);
      this.mostrarEstadoVacio();
    }
  }

  // generarInformeVentas
  async generarInformeVentas() {
    try {
      const fechaInicio = document.getElementById("fecha-inicio").value;
      const fechaFin = document.getElementById("fecha-fin").value;

      // Validar fechas
      if (!fechaInicio || !fechaFin) {
        this.mostrarToast("Selecciona un rango de fechas", "warning");
        return;
      }

      // Mostrar loading
      this.mostrarLoading(true);

      const bookings = await this.obtenerVentasPorFecha(fechaInicio, fechaFin);

      // Guardar ventas actuales para filtrar
      this.ventasActuales = bookings;

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

  // Métodos para filtrar ventas
  aplicarFiltrosVentas() {
    // Si no hay datos cargados, no hacer nada
    if (!this.ventasActuales) return;

    let ventasFiltradas = [...this.ventasActuales];

    // Aplicar filtro de búsqueda
    if (this.filtrosVentas.busqueda) {
      ventasFiltradas = ventasFiltradas.filter((booking) => {
        const cliente = booking.users
          ? `${booking.users.nombre || ""} ${booking.users.apellido || ""} ${
              booking.users.email || ""
            }`.toLowerCase()
          : "";
        const productos =
          booking.booking_products
            ?.map((bp) => bp.products?.name?.toLowerCase() || "")
            .join(" ") || "";

        return (
          cliente.includes(this.filtrosVentas.busqueda) ||
          productos.includes(this.filtrosVentas.busqueda)
        );
      });
    }

    // Aplicar filtro de tipo
    if (this.filtrosVentas.tipo !== "todos") {
      ventasFiltradas = ventasFiltradas.filter((booking) => {
        if (this.filtrosVentas.tipo === "producto") {
          return booking.delivery_method === "product_purchase";
        } else if (this.filtrosVentas.tipo === "servicio") {
          return booking.delivery_method === "in_spa";
        }
        return true;
      });
    }

    this.renderizarDetalleVentas(ventasFiltradas);
  }

  limpiarFiltrosVentas() {
    this.filtrosVentas = {
      busqueda: "",
      tipo: "todos",
    };

    // Resetear inputs
    document.getElementById("buscador-ventas").value = "";
    document.getElementById("tipo-filtro").value = "todos";

    // Mostrar todas las ventas
    if (this.ventasActuales) {
      this.renderizarDetalleVentas(this.ventasActuales);
    }
  }

  // Método para obtener ventas por fecha
  async obtenerVentasPorFecha(fechaInicio, fechaFin) {
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
      .eq("delivery_method", "product_purchase")
      .gte("created_at", `${fechaInicio}T00:00:00`)
      .lte("created_at", `${fechaFin}T23:59:59`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return bookings || [];
  }

  // Método para cargar categorías en el filtro
  async cargarCategoriasFiltro() {
    try {
      const { data: categories, error } = await supabase
        .from("products")
        .select("category")
        .not("category", "is", null);

      if (error) throw error;

      // Extraer categorías únicas
      const categoriasUnicas = [
        ...new Set(categories.map((item) => item.category)),
      ];

      const selectFiltro = document.getElementById("tipo-filtro");
      if (selectFiltro) {
        // Limpiar opciones excepto "Todos"
        selectFiltro.innerHTML =
          '<option value="todos">Todos los tipos</option>';

        // Agregar categorías
        categoriasUnicas.forEach((categoria) => {
          if (categoria) {
            const option = document.createElement("option");
            option.value = categoria;
            option.textContent = categoria;
            selectFiltro.appendChild(option);
          }
        });
      }
    } catch (error) {
      console.error("Error cargando categorías:", error);
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
      totalVentas += parseFloat(booking.total_price || 0);

      // Sumar por método de pago
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
    const tipoFiltro = document.getElementById("tipo-filtro").value;

    if (!bookings || bookings.length === 0) {
      this.mostrarEstadoVacio();
      return;
    }

    let html = "";
    let ventasFiltradas = 0;

    bookings.forEach((booking) => {
      // Filtrar solo bookings de productos (product_purchase)
      if (booking.delivery_method !== "product_purchase") {
        return;
      }

      // Para cada producto en el booking
      booking.booking_products?.forEach((item) => {
        // Aplicar filtro por categoría si está activo
        if (tipoFiltro && tipoFiltro !== "todos") {
          const categoriaProducto = item.products?.category;
          if (categoriaProducto !== tipoFiltro) {
            return;
          }
        }

        // Solo procesar si hay producto
        if (!item.products) return;

        // Formatear fecha considerando la zona horaria
        const fecha = new Date(booking.created_at);
        const fechaAjustada = new Date(
          fecha.getTime() + fecha.getTimezoneOffset() * 60000
        );
        const fechaFormateada = fechaAjustada.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

        // Obtener nombre del cliente o email
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

        const categoria = item.products?.category || "Sin categoría";
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
          <td>${fechaFormateada}</td>
          <td title="${
            booking.users?.nombre || booking.users?.email || ""
          }">${cliente}${
          (booking.users?.nombre && booking.users.nombre.length > 20) ||
          (booking.users?.email && booking.users.email.length > 20)
            ? "..."
            : ""
        }</td>
          <td><span class="badge badge-admin">${categoria}</span></td>
          <td>${nombre}</td>
          <td>${cantidad}</td>
          <td>$${precioUnit.toLocaleString()}</td>
          <td>$${subtotal.toLocaleString()}</td>
          <td><span class="badge ${this.getBadgeClassPayment(
            booking.payment_method
          )}">${metodoPagoTraducido}</span></td>
          <td><span class="badge ${this.getBadgeClassStatus(
            booking.status
          )}">${estadoTraducido}</span></td>
        </tr>
      `;

        ventasFiltradas++;
      });
    });

    // Si no hay ventas después de aplicar filtros
    if (ventasFiltradas === 0) {
      this.mostrarEstadoVacio();
      return;
    }

    tbody.innerHTML = html;
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
    try {
      const fechaInicio = document.getElementById("fecha-inicio").value;
      const fechaFin = document.getElementById("fecha-fin").value;

      if (!fechaInicio || !fechaFin) {
        this.mostrarToast("Selecciona un rango de fechas primero", "warning");
        return;
      }

      // Obtener datos de la tabla
      const tabla = document.getElementById("detalle-ventas-body");
      if (
        !tabla ||
        tabla.children.length === 0 ||
        tabla.textContent.includes("No hay datos")
      ) {
        this.mostrarToast("No hay datos para exportar", "warning");
        return;
      }

      this.pdfExporter.generarPDF(fechaInicio, fechaFin);
    } catch (error) {
      console.error("Error exportando informe:", error);
      this.mostrarToast("Error al exportar el informe", "danger");
    }
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
