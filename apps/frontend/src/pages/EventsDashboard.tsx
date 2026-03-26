import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Calendar as CalendarIcon, Users, Clock, Eye } from 'lucide-react';
import { api } from '../api';
import type { PartyBookingDto } from '../api';
import { BookingDetailDrawer } from '../components/BookingDetailDrawer';
import { NewPartyModal } from '../components/NewPartyModal';
import { PartiesListModal } from '../components/PartiesListModal';
import { toast } from 'sonner';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export function EventsDashboard() {
    // --- Data State ---
    const [bookings, setBookings] = useState<PartyBookingDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- Filter & Search State ---
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'CUSTOM'>('ALL');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [paymentStatus, setPaymentStatus] = useState<'ALL' | 'PENDING' | 'PARTIAL' | 'SETTLED'>('ALL');

    // --- UI State ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
    const [viewedBooking, setViewedBooking] = useState<PartyBookingDto | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [duration, setDuration] = useState(3);
    const [isSelectingForNewParty, setIsSelectingForNewParty] = useState(false);

    const fetchBookings = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: any = { paymentStatus };
            
            if (filter === 'CUSTOM' && startDate && endDate) {
                params.startDate = startDate;
                params.endDate = endDate;
            } else if (filter === 'TODAY') {
                const today = new Date().toISOString().split('T')[0];
                params.startDate = today;
                params.endDate = today;
            } else if (filter === 'THIS_WEEK') {
                const start = new Date().toISOString().split('T')[0];
                const end = new Date();
                end.setDate(end.getDate() + 7);
                params.startDate = start;
                params.endDate = end.toISOString().split('T')[0];
            } else {
                // Default to current month view
                params.year = selectedDate.getFullYear();
                params.month = selectedDate.getMonth() + 1;
            }

            const bData = await api.getPartyBookings(params);
            setBookings(bData);
            
            // If the drawer is currently open, we must swap its reference to the fresh one to trigger a UI render
            setViewedBooking(prev => {
                if (!prev) return null;
                const freshBooking = bData.find((b: any) => b.id === prev.id);
                return freshBooking || prev;
            });
            
        } catch (err: any) {
            console.error('Failed to fetch data:', err);
            toast.error('Could not load booking data.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedDate, filter, startDate, endDate, paymentStatus]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    // --- Helper Functions ---

    const formatTime = (isoStr: string) => {
        return new Date(isoStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const normalizeDate = (date: Date | string) => {
        if (typeof date === 'string') return date.split('T')[0];
        const d = date;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const formatDecimalTime = (decimalTime: number) => {
        const hrs = Math.floor(decimalTime);
        const mins = Math.round((decimalTime - hrs) * 60);
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };


    // --- Computed Data ---
    const filteredList = useMemo(() => {
        const results = bookings.filter(b => {
            const matchesSearch = b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.customerPhone.includes(searchQuery);
            if (!matchesSearch) return false;

            if (filter === 'TODAY') {
                return normalizeDate(b.eventDate) === normalizeDate(new Date());
            }
            if (filter === 'THIS_WEEK') {
                const bDate = new Date(b.eventDate);
                const now = new Date();
                const weekEnd = new Date(now);
                weekEnd.setDate(now.getDate() + 7);
                return bDate >= now && bDate <= weekEnd;
            }
            return true;
        });

        results.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

        const today = new Date();
        today.setHours(0,0,0,0);

        return results.sort((a,b) => {
            const aIsPast = new Date(a.eventDate).getTime() < today.getTime() ? 1 : 0;
            const bIsPast = new Date(b.eventDate).getTime() < today.getTime() ? 1 : 0;
            if (aIsPast !== bIsPast) return aIsPast - bIsPast;
            return 0;
        });
    }, [bookings, searchQuery, filter]);

    const selectedDateBookings = useMemo(() => {
        return bookings.filter(b => normalizeDate(b.eventDate) === normalizeDate(selectedDate));
    }, [bookings, selectedDate]);

    const totalThisMonth = bookings.length;
    const exclusiveThisMonth = bookings.filter(b => b.bookingType === 'EXCLUSIVE').length;

    const tileContent = ({ date, view }: { date: Date, view: string }) => {
        if (view === 'month') {
            const count = bookings.filter(b => normalizeDate(b.eventDate) === normalizeDate(date)).length;
            if (count > 0) {
                return <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>;
            }
        }
        return null;
    };

    return (
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] font-sans relative">

            {/* Header */}
            <header className="px-8 py-6 border-b border-white/50 bg-white/70 backdrop-blur-2xl z-20 shrink-0 shadow-[0_4px_30px_rgb(0,0,0,0.03)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-8">
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <CalendarIcon className="text-blue-600" size={24} />
                            Events Dashboard
                        </h1>
                        <div className="hidden lg:block h-8 w-px bg-slate-200"></div>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search bookings..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none font-bold text-sm text-slate-700 transition-all font-sans"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button onClick={() => setFilter('ALL')} className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${filter === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>ALL</button>
                            <button onClick={() => setFilter('TODAY')} className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${filter === 'TODAY' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>TODAY</button>
                            <button onClick={() => setFilter('THIS_WEEK')} className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${filter === 'THIS_WEEK' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>WEEK</button>
                            <button onClick={() => setFilter('CUSTOM')} className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${filter === 'CUSTOM' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>RANGE</button>
                        </div>
                        
                        {filter === 'CUSTOM' && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold outline-none focus:border-blue-500"
                                />
                                <span className="text-slate-400 font-bold">to</span>
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold outline-none focus:border-blue-500"
                                />
                            </div>
                        )}

                        <div className="h-6 w-px bg-slate-200"></div>

                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                            {(['ALL', 'PENDING', 'PARTIAL', 'SETTLED'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setPaymentStatus(status)}
                                    className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${paymentStatus === status ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                        <button
                            onClick={() => {
                                setIsSelectingForNewParty(false);
                                setIsScheduleModalOpen(true);
                            }}
                            className="bg-white border-2 border-slate-200 hover:border-slate-300 px-5 py-2 rounded-xl font-bold text-slate-700 transition-all flex items-center gap-2 shadow-sm"
                        >
                            <Eye size={18} />
                            View All
                        </button>
                        <button
                            onClick={() => {
                                setSelectedSlot(null);
                                setDuration(3);
                                setIsModalOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                        >
                            <Plus size={20} />
                            New Party
                        </button>
                    </div>
                </div>
            </header>

            {/* Content Body */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

                {/* Left: Calendar & Stats */}
                <div className="w-full lg:w-[400px] bg-white/60 backdrop-blur-3xl border-r border-white/60 shrink-0 flex flex-col overflow-y-auto custom-scrollbar shadow-[4px_0_24px_rgb(0,0,0,0.02)] z-10">
                    <div className="p-6 space-y-6">
                        <div className="bg-white/80 border border-white rounded-[2.5rem] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                            <div className="custom-calendar-container">
                                <Calendar
                                    onChange={(val) => setSelectedDate(val as Date)}
                                    value={selectedDate}
                                    tileContent={tileContent}
                                    className="border-none w-full font-sans text-slate-800 bg-transparent"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-50/50 rounded-3xl p-5 border border-blue-50">
                                <p className="text-blue-600 font-black text-[10px] uppercase tracking-widest mb-1">Total</p>
                                <p className="text-3xl font-black text-slate-800">{isLoading ? '...' : totalThisMonth}</p>
                            </div>
                            <div className="bg-amber-50/50 rounded-3xl p-5 border border-amber-50">
                                <p className="text-amber-600 font-black text-[10px] uppercase tracking-widest mb-1">Exclusive</p>
                                <p className="text-3xl font-black text-slate-800">{isLoading ? '...' : exclusiveThisMonth}</p>
                            </div>
                        </div>

                        {/* Search Result Indicator */}
                        {(searchQuery || filter !== 'ALL') && (
                            <div className="bg-blue-600 rounded-2xl p-4 text-white flex items-center justify-between">
                                <span className="text-xs font-black">{filteredList.length} matches found</span>
                                <button onClick={() => { setSearchQuery(''); setFilter('ALL'); }} className="text-[10px] font-black underline uppercase">Clear</button>
                            </div>
                        )}

                        <div className="bg-slate-900 rounded-[2rem] p-6 text-white overflow-hidden relative group">
                            <div className="relative z-10">
                                <h3 className="font-black text-lg mb-1">Quick Action</h3>
                                <p className="text-slate-400 text-xs font-bold mb-4">Launch the interactive timeline to manage slots</p>
                                <button
                                    onClick={() => {
                                        setIsSelectingForNewParty(false);
                                        setIsScheduleModalOpen(true);
                                    }}
                                    className="w-full bg-white text-slate-900 py-3 rounded-xl font-black text-sm hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Clock size={16} />
                                    Open Timeline
                                </button>
                            </div>
                            <Clock className="absolute -right-4 -bottom-4 text-white/5 group-hover:text-white/10 transition-colors" size={120} />
                        </div>
                    </div>
                </div>

                {/* Right: Dashboard View */}
                <div className="flex-1 bg-transparent overflow-y-auto custom-scrollbar focus:outline-none scroll-smooth relative z-0">
                    <div className="p-8 space-y-8 max-w-[1200px] mx-auto pb-32">

                        {/* Horizontal Scroll for Selected Date Parties */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                    <Clock className="text-blue-600" size={20} />
                                    Daily Schedule — {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </h2>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-200">
                                    {selectedDateBookings.length} Events
                                </span>
                            </div>

                            <div className="flex gap-4 overflow-x-auto pb-4 custom-horizontal-scroll">
                                {selectedDateBookings.length > 0 ? (
                                    selectedDateBookings.map((b, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => { setViewedBooking(b); setIsDetailDrawerOpen(true); }}
                                            className={`min-w-[280px] p-5 rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.05)] cursor-pointer transition-all hover:scale-[1.02] hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)] group relative overflow-hidden ${b.bookingType === 'EXCLUSIVE' ? 'bg-gradient-to-br from-amber-500 to-amber-600 border-amber-400' : 'bg-gradient-to-br from-blue-50/90 to-indigo-50/90 backdrop-blur-md border-blue-100/50'}`}
                                        >
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-2 rounded-xl ${b.bookingType === 'EXCLUSIVE' ? 'bg-amber-600' : 'bg-blue-50'}`}>
                                                        <Users size={18} className={b.bookingType === 'EXCLUSIVE' ? 'text-white' : 'text-blue-600'} />
                                                    </div>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${b.bookingType === 'EXCLUSIVE' ? 'bg-white/20 border-white/30 text-white' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                                                        {b.bookingType}
                                                    </span>
                                                </div>
                                                <h4 className={`font-black text-lg mb-1 truncate ${b.bookingType === 'EXCLUSIVE' ? 'text-white' : 'text-slate-800'}`}>
                                                    {b.customerName}
                                                </h4>
                                                <div className={`flex items-center gap-3 text-xs font-bold ${b.bookingType === 'EXCLUSIVE' ? 'text-amber-100' : 'text-slate-400'}`}>
                                                    <span className="flex items-center gap-1"><Clock size={12} /> {formatTime(b.startTime)}</span>
                                                    <span>•</span>
                                                    <span>{b.guestCount} PAX</span>
                                                </div>
                                            </div>
                                            {b.bookingType === 'EXCLUSIVE' && <Users className="absolute -right-4 -bottom-4 text-white/10" size={80} />}
                                        </div>
                                    ))
                                ) : (
                                    <div className="w-full py-12 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-300">
                                        <CalendarIcon className="text-slate-200 mb-2" size={40} />
                                        <p className="text-slate-400 font-bold text-sm italic">No parties scheduled for this date</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Summary Stats for Filtered Range */}
                        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Events</div>
                                <div className="text-2xl font-black text-slate-800">{filteredList.length}</div>
                            </div>
                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                                <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Expected Revenue</div>
                                <div className="text-2xl font-black text-blue-600">
                                    Rs. {filteredList.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Advance Collected</div>
                                <div className="text-2xl font-black text-emerald-600">
                                    Rs. {filteredList.reduce((sum, b) => sum + Number(b.advancePaid || 0), 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                                <div className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Balance Due</div>
                                <div className="text-2xl font-black text-red-600">
                                    Rs. {filteredList.reduce((sum, b) => {
                                        const bal = Number(b.totalAmount || 0) - Number(b.advancePaid || 0);
                                        return sum + (bal > 0 ? bal : 0);
                                    }, 0).toLocaleString()}
                                </div>
                            </div>
                        </section>

                        {/* Recent & Upcoming Events Vertical List */}
                        <section className="space-y-4">
                            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                <CalendarIcon className="text-blue-600" size={20} />
                                Bookings List — {paymentStatus !== 'ALL' ? paymentStatus : 'Filter Outlook'}
                            </h2>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-3 pb-8">
                                {filteredList.length > 0 ? (
                                    filteredList.map((b, idx) => {
                                        const eventDate = new Date(b.eventDate);
                                        eventDate.setHours(0,0,0,0);
                                        const today = new Date();
                                        today.setHours(0,0,0,0);
                                        const isPast = eventDate.getTime() < today.getTime();
                                        return (
                                        <div
                                            key={idx}
                                            onClick={() => { setViewedBooking(b); setIsDetailDrawerOpen(true); }}
                                            className={`bg-white/90 backdrop-blur-sm p-5 rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between group hover:border-blue-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all cursor-pointer ${isPast ? 'opacity-50 grayscale hover:grayscale-0 focus:grayscale-0' : ''}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border transition-all ${isPast ? 'bg-slate-100 border-slate-200' : 'bg-blue-50/50 border-blue-100 group-hover:bg-blue-100'}`}>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isPast ? 'text-slate-400' : 'text-blue-500'}`}>
                                                        {new Date(b.eventDate).toLocaleDateString('en-US', { month: 'short' })}
                                                    </span>
                                                    <span className={`text-lg font-black ${isPast ? 'text-slate-500' : 'text-blue-800'}`}>
                                                        {new Date(b.eventDate).toLocaleDateString('en-US', { day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h4 className={`font-black transition-colors ${isPast ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-800 group-hover:text-blue-700'}`}>{b.customerName}</h4>
                                                    <p className="text-xs font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <Clock size={12} /> {formatTime(b.startTime)} — {b.guestCount} Pax
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
                                                <div className={`px-3 py-1 rounded-xl text-[9px] font-black border uppercase tracking-widest ${b.status === 'CONFIRMED' ? (isPast ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100') : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                    {b.status}
                                                </div>
                                                {isPast && <span className="text-[8px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-md border border-red-100 flex items-center gap-1 uppercase tracking-widest">Past Event</span>}
                                            </div>
                                        </div>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-full py-20 flex flex-col items-center justify-center bg-slate-100 rounded-[3rem] border border-slate-200/50">
                                        <Search className="text-slate-300 mb-4" size={48} />
                                        <p className="text-slate-500 font-black text-lg">No bookings matches your search</p>
                                        <button onClick={() => { setSearchQuery(''); setFilter('ALL'); }} className="mt-4 text-blue-600 font-black text-sm hover:underline">Clear all filters</button>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/* Modals & Overlays */}
            <NewPartyModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedSlot(null); setIsSelectingForNewParty(false); }}
                initialDate={selectedDate}
                initialStartTime={selectedSlot ? formatDecimalTime(selectedSlot) : "18:00"}
                initialDuration={duration}
                initialData={isSelectingForNewParty ? null : (viewedBooking || null)}
                onSuccess={(date) => { 
                    if (date) setSelectedDate(date);
                    fetchBookings(); 
                    setViewedBooking(null); 
                }}
            />

            <PartiesListModal
                isOpen={isScheduleModalOpen}
                onClose={() => {
                    setIsScheduleModalOpen(false);
                    if (isSelectingForNewParty) {
                        setIsSelectingForNewParty(false);
                        setIsModalOpen(true);
                    }
                }}
                bookings={bookings}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                isLoading={isLoading}
                onBookingClick={(b) => { setViewedBooking(b); setIsDetailDrawerOpen(true); }}
                onSlotSelect={isSelectingForNewParty ? (slotTime) => {
                    setSelectedSlot(slotTime);
                    setIsScheduleModalOpen(false);
                    setIsSelectingForNewParty(false);
                    setIsModalOpen(true);
                } : undefined}
            />

            <BookingDetailDrawer
                isOpen={isDetailDrawerOpen}
                onClose={() => { setIsDetailDrawerOpen(false); setViewedBooking(null); }}
                booking={viewedBooking}
                onSuccess={() => fetchBookings()}
                onEdit={() => {
                    setIsDetailDrawerOpen(false);
                    setIsModalOpen(true);
                }}
            />

            <style>{`
                .custom-calendar-container .react-calendar { border: none; font-family: inherit; width: 100%; background: transparent; }
                .custom-calendar-container .react-calendar__navigation button { font-weight: 800; border-radius: 12px; font-size: 16px; color: #1e293b; padding: 12px; transition: all 0.2s; }
                .custom-calendar-container .react-calendar__navigation button:enabled:hover { background-color: #f8fafc; }
                .custom-calendar-container .react-calendar__month-view__weekdays { font-weight: 900; font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px; }
                .custom-calendar-container .react-calendar__month-view__weekdays__weekday abbr { text-decoration: none; }
                .custom-calendar-container .react-calendar__tile { border-radius: 14px; padding: 14px 4px; font-weight: 700; font-size: 14px; color: #475569; position: relative; z-index: 1; transition: all 0.2s; }
                .custom-calendar-container .react-calendar__tile:enabled:hover { background-color: #f1f5f9; color: #2563eb; }
                .custom-calendar-container .react-calendar__tile--now { background: #f1f5f9; color: #2563eb; font-weight: 900; }
                .custom-calendar-container .react-calendar__tile--active { background: #2563eb !important; color: white !important; font-weight: 800; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3); z-index: 10; }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-horizontal-scroll::-webkit-scrollbar { height: 4px; }
                .custom-horizontal-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-horizontal-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </main>
    );
}
