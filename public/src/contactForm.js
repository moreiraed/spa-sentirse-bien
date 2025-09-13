document.addEventListener('DOMContentLoaded', function() {
  const contactForm = document.querySelector('.contact-form-container form');
  
  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Referencia al botón de enviar
      const submitBtn = contactForm.querySelector('.submit-btn');
      const originalBtnText = submitBtn.innerHTML;
      
      // Mostrar estado de carga
      submitBtn.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Enviando...
      `;
      submitBtn.disabled = true;
      
      try {
        // Obtener datos del formulario
        const formData = {
          nombre: contactForm.querySelector('#name').value.trim(),
          email: contactForm.querySelector('#email').value.trim(),
          telefono: contactForm.querySelector('#phone').value.trim() || 'No proporcionado',
          servicio: contactForm.querySelector('#service').value,
          tipoConsulta: contactForm.querySelector('#consult-type').value,
          mensaje: contactForm.querySelector('#message').value.trim(),
          newsletter: contactForm.querySelector('#newsletter').checked,
          estado: 'nuevo',
          atendido: false
        };

        // Validación básica
        if (!formData.nombre || !formData.email || !formData.mensaje) {
          throw new Error('Por favor, complete los campos requeridos');
        }

        // URL de tu backend en Render. ¡Debes reemplazar el placeholder!
        const backendUrl = 'https://spa-sentirse-bien-backend-d9dd.onrender.com';

        // Enviar a nuestro backend de Node.js
        // La URL debe ser absoluta porque el frontend y el backend están en dominios diferentes.
        const response = await fetch(`${backendUrl}/api/contact`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Hubo un problema al enviar el mensaje.');
        }
        
        // Mostrar notificación de éxito
        showToast('✅ Mensaje enviado con éxito. Nos pondremos en contacto pronto.', 'success');
        
        // Resetear formulario
        contactForm.reset();
        contactForm.querySelector('#newsletter').checked = true; // Mantener checked por defecto
        
      } catch (error) {
        console.error("Error al enviar el mensaje: ", error);
        showToast(`❌ ${error.message || 'Error al enviar el mensaje'}`, 'error');
      } finally {
        // Restaurar botón
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }
});

// Función mejorada para mostrar notificaciones Toast
function showToast(message, type) {
  const toastContainer = document.getElementById('toast-container');
  
  // Eliminar toasts anteriores si existen
  while (toastContainer.firstChild) {
    toastContainer.removeChild(toastContainer.firstChild);
  }

  const toast = document.createElement('div');
  toast.className = `toast show align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body d-flex align-items-center">
        <span class="me-2">${message.split(' ')[0]}</span>
        <span>${message.split(' ').slice(1).join(' ')}</span>
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  
  // Configurar autodestrucción
  const bsToast = new bootstrap.Toast(toast, {
    autohide: true,
    delay: 5000
  });
  bsToast.show();
}