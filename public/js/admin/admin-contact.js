import { supabase } from "../core/supabase.js";

export class AdminContact {
  constructor(adminManager) {
    this.adminManager = adminManager;
    this.currentFilter = "all";
  }

  async loadContactMessages() {
    try {
      const { data: messages, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      this.renderContactTable(messages || []);
    } catch (error) {
      console.error("Error loading contact messages:", error);
      this.renderContactTable([]);
    }
  }

  renderContactTable(messages) {
    const tbody = document.getElementById("contact-table-body");
    if (!tbody) return;

    if (messages.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4 text-muted">
            No hay mensajes de contacto
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = messages
      .map(
        (message) => `
        <tr data-message-id="${message.id}" data-status="${message.status}">
          <td>
            <div class="fw-semibold">${message.name || "Sin nombre"}</div>
            <small class="text-muted">${message.email}</small>
            ${
              message.phone
                ? `<div><small><i class="bi bi-telephone me-1"></i>${message.phone}</small></div>`
                : ""
            }
          </td>
          <td>
            <span class="badge bg-info">${this.formatConsultType(
              message.consult_type
            )}</span>
          </td>
          <td>${message.service || "No especificado"}</td>
          <td>
            <div class="message-preview" style="max-width: 150px;" title="${this.escapeHtml(
              message.message
            )}">
              ${this.truncateMessage(message.message, 8)}
            </div>
          </td>
          <td>
            <div class="form-check form-switch">
              <input class="form-check-input newsletter-toggle" type="checkbox" 
                ${message.newsletter ? "checked" : ""} disabled>
            </div>
          </td>
          <td>
            <span class="badge bg-${this.getStatusBadgeColor(message.status)}">
              ${this.formatStatus(message.status)}
            </span>
          </td>
          <td>${new Date(message.created_at).toLocaleDateString("es-ES")}</td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary view-message" title="Ver mensaje completo" data-message-id="${
                message.id
              }">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn-outline-success update-status" title="Cambiar estado" data-message-id="${
                message.id
              }">
                <i class="bi bi-check2-circle"></i>
              </button>
              <button class="btn btn-outline-danger delete-message" title="Eliminar" data-message-id="${
                message.id
              }">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `
      )
      .join("");

    // Aplicar filtro actual después de renderizar
    this.filterMessages(this.currentFilter);

    // Añadir event listeners a los botones
    this.attachMessageEventListeners();
  }

  truncateMessage(message, wordLimit) {
    if (!message) return "Sin mensaje";

    const words = message.split(" ");
    if (words.length <= wordLimit) {
      return message;
    }

    return words.slice(0, wordLimit).join(" ") + "...";
  }

  formatConsultType(type) {
    const types = {
      info: "Información",
      quote: "Cotización",
      complaint: "Reclamo",
      suggestion: "Sugerencia",
      other: "Otro",
    };
    return types[type] || type;
  }

  formatStatus(status) {
    const statuses = {
      new: "Nuevo",
      read: "Leído",
      answered: "Leído",
      pending: "Pendiente",
      closed: "Cerrado",
    };
    return statuses[status] || status;
  }

  getStatusBadgeColor(status) {
    const colors = {
      new: "primary",
      read: "success",
      answered: "success",
      pending: "warning",
      closed: "secondary",
    };
    return colors[status] || "secondary";
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  attachMessageEventListeners() {
    // Ver mensaje completo
    document.querySelectorAll(".view-message").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const messageId = e.currentTarget.getAttribute("data-message-id");
        this.viewMessage(messageId);
      });
    });

