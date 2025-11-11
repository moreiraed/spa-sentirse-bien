// public/js/modules/payment/service-strategies.js
// ESTRATEGIAS DE SERVICIOS (Interfaz actualizada para acumulación)

class DiscountStrategy {
  /**
   * @param {object} context - Contiene { subtotal, payment_method }
   * @returns {number} - El monto del descuento
   */
  calculate(context) {
    throw new Error("El método 'calculate' debe ser implementado.");
  }
}

// 15% de descuento con Tarjeta de Débito
export class DebitCardStrategy extends DiscountStrategy {
  calculate(context) {
    if (context.payment_method === "debit_card") {
      return context.subtotal * 0.15;
    }
    return 0; // No aplica
  }
}

// Sin descuento (Efectivo)
export class CashStrategy extends DiscountStrategy {
  calculate(context) {
    return 0; // No aplica descuento
  }
}

// Estrategia por defecto (Crédito)
export class NoDiscountStrategy extends DiscountStrategy {
  calculate(context) {
    return 0; // No aplica descuento
  }
}