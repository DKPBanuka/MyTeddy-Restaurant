import { useState } from 'react';
import { X, Phone, User, Calendar as CalendarIcon, Clock, DollarSign, MessageCircle, Printer, ChevronRight, CheckCircle2, Edit, UtensilsCrossed } from 'lucide-react';
import { api, type PartyBookingDto } from '../api';
import { toast } from 'sonner';
import { MenuSelectionPopup } from './MenuSelectionPopup';
import { useSettings } from '../context/SettingsContext';
import { generatePDFReceipt } from '../utils/pdfReceipt';
import { ReceiptPreparationModal } from './ReceiptPreparationModal';

interface BookingDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    booking: PartyBookingDto | null;
    onSuccess: () => void;
    onEdit?: () => void;
}

export function BookingDetailDrawer({ isOpen, onClose, booking, onSuccess, onEdit }: BookingDetailDrawerProps) {
    const { settings } = useSettings();
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Menu Editing State
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSavingMenu, setIsSavingMenu] = useState(false);
    const [preparationModal, setPreparationModal] = useState<{ isOpen: boolean; type: 'PARTY_ADVANCE' | 'PARTY_FINAL' }>({
        isOpen: false,
        type: 'PARTY_ADVANCE'
    });

    if (!isOpen || !booking) return null;

    const totalAmount = Number(booking.totalAmount) || 0;
    const menuTotal = Number(booking.menuTotal) || 0;
    const addonsTotal = Number(booking.addonsTotal) || 0;
    const advancePaid = Number(booking.advancePaid) || 0;
    const balanceDue = totalAmount - advancePaid;

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'CONFIRMED': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
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

    const handleSaveMenu = async (newItems: any[], newMenuTotal: number) => {
        setIsSavingMenu(true);
        try {
            await api.updatePartyBookingItems(booking.id!, newItems, newMenuTotal);
            toast.success('Event menu updated successfully!');
            setIsMenuOpen(false);
            onSuccess(); // Refresh
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to update menu.');
        } finally {
            setIsSavingMenu(false);
        }
    };

    const handlePreparationConfirm = async (data: { discount: number; serviceCharge: number; paymentMethod: string }) => {
        setIsSubmitting(true);
        try {
            // 1. Save to backend
            await api.updatePartyBooking(booking.id!, {
                discount: data.discount,
                serviceCharge: data.serviceCharge,
                paymentMethod: data.paymentMethod
            });
            
            // 2. Refresh local state/parent
            onSuccess();
            
            // 3. Trigger receipt print with updated data
            const updatedBooking = { ...booking, ...data, totalAmount: (Number(booking.hallCharge || 0) + Number(booking.menuTotal || 0) + Number(booking.addonsTotal || 0) + data.serviceCharge) - data.discount };
            generatePDFReceipt(updatedBooking, settings, settings?.logoUrl, preparationModal.type);
            
            // 4. Close modal
            setPreparationModal(prev => ({ ...prev, isOpen: false }));
            toast.success('Invoiced successfully!');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to prepare receipt.');
        } finally {
            setIsSubmitting(false);
        }
    };

    let items: any[] = [];
    try {
        items = booking.items ? (typeof booking.items === 'string' ? JSON.parse(booking.items) : booking.items) : [];
    } catch {
        items = [];
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={onClose}></div>

            {/* Modal Window */}
            <div className="relative w-full max-w-5xl bg-slate-50/50 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row h-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300">
                
                {/* Left Pane - Booking Specifics */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 space-y-8 bg-white/60 backdrop-blur-3xl min-h-0">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <div className="flex items-center gap-4">
                                <h2 className="text-3xl font-black text-slate-800 tracking-tight">{booking.customerName}</h2>
                                {onEdit && (
                                    <button 
                                        onClick={onEdit} 
                                        className="text-[10px] flex items-center gap-1 font-black uppercase tracking-widest text-slate-400 border-2 border-slate-200 px-3 py-1 rounded-xl hover:border-blue-500 hover:text-blue-600 transition-colors shadow-sm bg-white"
                                    >
                                        <Edit size={12} />
                                        Edit
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-3">
                                <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border shadow-sm ${getStatusStyles(booking.status || 'PENDING')}`}>
                                    {booking.status}
                                </span>
                                <span className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                    {booking.bookingType}
                                </span>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-12 h-12 bg-white hover:bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 active:scale-95 md:hidden">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white/90 backdrop-blur-sm p-5 rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Contact</p>
                            <p className="font-bold text-slate-700 flex items-center gap-2"><Phone size={16} className="text-blue-500"/> {booking.customerPhone}</p>
                        </div>
                        <div className="bg-white/90 backdrop-blur-sm p-5 rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Guests</p>
                            <p className="font-bold text-slate-700 flex items-center gap-2"><User size={16} className="text-blue-500"/> {booking.guestCount} PAX</p>
                        </div>
                        <div className="bg-white/90 backdrop-blur-sm p-5 rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:col-span-2 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Schedule</p>
                            <div className="flex flex-wrap gap-4 items-center">
                                <p className="font-bold text-slate-700 flex items-center gap-2"><CalendarIcon size={16} className="text-emerald-500"/> {new Date(booking.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                <span className="hidden sm:block text-slate-300">•</span>
                                <p className="font-bold text-slate-700 flex items-center gap-2">
                                    <Clock size={16} className="text-emerald-500"/> 
                                    {booking.startTime.includes('T') ? new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : booking.startTime}
                                    {' — '}
                                    {booking.endTime.includes('T') ? new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : booking.endTime}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items Render */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest bg-white pl-4 pr-5 py-2 rounded-xl border border-slate-100 shadow-sm flex items-center gap-2">
                                <UtensilsCrossed size={16} className="text-blue-500" />
                                Selected Menu
                            </h3>
                            <button onClick={() => setIsMenuOpen(true)} className="text-xs font-black text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-5 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm border border-blue-100 hover:border-blue-600">
                                <Edit size={14} /> Edit Catalog
                            </button>
                        </div>
                        
                        {items && items.length > 0 ? (
                            <div className="bg-white rounded-3xl border border-white p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-2">
                                {items.map((item: any, idx: number) => {
                                    const itemName = item.package?.name || item.product?.name || (item.selectedAddons?.[0]?.name) || 'Unknown Item';
                                    let itemPrice = 0;
                                    if (item.packageId) {
                                        itemPrice = parseFloat(item.package?.price || '0');
                                    } else if (item.productId) {
                                        itemPrice = item.size ? parseFloat(item.size.price) : parseFloat(item.product?.price || '0');
                                        if (item.selectedAddons) {
                                            itemPrice += item.selectedAddons.reduce((sum: number, a: any) => sum + parseFloat(a.price), 0);
                                        }
                                    } else if (item.addonIds && item.selectedAddons) {
                                        itemPrice = parseFloat(item.selectedAddons[0]?.price || '0');
                                    }
                                    
                                    return (
                                        <div key={idx} className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl hover:bg-slate-50 transition-colors border border-slate-100/50">
                                            <div className="flex items-center gap-4">
                                                <span className="font-black text-slate-600 bg-white w-10 h-10 rounded-xl flex items-center justify-center text-sm border border-slate-200 shadow-sm">{item.quantity}x</span>
                                                <div>
                                                    <p className="font-black text-sm text-slate-800">{itemName}</p>
                                                    {item.size && <p className="text-[10px] font-bold text-blue-500 uppercase">{item.size.name}</p>}
                                                    {item.package?.items && <p className="text-[10px] font-bold text-slate-400 truncate max-w-[200px] sm:max-w-xs">{item.package.items.map((i: any) => i.product.name).join(', ')}</p>}
                                                </div>
                                            </div>
                                            <p className="font-black text-slate-800 text-sm">Rs. {(itemPrice * item.quantity).toLocaleString()}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-12 border border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center text-center bg-white/50">
                                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4"><UtensilsCrossed size={24} className="text-slate-300"/></div>
                                <p className="text-slate-500 font-bold mb-1">No catalog items selected.</p>
                                <p className="text-xs text-slate-400 font-medium tracking-wide">Click Edit Catalog to begin structuring the menu.</p>
                            </div>
                        )}
                        {isSavingMenu && <p className="text-blue-500 text-xs font-bold animate-pulse">Saving changes to server...</p>}
                    </div>

                    {/* CRM Actions */}
                    <div className="space-y-4 pt-4 border-t border-slate-200/50">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Quick Actions</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button onClick={handleWhatsApp} className="w-full flex items-center justify-between p-4 bg-white hover:bg-emerald-50 text-slate-700 rounded-3xl border border-white transition-all group shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-emerald-500/10 hover:border-emerald-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-emerald-500 group-hover:text-white"><MessageCircle size={20} /></div>
                                    <div className="text-left">
                                        <div className="font-black text-sm group-hover:text-emerald-700 transition-colors">WhatsApp</div>
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Remind Customer</div>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                            </button>
                            <div className="space-y-2">
                                <button 
                                    onClick={() => setPreparationModal({ isOpen: true, type: 'PARTY_ADVANCE' })}
                                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-blue-50 text-slate-700 rounded-3xl border border-white transition-all group shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-blue-500/10 hover:border-blue-100"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-blue-600 group-hover:text-white"><Printer size={20} /></div>
                                        <div className="text-left">
                                            <div className="font-black text-sm group-hover:text-blue-700 transition-colors">Advance Receipt</div>
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Print Confirmation</div>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                </button>

                                <button 
                                    onClick={() => setPreparationModal({ isOpen: true, type: 'PARTY_FINAL' })}
                                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-900 hover:text-white text-slate-700 rounded-3xl border border-white transition-all group shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-slate-900/10 hover:border-slate-800"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-slate-800 group-hover:text-white"><Printer size={20} /></div>
                                        <div className="text-left">
                                            <div className="font-black text-sm transition-colors text-slate-700 group-hover:text-white">Final Invoice</div>
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Full Settlement</div>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-300 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Pane - Financials */}
                <div className="w-full md:w-[380px] bg-slate-900 border-l border-white/5 p-6 md:p-10 flex flex-col overflow-y-auto custom-scrollbar text-white relative min-h-0">
                    <button onClick={onClose} className="absolute top-6 right-6 w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl items-center justify-center transition-all hidden md:flex active:scale-95 shadow-2xl">
                        <X size={20} />
                    </button>
                    
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black tracking-tight text-white/90">Financial Overview</h3>
                    </div>
                    
                    <div className="space-y-4 mb-8 flex-1">
                        <div className="flex justify-between items-center py-4 border-b border-white/5">
                            <span className="text-slate-400 font-bold text-sm tracking-wide">Hall Charge</span>
                            <span className="font-black text-white">Rs. {Number(booking.hallCharge || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-4 border-b border-white/5">
                            <span className="text-slate-400 font-bold text-sm tracking-wide">Menu Value</span>
                            <span className="font-black text-white">Rs. {menuTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-4 border-b border-white/5">
                            <span className="text-slate-400 font-bold text-sm tracking-wide">Extra Addons</span>
                            <span className="font-black text-white">Rs. {addonsTotal.toLocaleString()}</span>
                        </div>
                        {Number(booking.serviceCharge || 0) > 0 && (
                            <div className="flex justify-between items-center py-4 border-b border-white/5">
                                <span className="text-blue-400 font-bold text-sm tracking-wide">Service Charge</span>
                                <span className="font-black text-blue-400">Rs. {Number(booking.serviceCharge).toLocaleString()}</span>
                            </div>
                        )}
                        {Number(booking.discount || 0) > 0 && (
                            <div className="flex justify-between items-center py-4 border-b border-white/5">
                                <span className="text-red-400 font-bold text-sm tracking-wide">Discount Applied</span>
                                <span className="font-black text-red-400">-Rs. {Number(booking.discount).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center py-4">
                            <span className="text-white font-black uppercase tracking-widest text-xs">Gross Total</span>
                            <span className="font-black text-2xl text-blue-400 tracking-tight">Rs. {totalAmount.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="mt-auto space-y-6">
                        <div className="bg-white/5 rounded-[2rem] p-6 border border-white/10 space-y-5 shadow-2xl backdrop-blur-xl">
                            <div className="flex justify-between items-center">
                                <span className="text-emerald-400 font-bold text-sm flex items-center gap-2"><CheckCircle2 size={16}/> Paid Advance</span>
                                <span className="font-black text-xl text-emerald-400">Rs. {advancePaid.toLocaleString()}</span>
                            </div>
                            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                            <div className="flex justify-between items-end">
                                <span className="text-slate-400 font-bold text-sm uppercase tracking-widest pb-1">Balance Due</span>
                                <span className="font-black text-3xl text-white tracking-tight">Rs. {balanceDue.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Pay Input */}
                        {balanceDue > 0 ? (
                            <div className="space-y-3 pt-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Settle Outstanding</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <input
                                            type="number"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            placeholder="Amount"
                                            className="w-full pl-10 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-700 text-white font-bold transition-all text-sm placeholder:text-slate-600"
                                        />
                                    </div>
                                    <button
                                        onClick={handleRecordPayment}
                                        disabled={isSubmitting || !paymentAmount}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-8 rounded-[1.25rem] font-black transition-all disabled:opacity-50 disabled:bg-slate-800 shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] active:scale-95 flex items-center justify-center min-w-[100px]"
                                    >
                                        {isSubmitting ? '...' : 'Pay'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full py-5 rounded-[1.25rem] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black flex items-center justify-center gap-2 text-sm uppercase tracking-widest">
                                <CheckCircle2 size={20} /> Fully Settled
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Menu Selection Popup Overlay */}
            {isMenuOpen && (
                <div className="z-[70] fixed inset-0">
                    <MenuSelectionPopup
                        isOpen={isMenuOpen}
                        onClose={() => setIsMenuOpen(false)}
                        onConfirm={handleSaveMenu}
                        initialItems={items}
                    />
                </div>
            )}
            {/* Receipt Preparation Modal */}
            {preparationModal.isOpen && (
                <ReceiptPreparationModal 
                    isOpen={preparationModal.isOpen}
                    onClose={() => setPreparationModal(prev => ({ ...prev, isOpen: false }))}
                    booking={booking}
                    settings={settings}
                    receiptType={preparationModal.type}
                    onConfirm={handlePreparationConfirm}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
}
