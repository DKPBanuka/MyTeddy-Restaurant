import { Prisma } from '@prisma/client';

/**
 * Robust Split Bill Calculation Utility
 * Handles precision arithmetic and proportional financial allocation.
 */
export class SplitCalculationUtil {
  
  /**
   * Method 1: Equal Split (By Amount)
   * Divides a total into N roughly equal parts, assigning the remainder to the last person.
   */
  static calculateEqualSplit(total: number, peopleCount: number): number[] {
    if (peopleCount <= 0) return [];
    
    // Work with cents to avoid floating point issues
    const totalCents = Math.round(total * 100);
    const splitCents = Math.floor(totalCents / peopleCount);
    const splits: number[] = new Array(peopleCount).fill(splitCents / 100);
    
    // Check for remainder
    const sumCents = splitCents * peopleCount;
    const remainderCents = totalCents - sumCents;
    
    // Distribute remainder (usually just 1-2 cents) to the last person
    if (remainderCents !== 0) {
      splits[peopleCount - 1] = (splitCents + remainderCents) / 100;
    }
    
    return splits;
  }

  /**
   * Method 2: Item-based Proportional Split
   * Calculates the exact sub-bill total based on assigned items,
   * including proportional Tax, Service Charge, and Discounts.
   */
  static calculateItemSplit(
    selectedItems: { subtotal: number; quantity: number }[],
    orderTotals: { subtotal: number; grandTotal: number; tax: number; serviceCharge: number; discount: number },
    precision: number = 2
  ) {
    if (!selectedItems || selectedItems.length === 0) {
        return { subtotal: 0, tax: 0, serviceCharge: 0, discount: 0, grandTotal: 0 };
    }

    const subBillSubtotal = selectedItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const orderSubtotal = Number(orderTotals.subtotal || 0);
    
    // If order subtotal is 0 (should not happen for paid items), avoid division by zero
    if (orderSubtotal === 0) return { subtotal: 0, tax: 0, serviceCharge: 0, discount: 0, grandTotal: 0 };

    // Calculate ratio of this sub-bill to the total order
    const ratio = subBillSubtotal / orderSubtotal;

    // Proportional Financials (Handle missing totals safely)
    const tax = this.round(Number(orderTotals.tax || 0) * ratio, precision);
    const serviceCharge = this.round(Number(orderTotals.serviceCharge || 0) * ratio, precision);
    const discount = this.round(Number(orderTotals.discount || 0) * ratio, precision);

    // Sum everything up
    const grandTotal = subBillSubtotal + tax + serviceCharge - discount;

    return {
      subtotal: this.round(subBillSubtotal, precision),
      tax: this.round(tax, precision),
      serviceCharge: this.round(serviceCharge, precision),
      discount: this.round(discount, precision),
      grandTotal: this.round(grandTotal, precision)
    };
  }

  /**
   * Method 3: Custom / Manual Split
   * Simply handles subtracting paid amounts and checking compliance.
   */
  static calculateRemaining(grandTotal: number, paidAmounts: number[]): number {
    const totalPaid = paidAmounts.reduce((sum, amt) => sum + amt, 0);
    return this.round(grandTotal - totalPaid, 2);
  }

  /**
   * Helper: Precision rounding
   */
  private static round(value: number, decimals: number): number {
    return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
  }
}
