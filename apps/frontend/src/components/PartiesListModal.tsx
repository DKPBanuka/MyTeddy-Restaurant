import { useState } from 'react';
import { X, Search, Calendar as CalendarIcon, Clock, AlertCircle, Phone, Filter, CheckCircle2 } from 'lucide-react';
import type { PartyBookingDto } from '../api';
import { api } from '../api';
import { toast } from 'sonner';

interface PartiesListModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookings: PartyBookingDto[];
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    isLoading: boolean;
    onBookingClick: (booking: PartyBookingDto) => void;
    onSlotSelect?: (decimalTime: number) => void;
}

export function PartiesListModal({
    isOpen,
    onClose,
    bookings,
    selectedDate,
    setSelectedDate,
    onBookingClick,
    onSlotSelect,
}: PartiesListModalProps) {
    const [viewMode, setViewMode] = useState<'TIMELINE' | 'GRID'>('TIMELINE');
    const [searchQuery, setSearchQuery] = useState('');
    const [draggingBookingMap, setDraggingBookingMap] = useState<Record<string, { duration: number, startYOffset: number }>>({});

    if (!isOpen) return null;

    // Helper: Convert "HH:mm" or ISO to decimal hours
    const timeToHours = (timeStr: string) => {
        if (!timeStr) return 0;
        if (timeStr.includes('T')) {
            const d = new Date(timeStr);
            return d.getHours() + d.getMinutes() / 60;
        }
        const [h, m] = timeStr.split(':').map(Number);
        return h + (m || 0) / 60;
    };

    const hoursToTime = (decimalHours: number) => {
        const hrs = Math.floor(decimalHours);
        const mins = Math.round((decimalHours - hrs) * 60);
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    const formatTime = (timeStr: string): string => {
        if (!timeStr) return '—';
        if (typeof timeStr === 'string' && timeStr.includes('T')) {
            const d = new Date(timeStr);
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        }
        return timeStr;
    };

    const isSameDay = (d1: Date, d2: Date) =>
        d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();

    const selectedDateBookings = bookings.filter(b => isSameDay(new Date(b.eventDate), selectedDate));

    const filteredBookings = bookings.filter(b => {
        const q = searchQuery.toLowerCase();
        return b.customerName?.toLowerCase().includes(q) || b.customerPhone?.toLowerCase().includes(q);
    }).sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'CONFIRMED': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const handleDragStart = (e: React.DragEvent, booking: PartyBookingDto) => {
        const startHr = timeToHours(booking.startTime);
        let endHr = timeToHours(booking.endTime);
        if (endHr === 0 || endHr < startHr) endHr = 24;

        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const startYOffset = e.clientY - rect.top; // Relative click position in card

        e.dataTransfer.setData('bookingId', booking.id || '');
        setDraggingBookingMap({ [booking.id || '']: { duration: endHr - startHr, startYOffset } });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // allow drop
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const bookingId = e.dataTransfer.getData('bookingId');
        if (!bookingId) return;

        const draggingInfo = draggingBookingMap[bookingId];
        if (!draggingInfo) return;

        const timelineContainer = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - timelineContainer.top - draggingInfo.startYOffset + e.currentTarget.scrollTop;

        // 40px = 1 hour, start is 8:00
        let newStartDecimal = (y / 40) + 8;

        // Snap to nearest 30 mins (0.5 hours)
        newStartDecimal = Math.round(newStartDecimal * 2) / 2;

        if (newStartDecimal < 8) newStartDecimal = 8; // min time limit
        if (newStartDecimal > 23) newStartDecimal = 23; // max time limit

        const newEndDecimal = newStartDecimal + draggingInfo.duration;

        const newStartTime = hoursToTime(newStartDecimal);
        const newEndTime = hoursToTime(newEndDecimal);
        const yyyyMmDd = selectedDate.toISOString().split('T')[0];

        try {
            await api.updatePartyBookingTime(bookingId, {
                eventDate: yyyyMmDd,
                startTime: newStartTime,
                endTime: newEndTime
            });
            toast.success("Time updated successfully!");
            onClose(); // Alternatively, refresh list if a callback exists
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update time");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={onClose}></div>

            <div className="relative bg-white w-full max-w-6xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">

                {/* Header */}
                <header className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white z-20">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Party Schedule</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-slate-400 text-sm font-bold">Manage booking status and timeline</span>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full border border-blue-100">
                                {bookings.length} TOTAL
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                                onClick={() => setViewMode('TIMELINE')}
                                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'TIMELINE' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                            >
                                Timeline
                            </button>
                            <button
                                onClick={() => setViewMode('GRID')}
                                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                            >
                                Data Grid
                            </button>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col">

                    {viewMode === 'TIMELINE' ? (
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                            {/* Left: Day Selector (Simplified) */}
                            <div className="w-full md:w-80 bg-slate-50 border-r border-slate-100 p-6 overflow-y-auto">
                                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Jump to Date</h3>
                                <input
                                    type="date"
                                    value={selectedDate.toISOString().split('T')[0]}
                                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700"
                                />

                                <div className="mt-8 space-y-4">
                                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Stats for {selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}</h3>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                        <div className="text-2xl font-black text-slate-800">{selectedDateBookings.length}</div>
                                        <div className="text-[10px] font-bold text-slate-400">Events Scheduled</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                        <div className="text-2xl font-black text-amber-600">{selectedDateBookings.filter(b => b.bookingType === 'EXCLUSIVE').length}</div>
                                        <div className="text-[10px] font-bold text-slate-400">Exclusive Layouts</div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Timeline (Reusing Logic) */}
                            <div className="flex-1 bg-white p-6 overflow-y-auto relative custom-scrollbar">
                                <div className="max-w-3xl mx-auto">
                                    <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center justify-between">
                                        Timeline View
                                        <span className="text-sm font-bold text-slate-400">{selectedDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                    </h3>

                                    <div
                                        className="relative border border-slate-100 rounded-3xl overflow-hidden shadow-sm"
                                        style={{ height: '800px' }}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                    >
                                        {/* Grid Lines */}
                                        {Array.from({ length: 32 }, (_, i) => 8 + i * 0.5).map(slotTime => (
                                            <div
                                                key={slotTime}
                                                className={`absolute w-full flex border-b transition-colors ${slotTime % 1 === 0 ? 'border-slate-200' : 'border-slate-50'}`}
                                                style={{ top: `${(slotTime - 8) * 40}px`, height: '20px' }}
                                            >
                                                <div className="w-16 shrink-0 border-r border-slate-100 flex justify-center items-start pt-[2px]">
                                                    {slotTime % 1 === 0 ? (
                                                        <span className="text-[10px] font-black text-slate-300 relative top-[-10px] bg-white px-2">
                                                            {slotTime}:00
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div
                                                    className={`flex-1 relative ${onSlotSelect ? 'cursor-pointer hover:bg-blue-50/50' : ''}`}
                                                    onClick={() => {
                                                        if (onSlotSelect) onSlotSelect(slotTime);
                                                    }}
                                                ></div>
                                            </div>
                                        ))}
                                        {/* Bookings */}
                                        {selectedDateBookings.map((b, idx) => {
                                            const startHr = timeToHours(b.startTime);
                                            let endHr = timeToHours(b.endTime);
                                            if (endHr === 0 || endHr < startHr) endHr = 24;
                                            const top = (startHr - 8) * 40;
                                            const height = (endHr - startHr) * 40;

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => onBookingClick(b)}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, b)}
                                                    className={`absolute left-20 right-4 rounded-xl p-3 shadow-sm border overflow-hidden transition-all cursor-grab hover:shadow-md hover:scale-[1.01] active:cursor-grabbing ${b.bookingType === 'EXCLUSIVE' ? 'bg-amber-500/20 border-amber-400/50 text-amber-950 shadow-[inset_0_0_20px_rgba(245,158,11,0.1)]' : 'bg-blue-50 border-blue-200/50 text-blue-900'}`}
                                                    style={{ top: `${top + 4}px`, height: `${height - 8}px`, zIndex: 10 }}
                                                >
                                                    <div className="flex items-center justify-between gap-1">
                                                        <div className="font-bold text-xs truncate">{b.customerName}</div>
                                                        {Number(b.advancePaid || 0) >= Number(b.totalAmount || 0) && Number(b.totalAmount || 0) > 0 && (
                                                            <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] opacity-70 flex items-center gap-1 mt-0.5">
                                                        <Clock size={10} /> {formatTime(b.startTime)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                            {/* Search bar */}
                            <div className="px-8 py-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search by customer name or phone..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 text-sm font-bold transition-all"
                                    />
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 shrink-0">
                                    <Filter size={18} />
                                    <span className="text-xs font-black uppercase">Recent First</span>
                                </div>
                            </div>

                            {/* Grid Table */}
                            <div className="flex-1 overflow-x-auto p-8 pt-4 custom-scrollbar">
                                <table className="w-full text-left border-separate border-spacing-y-3">
                                    <thead>
                                        <tr className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                                            <th className="px-4 pb-2">Customer Info</th>
                                            <th className="px-4 pb-2">Event Schedule</th>
                                            <th className="px-4 pb-2">Payment Status</th>
                                            <th className="px-4 pb-2 text-center">Status</th>
                                            <th className="px-4 pb-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBookings.map((b) => {
                                            const total = Number(b.totalAmount || 0);
                                            const advance = Number(b.advancePaid || 0);
                                            const balance = total - advance;
                                            const progress = total > 0 ? Math.min((advance / total) * 100, 100) : 0;
                                            const isSettled = advance >= total && total > 0;

                                            return (
                                            <tr key={b.id} className="group">
                                                <td className="bg-white group-hover:bg-blue-50/50 px-6 py-4 rounded-l-2xl border-y border-l border-slate-100 transition-colors">
                                                    <div className="font-black text-slate-700 text-sm">{b.customerName}</div>
                                                    <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                        <Phone size={10} />
                                                        {b.customerPhone}
                                                    </div>
                                                </td>
                                                <td className="bg-white group-hover:bg-blue-50/50 px-6 py-4 border-y border-slate-100 transition-colors">
                                                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                                        <CalendarIcon size={12} className="text-blue-500" />
                                                        {new Date(b.eventDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                    <div className="text-[10px] font-black text-slate-400 mt-1 flex items-center gap-1.5">
                                                        <Clock size={10} />
                                                        {formatTime(b.startTime)}
                                                    </div>
                                                </td>
                                                <td className="bg-white group-hover:bg-blue-50/50 px-6 py-4 border-y border-slate-100 transition-colors">
                                                    <div className="w-full max-w-[150px]">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className={`text-[9px] font-black ${isSettled ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                                {isSettled ? 'FULLY SETTLED' : `Rs. ${balance.toLocaleString()} DUE`}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-slate-400">{Math.round(progress)}%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full transition-all duration-500 ${isSettled ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                                style={{ width: `${progress}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="bg-white group-hover:bg-blue-50/50 px-6 py-4 border-y border-slate-100 text-center transition-colors">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getStatusStyle(b.status || 'PENDING')}`}>
                                                        {b.status}
                                                    </span>
                                                </td>
                                                <td className="bg-white group-hover:bg-blue-50/50 px-6 py-4 rounded-r-2xl border-y border-r border-slate-100 transition-colors text-right">
                                                    <button
                                                        onClick={() => onBookingClick(b)}
                                                        className="p-2 text-slate-300 hover:text-blue-600 transition-colors"
                                                    >
                                                        <AlertCircle size={20} />
                                                    </button>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Footer */}
                <footer className="px-8 py-4 bg-white border-t border-slate-100 flex justify-between items-center z-20">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Schedule Access</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-slate-900 hover:bg-black text-white px-8 py-2.5 rounded-xl font-black text-sm transition-all active:scale-[0.98]"
                    >
                        Close
                    </button>
                </footer>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>
    );
}
