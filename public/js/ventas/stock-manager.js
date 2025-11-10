import { supabase } from "../core/supabase.js";

export class StockManager {
  constructor() {
    // Puedes inicializar propiedades específicas de stock aquí
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
            <button class="btn btn-table btn-admin-outline btn-sm" onclick="ventasManager.stockManager.actualizarStock('${
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
      // Mostrar modal o prompt para actualizar stock
      const nuevoStock = prompt("Ingrese el nuevo stock:");

      if (nuevoStock === null) return; // Usuario canceló

      const stockNum = parseInt(nuevoStock);
      if (isNaN(stockNum) || stockNum < 0) {
        this.mostrarToast("Ingrese un número válido", "warning");
        return;
      }

      // Actualizar en la base de datos
      const { error } = await supabase
        .from("products")
        .update({ stock: stockNum })
        .eq("id", productId);

      if (error) throw error;

      this.mostrarToast("Stock actualizado correctamente", "success");

      // Recargar la tabla
      this.cargarControlStock();
    } catch (error) {
      console.error("Error actualizando stock:", error);
      this.mostrarToast("Error al actualizar el stock", "danger");
    }
  }

  filtrarStock(filter) {
    // Implementar filtrado de stock
    this.mostrarToast(`Filtrando por: ${filter}`, "info");
    // Aquí puedes implementar la lógica de filtrado específica
  }

  exportarStock() {
    // Implementar exportación de stock
    this.mostrarToast("Exportación de stock en desarrollo", "info");
  }

  mostrarToast(mensaje, tipo) {
    if (typeof showToast === "function") {
      showToast(mensaje, tipo);
    } else {
      alert(mensaje);
    }
  }
}
