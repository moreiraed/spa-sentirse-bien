import { supabase } from "../core/supabase.js";
import { AdminSupplierProducts } from "./admin-supplier-products.js";

export class AdminSuppliers {
  constructor(adminManager) {
    this.adminManager = adminManager;
    this.products = [];
    this.suppliers = [];
    this.supplierProductsManager = new AdminSupplierProducts(this);
  }

  async loadSuppliers() {
    try {
      console.log("Cargando proveedores...");

      // Primero cargar productos
      await this.loadProducts();

      // Luego cargar proveedores
      const { data: suppliers, error } = await supabase
        .from("suppliers")
        .select(`*, product_suppliers ( product_id )`)
        .order("name", { ascending: true });

      if (error) throw error;

      this.suppliers = suppliers || [];
      this.renderSuppliersTable(this.suppliers);
    } catch (error) {
      console.error("Error loading suppliers:", error);
      this.renderSuppliersTable([]);
    }
  }

  async loadProducts() {
    try {
      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, type, category")
        .order("name", { ascending: true });

      if (error) throw error;
      this.products = products || [];
    } catch (error) {
      console.error("Error loading products:", error);
      this.products = [];
    }
  }

  renderSuppliersTable(suppliers) {
    const tbody = document.getElementById("suppliers-table-body");
    if (!tbody) return;

    if (suppliers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4 text-muted">
            No hay proveedores registrados
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = suppliers
      .map((supplier) => {
        const productCount = supplier.product_suppliers
          ? supplier.product_suppliers.length
          : 0;

        return `
        <tr data-supplier-id="${supplier.id}">
          <td>
            <div class="fw-semibold">${supplier.name}</div>
            ${
              supplier.contact_name
                ? `<small class="text-muted">${supplier.contact_name}</small>`
                : ""
            }
          </td>
          <td>
            ${
              supplier.email
                ? `
              <div><i class="bi bi-envelope me-1"></i>${supplier.email}</div>
            `
                : ""
            }
            ${
              supplier.phone
                ? `
              <div><i class="bi bi-telephone me-1"></i>${supplier.phone}</div>
            `
                : ""
            }
          </td>
          <td>${
            supplier.address
              ? this.truncateText(supplier.address, 30)
              : "No especificado"
          }</td>
          <td>
            <span class="badge bg-${
              productCount > 0 ? "success" : "secondary"
            }">
              ${productCount} producto${productCount !== 1 ? "s" : ""}
            </span>
          </td>
          <td>
            <span class="badge bg-${supplier.is_active ? "success" : "danger"}">
              ${supplier.is_active ? "Activo" : "Inactivo"}
            </span>
          </td>
          <td>${new Date(supplier.created_at).toLocaleDateString("es-ES")}</td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary edit-supplier" title="Editar proveedor" data-supplier-id="${
                supplier.id
              }">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-outline-info manage-products" title="Gestionar productos" data-supplier-id="${
                supplier.id
              }">
                <i class="bi bi-box-seam"></i>
              </button>
              <button class="btn btn-outline-danger delete-supplier" title="Eliminar" data-supplier-id="${
                supplier.id
              }">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("");

    this.attachSuppliersEventListeners();
  }

  truncateText(text, maxLength) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  attachSuppliersEventListeners() {
    // Editar proveedor
    document.querySelectorAll(".edit-supplier").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const supplierId = e.currentTarget.getAttribute("data-supplier-id");
        this.editSupplier(supplierId);
      });
    });

    // Gestionar productos
    document.querySelectorAll(".manage-products").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const supplierId = e.currentTarget.getAttribute("data-supplier-id");
        this.manageSupplierProducts(supplierId);
      });
    });

    // Eliminar proveedor
    document.querySelectorAll(".delete-supplier").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const supplierId = e.currentTarget.getAttribute("data-supplier-id");
        const supplierRow = document.querySelector(
          `tr[data-supplier-id="${supplierId}"]`
        );
        const supplierName = supplierRow
          ? supplierRow.querySelector(".fw-semibold").textContent
          : "este proveedor";
        this.deleteSupplier(supplierId, supplierName);
      });
    });
  }

  async handleCreateSupplier(event) {
    event.preventDefault();

    const form = event.target;
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const formData = new FormData(form);
    const supplierData = {
      name: formData.get("name"),
      contact_name: formData.get("contact_name") || null,
      email: formData.get("email") || null,
      phone: formData.get("phone") || null,
      address: formData.get("address") || null,
      website: formData.get("website") || null,
      notes: formData.get("notes") || null,
      is_active: formData.get("is_active") === "true",
    };

    const submitBtn = document.getElementById("btn-crear-proveedor");
    const btnText = submitBtn.querySelector(".btn-text");
    const btnLoader = submitBtn.querySelector(".btn-loader");

    try {
      submitBtn.disabled = true;
      btnText.textContent = "Creando...";
      btnLoader.classList.remove("d-none");

      // Verificar si ya existe un proveedor con el mismo nombre
      const { data: existingSupplier, error: checkError } = await supabase
        .from("suppliers")
        .select("id")
        .eq("name", supplierData.name)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingSupplier) {
        throw new Error("Ya existe un proveedor con ese nombre");
      }

      // Crear proveedor
      const { data: newSupplier, error } = await supabase
        .from("suppliers")
        .insert([supplierData])
        .select()
        .single();

      if (error) throw error;

      // Éxito
      if (typeof showToast === "function") {
        showToast("Proveedor creado exitosamente", "success");
      }

      // Cerrar modal y recargar lista
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("createSupplierModal")
      );
      modal.hide();
      await this.loadSuppliers();

      // Resetear formulario
      form.reset();
      form.classList.remove("was-validated");
    } catch (error) {
      console.error("Error creando proveedor:", error);

      let errorMessage = "Error creando proveedor";
      if (error.message.includes("Ya existe un proveedor con ese nombre")) {
        errorMessage = "Ya existe un proveedor con ese nombre";
      } else if (error.message.includes("duplicate key value")) {
        errorMessage = "Ya existe un proveedor con ese nombre";
      } else {
        errorMessage = `Error: ${error.message}`;
      }

      if (typeof showToast === "function") {
        showToast(errorMessage, "error");
      } else {
        alert(errorMessage);
      }
    } finally {
      submitBtn.disabled = false;
      btnText.textContent = "Crear Proveedor";
      btnLoader.classList.add("d-none");
    }
  }

  async editSupplier(supplierId) {
    try {
      const { data: supplier, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", supplierId)
        .single();

      if (error) throw error;
      if (!supplier) throw new Error("Proveedor no encontrado");

      // Llenar el formulario de edición
      this.fillEditForm(supplier);

      // Mostrar modal
      const modal = new bootstrap.Modal(
        document.getElementById("editSupplierModal")
      );
      modal.show();
    } catch (error) {
      console.error("Error cargando proveedor:", error);
      if (typeof showToast === "function") {
        showToast(`Error al cargar proveedor: ${error.message}`, "error");
      } else {
        alert(`Error al cargar proveedor: ${error.message}`);
      }
    }
  }

  fillEditForm(supplier) {
    document.getElementById("edit-supplier-id").value = supplier.id;
    document.getElementById("edit-supplier-name").value = supplier.name || "";
    document.getElementById("edit-supplier-contact").value =
      supplier.contact_name || "";
    document.getElementById("edit-supplier-email").value = supplier.email || "";
    document.getElementById("edit-supplier-phone").value = supplier.phone || "";
    document.getElementById("edit-supplier-address").value =
      supplier.address || "";
    document.getElementById("edit-supplier-website").value =
      supplier.website || "";
    document.getElementById("edit-supplier-notes").value = supplier.notes || "";
    document.getElementById("edit-supplier-active").value = supplier.is_active
      ? "true"
      : "false";

    // Resetear validación
    const form = document.getElementById("edit-supplier-form");
    form.classList.remove("was-validated");
  }

  async handleUpdateSupplier(event) {
    event.preventDefault();

    const form = event.target;
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const supplierId = document.getElementById("edit-supplier-id").value;
    const supplierData = {
      name: document.getElementById("edit-supplier-name").value,
      contact_name:
        document.getElementById("edit-supplier-contact").value || null,
      email: document.getElementById("edit-supplier-email").value || null,
      phone: document.getElementById("edit-supplier-phone").value || null,
      address: document.getElementById("edit-supplier-address").value || null,
      website: document.getElementById("edit-supplier-website").value || null,
      notes: document.getElementById("edit-supplier-notes").value || null,
      is_active:
        document.getElementById("edit-supplier-active").value === "true",
      updated_at: new Date().toISOString(),
    };

    const submitBtn = document.getElementById("btn-actualizar-proveedor");
    const btnText = submitBtn.querySelector(".btn-text");
    const btnLoader = submitBtn.querySelector(".btn-loader");

    try {
      submitBtn.disabled = true;
      btnText.textContent = "Actualizando...";
      btnLoader.classList.remove("d-none");

      // Verificar si ya existe otro proveedor con el mismo nombre (excluyendo el actual)
      const { data: existingSupplier, error: checkError } = await supabase
        .from("suppliers")
        .select("id")
        .eq("name", supplierData.name)
        .neq("id", supplierId)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingSupplier) {
        throw new Error("Ya existe otro proveedor con ese nombre");
      }

      // Actualizar proveedor
      const { error } = await supabase
        .from("suppliers")
        .update(supplierData)
        .eq("id", supplierId);

      if (error) throw error;

      // Éxito
      if (typeof showToast === "function") {
        showToast("Proveedor actualizado exitosamente", "success");
      }

      // Cerrar modal y recargar lista
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("editSupplierModal")
      );
      modal.hide();
      await this.loadSuppliers();
    } catch (error) {
      console.error("Error actualizando proveedor:", error);

      let errorMessage = "Error actualizando proveedor";
      if (error.message.includes("Ya existe otro proveedor con ese nombre")) {
        errorMessage = "Ya existe otro proveedor con ese nombre";
      } else if (error.message.includes("duplicate key value")) {
        errorMessage = "Ya existe otro proveedor con ese nombre";
      } else {
        errorMessage = `Error: ${error.message}`;
      }

      if (typeof showToast === "function") {
        showToast(errorMessage, "error");
      } else {
        alert(errorMessage);
      }
    } finally {
      submitBtn.disabled = false;
      btnText.textContent = "Actualizar Proveedor";
      btnLoader.classList.add("d-none");
    }
  }

  async deleteSupplier(supplierId, supplierName) {
    if (
      !confirm(
        `¿Estás seguro de que quieres eliminar al proveedor "${supplierName}"?\n\nEsta acción eliminará también todas las asociaciones con productos.`
      )
    ) {
      return;
    }

    try {
      // Primero eliminar las asociaciones con productos
      const { error: relationError } = await supabase
        .from("product_suppliers")
        .delete()
        .eq("supplier_id", supplierId);

      if (relationError) throw relationError;

      // Luego eliminar el proveedor
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", supplierId);

      if (error) throw error;

      if (typeof showToast === "function") {
        showToast("Proveedor eliminado exitosamente", "success");
      } else {
        alert("Proveedor eliminado exitosamente");
      }

      await this.loadSuppliers();
    } catch (error) {
      console.error("Error eliminando proveedor:", error);

      let errorMessage = "Error eliminando proveedor";
      if (error.message.includes("violates foreign key constraint")) {
        errorMessage =
          "No se puede eliminar el proveedor porque tiene productos asociados";
      } else {
        errorMessage = `Error: ${error.message}`;
      }

      if (typeof showToast === "function") {
        showToast(errorMessage, "error");
      } else {
        alert(errorMessage);
      }
    }
  }

  setupEventListeners() {
    // Formulario de crear proveedor
    const createForm = document.getElementById("create-supplier-form");
    if (createForm) {
      createForm.addEventListener("submit", (e) =>
        this.handleCreateSupplier(e)
      );
    }

    // Formulario de editar proveedor
    const editForm = document.getElementById("edit-supplier-form");
    if (editForm) {
      editForm.addEventListener("submit", (e) => this.handleUpdateSupplier(e));
    }

    // Botón de crear proveedor
    const createBtn = document.getElementById("btn-abrir-crear-proveedor");
    if (createBtn) {
      createBtn.addEventListener("click", () => {
        const modal = new bootstrap.Modal(
          document.getElementById("createSupplierModal")
        );
        modal.show();
      });
    }
  }

  async manageSupplierProducts(supplierId) {
    return this.supplierProductsManager.manageSupplierProducts(supplierId);
  }
}
