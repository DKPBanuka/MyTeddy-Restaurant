export const formatCurrency = (value: number | undefined | null, symbol: string = 'Rs.'): string => {
    if (value === undefined || value === null) return `${symbol} 0.00`;
    return `${symbol} ${value.toFixed(2)}`;
};
