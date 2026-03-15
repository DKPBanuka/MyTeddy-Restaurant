import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import {
    Search, Calendar, FileText, Download,
    Printer, RotateCcw, ChevronRight, X, User,
    DollarSign, CreditCard, Banknote, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { generatePDFReceipt } from '../utils/pdfReceipt';
import { useSettings } from '../context/SettingsContext';

export function OrdersDashboard() {
    const { settings } = useSettings();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isLoadingRefund, setIsLoadingRefund] = useState(false);
    const queryClient = useQueryClient();

    const { data: ordersData, isLoading } = useQuery({
        queryKey: ['orders', selectedDate, searchQuery],
        queryFn: () => api.getOrders({
            startDate: `${selectedDate}T00:00:00Z`,
            endDate: `${selectedDate}T23:59:59Z`,
            search: searchQuery
        }),
    });

    const orders = ordersData?.orders || [];

    // Dashboard Summaries (End of Day Reconciliation)
    const summaries = useMemo(() => {
        const paidOrders = orders.filter((o: any) => o.paymentStatus === 'PAID');
        const totalSales = paidOrders.reduce((sum: number, o: any) => sum + Number(o.grandTotal), 0);
        const cashTotal = paidOrders.filter((o: any) => o.paymentMethod === 'CASH').reduce((sum: number, o: any) => sum + Number(o.grandTotal), 0);
        const cardTotal = paidOrders.filter((o: any) => o.paymentMethod === 'CARD').reduce((sum: number, o: any) => sum + Number(o.grandTotal), 0);

        return { totalSales, cashTotal, cardTotal };
    }, [orders]);

    const handleVoidOrder = async (orderId: string) => {
        const pin = window.prompt("Enter Manager PIN to void this order:");
        if (pin !== '1234') {
            toast.error("Invalid Manager PIN. Access denied.");
            return;
        }

        const reason = window.prompt("Enter reason for voiding/refunding:");
        if (!reason) {
            toast.error("A reason is required to void an order.");
            return;
        }

        try {
            setIsLoadingRefund(true);
            await api.refundOrder(orderId, reason);
            toast.success("Order voided and status updated to REFUNDED.");
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            setIsDetailsModalOpen(false);
        } catch (error) {
            toast.error("Failed to void order.");
            console.error(error);
        } finally {
            setIsLoadingRefund(false);
        }
    };

    const handleReprint = () => {
        try {
            generatePDFReceipt(selectedOrder, selectedOrder.invoiceNumber || selectedOrder.id, settings);
            toast.success('Reprinting receipt...');
        } catch (error) {
            toast.error('Failed to reprint receipt.');
            console.error(error);
        }
    };

    const handleExportCSV = () => {
        if (orders.length === 0) {
            toast.error("No data to export.");
            return;
        }

        const headers = ["Date", "Time", "Invoice", "Customer", "Method", "Pay Status", "KDS Status", "Total"];
        const rows = orders.map((o: any) => [
            format(new Date(o.createdAt), 'yyyy-MM-dd'),
            format(new Date(o.createdAt), 'HH:mm'),
            o.invoiceNumber || o.orderNumber,
            o.customerName || 'Walk-in',
            o.paymentMethod || 'N/A',
            o.paymentStatus,
            o.status,
            o.grandTotal
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Orders_Report_${selectedDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV Export starting...");
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
            {/* Header Area */}
            <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">Reconciliation</h1>
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Order Management & Daily Summary</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-black text-xs text-slate-700 transition-all uppercase tracking-wider"
                            />
                        </div>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                        >
                            <Download size={18} />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <div className="bg-blue-600 rounded-[2.5rem] p-8 shadow-2xl shadow-blue-200 text-white flex items-center justify-between relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <DollarSign size={140} />
                        </div>
                        <div className="relative z-10">
                            <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Total Sales</p>
                            <h2 className="text-4xl font-black tracking-tighter italic">Rs. {summaries.totalSales.toLocaleString()}</h2>
                        </div>
                        <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20">
                            <Banknote size={32} />
                        </div>
                    </div>

                    <div className="bg-emerald-500 rounded-[2.5rem] p-8 shadow-2xl shadow-emerald-200 text-white flex items-center justify-between relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <DollarSign size={140} />
                        </div>
                        <div className="relative z-10">
                            <p className="text-emerald-50 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Cash Total</p>
                            <h2 className="text-4xl font-black tracking-tighter italic">Rs. {summaries.cashTotal.toLocaleString()}</h2>
                        </div>
                        <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20">
                            <Banknote size={32} />
                        </div>
                    </div>

                    <div className="bg-orange-500 rounded-[2.5rem] p-8 shadow-2xl shadow-orange-200 text-white flex items-center justify-between relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <DollarSign size={140} />
                        </div>
                        <div className="relative z-10">
                            <p className="text-orange-50 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Card Total</p>
                            <h2 className="text-4xl font-black tracking-tighter italic">Rs. {summaries.cardTotal.toLocaleString()}</h2>
                        </div>
                        <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20">
                            <CreditCard size={32} />
                        </div>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="flex-1 overflow-hidden p-8 flex flex-col gap-6">
                <div className="relative w-full max-w-2xl shrink-0">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search Invoice #, Phone or Customer..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-16 pr-6 py-5 bg-white border border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all shadow-sm placeholder:text-slate-400"
                    />
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden flex-1 flex flex-col">
                    <div className="overflow-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-md z-10">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Date/Time</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Invoice</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Customer</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Payment</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 text-right">Grand Total</th>
                                    <th className="px-8 py-5 border-b border-slate-100"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="py-32 text-center">
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Syncing Orders...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-32 text-center">
                                            <div className="flex flex-col items-center gap-6 text-slate-300">
                                                <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                                    <FileText size={64} strokeWidth={1} />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-lg font-black text-slate-800 tracking-tight">No records found</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adjust filters or search term</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : orders.map((order: any) => (
                                    <tr
                                        key={order.id}
                                        className="hover:bg-slate-50/80 transition-all cursor-pointer group"
                                        onClick={() => {
                                            setSelectedOrder(order);
                                            setIsDetailsModalOpen(true);
                                        }}
                                    >
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            <div className="text-sm font-black text-slate-800">{format(new Date(order.createdAt), 'hh:mm a')}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{format(new Date(order.createdAt), 'MMM dd, yyyy')}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="px-4 py-1.5 bg-blue-50 text-blue-700 rounded-xl font-black text-xs uppercase tracking-widest border border-blue-100">
                                                #{order.invoiceNumber || order.orderNumber.slice(-6).toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs">
                                                    {(order.customerName || 'W').charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-slate-800">{order.customerName || 'Walk-in'}</div>
                                                    <div className="text-[10px] font-bold text-slate-400">{order.customerPhone || 'UNREGISTERED'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                                {order.paymentMethod === 'CASH' ? <Banknote size={16} className="text-emerald-500" /> : <CreditCard size={16} className="text-orange-500" />}
                                                {order.paymentMethod || 'UNKNOWN'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${order.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                    order.paymentStatus === 'REFUNDED' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                        'bg-amber-50 text-amber-600 border border-amber-100'
                                                }`}>
                                                {order.paymentStatus}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="text-lg font-black text-slate-800 tracking-tighter italic">Rs. {Number(order.grandTotal).toLocaleString()}</div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all">
                                                <ChevronRight size={20} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Order Details Modal */}
            {isDetailsModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-6">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="px-10 py-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-white rounded-[1.5rem] shadow-sm border border-slate-100 text-blue-600">
                                    <FileText size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase">Order Analysis</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                                        #{selectedOrder.invoiceNumber || selectedOrder.orderNumber} • {format(new Date(selectedOrder.createdAt), 'p, MMM dd')}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="p-3 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-800 hover:border-slate-800 transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-10 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-8">
                            {/* Summary Grid */}
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer</p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <div className="text-base font-black text-slate-800">{selectedOrder.customerName || 'Walk-in'}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedOrder.customerPhone || 'NO PHONE ATTACHED'}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4 text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Payment Status</p>
                                    <div className={`inline-flex items-center px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedOrder.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                                        }`}>
                                        {selectedOrder.paymentStatus}
                                    </div>
                                    <div className="text-sm font-black text-slate-800 flex items-center justify-end gap-2 mt-2">
                                        {selectedOrder.paymentMethod} {selectedOrder.paymentMethod === 'CASH' ? <Banknote size={16} /> : <CreditCard size={16} />}
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />

                            {/* Items List */}
                            <div className="space-y-6">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Item Breakdown</p>
                                <div className="space-y-4">
                                    {selectedOrder.orderItems?.map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-3xl border border-slate-100 group hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center font-black text-blue-600 italic">
                                                    {item.quantity}x
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-slate-800">{item.product?.name || item.package?.name}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {item.size?.name || 'STANDARD'} • Rs. {(item.priceAtTimeOfSale || item.unitPrice).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-base font-black text-slate-800 tracking-tight italic">Rs. {(Number(item.priceAtTimeOfSale || item.unitPrice) * item.quantity).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-4 shadow-xl shadow-slate-200">
                                <div className="flex justify-between text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                                    <span>Sub Total</span>
                                    <span>Rs. {Number(selectedOrder.subTotal).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-black uppercase tracking-[0.2em] text-red-400">
                                    <span>Applied Discount</span>
                                    <span>-Rs. {Number(selectedOrder.discount).toFixed(2)}</span>
                                </div>
                                <div className="h-px bg-white/10" />
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-black uppercase tracking-[0.3em]">Grand Total</span>
                                    <span className="text-3xl font-black italic tracking-tighter text-blue-400">Rs. {Number(selectedOrder.grandTotal).toFixed(2)}</span>
                                </div>
                            </div>

                            {selectedOrder.refundReason && (
                                <div className="p-6 bg-red-50 border border-red-100 rounded-3xl flex items-start gap-4">
                                    <AlertCircle className="text-red-500 shrink-0" size={24} />
                                    <div>
                                        <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-1">Refund Reason</p>
                                        <p className="text-sm text-red-800 font-bold leading-relaxed">{selectedOrder.refundReason}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Actions */}
                        <div className="px-10 py-8 bg-slate-50/80 border-t border-slate-100 flex items-center gap-4">
                            <button
                                onClick={handleReprint}
                                className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-700 hover:bg-slate-100 transition-all shadow-sm"
                            >
                                <Printer size={20} />
                                Reprint Receipt
                            </button>

                            {selectedOrder.paymentStatus !== 'REFUNDED' && (
                                <button
                                    onClick={() => handleVoidOrder(selectedOrder.id)}
                                    disabled={isLoadingRefund}
                                    className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-200 disabled:opacity-50"
                                >
                                    {isLoadingRefund ? (
                                        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <RotateCcw size={20} />
                                            Void / Refund Order
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
