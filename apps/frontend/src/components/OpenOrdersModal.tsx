import { useState, useEffect } from 'react';
import { ShoppingBag, X, Clock, AlertCircle } from 'lucide-react';
import { api } from '../api';
import type { Order } from '../types';

interface OpenOrdersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectOrder: (order: Order) => void;
}

export function OpenOrdersModal({ isOpen, onClose, onSelectOrder }: OpenOrdersModalProps) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchPendingOrders();
        }
    }, [isOpen]);

    const fetchPendingOrders = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await api.getPendingOrders();
            setOrders(data);
        } catch (err: any) {
            console.error('Failed to fetch pending orders', err);
            setError('Could not load open orders. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Open Orders</h2>
                        <p className="text-sm font-semibold text-slate-500 mt-0.5">Select a parked bill to append items or pay.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-full transition-all shadow-sm"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 relative">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-4 py-12">
                            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                            <p className="text-sm font-bold text-slate-500">Loading open orders...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                            <AlertCircle size={48} className="text-red-400 mb-4" />
                            <p className="text-red-600 font-bold">{error}</p>
                            <button
                                onClick={fetchPendingOrders}
                                className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                                <ShoppingBag size={32} className="text-slate-300" strokeWidth={1.5} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-700">No Open Orders</h3>
                                <p className="text-sm font-medium text-slate-400 mt-1 max-w-[250px] mx-auto">
                                    All clear! There are currently no parked bills waiting.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {orders.map(order => {
                                const isDineIn = order.orderType === 'DINE_IN';
                                const isTakeaway = order.orderType === 'TAKEAWAY';
                                const timeStr = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                return (
                                    <button
                                        key={order.id}
                                        onClick={() => onSelectOrder(order)}
                                        className="flex flex-col text-left bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group"
                                    >
                                        <div className="flex justify-between items-start w-full mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wider ${isDineIn ? 'bg-blue-100 text-blue-700' :
                                                    isTakeaway ? 'bg-orange-100 text-orange-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>
                                                    {order.orderType}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                <Clock size={12} strokeWidth={3} />
                                                <span>{timeStr}</span>
                                            </div>
                                        </div>

                                        <div className="w-full">
                                            {isDineIn ? (
                                                <div className="text-xl font-black text-slate-800 mb-1">
                                                    Table {order.tableNumber || 'N/A'}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="text-lg font-black text-slate-800 line-clamp-1">
                                                        {order.customerName || 'Walk-in'}
                                                    </div>
                                                    {order.tokenId && (
                                                        <span className="text-xs font-black text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md shrink-0">
                                                            #{order.tokenId}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-auto pt-4 flex items-center justify-between w-full border-t border-slate-100 border-dashed">
                                            <div className="text-xs font-bold text-slate-500">
                                                {order.orderItems?.length || 0} Items
                                            </div>
                                            <div className="font-black text-slate-800 group-hover:text-blue-600 transition-colors">
                                                ${Number(order.totalAmount || 0).toFixed(1)}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
