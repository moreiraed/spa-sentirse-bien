export class ProfileValidator {
  constructor() {
    this.setupValidations();
  }

  setupValidations() {
    this.setupDNIValidation();
    this.setupTelefonoValidation();
    this.setupNombreApellidoValidation();
    this.setupDireccionValidation();
  }

  setupDNIValidation() {
    const dniInput = document.getElementById("dni");
    if (!dniInput) return;

    dniInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length > 8) value = value.substring(0, 8);
      e.target.value = value;
      this.validateDNI(e.target);
    });

    dniInput.addEventListener("blur", (e) => this.validateDNI(e.target));
  }

  setupTelefonoValidation() {
    const telefonoInput = document.getElementById("telefono");
    if (!telefonoInput) return;

    telefonoInput.addEventListener("input", (e) => {
      let value = e.target.value;
      if (value.startsWith("+")) {
        value = "+" + value.substring(1).replace(/\D/g, "");
      } else {
        value = value.replace(/\D/g, "");
      }
      if (value.length > 15) value = value.substring(0, 15);
      e.target.value = value;
      this.validateTelefono(e.target);
    });

    telefonoInput.addEventListener("blur", (e) =>
      this.validateTelefono(e.target)
    );
  }

  setupNombreApellidoValidation() {
    const nombreInput = document.getElementById("nombre");
    const apellidoInput = document.getElementById("apellido");

    [nombreInput, apellidoInput].forEach((input) => {
      if (!input) return;

      input.addEventListener("input", (e) => {
        let value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-']/g, "");
        if (value.length > 50) value = value.substring(0, 50);
        e.target.value = value;
        this.validateNombreApellido(e.target);
      });

      input.addEventListener("blur", (e) =>
        this.validateNombreApellido(e.target)
      );
    });
  }

  setupDireccionValidation() {
    const direccionInput = document.getElementById("direccion");
    if (!direccionInput) return;

    direccionInput.addEventListener("input", (e) => {
      let value = e.target.value;
      // Permitir letras, números, espacios y caracteres comunes en direcciones
      value = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s\-\#\,\.\°\']/g, "");
      if (value.length > 200) value = value.substring(0, 200);
      e.target.value = value;
      this.validateDireccion(e.target);
    });

    direccionInput.addEventListener("blur", (e) =>
      this.validateDireccion(e.target)
    );
  }

  validateDNI(input) {
    const value = input.value.trim();
    const isValid = value === "" || (value.length === 8 && /^\d+$/.test(value));
    this.updateInputValidation(
      input,
      isValid,
      value === "" ? "" : "El DNI debe tener exactamente 8 dígitos numéricos"
    );
    return isValid;
  }

  validateTelefono(input) {
    const value = input.value.trim();
    let isValid = true;
    let message = "";

    if (value !== "") {
      if (value.startsWith("+")) {
        const digitsOnly = value.substring(1);
        isValid =
          digitsOnly.length >= 10 &&
          digitsOnly.length <= 14 &&
          /^\d+$/.test(digitsOnly);
        message = isValid
          ? ""
          : "El teléfono internacional debe tener entre 10 y 14 dígitos después del +";
      } else {
        isValid =
          value.length >= 7 && value.length <= 10 && /^\d+$/.test(value);
        message = isValid ? "" : "El teléfono debe tener entre 7 y 10 dígitos";
      }
    }

    this.updateInputValidation(input, isValid, message);
    return isValid;
  }

  validateNombreApellido(input) {
    const value = input.value.trim();
    const isValid = value === "" || (value.length >= 2 && value.length <= 50);
    this.updateInputValidation(
      input,
      isValid,
      value === "" ? "" : "Debe tener entre 2 y 50 caracteres"
    );
    return isValid;
  }

  validateDireccion(input) {
    const value = input.value.trim();
    const isValid = value === "" || (value.length >= 5 && value.length <= 200);
    this.updateInputValidation(
      input,
      isValid,
      value === "" ? "" : "La dirección debe tener entre 5 y 200 caracteres"
    );
    return isValid;
  }

  updateInputValidation(input, isValid, message) {
    input.classList.remove("is-valid", "is-invalid");

    const existingFeedback = input.parentNode.querySelector(
      ".invalid-feedback, .valid-feedback"
    );
    if (existingFeedback) existingFeedback.remove();

    if (input.value.trim() === "") return;

    if (isValid) {
      input.classList.add("is-valid");
    } else {
      input.classList.add("is-invalid");
      const feedback = document.createElement("div");
      feedback.className = "invalid-feedback";
      feedback.textContent = message;
      input.parentNode.appendChild(feedback);
    }
  }

  validateForm() {
    const nombre = document.getElementById("nombre");
    const apellido = document.getElementById("apellido");
    const dni = document.getElementById("dni");
    const telefono = document.getElementById("telefono");
    const direccion = document.getElementById("direccion");

    return (
      this.validateNombreApellido(nombre) &&
      this.validateNombreApellido(apellido) &&
      this.validateDNI(dni) &&
      this.validateTelefono(telefono) &&
      this.validateDireccion(direccion)
    );
  }

  getFormData() {
    return {
      nombre: document.getElementById("nombre").value.trim(),
      apellido: document.getElementById("apellido").value.trim(),
      telefono: document.getElementById("telefono").value.trim(),
      dni: document.getElementById("dni").value.trim(),
      direccion: document.getElementById("direccion").value.trim(),
      updated_at: new Date().toISOString(),
    };
  }
}
