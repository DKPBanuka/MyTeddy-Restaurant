import { X, Clock, User, ArrowRight, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface HeldOrdersModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function HeldOrdersModal({ isOpen, onClose }: HeldOrdersModalProps) {
    const { heldOrders, restoreOrder, removeHeldOrder } = useCart();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Held Orders</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage suspended sales</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {heldOrders.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                <Clock size={32} className="text-slate-200" />
                            </div>
                            <p className="font-bold">No orders currently on hold</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {heldOrders.sort((a, b) => b.timestamp - a.timestamp).map((order) => (
                                <div key={order.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
                                                    <User size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-800 text-lg leading-none">{order.referenceName || 'Unnamed Order'}</h4>
                                                    <div className="flex items-center gap-2 mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        <Clock size={12} />
                                                        {new Date(order.timestamp).toLocaleTimeString()}
                                                        <span className="mx-1">•</span>
                                                        {order.items.length} Items
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-2">
                                                {order.metadata.customerName && (
                                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                                        {order.metadata.customerName}
                                                    </span>
                                                )}
                                                <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">
                                                    {order.orderType}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => removeHeldOrder(order.id)}
                                                className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                                                title="Discard"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    restoreOrder(order.id);
                                                    onClose();
                                                }}
                                                className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                                            >
                                                Restore
                                                <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 font-black text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
