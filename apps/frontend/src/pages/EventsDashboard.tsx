import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { CalendarDays, Clock, Users, CreditCard, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function EventsDashboard() {
    const { user } = useAuth();
    const [date, setDate] = useState<Date>(new Date());

    // Custom Tailwind overides for react-calendar exist via global CSS, but we keep it contained
    return (
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
            {/* Header matching the POS Dashboard style */}
            <header className="px-8 pt-8 pb-6 flex items-center justify-between z-10 shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Party & Events</h1>
                    <p className="text-slate-500 font-medium mt-1">Manage reservations and upcoming bookings</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden border border-slate-200 shadow-sm">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden sm:block">
                        <div className="font-bold text-slate-800 text-sm">{user?.name}</div>
                        <div className="text-xs text-slate-500 capitalize">{user?.role?.toLowerCase()}</div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-8 pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Calendar UI */}
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        {/* Calendar Card */}
                        <div className="bg-white p-6 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                    <CalendarDays size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800">Select Date</h2>
                            </div>

                            {/* We use standard react-calendar and override its messy default styles with Tailwind in a wrapper */}
                            <div className="custom-calendar-container">
                                <Calendar
                                    onChange={(val) => setDate(val as Date)}
                                    value={date}
                                    className="border-none w-full font-sans text-slate-800"
                                    tileClassName="rounded-xl font-semibold py-2 my-1"
                                />
                            </div>
                        </div>

                        {/* Upcoming Summary Card */}
                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-3xl shadow-lg shadow-blue-500/30">
                            <h3 className="font-bold text-blue-100 mb-1">Today's Bookings</h3>
                            <p className="text-3xl font-black mb-6">4 Events</p>

                            <div className="space-y-3">
                                <div className="bg-white/10 rounded-xl p-3 flex items-center justify-between backdrop-blur-sm">
                                    <div>
                                        <div className="font-bold text-sm">Anna's Birthday</div>
                                        <div className="text-xs text-blue-200 mt-0.5">Table 4 • 8 Guests</div>
                                    </div>
                                    <div className="text-right text-sm font-semibold">
                                        18:00
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Reservation Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white p-8 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100">
                            <h2 className="text-2xl font-bold text-slate-800 mb-8 border-b border-slate-100 pb-4">New Reservation Form</h2>

                            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Customer Name */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-1">Customer Name</label>
                                        <input type="text" placeholder="e.g. John Doe" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-2xl outline-none font-medium text-slate-800 transition-all font-sans" />
                                    </div>

                                    {/* Contact Number */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-1">Contact Number</label>
                                        <input type="tel" placeholder="+94 77 ..." className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-2xl outline-none font-medium text-slate-800 transition-all font-sans" />
                                    </div>

                                    {/* Date & Time */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-1">Time</label>
                                        <div className="relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input type="time" className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-2xl outline-none font-medium text-slate-800 transition-all font-sans" />
                                        </div>
                                    </div>

                                    {/* Guests */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-1">Number of Guests</label>
                                        <div className="relative">
                                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input type="number" min="1" placeholder="2" className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-2xl outline-none font-medium text-slate-800 transition-all font-sans" />
                                        </div>
                                    </div>

                                    {/* Table Selection */}
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-bold text-slate-600 ml-1">Table / Room Selection</label>
                                        <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-2xl outline-none font-medium text-slate-800 transition-all font-sans appearance-none cursor-pointer">
                                            <option>Main Dining - Table 1 (4 Seats)</option>
                                            <option>Main Dining - Table 2 (2 Seats)</option>
                                            <option>VIP Room (12 Seats)</option>
                                            <option>Patio - Table 5 (4 Seats)</option>
                                        </select>
                                    </div>

                                    {/* Advance Payment */}
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-bold text-slate-600 ml-1">Advance Payment Amount (LKR)</label>
                                        <div className="relative">
                                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input type="number" step="0.01" placeholder="5000.00" className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-2xl outline-none font-medium text-slate-800 transition-all font-sans" />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button type="submit" className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors active:scale-[0.98]">
                                        Confirm Reservation
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                </div>
            </div>

            {/* Add some global CSS overrides for the react-calendar to make it match the minimal Dribbble theme */}
            <style>{`
        .custom-calendar-container .react-calendar { border: none; font-family: inherit; }
        .custom-calendar-container .react-calendar__navigation button { font-weight: 800; border-radius: 8px; font-size: 16px; min-width: 44px; color: #1e293b; }
        .custom-calendar-container .react-calendar__navigation button:enabled:hover { background-color: #f1f5f9; }
        .custom-calendar-container .react-calendar__month-view__weekdays { font-weight: 700; font-size: 12px; text-transform: uppercase; color: #94a3b8; text-decoration: none !important; }
        .custom-calendar-container .react-calendar__month-view__weekdays__weekday abbr { text-decoration: none; }
        .custom-calendar-container .react-calendar__tile { border-radius: 12px; padding: 12px 6px; font-weight: 600; font-size: 14px; color: #334155; }
        .custom-calendar-container .react-calendar__tile:enabled:hover { background-color: #f1f5f9; color: #1e293b; }
        .custom-calendar-container .react-calendar__tile--now { background: #eff6ff; color: #2563eb; font-weight: 800; }
        .custom-calendar-container .react-calendar__tile--active { background: #2563eb !important; color: white !important; font-weight: 800; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); }
      `}</style>
        </main>
    );
}
