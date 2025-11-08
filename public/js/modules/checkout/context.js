// public/js/modules/reservas/context.js
// Importa desde la nueva carpeta compartida
import { NoDiscountStrategy } from '../payment/strategies.js';

export class ReservationContext {
  constructor(subtotal) {
    this.subtotal = subtotal;
    this.discountStrategy = new NoDiscountStrategy();
  }

  setStrategy(strategy) {
    this.discountStrategy = strategy;
  }

  calculateTotal() {
    return this.discountStrategy.calculate(this.subtotal);
  }
}