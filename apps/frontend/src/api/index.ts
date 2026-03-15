import axios from 'axios';
import type { CreateOrderDto, Product, Category } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
});

let authToken: string | null = null;

// Request interceptor to inject the token securely
apiClient.interceptors.request.use((config) => {
    if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
});

// Response interceptor to handle errors globally and unwrap data
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error?.response?.data || error.message);
        return Promise.reject(error);
    }
);

// --- DTOs ---
export interface IngredientDto {
    name: string;
    stockQty: number;
    unitOfMeasure: string;
    minLevel: number;
}

export interface RetailStockDto {
    productId: string;
    stockQty: number;
    supplierDetails?: string;
}

export interface RecipeBOMDto {
    productId: string;
    ingredientId: string;
    quantity: number;
}

export interface StaffDto {
    name: string;
    pin: string;
    role: string;
    email?: string;
}

export interface PartyBookingDto {
    id?: string;
    customerId?: string;
    customerName: string;
    customerPhone: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    guestCount: number;
    hallCharge?: number;
    menuTotal: number;
    addonsTotal?: number;
    totalAmount?: number;
    advancePaid?: number;
    bookingType: 'PARTIAL' | 'EXCLUSIVE';
    status?: string;
    createdAt?: string;
}

export const api = {
    setAuthToken: (token: string | null) => {
        authToken = token;
    },
    login: async (pin: string) => {
        const res = await apiClient.post(`/auth/login`, { pin });
        return res.data;
    },
    getProducts: async (categoryId?: string): Promise<Product[]> => {
        const res = await apiClient.get(`/products`, { params: { categoryId } });
        return res.data;
    },
    createProduct: async (data: Partial<Product>): Promise<Product> => {
        const res = await apiClient.post(`/products`, data);
        return res.data;
    },
    updateProduct: async (id: string, data: Partial<Product>): Promise<Product> => {
        const res = await apiClient.patch(`/products/${id}`, data);
        return res.data;
    },
    deleteProduct: async (id: string) => {
        const res = await apiClient.delete(`/products/${id}`);
        return res.data;
    },
    uploadProductImage: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiClient.post(`/products/upload-image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res.data;
    },
    createOrder: async (orderData: CreateOrderDto) => {
        const res = await apiClient.post(`/orders`, orderData);
        return res.data;
    },
    updateOrderItems: async (id: string, updateData: { items: any[], totalAmount: number, subTotal?: number, discount?: number, grandTotal?: number }) => {
        const res = await apiClient.patch(`/orders/${id}/items`, updateData);
        return res.data;
    },
    payOrder: async (id: string, paymentDetails: { method: string, amountReceived?: number, change?: number }) => {
        const res = await apiClient.patch(`/orders/${id}/pay`, paymentDetails);
        return res.data;
    },

    getTableStatus: async () => {
        const res = await apiClient.get(`/orders/tables/status`);
        return res.data;
    },
    getOrders: async (params: { page?: number; limit?: number; status?: string; paymentStatus?: string; search?: string; startDate?: string; endDate?: string }) => {
        const res = await apiClient.get(`/orders`, { params });
        return res.data;
    },
    refundOrder: async (id: string, reason: string) => {
        const res = await apiClient.patch(`/orders/${id}/refund`, { reason });
        return res.data;
    },

    // --- Inventory: Ingredients ---
    getIngredients: async () => {
        const res = await apiClient.get(`/inventory/ingredients`);
        return res.data;
    },
    createIngredient: async (data: IngredientDto) => {
        const res = await apiClient.post(`/inventory/ingredients`, data);
        return res.data;
    },
    updateIngredient: async (id: string, data: Partial<IngredientDto>) => {
        const res = await apiClient.patch(`/inventory/ingredients/${id}`, data);
        return res.data;
    },
    deleteIngredient: async (id: string) => {
        const res = await apiClient.delete(`/inventory/ingredients/${id}`);
        return res.data;
    },

    // --- Inventory: Retail Stock ---
    getRetailStock: async () => {
        const res = await apiClient.get(`/inventory/retail`);
        return res.data;
    },
    createRetailStock: async (data: RetailStockDto) => {
        const res = await apiClient.post(`/inventory/retail`, data);
        return res.data;
    },
    updateRetailStock: async (id: string, data: Partial<RetailStockDto>) => {
        const res = await apiClient.patch(`/inventory/retail/${id}`, data);
        return res.data;
    },
    deleteRetailStock: async (id: string) => {
        const res = await apiClient.delete(`/inventory/retail/${id}`);
        return res.data;
    },

    // --- Inventory: Recipe BOM ---
    getRecipeBOMs: async () => {
        const res = await apiClient.get(`/inventory/bom`);
        return res.data;
    },
    createRecipeBOM: async (data: RecipeBOMDto) => {
        const res = await apiClient.post(`/inventory/bom`, data);
        return res.data;
    },
    deleteRecipeBOM: async (id: string) => {
        const res = await apiClient.delete(`/inventory/bom/${id}`);
        return res.data;
    },

    // --- Reports & Analytics ---
    getReportsSummary: async () => {
        const res = await apiClient.get(`/reports/summary`);
        return res.data;
    },

    // --- Staff Management ---
    getStaff: async () => {
        const res = await apiClient.get(`/staff`);
        return res.data;
    },
    createStaff: async (data: StaffDto) => {
        const res = await apiClient.post(`/staff`, data);
        return res.data;
    },
    updateStaff: async (id: string, data: Partial<StaffDto>) => {
        const res = await apiClient.patch(`/staff/${id}`, data);
        return res.data;
    },
    deleteStaff: async (id: string) => {
        const res = await apiClient.delete(`/staff/${id}`);
        return res.data;
    },

    // --- Party Bookings ---
    getPartyBookings: async (params?: { month?: number; year?: number; date?: string }): Promise<PartyBookingDto[]> => {
        const res = await apiClient.get(`/party-bookings`, { params });
        return res.data;
    },
    createPartyBooking: async (data: Omit<PartyBookingDto, 'id' | 'status' | 'createdAt' | 'totalAmount' | 'hallCharge'>): Promise<PartyBookingDto> => {
        const res = await apiClient.post(`/party-bookings`, data);
        return res.data;
    },
    updatePartyBookingAdvance: async (id: string, amount: number): Promise<PartyBookingDto> => {
        const res = await apiClient.patch(`/party-bookings/${id}/advance`, { amount });
        return res.data;
    },
    updatePartyBookingTime: async (id: string, data: { eventDate: string; startTime: string; endTime: string }): Promise<PartyBookingDto> => {
        const res = await apiClient.patch(`/party-bookings/${id}/time`, data);
        return res.data;
    },
    addPartyBookingExtras: async (id: string, addonsAmount: number): Promise<PartyBookingDto> => {
        const res = await apiClient.patch(`/party-bookings/${id}/extras`, { addonsAmount });
        return res.data;
    },

    // --- Role Permissions ---
    getRolePermissions: async () => {
        const res = await apiClient.get(`/role-permissions`);
        return res.data;
    },
    updateRolePermissions: async (role: string, permissions: string[]) => {
        const res = await apiClient.patch(`/role-permissions/${role}`, { permissions });
        return res.data;
    },
    // --- Categories ---
    getCategories: async (): Promise<Category[]> => {
        const res = await apiClient.get(`/categories`);
        return res.data;
    },
    createCategory: async (name: string): Promise<Category> => {
        const res = await apiClient.post(`/categories`, { name });
        return res.data;
    },
    updateCategory: async (id: string, name: string): Promise<Category> => {
        const res = await apiClient.patch(`/categories/${id}`, { name });
        return res.data;
    },
    deleteCategory: async (id: string) => {
        const res = await apiClient.delete(`/categories/${id}`);
        return res.data;
    },

    // --- Global Addons ---
    getGlobalAddons: async (categoryId?: string): Promise<any[]> => {
        const res = await apiClient.get(`/inventory/global-addons`, { params: { categoryId } });
        return res.data;
    },
    createGlobalAddon: async (data: { name: string, price: number, categoryIds?: string[] }) => {
        const res = await apiClient.post(`/inventory/global-addons`, data);
        return res.data;
    },
    updateGlobalAddon: async (id: string, data: { name: string, price: number, categoryIds?: string[] }) => {
        const res = await apiClient.patch(`/inventory/global-addons/${id}`, data);
        return res.data;
    },
    deleteGlobalAddon: async (id: string) => {
        const res = await apiClient.delete(`/inventory/global-addons/${id}`);
        return res.data;
    },

    // --- Packages ---
    getPackages: async (): Promise<any[]> => {
        const res = await apiClient.get(`/inventory/packages`);
        return res.data;
    },
    createPackage: async (data: any) => {
        const res = await apiClient.post(`/inventory/packages`, data);
        return res.data;
    },
    updatePackage: async (id: string, data: any) => {
        const res = await apiClient.patch(`/inventory/packages/${id}`, data);
        return res.data;
    },
    deletePackage: async (id: string) => {
        const res = await apiClient.delete(`/inventory/packages/${id}`);
        return res.data;
    },
    // --- Settings ---
    getSettings: async () => {
        const res = await apiClient.get(`/settings`);
        return res.data;
    },
    updateSettings: async (data: any) => {
        const res = await apiClient.patch(`/settings`, data);
        return res.data;
    },
};
