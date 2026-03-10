import { ShoppingCart, Trash } from 'lucide-react';
import type { OrderItemDto, OrderType } from '../types';
import { ProductType } from '../types';

interface CartProps {
    items: OrderItemDto[];
    onUpdateQty: (productId: string, delta: number) => void;
    onRemove: (productId: string) => void;
    onClearCart: () => void;
    onCheckout: () => void;
    onSendToKDS: () => void;
    isSubmitting: boolean;
    hasActiveOrder?: boolean;
    orderType: OrderType;
    orderMetadata: {
        tableNo: string;
        customerName: string;
        customerPhone: string;
        deliveryAddress: string;
    };
    setOrderMetadata: React.Dispatch<React.SetStateAction<{
        tableNo: string;
        customerName: string;
        customerPhone: string;
        deliveryAddress: string;
    }>>;
    generatedToken: string | null;
    onUpdateItemNote: (productId: string, note: string) => void;
}

export function Cart({
    items,
    onUpdateQty,
    onClearCart,
    onCheckout,
    onSendToKDS,
    isSubmitting,
    hasActiveOrder,
    orderType,
    orderMetadata,
    setOrderMetadata,
    generatedToken,
    onUpdateItemNote
}: CartProps) {
    const subTotal = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
    const tax = subTotal * 0.04; // e.g. 4% tax based on Dribbble reference visuals
    const totalAmount = subTotal + tax;
    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="p-6 pb-2 flex flex-col gap-3 bg-white shrink-0 shadow-sm z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black text-slate-800">Invoice</h2>
                        {generatedToken && (
                            <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg font-black text-xl tracking-wider border-2 border-orange-200">
                                #{generatedToken}
                            </div>
                        )}
                    </div>
                    {items.length > 0 && (
                        <button
                            onClick={onClearCart}
                            className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-xl transition-all"
                            title="Clear Cart"
                        >
                            <Trash size={18} strokeWidth={2} />
                        </button>
                    )}
                </div>

                {/* Metadata Inputs */}
                <div className="space-y-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        {orderType === 'DINE_IN' ? 'Table Details' : orderType === 'TAKEAWAY' ? 'Customer Details' : 'Delivery Details'}
                    </div>

                    {orderType === 'DINE_IN' && (
                        <input
                            type="text"
                            placeholder="Table Number (e.g., T-12)"
                            value={orderMetadata.tableNo}
                            onChange={(e) => setOrderMetadata(prev => ({ ...prev, tableNo: e.target.value }))}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400"
                        />
                    )}

                    {(orderType === 'TAKEAWAY' || orderType === 'DELIVERY') && (
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                placeholder="Name"
                                value={orderMetadata.customerName}
                                onChange={(e) => setOrderMetadata(prev => ({ ...prev, customerName: e.target.value }))}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400"
                            />
                            <input
                                type="tel"
                                placeholder="Phone"
                                value={orderMetadata.customerPhone}
                                onChange={(e) => setOrderMetadata(prev => ({ ...prev, customerPhone: e.target.value }))}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400"
                            />
                        </div>
                    )}

                    {orderType === 'DELIVERY' && (
                        <input
                            type="text"
                            placeholder="Full Delivery Address"
                            value={orderMetadata.deliveryAddress}
                            onChange={(e) => setOrderMetadata(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400"
                        />
                    )}
                </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 scroll-smooth">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                        <ShoppingCart size={48} className="text-slate-200" strokeWidth={1.5} />
                        <p className="font-medium text-sm">Your order list is empty</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {items.map((item) => (
                            <div key={item.productId} className="flex items-start justify-between group">
                                <div className="flex items-center gap-3">
                                    {/* Thumbnail Image Placeholder */}
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 shadow-sm overflow-hidden ${item.product.type === ProductType.RETAIL ? 'bg-indigo-50 text-indigo-200' : 'bg-orange-50 text-orange-200'}`}>
                                        <div className="w-10 h-10 bg-white rounded-lg shadow-sm border border-slate-50 flex items-center justify-center">
                                            {/* Dummy Image representing food */}
                                            <div className="w-6 h-6 rounded-full bg-slate-200"></div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col flex-1 pl-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-slate-800 text-sm leading-tight line-clamp-1 py-1">{item.product.name}</h4>
                                            <span className="text-sm font-black text-slate-800 tracking-tight shrink-0 ml-2">
                                                ${(Number(item.product.price) * item.quantity).toFixed(1)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                                                {item.quantity}x
                                            </span>
                                            {/* Quantity Adjusters */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => onUpdateQty(item.productId, -1)} className="w-6 h-6 rounded bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 font-bold leading-none">-</button>
                                                <button onClick={() => onUpdateQty(item.productId, 1)} className="w-6 h-6 rounded bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 font-bold leading-none">+</button>
                                            </div>
                                        </div>

                                        {/* Notes Input (FOOD ONLY) */}
                                        {item.product.type === ProductType.FOOD && (
                                            <input
                                                type="text"
                                                placeholder="Special instructions..."
                                                value={item.notes || ''}
                                                onChange={(e) => onUpdateItemNote(item.productId, e.target.value)}
                                                className="mt-2 w-full text-xs bg-red-50/50 border border-red-100 text-red-700 placeholder:text-red-300 rounded px-2 py-1.5 focus:outline-none focus:border-red-300 focus:bg-red-50 transition-colors"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Summary & Payment */}
            <div className="p-6 pt-0 bg-white shrink-0 mt-auto">
                <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                    <h3 className="font-bold text-slate-800 mb-4">Payment Summary</h3>

                    <div className="space-y-3 mb-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Sub Total</span>
                            <span className="font-bold text-slate-800">${subTotal.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Tax</span>
                            <span className="font-bold text-slate-800">${tax.toFixed(1)}</span>
                        </div>
                    </div>

                    <div className="h-px w-full border-t border-dashed border-slate-200 my-4"></div>

                    <div className="flex justify-between items-center mb-6">
                        <span className="text-slate-500 font-medium">Total Payment</span>
                        <span className="text-lg font-black text-slate-800">${totalAmount.toFixed(1)}</span>
                    </div>

                    {/* Payment Toggles */}
                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={onSendToKDS}
                            disabled={items.length === 0 || isSubmitting}
                            className={`flex-1 py-4 rounded-2xl font-black text-sm tracking-wide transition-all duration-200 shadow-md ${items.length === 0 || isSubmitting
                                ? 'bg-orange-300 text-white/80 cursor-not-allowed shadow-none'
                                : 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-lg active:scale-[0.98]'
                                }`}
                        >
                            {isSubmitting ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                </div>
                            ) : (
                                hasActiveOrder ? 'Update Order' : 'Send to KDS'
                            )}
                        </button>

                        <button
                            onClick={onCheckout}
                            disabled={items.length === 0 || isSubmitting}
                            className={`flex-1 py-4 rounded-2xl font-black text-sm tracking-wide transition-all duration-200 shadow-md ${items.length === 0 || isSubmitting
                                ? 'bg-emerald-300 text-white/80 cursor-not-allowed shadow-none'
                                : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-lg active:scale-[0.98]'
                                }`}
                        >
                            {isSubmitting ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                </div>
                            ) : (
                                'Pay'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
