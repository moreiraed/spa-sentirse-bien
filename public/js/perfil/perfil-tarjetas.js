import { showToast } from "../auth/auth-utils.js";
import { supabase } from "../core/supabase.js";

export class ProfileTarjetas {
  constructor() {
    this.tarjetas = [];
  }

  // Cargar tarjetas desde Supabase
  async loadTarjetasFromSupabase() {
    try {
      const user = window.currentUser;
      if (!user?.id) {
        console.error("No hay usuario autenticado");
        return [];
      }

      const { data, error } = await supabase
        .from("user_cards")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Mapear los datos de Supabase a nuestro formato interno
      this.tarjetas = data.map((card) => ({
        id: card.id,
        numero: card.numero_hash, // Nota: esto es el hash, no el número real
        titular: card.titular,
        vencimiento: card.vencimiento,
        cvv: card.cvv_hash, // Nota: esto es el hash, no el CVV real
        tipo: card.tipo,
        marca: card.marca,
        fechaCreacion: card.created_at,
        ultimos4: card.ultimos4,
        is_primary: card.is_primary,
      }));

      return this.tarjetas;
    } catch (error) {
      console.error("Error cargando tarjetas desde Supabase:", error);
      showToast("Error al cargar las tarjetas", "error");
      return [];
    }
  }

