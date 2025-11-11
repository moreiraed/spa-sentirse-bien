// public/js/modules/payment/product-strategies.js
// ESTRATEGIAS DE PRODUCTOS

class DiscountStrategy {
  calculate(subtotal) {
    throw new Error("El método 'calculate' debe ser implementado.");
  }
}

// Estrategia de descuento para PRODUCTOS (10% OFF en efectivo)
export class ProductCashStrategy extends DiscountStrategy {
  calculate(subtotal) {
    const discountRate = 0.10; // 10%
    const discountAmount = subtotal * discountRate;
    const newTotal = subtotal - discountAmount;
    return { discountAmount, newTotal };
  }
}

//Estrategia de descuento para PRODUCTOS con Débito (0% OFF)
export class ProductDebitStrategy extends DiscountStrategy {
  calculate(subtotal) {
    return {
      discountAmount: 0,
      newTotal: subtotal,
    };
  }
}

// Estrategia por defecto (para Crédito u otro)
export class NoDiscountStrategy extends DiscountStrategy {
  calculate(subtotal) {
    return {
      discountAmount: 0,
      newTotal: subtotal,
    };
  }
}