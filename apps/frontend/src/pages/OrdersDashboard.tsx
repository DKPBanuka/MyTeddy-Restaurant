import { useState, useMemo, useEffect } from 'react';
import {
    Search, Calendar, FileText, Download,
    Printer, RotateCcw, ChevronRight, X, User,
    CreditCard, Banknote, AlertCircle,
    Clock, CheckCircle2, LayoutGrid, Filter,
    ShoppingCart, History, TrendingUp,
    Loader2
} from 'lucide-react';
import { format, startOfDay, endOfDay, isToday } from 'date-fns';
import { toast } from 'sonner';
import { generatePDFReceipt } from '../utils/pdfReceipt';
import { useSettings } from '../context/SettingsContext';
import { api } from '../api';

export function OrdersDashboard() {
    const { settings } = useSettings();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const start = startOfDay(new Date(selectedDate)).toISOString();
            const end = endOfDay(new Date(selectedDate)).toISOString();
            
            const data = await api.getOrders({
                startDate: start,
                endDate: end,
                status: statusFilter === 'ALL' ? undefined : statusFilter,
                search: searchQuery || undefined,
                limit: 100
            });
            setOrders(data.orders || []);
        } catch (error) {
            toast.error('Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [selectedDate, statusFilter, searchQuery]);

    const stats = useMemo(() => {
        const count = orders.length;
        const revenue = orders.filter(o => o.paymentStatus === 'PAID').reduce((sum, o) => sum + Number(o.grandTotal), 0);
        const pending = orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING').length;
        return { count, revenue, pending };
    }, [orders]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
            case 'READY': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'PREPARING': return 'bg-orange-50 text-orange-600 border-orange-200';
            case 'PENDING': return 'bg-amber-50 text-amber-600 border-amber-200';
            case 'CANCELLED': return 'bg-red-50 text-red-600 border-red-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    const getPaymentBadge = (status: string) => {
        return status === 'PAID' 
            ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
            : 'bg-red-50 text-red-600 border-red-200';
    };

    const handleReprint = () => {
        try {
            if (!selectedOrder) return;
            generatePDFReceipt(selectedOrder, settings, settings?.logoUrl);
            toast.success('Reprinting receipt...');
        } catch (error) {
            toast.error('Failed to reprint receipt.');
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden font-sans">
            {/* Header Area */}
            <div className="bg-white border-b border-gray-200 px-10 py-8 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <History size={32} className="text-indigo-600" />
                            Orders Management
                        </h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-2">Track and manage your restaurant operations</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2.5 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 group">
                            <Download size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                            Export Data
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-5 hover:border-blue-200 transition-all group">
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                            <ShoppingCart size={28} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Orders for {isToday(new Date(selectedDate)) ? 'Today' : format(new Date(selectedDate), 'MMM dd')}</p>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{stats.count}</h2>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-5 hover:border-emerald-200 transition-all group">
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                            <TrendingUp size={28} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Revenue</p>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Rs. {stats.revenue.toLocaleString()}</h2>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-5 hover:border-amber-200 transition-all group">
                        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
                            <Clock size={28} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Active Pending</p>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{stats.pending} Orders</h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Filter Bar */}
                <div className="px-10 py-6 shrink-0">
                    <div className="flex flex-col lg:flex-row items-center gap-4">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Search by Order ID or Customer Name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-16 pr-6 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all shadow-sm placeholder:text-slate-400"
                            />
                        </div>
                        
                        <div className="flex items-center gap-4 w-full lg:w-auto">
                            <div className="relative w-full lg:w-64 flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2 group-focus-within:border-indigo-500 transition-all">
                                <Calendar size={18} className="text-slate-400" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full py-2 bg-transparent outline-none font-black text-[11px] text-slate-700 uppercase tracking-widest cursor-pointer"
                                />
                            </div>

                            <div className="relative w-full lg:w-48">
                                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full pl-11 pr-8 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-black text-[11px] text-slate-700 uppercase tracking-widest appearance-none cursor-pointer"
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="PREPARING">Preparing</option>
                                    <option value="READY">Ready</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 rotate-90" size={16} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 overflow-hidden px-10 pb-10 flex flex-col">
                    <div className="bg-white rounded-[2rem] border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden flex-1 flex flex-col">
                        <div className="overflow-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                                    <tr>
                                        <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-gray-100">Order ID</th>
                                        <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-gray-100">Timestamp</th>
                                        <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-gray-100">Type</th>
                                        <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-gray-100 text-right">Grand Total</th>
                                        <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-gray-100">Payment</th>
                                        <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-gray-100 text-center">Order Status</th>
                                        <th className="px-8 py-6 border-b border-gray-100"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="py-32 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <Loader2 size={48} className="text-indigo-600 animate-spin" />
                                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Retrieving orders...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : orders.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-32 text-center">
                                                <div className="flex flex-col items-center gap-6 text-slate-300">
                                                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-gray-100">
                                                        <LayoutGrid size={64} strokeWidth={1} className="text-slate-200" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-lg font-black text-slate-800 tracking-tight">No match found</p>
                                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Adjust filters or search criteria</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : orders.map((order: any) => (
                                        <tr
                                            key={order.id}
                                            className="hover:bg-indigo-50/30 transition-all cursor-pointer group"
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setIsDetailsModalOpen(true);
                                            }}
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-300 text-xs border border-gray-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                                                        #
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-slate-900 group-hover:text-indigo-700 transition-colors uppercase tracking-tight">{order.orderNumber}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 truncate max-w-[120px]">{order.customerName || 'Walk-in'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <div className="text-sm font-black text-slate-800">{format(new Date(order.createdAt), 'hh:mm a')}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{format(new Date(order.createdAt), 'MMM dd, yyyy')}</div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest border border-gray-100">
                                                    {order.orderType}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="text-lg font-black text-slate-900 tracking-tighter italic">Rs. {Number(order.grandTotal).toLocaleString()}</div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getPaymentBadge(order.paymentStatus)}`}>
                                                    {order.paymentStatus === 'PAID' ? <CheckCircle2 size={12} className="mr-1.5" /> : <AlertCircle size={12} className="mr-1.5" />}
                                                    {order.paymentStatus}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border inline-block ${getStatusBadge(order.status)}`}>
                                                    {order.status}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button className="w-11 h-11 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center transition-all group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-110 group-hover:rotate-6">
                                                    <ChevronRight size={22} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Details Modal Overlay */}
            {isDetailsModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsDetailsModalOpen(false)} />
                    
                    <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-[0_32px_80px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-10 py-10 bg-slate-50/50 border-gray-200 border-b flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="p-4.5 bg-white rounded-[1.75rem] shadow-sm border border-gray-100 text-indigo-600">
                                    <FileText size={32} />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">Order Summary</h2>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedOrder.orderNumber}</span>
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(new Date(selectedOrder.createdAt), 'hh:mm a, MMM dd')}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDetailsModalOpen(false)}
                                className="w-12 h-12 bg-white border border-gray-200 rounded-2xl text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all active:scale-95 flex items-center justify-center"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10">
                            {/* Customer & Info Grid */}
                            <div className="grid grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-l-2 border-indigo-500 pl-3">Customer Profile</p>
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
                                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-500 border border-gray-100 shadow-sm">
                                            <User size={28} />
                                        </div>
                                        <div>
                                            <div className="text-lg font-black text-slate-900">{selectedOrder.customerName || 'Walk-in'}</div>
                                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{selectedOrder.customerPhone || 'GUEST CUSTOMER'}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4 text-right">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-r-2 border-emerald-500 pr-3">Payment Details</p>
                                    <div className="space-y-3">
                                        <div className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border inline-flex items-center ${getPaymentBadge(selectedOrder.paymentStatus)}`}>
                                            {selectedOrder.paymentStatus}
                                        </div>
                                        <div className="flex items-center justify-end gap-3 text-slate-900 font-black">
                                            <span className="text-[11px] uppercase tracking-widest text-slate-400">Via</span>
                                            <span className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 italic">
                                                {selectedOrder.paymentMethod || 'NONE'} 
                                                {selectedOrder.paymentMethod === 'CASH' ? <Banknote size={18} className="text-emerald-500" /> : selectedOrder.paymentMethod === 'CARD' ? <CreditCard size={18} className="text-blue-500" /> : null}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Line Items */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-l-2 border-indigo-500 pl-3">Line Items</h4>
                                    <div className="h-px flex-1 bg-gray-100" />
                                </div>
                                <div className="space-y-3">
                                    {selectedOrder.orderItems?.map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-6 bg-white rounded-3xl border border-gray-100 group transition-all hover:bg-slate-50 hover:shadow-sm">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 bg-indigo-50/50 rounded-2xl flex items-center justify-center font-black text-indigo-600 shadow-sm border border-indigo-100 italic text-lg">
                                                    {item.quantity}x
                                                </div>
                                                <div>
                                                    <div className="text-base font-black text-slate-900 group-hover:text-indigo-700 transition-colors uppercase tracking-tight">{item.product?.name || item.package?.name}</div>
                                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                        {item.productSize?.name || item.size?.name || 'REGULAR'} • Unit Rs. {(item.priceAtTimeOfSale || item.unitPrice).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-black text-slate-900 tracking-tighter italic">Rs. {(Number(item.priceAtTimeOfSale || item.unitPrice) * item.quantity).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white space-y-6 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <TrendingUp size={120} />
                                </div>
                                
                                <div className="space-y-4 relative z-10">
                                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                                        <span>Operating Total</span>
                                        <span>Rs. {Number(selectedOrder.subTotal).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-[0.3em] text-red-400">
                                        <span>Discount Credits</span>
                                        <span>- Rs. {Number(selectedOrder.discount).toLocaleString()}</span>
                                    </div>
                                    <div className="h-px bg-white/10 my-6" />
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-400 block mb-1">Total Payable</span>
                                            <h3 className="text-5xl font-black italic tracking-tighter text-white">Rs. {Number(selectedOrder.grandTotal).toLocaleString()}</h3>
                                        </div>
                                        <div className={`px-6 py-3 rounded-2xl border-2 font-black text-xs uppercase tracking-widest ${getStatusBadge(selectedOrder.status)}`}>
                                            {selectedOrder.status}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedOrder.status === 'CANCELLED' && selectedOrder.refundReason && (
                                <div className="p-8 bg-red-50/50 border border-red-100 rounded-[2.5rem] flex items-start gap-5">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm border border-red-50">
                                        <RotateCcw size={28} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-red-500 uppercase tracking-widest mb-1.5 italic">Resolution Notice</p>
                                        <p className="text-base text-red-900 font-bold leading-relaxed">{selectedOrder.refundReason}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Actions */}
                        <div className="px-10 py-10 bg-slate-50/80 border-t border-gray-200 flex items-center gap-6">
                            <button
                                onClick={handleReprint}
                                className="flex-1 flex items-center justify-center gap-4 px-10 py-6 bg-slate-900 text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 active:scale-95 group"
                            >
                                <Printer size={22} className="group-hover:-translate-y-0.5 transition-transform" />
                                PRINT RECEIPT
                            </button>

                            {selectedOrder.status !== 'CANCELLED' && (
                                <button
                                    className="flex-1 flex items-center justify-center gap-4 px-10 py-6 bg-white text-slate-900 rounded-3xl font-black text-[11px] uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-200 border-2 border-gray-200 transition-all shadow-sm active:scale-95"
                                >
                                    <RotateCcw size={22} />
                                    VOID TRANSACTION
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OrdersDashboard;
