import { supabase } from "../core/supabase.js";

export class AdminSupplierProducts {
  constructor(adminSuppliers) {
    this.adminSuppliers = adminSuppliers;
    this.selectedProducts = new Set();
  }

  async manageSupplierProducts(supplierId) {
    try {
      // Cargar datos del proveedor
      const { data: supplier, error: supplierError } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("id", supplierId)
        .single();

      if (supplierError) throw supplierError;

      // Cargar productos asociados - CORREGIDO
      const { data: associatedProducts, error: productsError } = await supabase
        .from("product_suppliers")
        .select(
          `
        product_id,
        products:product_id (
          id, name, type, category
        )
      `
        )
        .eq("supplier_id", supplierId);

      if (productsError) throw productsError;

      // Extraer solo los IDs de productos asociados
      const associatedProductIds = (associatedProducts || []).map(
        (ap) => ap.product_id
      );

      // Inicializar selectedProducts con los IDs asociados
      this.selectedProducts = new Set(associatedProductIds);

      // Mostrar modal de gestión de productos
      this.showProductsModal(supplier, associatedProducts || []);
    } catch (error) {
      console.error("Error gestionando productos del proveedor:", error);
      this.showError(`Error: ${error.message}`);
    }
  }

  showProductsModal(supplier, associatedProducts) {
    // Crear modal dinámicamente si no existe
    let modal = document.getElementById("supplierProductsModal");
    if (!modal) {
      modal = this.createProductsModal();
    }

    // Llenar modal con datos
    document.getElementById(
      "supplier-products-title"
    ).textContent = `Productos de ${supplier.name}`;
    document.getElementById("supplier-products-id").value = supplier.id;

    // Renderizar productos disponibles
    this.renderAvailableProducts(supplier.id, associatedProducts);

    // Mostrar modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
  }

