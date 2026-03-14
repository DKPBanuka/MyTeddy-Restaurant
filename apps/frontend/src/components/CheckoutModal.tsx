import React, { useState, useEffect } from 'react';
import { X, CreditCard, Banknote } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { generatePDFReceipt } from '../utils/pdfReceipt';


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
    }) => Promise<any>;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
    isOpen,
    onClose,
    totalAmount,
    initialMethod = 'CARD',
    onConfirm
}) => {
    const [method, setMethod] = useState<'CARD' | 'CASH' | 'ONLINE'>(initialMethod as any);
    const [cashReceived, setCashReceived] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [createdOrder, setCreatedOrder] = useState<any>(null);

    // Discount State
    const [discountValue, setDiscountValue] = useState<string>('0');
    const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');

    // Sync initial method when modal opens
    useEffect(() => {
        if (isOpen) {
            setMethod(initialMethod as any);
            setIsSuccess(false);
            setCreatedOrder(null);
            setDiscountValue('0');
            setDiscountType('FIXED');
            if (initialMethod !== 'CASH') {
                setCashReceived('');
            }
        }
    }, [isOpen, initialMethod]);

    if (!isOpen) return null;

    // Discount Calculations
    const discountValNum = parseFloat(discountValue || '0');
    let totalDiscount = 0;
    if (discountType === 'PERCENTAGE') {
        totalDiscount = (totalAmount * discountValNum) / 100;
    } else {
        totalDiscount = discountValNum;
    }

    const finalGrandTotal = Math.max(0, totalAmount - totalDiscount);
    const receivedNum = parseFloat(cashReceived || '0');
    const changeAmount = Math.max(0, receivedNum - finalGrandTotal);

    const handleConfirm = async () => {
        if (method === 'CASH' && receivedNum < finalGrandTotal) {
            return;
        }

        try {
            setIsSubmitting(true);
            const order = await onConfirm({
                method,
                amountReceived: method === 'CASH' ? receivedNum : finalGrandTotal,
                change: method === 'CASH' ? changeAmount : 0,
                subTotal: totalAmount,
                discount: totalDiscount,
                grandTotal: finalGrandTotal
            });
            setCreatedOrder(order);
            setIsSuccess(true);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrint = () => {
        if (createdOrder) {
            generatePDFReceipt(createdOrder, createdOrder.invoiceNumber || createdOrder.id);
        }
    };

    if (isSuccess) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                    <div className="p-8 text-center">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">✓</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2">Payment Successful!</h2>
                        <p className="text-slate-500 mb-8">
                            Order <strong>#{createdOrder?.invoiceNumber || createdOrder?.id?.slice(0, 8)}</strong> has been processed.
                        </p>
                        
                        <div className="space-y-3">
                            <button
                                onClick={handlePrint}
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                            >
                                ⎙ Print Receipt
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Amount to Pay Container */}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center shadow-inner">
                        <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Sub Total</span>
                        <div className="text-2xl font-black text-blue-400 tracking-tight mt-1 line-through opacity-50">{formatCurrency(totalAmount)}</div>
                        <div className="text-4xl font-black text-blue-800 tracking-tight mt-1">{formatCurrency(finalGrandTotal)}</div>
                    </div>

                    {/* Discount Section */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">Add Discount</h3>
                            <div className="flex bg-white border border-slate-200 rounded-lg p-1 overflow-hidden">
                                <button
                                    onClick={() => setDiscountType('FIXED')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${discountType === 'FIXED' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                >
                                    Rs
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
                                {discountType === 'FIXED' ? 'Rs.' : '%'}
                            </span>
                            <input
                                type="number"
                                min="0"
                                value={discountValue}
                                onChange={(e) => setDiscountValue(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-blue-600 outline-none transition-all"
                                placeholder="0"
                            />
                        </div>
                        
                        {totalDiscount > 0 && (
                            <div className="flex justify-between items-center text-xs font-bold text-emerald-600">
                                <span>Discount Amount:</span>
                                <span>-{formatCurrency(totalDiscount)}</span>
                            </div>
                        )}
                    </div>

                    {/* Method Selector */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-tight">Payment Method</h3>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setMethod('CASH')}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${method === 'CASH' ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-slate-100 bg-white hover:border-slate-200 text-slate-500'}`}
                            >
                                <Banknote size={24} className={method === 'CASH' ? 'text-blue-600 mb-2' : 'text-slate-400 mb-2'} />
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

                            <div className={`p-4 rounded-xl border flex justify-between items-center transition-colors ${receivedNum >= finalGrandTotal ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                                <span className={`font-semibold ${receivedNum >= finalGrandTotal ? 'text-emerald-700' : 'text-slate-500'}`}>Change Due</span>
                                <span className={`text-xl font-black ${receivedNum >= finalGrandTotal ? 'text-emerald-600' : 'text-slate-800'}`}>
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
