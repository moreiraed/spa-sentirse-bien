// public/js/modules/checkout/context.js
// Este contexto ahora maneja MÚLTIPLES estrategias (acumulación)

export class ReservationContext {
  constructor(subtotal) {
    this.subtotal = subtotal;
    this.strategies = []; // Ahora es un array
  }

  /**
   * Asigna el array de estrategias a aplicar.
   * @param {Array} strategies - Un array de instancias de estrategias.
   */
  setStrategies(strategies = []) {
    this.strategies = Array.isArray(strategies) ? strategies : [strategies];
  }

  /**
   * Calcula el total basado en el contexto (que le pasa el controlador)
   * @param {object} context - Objeto simple, ej: { payment_method: 'cash', isFrequent: true }
   * @returns {object} - { discountAmount, newTotal }
   */
  calculateTotal(context = {}) {
    let totalDiscount = 0;
    
    // Creamos el objeto de contexto que pasaremos a cada estrategia
    const strategyContext = {
      subtotal: this.subtotal,
      ...context 
    };

    // 1. Acumulamos los descuentos
    // Cada estrategia devuelve solo el *monto* del descuento
    for (const strategy of this.strategies) {
      // Pasamos el contexto completo a cada estrategia
      totalDiscount += strategy.calculate(strategyContext);
    }

    // 2. Calculamos el total
    const newTotal = this.subtotal - totalDiscount;

    return {
      discountAmount: totalDiscount,
      newTotal: newTotal < 0 ? 0 : newTotal, // Asegurarse de que no sea negativo
    };
  }
}