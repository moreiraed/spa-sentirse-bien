// script.js
document.addEventListener("DOMContentLoaded", function () {
    // Variables globales
    let currentStep = 1;
    const totalSteps = 5;
    let selectedTherapist = null;
    let selectedDate = null;
    let selectedTime = null;
    let selectedPaymentMethod = "credit";

    // Elementos del DOM
    const progressBar = document.querySelector(".progress-bar");
    const steps = document.querySelectorAll(".step");
    const nextButtons = document.querySelectorAll(".next-step");
    const prevButtons = document.querySelectorAll(".prev-step");
    const therapistCards = document.querySelectorAll(".therapist-card");
    const monthYearElement = document.getElementById("currentMonthYear");
    const daysGrid = document.getElementById("daysGrid");
    const prevMonthBtn = document.getElementById("prevMonth");
    const nextMonthBtn = document.getElementById("nextMonth");
    const timeSlots = document.querySelectorAll(".time-slot");
    const paymentMethods = document.querySelectorAll(".payment-method");
    const confirmReservationBtn = document.getElementById("confirmReservation");
    const currentTherapistName = document.getElementById("currentTherapistName");
    const selectedDateDisplay = document.getElementById("selectedDateDisplay");
    const summaryTherapist = document.getElementById("summaryTherapist");
    const summaryDate = document.getElementById("summaryDate");
    const summaryTime = document.getElementById("summaryTime");
    const confirmationTherapist = document.getElementById(
        "confirmationTherapist"
    );
    const confirmationDate = document.getElementById("confirmationDate");
    const confirmationTime = document.getElementById("confirmationTime");

    // Configuración inicial del calendario
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();

    // Inicializar
    initCalendar();
    setupEventListeners();

    // Funciones
    function setupEventListeners() {
        // Botones siguiente/anterior
        nextButtons.forEach((button) => {
            button.addEventListener("click", () => goToStep(currentStep + 1));
        });

        prevButtons.forEach((button) => {
            button.addEventListener("click", () => goToStep(currentStep - 1));
        });

        // Selección de terapeuta
        therapistCards.forEach((card) => {
            card.addEventListener("click", function () {
                therapistCards.forEach((c) => c.classList.remove("selected"));
                this.classList.add("selected");
                selectedTherapist = this.querySelector("h5").textContent;
                currentTherapistName.textContent = selectedTherapist;
                summaryTherapist.textContent = selectedTherapist;
                confirmationTherapist.textContent = selectedTherapist;
            });
        });

        // Navegación del calendario
        prevMonthBtn.addEventListener("click", () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            initCalendar();
        });

        nextMonthBtn.addEventListener("click", () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            initCalendar();
        });

        // Selección de horario
        timeSlots.forEach((slot) => {
            slot.addEventListener("click", function () {
                timeSlots.forEach((s) => s.classList.remove("selected"));
                this.classList.add("selected");
                selectedTime = this.textContent;
                summaryTime.textContent = selectedTime;
                confirmationTime.textContent = selectedTime;
            });
        });

        // Selección de método de pago
        paymentMethods.forEach((method) => {
            method.addEventListener("click", function () {
                paymentMethods.forEach((m) => m.classList.remove("selected"));
                this.classList.add("selected");
                selectedPaymentMethod = this.getAttribute("data-method");
            });
        });

        // Confirmar reserva
        confirmReservationBtn.addEventListener("click", confirmReservation);
    }

    function goToStep(step) {
        // Validar antes de cambiar de paso
        if (step < 1 || step > totalSteps) return;

        // Validaciones específicas por paso
        if (step > currentStep) {
            if (currentStep === 1 && !selectedTherapist) {
                showAlert("Por favor selecciona un profesional");
                return;
            }
            if (currentStep === 2 && !selectedDate) {
                showAlert("Por favor selecciona una fecha");
                return;
            }
            if (currentStep === 3 && !selectedTime) {
                showAlert("Por favor selecciona un horario");
                return;
            }
            if (currentStep === 4 && !document.getElementById("termsCheck").checked) {
                showAlert("Debes aceptar los términos y condiciones");
                return;
            }
        }

        // Cambiar paso
        steps.forEach((s) => s.classList.remove("active"));
        document.getElementById(`step${step}`).classList.add("active");
        currentStep = step;

        // Actualizar barra de progreso
        updateProgressBar();

        // Actualizar círculos de progreso
        updateProgressCircles();

        // Scroll al inicio del paso
        document.querySelector(".modal-body").scrollTop = 0;
    }

    function updateProgressBar() {
        const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
        progressBar.style.width = `${progress}%`;
    }

    function updateProgressCircles() {
        const circles = document.querySelectorAll(".step-circle");
        circles.forEach((circle, index) => {
            if (index + 1 < currentStep) {
                circle.classList.add("completed");
                circle.classList.remove("active");
            } else if (index + 1 === currentStep) {
                circle.classList.add("active");
                circle.classList.remove("completed");
            } else {
                circle.classList.remove("active", "completed");
            }
        });
    }

    function initCalendar() {
        // Configurar mes y año actual
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
        monthYearElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;

        // Obtener primer día del mes y último día del mes
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        // Limpiar grid
        daysGrid.innerHTML = "";

        // Días del mes anterior (si es necesario)
        const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
        for (let i = 0; i < firstDay; i++) {
            const dayElement = createDayElement(
                prevMonthDays - firstDay + i + 1,
                true
            );
            daysGrid.appendChild(dayElement);
        }

        // Días del mes actual
        const today = new Date();
        const currentDate = today.getDate();
        const currentMonthToday = today.getMonth();
        const currentYearToday = today.getFullYear();

        for (let i = 1; i <= daysInMonth; i++) {
            const isToday =
                i === currentDate &&
                currentMonth === currentMonthToday &&
                currentYear === currentYearToday;
            const isPastDate =
                new Date(currentYear, currentMonth, i) <
                new Date(currentYearToday, currentMonthToday, currentDate);
            const dayElement = createDayElement(i, false, isToday, isPastDate);

            // Marcar fecha seleccionada
            if (
                selectedDate &&
                selectedDate.getDate() === i &&
                selectedDate.getMonth() === currentMonth &&
                selectedDate.getFullYear() === currentYear
            ) {
                dayElement.classList.add("selected");
            }

            daysGrid.appendChild(dayElement);
        }
    }

    function createDayElement(
        day,
        isDisabled,
        isToday = false,
        isPastDate = false
    ) {
        const dayElement = document.createElement("div");
        dayElement.className = "day";
        dayElement.textContent = day;

        if (isDisabled) {
            dayElement.classList.add("disabled");
        } else {
            dayElement.addEventListener("click", () => selectDate(day));
        }

        if (isToday) {
            dayElement.classList.add("today");
        }

        if (isPastDate) {
            dayElement.classList.add("disabled");
        }

        return dayElement;
    }

    function selectDate(day) {
        // Deseleccionar día anterior
        const previouslySelected = document.querySelector(".day.selected");
        if (previouslySelected) {
            previouslySelected.classList.remove("selected");
        }

        // Seleccionar nuevo día
        const selectedDayElement = [...document.querySelectorAll(".day")].find(
            (el) => el.textContent == day && !el.classList.contains("disabled")
        );

        if (selectedDayElement) {
            selectedDayElement.classList.add("selected");

            // Guardar fecha seleccionada
            selectedDate = new Date(currentYear, currentMonth, day);

            // Actualizar displays de fecha
            const options = {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            };
            const formattedDate = selectedDate.toLocaleDateString("es-ES", options);

            selectedDateDisplay.textContent = formattedDate;
            summaryDate.textContent = formattedDate;
            confirmationDate.textContent = `${day}/${currentMonth + 1
                }/${currentYear}`;

            // Aquí podrías cargar horarios disponibles desde el servidor
            // loadAvailableTimeSlots(selectedDate);
        }
    }

    function confirmReservation() {
        if (!document.getElementById("termsCheck").checked) {
            showAlert("Por favor acepta los términos y condiciones");
            return;
        }

        // Aquí iría la lógica para enviar la reserva al servidor
        // Por ahora simulamos el envío con un setTimeout

        showAlert("Procesando tu reserva...", "info");

        setTimeout(() => {
            goToStep(5);

            // Mostrar detalles de confirmación
            const notes = document.getElementById("reservationNotes").value;
            if (notes.trim() !== "") {
                document.getElementById("confirmationNotes").textContent = notes;
            }

            // Aquí podrías redirigir a una página de pago si el método no es efectivo
            if (selectedPaymentMethod !== "cash") {
                // redirectToPayment();
            }
        }, 1500);
    }

    function showAlert(message, type = "error") {
        // Eliminar alertas anteriores
        const existingAlert = document.querySelector(".custom-alert");
        if (existingAlert) {
            existingAlert.remove();
        }

        // Crear alerta
        const alert = document.createElement("div");
        alert.className = `custom-alert alert-${type}`;
        alert.textContent = message;

        // Estilos para la alerta
        alert.style.position = "fixed";
        alert.style.top = "20px";
        alert.style.left = "50%";
        alert.style.transform = "translateX(-50%)";
        alert.style.padding = "10px 20px";
        alert.style.borderRadius = "5px";
        alert.style.zIndex = "9999";
        alert.style.animation = "fadeIn 0.3s, fadeOut 0.3s 2.7s";
        alert.style.animationFillMode = "forwards";

        if (type === "error") {
            alert.style.backgroundColor = "#f8d7da";
            alert.style.color = "#721c24";
            alert.style.border = "1px solid #f5c6cb";
        } else {
            alert.style.backgroundColor = "#d1ecf1";
            alert.style.color = "#0c5460";
            alert.style.border = "1px solid #bee5eb";
        }

        document.body.appendChild(alert);

        // Eliminar después de 3 segundos
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 3000);
    }

    // Configurar fecha mínima en el input de fecha
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("reservationDate").min = today;

    // Seleccionar primer terapeuta por defecto
    if (therapistCards.length > 0) {
        therapistCards[0].click();
    }

    // Seleccionar fecha actual por defecto
    const todayElement = document.querySelector(".day.today:not(.disabled)");
    if (todayElement) {
        todayElement.click();
    } else {
        // Si hoy no está disponible, seleccionar el primer día disponible
        const firstAvailableDay = document.querySelector(".day:not(.disabled)");
        if (
            firstAvailableDay &&
            !firstAvailableDay.classList.contains("disabled")
        ) {
            firstAvailableDay.click();
        }
    }

    // Seleccionar primer horario disponible por defecto
    if (timeSlots.length > 0) {
        timeSlots[0].click();
    }

    // Seleccionar método de pago por defecto
    if (paymentMethods.length > 0) {
        paymentMethods[0].click();
    }

    // Inicializar barra de progreso y círculos
    updateProgressBar();
    updateProgressCircles();
});
