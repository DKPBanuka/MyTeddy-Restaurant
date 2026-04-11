import { useState, useEffect } from 'react';
import { X, Percent, DollarSign, Printer, Calculator, Download } from 'lucide-react';
import { type PartyBookingDto } from '../api';
import ModernReceiptUI from './ModernReceiptUI';

interface ReceiptPreparationModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: PartyBookingDto;
    settings: any;
    receiptType: 'PARTY_ADVANCE' | 'PARTY_FINAL';
    onConfirm: (data: { discount: number; serviceCharge: number; paymentMethod: string; addonsTotal: number }, action: 'PRINT' | 'DOWNLOAD') => Promise<void>;
    isSubmitting: boolean;
}

export function ReceiptPreparationModal({ 
    isOpen, 
    onClose, 
    booking, 
    settings, 
    receiptType, 
    onConfirm, 
    isSubmitting 
}: ReceiptPreparationModalProps) {
    const [serviceCharge, setServiceCharge] = useState<number>(Number(booking.serviceCharge || 0));
    const [discountAmount, setDiscountAmount] = useState<number>(Number(booking.discount || 0));
    const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
    const [discountPercent, setDiscountPercent] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<string>(booking.paymentMethod || 'CASH');
    const [extraAdjustments, setExtraAdjustments] = useState<number>(Number(booking.addonsTotal || 0));

    const baseTotal = Number(booking.hallCharge || 0) + Number(booking.menuTotal || 0);
    const grossTotalWithExtras = baseTotal + extraAdjustments;

    useEffect(() => {
        if (discountType === 'PERCENT') {
            const calculated = (grossTotalWithExtras + serviceCharge) * (discountPercent / 100);
            setDiscountAmount(Math.round(calculated));
        }
    }, [discountPercent, discountType, grossTotalWithExtras, serviceCharge]);

    if (!isOpen) return null;

    // Create a temporary booking object for preview
    const previewBooking = {
        ...booking,
        serviceCharge,
        discount: discountAmount,
        paymentMethod,
        addonsTotal: extraAdjustments,
        totalAmount: (grossTotalWithExtras + serviceCharge) - discountAmount,
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl transition-opacity" onClick={onClose}></div>
            
            <div className="relative w-full max-w-6xl bg-white rounded-[3rem] shadow-2xl flex flex-col md:flex-row h-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20">
                
                {/* Left - Preview Area (Scrollable) */}
                <div className="flex-1 bg-slate-100/50 overflow-y-auto p-4 md:p-8 custom-scrollbar flex flex-col items-center">
                    <div className="mb-6 self-start px-4">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Receipt Preview</h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Live Thermal Simulation</p>
                    </div>
                    
                    {/* The Receipt Container - Vertically Scrollable Strip */}
                    <div className="w-full max-w-[320px] bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200 h-full max-h-[70vh] flex flex-col">
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                            <ModernReceiptUI 
                                orderData={previewBooking}
                                settings={settings}
                                logoUrl={settings?.logoUrl}
                                receiptType={receiptType}
                            />
                        </div>
                    </div>
                    <p className="mt-4 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Scroll to view full length</p>
                </div>

                {/* Right - Adjustments Area */}
                <div className="w-full md:w-[420px] bg-white border-l border-slate-100 p-8 flex flex-col overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Final Adjustments</h2>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Finalize before Printing</p>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-6 flex-1">
                        {/* Base Summary */}
                        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Amount</span>
                                <Calculator size={14} className="text-slate-300" />
                            </div>
                            <div className="text-xl font-black text-slate-800">Rs. {baseTotal.toLocaleString()}</div>
                        </div>

                        {/* Extra Adjustments - Moved below Base Amount */}
                        <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 pl-1">Extra / Adjustments (Rs.)</label>
                             <div className="relative">
                                <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                                <input
                                    type="number"
                                    value={extraAdjustments === 0 ? '' : extraAdjustments}
                                    onChange={(e) => setExtraAdjustments(Number(e.target.value) || 0)}
                                    className="w-full pl-12 pr-4 py-4 bg-blue-50/50 border border-blue-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all text-blue-900"
                                    placeholder="0"
                                />
                             </div>
                             <p className="text-[9px] font-bold text-slate-400 pl-1 italic">Damage, extra hours, or additional services</p>
                        </div>

                        {/* Service Charge */}
                        <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Service Charge (Rs.)</label>
                             <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="number"
                                    value={serviceCharge}
                                    onChange={(e) => setServiceCharge(Number(e.target.value))}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                                    placeholder="0"
                                />
                             </div>
                        </div>

                        {/* Discount Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between pl-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Discount</label>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button 
                                        onClick={() => setDiscountType('FIXED')}
                                        className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${discountType === 'FIXED' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                                    >
                                        FIXED
                                    </button>
                                    <button 
                                        onClick={() => setDiscountType('PERCENT')}
                                        className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${discountType === 'PERCENT' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                                    >
                                        PERCENT
                                    </button>
                                </div>
                            </div>

                            {discountType === 'PERCENT' ? (
                                <div className="relative">
                                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="number"
                                        value={discountPercent}
                                        onChange={(e) => setDiscountPercent(Number(e.target.value))}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                                        placeholder="0"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">
                                        ≈ Rs. {discountAmount.toLocaleString()}
                                    </div>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="number"
                                        value={discountAmount}
                                        onChange={(e) => setDiscountAmount(Number(e.target.value))}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                                        placeholder="0"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Payment Method Section */}
                        <div className="space-y-3 pt-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Settlement Method</label>
                             <div className="grid grid-cols-2 gap-2">
                                {['CASH', 'QR', 'ONLINE', 'OTHER'].map((method) => (
                                    <button
                                        key={method}
                                        onClick={() => setPaymentMethod(method)}
                                        className={`py-3 rounded-2xl text-[10px] font-black transition-all border ${paymentMethod === method ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                    >
                                        {method}
                                    </button>
                                ))}
                             </div>
                        </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <div className="bg-slate-900 rounded-3xl p-6 text-white mb-4 shadow-xl shadow-slate-200">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Net Payable Amount</span>
                            <div className="text-3xl font-black mt-1">
                                Rs. {previewBooking.totalAmount.toLocaleString()}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => onConfirm({ discount: discountAmount, serviceCharge, paymentMethod, addonsTotal: extraAdjustments }, 'PRINT')}
                                disabled={isSubmitting}
                                className="flex-1 bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black transition-all shadow-xl shadow-slate-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <Printer size={20} />
                                        SAVE & PRINT
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => onConfirm({ discount: discountAmount, serviceCharge, paymentMethod, addonsTotal: extraAdjustments }, 'DOWNLOAD')}
                                disabled={isSubmitting}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-2xl font-black transition-all shadow-xl shadow-blue-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                                title="Download PDF"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <Download size={20} />
                                        <span className="hidden sm:inline">PDF</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
