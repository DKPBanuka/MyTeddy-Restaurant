import type { Product } from '../types';
import { ProductType } from '../types';
import { Package, Utensils, Plus, Minus } from 'lucide-react';

interface ProductCardProps {
    product: Product;
    qtyInCart: number;
    onAdd: () => void;
    onUpdateQty: (delta: number) => void;
}

export function ProductCard({ product, qtyInCart, onAdd, onUpdateQty }: ProductCardProps) {
    const isRetail = product.type === ProductType.RETAIL;

    // Quick availability check
    const isOutOfStock = isRetail && (product.retailStock?.stockQty || 0) <= 0;

    return (
        <div className={`flex flex-col bg-white rounded-2xl p-3 border border-slate-100/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] relative ${isOutOfStock ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>

            {/* Top Image Placeholder */}
            {product.imageUrl ? (
                <div className="h-32 rounded-xl mb-4 relative overflow-hidden bg-slate-100 flex items-center justify-center">
                    <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-xl transition-transform hover:scale-105 duration-300"
                    />
                    {/* Stock Indicator Top Left */}
                    {isRetail && (
                        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded-md text-slate-800 shadow-md">
                            Stock: {product.retailStock?.stockQty || 0}
                        </div>
                    )}
                </div>
            ) : (
                <div className="h-32 rounded-xl bg-slate-100 mb-4 flex flex-col items-center justify-center text-slate-300 relative overflow-hidden">
                    {isRetail ? <Package size={40} className="text-slate-300" strokeWidth={1.5} /> : <Utensils size={40} className="text-slate-300" strokeWidth={1.5} />}

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
                <h3 className="font-bold text-slate-800 leading-tight mb-1 line-clamp-1">{product.name}</h3>
                <p className="text-[11px] font-medium text-slate-400 leading-snug line-clamp-2 mb-3">{product.description || 'Delicious beef lasagna with double chili'}</p>

                <div className="mt-auto flex items-end justify-between pt-2">
                    <div className="flex items-start">
                        <span className="text-xs font-bold text-slate-400 mt-1 mr-1">Rs.</span>
                        <span className="font-extrabold text-2xl text-slate-800 tracking-tight leading-none">
                            {Number(product.price).toFixed(1)}
                        </span>
                    </div>

                    {/* Inline Quantifier */}
                    {!isOutOfStock && (
                        qtyInCart > 0 ? (
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
                            <button
                                onClick={(e) => { e.stopPropagation(); onAdd(); }}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white transition-colors shadow-sm"
                            >
                                <Plus size={18} strokeWidth={2.5} />
                            </button>
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
        </div>
    );
}
