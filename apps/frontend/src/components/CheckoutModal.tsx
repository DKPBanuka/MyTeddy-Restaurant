import React, { useState, useEffect } from 'react';
import { 
    X, 
    CreditCard, 
    Banknote,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency } from '../utils/format';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number;
    initialMethod?: 'CARD' | 'CASH' | 'ONLINE';
    onConfirm: (paymentDetails: { 
        method: string; 
        amountReceived?: number; 
        change?: number;
        subTotal?: number;
        discount?: number;
        grandTotal?: number;
        discountPercentage?: number;
        customerId?: string;
    }) => Promise<any>;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
    isOpen,
    onClose,
    totalAmount,
    initialMethod = 'CARD',
    onConfirm
}) => {
    const { settings } = useSettings();
    const [method, setMethod] = useState<'CARD' | 'CASH' | 'ONLINE'>(initialMethod as any);
    const [cashReceived, setCashReceived] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [discountValue, setDiscountValue] = useState<string>('0');
    const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');

    useEffect(() => {
        if (isOpen) {
            setMethod(initialMethod as any);
            setCashReceived('');
            setDiscountValue('0');
            setDiscountType('FIXED');
        }
    }, [isOpen, initialMethod]);

    if (!isOpen) return null;

    const discountNum = parseFloat(discountValue || '0');
    const totalDiscount = discountType === 'PERCENTAGE' 
        ? (totalAmount * discountNum / 100) 
        : discountNum;

    const finalGrandTotal = Math.max(0, totalAmount - totalDiscount);
    const receivedNum = parseFloat(cashReceived || '0');
    const changeAmount = Math.max(0, receivedNum - finalGrandTotal);

    const handleConfirm = async () => {
        if (method === 'CASH' && receivedNum < finalGrandTotal) return;

        try {
            setIsSubmitting(true);
            await onConfirm({
                method,
                amountReceived: method === 'CASH' ? receivedNum : finalGrandTotal,
                change: method === 'CASH' ? changeAmount : 0,
                subTotal: totalAmount,
                discount: totalDiscount,
                grandTotal: finalGrandTotal,
                discountPercentage: discountType === 'PERCENTAGE' ? Number(discountValue) : undefined,
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Checkout</h2>
                        <p className="text-sm font-medium text-slate-500 mt-0.5">Complete order payment</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 pb-0">
                    {/* Amount Display */}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center shadow-inner">
                        <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
                            {totalDiscount > 0 ? 'Sub Total' : 'Total to Pay'}
                        </span>
                        {totalDiscount > 0 && (
                            <div className="text-2xl font-black text-blue-400 tracking-tight mt-1 line-through opacity-50">
                                {formatCurrency(totalAmount, settings?.currencySymbol || 'Rs.')}
                            </div>
                        )}
                        <div className="text-4xl font-black text-blue-800 tracking-tight mt-1">
                            {formatCurrency(finalGrandTotal, settings?.currencySymbol || 'Rs.')}
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6 max-h-[50vh] overflow-y-auto">

                    {/* Discount Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">Add Discount</h3>
                            <div className="flex bg-white border border-slate-200 rounded-lg p-1 overflow-hidden">
                                <button
                                    onClick={() => setDiscountType('FIXED')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${discountType === 'FIXED' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                >
                                    {settings?.currencySymbol || 'Rs.'}
                                </button>
                                <button
                                    onClick={() => setDiscountType('PERCENTAGE')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${discountType === 'PERCENTAGE' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                >
                                    %
                                </button>
                            </div>
                        </div>
                        
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">
                                {discountType === 'FIXED' ? (settings?.currencySymbol || 'Rs.') : '%'}
                            </span>
                            <input
                                type="number"
                                min="0"
                                value={discountValue}
                                onChange={(e) => setDiscountValue(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-blue-600 outline-none transition-all"
                                placeholder="0"
                            />
                        </div>
                        
                        {totalDiscount > 0 && (
                            <div className="flex justify-between items-center text-xs font-bold text-emerald-600">
                                <span>Discount Amount:</span>
                                <span>-{formatCurrency(totalDiscount, settings?.currencySymbol || 'Rs.')}</span>
                            </div>
                        )}
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">Payment Method</h3>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setMethod('CASH')}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${method === 'CASH' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700' : 'border-slate-100 bg-white hover:border-slate-200 text-slate-500'}`}
                            >
                                <Banknote size={24} className={method === 'CASH' ? 'text-emerald-600 mb-2' : 'text-slate-400 mb-2'} />
                                <span className="font-bold text-xs uppercase tracking-tight">Cash</span>
                            </button>
                            <button
                                onClick={() => setMethod('CARD')}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${method === 'CARD' ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-slate-100 bg-white hover:border-slate-200 text-slate-500'}`}
                            >
                                <CreditCard size={24} className={method === 'CARD' ? 'text-blue-600 mb-2' : 'text-slate-400 mb-2'} />
                                <span className="font-bold text-xs uppercase tracking-tight">Card</span>
                            </button>
                            <button
                                onClick={() => setMethod('ONLINE')}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${method === 'ONLINE' ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-slate-100 bg-white hover:border-slate-200 text-slate-500'}`}
                            >
                                <CreditCard size={24} className={method === 'ONLINE' ? 'text-blue-600 mb-2' : 'text-slate-400 mb-2'} />
                                <span className="font-bold text-xs uppercase tracking-tight">Online</span>
                            </button>
                        </div>
                    </div>

                    {/* Cash Input Details */}
                    {method === 'CASH' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-tight">Cash Received</h3>
                            <div className="relative mb-3">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">
                                    {settings?.currencySymbol || 'Rs.'}
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={cashReceived}
                                    onChange={(e) => setCashReceived(e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    placeholder="Enter amount..."
                                    className="w-full pl-12 pr-4 py-4 text-xl font-bold rounded-xl border-2 border-slate-200 focus:border-blue-600 focus:ring-0 outline-none transition-colors"
                                />
                            </div>

                            <div className={`p-4 rounded-xl border flex justify-between items-center transition-colors ${receivedNum >= finalGrandTotal ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                                <span className={`font-semibold ${receivedNum >= finalGrandTotal ? 'text-emerald-700' : 'text-slate-500'}`}>Change Due</span>
                                <span className={`text-xl font-black ${receivedNum >= finalGrandTotal ? 'text-emerald-600' : 'text-slate-800'}`}>
                                    {formatCurrency(changeAmount, settings?.currencySymbol || 'Rs.')}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 pt-0">
                    <button
                        onClick={handleConfirm}
                        disabled={isSubmitting || (method === 'CASH' && receivedNum < finalGrandTotal)}
                        className={`w-full py-4 rounded-xl font-black text-lg tracking-wide transition-all shadow-md flex items-center justify-center gap-2
                            ${isSubmitting || (method === 'CASH' && receivedNum < finalGrandTotal)
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]'}`}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                Processing...
                            </>
                        ) : (
                            'Confirm Payment'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
