// Elementos del DOM
const chatbotIcon = document.getElementById("chatbot-icon");
const chatbotContainer = document.getElementById("chatbot-container");
const chatbotClose = document.getElementById("chatbot-close");
const chatbotMessages = document.getElementById("chatbot-messages");
const chatbotInput = document.getElementById("chatbot-input");
const chatbotSend = document.getElementById("chatbot-send");

// Toggle (abrir/cerrar con el ícono)
chatbotIcon.addEventListener("click", () => {
  if (
    chatbotContainer.style.display === "none" ||
    !chatbotContainer.style.display
  ) {
    chatbotContainer.style.display = "flex";
  } else {
    chatbotContainer.style.display = "none";
  }
});

// Cerrar con el botón "X"
chatbotClose.addEventListener("click", () => {
  chatbotContainer.style.display = "none";
});

// Respuestas del bot (con opciones interactivas)
const botResponses = {
  inicio: `
        ¡Hola! 😊 Soy el asistente del <strong>Spa Sentirse Bien</strong>. ¿En qué puedo ayudarte?<br><br>
        <div class="bot-options">
            <button class="btn btn-sm btn-outline-success" onclick="sendOption('1')">
                <i class="fas fa-spa"></i> Servicios
            </button>
            <button class="btn btn-sm btn-outline-success" onclick="sendOption('2')">
                <i class="fas fa-tag"></i> Precios
            </button>
            <button class="btn btn-sm btn-outline-success" onclick="sendOption('3')">
                <i class="fas fa-map-marker-alt"></i> Ubicación
            </button>
        </div>
    `,
  1: `
        <strong>Servicios disponibles:</strong><br><br>
        <i class="fas fa-hands"></i> Masajes relajantes ($50)<br>
        <i class="fas fa-smile"></i> Facial rejuvenecedor ($70)<br>
        <i class="fas fa-fire"></i> Depilación láser ($60)<br><br>
        ¿Quieres reservar? Responde <strong>Sí</strong> o <strong>No</strong>.
    `,
  2: `
        <strong>Precios:</strong><br><br>
        <i class="fas fa-hands"></i> Masaje: $50<br>
        <i class="fas fa-smile"></i> Facial: $70<br>
        <i class="fas fa-fire"></i> Depilación: $60<br><br>
        ¿Te interesa alguno?
    `,
  3: `
        <strong>Ubicación:</strong><br><br>
        <i class="fas fa-map-marker-alt"></i> C. French 414, H3506 Resistencia, Chaco<br>
        <i class="fas fa-clock"></i> Horario: Lunes a Sábado (9AM - 20PM).
    `,
  default: `
        No entendí. Por favor, elige una opción:<br><br>
        <div class="bot-options">
            <button class="btn btn-sm btn-outline-success" onclick="sendOption('1')">Servicios</button>
            <button class="btn btn-sm btn-outline-success" onclick="sendOption('2')">Precios</button>
            <button class="btn btn-sm btn-outline-success" onclick="sendOption('3')">Ubicación</button>
        </div>
    `,
};

// Función para enviar opción desde los botones
window.sendOption = (option) => {
  chatbotInput.value = option;
  processUserMessage();
};

// Función para agregar mensajes al chat
function addMessage(text, isUser) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", isUser ? "user-message" : "bot-message");
  messageDiv.innerHTML = text;
  chatbotMessages.appendChild(messageDiv);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// Función para procesar el mensaje del usuario
function processUserMessage() {
  const userMessage = chatbotInput.value.trim().toLowerCase();
  if (!userMessage) return;

  addMessage(`<strong>Tú:</strong> ${userMessage}`, true);
  chatbotInput.value = "";

  // Respuesta del bot
  let botResponse = botResponses["default"];
  if (userMessage === "hola") {
    botResponse = botResponses["inicio"];
  } else if (botResponses[userMessage]) {
    botResponse = botResponses[userMessage];
  }

  setTimeout(() => {
    addMessage(`<strong>SpaBot:</strong> ${botResponse}`, false);
  }, 800);
}

// Eventos
chatbotSend.addEventListener("click", processUserMessage);
chatbotInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") processUserMessage();
});

// Mensaje inicial al abrir el chat
chatbotIcon.addEventListener(
  "click",
  () => {
    if (chatbotMessages.children.length === 0) {
      setTimeout(() => {
        addMessage(botResponses["inicio"], false);
      }, 500);
    }
  },
  { once: true }
);
