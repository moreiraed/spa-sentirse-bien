import { supabase } from "../core/supabase.js";

export class ContactManager {
  constructor() {
    this.form = document.getElementById("contacto-form");
    this.init();
  }

  init() {
    if (this.form) {
      this.setupEventListeners();
      this.initServiceSelect();
    }
  }

  setupEventListeners() {
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Validación en tiempo real
    const inputs = this.form.querySelectorAll("input, textarea, select");
    inputs.forEach((input) => {
      input.addEventListener("blur", () => this.validateField(input));
      input.addEventListener("input", () => this.clearFieldError(input));
    });
  }

  initServiceSelect() {
    const serviceSelect = document.getElementById("service");
    if (serviceSelect) {
      // Puedes cargar servicios dinámicamente aquí si es necesario
    }
  }

  validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = "";

    switch (field.type) {
      case "email":
        if (value && !this.isValidEmail(value)) {
          isValid = false;
          errorMessage = "Por favor, ingresa un email válido";
        }
        break;
      case "tel":
        if (value && !this.isValidPhone(value)) {
          isValid = false;
          errorMessage = "Por favor, ingresa un teléfono válido";
        }
        break;
      default:
        if (field.required && !value) {
          isValid = false;
          errorMessage = "Este campo es obligatorio";
        }
        break;
    }

    if (!isValid) {
      this.showFieldError(field, errorMessage);
    } else {
      this.clearFieldError(field);
    }

    return isValid;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone) {
    // Permite formatos internacionales y locales
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  }

  showFieldError(field, message) {
    this.clearFieldError(field);

    field.classList.add("is-invalid");

    const errorDiv = document.createElement("div");
    errorDiv.className = "invalid-feedback";
    errorDiv.textContent = message;

    field.parentNode.appendChild(errorDiv);
  }

  clearFieldError(field) {
    field.classList.remove("is-invalid");
    const existingError = field.parentNode.querySelector(".invalid-feedback");
    if (existingError) {
      existingError.remove();
    }
  }

  validateForm() {
    const requiredFields = this.form.querySelectorAll("[required]");
    let isValid = true;

    requiredFields.forEach((field) => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });

    return isValid;
  }

  async handleSubmit() {
    // Mostrar loading
    const submitBtn = this.form.querySelector(".submit-btn");
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    submitBtn.disabled = true;

    try {
      // Validar formulario
      if (!this.validateForm()) {
        throw new Error(
          "Por favor, completa todos los campos obligatorios correctamente"
        );
      }

      // Obtener datos del formulario
      const formData = new FormData(this.form);
      const contactData = {
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone") || null,
        service: formData.get("service") || null,
        consult_type: formData.get("consult-type") || null,
        message: formData.get("message"),
        newsletter: formData.get("newsletter") === "on",
      };

      // Insertar en Supabase
      const { data, error } = await supabase
        .from("contact_messages")
        .insert([contactData])
        .select();

      if (error) {
        console.error("Error al enviar mensaje:", error);
        throw new Error(
          "Error al enviar el mensaje. Por favor, intenta nuevamente."
        );
      }

      // Éxito
      this.showSuccessMessage();
      this.form.reset();
    } catch (error) {
      console.error("Error en el envío:", error);
      this.showErrorMessage(error.message);
    } finally {
      // Restaurar botón
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }

  showSuccessMessage() {
    if (typeof showToast === "function") {
      showToast(
        "¡Mensaje enviado con éxito! Te contactaremos pronto.",
        "success"
      );
    } else {
      // Fallback si showToast no está disponible
      alert("¡Mensaje enviado con éxito! Te contactaremos pronto.");
    }

    // Mostrar un mensaje en el formulario
    const successDiv = document.createElement("div");
    successDiv.className = "alert alert-success mt-3";
    successDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <strong>¡Mensaje enviado con éxito!</strong> Te contactaremos dentro de las próximas 24 horas.
        `;

    this.form.prepend(successDiv);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
      successDiv.remove();
    }, 5000);
  }

  showErrorMessage(message) {
    if (typeof showToast === "function") {
      showToast(message, "danger");
    } else {
      alert(message);
    }
  }
}

// Función de inicialización para el Router
export function initContactPage() {
  return new ContactManager();
}

// Auto-inicialización si el script se carga directamente en la página
if (document.getElementById("contacto-form")) {
  document.addEventListener("DOMContentLoaded", () => {
    new ContactManager();
  });
}
