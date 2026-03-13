import { useState } from 'react';
import type { Product, ProductSize, GlobalAddon } from '../types';
import { X, Check, ShoppingBag } from 'lucide-react';

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
    const [selectedAddons, setSelectedAddons] = useState<GlobalAddon[]>(initialAddons || []);

    const toggleAddon = (addon: GlobalAddon) => {
        if (selectedAddons.find(a => a.id === addon.id)) {
            setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
        } else {
            setSelectedAddons([...selectedAddons, addon]);
        }
    };

    const hasSizes = product.sizes && product.sizes.length > 0;
    const canConfirm = !hasSizes || selectedSize;

    const totalPrice = (selectedSize ? Number(selectedSize.price) : Number(product.price)) + 
                       selectedAddons.reduce((sum, a) => sum + Number(a.price), 0);

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
                                        <div className="text-blue-600 font-black text-xs mt-1">Rs. {Number(s.price).toFixed(2)}</div>
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
                    {globalAddons.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px]">2</span>
                                Extra Add-ons
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {globalAddons.map((a) => {
                                    const isSelected = !!selectedAddons.find(item => item.id === a.id);
                                    return (
                                        <button
                                            key={a.id}
                                            onClick={() => toggleAddon(a)}
                                            className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${isSelected 
                                                ? 'border-emerald-500 bg-emerald-50/50' 
                                                : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200'}`}>
                                                    {isSelected && <Check size={12} strokeWidth={4} />}
                                                </div>
                                                <div className="font-bold text-slate-700 text-sm">{a.name}</div>
                                            </div>
                                            <div className="text-slate-500 font-bold text-xs">+ Rs. {Number(a.price).toFixed(2)}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-sm font-bold text-slate-500">Total Price:</span>
                        <span className="text-2xl font-black text-slate-800">Rs. {totalPrice.toFixed(2)}</span>
                    </div>
                    <button 
                        onClick={() => onConfirm(selectedSize, selectedAddons)}
                        disabled={!canConfirm}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                    >
                        <ShoppingBag size={20} strokeWidth={2.5} />
                        Add to Order &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
}
