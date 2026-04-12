import { useState, useMemo, useEffect } from 'react';
import {
    Search, FileText, Download,
    Printer, RotateCcw, ChevronRight, X, User,
    Banknote, AlertCircle, QrCode,
    Clock, CheckCircle2, LayoutGrid, Filter,
    ShoppingCart, History, TrendingUp,
    Loader2, BadgeCheck, Lock as LockIcon
} from 'lucide-react';
import { format, startOfDay, endOfDay, isToday } from 'date-fns';
import { toast } from 'sonner';
import { generatePDFReceipt } from '../utils/pdfReceipt';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import ModernReceiptUI from '../components/ModernReceiptUI';
import { useSocket } from '../context/SocketContext';

export function OrdersDashboard() {
    const { settings } = useSettings();
    const { user } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [startDate, setStartDate] = useState(format(startOfDay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    
    // Void Modal State
    const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
    const [managerPin, setManagerPin] = useState('');
    const [isVoiding, setIsVoiding] = useState(false);

    const { socket } = useSocket();

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await api.getOrders({
                startDate: startDate ? startOfDay(new Date(startDate)).toISOString() : undefined,
                endDate: endDate ? endOfDay(new Date(endDate)).toISOString() : undefined,
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

    const setPreset = (preset: 'TODAY' | '7D' | '30D' | 'ALL') => {
        const today = new Date();
        switch (preset) {
            case 'TODAY':
                setStartDate(format(today, 'yyyy-MM-dd'));
                setEndDate(format(today, 'yyyy-MM-dd'));
                break;
            case '7D':
                setStartDate(format(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
                setEndDate(format(today, 'yyyy-MM-dd'));
                break;
            case '30D':
                setStartDate(format(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
                setEndDate(format(today, 'yyyy-MM-dd'));
                break;
            case 'ALL':
                setStartDate('');
                setEndDate('');
                break;
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [startDate, endDate, statusFilter, searchQuery]);

    // --- Real-time Listeners ---
    useEffect(() => {
        if (!socket) return;

        const handleOrderUpdate = (data: any) => {
            console.log('Real-time: Order updated via Socket.io', data);
            fetchOrders();
            toast.info('Orders list updated', {
                description: data?.status ? `Order status changed to ${data.status}` : 'A new order was placed or updated elsewhere',
                duration: 3000
            });
        };

        socket.on('ORDER_UPDATED', handleOrderUpdate);
        socket.on('PARTY_BOOKING_UPDATED', handleOrderUpdate);

        return () => {
            socket.off('ORDER_UPDATED', handleOrderUpdate);
            socket.off('PARTY_BOOKING_UPDATED', handleOrderUpdate);
        };
    }, [socket]); // Simplified dependency as fetchOrders is derived from state that used inside useEffect closure but technically should be in deps IF it was wrapped in useCallback. 
                  // But in this component fetchOrders is not memoized, so I'll just use it directly. 
                  // Actually, fetchOrders uses state variables. If I include it in deps, it might cycle if fetchOrders changes (which it doesn't, but it's defined in every render).
                  // So I'll just omit it or wrap it in useCallback. For now, omit for simplicity as the event itself is the trigger.

    const stats = useMemo(() => {
        const count = orders.length;
        const revenue = orders
            .filter((o: any) => o.paymentStatus === 'PAID')
            .reduce((sum: number, o: any) => sum + Number(o.grandTotal || 0), 0);
        const pending = orders.filter((o: any) => o.status === 'PENDING' || o.status === 'PREPARING').length;
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

    const handleDownloadPDF = () => {
        try {
            if (!selectedOrder) return;
            generatePDFReceipt(selectedOrder, settings, settings?.logoUrl);
            toast.success('Downloading PDF receipt...');
        } catch (error) {
            toast.error('Failed to download PDF.');
        }
    };

    const handlePrint = () => {
        if (!selectedOrder) return;
        setTimeout(() => window.print(), 100);
    };

    const handleVoidClick = () => {
        if (user?.role === 'ADMIN') {
            // Admin can void directly or with confirmation
            confirmVoid();
        } else {
            setManagerPin('');
            setIsVoidModalOpen(true);
        }
    };

    const confirmVoid = async (pin?: string) => {
        try {
            setIsVoiding(true);
            await api.updateOrderStatus(selectedOrder.id, 'CANCELLED', pin);
            toast.success('Transaction voided successfully');
            setIsVoidModalOpen(false);
            fetchOrders();
            // Refresh details if open
            const updated = await api.getOrders({ search: selectedOrder.orderNumber });
            if (updated.orders && updated.orders[0]) {
                setSelectedOrder(updated.orders[0]);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Authorization failed');
        } finally {
            setIsVoiding(false);
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
                        {user?.role !== 'CASHIER' && (
                            <button className="flex items-center gap-2.5 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 group">
                                <Download size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                                Export Data
                            </button>
                        )}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-5 hover:border-blue-200 transition-all group">
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                            <ShoppingCart size={28} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
                                {!startDate ? 'All Time Orders' : (startDate === endDate ? `Orders for ${isToday(new Date(startDate)) ? 'Today' : format(new Date(startDate), 'MMM dd')}` : 'Orders in Period')}
                            </p>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{stats.count}</h2>
                        </div>
                    </div>

                    {user?.role !== 'CASHIER' && (
                        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-5 hover:border-emerald-200 transition-all group">
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                                <TrendingUp size={28} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Revenue</p>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Rs. {stats.revenue.toLocaleString()}</h2>
                            </div>
                        </div>
                    )}

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
                        
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                            {/* Preset Buttons */}
                            <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-inner">
                                {[
                                    { label: 'Today', id: 'TODAY' as const },
                                    { label: '7D', id: '7D' as const },
                                    { label: '30D', id: '30D' as const },
                                    { label: 'All', id: 'ALL' as const }
                                ].map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setPreset(p.id)}
                                        className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                                            (p.id === 'ALL' && !startDate) || 
                                            (p.id === 'TODAY' && startDate === format(new Date(), 'yyyy-MM-dd') && endDate === format(new Date(), 'yyyy-MM-dd'))
                                            ? 'bg-white text-indigo-600 shadow-sm' 
                                            : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2 shadow-sm">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">From</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-transparent outline-none font-black text-[11px] text-slate-700 uppercase tracking-widest cursor-pointer w-28"
                                />
                            </div>

                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2 shadow-sm">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">To</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-transparent outline-none font-black text-[11px] text-slate-700 uppercase tracking-widest cursor-pointer w-28"
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
                                        <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-gray-100">Staff</th>
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
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100">
                                                        <User size={14} />
                                                    </div>
                                                    <div className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{order.user?.name || 'SYSTEM'}</div>
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
                                                {selectedOrder.paymentMethod === 'CARD' ? 'QR' : selectedOrder.paymentMethod || 'NONE'} 
                                                {selectedOrder.paymentMethod === 'CASH' ? <Banknote size={18} className="text-emerald-500" /> : (selectedOrder.paymentMethod === 'CARD' || selectedOrder.paymentMethod === 'QR') ? <QrCode size={18} className="text-blue-500" /> : null}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Staff Info */}
                            <div className="p-8 bg-indigo-50/30 rounded-[2rem] border border-indigo-100 flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-50">
                                        <BadgeCheck size={28} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-1 italic">Order Processed By</p>
                                        <h4 className="text-xl font-black text-slate-900 tracking-tight">{selectedOrder.user?.name || 'System Auto'}</h4>
                                    </div>
                                </div>
                                <div className="text-right px-6 py-2 bg-white rounded-xl border border-indigo-100 shadow-sm font-black text-[10px] text-indigo-600 uppercase tracking-[0.2em]">
                                    {selectedOrder.user?.role || 'SERVER'}
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
                        <div className="px-10 py-10 bg-slate-50/80 border-t border-gray-200 flex items-center gap-6 no-print">
                            <button
                                onClick={handlePrint}
                                className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-slate-900 text-white rounded-[1.5rem] font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 group"
                            >
                                <Printer size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                                PRINT RECEIPT
                            </button>

                            <button
                                onClick={handleDownloadPDF}
                                className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-white text-indigo-600 rounded-[1.5rem] font-bold text-[11px] uppercase tracking-[0.2em] border-2 border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm active:scale-95 group"
                            >
                                <Download size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                                DOWNLOAD PDF
                            </button>

                            {selectedOrder.status !== 'CANCELLED' && (
                                <button
                                    onClick={handleVoidClick}
                                    className="px-6 py-5 bg-white text-slate-400 rounded-[1.5rem] font-bold text-[11px] uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-200 border-2 border-gray-100 transition-all shadow-sm active:scale-95 group"
                                    title="Void Transaction"
                                >
                                    <RotateCcw size={20} className="group-hover:-rotate-90 transition-transform" />
                                </button>
                            )}
                        </div>

                        {/* Hidden Receipt specifically for printing */}
                        <div className="hidden print:block">
                            <ModernReceiptUI 
                                orderData={selectedOrder} 
                                settings={settings} 
                                logoUrl={settings?.logoUrl}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Manager PIN Modal */}
            {isVoidModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsVoidModalOpen(false)} />
                    <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-[0_32px_64px_rgba(0,0,0,0.2)] p-10 text-center animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-amber-50/50">
                            <LockIcon size={36} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2 uppercase italic">Authorization Required</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8 leading-relaxed">Please enter a valid Manager PIN to void this transaction.</p>
                        
                        <div className="space-y-6">
                            <input
                                type="password"
                                maxLength={6}
                                placeholder="••••••"
                                value={managerPin}
                                onChange={(e) => setManagerPin(e.target.value)}
                                className="w-full text-center px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white rounded-2xl outline-none font-black text-2xl tracking-[0.5em] transition-all"
                                autoFocus
                            />
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsVoidModalOpen(false)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => confirmVoid(managerPin)}
                                    disabled={managerPin.length < 6 || isVoiding}
                                    className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50"
                                >
                                    {isVoiding ? "Verifying..." : "Authorize Void"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OrdersDashboard;
