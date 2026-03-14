import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { X, Clock, User, Coffee, PackageSearch, Store, Info, ShoppingBag } from 'lucide-react';

interface ActiveOrdersPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectOrder?: (order: any) => void;
}

export function ActiveOrdersPanel({ isOpen, onClose, onSelectOrder }: ActiveOrdersPanelProps) {

    const { data: activeOrders = [], isLoading } = useQuery({
        queryKey: ['active-orders'],
        queryFn: async () => {
            const data = await api.getKitchenOrders();
            // Strictly filter for active kitchen states
            return data.filter((o: any) => 
                ['PENDING', 'PREPARING', 'READY'].includes(o.status)
            );
        },
        refetchInterval: 5000, // Poll every 5 seconds
        enabled: isOpen,
    });


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex justify-end bg-slate-900/40 backdrop-blur-sm">
            {/* Overlay click to close */}
            <div className="absolute inset-0" onClick={onClose}></div>

            {/* Sidebar Panel */}
            <div className="relative bg-white w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Clock className="text-blue-600" size={22} />
                            Active Orders
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Kitchen Fallback Queue</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                {/* Orders List */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    {isLoading && activeOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                            <div className="w-10 h-10 border-4 border-blue-50 border-t-blue-500 rounded-full animate-spin"></div>
                            <p className="text-xs font-bold uppercase tracking-widest">Fetching live orders...</p>
                        </div>
                    ) : activeOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center border border-slate-100">
                                <ShoppingBag size={32} />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-slate-600">No Active Orders</p>
                                <p className="text-xs font-medium max-w-[200px]">The kitchen queue is currently empty. New orders will appear here automatically.</p>
                            </div>
                        </div>
                    ) : (
                        activeOrders.map((order: any) => (
                            <OrderCard 
                                key={order.id} 
                                order={order} 
                                onClick={() => onSelectOrder?.(order)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function OrderCard({ order, onClick }: { order: any, onClick: () => void }) {
    const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
    const urgency = elapsed > 15 ? 'ERROR' : elapsed > 10 ? 'WARNING' : 'NORMAL';

    const getUrgencyStyles = () => {
        if (urgency === 'ERROR') return 'border-red-100 bg-red-50/30';
        if (urgency === 'WARNING') return 'border-orange-100 bg-orange-50/30';
        return 'border-slate-100 bg-white';
    };

    const getStatusIcon = () => {
        if (order.status === 'PENDING') return <div className="w-2 h-2 bg-amber-500 rounded-full" />;
        if (order.status === 'PREPARING') return <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />;
        if (order.status === 'READY') return <div className="w-2 h-2 bg-emerald-500 rounded-full" />;
        return null;
    };

    const getOrderTypeIcon = () => {
        if (order.orderType === 'DINE_IN') return <Coffee size={14} />;
        if (order.orderType === 'TAKEAWAY') return <PackageSearch size={14} />;
        if (order.orderType === 'DELIVERY') return <Store size={14} />;
        return null;
    };

    return (
        <div 
            className={`rounded-3xl border-2 ${getUrgencyStyles()} overflow-hidden shadow-sm hover:shadow-md transition-all duration-300`}
        >
            <div className="p-4 border-b border-slate-100 flex justify-between items-start cursor-pointer" onClick={onClick}>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-slate-900 font-black text-lg">
                            {order.tokenNumber ? `#${order.tokenNumber}` : order.invoiceNumber || order.orderNumber?.slice(-6).toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500">
                            {getStatusIcon()}
                            {order.status}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${order.orderType === 'DINE_IN' ? 'text-blue-600' : 'text-orange-600'}`}>
                            {getOrderTypeIcon()}
                            {order.orderType?.replace('_', ' ')}
                        </div>
                        {order.tableNumber && <span className="text-[10px] font-bold text-slate-400 uppercase">Table {order.tableNumber}</span>}
                        {order.customerName && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                <User size={10} /> {order.customerName}
                            </span>
                        )}
                    </div>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black ${urgency === 'ERROR' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Clock size={12} />
                    {elapsed}m ago
                </div>
            </div>

            <div className="p-4 bg-white/50 space-y-3">
                {order.orderItems?.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-3">
                        <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center font-black text-blue-600 text-xs shrink-0">
                            {item.quantity}
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-slate-800 leading-tight">
                                {item.product?.name || item.package?.name}
                                {item.size && <span className="text-[10px] text-slate-400 ml-2">({item.size.name})</span>}
                            </div>
                            
                            {(item.notes || (item.addonIds && item.addonIds.length > 0)) && (
                                <div className="mt-1 flex flex-wrap gap-2">
                                    {item.notes && (
                                        <div className="inline-flex items-center gap-1 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded text-[9px] font-bold text-red-600 uppercase">
                                            <Info size={10} /> {item.notes}
                                        </div>
                                    )}
                                    {item.addonIds && item.addonIds.length > 0 && (
                                        <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-[9px] font-bold text-emerald-600 uppercase">
                                            {item.addonIds.length} Add-ons
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}
