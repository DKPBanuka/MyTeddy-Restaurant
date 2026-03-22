/**
 * Generates a formatted invoice number: INV-YYYYMMDD-XXXX
 * @param dailyOrderCount Optional count of orders for the day. If not provided, a random 4-digit number is used.
 */
export const generateInvoiceNumber = (dailyOrderCount?: number) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Use provided count or generate a random 4-digit sequence as a fallback
    const sequence = dailyOrderCount !== undefined 
        ? String(dailyOrderCount).padStart(4, '0')
        : String(Math.floor(1000 + Math.random() * 9000));
    
    return `INV-${year}${month}${day}-${sequence}`;
};
