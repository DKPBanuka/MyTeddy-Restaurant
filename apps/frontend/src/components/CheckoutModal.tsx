import React, { useState, useEffect } from 'react';
import { X, QrCode, Banknote, CheckSquare, Square, Layers, Plus, Globe } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency } from '../utils/format';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number | string;
    items?: any[];
    existingPayments?: any[];
    initialMethod?: 'QR' | 'CASH' | 'ONLINE';
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
    onSplitConfirm?: (splitDetails: {
        paymentMethod: string;
        amount: number;
        paidItemIds: string[];
    }) => Promise<any>;
    customerId?: string;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
    isOpen,
    onClose,
    totalAmount,
    items,
    existingPayments,
    initialMethod = 'QR',
    onConfirm,
    onSplitConfirm,
    customerId
}) => {
    const { settings } = useSettings();
    const [mode, setMode] = useState<'FULL' | 'SPLIT'>('FULL');
    const [splitSubMode, setSplitSubMode] = useState<'EQUAL' | 'ITEMS' | 'CUSTOM'>('ITEMS');
    const [splitPeopleCount, setSplitPeopleCount] = useState<number>(2);
    const [method, setMethod] = useState<'QR' | 'CASH' | 'ONLINE'>(initialMethod as any);
    const [cashReceived, setCashReceived] = useState<string>('');
    const [customSplitAmount, setCustomSplitAmount] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [discountValue, setDiscountValue] = useState<string>('0');
    const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

    // Already paid items
    const alreadyPaidIds = new Set<string>();
    existingPayments?.forEach(p => {
        if (p.paidItemIds && Array.isArray(p.paidItemIds)) {
            p.paidItemIds.forEach((id: string) => alreadyPaidIds.add(id));
        }
    });

    useEffect(() => {
        if (isOpen) {
            setMode('FULL');
            setMethod(initialMethod as any);
            setCashReceived('');
            setDiscountValue('0');
            setDiscountType('FIXED');
            setSelectedItemIds(new Set());
        }
    }, [isOpen, initialMethod]);

    if (!isOpen) return null;

    const discountNum = parseFloat(discountValue || '0');
    const totalDiscount = discountType === 'PERCENTAGE' 
        ? ((Number(totalAmount) || 0) * discountNum / 100) 
        : discountNum;

    const splitTotalItems = items?.filter(item => selectedItemIds.has(item.id))
               .reduce((sum, item) => {
                   const unitPrice = Number(item.unitPrice || item.priceAtTimeOfSale || 0);
                   const qty = Number(item.quantity || 1);
                   return sum + (unitPrice * qty);
               }, 0) || 0;

    const remainingToPay = Math.max(0, (Number(totalAmount) || 0) - (existingPayments?.reduce((s, p) => s + Number(p.amount), 0) || 0));

    const getDynamicSplitTotal = () => {
        if (splitSubMode === 'ITEMS') return splitTotalItems;
        if (splitSubMode === 'EQUAL') return remainingToPay / splitPeopleCount;
        if (splitSubMode === 'CUSTOM') return parseFloat(customSplitAmount) || 0;
        return 0;
    };

    const currentTotalToPay = mode === 'FULL' ? Math.max(0, (Number(totalAmount) || 0) - totalDiscount) : getDynamicSplitTotal();
    const receivedNum = parseFloat(cashReceived || '0');
    const changeAmount = Math.max(0, receivedNum - currentTotalToPay);

    const isAmountValid = method !== 'CASH' || receivedNum >= currentTotalToPay;

    const handleToggleItem = (id: string) => {
        if (alreadyPaidIds.has(id)) return;
        const newSelected = new Set(selectedItemIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedItemIds(newSelected);
    };

    const handleConfirm = async () => {
        if (method === 'CASH' && receivedNum < currentTotalToPay && mode === 'FULL') return;
        if (mode === 'SPLIT' && currentTotalToPay === 0) return;

        try {
            setIsSubmitting(true);
            if (mode === 'FULL') {
                await onConfirm({
                    method,
                    amountReceived: method === 'CASH' ? receivedNum : currentTotalToPay,
                    change: method === 'CASH' ? changeAmount : 0,
                    subTotal: Number(totalAmount),
                    discount: totalDiscount,
                    grandTotal: currentTotalToPay,
                    discountPercentage: discountType === 'PERCENTAGE' ? Number(discountValue) : undefined,
                    customerId: customerId, // Pass customerId for loyalty points
                });
                onClose();
            } else if (onSplitConfirm) {
                await onSplitConfirm({
                    paymentMethod: method,
                    amount: currentTotalToPay,
                    paidItemIds: splitSubMode === 'ITEMS' ? Array.from(selectedItemIds) : [],
                    mode: splitSubMode
                } as any);
                setSelectedItemIds(new Set()); // Reset selection for next payment
                setCustomSplitAmount('');
            }
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

                <div className="p-6 pb-0 space-y-4">
                    {/* Mode Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-2xl">
                        <button
                            onClick={() => setMode('FULL')}
                            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'FULL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <QrCode size={16} />
                            Full Payment
                        </button>
                        <button
                            onClick={() => setMode('SPLIT')}
                            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'SPLIT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Layers size={16} />
                            Split Bill
                        </button>
                    </div>

                    {/* Amount Display */}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center shadow-inner">
                        <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
                            {mode === 'FULL' ? (totalDiscount > 0 ? 'Sub Total' : 'Total to Pay') : 'Split Total'}
                        </span>
                        {mode === 'FULL' && totalDiscount > 0 && (
                            <div className="text-2xl font-black text-blue-400 tracking-tight mt-1 line-through opacity-50">
                                {formatCurrency(totalAmount, settings?.currencySymbol || 'Rs.')}
                            </div>
                        )}
                        <div className="text-4xl font-black text-blue-800 tracking-tight mt-1">
                            {formatCurrency(currentTotalToPay, settings?.currencySymbol || 'Rs.')}
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6 max-h-[50vh] overflow-y-auto">

                    {/* Items Selection for Split Bill */}
                    {mode === 'SPLIT' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                             {/* Split Method Selector */}
                             <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                <button 
                                    onClick={() => setSplitSubMode('ITEMS')}
                                    className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 ${splitSubMode === 'ITEMS' ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Layers size={14} />
                                    By Items
                                </button>
                                <button 
                                    onClick={() => setSplitSubMode('EQUAL')}
                                    className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 ${splitSubMode === 'EQUAL' ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Plus size={14} />
                                    Equal Split
                                </button>
                                <button 
                                    onClick={() => setSplitSubMode('CUSTOM')}
                                    className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 ${splitSubMode === 'CUSTOM' ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <QrCode size={14} />
                                    Custom Amt
                                </button>
                             </div>

                             {splitSubMode === 'ITEMS' && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight flex justify-between">
                                        <span>Select Items</span>
                                        <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{selectedItemIds.size} Selected</span>
                                    </h3>
                                    <div className="space-y-2 border border-slate-100 rounded-2xl p-2 max-h-[30vh] overflow-y-auto bg-slate-50/30">
                                        {items?.map((item) => {
                                            const isPaid = alreadyPaidIds.has(item.id);
                                            const isSelected = selectedItemIds.has(item.id);
                                            const itemSubtotal = (Number(item.unitPrice || item.priceAtTimeOfSale || 0) * Number(item.quantity || 1));
                                            
                                            return (
                                                <button
                                                    key={item.id}
                                                    disabled={isPaid}
                                                    onClick={() => handleToggleItem(item.id)}
                                                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                                                        isPaid 
                                                            ? 'bg-slate-50 border-slate-100 opacity-50 grayscale cursor-not-allowed' 
                                                            : isSelected
                                                                ? 'bg-blue-50 border-blue-200 shadow-sm'
                                                                : 'bg-white border-slate-100 hover:border-slate-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {isPaid ? (
                                                            <div className="text-emerald-600 bg-emerald-50 p-1 rounded-md">
                                                                <Plus size={14} className="rotate-45" strokeWidth={4} />
                                                            </div>
                                                        ) : isSelected ? (
                                                            <div className="text-blue-600">
                                                                <CheckSquare size={20} />
                                                            </div>
                                                        ) : (
                                                            <div className="text-slate-300">
                                                                <Square size={20} />
                                                            </div>
                                                        )}
                                                        <div className="text-left">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`text-sm font-bold ${isPaid ? 'text-slate-400' : 'text-slate-700'}`}>{item.product?.name || item.package?.name || 'Item'}</div>
                                                                {isPaid && <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">PAID</span>}
                                                            </div>
                                                            <div className="text-[10px] font-bold text-slate-400">Qty: {item.quantity} {item.size?.name ? `(${item.size.name})` : ''}</div>
                                                        </div>
                                                    </div>
                                                    <div className={`font-black text-sm ${isPaid ? 'text-emerald-600' : 'text-slate-800'}`}>
                                                        {isPaid ? 'PAID' : formatCurrency(itemSubtotal, settings?.currencySymbol || 'Rs.')}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                             )}

                             {splitSubMode === 'EQUAL' && (
                                <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                                     <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">Split Equally By</h3>
                                     <div className="flex items-center gap-4">
                                        <button 
                                            onClick={() => setSplitPeopleCount(Math.max(2, splitPeopleCount - 1))}
                                            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:border-blue-300"
                                        >
                                            -
                                        </button>
                                        <div className="flex-1 text-center bg-white border-2 border-blue-100 rounded-xl py-2">
                                            <span className="text-2xl font-black text-blue-600">{splitPeopleCount}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">People</span>
                                        </div>
                                        <button 
                                            onClick={() => setSplitPeopleCount(splitPeopleCount + 1)}
                                            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:border-blue-300"
                                        >
                                            +
                                        </button>
                                     </div>
                                     <div className="text-center">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Each Person Pays</span>
                                        <div className="text-xl font-black text-slate-800">
                                            {formatCurrency(remainingToPay / splitPeopleCount, settings?.currencySymbol || 'Rs.')}
                                        </div>
                                     </div>
                                </div>
                             )}

                             {splitSubMode === 'CUSTOM' && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">Enter Custom Amount</h3>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">
                                            {settings?.currencySymbol || 'Rs.'}
                                        </span>
                                        <input
                                            type="number"
                                            value={customSplitAmount}
                                            onChange={(e) => setCustomSplitAmount(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 text-2xl font-black rounded-2xl border-2 border-slate-200 focus:border-blue-600 outline-none transition-all"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="text-xs font-bold text-slate-400 flex justify-between">
                                        <span>Remaining to settle:</span>
                                        <span>{formatCurrency(remainingToPay, settings?.currencySymbol || 'Rs.')}</span>
                                    </div>
                                </div>
                             )}
                        </div>
                    )}

                    {/* Discount Section - Only in Full Mode */}
                    {mode === 'FULL' && (
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
                    )}

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
                                onClick={() => setMethod('QR')}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${method === 'QR' ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-slate-100 bg-white hover:border-slate-200 text-slate-500'}`}
                            >
                                <QrCode size={24} className={method === 'QR' ? 'text-blue-600 mb-2' : 'text-slate-400 mb-2'} />
                                <span className="font-bold text-xs uppercase tracking-tight">QR</span>
                            </button>
                            <button
                                onClick={() => setMethod('ONLINE')}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${method === 'ONLINE' ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-slate-100 bg-white hover:border-slate-200 text-slate-500'}`}
                            >
                                <Globe size={24} className={method === 'ONLINE' ? 'text-blue-600 mb-2' : 'text-slate-400 mb-2'} />
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

                            <div className={`p-4 rounded-xl border flex justify-between items-center transition-colors ${receivedNum >= currentTotalToPay ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                                <span className={`font-semibold ${receivedNum >= currentTotalToPay ? 'text-emerald-700' : 'text-slate-500'}`}>Change Due</span>
                                <span className={`text-xl font-black ${receivedNum >= currentTotalToPay ? 'text-emerald-600' : 'text-slate-800'}`}>
                                    {formatCurrency(changeAmount, settings?.currencySymbol || 'Rs.')}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 pt-0">
                    <button
                        onClick={handleConfirm}
                        disabled={isSubmitting || !isAmountValid || (mode === 'SPLIT' && currentTotalToPay <= 0)}
                        className={`w-full py-4 rounded-xl font-black text-lg tracking-wide transition-all shadow-md flex items-center justify-center gap-2
                            ${isSubmitting || !isAmountValid || (mode === 'SPLIT' && currentTotalToPay <= 0)
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
