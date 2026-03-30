import { useState, useEffect, useMemo } from 'react';
import { X, Calendar as CalendarIcon, Users, ShoppingBag, CheckCircle2, Loader2, Phone, User, Clock, ChevronRight, Package as PackageIcon, Utensils, Plus, Minus } from 'lucide-react';
import { VisualTimePickerPopup } from './VisualTimePickerPopup';
import { MenuSelectionPopup } from './MenuSelectionPopup';
import { useSettings } from '../context/SettingsContext';
import { api, type PartyBookingDto } from '../api';
import type { OrderItemDto } from '../types';
import { toast } from 'sonner';

interface NewPartyModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate?: Date;
    initialStartTime?: string;
    initialDuration?: number;
    initialData?: PartyBookingDto | null;
    onSuccess: (date?: Date) => void;
}

export function NewPartyModal({
    isOpen,
    onClose,
    initialDate,
    initialStartTime,
    initialDuration = 3,
    initialData,
    onSuccess,
}: NewPartyModalProps) {
    const { settings } = useSettings();
    const partyExclusiveCharge = settings?.partyExclusiveCharge ?? 5000;
    const partyAdvancePercentage = settings?.partyAdvancePercentage ?? 30;

    // --- Form State ---
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [pax, setPax] = useState<number>(20);
    // Force user to pick date/time
    const [eventDate, setEventDate] = useState<string | null>(null);
    const [startTime, setStartTime] = useState<string | null>(null);
    const [durationHrs, setDurationHrs] = useState<number>(initialDuration);
    const [bookingType, setBookingType] = useState<PartyBookingDto['bookingType']>('PARTIAL');
    const [manualAdvance, setManualAdvance] = useState<number | null>(null);
    const [selectedMenuItems, setSelectedMenuItems] = useState<OrderItemDto[]>([]);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
    const [isMenuPickerOpen, setIsMenuPickerOpen] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [customers, setCustomers] = useState<any[]>([]);
    const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [saveToCRM, setSaveToCRM] = useState(false);

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const data = await api.getCustomers();
                setCustomers(data);
            } catch (e) { console.error('Failed to fetch customers', e); }
        };
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.customerName || '');
                setPhone(initialData.customerPhone || '');
                setPax(initialData.guestCount || 20);
                
                const ed = new Date(initialData.eventDate);
                setEventDate(ed.toISOString().split('T')[0]);
                
                const st = new Date(initialData.startTime);
                setStartTime(`${String(st.getHours()).padStart(2, '0')}:${String(st.getMinutes()).padStart(2, '0')}`);
                
                const et = new Date(initialData.endTime);
                let dur = (et.getTime() - st.getTime()) / (1000 * 60 * 60);
                if (dur <= 0) dur = 3;
                setDurationHrs(dur);
                
                setBookingType(initialData.bookingType || 'PARTIAL');
                setManualAdvance(initialData.advancePaid ?? null);
                
                let parsedItems = [];
                if (initialData.items) {
                    try {
                        parsedItems = typeof initialData.items === 'string' ? JSON.parse(initialData.items) : initialData.items;
                    } catch (e) { parsedItems = []; }
                }
                setSelectedMenuItems(parsedItems);
            } else {
                // Initialize from props if creating new
                if (initialDate) {
                    setEventDate(initialDate.toISOString().split('T')[0]);
                } else {
                    setEventDate(null);
                }
                setStartTime(initialStartTime || null);
                setDurationHrs(initialDuration);
                setName('');
                setPhone('');
                setPax(20);
                setBookingType('PARTIAL');
                setManualAdvance(null);
                setSelectedMenuItems([]);
                setCustomerId(null);
                setSaveToCRM(false);
            }
        }
    }, [isOpen, initialData, initialDuration, initialDate, initialStartTime]);

    useEffect(() => {
        if (name.length > 1 && !customerId) {
            const filtered = customers.filter(c => 
                c.name.toLowerCase().includes(name.toLowerCase()) || 
                c.phone?.includes(name)
            );
            setFilteredCustomers(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setShowSuggestions(false);
        }
    }, [name, customers, customerId]);

    const handleSelectCustomer = (c: any) => {
        setCustomerId(c.id);
        setName(c.name);
        setPhone(c.phone || '');
        setShowSuggestions(false);
    };



    const formatTimeToAMPM = (timeStr: string | null) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
    };

    const getEndTime = (startTimeStr: string | null, duration: number) => {
        if (!startTimeStr) return '—';
        try {
            const [h, m] = startTimeStr.split(':').map(Number);
            const totalMinutes = h * 60 + m + duration * 60;
            const endH = Math.floor(totalMinutes / 60) % 24;
            const endM = totalMinutes % 60;
            return formatTimeToAMPM(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);
        } catch (e) { return '—'; }
    };

    const menuTotal = useMemo(() => {
        return selectedMenuItems.reduce((total, item) => {
            let price = 0;
            if (item.packageId) {
                price = parseFloat(item.package?.price || '0');
            } else if (item.productId) {
                price = item.size ? parseFloat(item.size.price) : parseFloat(item.product?.price || '0');
                if (item.selectedAddons) {
                    price += item.selectedAddons.reduce((sum, a) => sum + parseFloat(a.price), 0);
                }
            } else if (item.addonIds && item.selectedAddons) {
                price = parseFloat(item.selectedAddons[0].price || '0');
            }
            return total + (price * item.quantity);
        }, 0);
    }, [selectedMenuItems]);

    const hallCharge = bookingType === 'EXCLUSIVE' ? partyExclusiveCharge : 0;
    const estimatedTotal = menuTotal + hallCharge;
    const requiredAdvance = estimatedTotal * (partyAdvancePercentage / 100);
    const finalAdvance = manualAdvance !== null ? manualAdvance : 0;

    const isFormValid = name.trim() !== '' && phone.trim() !== '' && eventDate !== null && startTime !== null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !phone || !eventDate || !startTime) {
            toast.error('Please fill in all required fields.');
            return;
        }

        setIsSubmitting(true);
        try {
            let finalCustomerId = customerId;

            // Optional: Auto-create customer if requested
            if (!finalCustomerId && saveToCRM) {
                try {
                    const newCust = await api.createCustomer({ name, phone });
                    finalCustomerId = newCust.id;
                    toast.success('Customer added to CRM! 👤');
                } catch (e) {
                    console.error('Failed to auto-create customer', e);
                }
            }

            const dateObj = new Date(eventDate!);
            const [h, m] = startTime!.split(':').map(Number);

            const startDateTime = new Date(dateObj);
            startDateTime.setHours(h, m, 0, 0);

            const endDateTime = new Date(startDateTime);
            endDateTime.setHours(startDateTime.getHours() + durationHrs);

            const payload = {
                customerName: name,
                customerPhone: phone,
                eventDate: dateObj.toISOString(),
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                guestCount: pax,
                menuTotal,
                addonsTotal: 0,
                advancePaid: finalAdvance,
                items: selectedMenuItems,
                bookingType,
                customerId: finalCustomerId || undefined,
            };

            if (initialData && initialData.id) {
                await api.updatePartyBooking(initialData.id, payload);
                toast.success(`Booking for ${name} updated successfully! ✅`);
            } else {
                await api.createPartyBooking(payload);
                toast.success(`Booking for ${name} confirmed! ✅`);
            }
            onSuccess(dateObj);
            onClose();
            // Reset
            setName(''); setPhone(''); setSelectedMenuItems([]); setManualAdvance(null);
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
                <div className="flex-1 p-6 md:p-12 border-r border-slate-100 overflow-y-auto bg-slate-50/50">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight">{initialData ? 'Edit Celebration' : 'New Party'}</h2>
                            <p className="text-slate-500 font-bold mt-1">{initialData ? 'Update event parameters' : 'Design your perfect celebration'}</p>
                        </div>
                        <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all hover:scale-105 active:scale-95 md:hidden">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">Name <span className="text-red-500">*</span></label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Enter customer name"
                                        value={name}
                                        onChange={(e) => {
                                            if (customerId) setCustomerId(null);
                                            setName(e.target.value);
                                        }}
                                        required
                                        disabled={!!initialData}
                                        className={`w-full pl-12 pr-4 py-4.5 bg-white border-2 border-slate-100 focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-slate-700 shadow-sm focus:shadow-blue-500/10 ${initialData ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`}
                                    />
                                    {showSuggestions && (
                                        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-[120] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                            {filteredCustomers.map((c, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => handleSelectCustomer(c)}
                                                    className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between border-b border-slate-50 last:border-0"
                                                >
                                                    <div>
                                                        <p className="font-black text-slate-800 text-sm">{c.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{c.phone}</p>
                                                    </div>
                                                    <ChevronRight size={16} className="text-slate-300" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {!customerId && !initialData && name.length > 1 && (
                                    <div className="flex items-center gap-2 mt-2 px-1 animate-in fade-in slide-in-from-left-2">
                                        <input 
                                            type="checkbox" 
                                            id="saveToCRM" 
                                            checked={saveToCRM}
                                            onChange={(e) => setSaveToCRM(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <label htmlFor="saveToCRM" className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer">Save as new customer</label>
                                    </div>
                                )}
                                {customerId && (
                                    <div className="flex items-center gap-2 mt-2 px-1 text-emerald-600 animate-in fade-in slide-in-from-left-2">
                                        <CheckCircle2 size={12} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Linked to CRM Profile</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">Phone <span className="text-red-500">*</span></label>
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={20} />
                                    <input
                                        type="tel"
                                        placeholder="Phone number"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-4 py-4.5 bg-white border-2 border-slate-100 focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-slate-700 shadow-sm focus:shadow-blue-500/10"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Unified Time Slot Selection (UX-First) */}
                        <div className="space-y-3">
                            <label className={`text-[10px] font-black uppercase tracking-widest px-1 transition-colors ${!eventDate ? 'text-red-400' : 'text-slate-400'}`}>
                                Time Slot <span className="text-red-500">*</span>
                            </label>
                            <div 
                                onClick={() => setIsTimePickerOpen(true)}
                                className={`group relative overflow-hidden bg-white/40 backdrop-blur-md border-2 border-dashed ${!eventDate ? 'border-red-200 bg-red-50/10' : 'border-slate-200'} hover:border-violet-500 hover:bg-white rounded-[2rem] p-6 cursor-pointer transition-all active:scale-[0.99] shadow-sm hover:shadow-xl hover:shadow-violet-600/5`}
                            >
                                <div className="flex items-center gap-6 relative z-10">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${!eventDate ? 'bg-red-50 text-red-400' : 'bg-violet-50 text-violet-600'} group-hover:bg-violet-600 group-hover:text-white`}>
                                        <Clock size={28} />
                                    </div>
                                    <div className="flex-1">
                                        {!eventDate ? (
                                            <div>
                                                <h4 className="text-lg font-black text-red-950/40">Select schedule...</h4>
                                                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none">Required for booking</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <CalendarIcon size={14} className="text-violet-500" />
                                                    <span className="text-lg font-black text-slate-900 leading-none">
                                                        {new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Start</span>
                                                        <span className="flex items-center gap-1.5 bg-violet-100 text-violet-700 px-3 py-1 rounded-xl font-black text-[11px] shadow-sm shadow-violet-600/5">
                                                            <Clock size={12} />
                                                            {formatTimeToAMPM(startTime)}
                                                        </span>
                                                    </div>
                                                    <div className="w-4 h-px bg-slate-200 mt-4 mr-1"></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">End</span>
                                                        <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded-xl font-black text-[11px]">
                                                            <Clock size={12} className="text-slate-400" />
                                                            {getEndTime(startTime, durationHrs)}
                                                        </span>
                                                    </div>
                                                    <div className="ml-auto flex flex-col items-end">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Duration</span>
                                                        <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-xl font-black text-[10px] border border-emerald-100">
                                                            {durationHrs} Hours
                                                        </span>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="text-violet-600 font-black text-[9px] uppercase tracking-[0.2em] bg-white border border-violet-100 px-4 py-2 rounded-xl shadow-sm group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-600 transition-all">
                                        {eventDate ? 'Change' : 'Choose'}
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Guest Count (Pax)</label>
                                <div className="flex items-center gap-3 bg-white border-2 border-slate-100 p-2 rounded-2xl h-[64px] focus-within:border-blue-500 transition-all shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => setPax(prev => Math.max(1, prev - 1))}
                                        className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all hover:bg-red-50"
                                    >
                                        <Minus size={20} />
                                    </button>
                                    <div className="flex-1 flex items-center justify-center gap-2">
                                        <Users size={20} className="text-blue-500" />
                                        <input 
                                            type="number"
                                            value={pax === 0 ? '' : pax}
                                            onChange={(e) => setPax(parseInt(e.target.value) || 0)}
                                            className="w-16 bg-transparent text-center text-xl font-black text-slate-900 outline-none"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPax(prev => prev + 1)}
                                        className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all hover:bg-blue-50"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Booking Type</label>
                                <div className="flex bg-slate-100 p-1.5 rounded-2xl h-[64px] shadow-inner">
                                    <button
                                        type="button"
                                        onClick={() => setBookingType('PARTIAL')}
                                        className={`flex-1 rounded-xl text-[10px] font-black tracking-tighter transition-all ${bookingType === 'PARTIAL' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}
                                    >
                                        PARTIAL
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBookingType('EXCLUSIVE')}
                                        className={`flex-1 rounded-xl text-[10px] font-black tracking-tighter transition-all ${bookingType === 'EXCLUSIVE' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400'}`}
                                    >
                                        EXCLUSIVE
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Menu Selection Summary Card */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                Menu Selection
                            </label>
                            <div 
                                onClick={() => setIsMenuPickerOpen(true)}
                                className="group relative overflow-hidden bg-white/40 backdrop-blur-md border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-white rounded-[2rem] p-6 cursor-pointer transition-all active:scale-[0.99] shadow-sm hover:shadow-xl hover:shadow-blue-600/5"
                            >
                                <div className="flex items-center gap-6 relative z-10">
                                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 transition-all duration-500 group-hover:bg-blue-600 group-hover:text-white">
                                        {selectedMenuItems.length > 0 && selectedMenuItems[0].packageId ? <PackageIcon size={28} /> : <Utensils size={28} />}
                                    </div>
                                    <div className="flex-1">
                                        {selectedMenuItems.length === 0 ? (
                                            <div>
                                                <h4 className="text-lg font-black text-slate-300">No items selected</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5 italic leading-none">Optional</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-lg font-black text-slate-900 leading-none truncate max-w-[150px]">
                                                        {selectedMenuItems[0].package?.name || selectedMenuItems[0].product?.name || 'Selected'}
                                                        {selectedMenuItems.length > 1 && <span className="text-blue-600 ml-1">+{selectedMenuItems.length - 1}</span>}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full font-black text-[10px]">
                                                        Rs. {menuTotal.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        type="button"
                                        className="text-blue-600 font-black text-[9px] uppercase tracking-[0.2em] bg-white border border-blue-100 px-4 py-2 rounded-xl shadow-sm group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all flex items-center gap-1"
                                    >
                                        {selectedMenuItems.length === 0 ? 'Select' : 'Edit'}
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={isSubmitting || !isFormValid}
                                className={`w-full border-b-4 py-6 rounded-[2rem] font-black text-xl transition-all flex items-center justify-center gap-4 ${isFormValid ? 'bg-slate-900 border-slate-950 text-white shadow-2xl shadow-slate-900/40 hover:bg-slate-800 active:translate-y-1 active:border-b-0' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'}`}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={28} className={isFormValid ? 'text-blue-500' : 'text-slate-300'} />}
                                {initialData ? 'Update Celebration' : 'Confirm Celebration'}
                            </button>
                            {!isFormValid && (
                                <p className="text-center text-[10px] font-black text-red-400 uppercase tracking-widest mt-4 animate-pulse">
                                    Fill required fields to confirm
                                </p>
                            )}
                        </div>

                    </form>
                </div>

                {/* Right: Booking Summary Preview */}
                <div className="w-full md:w-[380px] bg-slate-900 border-l border-white/5 p-6 md:p-10 flex flex-col text-white">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                            <ShoppingBag size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black">Booking Details</h3>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Pricing Overview</p>
                        </div>
                    </div>

                    <div className="flex-1 space-y-8 overflow-y-auto pr-4 custom-scrollbar-dark mb-4 min-h-0">
                        {/* Summary of items */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Selected Menu</h4>
                            <div className="space-y-3">
                                {selectedMenuItems.length === 0 ? (
                                    <p className="text-slate-600 text-xs italic font-bold">No items selected yet...</p>
                                ) : (
                                    selectedMenuItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-2xl group hover:bg-white/10 transition-all">
                                            <div className="min-w-0 pr-4">
                                                <p className="text-xs font-black text-slate-200 truncate">
                                                    {item.package?.name || item.product?.name || (item.selectedAddons?.[0]?.name)}
                                                </p>
                                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-0.5">
                                                    Qty: {item.quantity} {item.size?.name ? `• ${item.size.name}` : ''}
                                                </p>
                                            </div>
                                            <div className="text-[10px] font-black text-slate-400">
                                                Rs. {((item.packageId 
                                                    ? parseFloat(item.package?.price || '0') 
                                                    : (item.productId 
                                                        ? (item.size ? parseFloat(item.size.price) : parseFloat(item.product?.price || '0'))
                                                        : parseFloat(item.selectedAddons?.[0]?.price || '0')
                                                      )) * item.quantity).toLocaleString()}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Charges breakdown */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Breakdown</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs font-bold text-slate-400">
                                    <span>Menu Total</span>
                                    <span className="text-white">Rs. {menuTotal.toLocaleString()}</span>
                                </div>
                                {bookingType === 'EXCLUSIVE' && (
                                    <div className="flex justify-between text-xs font-bold text-slate-400">
                                        <span>Hall Charge (Exclusive)</span>
                                        <span className="text-white">Rs. {partyExclusiveCharge.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-8 border-t border-white/10 space-y-4">
                        <div className="flex justify-between items-center text-sm font-black text-slate-400 uppercase tracking-widest">
                            <span>Estimated Total</span>
                            <span className="text-white text-2xl tracking-normal">Rs. {estimatedTotal.toLocaleString()}</span>
                        </div>
                        <div className="bg-blue-600/10 rounded-2xl p-4 border border-blue-600/20">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Advance Paid</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 font-bold text-xs">Rs.</span>
                                    <input 
                                        type="number"
                                        value={manualAdvance === null ? '' : (manualAdvance === 0 ? '' : manualAdvance)}
                                        onChange={(e) => setManualAdvance(e.target.value === '' ? null : parseFloat(e.target.value))}
                                        placeholder={requiredAdvance.toLocaleString()}
                                        className="w-24 bg-white/10 text-blue-300 font-black text-right rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-blue-500/30 placeholder:text-blue-300/40"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-[9px] text-blue-500/80 font-bold">Recommended: Rs. {requiredAdvance.toLocaleString()}</p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setManualAdvance(requiredAdvance)}
                                        className="text-[9px] text-blue-400 hover:text-white font-black uppercase tracking-wider transition-all"
                                    >
                                        Standard
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setManualAdvance(estimatedTotal)}
                                        className="text-[9px] bg-blue-500 text-white font-black uppercase tracking-wider px-2 py-1 rounded-md hover:bg-blue-400 transition-all"
                                    >
                                        Full
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Popups */}
                <VisualTimePickerPopup
                    isOpen={isTimePickerOpen}
                    onClose={() => setIsTimePickerOpen(false)}
                    selectedDate={eventDate || ''}
                    duration={durationHrs}
                    onSelect={(date, time, dur) => {
                        setEventDate(date);
                        setStartTime(time);
                        setDurationHrs(dur);
                        setIsTimePickerOpen(false);
                    }}
                />

                <MenuSelectionPopup
                    isOpen={isMenuPickerOpen}
                    onClose={() => setIsMenuPickerOpen(false)}
                    initialItems={selectedMenuItems}
                    onConfirm={(items) => setSelectedMenuItems(items)}
                />

                <style>{`
                    .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                    .custom-scrollbar-dark::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar-dark::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                `}</style>
            </div>
        </div>
    );
}
