// js/modules/productos.js
// ¡YA NO IMPORTAMOS SUPABASE!
import { productRepository } from '../repositories/ProductRepository.js';

// Variables globales para el modal y formulario
let productModal = null;
let productForm = null;
let debounceTimer;
let latestSearchId = 0;

/**
 * Función principal para inicializar la página de productos
 */
export async function initProductsPage() {
  console.log("Inicializando página de productos...");

  // Obtener referencias del DOM
  productModal = new bootstrap.Modal(document.getElementById('productModal'));
  productForm = document.getElementById('product-form');

  // 1. Cargar las opciones de los filtros (Tipos y Categorías)
  await populateFilters();

  // 2. Cargar productos (con filtros si los hay)
  await applyFiltersAndRender();

  // 3. Configurar los listeners para los filtros y búsqueda
  setupFilterListeners();

  // 4. Configurar listeners de Admin (si es admin)
  setupAdminListeners();
}

/**
 * Carga productos desde el REPOSITORIO aplicando filtros y búsqueda
 */
async function applyFiltersAndRender() {
  const grid = document.getElementById('products-grid');
  const loader = document.getElementById('products-loader');

  const currentSearchId = ++latestSearchId;
  grid.innerHTML = '';
  if (loader) loader.classList.remove('d-none');

  // Obtener valores de los filtros
  const filters = {
    searchTerm: document.getElementById('search-input').value,
    filterType: document.getElementById('filter-type').value,
    filterCategory: document.getElementById('filter-category').value
  };
  
  try {
    // Ya no construimos la query, solo llamamos al repositorio.
    const products = await productRepository.getFiltered(filters);

    // Comprobar si esta es la última búsqueda
    if (currentSearchId !== latestSearchId) {
      console.log("Descartando resultados de búsqueda obsoletos.");
      return; 
    }

    if (loader) loader.classList.add('d-none');

    // Renderizar productos
    if (products.length === 0) {
      grid.innerHTML = '<p class="text-muted col-12">No se encontraron productos que coincidan con la búsqueda.</p>';
    } else {
      products.forEach(product => {
        // ¡Esta función ya no está vacía!
        grid.appendChild(createProductCard(product));
      });
    }

    // APLICAR CONTROLES DE ADMIN
    if (window.currentUser && window.currentUser.rol === 'admin') {
      addAdminControlsToCards();
    }

  } catch (error) {
    if (currentSearchId !== latestSearchId) {
      console.log("Descartando error de búsqueda obsoleto.");
      return; 
    }
    console.error("Error cargando productos:", error);
    if (loader) loader.classList.add('d-none');
    grid.innerHTML = '<div class="alert alert-danger col-12">Error al cargar productos.</div>';
  }
}

/**
 * Crea el HTML para una tarjeta de producto
 * (Esta función se mantiene 100% igual, es lógica de UI)
 */
function createProductCard(product) {
  const col = document.createElement('div');
  col.className = 'col-md-4 mb-4';
  const imageUrl = product.image_url || './assets/img/default-service.webp';
  const card = document.createElement('div');
  card.className = 'card h-100 product-card';
  card.setAttribute('data-product-id', product.id);
  card.innerHTML = `
        <img src="${imageUrl}" class="card-img-top" alt="${product.name}" />
        <div class="card-body"> 
            <h5 class="card-title">${product.name}</h5>
            <p class="card-text">${product.description || ''}</p>
            <hr class="my-3" style="border-top: 2px solid var(--color-separator);"> 
            <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="text-muted" style="font-size: 0.9rem;">
                    <i class="bi bi-box"></i> Stock: ${product.stock}
                </span>
                <span class="h5 mb-0 product-price">$${product.price}</span>
            </div>
            <div class="text-center">
                <button class="btn btn-add-to-cart-styled btn-add-to-cart" data-product-id="${product.id}">
                    <i class="bi bi-cart-plus"></i> Agregar al Carrito
                </button>
            </div>
            <div class="admin-controls-placeholder mt-2" id="admin-card-controls-${product.id}">
                </div>
        </div>
    `;
  const addToCartBtn = card.querySelector('.btn-add-to-cart');
  addToCartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    addProductToCart(product, e.currentTarget);
  });
  col.appendChild(card);
  return col;
}

