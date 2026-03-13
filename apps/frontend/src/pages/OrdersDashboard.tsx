import { useState, useEffect } from 'react';
import { api } from '../api';
import { Search, Filter, Calendar, ChevronLeft, ChevronRight, Hash, User, Clock, Package, Eye, RotateCcw } from 'lucide-react';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { toast } from 'sonner';

export function OrdersDashboard() {
    const [orders, setOrders] = useState<any[]>([]);
    const [totalOrders, setTotalOrders] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    useEffect(() => {
        fetchOrders();
    }, [page, statusFilter, paymentFilter, dateRange]);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const data = await api.getOrders({
                page,
                limit: 10,
                search: searchTerm,
                status: statusFilter,
                paymentStatus: paymentFilter,
                startDate: dateRange.start,
                endDate: dateRange.end
            });
            setOrders(data.orders);
            setTotalOrders(data.total);
            setTotalPages(data.totalPages);
        } catch (error) {
            toast.error('Failed to fetch orders');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchOrders();
    };

    const handleQuickDate = (range: string) => {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        if (range === 'today') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (range === 'yesterday') {
            start.setDate(now.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setHours(23, 59, 59, 999);
        }
        
        setDateRange({ start: start.toISOString(), end: end.toISOString() });
        setPage(1);
    };

    return (
        <div className="flex-1 flex flex-col h-screen bg-slate-950 overflow-hidden font-sans text-slate-100">
            {/* Header */}
            <header className="px-8 py-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-md shrink-0 z-20">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">Order History</h1>
                        <p className="text-xs font-bold text-slate-500 tracking-[0.2em] uppercase mt-1">Manage, Track, and Refund Orders</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900 border border-white/5 px-4 py-2 rounded-2xl flex flex-col items-end">
                            <span className="text-2xl font-black text-blue-400 leading-none">{totalOrders}</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total Orders</span>
                        </div>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-wrap items-center gap-4">
                    <form onSubmit={handleSearch} className="flex-1 min-w-[300px] relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search Invoice #, Phone or Customer Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all shadow-inner placeholder:text-slate-600"
                        />
                    </form>

                    <div className="flex items-center gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="bg-slate-900 border border-white/5 rounded-2xl py-4 px-4 text-sm font-bold text-slate-300 focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">All Statuses</option>
                            <option value="PENDING">Pending</option>
                            <option value="PREPARING">Preparing</option>
                            <option value="READY">Ready</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>

                        <select
                            value={paymentFilter}
                            onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
                            className="bg-slate-900 border border-white/5 rounded-2xl py-4 px-4 text-sm font-bold text-slate-300 focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">All Payments</option>
                            <option value="UNPAID">Unpaid</option>
                            <option value="PAID">Paid</option>
                            <option value="REFUNDED">Refunded</option>
                            <option value="VOID">Void</option>
                        </select>

                        <div className="flex bg-slate-900 border border-white/5 rounded-2xl p-1">
                            <button onClick={() => handleQuickDate('today')} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!dateRange.start.includes(new Date().toISOString().split('T')[0]) ? 'text-slate-500 hover:text-white' : 'bg-blue-600 text-white'}`}>Today</button>
                            <button onClick={() => handleQuickDate('yesterday')} className="px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Yesterday</button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Table Area */}
            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                        <div className="p-6 bg-slate-900 rounded-full border border-white/5">
                            <Package size={48} />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-400">No Orders Found</h3>
                        <p className="text-sm font-bold">Try adjusting your filters or search term.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                onClick={() => setSelectedOrder(order)}
                                className="group bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 hover:border-blue-500/30 rounded-[2rem] p-6 flex items-center gap-8 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-300"
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${
                                    order.paymentStatus === 'REFUNDED' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}>
                                    <Hash size={24} strokeWidth={2.5} />
                                </div>

                                <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                                    <div className="space-y-1">
                                        <h4 className="font-black text-lg text-white leading-tight">{order.invoiceNumber || order.orderNumber}</h4>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                                            <Clock size={12} /> {new Date(order.createdAt).toLocaleTimeString()}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block font-sans">Customer</span>
                                        <div className="flex items-center gap-2 font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                                            <User size={14} className="text-blue-500" />
                                            {order.customerName || 'Walk-in'}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">Payment</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase ${
                                                order.paymentStatus === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' : 
                                                order.paymentStatus === 'REFUNDED' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                                            }`}>
                                                {order.paymentStatus}
                                            </span>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{order.paymentMethod}</span>
                                        </div>
                                    </div>

                                    <div className="text-right space-y-1">
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">Grand Total</span>
                                        <span className="text-xl font-black text-white italic">Rs {Number(order.grandTotal).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors">
                                        <Eye size={20} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Pagination Footer */}
            {!isLoading && orders.length > 0 && (
                <footer className="px-8 py-4 border-t border-white/5 bg-slate-900/50 flex items-center justify-between shrink-0">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                        Page {page} of {totalPages} • Total {totalOrders} Orders
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="p-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl border border-white/5 transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(page + 1)}
                            className="p-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl border border-white/5 transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </footer>
            )}

            {/* Details Modal */}
            {selectedOrder && (
                <OrderDetailsModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onRefunded={fetchOrders}
                />
            )}
        </div>
    );
}
