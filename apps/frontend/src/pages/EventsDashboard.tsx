import { useState, useEffect, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Plus, Search, Calendar as CalendarIcon, Users, Clock, AlertCircle } from 'lucide-react';
import { api } from '../api';
import type { PartyBookingDto } from '../api';
import { NewPartyModal } from '../components/NewPartyModal';
import { BookingDetailDrawer } from '../components/BookingDetailDrawer';
import { toast } from 'sonner';

export function EventsDashboard() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [bookings, setBookings] = useState<PartyBookingDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'TODAY' | 'THIS_WEEK'>('ALL');

    // Phase 2 Timeline states
    const [duration, setDuration] = useState<number>(2);
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

    // Phase 3 Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
    const [viewedBooking, setViewedBooking] = useState<PartyBookingDto | null>(null);

    // Fetch bookings from the real API
    const fetchBookings = useCallback(async () => {
        setIsLoading(true);
        try {
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth() + 1; // 1-indexed
            const data = await api.getPartyBookings({ month, year });
            setBookings(data);
        } catch (err: any) {
            console.error('Failed to fetch party bookings:', err);
            toast.error('Could not load bookings. Is the backend running?');
        } finally {
            setIsLoading(false);
        }
    }, [selectedDate]);

    // Re-fetch when selected month changes (calendar navigation)
    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    // Phase 2: Convert "HH:mm" to decimal hours for Timeline positioning
    const timeToHours = (timeStr: string) => {
        if (!timeStr) return 0;
        // Handle both ISO date strings and simple "HH:mm" strings
        if (timeStr.includes('T')) {
            const d = new Date(timeStr);
            return d.getHours() + d.getMinutes() / 60;
        }
        const [h, m] = timeStr.split(':').map(Number);
        return h + (m || 0) / 60;
    };

    // Helper to format datetime to "HH:mm"
    const formatTime = (timeStr: string): string => {
        if (!timeStr) return '—';
        if (typeof timeStr === 'string' && timeStr.includes('T')) {
            const d = new Date(timeStr);
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        }
        return timeStr;
    };

    // Helper to format decimal hours (e.g., 14.5) to "HH:mm" (e.g., "14:30")
    const formatDecimalTime = (decimalHours: number): string => {
        const hours = Math.floor(decimalHours);
        const minutes = Math.round((decimalHours - hours) * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    // --- Overlap Prevention ---
    const checkOverlap = (start: number, durationHrs: number) => {
        const end = start + durationHrs;
        return selectedDateBookings.some(b => {
            const bStart = timeToHours(b.startTime);
            const bEnd = timeToHours(b.endTime);
            // Ignore cancelled bookings if status is available
            if (b.status === 'CANCELLED') return false;
            return start < bEnd && end > bStart;
        });
    };

    const handleSlotClick = (slotTime: number) => {
        if (checkOverlap(slotTime, duration)) {
            toast.error('Cannot select this time slot as it overlaps with an existing booking.', {
                icon: <AlertCircle className="text-red-500" size={18} />,
                duration: 4000
            });
            return;
        }
        setSelectedSlot(slotTime);
    };

    // Filter bookings for the timeline/list — the selected date on calendar
    const isSameDay = (d1: Date, d2: Date) =>
        d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();

    const selectedDateBookings = bookings.filter(b => {
        const bDate = new Date(b.eventDate);
        return isSameDay(bDate, selectedDate);
    });

    // --- Filter & Search on a flat list for the filter tabs ---
    const today = new Date();
    const filteredList = bookings.filter(b => {
        const bDate = new Date(b.eventDate);
        // Search
        const q = searchQuery.toLowerCase();
        if (q && !b.customerName?.toLowerCase().includes(q) && !b.customerPhone?.toLowerCase().includes(q)) {
            return false;
        }
        // Date filter
        if (filter === 'TODAY') return isSameDay(bDate, today);
        if (filter === 'THIS_WEEK') {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 7);
            return bDate >= startOfWeek && bDate < endOfWeek;
        }
        return true;
    });

    // --- Dynamic stats from fetched data ---
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const totalThisMonth = bookings.filter(b => {
        const d = new Date(b.eventDate);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
    const exclusiveThisMonth = bookings.filter(b => {
        const d = new Date(b.eventDate);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && b.bookingType === 'EXCLUSIVE';
    }).length;

    // Custom function to add dots to calendar days that have events
    const tileContent = ({ date, view }: { date: Date, view: string }) => {
        if (view === 'month') {
            const dayBookings = bookings.filter(b => isSameDay(new Date(b.eventDate), date));
            if (dayBookings.length > 0) {
                const hasExclusive = dayBookings.some(b => b.bookingType === 'EXCLUSIVE');
                return (
                    <div className="flex justify-center items-center mt-1 gap-0.5 relative z-10">
                        {hasExclusive ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm border border-white"></div>
                        ) : (
                            dayBookings.slice(0, 3).map((_, i) => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm border border-white"></div>
                            ))
                        )}
                    </div>
                );
            }
        }
        return null;
    };

    return (
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">

            {/* Top Header Controls */}
            <header className="px-8 pt-6 pb-6 border-b border-slate-200 bg-white z-10 shrink-0 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                    {/* Left: Titles & Search */}
                    <div className="flex items-center gap-8">
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                <CalendarIcon className="text-blue-600" size={24} />
                                Party Bookings
                            </h1>
                        </div>

                        <div className="hidden lg:block h-8 w-px bg-slate-200"></div>

                        <div className="relative w-64 xl:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name or phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-xl outline-none text-sm font-medium text-slate-700 transition-all font-sans"
                            />
                        </div>
                    </div>

                    {/* Right: Filters & New Action */}
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                            <button onClick={() => setFilter('ALL')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${filter === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>All</button>
                            <button onClick={() => setFilter('TODAY')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${filter === 'TODAY' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Today</button>
                            <button onClick={() => setFilter('THIS_WEEK')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${filter === 'THIS_WEEK' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>This Week</button>
                        </div>

                        <button
                            onClick={() => {
                                setSelectedSlot(19); // Default to 7 PM
                                setDuration(3);
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                        >
                            <Plus size={18} />
                            <span>New Party</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Split-Pane Layout */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

                {/* Left Side (Calendar Pane) */}
                <div className="w-full lg:w-[400px] xl:w-[450px] bg-white border-r border-slate-200 overflow-y-auto shrink-0 flex flex-col">
                    <div className="p-6">

                        {/* Interactive Calendar container */}
                        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-4 shadow-sm">
                            <div className="custom-calendar-container">
                                <Calendar
                                    onChange={(val) => setSelectedDate(val as Date)}
                                    value={selectedDate}
                                    tileContent={tileContent}
                                    className="border-none w-full font-sans text-slate-800 bg-transparent"
                                    tileClassName="rounded-xl font-semibold py-3 my-0.5 relative transition-all hover:bg-white hover:shadow-sm"
                                    next2Label={null}
                                    prev2Label={null}
                                />
                            </div>
                        </div>

                        {/* Quick Stats — dynamic from real data */}
                        <div className="mt-6 grid grid-cols-2 gap-4">
                            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100/50">
                                <div className="text-blue-600 font-bold text-sm mb-1">Total This Month</div>
                                <div className="text-2xl font-black text-blue-900">{isLoading ? '—' : totalThisMonth}</div>
                            </div>
                            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100/50">
                                <div className="text-amber-600 font-bold text-sm mb-1">Exclusive Events</div>
                                <div className="text-2xl font-black text-amber-900">{isLoading ? '—' : exclusiveThisMonth}</div>
                            </div>
                        </div>

                        {/* Filter Info if search is active */}
                        {(searchQuery || filter !== 'ALL') && (
                            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-3 flex items-center justify-between">
                                <span className="text-blue-700 text-sm font-bold">
                                    {filteredList.length} result{filteredList.length !== 1 ? 's' : ''} matching filters
                                </span>
                                <button
                                    onClick={() => { setSearchQuery(''); setFilter('ALL'); }}
                                    className="text-xs text-blue-600 font-bold hover:underline"
                                >
                                    Clear
                                </button>
                            </div>
                        )}

                    </div>
                </div>

                {/* Right Side (Interactive Timeline) */}
                <div className="flex-1 bg-slate-50 overflow-y-auto p-6 lg:p-10 relative">
                    <div className="max-w-4xl mx-auto">

                        {/* Selected Date Header */}
                        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </h2>
                                <p className="text-slate-500 font-medium mt-1">
                                    {isLoading ? 'Loading...' : `${selectedDateBookings.length} ${selectedDateBookings.length === 1 ? 'event' : 'events'} scheduled`}
                                </p>
                            </div>

                            {/* Duration Selector */}
                            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                                {[2, 3, 4, 5].map(hrs => (
                                    <button
                                        key={hrs}
                                        onClick={() => { setDuration(hrs); setSelectedSlot(null); }}
                                        className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${duration === hrs ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {hrs} Hours
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Interactive 2D Timeline Grid */}
                        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col relative w-full">
                            <div className="w-full relative" style={{ height: `${(24 - 8) * 80}px` }}>

                                {/* Loading overlay */}
                                {isLoading && (
                                    <div className="absolute inset-0 bg-white/70 z-30 flex items-center justify-center">
                                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                                    </div>
                                )}

                                {/* Timeline Background Grid & Hour Labels */}
                                {Array.from({ length: 32 }, (_, i) => 8 + i * 0.5).map(slotTime => (
                                    <div
                                        key={slotTime}
                                        className={`absolute w-full flex border-b ${slotTime % 1 === 0 ? 'border-slate-100' : 'border-slate-50'}`}
                                        style={{ top: `${(slotTime - 8) * 80}px`, height: '40px' }}
                                    >
                                        <div className="w-20 shrink-0 border-r border-slate-100 flex justify-center pt-2">
                                            {slotTime % 1 === 0 && (
                                                <span className="text-xs font-bold text-slate-300 relative top-[-10px] bg-white px-2 z-10">{slotTime}:00</span>
                                            )}
                                        </div>
                                        <div
                                            className={`flex-1 relative cursor-pointer transition-colors ${checkOverlap(slotTime, duration) ? 'bg-red-50/20 cursor-not-allowed' : 'hover:bg-blue-50/50'}`}
                                            onClick={() => handleSlotClick(slotTime)}
                                        >
                                        </div>
                                    </div>
                                ))}

                                {/* Existing Events Rendered as Blocks */}
                                {selectedDateBookings.map((b, idx) => {
                                    const startHr = timeToHours(b.startTime);
                                    let endHr = timeToHours(b.endTime);
                                    if (endHr === 0 || endHr < startHr) endHr = 24;

                                    const top = (startHr - 8) * 80;
                                    const height = (endHr - startHr) * 80;

                                    return (
                                        <div
                                            key={idx}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setViewedBooking(b);
                                                setIsDetailDrawerOpen(true);
                                            }}
                                            className={`absolute left-24 right-4 rounded-2xl p-4 shadow-sm border overflow-hidden transition-all cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] ${b.bookingType === 'EXCLUSIVE' ? 'bg-amber-500/20 border-amber-400/50 text-amber-950 shadow-[inset_0_0_20px_rgba(245,158,11,0.1)]' : 'bg-blue-50 border-blue-200/50 text-blue-900'}`}
                                            style={{ top: `${top + 4}px`, height: `${height - 8}px`, zIndex: 10 }}
                                        >
                                            {b.bookingType === 'EXCLUSIVE' && (
                                                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(245,158,11,0.1)_10px,rgba(245,158,11,0.1)_20px)] pointer-events-none"></div>
                                            )}
                                            <div className="relative z-10 flex flex-col justify-center h-full">
                                                <div className="font-bold text-sm md:text-base flex items-center gap-2">
                                                    {b.customerName}
                                                    {b.bookingType === 'EXCLUSIVE' && <span className="text-[10px] uppercase font-black bg-amber-500 text-amber-950 px-2 py-0.5 rounded-lg shadow-sm shrink-0">EXCLUSIVE</span>}
                                                </div>
                                                <div className="text-xs opacity-80 mt-1 font-medium flex items-center gap-2">
                                                    <Clock size={12} /> {formatTime(b.startTime)} - {formatTime(b.endTime)}
                                                    <span className="opacity-50">•</span>
                                                    <Users size={12} /> {b.guestCount} Guests
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}

                                {/* Active Slot Selection Hint Block */}
                                {selectedSlot !== null && (
                                    <div
                                        className="absolute left-24 right-4 bg-blue-600 text-white rounded-2xl p-4 shadow-xl shadow-blue-500/30 flex items-center justify-between border-2 border-blue-500 z-20 overflow-hidden transition-all"
                                        style={{ top: `${(selectedSlot - 8) * 80 + 4}px`, height: `${duration * 80 - 8}px` }}
                                    >
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] pointer-events-none"></div>
                                        <div className="relative z-10">
                                            <div className="font-black text-sm md:text-lg">New {duration}-Hour Booking</div>
                                            <div className="text-blue-100 text-xs md:text-sm mt-1 font-bold">
                                                {formatDecimalTime(selectedSlot)} - {formatDecimalTime(selectedSlot + duration)}
                                            </div>
                                        </div>
                                        <div className="relative z-10 flex gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsModalOpen(true);
                                                }}
                                                className="bg-white text-blue-600 px-4 py-2 rounded-xl font-black text-sm hover:bg-blue-50 transition-colors shadow-sm focus:ring-4 focus:ring-white/20"
                                            >
                                                Book
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedSlot(null); }}
                                                className="w-10 h-10 bg-blue-700 text-white rounded-xl flex items-center justify-center hover:bg-blue-800 transition-colors focus:ring-4 focus:ring-white/20 outline-none"
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

            {/* Custom Global Styles for react-calendar overriding to match UI */}
            <style>{`
                .custom-calendar-container .react-calendar { border: none; font-family: inherit; width: 100%; background: transparent; }
                .custom-calendar-container .react-calendar__navigation { margin-bottom: 1.5rem; }
                .custom-calendar-container .react-calendar__navigation button { font-weight: 800; border-radius: 12px; font-size: 16px; min-width: 44px; color: #1e293b; padding: 8px; transition: all 0.2s;}
                .custom-calendar-container .react-calendar__navigation button:enabled:hover { background-color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                .custom-calendar-container .react-calendar__month-view__weekdays { font-weight: 800; font-size: 11px; text-transform: uppercase; color: #94a3b8; text-decoration: none !important; margin-bottom: 8px;}
                .custom-calendar-container .react-calendar__month-view__weekdays__weekday abbr { text-decoration: none; }
                .custom-calendar-container .react-calendar__month-view__days__day { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; height: 50px; }
                .custom-calendar-container .react-calendar__tile { border-radius: 12px; padding: 10px 4px; font-weight: 700; font-size: 14px; text-align: center; color: #475569; position: relative; z-index: 1;}
                .custom-calendar-container .react-calendar__tile:enabled:hover { background-color: #fff; color: #2563eb; box-shadow: 0 4px 12px rgba(0,0,0,0.05); z-index: 10;}
                .custom-calendar-container .react-calendar__tile--now { background: transparent; color: #2563eb; border: 2px solid #bfdbfe; font-weight: 900; }
                .custom-calendar-container .react-calendar__tile--active { background: #2563eb !important; color: white !important; font-weight: 800; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4); z-index: 20;}
                .custom-calendar-container .react-calendar__tile--active:enabled:hover { background: #1d4ed8 !important; }
                .custom-calendar-container .react-calendar__month-view__days__day--neighboringMonth { color: #cbd5e1; }
            `}</style>

            <NewPartyModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialDate={selectedDate}
                initialStartTime={selectedSlot !== null ? formatDecimalTime(selectedSlot) : "19:00"}
                initialDuration={duration}
                onSuccess={() => {
                    fetchBookings();
                }}
            />

            <BookingDetailDrawer
                isOpen={isDetailDrawerOpen}
                onClose={() => setIsDetailDrawerOpen(false)}
                booking={viewedBooking}
                onSuccess={() => {
                    fetchBookings();
                }}
            />
        </main>
    );
}