/**
 * Añade un producto al carrito de productos en localStorage.
 * (Esta función se mantiene 100% igual, es lógica de localStorage)
 */
function addProductToCart(product, button) {
  console.log("Añadiendo producto:", product.name);
  try {
    const carritoJSON = localStorage.getItem("carritoProductos");
    let carrito = carritoJSON ? JSON.parse(carritoJSON) : [];
    const existingProductIndex = carrito.findIndex(item => item.id === product.id);

    if (existingProductIndex > -1) {
      carrito[existingProductIndex].quantity = (carrito[existingProductIndex].quantity || 1) + 1;
    } else {
      carrito.push({ ...product, quantity: 1 });
    }

    localStorage.setItem("carritoProductos", JSON.stringify(carrito));

    button.innerHTML = '<i class="bi bi-check-lg"></i> Agregado';
    button.disabled = true;

    setTimeout(() => {
      button.innerHTML = '<i class="bi bi-cart-plus"></i> Agregar al Carrito';
      button.disabled = false;
    }, 1500);
  } catch (error) {
    console.error("Error al añadir al carrito de productos:", error);
    alert("No se pudo añadir el producto al carrito.");
  }
}

/**
 * Añade los listeners para los filtros (se llama una vez)
 * (Esta función se mantiene 100% igual, es lógica de eventos)
 */
function setupFilterListeners() {
  const debouncedRender = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      applyFiltersAndRender();
    }, 300); 
  };
  document.getElementById('search-input').addEventListener('input', debouncedRender);
  document.getElementById('filter-type').addEventListener('change', debouncedRender);
  document.getElementById('filter-category').addEventListener('change', debouncedRender);
  document.getElementById('clear-filters-btn').addEventListener('click', () => {
    clearTimeout(debounceTimer);
    document.getElementById('search-input').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-category').value = '';
    applyFiltersAndRender();
  });
}

/**
 * Obtiene tipos y categorías únicos del REPOSITORIO y rellena los <select>
 */
async function populateFilters() {
  try {
    // El repositorio ya nos da los datos limpios y únicos.
    const { types, categories } = await productRepository.getUniqueTypesAndCategories();

    // Poblar selects
    updateSelectOptions('filter-type', types);
    updateSelectOptions('filter-category', categories);

  } catch (error) {
    console.error("Error poblando filtros:", error);
  }
}

/**
 * Helper para rellenar un <select> con opciones
 * (Esta función se mantiene 100% igual, es lógica de UI)
 */
function updateSelectOptions(selectId, options) {
  const select = document.getElementById(selectId);
  select.options.length = 1;
  options.sort().forEach(option => {
    select.add(new Option(option, option));
  });
}

// ===========================================
// FUNCIONES DE ADMINISTRADOR
// ===========================================

/**
 * Configura los listeners de admin (botón "Nuevo", formulario, editar/eliminar)
 * (Esta función se mantiene 100% igual, es lógica de eventos)
 */
function setupAdminListeners() {
  if (!window.currentUser || window.currentUser.rol !== 'admin') {
    return;
  }
  console.log("Configurando listeners de Admin...");
  const controlsContainer = document.getElementById('admin-controls-container');
  controlsContainer.innerHTML = `
    <button class="btn btn-reservar" id="add-product-btn" style="padding: 12px 25px;">
      <i class="bi bi-plus-circle"></i> Nuevo Producto
    </button>
  `;
  document.getElementById('add-product-btn').addEventListener('click', () => {
    productForm.reset();
    document.getElementById('product-id').value = '';
    document.getElementById('productModalLabel').textContent = 'Nuevo Producto';
    document.getElementById('product-image-file').value = null;
    document.getElementById('product-image-url').value = '';
    document.getElementById('image-preview-wrapper').style.display = 'none';
    productModal.show();
  });
  productForm.addEventListener('submit', handleProductSubmit);
  document.getElementById('products-grid').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
      handleEditClick(editBtn.dataset.id);
    }
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
      handleDeleteClick(deleteBtn.dataset.id);
    }
  });
}

/**
 * Añade los botones de "Editar" y "Eliminar" a las tarjetas
 * (Esta función se mantiene 100% igual, es lógica de UI)
 */
