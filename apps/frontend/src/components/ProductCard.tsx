import { useMemo, useState } from 'react';
import type { Product } from '../types';
import { ProductType } from '../types';
import { Package, Utensils, Plus, Minus } from 'lucide-react';

interface ProductCardProps {
    product: Product & { isPackage?: boolean; validFrom?: string; validUntil?: string; isAvailable?: boolean };
    qtyInCart: number;
    onAdd: () => void;
    onUpdateQty: (delta: number) => void;
    isComplex?: boolean;
}

export function ProductCard({ product, qtyInCart, onAdd, onUpdateQty, isComplex }: ProductCardProps) {
    const [imgError, setImgError] = useState(false);

    const laabaya = useMemo(() => {
        if (!product.isPackage || !(product as any).items) return 0;
        const individualTotal = (product as any).items.reduce((sum: number, pkgItem: any) => {
            const price = pkgItem.size ? parseFloat(pkgItem.size.price) : parseFloat(pkgItem.product?.price || '0');
            return sum + (price * pkgItem.quantity);
        }, 0);
        return individualTotal - parseFloat(product.price || '0');
    }, [product]);

    const isRetail = product.type === ProductType.RETAIL;

    // Quick availability check
    let isOutOfStock = isRetail && (product.retailStock?.stockQty || 0) <= 0;
    
    // For packages, use the pre-calculated availability from backend
    if (product.isPackage && product.isAvailable === false) {
        isOutOfStock = true;
    }
    
    // Validity check
    const now = new Date();
    const validFrom = product.validFrom ? new Date(product.validFrom) : null;
    const validUntil = product.validUntil ? new Date(product.validUntil) : null;
    const isNotStarted = validFrom && now < validFrom;
    const isExpired = validUntil && now > validUntil;
    const isUnavailable = isNotStarted || isExpired;

    const isDisabled = isOutOfStock || isUnavailable;

    return (
        <div className={`flex flex-col bg-white rounded-2xl p-3 border border-slate-100/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] relative ${isDisabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>

            {/* Top Image Placeholder */}
            {(product.imageUrl && !imgError) ? (
                <div className="h-32 rounded-xl mb-4 relative overflow-hidden bg-slate-100 flex items-center justify-center">
                    <img
                        src={product.imageUrl}
                        alt={product.name}
                        onError={() => setImgError(true)}
                        className="w-full h-full object-cover rounded-xl transition-transform hover:scale-105 duration-300"
                    />
                    {/* Category Badge */}
                    {product.category && (
                        <div className="absolute top-2 right-2 bg-blue-600/90 backdrop-blur-sm text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-white shadow-sm">
                            {product.category.name}
                        </div>
                    )}
                    {/* Stock Indicator Top Left */}
                    {isRetail && (
                        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded-md text-slate-800 shadow-md">
                            Stock: {product.retailStock?.stockQty || 0}
                        </div>
                    )}
                    {laabaya > 0 && (
                        <div className="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-1 rounded-lg font-black text-[8px] uppercase tracking-widest shadow-lg shadow-green-500/20">
                            Save Rs. {laabaya.toLocaleString()}
                        </div>
                    )}
                </div>
            ) : (
                <div className={`h-32 rounded-xl mb-4 flex flex-col items-center justify-center relative overflow-hidden transition-colors ${product.category?.name === 'Drinks' ? 'bg-blue-50 text-blue-300' : product.category?.name === 'Foods' ? 'bg-orange-50 text-orange-300' : 'bg-slate-100 text-slate-300'}`}>
                    {isRetail ? <Package size={40} className="opacity-80" strokeWidth={1.5} /> : <Utensils size={40} className="opacity-80" strokeWidth={1.5} />}

                    {/* Category Label Center */}
                    <div className="absolute bottom-2 text-[9px] font-black uppercase tracking-widest opacity-40">
                        {product.category?.name || 'Uncategorized'}
                    </div>

                    {/* Stock Indicator Top Left */}
                    {isRetail && (
                        <div className="absolute top-2 left-2 bg-white/80 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded-md text-slate-600 shadow-sm">
                            Stock: {product.retailStock?.stockQty || 0}
                        </div>
                    )}
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 flex flex-col px-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-slate-800 leading-tight line-clamp-1">{product.name}</h3>
                </div>
                <p className="text-[11px] font-medium text-slate-400 leading-snug line-clamp-2 mb-3">{product.description || 'Menu item description'}</p>

                <div className="mt-auto flex items-end justify-between pt-2">
                    <div className="flex flex-col items-start">
                        <div className="flex items-center">
                            <span className="text-[10px] font-bold text-slate-400 mt-1 mr-1">Rs.</span>
                            <span className="font-extrabold text-2xl text-slate-800 tracking-tight leading-none">
                                {Number(product.price).toFixed(0)}
                            </span>
                        </div>
                        {(product.sizes?.length || 0) > 0 && (
                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-0.5">Variants Available</span>
                        )}
                    </div>

                    {/* Inline Quantifier or Selection Trigger */}
                    {!isDisabled && (
                        (qtyInCart > 0 && !isComplex) ? (
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full p-1 shadow-sm">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onUpdateQty(-1); }}
                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white text-slate-600 hover:text-red-500 shadow-sm transition-colors border border-slate-100"
                                >
                                    <Minus size={14} strokeWidth={2.5} />
                                </button>
                                <span className="w-4 text-center text-sm font-bold text-slate-800">
                                    {qtyInCart}
                                </span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onUpdateQty(1); }}
                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700"
                                >
                                    <Plus size={14} strokeWidth={2.5} />
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAdd(); }}
                                    className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white transition-colors shadow-sm"
                                >
                                    <Plus size={18} strokeWidth={2.5} />
                                </button>
                                {qtyInCart > 0 && isComplex && (
                                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                        {qtyInCart}
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>

            {isOutOfStock && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <div className="bg-red-500 text-white text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg transform -rotate-12 border-2 border-white">
                        Sold Out
                    </div>
                </div>
            )}

            {isUnavailable && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <div className="bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-xl transform rotate-12 border-2 border-white">
                        {isNotStarted ? 'Coming Soon' : 'Expired'}
                    </div>
                </div>
            )}
        </div>
    );
}
