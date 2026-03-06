export const ProductType = {
    FOOD: 'FOOD',
    RETAIL: 'RETAIL',
} as const;

export type ProductType = typeof ProductType[keyof typeof ProductType];

export const OrderType = {
    DINE_IN: 'DINE_IN',
    TAKEAWAY: 'TAKEAWAY',
    DELIVERY: 'DELIVERY',
} as const;

export type OrderType = typeof OrderType[keyof typeof OrderType];

export const Role = {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    CASHIER: 'CASHIER',
    WAITER: 'WAITER',
    KITCHEN: 'KITCHEN',
} as const;

export type Role = typeof Role[keyof typeof Role];

export interface Product {
    id: string;
    name: string;
    description: string;
    price: string;
    type: ProductType;
    barcode: string | null;
    imageUrl?: string | null;
    // Included relations
    retailStock?: {
        stockQty: number;
        supplierDetails: string;
    } | null;
}

export interface OrderItemDto {
    productId: string;
    quantity: number;
    type: ProductType;
    product: Product; // Keep local reference for UI details (name, price)
    notes?: string;
}

export interface CreateOrderDto {
    items: Omit<OrderItemDto, 'product'>[];
    totalAmount: number;
    paymentMethod?: string;
    amountReceived?: number;
    change?: number;
    paymentStatus?: 'UNPAID' | 'PAID';
    orderType?: OrderType;
    tableNo?: string;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
}

export interface UpdateOrderDto {
    items: Omit<OrderItemDto, 'product'>[];
    totalAmount: number;
}

export interface PayOrderDto {
    method: string;
    amountReceived?: number;
    change?: number;
}

export interface Order {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    orderType: string;
    tableNumber?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    deliveryAddress?: string | null;
    tokenId?: string | null;
    totalAmount: number | string;
    paymentMethod?: string | null;
    amountReceived?: number | string | null;
    change?: number | string | null;
    userId: string;
    createdAt: string;
    updatedAt: string;
    orderItems?: any[];
}
