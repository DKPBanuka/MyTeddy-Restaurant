import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Calendar as CalendarIcon, Users, Clock, Loader2, Eye } from 'lucide-react';
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
    const [filter, setFilter] = useState<'ALL' | 'TODAY' | 'THIS_WEEK'>('ALL');

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
            const date = selectedDate;
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const bData = await api.getPartyBookings({ month, year });
            setBookings(bData);
        } catch (err: any) {
            console.error('Failed to fetch data:', err);
            toast.error('Could not load booking data.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    // --- Helper Functions ---
    const timeToHours = (timeStr: string) => {
        // Handle ISO string from backend
        if (timeStr.includes('T')) {
            const date = new Date(timeStr);
            return date.getHours() + date.getMinutes() / 60;
        }
        // Handle HH:mm string
        const [h, m] = timeStr.split(':').map(Number);
        return h + m / 60;
    };

    const formatTime = (isoStr: string) => {
        return new Date(isoStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const formatDecimalTime = (decimalTime: number) => {
        const hrs = Math.floor(decimalTime);
        const mins = Math.round((decimalTime - hrs) * 60);
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    const checkOverlap = (slotStartTime: number, durationHrs: number) => {
        const slotEndTime = slotStartTime + durationHrs;
        return bookings.some(b => {
            const bDate = new Date(b.eventDate).toDateString();
            if (bDate !== selectedDate.toDateString()) return false;

            const bStart = timeToHours(b.startTime);
            let bEnd = timeToHours(b.endTime);
            if (bEnd === 0 || bEnd < bStart) bEnd = 24;

            return (slotStartTime < bEnd && slotEndTime > bStart);
        });
    };

    const handleSlotClick = (slot: number) => {
        if (checkOverlap(slot, duration)) {
            toast.error(`Cannot select this time slot. It overlaps with an existing booking.`);
            return;
        }
        setSelectedSlot(slot);
    };

    // --- Computed Data ---
    const filteredList = useMemo(() => {
        return bookings.filter(b => {
            const matchesSearch = b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.customerPhone.includes(searchQuery);
            if (!matchesSearch) return false;

            if (filter === 'TODAY') {
                return new Date(b.eventDate).toDateString() === new Date().toDateString();
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
    }, [bookings, searchQuery, filter]);

    const selectedDateBookings = useMemo(() => {
        return bookings.filter(b => new Date(b.eventDate).toDateString() === selectedDate.toDateString());
    }, [bookings, selectedDate]);

    const totalThisMonth = bookings.length;
    const exclusiveThisMonth = bookings.filter(b => b.bookingType === 'EXCLUSIVE').length;

    const tileContent = ({ date, view }: { date: Date, view: string }) => {
        if (view === 'month') {
            const count = bookings.filter(b => new Date(b.eventDate).toDateString() === date.toDateString()).length;
            if (count > 0) {
                return <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>;
            }
        }
        return null;
    };

    return (
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 font-sans">

            {/* Header */}
            <header className="px-8 py-6 border-b border-slate-200 bg-white z-10 shrink-0 shadow-sm">
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
                        <div className="hidden lg:flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button onClick={() => setFilter('ALL')} className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${filter === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>ALL</button>
                            <button onClick={() => setFilter('TODAY')} className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${filter === 'TODAY' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>TODAY</button>
                            <button onClick={() => setFilter('THIS_WEEK')} className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${filter === 'THIS_WEEK' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>WEEK</button>
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
                                setSelectedSlot(19);
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
                <div className="w-full lg:w-[380px] bg-white border-r border-slate-200 shrink-0 flex flex-col overflow-y-auto custom-scrollbar">
                    <div className="p-6 space-y-8">
                        <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-4 shadow-sm">
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
                            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-50">
                                <p className="text-blue-600 font-black text-xs uppercase tracking-wider mb-1">Total</p>
                                <p className="text-2xl font-black text-slate-800">{isLoading ? '...' : totalThisMonth}</p>
                            </div>
                            <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-50">
                                <p className="text-amber-600 font-black text-xs uppercase tracking-wider mb-1">Exclusive</p>
                                <p className="text-2xl font-black text-slate-800">{isLoading ? '...' : exclusiveThisMonth}</p>
                            </div>
                        </div>

                        {(searchQuery || filter !== 'ALL') && (
                            <div className="bg-blue-600 rounded-2xl p-4 text-white flex items-center justify-between">
                                <span className="text-xs font-black">{filteredList.length} matches found</span>
                                <button onClick={() => { setSearchQuery(''); setFilter('ALL'); }} className="text-[10px] font-black underline uppercase">Clear</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Interactive Timeline (30-min grid) */}
                <div className="flex-1 bg-slate-50 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
                    <div className="max-w-4xl mx-auto space-y-6">

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </h2>
                                <p className="text-slate-500 font-bold mt-1">
                                    {isLoading ? 'Refreshing schedule...' : `${selectedDateBookings.length} events today`}
                                </p>
                            </div>
                            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                                {[2, 3, 4, 5].map(hrs => (
                                    <button
                                        key={hrs}
                                        onClick={() => { setDuration(hrs); setSelectedSlot(null); }}
                                        className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${duration === hrs ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        {hrs}h Duration
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Interactive Grid */}
                        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50 flex flex-col relative">
                            <div className="w-full relative" style={{ height: `${(24 - 8) * 80}px` }}>

                                {isLoading && (
                                    <div className="absolute inset-0 bg-white/60 z-30 backdrop-blur-[1px] flex items-center justify-center">
                                        <Loader2 className="animate-spin text-blue-500" size={32} />
                                    </div>
                                )}

                                {Array.from({ length: 32 }, (_, i) => 8 + i * 0.5).map(slotTime => (
                                    <div
                                        key={slotTime}
                                        className={`absolute w-full flex border-b ${slotTime % 1 === 0 ? 'border-slate-100' : 'border-slate-50'}`}
                                        style={{ top: `${(slotTime - 8) * 80}px`, height: '40px' }}
                                    >
                                        <div className="w-20 shrink-0 border-r border-slate-100 flex justify-center pt-2">
                                            {slotTime % 1 === 0 && (
                                                <span className="text-[10px] font-black text-slate-300 relative top-[-14px] bg-white px-2">{slotTime}:00</span>
                                            )}
                                        </div>
                                        <div
                                            className={`flex-1 relative cursor-pointer transition-colors ${checkOverlap(slotTime, duration) ? 'bg-red-50/30 cursor-not-allowed' : 'hover:bg-blue-50/50'}`}
                                            onClick={() => handleSlotClick(slotTime)}
                                        ></div>
                                    </div>
                                ))}

                                {/* Events */}
                                {selectedDateBookings.map((b, idx) => {
                                    const startHr = timeToHours(b.startTime);
                                    let endHr = timeToHours(b.endTime);
                                    if (endHr === 0 || endHr < startHr) endHr = 24;

                                    const top = (startHr - 8) * 80;
                                    const height = (endHr - startHr) * 80;

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => { setViewedBooking(b); setIsDetailDrawerOpen(true); }}
                                            className={`absolute left-24 right-4 rounded-3xl p-5 border shadow-sm transition-all cursor-pointer hover:scale-[1.01] hover:shadow-xl active:scale-95 z-10 ${b.bookingType === 'EXCLUSIVE' ? 'bg-amber-500 text-amber-950 border-amber-600 shadow-amber-200/50' : 'bg-white border-slate-100 shadow-slate-200/50'}`}
                                            style={{ top: `${top + 6}px`, height: `${height - 12}px` }}
                                        >
                                            <div className="flex flex-col h-full justify-center">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h4 className="font-black text-sm md:text-lg tracking-tight uppercase">{b.customerName}</h4>
                                                    {b.bookingType === 'EXCLUSIVE' && <span className="text-[10px] font-black bg-white/40 px-2 py-0.5 rounded-lg border border-white/20">EXCLUSIVE</span>}
                                                </div>
                                                <div className={`flex items-center gap-3 text-xs font-bold ${b.bookingType === 'EXCLUSIVE' ? 'text-amber-900/80' : 'text-slate-400'}`}>
                                                    <span className="flex items-center gap-1"><Clock size={12} /> {formatTime(b.startTime)} - {formatTime(b.endTime)}</span>
                                                    <span className="flex items-center gap-1"><Users size={12} /> {b.guestCount} PAX</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Active Selection */}
                                {selectedSlot !== null && (
                                    <div
                                        className="absolute left-24 right-4 bg-blue-600 text-white rounded-[2rem] p-6 shadow-2xl shadow-blue-400/40 z-20 flex flex-col md:flex-row items-center justify-between border-4 border-blue-400 animate-in fade-in zoom-in duration-200"
                                        style={{ top: `${(selectedSlot - 8) * 80 + 4}px`, height: `${duration * 80 - 8}px` }}
                                    >
                                        <div>
                                            <p className="font-black text-lg">Book {duration}h Session</p>
                                            <p className="text-blue-100 text-sm font-bold">{formatDecimalTime(selectedSlot)} — {formatDecimalTime(selectedSlot + duration)}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setIsModalOpen(true)}
                                                className="bg-white text-blue-600 px-6 py-2.5 rounded-2xl font-black text-sm hover:shadow-lg transition-all active:scale-90"
                                            >
                                                Next
                                            </button>
                                            <button
                                                onClick={() => setSelectedSlot(null)}
                                                className="w-10 h-10 rounded-2xl bg-blue-700 text-white flex items-center justify-center hover:bg-blue-800 font-bold"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
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
                onSuccess={() => fetchBookings()}
                onOpenTimeline={(dateStr) => {
                    setSelectedDate(new Date(dateStr));
                    setIsModalOpen(false);
                    setIsSelectingForNewParty(true);
                    setIsScheduleModalOpen(true);
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
                onClose={() => setIsDetailDrawerOpen(false)}
                booking={viewedBooking}
                onSuccess={() => fetchBookings()}
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
            `}</style>
        </main>
    );
}
