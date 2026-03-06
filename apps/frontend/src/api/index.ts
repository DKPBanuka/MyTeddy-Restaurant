import axios from 'axios';
import type { CreateOrderDto, Product } from '../types';

const API_BASE_URL = 'http://localhost:3000'; // Default NestJS port

export const api = {
    setAuthToken: (token: string | null) => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    },
    login: async (pin: string) => {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, { pin });
        return response.data;
    },
    getProducts: async (): Promise<Product[]> => {
        const response = await axios.get(`${API_BASE_URL}/products`);
        return response.data;
    },
    uploadProductImage: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_BASE_URL}/products/upload-image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    createOrder: async (orderData: CreateOrderDto) => {
        const response = await axios.post(`${API_BASE_URL}/orders`, orderData);
        return response.data;
    },
    updateOrderItems: async (id: string, updateData: { items: any[], totalAmount: number }) => {
        const response = await axios.patch(`${API_BASE_URL}/orders/${id}/items`, updateData);
        return response.data;
    },
    payOrder: async (id: string, paymentDetails: { method: string, amountReceived?: number, change?: number }) => {
        const response = await axios.patch(`${API_BASE_URL}/orders/${id}/pay`, paymentDetails);
        return response.data;
    },
    getKitchenOrders: async () => {
        const response = await axios.get(`${API_BASE_URL}/orders/kitchen`);
        return response.data;
    },
    getPendingOrders: async () => {
        const response = await axios.get(`${API_BASE_URL}/orders/pending`);
        return response.data;
    },
    updateOrderStatus: async (id: string, status: string) => {
        const response = await axios.patch(`${API_BASE_URL}/orders/${id}/status`, { status });
        return response.data;
    },

    // --- Inventory: Ingredients ---
    getIngredients: async () => {
        const response = await axios.get(`${API_BASE_URL}/inventory/ingredients`);
        return response.data;
    },
    createIngredient: async (data: any) => {
        const response = await axios.post(`${API_BASE_URL}/inventory/ingredients`, data);
        return response.data;
    },
    updateIngredient: async (id: string, data: any) => {
        const response = await axios.patch(`${API_BASE_URL}/inventory/ingredients/${id}`, data);
        return response.data;
    },
    deleteIngredient: async (id: string) => {
        const response = await axios.delete(`${API_BASE_URL}/inventory/ingredients/${id}`);
        return response.data;
    },

    // --- Inventory: Retail Stock ---
    getRetailStock: async () => {
        const response = await axios.get(`${API_BASE_URL}/inventory/retail`);
        return response.data;
    },
    createRetailStock: async (data: any) => {
        const response = await axios.post(`${API_BASE_URL}/inventory/retail`, data);
        return response.data;
    },
    updateRetailStock: async (id: string, data: any) => {
        const response = await axios.patch(`${API_BASE_URL}/inventory/retail/${id}`, data);
        return response.data;
    },
    deleteRetailStock: async (id: string) => {
        const response = await axios.delete(`${API_BASE_URL}/inventory/retail/${id}`);
        return response.data;
    },

    // --- Inventory: Recipe BOM ---
    getRecipeBOMs: async () => {
        const response = await axios.get(`${API_BASE_URL}/inventory/bom`);
        return response.data;
    },
    createRecipeBOM: async (data: any) => {
        const response = await axios.post(`${API_BASE_URL}/inventory/bom`, data);
        return response.data;
    },
    deleteRecipeBOM: async (id: string) => {
        const response = await axios.delete(`${API_BASE_URL}/inventory/bom/${id}`);
        return response.data;
    },

    // --- Reports & Analytics ---
    getReportsSummary: async () => {
        const response = await axios.get(`${API_BASE_URL}/reports/summary`);
        return response.data;
    },

    // --- Staff Management ---
    getStaff: async () => {
        const response = await axios.get(`${API_BASE_URL}/staff`);
        return response.data;
    },
    createStaff: async (data: any) => {
        const response = await axios.post(`${API_BASE_URL}/staff`, data);
        return response.data;
    },
    updateStaff: async (id: string, data: any) => {
        const response = await axios.patch(`${API_BASE_URL}/staff/${id}`, data);
        return response.data;
    },
    deleteStaff: async (id: string) => {
        const response = await axios.delete(`${API_BASE_URL}/staff/${id}`);
        return response.data;
    }
};
