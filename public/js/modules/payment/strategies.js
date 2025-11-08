// public/js/modules/payment/strategies.js

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

// ===========================================
// === ESTRATEGIAS PARA PRODUCTOS ===
// ===========================================

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
//(A diferencia de los servicios, débito no tiene descuento para productos)
export class ProductDebitStrategy extends DiscountStrategy {
  calculate(subtotal) {
    return {
      discountAmount: 0,
      newTotal: subtotal,
    };
  }
}