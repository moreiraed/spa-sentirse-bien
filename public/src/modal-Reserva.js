function initializeReservaModalFeatures() {
  // Elementos del DOM
  const modal = new bootstrap.Modal(document.getElementById("reservaModal"));
  const steps = document.querySelectorAll(".reserva-step");
  const spaSteps = document.querySelectorAll(".spa-step");
  const btnPrev = document.querySelector(".btn-prev");
  const btnNext = document.querySelector(".btn-next");
  const btnConfirm = document.querySelector(".btn-confirm");
  const profesionalCards = document.querySelectorAll(".profesional-card");
  const timeSlots = document.querySelectorAll(".btn-time-slot");
  const calendarDays = document.querySelector(".calendar-days");
  const calendarMonth = document.querySelector(".calendar-month");
  const prevMonthBtn = document.querySelector(".prev-month");
  const nextMonthBtn = document.querySelector(".next-month");

  // Variables de estado
  let currentStep = 1;
  let selectedProfesional = null;
  let selectedDate = null;
  let selectedTime = null;
  let selectedPayment = "creditCard";
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();

  // Inicialización
  generateCalendar(currentMonth, currentYear);
  updateButtons();

  // Event Listeners
  btnPrev.addEventListener("click", prevStep);
  btnNext.addEventListener("click", nextStep);
  btnConfirm.addEventListener("click", confirmReservation);

  // Selección de profesional
  profesionalCards.forEach((card) => {
    card.addEventListener("click", function () {
      profesionalCards.forEach((c) => c.classList.remove("selected"));
      this.classList.add("selected");
      selectedProfesional = this.querySelector(".card-title").textContent;
    });
  });

  // Selección de horario
  timeSlots.forEach((slot) => {
    slot.addEventListener("click", function () {
      timeSlots.forEach((s) => s.classList.remove("selected"));
      this.classList.add("selected");
      selectedTime = this.textContent;
    });
  });

  // Navegación del calendario
  prevMonthBtn.addEventListener("click", function () {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    generateCalendar(currentMonth, currentYear);
  });

  nextMonthBtn.addEventListener("click", function () {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    generateCalendar(currentMonth, currentYear);
  });

  // Métodos de pago
  document.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      selectedPayment = this.id;
    });
  });

  // Funciones
  function updateButtons() {
    // Actualizar botones de navegación
    btnPrev.disabled = currentStep === 1;

    if (currentStep < steps.length) {
      btnNext.style.display = "inline-block";
      btnConfirm.style.display = "none";
    } else {
      btnNext.style.display = "none";
      btnConfirm.style.display = "inline-block";
    }

    // Actualizar indicador de pasos
    spaSteps.forEach((step) => {
      const stepNumber = parseInt(step.getAttribute("data-step"));
      if (stepNumber < currentStep) {
        step.classList.add("completed");
        step.classList.remove("active");
      } else if (stepNumber === currentStep) {
        step.classList.add("active");
        step.classList.remove("completed");
      } else {
        step.classList.remove("active", "completed");
      }
    });
  }

  function nextStep() {
    // Validaciones antes de avanzar
    if (currentStep === 1 && !selectedProfesional) {
      alert("Por favor selecciona un profesional");
      return;
    }

    if (currentStep === 2 && !selectedDate) {
      alert("Por favor selecciona una fecha");
      return;
    }

    if (currentStep === 3 && !selectedTime) {
      alert("Por favor selecciona un horario");
      return;
    }

    // Avanzar al siguiente paso
    if (currentStep < steps.length) {
      document
        .querySelector(`.reserva-step[data-step="${currentStep}"]`)
        .classList.remove("active");
      currentStep++;
      document
        .querySelector(`.reserva-step[data-step="${currentStep}"]`)
        .classList.add("active");

      // Si es el último paso, actualizar el resumen
      if (currentStep === steps.length) {
        updateReservationSummary();
      }

      updateButtons();
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      document
        .querySelector(`.reserva-step[data-step="${currentStep}"]`)
        .classList.remove("active");
      currentStep--;
      document
        .querySelector(`.reserva-step[data-step="${currentStep}"]`)
        .classList.add("active");
      updateButtons();
    }
  }

  function generateCalendar(month, year) {
    // Configurar el mes y año en el encabezado
    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    calendarMonth.textContent = `${monthNames[month]} ${year}`;

    // Obtener primer día del mes y último día del mes
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Limpiar días anteriores
    calendarDays.innerHTML = "";

    // Añadir días vacíos para el primer día de la semana
    for (let i = 0; i < firstDay.getDay(); i++) {
      const emptyDay = document.createElement("div");
      emptyDay.classList.add("calendar-day", "disabled");
      calendarDays.appendChild(emptyDay);
    }

    // Añadir días del mes
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar la fecha actual

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dayElement = document.createElement("div");
      dayElement.classList.add("calendar-day");
      dayElement.textContent = day;

      const currentDate = new Date(year, month, day);

      // Deshabilitar días pasados
      if (currentDate < today) {
        dayElement.classList.add("disabled");
        dayElement.style.opacity = "0.5";
        dayElement.style.cursor = "not-allowed";
      } else {
        // Manejar selección de día solo para días futuros
        dayElement.addEventListener("click", function () {
          document
            .querySelectorAll(".calendar-day")
            .forEach((d) => d.classList.remove("selected"));
          this.classList.add("selected");

          const selectedDay = this.textContent;
          selectedDate = `${selectedDay} de ${monthNames[month]}, ${year}`;
        });
      }

      calendarDays.appendChild(dayElement);
    }
  }

  function updateReservationSummary() {
    document.getElementById("summary-profesional").textContent =
      selectedProfesional;
    document.getElementById("summary-fecha").textContent = selectedDate;
    document.getElementById("summary-hora").textContent = selectedTime;

    // Traducir método de pago
    let paymentText = "";
    switch (selectedPayment) {
      case "creditCard":
        paymentText = "Tarjeta de crédito";
        break;
      case "paypal":
        paymentText = "PayPal";
        break;
      case "cash":
        paymentText = "Efectivo en el local";
        break;
    }

    document.getElementById("summary-pago").textContent = paymentText;
  }

  function confirmReservation() {
    // Aquí iría la lógica para enviar la reserva al servidor
    alert("Reserva confirmada con éxito. ¡Gracias!");

    // Cerrar el modal después de 2 segundos
    setTimeout(() => {
      modal.hide();
      resetForm();
    }, 2000);
  }

  function resetForm() {
    // Resetear todos los valores
    currentStep = 1;
    selectedProfesional = null;
    selectedDate = null;
    selectedTime = null;
    selectedPayment = "creditCard";

    // Resetear UI
    steps.forEach((step) => step.classList.remove("active"));
    document
      .querySelector(`.reserva-step[data-step="1"]`)
      .classList.add("active");

    profesionalCards.forEach((card) => card.classList.remove("selected"));
    timeSlots.forEach((slot) => slot.classList.remove("selected"));
    document.querySelector("#creditCard").checked = true;
    document.querySelector("#comentarios").value = "";

    // Regenerar calendario con el mes actual
    currentMonth = new Date().getMonth();
    currentYear = new Date().getFullYear();
    generateCalendar(currentMonth, currentYear);

    updateButtons();
  }
};
