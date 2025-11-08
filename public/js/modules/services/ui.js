// public/js/modules/services/ui.js

/**
 * Formatea un número al estilo de moneda COP.
 */
export function formatPrice(price) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price);
}

/**
 * Formatea minutos a un string legible (ej. "1h 30min").
 */
export function formatDuration(minutes) {
  if (!minutes) return "";
  if (minutes < 60) {
    return ` ${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? ` ${hours}h ${remainingMinutes}min`
      : ` ${hours}h`;
  }
}

/**
 * Crea el HTML de una tarjeta de servicio.
 * (Esta es tu función createServiceCard de servicios.js)
 */
export function createServiceCard(servicio) {
  const template = document.getElementById("service-card-template");
  if (!template) {
    console.error("Template 'service-card-template' no encontrado");
    return document.createElement("div"); // Devuelve un div vacío
  }

  const clone = template.content.cloneNode(true);
  const card = clone.querySelector(".service-card");

  card.setAttribute("data-category", servicio.category);

  const image = clone.getElementById("service-image");
  const title = clone.getElementById("service-title");
  const description = clone.getElementById("service-description");
  const duration = clone.getElementById("service-duration");
  const price = clone.getElementById("service-price");
  const reservarBtn = clone.querySelector(".btn-reservar");

  if (image) {
    const imageUrl = servicio.image_url?.trim();
    image.src =
      imageUrl && imageUrl !== ""
        ? imageUrl
        : "assets/img/service-default.webp";
    image.alt = servicio.title;
    image.onerror = () => {
      image.src = "assets/img/service-default.webp";
    };
  }

  if (title) title.textContent = servicio.title;
  if (description) description.textContent = servicio.description;
  if (duration) duration.textContent = formatDuration(servicio.duration);
  if (price) price.textContent = formatPrice(servicio.price);
  if (reservarBtn) {
    reservarBtn.setAttribute("data-servicio-id", servicio.id);
  }

  return clone;
}

/**
 * Muestra el spinner de carga en un contenedor.
 */
export function showLoader(container) {
    container.innerHTML = `
      <div class="col-12 text-center">
          <div class="custom-loader"></div>
          <p class="loader-text">Cargando servicios...</p>
      </div>
    `;
}

/**
 * Muestra un mensaje de "no hay servicios" en un contenedor.
 */
export function showEmptyMessage(container) {
    container.innerHTML = `
        <div class="col-12 text-center">
          <p class="text-muted">No hay servicios disponibles en este momento.</p>
        </div>
      `;
}