function addAdminControlsToCards() {
  document.querySelectorAll('.card[data-product-id]').forEach(card => {
    const productId = card.dataset.productId;
    const footer = card.querySelector(`#admin-card-controls-${productId}`);
    if (footer) {
      footer.innerHTML = `
        <div class="d-flex justify-content-center w-100">
            <button class="btn btn-sm btn-outline-secondary edit-btn w-50" data-id="${productId}">
                <i class="bi bi-pencil-square"></i> Editar
            </button>
            <button class="btn btn-sm btn-outline-danger delete-btn ms-2 w-50" data-id="${productId}">
                <i class="bi bi-trash"></i> Eliminar
            </button>
        </div>
      `;
    }
  });
}

/**
 * Maneja el envío del formulario (Crear o Actualizar)
 */
async function handleProductSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const productId = form.querySelector('#product-id').value;
  const imageFile = form.querySelector('#product-image-file').files[0];
  let imageUrl = form.querySelector('#product-image-url').value;

  try {
    // --- LÓGICA DE SUBIDA DE IMAGEN ---
    if (imageFile) {
      // Llamamos al repositorio para subir la imagen.
      const newImageUrl = await productRepository.uploadImage(imageFile);
      if (newImageUrl) {
        imageUrl = newImageUrl; 
      }
    }
    // ------------------------------------

    const productData = {
      name: form.querySelector('#product-name').value,
      description: form.querySelector('#product-description').value,
      price: parseFloat(form.querySelector('#product-price').value),
      stock: parseInt(form.querySelector('#product-stock').value),
      type: form.querySelector('#product-type').value,
      category: form.querySelector('#product-category').value,
      image_url: imageUrl, 
    };

    // Llamamos al repositorio para crear o actualizar.
    if (productId) {
      await productRepository.update(productId, productData);
    } else {
      await productRepository.create(productData);
    }

    productModal.hide();
    form.querySelector('#product-image-file').value = null; 

    await populateFilters();
    await applyFiltersAndRender();

  } catch (error) {
    console.error('Error guardando producto:', error);
    alert('Error al guardar el producto: ' + error.message);
  }
}

/**
 * Carga datos del producto en el modal para editar
 */
async function handleEditClick(productId) {
  try {
    // Llamamos al repositorio para obtener el producto.
    const product = await productRepository.getById(productId);

    if (!product) throw new Error("Producto no encontrado");

    // Rellenar el formulario (lógica de UI sin cambios)
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-description').value = product.description;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-stock').value = product.stock;
    document.getElementById('product-type').value = product.type;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-image-url').value = product.image_url;
    document.getElementById('product-image-file').value = null;
    const previewWrapper = document.getElementById('image-preview-wrapper');
    const previewImg = document.getElementById('image-preview');
    if (product.image_url) {
      previewImg.src = product.image_url;
      previewWrapper.style.display = 'block';
    } else {
      previewWrapper.style.display = 'none';
    }
    document.getElementById('productModalLabel').textContent = 'Editar Producto';
    productModal.show();

  } catch (error)
  {
    console.error('Error obteniendo producto para editar:', error);
    alert('Error: ' + error.message);
  }
}

/**
 * Elimina un producto
 */
async function handleDeleteClick(productId) {
  if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
    return;
  }

  try {
    // Llamamos al repositorio para eliminar.
    await productRepository.delete(productId);
    await populateFilters();
    await applyFiltersAndRender();

  } catch (error) {
    console.error('Error eliminando producto:', error);
    alert('Error: ' + error.message);
  }
}

export async function updateBookingStatusInAdmin(bookingId, newStatus) {
  try {
    const result = await api.updateBookingStatus(bookingId, newStatus);
    
    if (newStatus === 'confirmed' || newStatus === 'paid') {
      // El trigger se encargará de descontar el stock automáticamente
      showSafeToast(`Estado actualizado a ${newStatus}. Stock descontado.`, "success");
    } else {
      showSafeToast(`Estado actualizado a ${newStatus}`, "success");
    }
    
    return result;
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    showSafeToast("Error al actualizar estado: " + error.message, "danger");
    throw error;
  }
}