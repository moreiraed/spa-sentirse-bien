export class PDFExporter {
  constructor() {
    // Puedes inicializar configuraciones de PDF aquí
  }

  generarPDF(fechaInicio, fechaFin) {
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
          texto = texto.substring(0, 10) + "...";
        if (index === 3 && texto.length > 20)
          texto = texto.substring(0, 17) + "...";

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

  generarPDFStock(productos, filtros = {}) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Título
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("INFORME DE STOCK", pageWidth / 2, yPosition, {
      align: "center",
    });
    yPosition += 10;

    // Filtros aplicados
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    let infoFiltros = "Todos los productos";
    if (
      filtros.busqueda ||
      filtros.stock !== "todos" ||
      filtros.categoria !== "todos"
    ) {
      infoFiltros = "Filtros aplicados: ";
      const filtrosAplicados = [];

      if (filtros.busqueda)
        filtrosAplicados.push(`Búsqueda: "${filtros.busqueda}"`);
      if (filtros.stock !== "todos")
        filtrosAplicados.push(
          `Stock: ${this.traducirFiltroStock(filtros.stock)}`
        );
      if (filtros.categoria !== "todos")
        filtrosAplicados.push(`Categoría: ${filtros.categoria}`);

      infoFiltros += filtrosAplicados.join(", ");
    }

    doc.text(infoFiltros, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 10;

    // Resumen
    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN", 14, yPosition);
    yPosition += 8;

    doc.setFont("helvetica", "normal");
    const totalProductos = productos.length;
    const agotados = productos.filter((p) => (p.stock || 0) === 0).length;
    const stockBajo = productos.filter(
      (p) => (p.stock || 0) > 0 && (p.stock || 0) <= 5
    ).length;
    const disponibles = productos.filter((p) => (p.stock || 0) > 5).length;

    doc.text(`Total productos: ${totalProductos}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Agotados: ${agotados}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Stock bajo: ${stockBajo}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Disponibles: ${disponibles}`, 20, yPosition);
    yPosition += 15;

    // Encabezados de la tabla
    const headers = [
      "Producto",
      "Categoría",
      "Stock",
      "Estado",
      "Fecha Creación",
      "Última Actualización",
    ];
    const columnWidths = [45, 35, 15, 20, 25, 25];
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

    productos.forEach((producto, index) => {
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

      xPosition = 10;

      // Producto
      let textoProducto = producto.name;
      if (textoProducto.length > 30)
        textoProducto = textoProducto.substring(0, 27) + "...";
      doc.text(textoProducto, xPosition, yPosition);
      xPosition += columnWidths[0];

      // Categoría
      let textoCategoria = producto.type || "Sin categoría";
      if (textoCategoria.length > 20)
        textoCategoria = textoCategoria.substring(0, 17) + "...";
      doc.text(textoCategoria, xPosition, yPosition);
      xPosition += columnWidths[1];

      // Stock
      doc.text((producto.stock || 0).toString(), xPosition, yPosition);
      xPosition += columnWidths[2];

      // Estado
      const estado = this.getStockStatus(producto.stock);
      doc.text(estado, xPosition, yPosition);
      xPosition += columnWidths[3];

      // Fecha Creación
      doc.text(
        new Date(producto.created_at).toLocaleDateString(),
        xPosition,
        yPosition
      );
      xPosition += columnWidths[4];

      // Última Actualización
      const fechaActualizacion = producto.updated_at
        ? new Date(producto.updated_at).toLocaleDateString()
        : "N/A";
      doc.text(fechaActualizacion, xPosition, yPosition);

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
    const nombreArchivo = `informe-stock-${
      new Date().toISOString().split("T")[0]
    }.pdf`;
    doc.save(nombreArchivo);

    this.mostrarToast("PDF de stock exportado correctamente", "success");
  }

  getStockStatus(stock) {
    if (stock === 0 || !stock) return "Agotado";
    if (stock <= 5) return "Stock Bajo";
    return "Disponible";
  }

  traducirFiltroStock(filtro) {
    switch (filtro) {
      case "agotado":
        return "Agotado";
      case "bajo":
        return "Stock Bajo";
      case "disponible":
        return "Disponible";
      default:
        return filtro;
    }
  }

  formatearFecha(fechaString) {
    const [year, month, day] = fechaString.split("-");
    return `${day}/${month}/${year}`;
  }

  mostrarToast(mensaje, tipo) {
    if (typeof showToast === "function") {
      showToast(mensaje, tipo);
    } else {
      alert(mensaje);
    }
  }
}