  createProductsModal() {
    const modalHTML = `
      <div class="modal fade admin-modal supplier-products-modal" id="supplierProductsModal" tabindex="-1">
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="supplier-products-title">Gestionar Productos</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <input type="hidden" id="supplier-products-id">
              <div class="row">
                <div class="col-md-6">
                  <h6>Productos Disponibles</h6>
                  <div class="mb-2">
                    <small class="text-muted">Selecciona los productos que provee este proveedor</small>
                  </div>
                  <div id="available-products-list" class="border rounded p-3" style="max-height: 400px; overflow-y: auto;">
                    <!-- Los productos se cargarán aquí -->
                  </div>
                </div>
                <div class="col-md-6">
                  <h6>Productos Seleccionados</h6>
                  <div class="mb-2 d-flex justify-content-between align-items-center">
                    <small class="text-muted" id="selected-count">0 productos seleccionados</small>
                    <button class="btn btn-sm btn-outline-secondary" id="clear-selection">
                      <i class="bi bi-x-circle me-1"></i>Limpiar
                    </button>
                  </div>
                  <div id="selected-products-list" class="border rounded p-3" style="max-height: 350px; overflow-y: auto;">
                    <div class="text-center text-muted py-4">
                      <i class="bi bi-inbox display-6"></i>
                      <p class="mt-2">No hay productos seleccionados</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="alert alert-info mt-3">
                <small>
                  <i class="bi bi-info-circle me-2"></i>
                  Selecciona los productos de la lista izquierda y luego haz clic en "Guardar Cambios" para confirmar.
                </small>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-admin-outline" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-admin-primary" id="save-products-changes">
                <i class="bi bi-check-circle me-2"></i>
                <span class="btn-text">Guardar Cambios</span>
                <div class="btn-loader spinner-border spinner-border-sm d-none" role="status">
                  <span class="visually-hidden">Cargando...</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Agregar event listeners del modal
    this.attachModalEventListeners();

    return document.getElementById("supplierProductsModal");
  }

  async renderAvailableProducts(supplierId, associatedProducts) {
    const availableList = document.getElementById("available-products-list");
    const selectedList = document.getElementById("selected-products-list");

    if (!availableList || !selectedList) return;

    // Siempre cargar productos si no están disponibles
    if (
      !this.adminSuppliers.products ||
      this.adminSuppliers.products.length === 0
    ) {
      await this.loadProductsForModal();
    }

    // Renderizar productos disponibles
    availableList.innerHTML =
      this.adminSuppliers.products
        .map((product) => {
          const isSelected = this.selectedProducts.has(product.id);
          return `
        <div class="product-item d-flex justify-content-between align-items-center mb-2 p-2 border rounded ${
          isSelected ? "bg-selected" : ""
        }" 
             data-product-id="${product.id}">
          <div class="flex-grow-1">
            <div class="fw-semibold">${product.name}</div>
            <small class="text-muted">${product.type} • ${
            product.category
          }</small>
          </div>
          <div class="form-check">
            <input class="form-check-input product-checkbox" type="checkbox" 
                   data-product-id="${product.id}" 
                   ${isSelected ? "checked" : ""}>
          </div>
        </div>
      `;
        })
        .join("") ||
      '<div class="text-muted">No hay productos disponibles</div>';

    // Renderizar productos seleccionados
    this.renderSelectedProductsList();

    // Agregar event listeners para los checkboxes
    this.attachProductSelectionListeners();
  }

  async loadProductsForModal() {
    try {
      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, type, category")
        .order("name", { ascending: true });

      if (error) throw error;

      this.adminSuppliers.products = products || [];
      // Volver a renderizar
      const supplierId = document.getElementById("supplier-products-id").value;
      this.renderAvailableProducts(supplierId, []);
    } catch (error) {
      console.error("Error loading products for modal:", error);
    }
  }

  renderSelectedProductsList() {
    const selectedList = document.getElementById("selected-products-list");
    const selectedCount = document.getElementById("selected-count");

    if (!selectedList || !selectedCount) return;

    // Actualizar contador
    selectedCount.textContent = `${this.selectedProducts.size} producto${
      this.selectedProducts.size !== 1 ? "s" : ""
    } seleccionado${this.selectedProducts.size !== 1 ? "s" : ""}`;

    // Renderizar lista de seleccionados
    if (this.selectedProducts.size === 0) {
      selectedList.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="bi bi-inbox display-6"></i>
          <p class="mt-2">No hay productos seleccionados</p>
        </div>
      `;
    } else {
      selectedList.innerHTML = Array.from(this.selectedProducts)
        .map((productId) => {
          const product = this.adminSuppliers.products.find(
            (p) => p.id === productId
          );
          if (!product) return "";

          return `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded bg-light">
              <div>
                <div class="fw-semibold">${product.name}</div>
                <small class="text-muted">${product.type} • ${product.category}</small>
              </div>
              <button class="btn btn-sm btn-outline-danger remove-selected" data-product-id="${product.id}">
                <i class="bi bi-x"></i>
              </button>
            </div>
          `;
        })
        .join("");
    }

    // Agregar event listeners para botones de remover
    this.attachRemoveSelectedListeners();
  }

  attachRemoveSelectedListeners() {
    // Botones de remover de la lista de seleccionados
    document.querySelectorAll(".remove-selected").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const productId = e.currentTarget.getAttribute("data-product-id");
        this.selectedProducts.delete(productId);

        // Actualizar checkbox correspondiente
        const checkbox = document.querySelector(
          `.product-checkbox[data-product-id="${productId}"]`
        );
        if (checkbox) {
          checkbox.checked = false;
          checkbox.closest(".product-item").classList.remove("bg-selected");
        }

        this.renderSelectedProductsList();
      });
    });
  }

  clearSelection() {
    this.selectedProducts.clear();

    // Desmarcar todos los checkboxes
    document.querySelectorAll(".product-checkbox").forEach((checkbox) => {
      checkbox.checked = false;
      checkbox.closest(".product-item").classList.remove("bg-selected");
    });

    this.renderSelectedProductsList();
  }

  async saveProductChanges() {
    const supplierId = document.getElementById("supplier-products-id").value;
    const saveBtn = document.getElementById("save-products-changes");
    const btnText = saveBtn.querySelector(".btn-text");
    const btnLoader = saveBtn.querySelector(".btn-loader");

    try {
      saveBtn.disabled = true;
      btnText.textContent = "Guardando...";
      btnLoader.classList.remove("d-none");

      // Obtener productos actualmente asociados
      const { data: currentAssociations, error: fetchError } = await supabase
        .from("product_suppliers")
        .select("product_id")
        .eq("supplier_id", supplierId);

      if (fetchError) throw fetchError;

      const currentProductIds = new Set(
        currentAssociations?.map((ca) => ca.product_id) || []
      );
      const newProductIds = this.selectedProducts;

      // Identificar productos a agregar y eliminar
      const productsToAdd = Array.from(newProductIds).filter(
        (id) => !currentProductIds.has(id)
      );
      const productsToRemove = Array.from(currentProductIds).filter(
        (id) => !newProductIds.has(id)
      );

      // Ejecutar operaciones en lote
      const operations = [];

      // Eliminar relaciones que ya no están seleccionadas
      if (productsToRemove.length > 0) {
        operations.push(
          supabase
            .from("product_suppliers")
            .delete()
            .eq("supplier_id", supplierId)
            .in("product_id", productsToRemove)
        );
      }

      // Agregar nuevas relaciones
      if (productsToAdd.length > 0) {
        const newRelations = productsToAdd.map((productId) => ({
          supplier_id: supplierId,
          product_id: productId,
        }));

        operations.push(
          supabase.from("product_suppliers").insert(newRelations)
        );
      }

      // Ejecutar todas las operaciones
      if (operations.length > 0) {
        const results = await Promise.all(operations);

        // Verificar si hubo errores
        for (const result of results) {
          if (result.error) throw result.error;
        }
      }

      // Éxito
      this.showToast("Productos actualizados exitosamente", "success");

      // Cerrar modal y recargar lista de proveedores
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("supplierProductsModal")
      );
      modal.hide();

      await this.adminSuppliers.loadSuppliers();
    } catch (error) {
      console.error("Error guardando cambios de productos:", error);

      let errorMessage = "Error guardando cambios";
      if (error.message.includes("duplicate key value")) {
        errorMessage = "Algunos productos ya están asociados a este proveedor";
      } else {
        errorMessage = `Error: ${error.message}`;
      }

      this.showToast(errorMessage, "error");
    } finally {
      saveBtn.disabled = false;
      btnText.textContent = "Guardar Cambios";
      btnLoader.classList.add("d-none");
    }
  }

  attachProductSelectionListeners() {
    // Checkboxes de productos
    document.querySelectorAll(".product-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const productId = e.target.getAttribute("data-product-id");
        const productItem = e.target.closest(".product-item");

        if (e.target.checked) {
          this.selectedProducts.add(productId);
          productItem.classList.add("bg-selected");
        } else {
          this.selectedProducts.delete(productId);
          productItem.classList.remove("bg-selected");
        }

        this.renderSelectedProductsList();
      });
    });

    // Click en el item del producto (alternativa al checkbox)
    document.querySelectorAll(".product-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (!e.target.classList.contains("form-check-input")) {
          const productId = item.getAttribute("data-product-id");
          const checkbox = item.querySelector(".product-checkbox");

          if (checkbox) {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event("change"));
          }
        }
      });
    });
  }

  attachModalEventListeners() {
    // Botón de guardar cambios
    document.addEventListener("click", (e) => {
      if (
        e.target.id === "save-products-changes" ||
        e.target.closest("#save-products-changes")
      ) {
        this.saveProductChanges();
      }
    });

    // Botón de limpiar selección
    document.addEventListener("click", (e) => {
      if (
        e.target.id === "clear-selection" ||
        e.target.closest("#clear-selection")
      ) {
        this.clearSelection();
      }
    });
  }

  // Helper methods
  showError(message) {
    // ... implementación completa
  }

  showToast(message, type = "info") {
    // Verificar si existe la función showToast global
    if (typeof window.showToast === "function") {
      window.showToast(message, type);
    }
    // Si no existe, usar SweetAlert2 si está disponible
    else if (typeof Swal !== "undefined") {
      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });

      Toast.fire({
        icon:
          type === "error" ? "error" : type === "success" ? "success" : "info",
        title: message,
      });
    }
    // Si no hay ninguna librería, usar alert nativo
    else {
      alert(message);
    }
  }
}
