import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
    doc,
    setDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import { auth, db } from "./firebase-config.js";

// Función para registrar usuario
window.register = async function (event) {
    event.preventDefault(); // Prevenir el comportamiento de envío predeterminado del formulario

    // Obtener valores de los campos del modal
    const username = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    if (!username || !email || !password) {
        mostrarToast("Por favor completá todos los campos.", "warning");
        return;
    }

    if (password.length < 6) {
        mostrarToast("La contraseña debe tener al menos 6 caracteres.", "warning");
        return;
    }

    const btnRegistro = document.querySelector(
      "#formRegister button[type='submit']"
    ); 
    const originalHTML = btnRegistro.innerHTML; // Guardamos el contenido original

    // Mostrar spinner y deshabilitar botón
    btnRegistro.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Creando cuenta...
    `;
    btnRegistro.disabled = true;

    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );
        const user = userCredential.user;

        // Guardar datos adicionales del usuario en Firestore
        await setDoc(doc(db, "users", user.uid), {
            username,
            email,
            nombre: "",
            apellido: "",
            dni: "",
            rol: "usuario"
        });
        await sendEmailVerification(user);

        // Cierra el modal de registro
        const modalElement = document.getElementById("registerModal");
        const modal =
            bootstrap.Modal.getInstance(modalElement) ||
            new bootstrap.Modal(modalElement);
        modal.hide();

        // Muestra modal de cuenta creada
        document.getElementById("emailVerificacionTexto").innerText = email;
        const modalVerificacion = new bootstrap.Modal(
            document.getElementById("modalCuentaCreada")
        );
        modalVerificacion.show();
    } catch (error) {
        // Manejo de errores específicos
        if (error.code === "auth/email-already-in-use") {
            mostrarToast("Este correo ya está registrado.", "danger");
        } else if (error.code === "auth/invalid-email") {
            mostrarToast("El correo no es válido.", "danger");
        } else {
            mostrarToast("Error: " + error.message, "danger");
        }
    } finally {
      // Restaurar el botón a su estado original
      btnRegistro.innerHTML = originalHTML;
      btnRegistro.disabled = false;
    }
};

// Usamos MutationObserver para observar los cambios en el DOM
document.addEventListener("DOMContentLoaded", function () {
    const modalsContainer = document.getElementById("modals-container");

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            // Verifica si el modal de registro fue añadido al DOM
            if (
                mutation.type === "childList" &&
                document.getElementById("registerModal")
            ) {
                const formRegister = document.getElementById("formRegister");
                if (formRegister) {
                    formRegister.addEventListener("submit", register);
                } else {
                    console.error("Formulario de registro no encontrado en el modal.");
                }

                // Verificar y asignar el evento de clic al botón "Verificar y Continuar"
                const btnVerificarYContinuar = document.getElementById(
                    "btnVerificarYContinuar"
                );
                if (btnVerificarYContinuar) {
                    btnVerificarYContinuar.onclick = async function () {
                        const user = auth.currentUser;

                        if (!user) {
                            mostrarToast("No hay usuario activo.", "danger");
                            return;
                        }

                        await user.reload();

                        if (user.emailVerified) {
                            mostrarToast(
                                "¡Correo verificado! Ahora podés pedir tu turno.",
                                "success"
                            );

                            const modalCuenta = bootstrap.Modal.getInstance(
                                document.getElementById("modalCuentaCreada")
                            );
                            modalCuenta.hide();
                        } else {
                            mostrarToast(
                                "Tu correo aún no fue verificado. Revisá tu bandeja de entrada.",
                                "warning"
                            );
                        }
                    };
                }
            }
        }
    });

    // Configurar el observer para observar cambios en el contenedor de modales
    observer.observe(modalsContainer, { childList: true });
});

// Reenviar verificación para "Modal de verificación pendiente"
document.querySelectorAll(".btn-reenviar-verificacion").forEach((boton) => {
    boton.addEventListener("click", async function (e) {
        e.preventDefault();

        const texto = boton.querySelector(".texto-reenviar");
        const spinner = boton.querySelector(".spinner-reenviar");

        boton.disabled = true;
        texto.textContent = "Reenviando...";
        spinner.classList.remove("d-none");

        try {
            const user = auth.currentUser;
            if (user) {
                await user.reload();
                await sendEmailVerification(user);
                mostrarToast("Correo de verificación reenviado.", "info");
            } else {
                mostrarToast("Usuario no autenticado.", "danger");
            }
        } catch (err) {
            console.error("Error al reenviar verificación:", err);
            mostrarToast("Error al reenviar el correo.", "danger");
        } finally {
            spinner.classList.add("d-none");

            // Temporizador con cuenta regresiva
            let segundosRestantes = 30;
            boton.disabled = true;
            boton.classList.add("disabled");

            const intervalo = setInterval(() => {
                segundosRestantes--;
                texto.textContent = `Reintentar en ${segundosRestantes}s...`;

                if (segundosRestantes <= 0) {
                    clearInterval(intervalo);
                    texto.textContent = "Reenviar verificación";
                    boton.disabled = false;
                    boton.classList.remove("disabled");
                }
            }, 1000);
        }
    });
});

// Toast de notificación
function mostrarToast(message, type) {
  // Crear un nuevo div para el toast
  const toast = document.createElement("div");
  toast.classList.add(
    "toast",
    "align-items-center",
    "border-0",
    "fade",
    `bg-${type}`
  );

  // Cambiar el color del texto según tipo
  if (type === "warning") {
    toast.classList.add("text-dark"); // Texto negro para warning
  } else {
    toast.classList.add("text-white"); // Blanco para success, danger
  }

  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");

  // Crear la cabecera del toast
  const toastHeader = document.createElement("div");
  toastHeader.classList.add("toast-header");

  // Crear la imagen
  const currentPath = window.location.pathname;
  const isInPagesFolder = currentPath.includes("/pages/");
  const img = document.createElement("img");

  img.src = isInPagesFolder
    ? "../assets/icon/LogoSpa2.png"
    : "assets/icon/LogoSpa2.png";
  img.classList.add("rounded", "me-2");
  img.alt = "Icono";

  // Crear el texto de la cabecera
  const strong = document.createElement("strong");
  strong.classList.add("me-auto");
  strong.textContent = "Notificación";

  // Crear la hora
  const small = document.createElement("small");
  small.textContent = "Hace un momento";

  // Crear el botón de cierre
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.classList.add("btn-close");
  closeButton.setAttribute("data-bs-dismiss", "toast");
  closeButton.setAttribute("aria-label", "Cerrar");

  // Añadir los elementos a la cabecera
  toastHeader.appendChild(img);
  toastHeader.appendChild(strong);
  toastHeader.appendChild(small);
  toastHeader.appendChild(closeButton);

  // Crear el cuerpo del toast
  const toastBody = document.createElement("div");
  toastBody.classList.add("toast-body");
  toastBody.textContent = message;

  // Añadir la cabecera y el cuerpo al toast
  toast.appendChild(toastHeader);
  toast.appendChild(toastBody);

  // Añadir el toast al contenedor de toasts
  const toastContainer = document.getElementById("toast-container");
  if (toastContainer) {
    toastContainer.appendChild(toast);
    const bootstrapToast = new bootstrap.Toast(toast);
    bootstrapToast.show();

    // Eliminar el toast después de un tiempo
    setTimeout(() => {
      toast.remove();
    }, 3000); // El toast se elimina después de 5 segundos
  } else {
    console.error("El contenedor de toasts no existe en el DOM");
  }
}
