export const formatCurrency = (value: number | string | undefined | null, symbol: string = 'Rs.'): string => {
    if (value === undefined || value === null) return `${symbol} 0.00`;
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return `${symbol} 0.00`;
    return `${symbol} ${numValue.toFixed(2)}`;
};
export const toTitleCase = (str: string | undefined | null): string => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};
