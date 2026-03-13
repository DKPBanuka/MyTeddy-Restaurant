import { X, Printer, RotateCcw, Clock, CreditCard, Banknote, Globe, Info, Package, User, Hash } from 'lucide-react';
import { generatePDFReceipt } from '../utils/pdfReceipt';
import { api } from '../api';
import { toast } from 'sonner';

interface OrderDetailsModalProps {
    order: any;
    onClose: () => void;
    onRefunded: () => void;
}

export function OrderDetailsModal({ order, onClose, onRefunded }: OrderDetailsModalProps) {
    if (!order) return null;

    const handleReprint = () => {
        try {
            generatePDFReceipt(order);
            toast.success('Reprinting receipt...');
        } catch (error) {
            toast.error('Failed to generate receipt');
        }
    };

    const handleRefund = async () => {
        if (!window.confirm('Are you sure you want to VOID/REFUND this order? This action cannot be undone.')) return;

        try {
            await api.refundOrder(order.id);
            toast.success('Order refunded successfully');
            onRefunded();
            onClose();
        } catch (error) {
            toast.error('Failed to process refund');
        }
    };

    const getPaymentIcon = (method: string) => {
        switch (method) {
            case 'CASH': return <Banknote size={16} />;
            case 'CARD': return <CreditCard size={16} />;
            case 'ONLINE': return <Globe size={16} />;
            default: return null;
        }
    };

    const isRefunded = order.paymentStatus === 'REFUNDED';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${isRefunded ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            <Hash size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white leading-none uppercase tracking-tight">
                                {order.invoiceNumber || order.orderNumber}
                            </h2>
                            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">
                                Order Details • {new Date(order.createdAt).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {/* Customer & Status Info */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-slate-800/40 p-5 rounded-3xl border border-white/5 space-y-3">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <User size={12} /> Customer Info
                            </h3>
                            <div className="space-y-1">
                                <p className="font-bold text-white">{order.customerName || 'Walk-in Customer'}</p>
                                {order.customerPhone && <p className="text-sm text-slate-400">{order.customerPhone}</p>}
                                <p className="text-[10px] font-black text-blue-500 uppercase">{order.orderType?.replace('_', ' ')}</p>
                            </div>
                        </div>
                        <div className="bg-slate-800/40 p-5 rounded-3xl border border-white/5 space-y-3">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={12} /> Payment Info
                            </h3>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                        isRefunded ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                                    }`}>
                                        {order.paymentStatus}
                                    </span>
                                    {order.paymentMethod && (
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                                            {getPaymentIcon(order.paymentMethod)}
                                            {order.paymentMethod}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-400 capitalize">KDS Status: {order.status?.toLowerCase()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Package size={14} /> Item Breakdown
                        </h3>
                        <div className="space-y-2">
                            {order.orderItems?.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-800/40 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-700/50 rounded-xl flex items-center justify-center font-black text-blue-400">
                                            {item.quantity}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-100">{item.product?.name || item.package?.name}</p>
                                            {item.notes && (
                                                <span className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1 mt-0.5">
                                                    <Info size={10} /> {item.notes}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="font-bold text-slate-300">Rs {Number(item.subtotal).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-slate-900/80 p-6 rounded-3xl border border-white/10 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-bold uppercase tracking-wider">Subtotal</span>
                            <span className="text-slate-300 font-bold">Rs {Number(order.subTotal).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-bold uppercase tracking-wider">Discount</span>
                            <span className="text-red-400 font-bold">- Rs {Number(order.discount).toLocaleString()}</span>
                        </div>
                        <div className="pt-3 border-t border-white/5 flex justify-between">
                            <span className="text-lg font-black text-white uppercase tracking-tighter">Grand Total</span>
                            <span className="text-2xl font-black text-blue-400">Rs {Number(order.grandTotal).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-8 py-6 border-t border-white/5 bg-slate-900/50 flex gap-4">
                    <button
                        onClick={handleReprint}
                        className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-white/5"
                    >
                        <Printer size={18} />
                        Reprint Receipt
                    </button>
                    {!isRefunded && (
                        <button
                            onClick={handleRefund}
                            className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-red-900/20 border border-red-400/30"
                        >
                            <RotateCcw size={18} />
                            Void / Refund
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
