import { useState, useEffect } from 'react';
import { X, Clock, Loader2, Users, Calendar as CalendarIcon } from 'lucide-react';
import { api, type PartyBookingDto } from '../api';

interface VisualTimePickerPopupProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: string; // YYYY-MM-DD
    onSelect: (date: string, time: string, duration: number) => void;
    duration: number;
}

export function VisualTimePickerPopup({
    isOpen,
    onClose,
    selectedDate: initialDate,
    onSelect,
    duration: initialDuration
}: VisualTimePickerPopupProps) {
    const [bookings, setBookings] = useState<PartyBookingDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hoverSlot, setHoverSlot] = useState<number | null>(null);
    const [localDate, setLocalDate] = useState(initialDate);
    const [localDuration, setLocalDuration] = useState(initialDuration);
    const [activeTime, setActiveTime] = useState<string | null>(null);

    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLocalDate(initialDate);
            setLocalDuration(initialDuration);
            setActiveTime(null);
            fetchDayBookings(initialDate);
        }
    }, [isOpen, initialDate, initialDuration]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing || !activeTime) return;
        
        const timeline = document.getElementById('timeline-container');
        if (!timeline) return;

        const rect = timeline.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const currentSlotTime = (y / 40) + 8;
        const startTime = timeToHours(activeTime);
        
        let newDur = Math.max(0.5, Math.round((currentSlotTime - startTime) * 2) / 2);
        
        // Max 10 hours for a single booking to prevent infinite drag
        newDur = Math.min(newDur, 12);

        setLocalDuration(newDur);
    };

    const handleMouseUp = () => {
        setIsResizing(false);
    };

    const fetchDayBookings = async (dateStr: string) => {
        setIsLoading(true);
        try {
            // dateStr is "YYYY-MM-DD", parse manually to avoid any timezone shifts
            const [year, month] = dateStr.split('-').map(Number);
            const data = await api.getPartyBookings({
                month,
                year
            });
            const targetDateStr = dateStr; // Correctly formatted from input
            const dayBookings = data.filter(b => {
                const bDateStr = b.eventDate.split('T')[0];
                return bDateStr === targetDateStr;
            });
            setBookings(dayBookings);
        } catch (error) {
            console.error("Failed to fetch bookings for picker:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDateChange = (newDate: string) => {
        setLocalDate(newDate);
        setActiveTime(null);
        fetchDayBookings(newDate);
    };

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

    const checkOverlap = (slotStartTime: number, dur: number) => {
        const slotEndTime = slotStartTime + dur;
        return bookings.some((b: PartyBookingDto) => {
            const bStart = timeToHours(b.startTime);
            let bEnd = timeToHours(b.endTime);
            if (bEnd === 0 || bEnd < bStart) bEnd = 24.5;
            return (slotStartTime < bEnd && slotEndTime > bStart);
        });
    };

    const todayStr = new Date().toISOString().split('T')[0];

    if (!isOpen) return null;

    const isCurrentOverlap = activeTime ? checkOverlap(timeToHours(activeTime), localDuration) : false;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 select-none">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose}></div>
            
            <div className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                <header className="px-8 py-6 border-b border-slate-100 bg-white shrink-0">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                <Clock className="text-violet-600" size={20} />
                                Schedule Portal
                            </h2>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Select Date & Time Visually</p>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Date Picker */}
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Date</label>
                            <input
                                type="date"
                                min={todayStr}
                                value={localDate}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-violet-500 rounded-2xl outline-none font-bold text-slate-700 transition-all text-sm"
                            />
                        </div>

                        {/* Quick Duration Buttons */}
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duration (Drag helper)</label>
                            <div className="flex bg-slate-50 p-1 rounded-2xl h-[48px]">
                                {[2, 3, 4, 5].map(h => (
                                    <button
                                        key={h}
                                        onClick={() => {
                                            setLocalDuration(h);
                                        }}
                                        className={`flex-1 rounded-xl text-xs font-black transition-all ${localDuration === h ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400'}`}
                                    >
                                        {h}h
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/60 z-30 backdrop-blur-[2px] flex items-center justify-center">
                            <Loader2 className="animate-spin text-violet-500" size={32} />
                        </div>
                    )}

                    <div id="timeline-container" className="relative border border-slate-100 rounded-3xl overflow-hidden bg-slate-50/30" style={{ height: '640px' }}>
                        {/* Grid Lines */}
                        {Array.from({ length: 32 }, (_, i) => 8 + i * 0.5).map(slotTime => {
                            const isOverlapping = checkOverlap(slotTime, localDuration);

                            return (
                                <div
                                    key={slotTime}
                                    className={`absolute w-full flex border-b transition-colors ${slotTime % 1 === 0 ? 'border-slate-200' : 'border-slate-50'}`}
                                    style={{ top: `${(slotTime - 8) * 40}px`, height: '20px' }}
                                    onMouseEnter={() => !isOverlapping && setHoverSlot(slotTime)}
                                    onMouseLeave={() => setHoverSlot(null)}
                                >
                                    <div className="w-16 shrink-0 border-r border-slate-100 flex justify-center items-start pt-[2px] bg-white z-10">
                                        {slotTime % 1 === 0 && (
                                            <span className="text-[10px] font-black text-slate-300 relative top-[-10px] bg-white px-2">
                                                {slotTime}:00
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        className={`flex-1 relative transition-colors ${isOverlapping ? 'bg-red-50/30 cursor-not-allowed' : 'cursor-pointer hover:bg-violet-50/50'}`}
                                        onClick={() => {
                                            if (!isOverlapping) {
                                                setActiveTime(hoursToTime(slotTime));
                                            }
                                        }}
                                    ></div>
                                </div>
                            );
                        })}

                        {/* Existing Bookings */}
                        {bookings.map((b: PartyBookingDto, idx: number) => {
                            const startHr = timeToHours(b.startTime);
                            let endHr = timeToHours(b.endTime);
                            if (endHr === 0 || endHr < startHr) endHr = 24.5;
                            const top = (startHr - 8) * 40;
                            const height = (endHr - startHr) * 40;

                            return (
                                <div
                                    key={idx}
                                    className={`absolute left-20 right-4 rounded-xl p-3 border overflow-hidden shadow-sm flex flex-col justify-center ${b.bookingType === 'EXCLUSIVE' ? 'bg-amber-500/10 border-amber-500/30 text-amber-700' : 'bg-slate-200/50 border-slate-300/50 text-slate-500'}`}
                                    style={{ top: `${top + 2}px`, height: `${height - 4}px`, zIndex: 10 }}
                                >
                                    <div className="font-black text-[10px] truncate uppercase">{b.customerName}</div>
                                    <div className="text-[9px] font-bold opacity-70">{hoursToTime(startHr)} - {hoursToTime(endHr)}</div>
                                </div>
                            );
                        })}

                        {/* Selection Indicator with Drag Handle */}
                        {activeTime && (
                            <div 
                                className={`absolute left-20 right-4 border-2 rounded-xl shadow-lg z-20 transition-colors ${isCurrentOverlap ? 'bg-red-600/20 border-red-500 animate-pulse' : 'bg-violet-600 border-violet-400'}`}
                                style={{ top: `${(timeToHours(activeTime) - 8) * 40 + 2}px`, height: `${localDuration * 40 - 4}px` }}
                            >
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 ${isCurrentOverlap ? 'bg-red-600 text-white' : 'bg-white text-violet-600'}`}>
                                        <Clock size={12} />
                                        {activeTime} • {localDuration}h {isCurrentOverlap ? '(Conflict!)' : ''}
                                    </span>
                                </div>

                                {/* Drag Handle at the bottom */}
                                <div 
                                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-2 bg-white/40 hover:bg-white rounded-full mb-1 cursor-ns-resize active:scale-x-125 transition-all flex items-center justify-center"
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setIsResizing(true);
                                    }}
                                >
                                    <div className="w-8 h-[2px] bg-white rounded-full opacity-50" />
                                </div>
                            </div>
                        )}

                        {/* Hover Preview */}
                        {hoverSlot !== null && !activeTime && (
                            <div 
                                className="absolute left-20 right-4 bg-violet-600/10 border-2 border-dashed border-violet-400 rounded-xl pointer-events-none z-20"
                                style={{ top: `${(hoverSlot - 8) * 40 + 2}px`, height: `${localDuration * 40 - 4}px` }}
                            />
                        )}
                    </div>
                </div>

                <footer className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Users size={12} />
                        {isCurrentOverlap ? 'Please Resolve Conflict' : activeTime ? 'Drag bottom handle to adjust duration' : 'Pick a time slot'}
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="text-slate-500 hover:text-slate-800 font-black text-xs transition-colors px-4"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={!activeTime || isCurrentOverlap}
                            onClick={() => {
                                if (activeTime && !isCurrentOverlap) {
                                    onSelect(localDate, activeTime, localDuration);
                                    onClose();
                                }
                            }}
                            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2"
                        >
                            <CalendarIcon size={16} />
                            Confirm Selection
                        </button>
                    </div>
                </footer>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                input[type="date"]::-webkit-calendar-picker-indicator {
                    cursor: pointer;
                    border-radius: 4px;
                    margin-right: 2px;
                    opacity: 0.6;
                    filter: invert(0.2) sepia(1) saturate(5) hue-rotate(220deg);
                }
                input[type="date"]::-webkit-calendar-picker-indicator:hover {
                    opacity: 1;
                }
            `}</style>
        </div>
    );
}
