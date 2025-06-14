import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import { db, auth } from "./firebase-config.js";

let servicioReservaActual = null;
let selectedProfesional = null;
let selectedCard = null;
let originalPrice = null;

// Move monthNames array to global scope
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

export function initializeReservaModalFeatures() {
  console.log("Inicializando características del modal de reserva");

  function resetForm() {
    // Resetear variables de estado
    currentStep = 1;
    selectedDate = null;
    selectedTime = null;
    selectedPayment = "creditCard";
    selectedProfesional = null;
    selectedCard = null;

    // Resetear UI
    document.querySelectorAll(".reserva-step").forEach(step => {
      step.classList.remove("active");
    });
    document.querySelector(`.reserva-step[data-step="1"]`).classList.add("active");

    document.querySelectorAll(".spa-step").forEach(step => {
      step.classList.remove("active", "completed");
    });
    document.querySelector(`.spa-step[data-step="1"]`).classList.add("active");

    // Resetear selecciones
    document.querySelectorAll(".profesional-card").forEach(card => {
      card.classList.remove("selected");
    });
    document.querySelectorAll(".btn-time-slot").forEach(slot => {
      slot.classList.remove("selected");
    });
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
      radio.checked = radio.id === "creditCard";
    });

    // Resetear botones
    updateButtons();
  }

  window.abrirModalReserva = async function (servicioData) {
    console.log("Abriendo modal con servicio:", servicioData);
    servicioReservaActual = servicioData;
    // Extract price from service data
    originalPrice = parseFloat(servicioData.price) || 0;
    resetForm(); // Resetear el formulario antes de abrir el modal
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
      
      // If we're on the last step, update the summary
      if (currentStep === steps.length) {
        updateReservationSummary();
      }
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
      // Update price display when payment method changes
      if (currentStep === steps.length) {
        updateReservationSummary();
      }
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

  function generateCalendar(month, year) {
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

    // Calculate minimum booking date (48 hours from now)
    const minBookingDate = new Date(today);
    minBookingDate.setHours(today.getHours() + 48);

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dayElement = document.createElement("div");
      dayElement.classList.add("calendar-day");
      dayElement.textContent = day;

      const currentDate = new Date(year, month, day);
      currentDate.setHours(0, 0, 0, 0);

      // Check if the date is before the minimum booking date
      if (currentDate < minBookingDate) {
        dayElement.classList.add("disabled");
        dayElement.style.opacity = "0.5";
        dayElement.style.cursor = "not-allowed";
        dayElement.title = "Las reservas deben hacerse con al menos 48 horas de anticipación";
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

  // Add a function to validate the selected date and time
  function validateDateTime() {
    if (!selectedDate || !selectedTime) return false;

    try {
      // Parse the date (format: "15 de Junio, 2025")
      const dateParts = selectedDate.split(" de ");
      const day = parseInt(dateParts[0]);
      
      // Split month and year (format: "Junio, 2025")
      const monthYearParts = dateParts[1].split(", ");
      const month = monthYearParts[0];
      const year = parseInt(monthYearParts[1]);
      
      const monthIndex = monthNames.indexOf(month);
      if (monthIndex === -1) {
        console.error("Invalid month:", month);
        return false;
      }

      // Create date object for selected date (set to start of day)
      const selectedDateObj = new Date(year, monthIndex, day);
      selectedDateObj.setHours(0, 0, 0, 0);

      // Get current date (set to start of day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate minimum booking date (48 hours = 2 days)
      const minBookingDate = new Date(today);
      minBookingDate.setDate(today.getDate() + 2);

      console.log("Selected Date:", selectedDateObj);
      console.log("Min Booking Date:", minBookingDate);
      console.log("Is valid:", selectedDateObj >= minBookingDate);

      return selectedDateObj >= minBookingDate;
    } catch (error) {
      console.error("Error validating date:", error);
      return false;
    }
  }

  // Modify the nextStep function to include better validation
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

    if (currentStep === 3) {
      if (!selectedTime) {
        alert("Por favor selecciona un horario");
        return;
      }
      
      // Validate the selected date and time
      if (!validateDateTime()) {
        alert("Las reservas deben hacerse con al menos 48 horas de anticipación");
        return;
      }
    }

    if (currentStep === 4) {
      const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked').id;
      if (selectedPaymentMethod === 'debitCard') {
        // Mostrar modal de selección de tarjeta
        const modalTarjeta = new bootstrap.Modal(document.getElementById('modalSeleccionTarjeta'));
        cargarTarjetasUsuario();
        modalTarjeta.show();
        return; // No avanzar al siguiente paso hasta seleccionar tarjeta
      }
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

  function updateReservationSummary() {
    console.log("Actualizando resumen de reserva");
    console.log("Profesional:", selectedProfesional);
    console.log("Fecha:", selectedDate);
    console.log("Hora:", selectedTime);
    console.log("Pago:", selectedPayment);
    console.log("Tarjeta seleccionada:", selectedCard);

    document.getElementById("summary-profesional").textContent = selectedProfesional;
    document.getElementById("summary-fecha").textContent = selectedDate;
    document.getElementById("summary-hora").textContent = selectedTime;

    let paymentText = "";
    let finalPrice = originalPrice;
    let discountApplied = false;

    switch (selectedPayment) {
      case "debitCard":
        paymentText = selectedCard ? `Tarjeta de débito (****${selectedCard.ultimos4})` : "Tarjeta de débito";
        // Apply 15% discount for debit card
        finalPrice = originalPrice * 0.85;
        discountApplied = true;
        break;
      case "paypal":
        paymentText = "PayPal";
        break;
      case "cash":
        paymentText = "Efectivo en el local";
        break;
    }

    document.getElementById("summary-pago").textContent = paymentText;

    // Update price display in summary
    const priceElement = document.getElementById("summary-precio");
    if (priceElement) {
      if (discountApplied) {
        priceElement.innerHTML = `
          <span class="text-decoration-line-through text-muted me-2">$${originalPrice.toFixed(2)}</span>
          <span class="text-success">$${finalPrice.toFixed(2)}</span>
          <span class="badge bg-success ms-2">-15%</span>
        `;
      } else {
        priceElement.textContent = `$${originalPrice.toFixed(2)}`;
      }
    }
  }

  async function confirmReservation() {
    try {
      const user = auth.currentUser;

      if (!user) {
        alert("Debes iniciar sesión para hacer una reserva");
        return;
      }

      // Mostrar loader en el botón
      const btnConfirm = document.querySelector(".btn-confirm");
      const originalText = btnConfirm.innerHTML;
      btnConfirm.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Procesando...
      `;
      btnConfirm.disabled = true;

      // Obtener datos del usuario
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        alert("Error al obtener los datos del usuario");
        return;
      }

      const userData = userDoc.data();

      const reservaData = {
        userId: user.uid,
        userEmail: user.email,
        nombreUsuario: userData.username || "",
        nombre: userData.nombre || "",
        apellido: userData.apellido || "",
        dni: userData.dni || "",
        profesional: selectedProfesional,
        fecha: selectedDate,
        hora: selectedTime,
        pago: selectedPayment,
        tarjetaId: selectedCard ? selectedCard.id : null,
        servicio: servicioReservaActual ? servicioReservaActual.title : null,
        comentario: document.querySelector("#comentarios").value || "",
        timestamp: new Date(),
        estado: "activo"
      };

      const docRef = await addDoc(collection(db, "reservas"), reservaData);

      // Cerrar el modal
      const modal = bootstrap.Modal.getInstance(document.getElementById("reservaModal"));
      modal.hide();

      // Mostrar toast de éxito
      const toastContainer = document.createElement('div');
      toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
      toastContainer.style.zIndex = '11100';
      toastContainer.innerHTML = `
        <div id="reservaToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true" style="background-color: white; box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);">
          <div class="toast-header bg-success text-white">
            <i class="fas fa-check-circle me-2"></i>
            <strong class="me-auto">¡Reserva exitosa!</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
          <div class="toast-body" style="background-color: white;">
            Tu reserva ha sido confirmada. Y se agrego en el apartado de <strong>Turnos</strong>.
          </div>
        </div>
      `;
      document.body.appendChild(toastContainer);

      const toast = new bootstrap.Toast(document.getElementById('reservaToast'), {
        autohide: true,
        delay: 5000
      });
      toast.show();

      // Limpiar el toast después de que se oculte
      document.getElementById('reservaToast').addEventListener('hidden.bs.toast', function () {
        toastContainer.remove();
      });

      // Resetear el formulario
      resetForm();

    } catch (error) {
      console.error("Error al guardar la reserva:", error);
      alert("Error al guardar la reserva. Por favor, intenta nuevamente.");
    } finally {
      // Restaurar el botón
      const btnConfirm = document.querySelector(".btn-confirm");
      btnConfirm.innerHTML = originalText;
      btnConfirm.disabled = false;
    }
  }

  // Función para cargar las tarjetas del usuario
  async function cargarTarjetasUsuario() {
    const contenedorTarjetas = document.getElementById('contenedorTarjetasReserva');
    const mensajeSinTarjetas = document.getElementById('mensajeSinTarjetasReserva');
    const btnConfirmarTarjeta = document.getElementById('btnConfirmarTarjeta');
    
    try {
      const userId = auth.currentUser.uid;
      const tarjetasRef = collection(db, 'tarjetas');
      const q = query(tarjetasRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        mensajeSinTarjetas.style.display = 'block';
        contenedorTarjetas.innerHTML = '';
        contenedorTarjetas.appendChild(mensajeSinTarjetas);
        btnConfirmarTarjeta.disabled = true;
        return;
      }

      mensajeSinTarjetas.style.display = 'none';
      contenedorTarjetas.innerHTML = '';

      querySnapshot.forEach((doc) => {
        const tarjeta = doc.data();
        const tarjetaElement = crearTarjetaElementReserva(tarjeta, doc.id);
        contenedorTarjetas.appendChild(tarjetaElement);
      });

      // Agregar evento al botón de confirmar tarjeta
      btnConfirmarTarjeta.addEventListener('click', function() {
        if (selectedCard) {
          const modalTarjeta = bootstrap.Modal.getInstance(document.getElementById('modalSeleccionTarjeta'));
          modalTarjeta.hide();
          // Continuar con el siguiente paso
          document
            .querySelector(`.reserva-step[data-step="${currentStep}"]`)
            .classList.remove("active");
          currentStep++;
          document
            .querySelector(`.reserva-step[data-step="${currentStep}"]`)
            .classList.add("active");
          updateReservationSummary();
          updateButtons();
        }
      });

    } catch (error) {
      console.error('Error al cargar tarjetas:', error);
      mostrarToast('Error al cargar las tarjetas', 'error');
    }
  }

  // Función para crear el elemento HTML de una tarjeta en el modal de reserva
  function crearTarjetaElementReserva(tarjeta, tarjetaId) {
    const col = document.createElement('div');
    col.className = 'col-12';
    
    const ultimos4 = tarjeta.numeroTarjeta.slice(-4);
    const tipoTarjeta = tarjeta.tipoTarjeta || 'visa'; // Por defecto visa si no está especificado

    // Definir estilos según el tipo de tarjeta
    const estilosTarjeta = {
      visa: {
        background: 'linear-gradient(135deg, #1a1f71 0%, #0d47a1 100%)',
        logo: 'bi-credit-card-2-front',
        logoColor: '#ffffff'
      },
      mastercard: {
        background: 'linear-gradient(135deg, #ff8008 0%, #ffc837 100%)',
        logo: 'bi-credit-card',
        logoColor: '#ffffff'
      }
    };

    const estilo = estilosTarjeta[tipoTarjeta] || estilosTarjeta.visa;

    col.innerHTML = `
      <div class="card h-100 border-0 shadow-sm tarjeta-seleccionable" data-tarjeta-id="${tarjetaId}" style="background: ${estilo.background}; cursor: pointer;">
        <div class="card-body text-white">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h6 class="mb-1">Tarjeta ${tipoTarjeta === 'visa' ? 'Visa' : 'MasterCard'}</h6>
              <small class="text-white-50">Termina en ${ultimos4}</small>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="radio" name="tarjetaSeleccionada" value="${tarjetaId}">
            </div>
          </div>
          <div class="mb-3">
            <div class="d-flex align-items-center">
              <i class="bi ${estilo.logo} me-2" style="color: ${estilo.logoColor}"></i>
              <span>**** **** **** ${ultimos4}</span>
            </div>
            <div class="d-flex align-items-center mt-2">
              <i class="bi bi-calendar me-2"></i>
              <span>Vence: ${tarjeta.fechaVencimiento}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Agregar evento de selección a toda la tarjeta
    const card = col.querySelector('.card');
    const radio = col.querySelector('input[type="radio"]');

    function selectCard() {
      radio.checked = true;
      selectedCard = {
        id: tarjetaId,
        ultimos4: ultimos4
      };
      document.getElementById('btnConfirmarTarjeta').disabled = false;
      // Remover selección de otras tarjetas
      document.querySelectorAll('.tarjeta-seleccionable').forEach(c => {
        if (c.dataset.tarjetaId !== tarjetaId) {
          c.classList.remove('selected');
        }
      });
      card.classList.add('selected');
    }

    // Agregar evento de clic a toda la tarjeta
    card.addEventListener('click', function(e) {
      // Evitar la propagación del evento si se hace clic en el radio button
      if (e.target !== radio) {
        selectCard();
      }
    });

    // Mantener el evento del radio button también
    radio.addEventListener('change', selectCard);

    return col;
  }
}
