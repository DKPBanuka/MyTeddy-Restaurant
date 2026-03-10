import axios from 'axios';
import type { CreateOrderDto, Product } from '../types';

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

export const api = {
    setAuthToken: (token: string | null) => {
        authToken = token;
    },
    login: async (pin: string) => {
        const res = await apiClient.post(`/auth/login`, { pin });
        return res.data;
    },
    getProducts: async (): Promise<Product[]> => {
        const res = await apiClient.get(`/products`);
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
    updateOrderItems: async (id: string, updateData: { items: any[], totalAmount: number }) => {
        const res = await apiClient.patch(`/orders/${id}/items`, updateData);
        return res.data;
    },
    payOrder: async (id: string, paymentDetails: { method: string, amountReceived?: number, change?: number }) => {
        const res = await apiClient.patch(`/orders/${id}/pay`, paymentDetails);
        return res.data;
    },
    getKitchenOrders: async () => {
        const res = await apiClient.get(`/orders/kitchen`);
        return res.data;
    },
    getPendingOrders: async () => {
        const res = await apiClient.get(`/orders/pending`);
        return res.data;
    },
    getTableStatus: async () => {
        const res = await apiClient.get(`/orders/tables/status`);
        return res.data;
    },
    updateOrderStatus: async (id: string, status: string) => {
        const res = await apiClient.patch(`/orders/${id}/status`, { status });
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
    }
};
