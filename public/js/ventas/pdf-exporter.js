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
