import { useState } from 'react';
import { X, Phone, User, Calendar as CalendarIcon, Clock, DollarSign, MessageCircle, Printer, CreditCard, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api, type PartyBookingDto } from '../api';
import { toast } from 'sonner';

interface BookingDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    booking: PartyBookingDto | null;
    onSuccess: () => void;
}

export function BookingDetailDrawer({ isOpen, onClose, booking, onSuccess }: BookingDetailDrawerProps) {
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !booking) return null;

    const totalAmount = Number(booking.totalAmount) || 0;
    const advancePaid = Number(booking.advancePaid) || 0;
    const balanceDue = totalAmount - advancePaid;

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'CONFIRMED':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'COMPLETED':
                return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'CANCELLED':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const handleRecordPayment = async () => {
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid payment amount.');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.updatePartyBookingAdvance(booking.id!, amount);
            toast.success(`Payment of Rs. ${amount.toLocaleString()} recorded!`);
            setPaymentAmount('');
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to record payment.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleWhatsApp = () => {
        const message = `Halo ${booking.customerName}, this is a reminder regarding your booking on ${new Date(booking.eventDate).toLocaleDateString()}. Balance due: Rs. ${balanceDue.toLocaleString()}.`;
        const url = `https://wa.me/${booking.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[60] flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Viewport Drawer */}
            <div className={`relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-black text-slate-800">Event Details</h2>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border mt-1 ${getStatusStyles(booking.status || 'PENDING')}`}>
                            {booking.status}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Customer Info Card */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                                <User size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">{booking.customerName}</h3>
                                <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium">
                                    <Phone size={14} />
                                    {booking.customerPhone}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200/50">
                            <div className="space-y-1">
                                <div className="text-[10px] uppercase font-bold text-slate-400">Date</div>
                                <div className="flex items-center gap-1.5 text-slate-700 font-bold text-sm">
                                    <CalendarIcon size={14} className="text-slate-400" />
                                    {new Date(booking.eventDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] uppercase font-bold text-slate-400">Time</div>
                                <div className="flex items-center gap-1.5 text-slate-700 font-bold text-sm">
                                    <Clock size={14} className="text-slate-400" />
                                    {booking.startTime.includes('T') ? new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : booking.startTime}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-black text-slate-800 flex items-center gap-2">
                                <CreditCard size={18} className="text-blue-600" />
                                Payment Summary
                            </h4>
                            <span className="text-[10px] uppercase font-black px-2 py-1 bg-slate-100 text-slate-500 rounded-md">
                                {booking.bookingType}
                            </span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm py-2 border-b border-slate-50">
                                <span className="text-slate-500 font-medium">Booking Total</span>
                                <span className="text-slate-800 font-bold">Rs. {totalAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm py-2 border-b border-slate-50">
                                <span className="text-emerald-600 font-bold">Total Paid</span>
                                <span className="text-emerald-600 font-black">Rs. {advancePaid.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                <span className="text-blue-700 font-black">Balance Due</span>
                                <span className="text-2xl font-black text-blue-900">Rs. {balanceDue.toLocaleString()}</span>
                            </div>
                        </div>
                    </section>

                    {/* Actions Panel */}
                    <div className="space-y-3 pt-4">
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">CRM Actions</h4>

                        {/* Record Payment Input Group */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <label className="text-sm font-bold text-slate-600 block mb-2">Record New Payment</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="number"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        placeholder="Amount"
                                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 text-sm font-bold"
                                    />
                                </div>
                                <button
                                    onClick={handleRecordPayment}
                                    disabled={isSubmitting || !paymentAmount}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSubmitting ? '...' : <CheckCircle2 size={18} />}
                                    Pay
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleWhatsApp}
                            className="w-full flex items-center justify-between p-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl border border-emerald-100 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center">
                                    <MessageCircle size={20} />
                                </div>
                                <div className="text-left">
                                    <div className="font-black text-sm">WhatsApp Alert</div>
                                    <div className="text-[10px] font-bold opacity-70 italic">Send reminder to customer</div>
                                </div>
                            </div>
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button
                            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl border border-slate-200 transition-all group opacity-60 grayscale hover:grayscale-0"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-800 text-white rounded-xl flex items-center justify-center">
                                    <Printer size={20} />
                                </div>
                                <div className="text-left">
                                    <div className="font-black text-sm">Print Invoice</div>
                                    <div className="text-[10px] font-bold opacity-70">Generate PDF Receipt</div>
                                </div>
                            </div>
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Footer Status Tip */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
                    <AlertCircle className="text-blue-500 shrink-0" size={18} />
                    <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                        Recording a payment will automatically update the booking status. Once full balance is paid, mark the event as COMPLETED.
                    </p>
                </div>
            </div>
        </div>
    );
}
