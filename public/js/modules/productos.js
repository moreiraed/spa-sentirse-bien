// js/modules/productos.js
import { supabase } from '../core/supabase.js';

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
  // Esto se ejecuta solo una vez para evitar duplicar listeners
  setupAdminListeners();
}

/**
 * Carga productos desde Supabase aplicando filtros y búsqueda
 */
async function applyFiltersAndRender() {
  const grid = document.getElementById('products-grid');
  const loader = document.getElementById('products-loader');

  // ==========================================================
  // 1. ASIGNAR UN TICKET ÚNICO A ESTA BÚSQUEDA
  // ==========================================================
  const currentSearchId = ++latestSearchId;
  // ==========================================================

  // 1. Limpiar el grid (SOLO los productos)
  grid.innerHTML = '';

  // 2. Mostrar el loader (que ahora está fuera del grid)
  if (loader) loader.classList.remove('d-none');

  // Obtener valores de los filtros (esto puede ir aquí)
  const searchTerm = document.getElementById('search-input').value;
  const filterType = document.getElementById('filter-type').value;
  const filterCategory = document.getElementById('filter-category').value;

  try {
    // Construir la consulta de Supabase
    let query = supabase.from('products').select('*');

    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`); // ilike es case-insensitive
    }
    if (filterType) {
      query = query.eq('type', filterType);
    }
    if (filterCategory) {
      query = query.eq('category', filterCategory);
    }

    const { data: products, error } = await query.order('name', { ascending: true });

    // ==========================================================
    // 2. COMPROBAR EL TICKET ANTES DE RENDERIZAR
    // ==========================================================
    // Si el ID de esta búsqueda no es el último, significa que
    // otra búsqueda ya empezó. Descartamos estos resultados.
    if (currentSearchId !== latestSearchId) {
      console.log("Descartando resultados de búsqueda obsoletos.");
      return; // No hacer nada
    }
    // ==========================================================

    if (error) throw error;

    // Ocultar loader
    if (loader) loader.classList.add('d-none');

    // Renderizar productos
    if (products.length === 0) {
      grid.innerHTML = '<p class="text-muted col-12">No se encontraron productos que coincidan con la búsqueda.</p>';
    } else {
      products.forEach(product => {
        grid.appendChild(createProductCard(product));
      });
    }

    // APLICAR CONTROLES DE ADMIN
    if (window.currentUser && window.currentUser.rol === 'admin') {
      addAdminControlsToCards();
    }

  } catch (error) {
    // ==========================================================
    // 3. COMPROBAR EL TICKET TAMBIÉN EN EL ERROR
    // ==========================================================
    // No queremos que un error de una búsqueda vieja
    // pise los resultados de una búsqueda nueva.
    if (currentSearchId !== latestSearchId) {
      console.log("Descartando error de búsqueda obsoleto.");
      return; // No hacer nada
    }
    // ==========================================================

    console.error("Error cargando productos:", error);
    if (loader) loader.classList.add('d-none');
    grid.innerHTML = '<div class="alert alert-danger col-12">Error al cargar productos.</div>';
  }
}

/**
 * Crea el HTML para una tarjeta de producto
 */
function createProductCard(product) {
  const col = document.createElement('div');
  // 1. Usar la misma clase de columna que el template de servicios
  col.className = 'col-md-4 mb-4';

  const imageUrl = product.image_url || './assets/img/default-service.webp';

  // 2. Crear el elemento de la tarjeta
  const card = document.createElement('div');
  // 3. Añadir la clase .product-card (que hereda de .service-card desde nuestro CSS)
  card.className = 'card h-100 product-card';
  card.setAttribute('data-product-id', product.id);

  // 4. Estructura interna basada en el template de servicios (un solo card-body)
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

  // --- LÓGICA DE CLICKS ---  

  // 11. Listener para el botón de "Agregar al Carrito"
  const addToCartBtn = card.querySelector('.btn-add-to-cart');
  addToCartBtn.addEventListener('click', (e) => {
    // 1. Detenemos el click para que no se propague a la tarjeta
    e.stopPropagation();

    // 2. Llamamos a nuestra nueva función de lógica
    // Le pasamos el objeto 'product' completo (que tenemos en createProductCard)
    // y el botón (e.currentTarget) para poder darle feedback visual.
    addProductToCart(product, e.currentTarget);
  });

  col.appendChild(card);
  return col;
}

/**
 * Añade un producto al carrito de productos en localStorage.
 * Maneja la cantidad si el producto ya existe.
 * @param {object} product - El objeto del producto a añadir (ej. {id: '...', name: '...', price: '...'})
 * @param {HTMLElement} button - El botón que fue clickeado, para feedback visual.
 */
function addProductToCart(product, button) {
  console.log("Añadiendo producto:", product.name);

  try {
    // 1. OBTENER EL CARRITO
    // Buscamos en localStorage si ya existe un "carritoProductos".
    const carritoJSON = localStorage.getItem("carritoProductos");

    // 2. PREPARAR EL CARRITO
    // Si 'carritoJSON' no existe (es null), empezamos con un array vacío [].
    // Si existe, lo convertimos de texto (JSON) a un array de objetos.
    let carrito = carritoJSON ? JSON.parse(carritoJSON) : [];

    // 3. VERIFICAR SI EL PRODUCTO YA EXISTE
    // Usamos .findIndex() para buscar en el array si ya hay un item con el mismo ID.
    const existingProductIndex = carrito.findIndex(item => item.id === product.id);

    if (existingProductIndex > -1) {
      // 4.A. SI YA EXISTE:
      // No añadimos un producto nuevo, solo incrementamos la cantidad (quantity).
      // (Usamos '|| 1' por si el producto viejo no tenía cantidad, le asignamos 1 y luego sumamos 1)
      carrito[existingProductIndex].quantity = (carrito[existingProductIndex].quantity || 1) + 1;
      console.log("Cantidad actualizada:", carrito[existingProductIndex].quantity);

    } else {
      // 4.B. SI ES NUEVO:
      // Añadimos el producto completo al array, pero con una propiedad nueva: "quantity: 1".
      // Usamos '...product' para copiar todas las propiedades (id, name, price, etc.).
      carrito.push({ ...product, quantity: 1 });
      console.log("Producto nuevo añadido.");
    }

    // 5. GUARDAR EL CARRITO ACTUALIZADO
    // Convertimos el array (carrito) de nuevo a texto (JSON).
    // Lo guardamos de vuelta en localStorage, sobrescribiendo el valor anterior.
    localStorage.setItem("carritoProductos", JSON.stringify(carrito));

    // 6. DAR FEEDBACK VISUAL AL USUARIO
    // Cambiamos el botón para que el usuario sepa que funcionó.
    button.innerHTML = '<i class="bi bi-check-lg"></i> Agregado';
    button.disabled = true;

    // 7. RESETEAR EL BOTÓN
    // Después de 1.5 segundos, volvemos a poner el botón como estaba.
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
 */
function setupFilterListeners() {

  // Función "debounced" que espera 300ms después de la última llamada
  const debouncedRender = () => {
    // Borra el temporizador anterior
    clearTimeout(debounceTimer);
    // Inicia un nuevo temporizador
    debounceTimer = setTimeout(() => {
      applyFiltersAndRender();
    }, 300); // 300ms de espera
  };

  // 1. Usar la versión "debounced"
  document.getElementById('search-input').addEventListener('input', debouncedRender);
  document.getElementById('filter-type').addEventListener('change', debouncedRender);
  document.getElementById('filter-category').addEventListener('change', debouncedRender);

  // 2. El botón de limpiar filtros (no necesita debounce)
  // Apuntamos al ID, así que la clase 'modern-clear-btn' es solo para estilo
  document.getElementById('clear-filters-btn').addEventListener('click', () => {
    // Cancelar cualquier búsqueda pendiente
    clearTimeout(debounceTimer);

    // Limpiar los campos
    document.getElementById('search-input').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-category').value = '';

    // Ejecutar la renderización inmediatamente
    applyFiltersAndRender();
  });
}

/**
 * Obtiene tipos y categorías únicos de Supabase y rellena los <select>
 */
async function populateFilters() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('type, category');

    if (error) throw error;

    // Usamos Set para obtener valores únicos (ignorando nulos o vacíos)
    const types = [...new Set(data.map(p => p.type).filter(Boolean))];
    const categories = [...new Set(data.map(p => p.category).filter(Boolean))];

    // Poblar selects
    updateSelectOptions('filter-type', types);
    updateSelectOptions('filter-category', categories);

  } catch (error) {
    console.error("Error poblando filtros:", error);
  }
}

/**
 * Helper para rellenar un <select> con opciones
 */
function updateSelectOptions(selectId, options) {
  const select = document.getElementById(selectId);
  // Limpiar opciones viejas (excepto la primera)
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
 * Se llama UNA SOLA VEZ en initProductsPage.
 */
function setupAdminListeners() {
  // Solo si es admin
  if (!window.currentUser || window.currentUser.rol !== 'admin') {
    return;
  }

  console.log("Configurando listeners de Admin...");

  // 1. Mostrar botón "Nuevo Producto"
  const controlsContainer = document.getElementById('admin-controls-container');
  controlsContainer.innerHTML = `
    <button class="btn btn-reservar" id="add-product-btn" style="padding: 12px 25px;">
      <i class="bi bi-plus-circle"></i> Nuevo Producto
    </button>
  `;

  // 2. Listener para el botón "Nuevo Producto"
  document.getElementById('add-product-btn').addEventListener('click', () => {
    productForm.reset();
    document.getElementById('product-id').value = '';
    document.getElementById('productModalLabel').textContent = 'Nuevo Producto';

    // NUEVO: Limpiar el input de archivo y ocultar la vista previa
    document.getElementById('product-image-file').value = null;
    document.getElementById('product-image-url').value = '';
    document.getElementById('image-preview-wrapper').style.display = 'none';

    productModal.show();
  });

  // 3. Listener para el formulario (Crear/Actualizar)
  productForm.addEventListener('submit', handleProductSubmit);

  // 4. Listeners para Editar y Eliminar (usando delegación de eventos en el grid)
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
 * Se llama DESPUÉS de cada renderizado.
 */
function addAdminControlsToCards() {
  document.querySelectorAll('.card[data-product-id]').forEach(card => {
    const productId = card.dataset.productId;
    // Apuntar al nuevo placeholder DENTRO del card-body
    const footer = card.querySelector(`#admin-card-controls-${productId}`);
    if (footer) {
      // (Añadí 'w-100' para que los botones ocupen el ancho si se apilan)
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

  // Obtenemos el archivo del nuevo input (puede estar vacío)
  const imageFile = form.querySelector('#product-image-file').files[0];
  // Obtenemos la URL de la imagen (si ya existía, para editar)
  let imageUrl = form.querySelector('#product-image-url').value;

  try {
    // --- LÓGICA DE SUBIDA DE IMAGEN ---
    if (imageFile) {
      // Si el usuario seleccionó un archivo nuevo, lo subimos
      const newImageUrl = await uploadProductImage(imageFile);
      if (newImageUrl) {
        imageUrl = newImageUrl; // Sobrescribimos la URL con la nueva
      }
    }
    // Si no seleccionó archivo, 'imageUrl' mantendrá su valor
    // (que será la URL antigua si editamos, o vacío si es un producto nuevo sin imagen)
    // ------------------------------------

    const productData = {
      name: form.querySelector('#product-name').value,
      description: form.querySelector('#product-description').value,
      price: parseFloat(form.querySelector('#product-price').value),
      stock: parseInt(form.querySelector('#product-stock').value),
      type: form.querySelector('#product-type').value,
      category: form.querySelector('#product-category').value,
      image_url: imageUrl, // Guardamos la URL final (nueva o la antigua)
    };

    let result;
    if (productId) {
      result = await supabase.from('products').update(productData).eq('id', productId);
    } else {
      result = await supabase.from('products').insert([productData]);
    }

    if (result.error) throw result.error;

    productModal.hide();
    form.querySelector('#product-image-file').value = null; // Limpiar el input de archivo

    await populateFilters();
    await applyFiltersAndRender();

  } catch (error) {
    console.error('Error guardando producto (con subida de imagen):', error);
    alert('Error al guardar el producto: ' + error.message);
  }
}

/**
 * Carga datos del producto en el modal para editar
 */
async function handleEditClick(productId) {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) throw error;

    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-description').value = product.description;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-stock').value = product.stock;
    document.getElementById('product-type').value = product.type;
    document.getElementById('product-category').value = product.category;

    // Guardamos la URL actual en el campo oculto
    document.getElementById('product-image-url').value = product.image_url;

    // Limpiar el selector de archivo
    document.getElementById('product-image-file').value = null;

    // Mostrar la vista previa de la imagen
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
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) throw error;

    // Recargar productos (manteniendo los filtros) y repoblar filtros
    await populateFilters();
    await applyFiltersAndRender();

  } catch (error) {
    console.error('Error eliminando producto:', error);
    alert('Error: ' + error.message);
  }
}

/**
 * Sube un archivo de imagen al Storage de Supabase.
 * @param {File} file - El archivo a subir.
 * @returns {Promise<string>} - La URL pública de la imagen subida.
 */
async function uploadProductImage(file) {
  if (!file) return null;

  // Crea un nombre único para evitar colisiones
  const fileName = `product-${Date.now()}-${file.name}`;
  const filePath = `${fileName}`; // Ruta dentro del bucket

  console.log("Subiendo imagen:", filePath);

  // 1. Subir el archivo al bucket 'product-images'
  const { error: uploadError } = await supabase.storage
    .from('product-images') // El nombre de tu bucket
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false // no sobrescribir
    });

  if (uploadError) {
    console.error("Error al subir imagen:", uploadError);
    throw uploadError;
  }

  // 2. Obtener la URL pública del archivo que acabamos de subir
  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  if (!data || !data.publicUrl) {
    throw new Error("No se pudo obtener la URL pública después de la subida.");
  }

  console.log("URL pública obtenida:", data.publicUrl);
  return data.publicUrl;
}