    // Cambiar estado
    document.querySelectorAll(".update-status").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const messageId = e.currentTarget.getAttribute("data-message-id");
        this.updateMessageStatus(messageId);
      });
    });

    // Eliminar mensaje
    document.querySelectorAll(".delete-message").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const messageId = e.currentTarget.getAttribute("data-message-id");
        const messageRow = document.querySelector(
          `tr[data-message-id="${messageId}"]`
        );
        const userName = messageRow
          ? messageRow.querySelector(".fw-semibold").textContent
          : "este mensaje";
        this.deleteMessage(messageId, userName);
      });
    });
  }

  async viewMessage(messageId) {
    try {
      const { data: message, error } = await supabase
        .from("contact_messages")
        .select("*")
        .eq("id", messageId)
        .single();

      if (error) throw error;

      // Marcar como leído si está en estado nuevo
      if (message.status === "new") {
        await this.updateMessageStatusInDB(messageId, "read");
      }

      this.showMessageModal(message);
    } catch (error) {
      console.error("Error cargando mensaje:", error);
      alert(`Error al cargar el mensaje: ${error.message}`);
    }
  }

  showMessageModal(message) {
    // Crear modal dinámicamente si no existe
    let modal = document.getElementById("contactMessageModal");
    if (!modal) {
      modal = this.createMessageModal();
    }

    // Llenar modal con datos del mensaje
    document.getElementById("message-modal-name").textContent =
      message.name || "Sin nombre";
    document.getElementById("message-modal-email").textContent = message.email;
    document.getElementById("message-modal-phone").textContent =
      message.phone || "No proporcionado";
    document.getElementById("message-modal-service").textContent =
      message.service || "No especificado";
    document.getElementById("message-modal-consult-type").textContent =
      this.formatConsultType(message.consult_type);
    document.getElementById("message-modal-message").textContent =
      message.message || "Sin mensaje";
    document.getElementById("message-modal-newsletter").textContent =
      message.newsletter ? "Sí" : "No";
    document.getElementById("message-modal-status").textContent =
      this.formatStatus(message.status);
    document.getElementById("message-modal-created").textContent = new Date(
      message.created_at
    ).toLocaleString("es-ES");
    document.getElementById("message-modal-updated").textContent =
      message.updated_at
        ? new Date(message.updated_at).toLocaleString("es-ES")
        : "No modificado";

    // Actualizar el badge de estado
    const statusBadge = document.getElementById("message-modal-status-badge");
    statusBadge.className = `badge bg-${this.getStatusBadgeColor(
      message.status
    )}`;
    statusBadge.textContent = this.formatStatus(message.status);

    // Mostrar modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
  }

  createMessageModal() {
    const modalHTML = `
      <div class="modal fade admin-modal" id="contactMessageModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="bi bi-envelope me-2"></i>Mensaje de Contacto
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="row mb-3">
                <div class="col-md-6">
                  <strong>Nombre:</strong>
                  <div id="message-modal-name" class="text-muted"></div>
                </div>
                <div class="col-md-6">
                  <strong>Email:</strong>
                  <div id="message-modal-email" class="text-muted"></div>
                </div>
              </div>
              <div class="row mb-3">
                <div class="col-md-6">
                  <strong>Teléfono:</strong>
                  <div id="message-modal-phone" class="text-muted"></div>
                </div>
                <div class="col-md-6">
                  <strong>Servicio:</strong>
                  <div id="message-modal-service" class="text-muted"></div>
                </div>
              </div>
              <div class="row mb-3">
                <div class="col-md-6">
                  <strong>Tipo de Consulta:</strong>
                  <div id="message-modal-consult-type" class="text-muted"></div>
                </div>
                <div class="col-md-6">
                  <strong>Newsletter:</strong>
                  <div id="message-modal-newsletter" class="text-muted"></div>
                </div>
              </div>
              <div class="row mb-3">
                <div class="col-md-6">
                  <strong>Estado:</strong>
                  <div>
                    <span id="message-modal-status-badge" class="badge"></span>
                    <span id="message-modal-status" class="text-muted ms-2"></span>
                  </div>
                </div>
                <div class="col-md-6">
                  <strong>Recibido:</strong>
                  <div id="message-modal-created" class="text-muted"></div>
                </div>
              </div>
              <div class="mb-3">
                <strong>Mensaje:</strong>
                <div class="border rounded p-3 bg-light mt-2">
                  <div id="message-modal-message" class="text-muted" style="white-space: pre-wrap;"></div>
                </div>
              </div>
              <div class="text-muted small">
                <strong>Última actualización:</strong>
                <span id="message-modal-updated"></span>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-admin-outline" data-bs-dismiss="modal">Cerrar</button>
              <button type="button" class="btn btn-admin-primary" id="reply-to-message">
                <i class="bi bi-reply me-2"></i>Responder
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    return document.getElementById("contactMessageModal");
  }

  async updateMessageStatus(messageId) {
    try {
      const { data: message } = await supabase
        .from("contact_messages")
        .select("status")
        .eq("id", messageId)
        .single();

      if (!message) throw new Error("Mensaje no encontrado");

      // Solo alterna entre Nuevo y Leído
      const newStatus = message.status === "new" ? "read" : "new";

      await this.updateMessageStatusInDB(messageId, newStatus);

      if (typeof showToast === "function") {
        showToast(
          `Estado actualizado a: ${this.formatStatus(newStatus)}`,
          "success"
        );
      }

      // Recargar mensajes
      await this.loadContactMessages();
    } catch (error) {
      console.error("Error actualizando estado:", error);
      alert(`Error al actualizar estado: ${error.message}`);
    }
  }

  async updateMessageStatusInDB(messageId, status) {
    const { error } = await supabase
      .from("contact_messages")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    if (error) throw error;
  }

  async deleteMessage(messageId, userName) {
    if (
      !confirm(
        `¿Estás seguro de que quieres eliminar el mensaje de "${userName}"?\n\nEsta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("contact_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      if (typeof showToast === "function") {
        showToast("Mensaje eliminado exitosamente", "success");
      } else {
        alert("Mensaje eliminado exitosamente");
      }

      await this.loadContactMessages();
    } catch (error) {
      console.error("Error eliminando mensaje:", error);
      alert(`Error al eliminar mensaje: ${error.message}`);
    }
  }

  filterMessages(status) {
    this.currentFilter = status;

    const rows = document.querySelectorAll(
      "#contact-table-body tr[data-message-id]"
    );
    let visibleCount = 0;

    rows.forEach((row) => {
      const rowStatus = row.getAttribute("data-status");

      if (status === "all") {
        row.style.display = "";
        visibleCount++;
      } else if (status === "new" && rowStatus === "new") {
        row.style.display = "";
        visibleCount++;
      } else if (
        status === "read" &&
        (rowStatus === "read" || rowStatus === "answered")
      ) {
        // Filtro "Leídos" muestra tanto 'read' como 'answered'
        row.style.display = "";
        visibleCount++;
      } else {
        row.style.display = "none";
      }
    });

    // Mostrar mensaje si no hay resultados
    const tbody = document.getElementById("contact-table-body");
    const existingEmptyRow = tbody.querySelector(".no-results");

    if (visibleCount === 0 && !existingEmptyRow) {
      const emptyRow = document.createElement("tr");
      emptyRow.className = "no-results";
      emptyRow.innerHTML = `
        <td colspan="8" class="text-center py-4 text-muted">
          No hay mensajes ${
            status !== "all" ? `con estado "${this.formatStatus(status)}"` : ""
          }
        </td>
      `;
      tbody.appendChild(emptyRow);
    } else if (visibleCount > 0 && existingEmptyRow) {
      existingEmptyRow.remove();
    }

    // Actualizar texto del dropdown
    const dropdownToggle = document.querySelector(
      ".contact-filter .dropdown-toggle"
    );
    if (dropdownToggle) {
      const filterText = status === "all" ? "Todos" : this.formatStatus(status);
      dropdownToggle.textContent = filterText;
    }
  }

  setupEventListeners() {
    // Filtros
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("filter-contact-btn")) {
        e.preventDefault();
        const filter = e.target.getAttribute("data-filter");
        this.filterMessages(filter);
      }
    });

    // Botón de responder en el modal
    document.addEventListener("click", (e) => {
      if (e.target.id === "reply-to-message") {
        this.replyToMessage();
      }
    });
  }

  replyToMessage() {
    const email = document.getElementById("message-modal-email").textContent;
    const subject = `Respuesta a tu consulta - ${
      document.getElementById("message-modal-service").textContent
    }`;

    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    window.open(mailtoLink, "_blank");
  }
}
