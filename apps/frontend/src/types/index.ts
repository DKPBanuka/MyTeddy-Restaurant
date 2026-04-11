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

export interface Category {
    id: string;
    name: string;
    addons?: GlobalAddon[];
    createdAt?: string;
    updatedAt?: string;
}

export interface ProductSize {
    id: string;
    name: string;
    price: string;
    productId: string;
}

export interface GlobalAddon {
    id: string;
    name: string;
    price: string;
    categories?: Category[];
}

export interface PackageItem {
    id: string;
    packageId: string;
    productId: string;
    sizeId?: string | null;
    quantity: number;
    product?: Product;
    size?: ProductSize;
}

export interface Package {
    id: string;
    name: string;
    description: string;
    price: string;
    imageUrl?: string | null;
    isActive?: boolean;
    validFrom?: string;
    validUntil?: string;
    isAvailable?: boolean;
    items?: PackageItem[];
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price: string;
    type: ProductType;
    barcode: string | null;
    imageUrl?: string | null;
    isActive?: boolean;
    categoryId?: string | null;
    // Included relations
    category?: Category | null;
    sizes?: ProductSize[];
    retailStock?: {
        stockQty: number;
        supplierDetails: string;
    } | null;
}

export interface OrderItemDto {
    id?: string;
    productId?: string;
    packageId?: string;
    quantity: number;
    type: ProductType | 'PACKAGE';
    product?: Product;
    package?: Package;
    sizeId?: string;
    size?: ProductSize;
    addonIds?: string[];
    selectedAddons?: GlobalAddon[];
    notes?: string;
    priceAtTimeOfSale?: number | string;
    unitPrice?: number | string;
    subtotal?: number | string;
}

export interface CreateOrderDto {
    items: Omit<OrderItemDto, 'product'>[];
    totalAmount: number;
    subTotal?: number;
    discount?: number;
    grandTotal?: number;
    paymentMethod?: 'CASH' | 'CARD' | 'ONLINE';
    amountReceived?: number;
    change?: number;
    paymentStatus?: 'UNPAID' | 'PAID' | 'PARTIAL' | 'REFUNDED';
    orderType?: OrderType;
    tableNo?: string;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    customerId?: string;
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

export interface OrderPayment {
    id: string;
    orderId: string;
    paymentMethod: string;
    amount: number | string;
    paidItemIds: string[];
    createdAt: string;
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
    customerId?: string | null;
    totalAmount: number | string;
    paymentMethod?: string | null;
    amountReceived?: number | string | null;
    change?: number | string | null;
    userId: string;
    createdAt: string;
    updatedAt: string;
    refundReason?: string | null;
    orderItems?: any[];
    tokenId?: string;
    payments?: OrderPayment[];
}

export interface Customer {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    points: number;
    createdAt: string;
    updatedAt: string;
    _count?: {
        orders: number;
    };
}