  // Guardar tarjeta en Supabase
  async saveTarjetaToSupabase(tarjetaData) {
    try {
      const user = window.currentUser;
      if (!user?.id) {
        throw new Error("No hay usuario autenticado");
      }

      // Verificar si ya existe una tarjeta con los mismos últimos 4 dígitos
      const { data: existingCards, error: checkError } = await supabase
        .from("user_cards")
        .select("id")
        .eq("user_id", user.id)
        .eq("ultimos4", tarjetaData.ultimos4)
        .eq("marca", tarjetaData.marca)
        .eq("is_active", true);

      if (checkError) {
        throw checkError;
      }

      if (existingCards && existingCards.length > 0) {
        throw new Error("Esta tarjeta ya está guardada");
      }

      // Si es la primera tarjeta, será primaria
      const { count, error: countError } = await supabase
        .from("user_cards")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (countError) {
        throw countError;
      }

      const isPrimary = count === 0;

      // Crear hash del número de tarjeta y CVV (en un entorno real usaríamos bcrypt)
      const numeroHash = this.hashData(tarjetaData.numero);
      const cvvHash = this.hashData(tarjetaData.cvv);

      const { data, error } = await supabase
        .from("user_cards")
        .insert([
          {
            user_id: user.id,
            numero_hash: numeroHash,
            ultimos4: tarjetaData.ultimos4,
            titular: tarjetaData.titular,
            vencimiento: tarjetaData.vencimiento,
            cvv_hash: cvvHash,
            tipo: tarjetaData.tipo,
            marca: tarjetaData.marca,
            is_primary: isPrimary,
          },
        ])
        .select();

      if (error) {
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error("Error guardando tarjeta en Supabase:", error);
      throw error;
    }
  }

  // Eliminar tarjeta de Supabase (soft delete)
  async eliminarTarjetaFromSupabase(tarjetaId) {
    try {
      const { error } = await supabase
        .from("user_cards")
        .update({ is_active: false })
        .eq("id", tarjetaId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error eliminando tarjeta de Supabase:", error);
      throw error;
    }
  }

  // Función simple de hash (en producción usar bcrypt)
  hashData(data) {
    // Esta es una implementación básica - en producción usar bcrypt
    return btoa(data).split("").reverse().join("");
  }

  // Validar formulario de tarjeta (se mantiene igual)
  validarFormularioTarjeta() {
    const numero = document
      .getElementById("card-number")
      .value.replace(/\s/g, "");
    const titular = document.getElementById("card-holder").value.trim();
    const vencimiento = document.getElementById("card-expiry").value;
    const cvv = document.getElementById("card-cvv").value;

    // Validar que no estén vacíos
    if (!numero || !titular || !vencimiento || !cvv) {
      showToast("Por favor, completa todos los campos", "error");
      return false;
    }

    // Validar número de tarjeta (mínimo 13 dígitos)
    if (numero.replace(/\D/g, "").length < 13) {
      showToast("El número de tarjeta debe tener al menos 13 dígitos", "error");
      return false;
    }

    // Validar formato de vencimiento (MM/AA)
    if (!/^\d{2}\/\d{2}$/.test(vencimiento)) {
      showToast("Formato de vencimiento inválido (use MM/AA)", "error");
      return false;
    }

    // Validar CVV (3-4 dígitos)
    if (!/^\d{3,4}$/.test(cvv)) {
      showToast("CVV debe tener 3 o 4 dígitos", "error");
      return false;
    }

    // Validar titular (solo letras y espacios)
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(titular)) {
      showToast("El nombre del titular solo puede contener letras", "error");
      return false;
    }

    return true;
  }

  // Obtener datos del formulario (se mantiene igual)
  getCardFormData() {
    return {
      numero: document.getElementById("card-number").value.replace(/\s/g, ""),
      titular: document
        .getElementById("card-holder")
        .value.trim()
        .toUpperCase(),
      vencimiento: document.getElementById("card-expiry").value,
      cvv: document.getElementById("card-cvv").value,
      tipo: document.getElementById("card-type").value,
      marca: document.getElementById("card-brand").value,
      ultimos4: document
        .getElementById("card-number")
        .value.replace(/\s/g, "")
        .slice(-4),
    };
  }

  // Agregar nueva tarjeta (actualizado)
  async agregarTarjeta(tarjetaData) {
    try {
      const savedCard = await this.saveTarjetaToSupabase(tarjetaData);

      // Recargar las tarjetas desde Supabase
      await this.loadTarjetasFromSupabase();

      return savedCard;
    } catch (error) {
      throw error;
    }
  }

  // Eliminar tarjeta (actualizado)
  async eliminarTarjeta(tarjetaId) {
    try {
      await this.eliminarTarjetaFromSupabase(tarjetaId);
      await this.loadTarjetasFromSupabase();
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Obtener todas las tarjetas
  getTarjetas() {
    return this.tarjetas;
  }

  // Renderizar tarjetas en la UI (actualizado para usar is_primary)
  async renderTarjetas() {
    const tarjetasList = document.getElementById("tarjetas-list");
    if (!tarjetasList) return;

    // Cargar tarjetas desde Supabase primero
    await this.loadTarjetasFromSupabase();

    if (this.tarjetas.length === 0) {
      tarjetasList.innerHTML = `
      <div class="col-12">
        <div class="text-center py-5">
          <i class="bi bi-credit-card-2-front display-1 text-muted mb-3"></i>
          <h5 class="text-muted">No tienes tarjetas guardadas</h5>
          <p class="text-muted mb-4">Agrega tu primera tarjeta para pagar más rápido</p>
        </div>
      </div>
    `;
      return;
    }

    tarjetasList.innerHTML = this.tarjetas
      .map(
        (tarjeta) => `
      <div class="col-md-6 mb-4">
        <div class="card border-0 shadow-sm tarjeta-credito-container ${
          tarjeta.marca
        } h-100" data-card-id="${tarjeta.id}">
          <div class="card-body position-relative tarjeta-credito-body">
            <!-- Header de la tarjeta -->
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div class="d-flex align-items-center">
                <div class="card-logo ${tarjeta.marca} me-3"></div>
                <div>
                  <h6 class="card-title mb-1 fw-bold">${this.getCardBrandName(
                    tarjeta.marca
                  )}</h6>
                  <span class="badge ${
                    tarjeta.tipo === "credito"
                      ? "badge-credito"
                      : "badge-debito"
                  }">
                    ${tarjeta.tipo === "credito" ? "Crédito" : "Débito"}
                  </span>
                </div>
              </div>
              <button class="btn btn-eliminar-tarjeta btn-sm" onclick="profileManager.eliminarTarjeta('${
                tarjeta.id
              }')" 
                      title="Eliminar tarjeta" data-bs-toggle="tooltip">
                <i class="bi bi-trash"></i>
              </button>
            </div>
            
            <!-- Número de tarjeta -->
            <div class="card-number-display mb-3 text-center py-2 rounded">
              <span class="text-muted fs-6">•••• •••• ••••</span>
              <span class="fw-bold fs-5">${tarjeta.ultimos4}</span>
            </div>
            
            <!-- Información de la tarjeta -->
            <div class="row">
              <div class="col-7">
                <div class="mb-2">
                  <small class="text-muted fw-bold">TITULAR</small>
                  <div class="fw-semibold text-truncate">${
                    tarjeta.titular
                  }</div>
                </div>
              </div>
              <div class="col-5">
                <div class="mb-2">
                  <small class="text-muted fw-bold">VENCE</small>
                  <div class="fw-semibold">${tarjeta.vencimiento}</div>
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="mt-3 pt-3 border-top">
              <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted">
                  <i class="bi bi-calendar3 me-1"></i>
                  ${new Date(tarjeta.fechaCreacion).toLocaleDateString(
                    "es-ES",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </small>
                <span class="badge badge-tarjeta-estado">
                  ${tarjeta.is_primary ? "PRINCIPAL" : "SECUNDARIA"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
      )
      .join("");

    // Inicializar tooltips
    this.initializeTooltips();
  }

  // Los demás métodos se mantienen igual...
  initializeTooltips() {
    const tooltipTriggerList = [].slice.call(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  getCardBrandName(brand) {
    const brands = {
      visa: "Visa",
      mastercard: "Mastercard",
      amex: "American Express",
      other: "Tarjeta",
    };
    return brands[brand] || "Tarjeta";
  }

  setupCardFormListeners() {
    const cardForm = document.getElementById("add-card-form");
    if (cardForm) {
      cardForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (window.profileManager) {
          window.profileManager.handleCardAdd(e);
        }
      });
    }

    const cardNumberInput = document.getElementById("card-number");
    if (cardNumberInput) {
      cardNumberInput.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 16) value = value.substring(0, 16);
        value = value.replace(/(\d{4})(?=\d)/g, "$1 ");
        e.target.value = value;
        this.autoDetectCardBrand(value);
      });
    }

    const cardExpiryInput = document.getElementById("card-expiry");
    if (cardExpiryInput) {
      cardExpiryInput.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 4) value = value.substring(0, 4);
        if (value.length >= 2) {
          value = value.substring(0, 2) + "/" + value.substring(2);
        }
        e.target.value = value;
      });
    }

    const cardCvvInput = document.getElementById("card-cvv");
    if (cardCvvInput) {
      cardCvvInput.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 4) value = value.substring(0, 4);
        e.target.value = value;
      });
    }
  }

  autoDetectCardBrand(cardNumber) {
    const cleanNumber = cardNumber.replace(/\s/g, "");
    const brandSelect = document.getElementById("card-brand");

    if (!brandSelect) return;

    if (/^4/.test(cleanNumber)) {
      brandSelect.value = "visa";
    } else if (/^5[1-5]/.test(cleanNumber)) {
      brandSelect.value = "mastercard";
    } else if (/^3[47]/.test(cleanNumber)) {
      brandSelect.value = "amex";
    }
  }

  showCardSuccessAnimation(cardId) {
    const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
    if (cardElement) {
      cardElement.classList.add("tarjeta-added");
      setTimeout(() => {
        cardElement.classList.remove("tarjeta-added");
      }, 600);
    }
  }
}
