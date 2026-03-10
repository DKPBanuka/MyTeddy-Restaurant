import React, { useState, useEffect } from 'react';
import { X, CreditCard, Banknote } from 'lucide-react';
import { formatCurrency } from '../utils/format';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number;
    initialMethod?: 'CARD' | 'CASH' | 'PAYLATER';
    onConfirm: (paymentDetails: { method: string; amountReceived?: number; change?: number }) => Promise<void>;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
    isOpen,
    onClose,
    totalAmount,
    initialMethod = 'CARD',
    onConfirm
}) => {
    const [method, setMethod] = useState<'CARD' | 'CASH' | 'PAYLATER'>(initialMethod);
    const [cashReceived, setCashReceived] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync initial method when modal opens
    useEffect(() => {
        if (isOpen) {
            setMethod(initialMethod);
            if (initialMethod !== 'CASH') {
                setCashReceived('');
            }
        }
    }, [isOpen, initialMethod]);

    if (!isOpen) return null;

    const receivedNum = parseFloat(cashReceived || '0');
    const changeAmount = Math.max(0, receivedNum - totalAmount);

    // Quick cash buttons (e.g. Exact, 1000, 2000, 5000)
    const quickCashOptions = [
        totalAmount,
        Math.ceil(totalAmount / 1000) * 1000,
        Math.ceil(totalAmount / 5000) * 5000,
    ].filter((val, index, self) => self.indexOf(val) === index && val >= totalAmount);

    const handleConfirm = async () => {
        if (method === 'CASH' && receivedNum < totalAmount) {
            return; // Cannot proceed if cash is insufficient
        }

        try {
            setIsSubmitting(true);
            await onConfirm({
                method,
                amountReceived: method === 'CASH' ? receivedNum : totalAmount,
                change: method === 'CASH' ? changeAmount : 0
            });
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
                        disabled={isSubmitting}
                        className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-100 transition"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Amount to Pay Container */}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center shadow-inner">
                        <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Total Amount</span>
                        <div className="text-4xl font-black text-blue-800 tracking-tight mt-1">{formatCurrency(totalAmount)}</div>
                    </div>

                    {/* Method Selector */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-3">Payment Method</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setMethod('CASH')}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${method === 'CASH' ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-slate-100 bg-white hover:border-slate-200 text-slate-500'}`}
                            >
                                <Banknote size={28} className={method === 'CASH' ? 'text-blue-600 mb-2' : 'text-slate-400 mb-2'} />
                                <span className="font-bold text-sm">Cash</span>
                            </button>
                            <button
                                onClick={() => setMethod('CARD')}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${method === 'CARD' ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-slate-100 bg-white hover:border-slate-200 text-slate-500'}`}
                            >
                                <CreditCard size={28} className={method === 'CARD' ? 'text-blue-600 mb-2' : 'text-slate-400 mb-2'} />
                                <span className="font-bold text-sm">Credit Card</span>
                            </button>
                        </div>
                    </div>

                    {/* Cash Input Details */}
                    {method === 'CASH' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <h3 className="text-sm font-bold text-slate-700 mb-3">Cash Received</h3>
                            <div className="relative mb-3">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">Rs.</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={cashReceived}
                                    onChange={(e) => setCashReceived(e.target.value)}
                                    placeholder="Enter amount..."
                                    className="w-full pl-12 pr-4 py-4 text-xl font-bold rounded-xl border-2 border-slate-200 focus:border-blue-600 focus:ring-0 outline-none transition-colors"
                                />
                            </div>

                            {/* Quick Cash Options */}
                            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                                {quickCashOptions.map((opt, i) => (
                                    <button
                                        key={opt}
                                        onClick={() => setCashReceived(opt.toString())}
                                        className="shrink-0 px-4 py-2 border border-slate-200 rounded-full text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 hover:border-blue-200 transition-colors"
                                    >
                                        {i === 0 ? 'Exact Amount' : `Rs. ${opt}`}
                                    </button>
                                ))}
                            </div>

                            {/* Change Container */}
                            <div className={`p-4 rounded-xl border flex justify-between items-center transition-colors ${receivedNum >= totalAmount ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                                <span className={`font-semibold ${receivedNum >= totalAmount ? 'text-emerald-700' : 'text-slate-500'}`}>Change Due</span>
                                <span className={`text-xl font-black ${receivedNum >= totalAmount ? 'text-emerald-600' : 'text-slate-800'}`}>
                                    {formatCurrency(changeAmount)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-6 pt-0">
                    <button
                        onClick={handleConfirm}
                        disabled={isSubmitting || (method === 'CASH' && receivedNum < totalAmount)}
                        className={`w-full py-4 rounded-xl font-black text-lg tracking-wide transition-all shadow-md flex items-center justify-center gap-2
                            ${isSubmitting || (method === 'CASH' && receivedNum < totalAmount)
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
