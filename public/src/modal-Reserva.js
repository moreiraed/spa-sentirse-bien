import {
  collection,
  addDoc,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import { db, auth } from "./firebase-config.js";

let servicioReservaActual = null;
let selectedProfesional = null;

export function initializeReservaModalFeatures() {
  console.log("Inicializando características del modal de reserva");

  window.abrirModalReserva = async function (servicioData) {
    console.log("Abriendo modal con servicio:", servicioData);
    servicioReservaActual = servicioData;
    selectedProfesional = null;
    await actualizarVistaReserva();

    const reservaModal = new bootstrap.Modal(
      document.getElementById("reservaModal")
    );
    reservaModal.show();
  };

  async function actualizarVistaReserva() {
    if (!servicioReservaActual) {
      console.error("No hay servicio seleccionado");
      return;
    }

    console.log("Actualizando vista con servicio:", servicioReservaActual);

    const tituloModal = document.getElementById("reservaModalLabel");
    if (tituloModal) {
      tituloModal.textContent = `Reserva para ${servicioReservaActual.title}`;
    }

    const resumenServicio = document.getElementById("summary-servicio");
    if (resumenServicio) {
      resumenServicio.textContent = servicioReservaActual.title;
    }

    const profesionalesContainer = document.querySelector(".reserva-step[data-step='1'] .row");
    if (!profesionalesContainer) {
      console.error("No se encontró el contenedor de profesionales");
      return;
    }

    console.log("Contenedor de profesionales encontrado");
    profesionalesContainer.innerHTML = "";

    try {
      console.log("Consultando profesionales para el servicio:", servicioReservaActual.title);
      const q = query(
        collection(db, "users"),
        where("rol", "==", "profesional")
      );
      const querySnapshot = await getDocs(q);
      
      let profesionalesEncontrados = false;
      console.log("Número de profesionales encontrados:", querySnapshot.size);

      querySnapshot.forEach((doc) => {
        const profesional = doc.data();
        console.log("Profesional encontrado:", profesional);
        
        // Verificar si el profesional ofrece el servicio seleccionado
        const nombreCompleto = `${profesional.nombre} ${profesional.apellido}`;
        console.log("Nombre completo del profesional:", nombreCompleto);
        console.log("Servicios del profesional:", profesional.solicitudProfesional?.servicios);
        
        if (profesional.solicitudProfesional?.servicios?.includes(servicioReservaActual.title)) {
          console.log("Profesional ofrece el servicio:", nombreCompleto);
          profesionalesEncontrados = true;
          const profesionalCard = document.createElement("div");
          profesionalCard.className = "col-md-6 mb-3";
          profesionalCard.innerHTML = `
            <div class="card profesional-card" data-profesional="${nombreCompleto}">
              <div class="card-img-top d-flex align-items-center justify-content-center bg-light" style="height: 180px;">
                <i class="fas fa-user-circle fa-5x text-secondary"></i>
              </div>
              <div class="card-body text-center">
                <h5 class="card-title">${nombreCompleto}</h5>
                <p class="card-text">${profesional.solicitudProfesional.profesion}</p>
                <button type="button" class="btn btn-sm btn-outline-spa-primary select-profesional">Seleccionar</button>
              </div>
            </div>
          `;
          profesionalesContainer.appendChild(profesionalCard);

          const selectButton = profesionalCard.querySelector(".select-profesional");
          selectButton.addEventListener("click", function() {
            console.log("Botón de selección clickeado");
            document.querySelectorAll(".profesional-card").forEach(card => {
              card.classList.remove("selected");
              console.log("Removiendo clase selected de:", card.dataset.profesional);
            });
            const card = profesionalCard.querySelector(".profesional-card");
            card.classList.add("selected");
            selectedProfesional = nombreCompleto;
            console.log("Profesional seleccionado:", selectedProfesional);
          });
        }
      });

      if (!profesionalesEncontrados) {
        console.log("No se encontraron profesionales para este servicio");
        profesionalesContainer.innerHTML = `
          <div class="col-12 text-center">
            <p class="text-muted">No hay profesionales disponibles para este servicio en este momento.</p>
          </div>
        `;
      }
    } catch (error) {
      console.error("Error al cargar profesionales:", error);
      profesionalesContainer.innerHTML = `
        <div class="col-12 text-center">
          <p class="text-danger">Error al cargar los profesionales. Por favor, intenta nuevamente.</p>
        </div>
      `;
    }
  }

  const modal = new bootstrap.Modal(document.getElementById("reservaModal"));
  const steps = document.querySelectorAll(".reserva-step");
  const spaSteps = document.querySelectorAll(".spa-step");
  const btnPrev = document.querySelector(".btn-prev");
  const btnNext = document.querySelector(".btn-next");
  const btnConfirm = document.querySelector(".btn-confirm");
  const timeSlots = document.querySelectorAll(".btn-time-slot");
  const calendarDays = document.querySelector(".calendar-days");
  const calendarMonth = document.querySelector(".calendar-month");
  const prevMonthBtn = document.querySelector(".prev-month");
  const nextMonthBtn = document.querySelector(".next-month");

  let currentStep = 1;
  let selectedDate = null;
  let selectedTime = null;
  let selectedPayment = "creditCard";
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();

  generateCalendar(currentMonth, currentYear);
  updateButtons();

  btnPrev.addEventListener("click", prevStep);
  btnNext.addEventListener("click", nextStep);
  btnConfirm.addEventListener("click", confirmReservation);

  timeSlots.forEach((slot) => {
    slot.addEventListener("click", function () {
      timeSlots.forEach((s) => s.classList.remove("selected"));
      this.classList.add("selected");
      selectedTime = this.textContent;
    });
  });

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

  document.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      selectedPayment = this.id;
    });
  });

  function updateButtons() {
    btnPrev.disabled = currentStep === 1;

    if (currentStep < steps.length) {
      btnNext.style.display = "inline-block";
      btnConfirm.style.display = "none";
    } else {
      btnNext.style.display = "none";
      btnConfirm.style.display = "inline-block";
    }

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
    console.log("Intentando avanzar al siguiente paso");
    console.log("Paso actual:", currentStep);
    console.log("Profesional seleccionado:", selectedProfesional);
    
    if (currentStep === 1) {
      if (!selectedProfesional) {
        console.log("No hay profesional seleccionado");
        alert("Por favor selecciona un profesional");
        return;
      }
      console.log("Profesional válido, avanzando al siguiente paso");
    }

    if (currentStep === 2 && !selectedDate) {
      alert("Por favor selecciona una fecha");
      return;
    }

    if (currentStep === 3 && !selectedTime) {
      alert("Por favor selecciona un horario");
      return;
    }

    if (currentStep < steps.length) {
      document
        .querySelector(`.reserva-step[data-step="${currentStep}"]`)
        .classList.remove("active");
      currentStep++;
      document
        .querySelector(`.reserva-step[data-step="${currentStep}"]`)
        .classList.add("active");

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

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    calendarDays.innerHTML = "";

    for (let i = 0; i < firstDay.getDay(); i++) {
      const emptyDay = document.createElement("div");
      emptyDay.classList.add("calendar-day", "disabled");
      calendarDays.appendChild(emptyDay);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dayElement = document.createElement("div");
      dayElement.classList.add("calendar-day");
      dayElement.textContent = day;

      const currentDate = new Date(year, month, day);

      if (currentDate < today) {
        dayElement.classList.add("disabled");
        dayElement.style.opacity = "0.5";
        dayElement.style.cursor = "not-allowed";
      } else {
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
    console.log("Actualizando resumen de reserva");
    console.log("Profesional:", selectedProfesional);
    console.log("Fecha:", selectedDate);
    console.log("Hora:", selectedTime);
    console.log("Pago:", selectedPayment);

    document.getElementById("summary-profesional").textContent = selectedProfesional;
    document.getElementById("summary-fecha").textContent = selectedDate;
    document.getElementById("summary-hora").textContent = selectedTime;

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

  async function confirmReservation() {
    try {
      const user = auth.currentUser;

      if (!user) {
        alert("Debes iniciar sesión para hacer una reserva");
        return;
      }

      const reservaData = {
        userId: user.uid,
        userEmail: user.email,
        profesional: selectedProfesional,
        fecha: selectedDate,
        hora: selectedTime,
        pago: selectedPayment,
        servicio: servicioReservaActual ? servicioReservaActual.title : null,
        timestamp: new Date(),
      };

      const docRef = await addDoc(collection(db, "reservas"), reservaData);

      alert("Reserva confirmada con éxito. ID: " + docRef.id);

      setTimeout(() => {
        modal.hide();
        resetForm();
      }, 2000);

    } catch (error) {
      console.error("Error al guardar la reserva:", error);
      alert("Error al guardar la reserva. Por favor, intenta nuevamente.");
    }
  }

  function resetForm() {
    currentStep = 1;
    selectedProfesional = null;
    selectedDate = null;
    selectedTime = null;
    selectedPayment = "creditCard";

    steps.forEach((step) => step.classList.remove("active"));
    document
      .querySelector(`.reserva-step[data-step="1"]`)
      .classList.add("active");

    document.querySelectorAll(".profesional-card").forEach(card => card.classList.remove("selected"));
    timeSlots.forEach((slot) => slot.classList.remove("selected"));
    document.querySelector("#creditCard").checked = true;
    document.querySelector("#comentarios").value = "";

    currentMonth = new Date().getMonth();
    currentYear = new Date().getFullYear();
    generateCalendar(currentMonth, currentYear);

    updateButtons();
  }
}
