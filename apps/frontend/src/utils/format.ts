export const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '₨0.00';
    return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2
    }).format(value);
};
