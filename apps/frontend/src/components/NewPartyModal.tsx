import { useState, useEffect, useCallback } from 'react';
import { X, Calendar as CalendarIcon, Clock, Users, CheckCircle2, User, Phone, Sparkles, AlertCircle, Package, Loader2 } from 'lucide-react';
import { api } from '../api';
import type { PartyBookingDto } from '../api';
import type { Product } from '../types';
import { toast } from 'sonner';

interface NewPartyModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate: Date;
    initialStartTime: string; // e.g., "14:00"
    initialDuration: number;  // e.g., 2
    onSuccess: () => void;    // Callback to refresh the parent dashboard
}

export function NewPartyModal({ isOpen, onClose, initialDate, initialStartTime, initialDuration, onSuccess }: NewPartyModalProps) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [pax, setPax] = useState<number>(20);
    const [bookingType, setBookingType] = useState<'PARTIAL' | 'EXCLUSIVE'>('PARTIAL');
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch all products and use them as selectable packages
    const fetchProducts = useCallback(async () => {
        setIsLoadingProducts(true);
        try {
            const data = await api.getProducts();
            // Show all FOOD type products as potential packages
            const packageProducts = data.filter(p => p.type === 'FOOD');
            setProducts(packageProducts);
            if (packageProducts.length > 0 && !selectedProductId) {
                setSelectedProductId(packageProducts[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch products:', err);
            toast.error('Could not load menu packages.');
        } finally {
            setIsLoadingProducts(false);
        }
    }, [selectedProductId]);

    useEffect(() => {
        if (isOpen) {
            setName('');
            setPhone('');
            setPax(20);
            setBookingType('PARTIAL');
            fetchProducts();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // --- Derived State ---
    const selectedProduct = products.find(p => p.id === selectedProductId);
    const productPricePerPax = selectedProduct ? parseFloat(selectedProduct.price) || 0 : 0;
    const menuTotal = productPricePerPax * pax;
    const hallCharge = bookingType === 'EXCLUSIVE' ? 5000 : 0;
    const estimatedTotal = menuTotal + hallCharge;
    const requiredAdvance = estimatedTotal * 0.30;

    // Compute end time from start time + duration
    const [startHr, startMin] = initialStartTime.split(':').map(Number);
    let endHr = (startHr || 0) + initialDuration;
    const endMin = startMin || 0;
    const endTimeStr = `${endHr.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

    // Build ISO datetime strings for start and end (backend expects DateTime)
    const buildDateTime = (date: Date, timeStr: string): string => {
        const [h, m] = timeStr.split(':').map(Number);
        const d = new Date(date);
        d.setHours(h, m, 0, 0);
        return d.toISOString();
    };

    const handleConfirm = async () => {
        if (!name.trim() || !phone.trim() || pax < 1) {
            toast.error('Please fill in all required fields.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: Omit<PartyBookingDto, 'id' | 'status' | 'createdAt' | 'totalAmount' | 'hallCharge'> = {
                customerName: name.trim(),
                customerPhone: phone.trim(),
                eventDate: initialDate.toISOString(),
                startTime: buildDateTime(initialDate, initialStartTime),
                endTime: buildDateTime(initialDate, endTimeStr),
                guestCount: pax,
                menuTotal,
                addonsTotal: 0,
                advancePaid: requiredAdvance,
                bookingType,
            };

            await api.createPartyBooking(payload);
            toast.success(`Booking for ${name} confirmed! ✅`);
            onSuccess();  // Trigger parent refresh
            onClose();
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Booking failed. Please try again.';
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="bg-slate-50 rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col relative z-10">

                {/* Header */}
                <div className="bg-white px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <Sparkles className="text-blue-600" size={24} />
                            Create New Party Booking
                        </h2>
                        <p className="text-slate-500 font-medium text-sm mt-1">Select a menu package and fill out the event details.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Details & Packages */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Selected Time Banner */}
                        <div className="bg-blue-600 rounded-2xl p-4 flex flex-wrap items-center gap-6 text-white shadow-lg shadow-blue-500/20">
                            <div className="flex items-center gap-2 font-bold bg-white/10 px-4 py-2 rounded-xl">
                                <CalendarIcon size={18} className="text-blue-200" />
                                {initialDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                            <div className="flex items-center gap-2 font-bold bg-white/10 px-4 py-2 rounded-xl">
                                <Clock size={18} className="text-blue-200" />
                                {initialStartTime} - {endTimeStr} ({initialDuration} Hours)
                            </div>
                        </div>

                        {/* Customer Info */}
                        <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 px-1">Customer Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1">Full Name *</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. John Doe"
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-medium text-slate-800 transition-all font-sans"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1">Phone Number *</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="e.g. 077 123 4567"
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-medium text-slate-800 transition-all font-sans"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Pax + Booking Type */}
                        <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                            <div className="flex flex-wrap items-center gap-6">
                                <div className="flex items-center gap-3">
                                    <Users size={18} className="text-slate-400" />
                                    <span className="text-sm font-bold text-slate-600">Guests (Pax):</span>
                                    <input
                                        type="number"
                                        value={pax}
                                        onChange={(e) => setPax(parseInt(e.target.value) || 0)}
                                        min="1"
                                        className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center font-bold text-slate-800 outline-none focus:border-blue-500"
                                    />
                                </div>
                                {/* Booking Type */}
                                <div className="flex items-center gap-3 ml-auto">
                                    <span className="text-sm font-bold text-slate-600">Booking Type:</span>
                                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                                        <button
                                            onClick={() => setBookingType('PARTIAL')}
                                            className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${bookingType === 'PARTIAL' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}
                                        >
                                            Partial
                                        </button>
                                        <button
                                            onClick={() => setBookingType('EXCLUSIVE')}
                                            className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${bookingType === 'EXCLUSIVE' ? 'bg-amber-500 text-amber-950 shadow-sm' : 'text-slate-500'}`}
                                        >
                                            Exclusive (+Rs. 5000)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Package Selection from Products */}
                        <section>
                            <div className="flex items-center gap-3 mb-4 px-1">
                                <Package size={20} className="text-slate-500" />
                                <h3 className="text-lg font-bold text-slate-800">Select Menu Package</h3>
                            </div>

                            {isLoadingProducts ? (
                                <div className="flex items-center justify-center py-12 bg-white rounded-3xl border border-slate-100">
                                    <Loader2 className="animate-spin text-blue-500" size={28} />
                                    <span className="ml-3 text-slate-500 font-medium">Loading packages from menu...</span>
                                </div>
                            ) : products.length === 0 ? (
                                <div className="flex items-center justify-center py-12 bg-white rounded-3xl border border-slate-100 text-slate-400 font-medium">
                                    No menu products found. Add products in the Products module first.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-72 overflow-y-auto pr-1">
                                    {products.map(product => (
                                        <div
                                            key={product.id}
                                            onClick={() => setSelectedProductId(product.id)}
                                            className={`relative cursor-pointer rounded-3xl p-5 border-2 transition-all duration-200 bg-white ${selectedProductId === product.id ? 'border-blue-500 shadow-md' : 'border-slate-100 hover:border-blue-200 shadow-sm'}`}
                                        >
                                            {selectedProductId === product.id && (
                                                <div className="absolute top-4 right-4 text-blue-600">
                                                    <CheckCircle2 size={22} />
                                                </div>
                                            )}
                                            {product.imageUrl && (
                                                <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-2xl object-cover mb-3" />
                                            )}
                                            <div className="font-bold text-base text-slate-800 pr-8">{product.name}</div>
                                            <div className="text-blue-600 font-extrabold text-lg mt-1">
                                                Rs. {parseFloat(product.price).toLocaleString()}
                                                <span className="text-xs text-slate-400 font-semibold"> /pax</span>
                                            </div>
                                            {product.description && (
                                                <p className="mt-2 text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">{product.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                    </div>

                    {/* Right Column: Pricing Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-slate-800 text-white rounded-[2rem] p-6 shadow-2xl sticky top-0">
                            <h3 className="text-xl font-black mb-6">Booking Summary</h3>

                            <div className="space-y-3 mb-6 text-sm font-medium">
                                <div className="flex justify-between items-center bg-white/5 rounded-xl p-3">
                                    <span className="text-slate-300 truncate pr-2">
                                        {selectedProduct ? selectedProduct.name : 'No Package'} ({pax} pax)
                                    </span>
                                    <span className="font-bold shrink-0">Rs. {menuTotal.toLocaleString()}</span>
                                </div>
                                {bookingType === 'EXCLUSIVE' && (
                                    <div className="flex justify-between items-center bg-amber-400/10 border border-amber-400/20 rounded-xl p-3">
                                        <span className="text-amber-300">Hall Charge (Exclusive)</span>
                                        <span className="font-bold text-amber-300">Rs. 5,000</span>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-slate-700 pt-6 space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-slate-400 font-bold">Estimated Total</span>
                                    <span className="text-3xl font-black text-amber-400">Rs. {estimatedTotal.toLocaleString()}</span>
                                </div>
                                <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-4 flex items-start gap-3">
                                    <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <div className="text-amber-400 font-bold text-sm">Required Advance (30%)</div>
                                        <div className="text-white font-black text-xl mt-1">Rs. {requiredAdvance.toLocaleString()}</div>
                                        <div className="text-amber-400/70 text-xs font-medium mt-1">Payable immediately to confirm slot.</div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleConfirm}
                                disabled={isSubmitting || !name.trim() || !phone.trim() || pax < 1 || !selectedProductId}
                                className="w-full mt-8 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black py-4 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Confirming...
                                    </>
                                ) : 'Confirm & Request Advance'}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
