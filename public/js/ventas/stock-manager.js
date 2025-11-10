import { supabase } from "../core/supabase.js";
import { PDFExporter } from "./pdf-exporter.js";

export class StockManager {
  constructor() {
    this.pdfExporter = new PDFExporter();
    this.productos = [];
    this.filtros = {
      busqueda: "",
      stock: "todos",
      categoria: "todos",
    };
    this.initEventListeners();
  }

  initEventListeners() {
    // Buscador
    document
      .getElementById("buscador-stock")
      ?.addEventListener("input", (e) => {
        this.filtros.busqueda = e.target.value.toLowerCase();
        this.aplicarFiltros();
      });

    // Filtro de stock
    document.getElementById("filtro-stock")?.addEventListener("change", (e) => {
      this.filtros.stock = e.target.value;
      this.aplicarFiltros();
    });

    // Filtro de categoría
    document
      .getElementById("filtro-categoria")
      ?.addEventListener("change", (e) => {
        this.filtros.categoria = e.target.value;
        this.aplicarFiltros();
      });

    // Botón limpiar filtros
    document
      .getElementById("limpiar-filtros-stock")
      ?.addEventListener("click", () => {
        this.limpiarFiltros();
      });
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
        .order("name", { ascending: true });

      if (error) throw error;

      this.productos = products || [];
      this.cargarFiltroCategorias();
      this.renderizarControlStock(this.productos);
    } catch (error) {
      console.error("Error cargando control de stock:", error);
      this.mostrarToast("Error al cargar el control de stock", "danger");
    }
  }

  cargarFiltroCategorias() {
    const selectCategoria = document.getElementById("filtro-categoria");
    if (!selectCategoria) return;

    // Extraer categorías únicas de la columna "type"
    const categoriasUnicas = [
      ...new Set(
        this.productos
          .map((product) => product.type)
          .filter((type) => type && type.trim() !== "")
      ),
    ].sort();

    // Limpiar y agregar opciones
    selectCategoria.innerHTML =
      '<option value="todos">Todas las categorías</option>';

    categoriasUnicas.forEach((categoria) => {
      const option = document.createElement("option");
      option.value = categoria;
      option.textContent = categoria;
      selectCategoria.appendChild(option);
    });
  }

  aplicarFiltros() {
    let productosFiltrados = [...this.productos];

    // Filtro por búsqueda (nombre)
    if (this.filtros.busqueda) {
      productosFiltrados = productosFiltrados.filter((producto) =>
        producto.name.toLowerCase().includes(this.filtros.busqueda)
      );
    }

    // Filtro por stock
    if (this.filtros.stock !== "todos") {
      productosFiltrados = productosFiltrados.filter((producto) => {
        const stock = producto.stock || 0;
        switch (this.filtros.stock) {
          case "agotado":
            return stock === 0;
          case "bajo":
            return stock > 0 && stock <= 5;
          case "disponible":
            return stock > 5;
          default:
            return true;
        }
      });
    }

    // Filtro por categoría (type)
    if (this.filtros.categoria !== "todos") {
      productosFiltrados = productosFiltrados.filter(
        (producto) => producto.type === this.filtros.categoria
      );
    }

    this.renderizarControlStock(productosFiltrados);
    this.actualizarContadorResultados(productosFiltrados.length);
  }

  limpiarFiltros() {
    // Resetear valores de los filtros
    this.filtros = {
      busqueda: "",
      stock: "todos",
      categoria: "todos",
    };

    // Resetear inputs
    document.getElementById("buscador-stock").value = "";
    document.getElementById("filtro-stock").value = "todos";
    document.getElementById("filtro-categoria").value = "todos";

    // Mostrar todos los productos
    this.renderizarControlStock(this.productos);
    this.actualizarContadorResultados(this.productos.length);
  }

  actualizarContadorResultados(cantidad) {
    const contador = document.getElementById("contador-resultados-stock");
    if (contador) {
      contador.textContent = `${cantidad} producto${
        cantidad !== 1 ? "s" : ""
      } encontrado${cantidad !== 1 ? "s" : ""}`;
    }
  }

  renderizarControlStock(products) {
    const tbody = document.getElementById("stock-table-body");

    if (!products || products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-muted">
            No se encontraron productos con los filtros aplicados
          </td>
        </tr>
      `;
      return;
    }

    const html = products
      .map((product) => {
        const stockStatus = this.getStockStatus(product.stock);
        const statusClass = this.getStockStatusClass(stockStatus);
        const categoria = product.type || "Sin categoría";

        return `
        <tr>
          <td>${product.name}</td>
          <td>${categoria}</td>
          <td>${product.stock || 0}</td>
          <td><span class="badge ${statusClass}">${stockStatus}</span></td>
          <td>${new Date(product.created_at).toLocaleDateString()}</td>
          <td>${
            product.updated_at
              ? new Date(product.updated_at).toLocaleDateString()
              : "N/A"
          }</td>
          <td>
            <button class="btn btn-table btn-admin-outline btn-sm" onclick="ventasManager.stockManager.actualizarStock('${
              product.id
            }')" title="Actualizar stock">
              <i class="bi bi-arrow-clockwise"></i>
            </button>
          </td>
        </tr>
      `;
      })
      .join("");

    tbody.innerHTML = html;
  }

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

  async actualizarStock(productId) {
    try {
      const producto = this.productos.find((p) => p.id === productId);
      if (!producto) {
        this.mostrarToast("Producto no encontrado", "warning");
        return;
      }

      const nuevoStock = prompt(
        `Actualizar stock para: ${producto.name}\nStock actual: ${
          producto.stock || 0
        }`,
        producto.stock || 0
      );

      if (nuevoStock === null) return; // Usuario canceló

      const stockNum = parseInt(nuevoStock);
      if (isNaN(stockNum) || stockNum < 0) {
        this.mostrarToast("Ingrese un número válido", "warning");
        return;
      }

      // Actualizar en la base de datos
      const { error } = await supabase
        .from("products")
        .update({
          stock: stockNum,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

      if (error) throw error;

      this.mostrarToast("Stock actualizado correctamente", "success");

      // Recargar la tabla
      await this.cargarControlStock();
    } catch (error) {
      console.error("Error actualizando stock:", error);
      this.mostrarToast("Error al actualizar el stock", "danger");
    }
  }

  exportarStock() {
    try {
      const productosFiltrados = this.obtenerProductosFiltrados();

      if (!productosFiltrados || productosFiltrados.length === 0) {
        this.mostrarToast("No hay datos para exportar", "warning");
        return;
      }

      this.pdfExporter.generarPDFStock(productosFiltrados, this.filtros);
    } catch (error) {
      console.error("Error exportando stock:", error);
      this.mostrarToast("Error al exportar el stock", "danger");
    }
  }

  obtenerProductosFiltrados() {
    let productosFiltrados = [...this.productos];

    // Aplicar los mismos filtros que en la vista
    if (this.filtros.busqueda) {
      productosFiltrados = productosFiltrados.filter((producto) =>
        producto.name.toLowerCase().includes(this.filtros.busqueda)
      );
    }

    if (this.filtros.stock !== "todos") {
      productosFiltrados = productosFiltrados.filter((producto) => {
        const stock = producto.stock || 0;
        switch (this.filtros.stock) {
          case "agotado":
            return stock === 0;
          case "bajo":
            return stock > 0 && stock <= 5;
          case "disponible":
            return stock > 5;
          default:
            return true;
        }
      });
    }

    if (this.filtros.categoria !== "todos") {
      productosFiltrados = productosFiltrados.filter(
        (producto) => producto.type === this.filtros.categoria
      );
    }

    return productosFiltrados;
  }

  mostrarToast(mensaje, tipo) {
    if (typeof showToast === "function") {
      showToast(mensaje, tipo);
    } else {
      alert(mensaje);
    }
  }
}
