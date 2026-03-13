import React, { createContext, useContext, useState, useEffect } from 'react';
import type { OrderItemDto, OrderType } from '../types';
import { toast } from 'sonner';

interface HeldOrder {
    id: string;
    referenceName: string;
    timestamp: number;
    items: OrderItemDto[];
    orderType: OrderType;
    metadata: {
        tableNo: string;
        customerName: string;
        customerPhone: string;
        deliveryAddress: string;
    };
}

interface CartContextType {
    items: OrderItemDto[];
    orderType: OrderType;
    orderMetadata: {
        tableNo: string;
        customerName: string;
        customerPhone: string;
        deliveryAddress: string;
    };
    heldOrders: HeldOrder[];
    setItems: React.Dispatch<React.SetStateAction<OrderItemDto[]>>;
    setOrderType: React.Dispatch<React.SetStateAction<OrderType>>;
    setOrderMetadata: React.Dispatch<React.SetStateAction<{
        tableNo: string;
        customerName: string;
        customerPhone: string;
        deliveryAddress: string;
    }>>;
    addItem: (item: any) => void;
    removeItem: (index: number) => void;
    updateQty: (index: number, delta: number) => void;
    clearCart: () => void;
    holdOrder: (referenceName: string) => void;
    restoreOrder: (id: string) => void;
    removeHeldOrder: (id: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<OrderItemDto[]>([]);
    const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
    const [orderMetadata, setOrderMetadata] = useState({
        tableNo: '',
        customerName: '',
        customerPhone: '',
        deliveryAddress: ''
    });
    const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);

    // Load held orders from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('heldOrders');
        if (saved) {
            try {
                setHeldOrders(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse held orders', e);
            }
        }
    }, []);

    // Save held orders to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('heldOrders', JSON.stringify(heldOrders));
    }, [heldOrders]);

    const clearCart = () => {
        setItems([]);
        setOrderMetadata({
            tableNo: '',
            customerName: '',
            customerPhone: '',
            deliveryAddress: ''
        });
    };

    const holdOrder = (referenceName: string) => {
        if (items.length === 0) {
            toast.error('Cart is empty');
            return;
        }
        const newHeldOrder: HeldOrder = {
            id: Math.random().toString(36).substr(2, 9),
            referenceName,
            timestamp: Date.now(),
            items: [...items],
            orderType,
            metadata: { ...orderMetadata }
        };
        setHeldOrders(prev => [...prev, newHeldOrder]);
        clearCart();
        toast.success(`Order "${referenceName}" held successfully`);
    };

    const restoreOrder = (id: string) => {
        const order = heldOrders.find(o => o.id === id);
        if (!order) return;

        if (items.length > 0) {
            // Optional: confirm if they want to overwrite current cart
            if (!window.confirm('Restore order? This will replace your current cart.')) return;
        }

        setItems(order.items);
        setOrderType(order.orderType);
        setOrderMetadata(order.metadata);
        setHeldOrders(prev => prev.filter(o => o.id !== id));
        toast.success(`Order "${order.referenceName}" restored`);
    };

    const removeHeldOrder = (id: string) => {
        setHeldOrders(prev => prev.filter(o => o.id !== id));
        toast.info('Held order removed');
    };

    const addItem = (_item: any) => {
        // Logic will be moved here from POSDashboard if needed, or kept simple
        // For now, let's allow POSDashboard to manage complex add logic via setItems for flexibility
    };

    const removeItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const updateQty = (index: number, delta: number) => {
        setItems(prev => {
            const next = [...prev];
            if (next[index]) {
                next[index] = { ...next[index], quantity: Math.max(0, next[index].quantity + delta) };
            }
            return next.filter(i => i.quantity > 0);
        });
    };

    return (
        <CartContext.Provider value={{
            items, orderType, orderMetadata, heldOrders,
            setItems, setOrderType, setOrderMetadata,
            addItem, removeItem, updateQty, clearCart,
            holdOrder, restoreOrder, removeHeldOrder
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
};
