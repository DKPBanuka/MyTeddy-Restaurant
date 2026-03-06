import { useState, useEffect } from 'react';
import { api } from '../api';
import { toast } from 'sonner';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface KitchenOrderItem {
    id: string;
    quantity: number;
    notes?: string;
    product: {
        id: string;
        name: string;
        type: string;
    };
}

interface KitchenOrder {
    id: string;
    orderNumber: string;
    status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
    createdAt: string;
    orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
    tableNumber?: string;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    tokenId?: string;
    orderItems: KitchenOrderItem[];
}

export function KDSDashboard() {
    const [orders, setOrders] = useState<KitchenOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // Track checked items globally or per order. 
    // Format: "orderId-itemId": boolean
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchOrders();
        // Polling every 5 seconds
        const interval = setInterval(fetchOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchOrders = async () => {
        try {
            const data = await api.getKitchenOrders();
            setOrders(data);
        } catch (error) {
            console.error('Failed to fetch kitchen orders:', error);
            // Using a silent fail here to not spam toast on polling if backend bounces
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkAsReady = async (orderId: string) => {
        try {
            await api.updateOrderStatus(orderId, 'READY');
            toast.success(`Order marked as READY`);
            // Optimistic update
            setOrders(prev => prev.filter(o => o.id !== orderId));

            // Clean up checked items for this order to avoid memory leaks
            setCheckedItems(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(key => {
                    if (key.startsWith(`${orderId}-`)) {
                        delete next[key];
                    }
                });
                return next;
            });
        } catch (error) {
            toast.error('Failed to update order status');
            console.error(error);
        }
    };

    const toggleItemCheck = (orderId: string, itemId: string) => {
        const key = `${orderId}-${itemId}`;
        setCheckedItems(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const pendingOrders = orders.filter(o => o.status === 'PENDING');
    const preparingOrders = orders.filter(o => o.status === 'PREPARING');

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden font-sans text-slate-100">
            {/* Dark Header */}
            <header className="px-8 py-5 flex items-center justify-between border-b border-slate-800 bg-slate-950 shrink-0 z-10 shadow-lg">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        Kitchen Display System
                        <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-500/30">
                            LIVE
                        </span>
                    </h1>
                    <p className="text-sm font-medium text-slate-400 mt-1">Real-time F&B order synchronisation</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-slate-800 text-slate-300 font-bold px-4 py-2 rounded-xl border border-slate-700 shadow-inner flex flex-col items-center justify-center">
                        <span className="text-xl text-white leading-none">{pendingOrders.length}</span>
                        <span className="text-[10px] uppercase tracking-wider">Pending</span>
                    </div>
                    <div className="bg-blue-900/40 text-blue-300 font-bold px-4 py-2 rounded-xl border border-blue-800/50 shadow-inner flex flex-col items-center justify-center">
                        <span className="text-xl text-white leading-none">{preparingOrders.length}</span>
                        <span className="text-[10px] uppercase tracking-wider">Preparing</span>
                    </div>
                </div>
            </header>

            {/* Kanban Board Area */}
            <main className="flex-1 overflow-x-auto overflow-y-hidden p-6 relative">
                {isLoading && orders.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 space-y-4">
                        <div className="bg-slate-800/50 p-6 rounded-full border border-slate-800">
                            <CheckCircle2 size={48} className="text-slate-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-400">All Caught Up!</h2>
                        <p className="text-sm">No active food orders in the queue.</p>
                    </div>
                ) : (
                    <div className="flex h-full gap-6 w-max min-w-full pb-2">
                        {orders.map((order) => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                onMarkReady={() => handleMarkAsReady(order.id)}
                                checkedItems={checkedItems}
                                onToggleItem={(itemId) => toggleItemCheck(order.id, itemId)}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

function OrderCard({ order, onMarkReady, checkedItems, onToggleItem }: { order: KitchenOrder, onMarkReady: () => void, checkedItems: Record<string, boolean>, onToggleItem: (itemId: string) => void }) {
    // Determine urgency color based on time (e.g. > 15 mins is red)
    const minutesElapsed = Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000);
    const isUrgent = minutesElapsed >= 15;
    const isWarning = minutesElapsed >= 10 && minutesElapsed < 15;

    let headerColor = 'bg-slate-800 border-slate-700';
    let timeColor = 'text-slate-400';

    if (isUrgent) {
        headerColor = 'bg-red-900/40 border-red-500/50';
        timeColor = 'text-red-400 font-bold';
    } else if (isWarning) {
        headerColor = 'bg-orange-900/30 border-orange-500/50';
        timeColor = 'text-orange-400 font-bold';
    }

    let typeBorder = 'border-slate-700';
    let typeBadge = 'bg-blue-500 text-white';
    if (order.orderType === 'TAKEAWAY') {
        typeBorder = 'border-orange-500/40';
        typeBadge = 'bg-orange-500 text-white';
    } else if (order.orderType === 'DELIVERY') {
        typeBorder = 'border-green-500/40';
        typeBadge = 'bg-green-500 text-white';
    } else {
        typeBorder = 'border-blue-500/40';
    }

    return (
        <div className={`w-[320px] flex flex-col bg-slate-800 rounded-3xl border-2 ${typeBorder} shadow-[0_8px_32px_rgba(0,0,0,0.4)] shrink-0 overflow-hidden max-h-full`}>
            {/* Card Header */}
            <div className={`p-4 border-b ${headerColor} transition-colors duration-500`}>
                <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                        <h3 className="font-black text-white text-3xl tracking-tight leading-none">
                            {order.tokenId ? `${order.tokenId}` : order.tableNumber ? `Table ${order.tableNumber}` : order.customerName || 'Pending Order'}
                        </h3>
                        {order.customerName && order.tokenId && (
                            <span className="text-slate-400 text-[11px] font-bold mt-1 tracking-wider uppercase">{order.customerName}</span>
                        )}
                    </div>
                    {isUrgent && <AlertCircle size={24} className="text-red-400 animate-pulse mt-1" />}
                </div>

                <div className="mb-3">
                    <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md ${typeBadge}`}>{order.orderType?.replace('_', ' ')}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                        <span className="bg-slate-700/50 px-2.5 py-1 rounded-lg border border-slate-600 capitalize text-xs">{order.status.toLowerCase()}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${timeColor}`}>
                        <Clock size={14} />
                        <span>{formatDistanceToNow(new Date(order.createdAt))}</span>
                    </div>
                </div>
            </div>

            {/* Items List (Checklist) */}
            <div className="flex-1 overflow-y-auto p-2 scroll-smooth custom-scrollbar">
                <div className="space-y-1">
                    {order.orderItems.map((item, idx) => {
                        const isChecked = checkedItems[`${order.id}-${item.id}`];
                        return (
                            <div
                                key={item.id}
                                onClick={() => onToggleItem(item.id)}
                                className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all ${isChecked
                                        ? 'bg-slate-800/20 opacity-60'
                                        : idx % 2 === 0 ? 'bg-slate-800/50 hover:bg-slate-700/50' : 'bg-transparent hover:bg-slate-800/30'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black border shrink-0 transition-colors shadow-inner ${isChecked
                                        ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                                        : 'bg-slate-700 text-white border-slate-600'
                                    }`}>
                                    {isChecked ? <CheckCircle2 size={16} strokeWidth={3} /> : item.quantity}
                                </div>
                                <div className="flex flex-col pt-1 w-full">
                                    <span className={`font-bold text-[15px] leading-tight flex-1 transition-all ${isChecked ? 'text-slate-500 line-through' : 'text-slate-100'
                                        }`}>
                                        {item.product.name}
                                        {/* If checked, still show quantity so they remember what they made */}
                                        {isChecked && <span className="ml-2 text-xs font-semibold text-emerald-500/50">(x{item.quantity})</span>}
                                    </span>
                                    {item.notes && (
                                        <div className="mt-1.5 inline-flex">
                                            <span className={`text-[13px] tracking-wide font-black px-2 py-0.5 rounded uppercase border transition-colors ${isChecked
                                                    ? 'text-slate-500 bg-slate-800/30 border-slate-700/50'
                                                    : 'text-red-500 bg-red-500/10 border-red-500/20'
                                                }`}>
                                                NOTE: {item.notes}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
                <button
                    onClick={onMarkReady}
                    className="w-full py-4 rounded-xl font-black text-[15px] tracking-wide text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-colors shadow-[0_0_20px_rgba(37,99,235,0.2)] border border-blue-500/50 flex items-center justify-center gap-2 group"
                >
                    <CheckCircle2 size={20} className="text-blue-300 group-hover:text-white transition-colors" />
                    MARK AS READY
                </button>
            </div>
        </div>
    );
}
