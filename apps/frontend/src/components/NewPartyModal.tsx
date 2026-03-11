import { useState, useEffect, useMemo } from 'react';
import { X, Calendar as CalendarIcon, Users, ShoppingBag, CheckCircle2, Loader2, Phone, User, Search } from 'lucide-react';
import { api } from '../api';
import type { Product } from '../types';
import { toast } from 'sonner';

interface NewPartyModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate?: Date;
    initialStartTime?: string;
    initialDuration?: number;
    onSuccess: () => void;
    onOpenTimeline?: (date: string) => void;
}

export function NewPartyModal({
    isOpen,
    onClose,
    initialDate = new Date(),
    initialStartTime = "18:00",
    initialDuration = 3,
    onSuccess,
    onOpenTimeline
}: NewPartyModalProps) {
    // --- Form State ---
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [pax, setPax] = useState<number>(20);
    const [eventDate, setEventDate] = useState<string>(initialDate.toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState(initialStartTime);
    const [durationHrs, setDurationHrs] = useState<number>(initialDuration);
    const [bookingType, setBookingType] = useState<'PARTIAL' | 'EXCLUSIVE'>('PARTIAL');
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    // --- Data State ---
    const [products, setProducts] = useState<Product[]>([]);
    const [menuSearchQuery, setMenuSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
            setEventDate(initialDate.toISOString().split('T')[0]);
            setStartTime(initialStartTime);
            setDurationHrs(initialDuration);
        }
    }, [isOpen, initialDate, initialStartTime, initialDuration]);

    const fetchProducts = async () => {
        setIsLoading(true);
        try {
            const data = await api.getProducts();
            setProducts(data.filter(p => p.type === 'FOOD'));
        } catch (err) {
            toast.error("Failed to load menu items");
        } finally {
            setIsLoading(false);
        }
    };

    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

    const menuTotal = useMemo(() => {
        let total = 0;
        Object.entries(quantities).forEach(([id, qty]) => {
            const product = products.find(p => p.id === id);
            if (product) total += (parseFloat(product.price) || 0) * qty;
        });
        return total;
    }, [quantities, products]);

    const hallCharge = bookingType === 'EXCLUSIVE' ? 5000 : 0;
    const estimatedTotal = menuTotal + hallCharge;
    const requiredAdvance = estimatedTotal * 0.30;

    const handleQuantityChange = (id: string, value: string) => {
        const q = parseInt(value) || 0;
        setQuantities(prev => ({ ...prev, [id]: Math.max(0, q) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !phone || !eventDate || !startTime) {
            toast.error('Please fill in all required fields.');
            return;
        }

        setIsSubmitting(true);
        try {
            const dateObj = new Date(eventDate);
            const [h, m] = startTime.split(':').map(Number);

            const startDateTime = new Date(dateObj);
            startDateTime.setHours(h, m, 0, 0);

            const endDateTime = new Date(startDateTime);
            endDateTime.setHours(startDateTime.getHours() + durationHrs);

            await api.createPartyBooking({
                customerName: name,
                customerPhone: phone,
                eventDate: dateObj.toISOString(),
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                guestCount: pax,
                menuTotal,
                addonsTotal: 0,
                advancePaid: requiredAdvance,
                bookingType,
            });

            toast.success(`Booking for ${name} confirmed! ✅`);
            onSuccess();
            onClose();
            // Reset
            setName(''); setPhone(''); setQuantities({});
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Booking failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center md:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className="bg-white w-full h-full max-h-[100dvh] md:h-auto md:max-h-[90vh] md:max-w-5xl md:rounded-[2.5rem] shadow-2xl relative flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in duration-300">

                {/* Left: Form */}
                <div className="flex-1 p-6 md:p-10 border-r border-slate-100 overflow-y-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-black text-slate-800">New Party</h2>
                            <p className="text-slate-500 font-bold">Fill in the details to book a date</p>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors md:hidden">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-500 flex items-center gap-2">Name <span className="text-red-500">*</span></label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Customer name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-700"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-500 flex items-center gap-2">Phone <span className="text-red-500">*</span></label>
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <input
                                        type="tel"
                                        placeholder="Phone number"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-700"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-bold text-slate-500">Event Date</label>
                                <div className="relative group flex items-center gap-2">
                                    {onOpenTimeline && (
                                        <button
                                            type="button"
                                            onClick={() => onOpenTimeline(eventDate)}
                                            className="shrink-0 w-14 h-[56px] bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 rounded-2xl flex items-center justify-center transition-colors group-focus-within:border-blue-500"
                                            title="Select from Timeline"
                                        >
                                            <CalendarIcon size={20} />
                                        </button>
                                    )}
                                    <input
                                        type="date"
                                        min={todayStr}
                                        value={eventDate}
                                        onChange={(e) => setEventDate(e.target.value)}
                                        required
                                        className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-700"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-500">Start Time</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                    className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-500">Duration (Hrs)</label>
                                <div className="flex bg-slate-50 p-1 rounded-2xl border-2 border-transparent h-[60px]">
                                    {[2, 3, 4, 5].map(h => (
                                        <button
                                            key={h}
                                            type="button"
                                            onClick={() => setDurationHrs(h)}
                                            className={`flex-1 rounded-xl text-sm font-black transition-all ${durationHrs === h ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                                        >
                                            {h}h
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-500">Guest Count</label>
                                <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl h-[60px]">
                                    <button
                                        type="button"
                                        onClick={() => setPax(prev => Math.max(1, prev - 5))}
                                        className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-slate-600 hover:text-blue-600 font-bold"
                                    >
                                        -5
                                    </button>
                                    <div className="flex-1 flex items-center justify-center gap-2">
                                        <Users size={18} className="text-slate-400" />
                                        <span className="text-lg font-black text-slate-700">{pax}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPax(prev => prev + 5)}
                                        className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-slate-600 hover:text-blue-600 font-bold"
                                    >
                                        +5
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-500">Booking Type</label>
                                <div className="flex bg-slate-50 p-1 rounded-2xl h-[60px]">
                                    <button
                                        type="button"
                                        onClick={() => setBookingType('PARTIAL')}
                                        className={`flex-1 rounded-xl text-xs font-black transition-all ${bookingType === 'PARTIAL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                                    >
                                        PARTIAL
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBookingType('EXCLUSIVE')}
                                        className={`flex-1 rounded-xl text-xs font-black transition-all ${bookingType === 'EXCLUSIVE' ? 'bg-amber-500 text-amber-950 shadow-sm' : 'text-slate-400'}`}
                                    >
                                        EXCLUSIVE
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} className="text-blue-400" />}
                                Confirm Booking
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right: Menu & Summary */}
                <div className="w-full md:w-[380px] bg-slate-50 p-6 md:p-10 flex flex-col overflow-y-auto md:max-h-full min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                                <ShoppingBag size={20} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800">Menu Select</h3>
                        </div>
                        <button onClick={onClose} className="hidden md:flex w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shadow-sm">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="relative mb-4 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Find items..."
                            value={menuSearchQuery}
                            onChange={(e) => setMenuSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 focus:border-blue-500 rounded-xl outline-none font-bold text-sm text-slate-700 transition-all font-sans shadow-sm"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="animate-spin text-blue-500" />
                            </div>
                        ) : products
                            .filter(p => p.name.toLowerCase().includes(menuSearchQuery.toLowerCase()))
                            .map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between group hover:ring-2 hover:ring-blue-100 transition-all">
                                    <div className="min-w-0 pr-4">
                                        <h4 className="font-bold text-slate-700 truncate text-sm">{item.name}</h4>
                                        <p className="text-[10px] font-black text-slate-400">Rs. {parseFloat(item.price).toLocaleString()}</p>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={quantities[item.id] || ''}
                                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                        className="w-14 bg-slate-50 border border-slate-200 rounded-xl py-2 text-center font-black text-slate-700 outline-none focus:border-blue-500 transition-all text-xs"
                                    />
                                </div>
                            ))}
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-200 space-y-4">
                        <div className="flex justify-between items-center text-sm font-bold">
                            <span className="text-slate-400 uppercase tracking-wider">Estimated Total</span>
                            <span className="text-slate-800 text-lg">Rs. {estimatedTotal.toLocaleString()}</span>
                        </div>
                        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-amber-800 text-[10px] font-black uppercase tracking-widest">Mandatory Advance (30%)</span>
                                <span className="text-amber-900 font-black">Rs. {requiredAdvance.toLocaleString()}</span>
                            </div>
                            {bookingType === 'EXCLUSIVE' && (
                                <p className="text-[10px] text-amber-600 font-bold">Includes Rs. 5,000 Hall Charge</p>
                            )}
                        </div>
                    </div>
                </div>

                <style>{`
                    .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                `}</style>
            </div>
        </div>
    );
}
