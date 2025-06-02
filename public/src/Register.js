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
function mostrarToast(mensaje, tipo = "success") {
    const toastElement = document.getElementById("toastNotificacion");
    const toastMensaje = document.getElementById("toastMensaje");

    if (!toastElement || !toastMensaje) return;

    toastMensaje.textContent = mensaje;

    toastElement.classList.remove(
        "bg-success",
        "bg-danger",
        "bg-warning",
        "bg-info"
    );
    toastElement.classList.add("bg-" + tipo);

    const toast = new bootstrap.Toast(toastElement);
    toast.show();
}
