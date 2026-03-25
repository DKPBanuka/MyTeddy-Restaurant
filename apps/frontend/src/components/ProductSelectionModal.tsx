import { useState } from 'react';
import type { Product, ProductSize, GlobalAddon } from '../types';
import { X, Check, ShoppingBag, Search } from 'lucide-react';

interface ProductSelectionModalProps {
    product: Product;
    globalAddons: GlobalAddon[];
    onClose: () => void;
    onConfirm: (size?: ProductSize, selectedAddons?: GlobalAddon[]) => void;
    initialSize?: ProductSize;
    initialAddons?: GlobalAddon[];
}

export function ProductSelectionModal({ 
    product, 
    globalAddons, 
    onClose, 
    onConfirm,
    initialSize,
    initialAddons 
}: ProductSelectionModalProps) {
    const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>(
        initialSize || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined)
    );
    
    // Track addon quantities: { [addonId]: quantity }
    const [addonCounts, setAddonCounts] = useState<Record<string, number>>(() => {
        const counts: Record<string, number> = {};
        initialAddons?.forEach(a => {
            counts[a.id] = (counts[a.id] || 0) + 1;
        });
        return counts;
    });

    const [searchTerm, setSearchTerm] = useState('');

    const updateAddonCount = (addonId: string, delta: number) => {
        setAddonCounts(prev => {
            const newCount = Math.max(0, (prev[addonId] || 0) + delta);
            return { ...prev, [addonId]: newCount };
        });
    };

    const hasSizes = product.sizes && product.sizes.length > 0;
    const canConfirm = !hasSizes || selectedSize;

    // Calculate total addon price considering quantities
    const totalAddonsPrice = globalAddons.reduce((sum, a) => {
        const count = addonCounts[a.id] || 0;
        return sum + (Number(a.price) * count);
    }, 0);

    const totalPrice = (selectedSize ? Number(selectedSize.price) : Number(product.price)) + totalAddonsPrice;

    const filteredAddons = globalAddons.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleConfirm = () => {
        // Flatten addonCounts back into a GlobalAddon array (repeating items based on count)
        const flattenedAddons: GlobalAddon[] = [];
        Object.entries(addonCounts).forEach(([id, count]) => {
            const addon = globalAddons.find(a => a.id === id);
            if (addon && count > 0) {
                for (let i = 0; i < count; i++) {
                    flattenedAddons.push(addon);
                }
            }
        });
        onConfirm(selectedSize, flattenedAddons);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{product.name}</h2>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Customize your selection</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
                    {/* Sizes Section */}
                    {hasSizes && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">1</span>
                                Select Size <span className="text-red-500">*</span>
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {product.sizes?.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setSelectedSize(s)}
                                        className={`relative p-4 rounded-2xl border-2 text-left transition-all ${selectedSize?.id === s.id 
                                            ? 'border-blue-600 bg-blue-50/50 ring-4 ring-blue-50' 
                                            : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}
                                    >
                                        <div className="font-bold text-slate-800 text-sm">{s.name}</div>
                                        <div className="text-blue-600 font-black text-xs mt-1">Rs. {Number(s.price).toFixed(0)}</div>
                                        {selectedSize?.id === s.id && (
                                            <div className="absolute top-2 right-2 text-blue-600">
                                                <Check size={16} strokeWidth={3} />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Global Add-ons Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 shrink-0">
                                <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px]">2</span>
                                Extra Add-ons
                            </h3>
                            {globalAddons.length > 5 && (
                                <div className="relative flex-1 max-w-[200px]">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold focus:bg-white focus:border-orange-400 outline-none transition-all placeholder:text-slate-400"
                                    />
                                </div>
                            )}
                        </div>
                        {filteredAddons.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2">
                                {filteredAddons.map((a) => {
                                    const count = addonCounts[a.id] || 0;
                                    const isSelected = count > 0;
                                    return (
                                        <div
                                            key={a.id}
                                            className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${isSelected 
                                                ? 'border-emerald-500 bg-emerald-50/50' 
                                                : 'border-slate-100 bg-slate-50'}`}
                                        >
                                            <div className="flex flex-col">
                                                <div className="font-bold text-slate-700 text-sm">{a.name}</div>
                                                <div className="text-slate-500 font-bold text-xs">Rs. {Number(a.price).toFixed(0)}</div>
                                            </div>

                                            <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                                                <button 
                                                    onClick={() => updateAddonCount(a.id, -1)}
                                                    className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all font-black"
                                                >
                                                    -
                                                </button>
                                                <span className="w-6 text-center text-sm font-black text-slate-800">
                                                    {count}
                                                </span>
                                                <button 
                                                    onClick={() => updateAddonCount(a.id, 1)}
                                                    className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 active:scale-95 transition-all font-black"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-6 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                                <p className="text-xs font-bold text-slate-400 italic">No add-ons available for this item.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-sm font-bold text-slate-500">Total Price:</span>
                        <span className="text-2xl font-black text-slate-800">Rs. {totalPrice.toFixed(0)}</span>
                    </div>
                    <button 
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                    >
                        <ShoppingBag size={20} strokeWidth={2.5} />
                        Update Order &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
}
