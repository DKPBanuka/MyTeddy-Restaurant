import { useState, useEffect } from 'react';
import { 
    Users, 
    Search, 
    Plus, 
    Edit2, 
    Trash2, 
    Phone, 
    Mail, 
    MapPin, 
    Star,
    ArrowRight,
    CheckCircle2,
    X,
    Clock,
    Calendar as CalendarIcon,
    Loader2 as Spinner
} from 'lucide-react';
import { api } from '../api';
import type { Customer } from '../types';
import { useSocket } from '../context/SocketContext';
import { toast } from 'sonner';

export function Customers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: ''
    });
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedCustomerBookings, setSelectedCustomerBookings] = useState<any[]>([]);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const data = await api.getCustomers();
            setCustomers(data);
        } catch (error) {
            toast.error('Failed to fetch customers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    // --- Real-time Listeners ---
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            console.log('Real-time: Customer updated, refreshing...');
            fetchCustomers();
        };

        socket.on('CUSTOMER_UPDATED', handleUpdate);

        return () => {
            socket.off('CUSTOMER_UPDATED', handleUpdate);
        };
    }, [socket]);

    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone?.includes(searchTerm)
    );

    const handleAddCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createCustomer(formData);
            toast.success('Customer profile created');
            setIsAddModalOpen(false);
            setFormData({ name: '', phone: '', email: '', address: '' });
            fetchCustomers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create customer');
        }
    };

    const handleEditCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer) return;
        try {
            await api.updateCustomer(selectedCustomer.id, formData);
            toast.success('Customer profile updated');
            setIsEditModalOpen(false);
            setSelectedCustomer(null);
            fetchCustomers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update customer');
        }
    };

    const openEditModal = (customer: Customer) => {
        setSelectedCustomer(customer);
        setFormData({
            name: customer.name,
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || ''
        });
        setIsEditModalOpen(true);
    };

    const handleViewHistory = async (customer: Customer) => {
        setIsFetchingHistory(true);
        setSelectedCustomer(customer);
        setIsHistoryModalOpen(true);
        try {
            const data = await api.getPartyBookings({ customerId: customer.id });
            setSelectedCustomerBookings(data);
        } catch (error) {
            toast.error('Failed to fetch booking history');
        } finally {
            setIsFetchingHistory(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            {/* Header Area */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Users className="text-indigo-600" size={28} />
                        Customer Management
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">View profiles and loyalty point balances</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search by name or phone..."
                            className="bg-slate-100 border-none rounded-xl py-2.5 pl-11 pr-4 w-64 md:w-80 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-sm font-semibold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 flex items-center gap-2 font-bold transition-all shadow-lg shadow-indigo-200"
                    >
                        <Plus size={20} />
                        New Profile
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Total Customers</span>
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Users className="text-indigo-600" size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-800">{customers.length}</div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Active Loyalty</span>
                        <div className="p-2 bg-amber-50 rounded-lg">
                            <Star className="text-amber-600" size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-800">
                        {customers.filter(c => c.points > 0).length}
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Total Points Awarded</span>
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <ArrowRight className="text-emerald-600" size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-800">
                        {customers.reduce((sum, c) => sum + c.points, 0).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="h-96 flex flex-col items-center justify-center gap-4">
                        <Spinner className="animate-spin text-indigo-600" size={40} />
                        <span className="text-slate-500 font-bold">Fetching Customer Profiles...</span>
                    </div>
                ) : filteredCustomers.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-bottom border-slate-100">
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Customer Info</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Contact Details</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Loyalty Points</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredCustomers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-sm border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                {customer.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{customer.name}</div>
                                                <div className="text-xs text-slate-400 font-medium leading-none mt-0.5">Joined {new Date(customer.createdAt).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                                                <Phone size={14} className="text-slate-400" />
                                                {customer.phone || 'No phone'}
                                            </div>
                                            {customer.email && (
                                                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                                    <Mail size={14} className="text-slate-400" />
                                                    {customer.email}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${customer.points > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'} border border-amber-100 transition-all`}>
                                            <Star size={16} className={customer.points > 0 ? "fill-current" : ""} />
                                            <span className="font-black text-sm">{customer.points} Points</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleViewHistory(customer)}
                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                title="View Booking History"
                                            >
                                                <Clock size={18} />
                                            </button>
                                            <button 
                                                onClick={() => openEditModal(customer)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                title="Edit Profile"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button 
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete Profile"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center gap-3">
                        <Users className="text-slate-200" size={48} />
                        <div className="text-slate-400 font-bold">No customers found</div>
                    </div>
                )}
            </div>

            {/* History Modal */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsHistoryModalOpen(false)} />
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
                        <div className="bg-indigo-600 px-8 py-6 flex items-center justify-between text-white">
                            <div>
                                <h3 className="text-xl font-black tracking-tight">{selectedCustomer?.name}'s History</h3>
                                <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-1">Party Bookings & Events</p>
                            </div>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                            {isFetchingHistory ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-4">
                                    <Spinner className="animate-spin text-indigo-600" size={32} />
                                    <p className="text-slate-500 font-bold">Loading records...</p>
                                </div>
                            ) : selectedCustomerBookings.length > 0 ? (
                                <div className="space-y-4">
                                    {selectedCustomerBookings.map((booking, idx) => (
                                        <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(booking.eventDate).toLocaleDateString('en-US', { month: 'short' })}</span>
                                                    <span className="text-lg font-black text-slate-800">{new Date(booking.eventDate).toLocaleDateString('en-US', { day: 'numeric' })}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${booking.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                                            {booking.status}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                            <Clock size={12} /> {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="font-black text-slate-800 mt-1">
                                                        {booking.guestCount} PAX • {booking.bookingType}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Amount</p>
                                                <p className="text-lg font-black text-indigo-600">Rs. {Number(booking.totalAmount).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 flex flex-col items-center justify-center text-center gap-4">
                                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center"><CalendarIcon size={32} className="text-slate-300" /></div>
                                    <div>
                                        <p className="text-slate-800 font-black">No party bookings yet</p>
                                        <p className="text-slate-400 text-sm font-bold mt-1">This customer hasn't reserved any events yet.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} />
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-slate-900 px-8 py-6 flex items-center justify-between text-white">
                            <div>
                                <h3 className="text-xl font-black tracking-tight">{isEditModalOpen ? 'Edit Customer' : 'New Customer Profile'}</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Basic Information</p>
                            </div>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={isEditModalOpen ? handleEditCustomer : handleAddCustomer} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                                    <div className="relative">
                                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input 
                                            type="text" 
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl py-3 pl-12 pr-4 font-bold transition-all outline-none"
                                            placeholder="Ex: John Doe"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Phone Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input 
                                                type="tel" 
                                                value={formData.phone}
                                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl py-3 pl-12 pr-4 font-bold transition-all outline-none"
                                                placeholder="07XXXXXXXX"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input 
                                                type="email" 
                                                value={formData.email}
                                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl py-3 pl-12 pr-4 font-bold transition-all outline-none"
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-3 text-slate-400" size={18} />
                                        <textarea 
                                            rows={3}
                                            value={formData.address}
                                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                                            className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl py-3 pl-12 pr-4 font-bold transition-all outline-none resize-none"
                                            placeholder="Customer's physical address..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl py-4 font-black text-lg transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
                            >
                                <CheckCircle2 size={24} />
                                {isEditModalOpen ? 'Save Changes' : 'Create Profile'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Customers;
