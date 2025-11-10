import { supabase } from "../core/supabase.js";

export class VentasManager {
  constructor() {
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.cargarDatosIniciales();
    this.cargarControlStock();
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
        .eq("delivery_method", "product_purchase") // SOLO product_purchase
        .neq("delivery_method", "in_spa") // EXCLUIR in_spa
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

      // Validar fechas
      if (!fechaInicio || !fechaFin) {
        this.mostrarToast("Selecciona un rango de fechas", "warning");
        return;
      }

      // Mostrar loading
      this.mostrarLoading(true);

      // Construir consulta base - SOLO product_purchase
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
        return; // Saltar servicios del spa
      }

      // Para cada producto en el booking
      booking.booking_products?.forEach((item) => {
        // Aplicar filtro por categoría si está activo
        if (tipoFiltro && tipoFiltro !== "todos") {
          const categoriaProducto = item.products?.category;
          if (categoriaProducto !== tipoFiltro) {
            return; // Saltar productos que no coincidan con la categoría
          }
        }

        // Solo procesar si hay producto
        if (!item.products) return;

        // Formatear fecha considerando la zona horaria
        const fecha = new Date(booking.created_at);
        // Ajustar a zona horaria local y obtener solo la fecha
        const fechaAjustada = new Date(
          fecha.getTime() + fecha.getTimezoneOffset() * 60000
        );
        const fechaFormateada = fechaAjustada.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

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

      this.generarPDF(fechaInicio, fechaFin);
    } catch (error) {
      console.error("Error exportando informe:", error);
      this.mostrarToast("Error al exportar el informe", "danger");
    }
  }

  async generarPDF(fechaInicio, fechaFin) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Título
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("INFORME DE VENTAS", pageWidth / 2, yPosition, {
      align: "center",
    });
    yPosition += 10;

    // Fechas
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Período: ${this.formatearFecha(fechaInicio)} - ${this.formatearFecha(
        fechaFin
      )}`,
      pageWidth / 2,
      yPosition,
      { align: "center" }
    );
    yPosition += 15;

    // Resumen de ventas
    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN DE VENTAS", 14, yPosition);
    yPosition += 8;

    doc.setFont("helvetica", "normal");
    const totalVentas = document.getElementById("total-ventas").textContent;
    const totalEfectivo = document.getElementById("total-efectivo").textContent;
    const totalDebito = document.getElementById("total-debito").textContent;
    const totalCredito = document.getElementById("total-credito").textContent;

    doc.text(`Total Ventas: ${totalVentas}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Efectivo: ${totalEfectivo}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Débito: ${totalDebito}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Crédito: ${totalCredito}`, 20, yPosition);
    yPosition += 15;

    // Encabezados de la tabla
    const headers = [
      "Fecha",
      "Cliente",
      "Categoría",
      "Producto",
      "Cant",
      "P.Unit",
      "Subtotal",
      "Pago",
      "Estado",
    ];
    const columnWidths = [18, 25, 22, 33, 10, 16, 16, 16, 16];
    let xPosition = 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);

    // Dibujar encabezados
    headers.forEach((header, index) => {
      doc.text(header, xPosition, yPosition);
      xPosition += columnWidths[index];
    });

    yPosition += 6;

    // Línea separadora
    doc.setLineWidth(0.5);
    doc.line(10, yPosition, pageWidth - 10, yPosition);
    yPosition += 10;

    // Datos de la tabla
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    const filas = document.querySelectorAll("#detalle-ventas-body tr");

    filas.forEach((fila) => {
      // Verificar si necesita nueva página
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;

        // Redibujar encabezados en nueva página
        xPosition = 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        headers.forEach((header, index) => {
          doc.text(header, xPosition, yPosition);
          xPosition += columnWidths[index];
        });
        yPosition += 16;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }

      const celdas = fila.querySelectorAll("td");
      xPosition = 10;

      celdas.forEach((celda, index) => {
        let texto = celda.textContent.trim();

        // Acortar texto largo para que quepa en las columnas
        if (index === 1 && texto.length > 15)
          texto = texto.substring(0, 12) + "...";
        if (index === 2 && texto.length > 12)
          texto = texto.substring(0, 10) + "..."; // Categoría
        if (index === 3 && texto.length > 20)
          texto = texto.substring(0, 17) + "..."; // Producto

        doc.text(texto, xPosition, yPosition);
        xPosition += columnWidths[index];
      });

      yPosition += 6;
    });

    // Pie de página
    const totalPaginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(
        `Página ${i} de ${totalPaginas} - Generado el ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        290,
        { align: "center" }
      );
    }

    // Guardar PDF
    const nombreArchivo = `informe-ventas-${fechaInicio}-a-${fechaFin}.pdf`;
    doc.save(nombreArchivo);

    this.mostrarToast("PDF exportado correctamente", "success");
  }

  formatearFecha(fechaString) {
    const [year, month, day] = fechaString.split("-");
    return `${day}/${month}/${year}`;
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
