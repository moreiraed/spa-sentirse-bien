// public/js/modules/payment/service-strategies.js
// ESTRATEGIAS DE SERVICIOS

class DiscountStrategy {
  calculate(subtotal) {
    throw new Error("El método 'calculate' debe ser implementado.");
  }
}

// 15% de descuento con Tarjeta de Débito
export class DebitCardStrategy extends DiscountStrategy {
  calculate(subtotal) {
    const discount = subtotal * 0.15;
    return {
      discountAmount: discount,
      newTotal: subtotal - discount,
    };
  }
}

// Sin descuento (Efectivo)
export class CashStrategy extends DiscountStrategy {
  calculate(subtotal) {
    return {
      discountAmount: 0,
      newTotal: subtotal,
    };
  }
}

// Estrategia por defecto
export class NoDiscountStrategy extends DiscountStrategy {
  calculate(subtotal) {
    return {
      discountAmount: 0,
      newTotal: subtotal,
    };
  }
}