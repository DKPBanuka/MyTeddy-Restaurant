import { useState, useEffect, useRef, useCallback } from 'react';
import { ShoppingCart, Trash2, Layers, Archive, History as HistoryIcon, Plus, User2, Phone, Star, X as XIcon } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import type { OrderItemDto } from '../types';
import { ProductType } from '../types';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { api } from '../api';

interface CartProps {
    onCheckout: () => void;
    isSubmitting: boolean;
    generatedToken: string | null;
    discount?: number;
    discountPercentage?: number;
    onViewHeldOrders: () => void;
    onEdit: (item: OrderItemDto) => void;
    alreadyPaidIds?: Set<string>;
    totalPaid?: number | string;
    remainingBalance?: number | string;
    orderTotal?: number | string;
}

export function Cart({
    onCheckout,
    isSubmitting,
    generatedToken,
    discount = 0,
    discountPercentage,
    onViewHeldOrders,
    onEdit,
    alreadyPaidIds = new Set(),
    totalPaid = 0,
    remainingBalance = 0,
    orderTotal
}: CartProps) {
    const { settings } = useSettings();
    const {
        items, orderType, orderMetadata, setOrderMetadata,
        removeItem, updateQty, clearCart, holdOrder, heldOrders
    } = useCart();

    const [customerResults, setCustomerResults] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [searching, setSearching] = useState(false);
    const [linkedCustomer, setLinkedCustomer] = useState<any | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchTimeout = useRef<any>(null);

    const subTotal = items.reduce((sum, item) => {
        const basePrice = item.size ? Number(item.size.price) : Number(item.product?.price || item.package?.price || 0);
        const addonsPrice = item.selectedAddons?.reduce((s, a) => s + Number(a.price), 0) || 0;
        return sum + (basePrice + addonsPrice) * item.quantity;
    }, 0);

    const taxRate = settings?.taxRate || 0;
    const tax = subTotal * (taxRate / 100);
    const calculatedTotal = Math.max(0, subTotal + tax - discount);
    const displayTotal = orderTotal !== undefined && orderTotal !== null ? Number(orderTotal) : calculatedTotal;

    const handleHoldClick = () => {
        const ref = window.prompt("Enter a reference name for this order (e.g., 'Guy in red shirt')", `Order ${heldOrders.length + 1}`);
        if (ref) holdOrder(ref);
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Search customers when name changes
    const handleNameChange = useCallback((value: string) => {
        setOrderMetadata(prev => ({ ...prev, customerName: value }));
        setLinkedCustomer(null); // unlink if user edits manually

        clearTimeout(searchTimeout.current);
        if (value.trim().length < 1) {
            setCustomerResults([]);
            setShowDropdown(false);
            return;
        }
        setSearching(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                const all = await api.getCustomers();
                const filtered = all.filter((c: any) =>
                    c.name.toLowerCase().includes(value.toLowerCase()) ||
                    (c.phone && c.phone.includes(value))
                );
                setCustomerResults(filtered);
                setShowDropdown(filtered.length > 0);
            } catch {
                setCustomerResults([]);
            } finally {
                setSearching(false);
            }
        }, 250);
    }, [setOrderMetadata]);

    const handleSelectCustomer = (customer: any) => {
        setOrderMetadata(prev => ({
            ...prev,
            customerName: customer.name,
            customerPhone: customer.phone || '',
            customerId: customer.id
		}));
        setLinkedCustomer(customer);
        setCustomerResults([]);
        setShowDropdown(false);
    };

    const handleUnlinkCustomer = () => {
        setLinkedCustomer(null);
        setOrderMetadata(prev => ({ 
            ...prev, 
            customerName: '', 
            customerPhone: '',
            customerId: undefined 
        }));
    };

    const CustomerNameInput = (inputClass: string) => (
        <div className="relative" ref={dropdownRef}>
            {linkedCustomer ? (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">
                            {linkedCustomer.name.charAt(0)}
                        </div>
                        <div>
                            <div className="text-xs font-black text-blue-800 leading-tight">{linkedCustomer.name}</div>
                            <div className="flex items-center gap-1 text-[10px] text-amber-600 font-black">
                                <Star size={9} className="fill-current" />
                                {linkedCustomer.points} pts
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleUnlinkCustomer}
                        className="text-blue-400 hover:text-red-500 transition-colors"
                    >
                        <XIcon size={14} />
                    </button>
                </div>
            ) : (
                <>
                    <div className="relative">
                        <User2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Customer Name"
                            value={orderMetadata.customerName}
                            onChange={(e) => handleNameChange(e.target.value)}
                            onFocus={() => {
                                if (customerResults.length > 0) setShowDropdown(true);
                            }}
                            className={inputClass}
                            autoComplete="off"
                        />
                    </div>
                    {showDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                            {searching ? (
                                <div className="px-4 py-3 text-xs text-slate-400 text-center">Searching...</div>
                            ) : customerResults.map((c: any) => (
                                <button
                                    key={c.id}
                                    onMouseDown={(e) => { e.preventDefault(); handleSelectCustomer(c); }}
                                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center justify-between border-b border-slate-50 last:border-0 group"
                                >
                                    <div>
                                        <div className="font-bold text-slate-800 text-xs group-hover:text-blue-600 transition-colors">{c.name}</div>
                                        <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                            <Phone size={9} />
                                            {c.phone || 'No phone'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 text-amber-700 px-2 py-0.5 rounded-lg text-[10px] font-black">
                                        <Star size={9} className="fill-current" />
                                        {c.points}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );

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
                        {heldOrders.length > 0 && (
                            <button
                                onClick={onViewHeldOrders}
                                className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse"
                            >
                                <HistoryIcon size={12} />
                                {heldOrders.length} Held
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {items.length > 0 && (
                            <>
                                <button
                                    onClick={handleHoldClick}
                                    className="p-2 text-slate-400 hover:text-blue-500 bg-slate-50 hover:bg-blue-50 rounded-xl transition-all"
                                    title="Hold Order"
                                >
                                    <Archive size={18} />
                                </button>
                                <button
                                    onClick={clearCart}
                                    className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-xl transition-all"
                                    title="Clear Cart"
                                >
                                    <Trash2 size={18} strokeWidth={2} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Metadata Inputs */}
                <div className="space-y-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {orderType === 'DINE_IN' ? 'Table Details' : orderType === 'TAKEAWAY' ? 'Customer Details' : 'Delivery Details'}
                    </div>

                    {orderType === 'DINE_IN' && (
                        <div className="space-y-2">
                            <input
                                type="text"
                                placeholder="Table Number (e.g., T-12)"
                                value={orderMetadata.tableNo}
                                onChange={(e) => setOrderMetadata(prev => ({ ...prev, tableNo: e.target.value }))}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                {CustomerNameInput('w-full pl-8 pr-3 bg-white border border-slate-200 rounded-xl py-1.5 text-[11px] font-semibold text-slate-800 focus:outline-none focus:border-blue-400 placeholder:text-slate-400')}
                                <div className="relative">
                                    <Phone size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                                    <input
                                        type="tel"
                                        placeholder="Phone (Optional)"
                                        value={orderMetadata.customerPhone}
                                        onChange={(e) => setOrderMetadata(prev => ({ ...prev, customerPhone: e.target.value }))}
                                        className="w-full pl-7 pr-3 bg-white border border-slate-200 rounded-xl py-1.5 text-[11px] font-semibold text-slate-800 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {(orderType === 'TAKEAWAY' || orderType === 'DELIVERY') && (
                        <div className="grid grid-cols-2 gap-2">
                            {CustomerNameInput('w-full pl-8 pr-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400')}
                            <div className="relative">
                                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                                <input
                                    type="tel"
                                    placeholder="Phone"
                                    value={orderMetadata.customerPhone}
                                    onChange={(e) => setOrderMetadata(prev => ({ ...prev, customerPhone: e.target.value }))}
                                    className="w-full pl-8 pr-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400"
                                />
                            </div>
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
                        {items.map((item, index) => {
                            const isPaid = item.id && alreadyPaidIds.has(item.id);
                            return (
                                <div key={`${item.productId || item.packageId}-${index}`} className={`flex items-start justify-between group transition-all ${isPaid ? 'opacity-80' : ''}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 shadow-sm overflow-hidden relative ${item.packageId ? 'bg-blue-50 text-blue-200' : item.product?.type === ProductType.RETAIL ? 'bg-indigo-50 text-indigo-200' : 'bg-orange-50 text-orange-200'}`}>
                                            <div className="w-10 h-10 bg-white rounded-lg shadow-sm border border-slate-50 flex items-center justify-center">
                                                {item.packageId ? (
                                                    <Layers size={16} className="text-blue-500" />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-slate-200"></div>
                                                )}
                                            </div>
                                            {isPaid && (
                                                <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                                                    <div className="bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                                                        <Plus size={10} className="rotate-45" strokeWidth={4} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col flex-1 pl-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={`font-bold text-sm leading-tight line-clamp-1 pt-1 ${isPaid ? 'text-slate-400' : 'text-slate-800'}`}>
                                                            {item.product?.name || item.package?.name}
                                                        </h4>
                                                        {isPaid && (
                                                            <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">PAID</span>
                                                        )}
                                                    </div>
                                                    {item.package && item.package.items && (
                                                        <div className="text-[10px] font-bold text-slate-500 mt-1 leading-relaxed bg-slate-50 p-1.5 rounded-lg border border-slate-100 italic">
                                                            Includes: {item.package.items.map((it: any) => `${it.quantity}x ${it.product?.name}${it.size ? ` (${it.size.name})` : ''}`).join(', ')}
                                                        </div>
                                                    )}
                                                    {item.size && (
                                                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">
                                                            Size: {item.size.name}
                                                        </div>
                                                    )}
                                                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                                                        <div className="text-[10px] font-bold text-emerald-600 mt-0.5 ml-1">
                                                            {Object.values(item.selectedAddons.reduce((acc: any, addon: any) => {
                                                                if (!acc[addon.id]) acc[addon.id] = { name: addon.name, count: 0 };
                                                                acc[addon.id].count++;
                                                                return acc;
                                                            }, {})).map((a: any) => (
                                                                <div key={a.name}>+ {a.count > 1 ? `${a.count}x ` : ''}{a.name}</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {!item.packageId && !isPaid && (
                                                        <button
                                                            onClick={() => onEdit(item)}
                                                            className="flex items-center gap-1 text-[10px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-widest mt-2 bg-blue-50 px-2 py-1 rounded-md transition-colors"
                                                        >
                                                            <Plus size={10} strokeWidth={3} />
                                                            Add-ons / Sizes
                                                        </button>
                                                    )}
                                                </div>
                                                <span className={`text-sm font-black tracking-tight shrink-0 ml-2 ${isPaid ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                    {formatCurrency(((item.size ? Number(item.size.price) : Number(item.product?.price || item.package?.price || 0)) + (item.selectedAddons?.reduce((s: number, a: any) => s + Number(a.price), 0) || 0)) * item.quantity, settings?.currencySymbol || 'Rs.')}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    {item.quantity}x
                                                </span>
                                                {!isPaid && (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                                                        <button onClick={() => updateQty(index, -1)} className="w-6 h-6 rounded bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 font-bold leading-none">-</button>
                                                        <button onClick={() => updateQty(index, 1)} className="w-6 h-6 rounded bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 font-bold leading-none">+</button>
                                                        <button onClick={() => removeItem(index)} className="w-6 h-6 rounded bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 ml-1">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer Summary & Payment */}
            <div className="p-6 pt-0 bg-white shrink-0 mt-auto">
                <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800">Payment Summary</h3>
                        <button
                            onClick={onViewHeldOrders}
                            className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest underline"
                        >
                            Held Orders
                        </button>
                    </div>

                    <div className="space-y-3 mb-4">
                        {taxRate > 0 ? (
                            <>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Sub Total</span>
                                    <span className="font-bold text-slate-800">{formatCurrency(subTotal, settings?.currencySymbol || 'Rs.')}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Tax ({taxRate}%)</span>
                                    <span className="font-bold text-slate-800">{formatCurrency(tax, settings?.currencySymbol || 'Rs.')}</span>
                                </div>
                            </>
                        ) : null}
                        {discount > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-emerald-600 font-medium">Discount{discountPercentage ? ` (${discountPercentage}%)` : ''}</span>
                                <span className="font-bold text-emerald-600">-{formatCurrency(discount, settings?.currencySymbol || 'Rs.')}</span>
                            </div>
                        )}
                    </div>

                    {taxRate > 0 && <div className="h-px w-full border-t border-dashed border-slate-200 my-4"></div>}

                    <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-500 font-medium">{(taxRate > 0 || discount > 0) ? 'Grand Total' : 'Total Payable'}</span>
                        <span className={`text-lg font-black ${Number(totalPaid) > 0 ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'}`}>
                            {formatCurrency(displayTotal, settings?.currencySymbol || 'Rs.')}
                        </span>
                    </div>

                    {Number(totalPaid) > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 mt-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-emerald-600 font-bold uppercase tracking-wider text-[10px]">Total Paid</span>
                                <span className="font-black text-emerald-600">{formatCurrency(totalPaid, settings?.currencySymbol || 'Rs.')}</span>
                            </div>
                            
                            {Number(remainingBalance) > 0 ? (
                                <div className="flex justify-between items-center bg-blue-600 text-white p-3 rounded-xl shadow-md animate-pulse">
                                    <span className="font-black uppercase tracking-[0.2em] text-[10px]">Balance Due</span>
                                    <span className="text-xl font-black">{formatCurrency(remainingBalance, settings?.currencySymbol || 'Rs.')}</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 p-2 rounded-xl border border-emerald-100 mt-1">
                                    <Star size={12} className="fill-current" />
                                    <span className="font-black uppercase tracking-widest text-[10px]">Fully Settled</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-6">
                        <button
                            onClick={onCheckout}
                            disabled={items.length === 0 || isSubmitting}
                            className={`w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all duration-200 shadow-md ${items.length === 0 || isSubmitting
                                ? 'bg-emerald-300 text-white/80 cursor-not-allowed shadow-none'
                                : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-lg active:scale-[0.98]'
                                }`}
                        >
                            {isSubmitting ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                </div>
                            ) : (
                                'Complete & Pay'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
