import { useState, useRef, useMemo } from 'react';
import { api } from '../api';
import { toast } from 'sonner';
import { 
    Clock, CheckCircle2, Play, CheckCircle, 
    Package, User, Coffee, Info, ChevronRight, RotateCcw 
} from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

interface KitchenOrderItem {
    id: string;
    quantity: number;
    notes?: string;
    product?: {
        id: string;
        name: string;
        type: string;
    };
    package?: {
        id: string;
        name: string;
    };
    addonIds?: string[];
}

interface KitchenOrder {
    id: string;
    orderNumber: string;
    status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
    createdAt: string;
    orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
    tableNumber?: string;
    customerName?: string;
    tokenId?: string;
    orderItems: KitchenOrderItem[];
    invoiceNumber?: string;
}

export function KDSDashboard() {
    const queryClient = useQueryClient();
    const [lastActionOrderId, setLastActionOrderId] = useState<string | null>(null);
    const prevOrdersCount = useRef(0);

    // Audio beep for new orders
    const playNotification = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.warn('Audio play blocked:', e));
    };

    // React Query for Kitchen Orders
    const { data: orders = [], isLoading } = useQuery({
        queryKey: ['kitchen-orders'],
        queryFn: async () => {
            const data = await api.getKitchenOrders();
            
            // Check for new orders to play sound
            const currentPendingCount = data.filter((o: any) => o.status === 'PENDING').length;
            if (currentPendingCount > prevOrdersCount.current) {
                playNotification();
            }
            prevOrdersCount.current = currentPendingCount;
            
            return data as KitchenOrder[];
        },
        refetchInterval: 5000,
    });

    // Mutations for Status Updates
    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: string }) => 
            api.updateOrderStatus(id, status),
        onSuccess: (_, variables) => {
            setLastActionOrderId(variables.id);
            toast.success(`Order moved to ${variables.status}`);
            queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
        },
        onError: () => {
            toast.error('Failed to update order status');
        }
    });

    const undoMutation = useMutation({
        mutationFn: (id: string) => api.undoOrderStatus(id),
        onSuccess: () => {
            toast.success('Action undone successfully');
            setLastActionOrderId(null);
            queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
        },
        onError: () => {
            toast.error('Failed to undo last action');
        }
    });

    // Aggregate Summary Calculation
    const aggregateSummary = useMemo(() => {
        const summary: Record<string, number> = {};
        orders
            .filter(o => o.status === 'PENDING' || o.status === 'PREPARING')
            .forEach(order => {
                order.orderItems.forEach(item => {
                    const name = item.product?.name || item.package?.name || 'Unknown Item';
                    summary[name] = (summary[name] || 0) + item.quantity;
                });
            });
        return Object.entries(summary).sort((a, b) => b[1] - a[1]);
    }, [orders]);

    const columns: { title: string, status: KitchenOrder['status'], color: string }[] = [
        { title: 'New Orders', status: 'PENDING', color: 'border-amber-500/50 bg-amber-500/10' },
        { title: 'In Progress', status: 'PREPARING', color: 'border-blue-500/50 bg-blue-500/10' },
        { title: 'Ready / Served', status: 'READY', color: 'border-emerald-500/50 bg-emerald-500/10' }
    ];

    if (isLoading && orders.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-950 h-screen">
                <div className="w-16 h-16 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-screen bg-slate-950 overflow-hidden font-sans text-slate-100">
            {/* Header */}
            <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-950/80 backdrop-blur-md shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
                        <Coffee className="text-white" size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tight uppercase">Kitchen Portal</h1>
                        <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">Real-time Order Management</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {lastActionOrderId && (
                        <button
                            onClick={() => undoMutation.mutate(lastActionOrderId)}
                            disabled={undoMutation.isPending}
                            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-orange-900/40 animate-in fade-in slide-in-from-right-2 disabled:opacity-50"
                        >
                            {undoMutation.isPending ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <RotateCcw size={14} />}
                            Recall Last Action
                        </button>
                    )}
                    <div className="flex gap-3">
                        {columns.map(col => (
                            <div key={col.status} className="flex flex-col items-center bg-slate-900/50 px-4 py-1.5 rounded-lg border border-white/5">
                                <span className="text-lg font-black leading-none">{orders.filter(o => o.status === col.status).length}</span>
                                <span className="text-[9px] uppercase font-bold text-slate-500">{col.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Kanban Columns */}
                <div className="flex-1 flex gap-4 p-4 overflow-x-auto overflow-y-hidden custom-scrollbar bg-slate-950">
                    {columns.map(col => (
                        <div key={col.status} className="flex flex-col w-[380px] shrink-0 h-full">
                            <div className={`px-4 py-3 rounded-t-2xl border-t border-x ${col.color} flex justify-between items-center bg-slate-900/40`}>
                                <h2 className="font-black text-sm uppercase tracking-widest">{col.title}</h2>
                                <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-bold">{orders.filter(o => o.status === col.status).length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 bg-slate-900/20 border-x border-b border-white/5 rounded-b-2xl space-y-4 custom-scrollbar">
                                {orders
                                    .filter(o => o.status === col.status)
                                    .map(order => (
                                        <KDSOrderCard 
                                            key={order.id} 
                                            order={order} 
                                            onUpdateStatus={(s) => statusMutation.mutate({ id: order.id, status: s })} 
                                            isUpdating={statusMutation.isPending && statusMutation.variables?.id === order.id}
                                        />
                                    ))
                                }
                            </div>
                        </div>
                    ))}
                </div>

                {/* Aggregate Summary Panel */}
                <aside className="w-[320px] bg-slate-900/50 border-l border-white/10 flex flex-col shrink-0">
                    <div className="p-5 border-b border-white/5 bg-slate-900/80">
                        <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <Package size={16} className="text-blue-400" />
                            To Cook Summary
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {aggregateSummary.length > 0 ? (
                            aggregateSummary.map(([name, qty]) => (
                                <div key={name} className="flex items-center justify-between p-3 bg-slate-800/40 border border-white/5 rounded-xl hover:bg-slate-800/60 transition-all">
                                    <span className="font-bold text-[13px] text-slate-200">{name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-500">QTY</span>
                                        <span className="text-lg font-black text-blue-400">×{qty}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-slate-600 gap-3">
                                <CheckCircle2 size={32} />
                                <span className="text-xs font-bold uppercase tracking-widest">Nothing to prep</span>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}

function KDSOrderCard({ order, onUpdateStatus, isUpdating }: { order: KitchenOrder, onUpdateStatus: (s: string) => void, isUpdating: boolean }) {
    const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
    const urgency = elapsed > 15 ? 'ERROR' : elapsed > 10 ? 'WARNING' : 'NORMAL';

    const getUrgencyStyles = () => {
        if (urgency === 'ERROR') return 'border-red-500/50 bg-red-950/20';
        if (urgency === 'WARNING') return 'border-orange-500/50 bg-orange-950/20';
        return 'border-white/10 bg-slate-800/50';
    };

    return (
        <div className={`rounded-3xl border-2 ${getUrgencyStyles()} overflow-hidden shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2`}>
            {/* Card Header */}
            <div className={`p-4 border-b border-white/5 ${urgency === 'ERROR' ? 'bg-red-500/10' : ''}`}>
                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-2xl font-black text-white leading-none tracking-tight">
                        {order.tokenId ? `#${order.tokenId}` : order.tableNumber ? `Table ${order.tableNumber}` : order.customerName || 'Order'}
                    </h3>
                    <div className="flex flex-col items-end">
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase ${urgency === 'ERROR' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                            <Clock size={10} />
                            {elapsed}m ago
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded tracking-[0.1em] uppercase ${order.orderType === 'DINE_IN' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {order.orderType?.replace('_', ' ')}
                    </span>
                    {order.customerName && (
                        <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            <User size={10} /> {order.customerName}
                        </span>
                    )}
                </div>
            </div>

            {/* Items List */}
            <div className="p-4 space-y-3">
                {order.orderItems.map((item, idx) => (
                    <div key={item.id} className="flex gap-3 animate-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                        <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center font-black text-blue-400 shrink-0">
                            {item.quantity}
                        </div>
                        <div className="flex-1">
                            <div className="text-[14px] font-bold text-slate-100 leading-tight">
                                {item.product?.name || item.package?.name}
                            </div>
                            
                            {(item.notes || (item.addonIds && item.addonIds.length > 0)) && (
                                <div className="mt-1 space-y-1">
                                    {item.notes && (
                                        <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md">
                                            <Info size={10} className="text-red-400" />
                                            <span className="text-[10px] font-black text-red-500 uppercase tracking-tight">NOTE: {item.notes}</span>
                                        </div>
                                    )}
                                    {item.addonIds && item.addonIds.length > 0 && (
                                        <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md ml-1">
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tight">ADDONS: {item.addonIds.length}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Buttons */}
            <div className="p-3 bg-slate-900/50 border-t border-white/5">
                {order.status === 'PENDING' && (
                    <button
                        onClick={() => onUpdateStatus('PREPARING')}
                        disabled={isUpdating}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-900/20 border border-blue-400/30 disabled:opacity-50"
                    >
                        {isUpdating ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Play size={16} fill="currentColor" />}
                        Start Preparing
                    </button>
                )}
                {order.status === 'PREPARING' && (
                    <button
                        onClick={() => onUpdateStatus('READY')}
                        disabled={isUpdating}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-900/20 border border-emerald-400/30 disabled:opacity-50"
                    >
                        {isUpdating ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
                        Mark as Ready
                    </button>
                )}
                {order.status === 'READY' && (
                    <button
                        onClick={() => onUpdateStatus('COMPLETED')}
                        disabled={isUpdating}
                        className="w-full py-3.5 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-slate-500/30 disabled:opacity-50"
                    >
                        {isUpdating ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <ChevronRight size={18} />}
                        Complete / Clear
                    </button>
                )}
            </div>
        </div>
    );
}
