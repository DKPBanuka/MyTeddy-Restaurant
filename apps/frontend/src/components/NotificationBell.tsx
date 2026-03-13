import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Bell, Clock, Coffee, PackageSearch, Store, ChevronRight } from 'lucide-react';

interface NotificationBellProps {
    onRecall: (order: any) => void;
}

export function NotificationBell({ onRecall }: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { data: readyOrders = [] } = useQuery({
        queryKey: ['ready-orders'],
        queryFn: async () => {
            const data = await api.getKitchenOrders();
            // Strictly filter for READY status
            return data.filter((o: any) => o.status === 'READY');
        },
        refetchInterval: 5000,
    });

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const count = readyOrders.length;

    const getOrderTypeIcon = (type: string) => {
        if (type === 'DINE_IN') return <Coffee size={14} />;
        if (type === 'TAKEAWAY') return <PackageSearch size={14} />;
        if (type === 'DELIVERY') return <Store size={14} />;
        return null;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2.5 rounded-full transition-all duration-300 border shadow-sm ${
                    isOpen 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'text-slate-500 hover:bg-slate-100 bg-white border-slate-200'
                }`}
            >
                <Bell size={20} className={count > 0 ? 'animate-bounce' : ''} />
                {count > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white border-2 border-white shadow-sm ring-2 ring-red-500/20">
                        {count}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Ready for Pickup</h3>
                        <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                            {count} Items
                        </span>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {readyOrders.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                                <Bell size={32} className="opacity-20 text-slate-300" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">No orders ready yet</p>
                            </div>
                        ) : (
                            readyOrders.map((order: any) => (
                                <button
                                    key={order.id}
                                    onClick={() => {
                                        onRecall(order);
                                        setIsOpen(false);
                                    }}
                                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-blue-50/50 transition-colors border-b border-slate-50 last:border-0 group text-left"
                                >
                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex flex-col items-center justify-center border border-emerald-100 shrink-0 shadow-sm">
                                        <span className="text-[8px] font-black leading-none opacity-60">TOKEN</span>
                                        <span className="text-sm font-black tracking-tighter">#{order.tokenId || order.orderNumber?.slice(-3).toUpperCase()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-xs font-black text-slate-800 line-clamp-1">
                                                {order.tableNumber ? `Table ${order.tableNumber}` : order.customerName || 'Quick Order'}
                                            </span>
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                                                <Clock size={10} />
                                                {Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)}m
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1 text-[9px] font-black text-blue-600 uppercase tracking-wider">
                                                {getOrderTypeIcon(order.orderType)}
                                                {order.orderType?.replace('_', ' ')}
                                            </div>
                                            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase line-clamp-1 italic">
                                                {order.orderItems?.length} {order.orderItems?.length === 1 ? 'item' : 'items'} ready
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                                </button>
                            ))
                        )}
                    </div>

                    <div className="px-6 py-3 border-t border-slate-50 bg-slate-50/30 text-center">
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-[0.2em] transition-colors"
                        >
                            Close Notifications
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
