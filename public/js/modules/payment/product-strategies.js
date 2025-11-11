// public/js/modules/payment/product-strategies.js
// ESTRATEGIAS DE PRODUCTOS (¡Actualizadas para acumulación!)

class DiscountStrategy {
  /**
   * @param {object} context - Contiene { subtotal, payment_method, isFrequent }
   * @returns {number} - El monto del descuento
   */
  calculate(context) {
    throw new Error("El método 'calculate' debe ser implementado.");
  }
}

// --- ¡NUEVA ESTRATEGIA! ---
// 15% OFF para clientes frecuentes [cite: 5]
export class ProductFrequentCustomerStrategy extends DiscountStrategy {
  calculate(context) {
    // Esta estrategia se aplica sin importar el método de pago,
    // solo si el usuario es frecuente.
    if (context.isFrequent) {
      return context.subtotal * 0.15; // 15%
    }
    return 0; // No aplica
  }
}

// --- ESTRATEGIAS EXISTENTES (Actualizadas) ---

// 10% OFF en efectivo [cite: 4]
export class ProductCashStrategy extends DiscountStrategy {
  calculate(context) {
    // Esta estrategia solo aplica si el método es 'cash'
    if (context.payment_method === "cash") {
      return context.subtotal * 0.10; // 10%
    }
    return 0; // No aplica
  }
}

// Sin descuento para Débito
export class ProductDebitStrategy extends DiscountStrategy {
  calculate(context) {
    return 0; // No aplica descuento
  }
}

// Sin descuento para Crédito (u otro)
export class NoDiscountStrategy extends DiscountStrategy {
  calculate(context) {
    return 0; // No aplica descuento
  }
}