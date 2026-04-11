import { useState, useEffect, useMemo } from 'react';
import { X, Search, ShoppingBag, Package as PackageIcon, Utensils, Plus, Minus, CheckCircle2, Loader2, Check, Trash2 } from 'lucide-react';
import { api } from '../api';
import type { Product, Package, GlobalAddon, OrderItemDto, ProductSize, Category } from '../types';

interface MenuSelectionPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (items: OrderItemDto[], total: number) => void;
    initialItems?: OrderItemDto[];
}

type TabType = 'PACKAGES' | 'ITEMS' | 'ADDONS';

export function MenuSelectionPopup({
    isOpen,
    onClose,
    onConfirm,
    initialItems = []
}: MenuSelectionPopupProps) {
    const [activeTab, setActiveTab] = useState<TabType>('PACKAGES');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItems, setSelectedItems] = useState<OrderItemDto[]>(initialItems);

    const [packages, setPackages] = useState<Package[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [addons, setAddons] = useState<GlobalAddon[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Context for customization (Size + Addons)
    const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
    const [tempSelectedSize, setTempSelectedSize] = useState<ProductSize | null>(null);
    const [tempAddonCounts, setTempAddonCounts] = useState<Record<string, number>>({});
    const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
            setSelectedItems(initialItems);
        }
    }, [isOpen, initialItems]);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [pkgs, prods, ads, cats] = await Promise.all([
                api.getPackages(),
                api.getProducts(),
                api.getGlobalAddons(),
                api.getCategories()
            ]);
            setPackages(pkgs);
            setProducts(prods.filter(p => p.type === 'FOOD'));
            setAddons(ads);
            setCategories(cats);
        } catch (err) {
            console.error("Failed to fetch menu data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddItem = (item: Partial<OrderItemDto>) => {
        if (editingItemIdx !== null) {
            setSelectedItems(prev => prev.map((i, idx) => idx === editingItemIdx ? { ...i, ...item } as OrderItemDto : i));
            setEditingItemIdx(null);
            return;
        }

        setSelectedItems(prev => {
            // Uniqueness check for non-customized additions (like direct package add)
            const existingIdx = prev.findIndex(i => {
                if (item.packageId) return i.packageId === item.packageId;
                if (item.productId && !item.selectedAddons?.length) {
                    return i.productId === item.productId && i.sizeId === item.sizeId && (!i.selectedAddons || i.selectedAddons.length === 0);
                }
                return false;
            });

            if (existingIdx > -1) {
                return prev.map((i, idx) => 
                    idx === existingIdx ? { ...i, quantity: i.quantity + 1 } : i
                );
            }

            return [...prev, {
                ...item,
                quantity: 1,
                type: item.packageId ? 'PACKAGE' : 'FOOD',
            } as OrderItemDto];
        });
    };

    const handleUpdateQuantity = (idx: number, delta: number) => {
        setSelectedItems(prev => {
            if (prev[idx].quantity + delta <= 0) {
                return prev.filter((_, i) => i !== idx);
            }
            return prev.map((item, i) => 
                i === idx ? { ...item, quantity: item.quantity + delta } : item
            );
        });
    };

    const handleRemoveItem = (idx: number) => {
        setSelectedItems(prev => prev.filter((_, i) => i !== idx));
    };

    const filteredContent = useMemo(() => {
        const query = searchQuery.toLowerCase();
        let source: any[] = [];
        if (activeTab === 'PACKAGES') source = packages;
        else if (activeTab === 'ITEMS') {
            source = selectedCategoryId 
                ? products.filter(p => p.categoryId === selectedCategoryId)
                : products;
        }
        else source = addons;

        return source.filter(p => p.name.toLowerCase().includes(query));
    }, [activeTab, searchQuery, packages, products, addons, selectedCategoryId]);

    const cartTotal = useMemo(() => {
        return selectedItems.reduce((acc, item) => {
            let price = 0;
            if (item.packageId) {
                price = parseFloat(item.package?.price || '0');
            } else if (item.productId) {
                price = item.size ? parseFloat(item.size.price) : parseFloat(item.product?.price || '0');
                if (item.selectedAddons) {
                    price += item.selectedAddons.reduce((sum, a) => sum + parseFloat(a.price), 0);
                }
            } else if (item.addonIds && item.selectedAddons && !item.productId) {
                price = parseFloat(item.selectedAddons[0].price || '0');
            }
            return acc + (price * item.quantity);
        }, 0);
    }, [selectedItems]);

    // Addons applicable for the currently customizing product
    const applicableAddons = useMemo(() => {
        if (!customizingProduct) return [];
        return addons.filter(a => 
            !a.categories || a.categories.length === 0 || a.categories.some(c => c.id === customizingProduct.categoryId)
        );
    }, [customizingProduct, addons]);

    const handleConfirmCustomization = () => {
        if (!customizingProduct) return;

        const flattenedAddons: GlobalAddon[] = [];
        const addonIds: string[] = [];
        Object.entries(tempAddonCounts).forEach(([id, count]) => {
            const addon = addons.find(a => a.id === id);
            if (addon && count > 0) {
                for (let i = 0; i < count; i++) {
                    flattenedAddons.push(addon);
                    addonIds.push(id);
                }
            }
        });

        handleAddItem({
            productId: customizingProduct.id,
            product: customizingProduct,
            sizeId: tempSelectedSize?.id,
            size: tempSelectedSize || undefined,
            addonIds,
            selectedAddons: flattenedAddons
        });

        setCustomizingProduct(null);
        setTempSelectedSize(null);
        setTempAddonCounts({});
        setEditingItemIdx(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
            
            <div className="relative bg-white w-full max-w-[95vw] h-[92vh] rounded-[3.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in duration-500">
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-white">
                    <header className="px-12 py-10 border-b border-slate-100 shrink-0 bg-white relative z-20 font-sans">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h2 className="text-4xl font-black text-slate-950 tracking-tight flex items-center gap-4">
                                    <div className="p-3 bg-blue-600 rounded-[1.5rem] shadow-xl shadow-blue-600/20">
                                        <ShoppingBag className="text-white" size={28} />
                                    </div>
                                    Menu Selection Portal
                                </h2>
                                <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.25em] mt-3 ml-1 leading-none">Curate your grand celebration menu</p>
                            </div>
                            <button onClick={onClose} className="w-14 h-14 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-[1.5rem] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm">
                                <X size={28} />
                            </button>
                        </div>

                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="flex bg-slate-100 p-2 rounded-[1.5rem] shrink-0 shadow-inner">
                                {(['PACKAGES', 'ITEMS', 'ADDONS'] as TabType[]).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => { setActiveTab(tab); setSelectedCategoryId(null); }}
                                        className={`px-10 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-xl transform scale-[1.02]' : 'text-slate-500 hover:text-slate-950'}`}
                                    >
                                        {tab === 'PACKAGES' && 'All Packages'}
                                        {tab === 'ITEMS' && 'Gourmet Items'}
                                        {tab === 'ADDONS' && 'Side Add-ons'}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 relative group">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={24} />
                                <input
                                    type="text"
                                    placeholder={`Discover ${activeTab.toLowerCase()}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-16 pr-8 py-5.5 bg-slate-50/50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-[2rem] outline-none font-bold text-slate-700 transition-all shadow-sm focus:shadow-blue-500/5 placeholder:text-slate-300"
                                />
                            </div>
                        </div>

                        {activeTab === 'ITEMS' && categories.length > 0 && (
                            <div className="flex items-center gap-4 mt-10 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
                                <button 
                                    onClick={() => setSelectedCategoryId(null)}
                                    className={`px-8 py-3 rounded-2xl text-[11px] font-black tracking-[0.25em] transition-all whitespace-nowrap border-2 ${!selectedCategoryId ? 'bg-slate-950 border-slate-950 text-white shadow-2xl' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600'}`}
                                >
                                    ALL CATEGORIES
                                </button>
                                {categories.map(cat => (
                                    <button 
                                        key={cat.id}
                                        onClick={() => setSelectedCategoryId(cat.id)}
                                        className={`px-8 py-3 rounded-2xl text-[11px] font-black tracking-[0.25em] transition-all whitespace-nowrap border-2 ${selectedCategoryId === cat.id ? 'bg-blue-600 border-blue-600 text-white shadow-2xl shadow-blue-500/20' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600'}`}
                                    >
                                        {cat.name.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        )}
                    </header>

                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/10 relative">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-5 text-slate-200">
                                <Loader2 className="animate-spin" size={64} />
                                <p className="font-black uppercase tracking-[0.5em] text-[10px] ml-1">Loading Catalog Architecture...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                                {filteredContent.map((item: any) => {
                                    let laabaya = 0;
                                    if (activeTab === 'PACKAGES' && item.items) {
                                        const individualTotal = item.items.reduce((sum: number, pkgItem: any) => {
                                            const price = pkgItem.size ? parseFloat(pkgItem.size.price) : parseFloat(pkgItem.product?.price || '0');
                                            return sum + (price * pkgItem.quantity);
                                        }, 0);
                                        laabaya = individualTotal - parseFloat(item.price || '0');
                                    }

                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => {
                                                if (activeTab === 'ITEMS') {
                                                    setEditingItemIdx(null);
                                                    setCustomizingProduct(item);
                                                    setTempSelectedSize(item.sizes && item.sizes.length > 0 ? item.sizes[0] : null);
                                                    setTempAddonCounts({});
                                                } else {
                                                    if (activeTab === 'PACKAGES') handleAddItem({ packageId: item.id, package: item });
                                                    else if (activeTab === 'ADDONS') handleAddItem({ addonIds: [item.id], selectedAddons: [item] });
                                                }
                                            }}
                                            className="bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-hidden hover:border-blue-500 transition-all group shadow-sm flex flex-col hover:shadow-2xl hover:shadow-blue-600/10 hover:-translate-y-2 duration-500 cursor-pointer relative"
                                        >
                                            <div className="relative h-44 bg-slate-50 overflow-hidden">
                                                {item.imageUrl ? (
                                                    <img 
                                                        src={item.imageUrl} 
                                                        alt={item.name} 
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                        {activeTab === 'PACKAGES' ? <PackageIcon size={40} /> : (activeTab === 'ADDONS' ? <Plus size={32} /> : <Utensils size={40} />)}
                                                    </div>
                                                )}
                                                
                                                {/* Stock Badge */}
                                                {activeTab === 'ITEMS' && item.retailStock && (
                                                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl font-bold text-[10px] text-slate-900 shadow-lg border border-slate-100">
                                                        Stock: {item.retailStock.stockQty}
                                                    </div>
                                                )}

                                                {/* Category Badge */}
                                                {(activeTab === 'ITEMS' && item.category) && (
                                                    <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg">
                                                        {item.category.name.split(' ')[0]}
                                                    </div>
                                                )}
                                                
                                                {activeTab === 'PACKAGES' && (
                                                    <>
                                                        <div className="absolute top-4 right-4 bg-indigo-600 text-white px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg">
                                                            PACKAGE
                                                        </div>
                                                        {laabaya > 0 && (
                                                            <div className="absolute bottom-4 left-4 bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 animate-in fade-in slide-in-from-bottom-2">
                                                                SAVE Rs. {laabaya.toLocaleString()}
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {/* Expired Overlay */}
                                                {item.isActive === false && (
                                                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                                                        <div className="bg-slate-200/20 border-2 border-white/30 px-6 py-2 rounded-2xl font-black text-white text-[10px] uppercase tracking-[0.3em] rotate-[-12deg] shadow-2xl">
                                                            EXPIRED
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors duration-500" />
                                            </div>


                                            <div className="p-6 flex flex-col flex-1 relative">
                                                <h4 className="font-black text-slate-950 text-base leading-tight line-clamp-1 mb-2 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{item.name}</h4>
                                                
                                                <p className="text-slate-400 text-[11px] font-bold line-clamp-1 mb-4 leading-relaxed">
                                                    {activeTab === 'PACKAGES' ? `${item.items?.length || 0} premium specialties included` : (item.description || 'A signature selection crafted by our master chefs.')}
                                                </p>

                                                {activeTab === 'PACKAGES' && item.items && (
                                                    <div className="mb-6 bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex flex-col gap-2 transition-all group-hover:bg-white">
                                                        {item.items.slice(0, 3).map((pkgI: any, idx: number) => (
                                                            <div key={idx} className="text-[10px] font-bold text-slate-500 flex justify-between gap-3 px-1">
                                                                <span className="truncate">{pkgI.product?.name}</span>
                                                                <span className="text-indigo-500 font-black shrink-0">x{pkgI.quantity}</span>
                                                            </div>
                                                        ))}
                                                        {item.items.length > 3 && <p className="text-[9px] text-slate-400 font-extrabold ml-1 uppercase tracking-widest">+{item.items.length - 3} more items</p>}
                                                    </div>
                                                )}


                                                <div className="mt-auto pt-2">
                                                    <div className="text-xl font-black text-slate-950 tracking-tighter mb-1">
                                                        Rs. {parseFloat(item.price || '0').toLocaleString()}
                                                    </div>
                                                    {activeTab === 'ITEMS' && item.sizes && item.sizes.length > 0 && (
                                                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">
                                                            VARIANTS AVAILABLE
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Floating Plus Button */}
                                                <div className="absolute bottom-6 right-6 w-11 h-11 rounded-2xl bg-white border-2 border-slate-100 text-slate-300 flex items-center justify-center transition-all group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 group-hover:scale-110 active:scale-95 shadow-sm group-hover:shadow-xl group-hover:shadow-blue-600/20">
                                                    <Plus size={24} strokeWidth={3} />
                                                </div>
                                            </div>
                                        </div>

                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Dashboard-Style Checklist Sidebar */}
                <div className="w-full md:w-[600px] bg-slate-50/50 flex flex-col shrink-0 border-l border-slate-100 relative group/sidebar font-sans h-full">
                    <div className="px-12 py-10 bg-white border-b border-slate-100 sticky top-0 z-20 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-3xl font-black text-slate-950 tracking-tight leading-none mb-3">Event Checklist</h3>
                                <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.25em] ml-1 leading-none">Management Dashboard Overview</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className="bg-slate-950 text-white text-[10px] font-black px-5 py-2 rounded-full shadow-2xl">ENTITIES: {selectedItems.length}</span>
                            </div>
                        </div>
                        
                        {/* Table Headers (Mirroring Menu Management) */}
                        <div className="grid grid-cols-[1fr,120px,100px] gap-6 px-4 py-4 bg-slate-50 rounded-2xl border border-slate-100 mb-0">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-4">Product Hierarchy</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Batch Size</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right pr-4">Actions</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-10 py-8 space-y-4 custom-scrollbar min-h-0 bg-slate-50/20">
                        {selectedItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-200 gap-10 py-24 animate-in fade-in duration-1000">
                                <div className="w-36 h-36 rounded-[4rem] bg-white border-4 border-dashed border-slate-100 flex items-center justify-center shadow-inner group-hover/sidebar:rotate-3 transition-transform duration-700">
                                    <ShoppingBag size={56} className="opacity-20 translate-y-1" />
                                </div>
                                <div className="text-center space-y-4">
                                    <p className="font-black text-[10px] uppercase tracking-[0.5em] text-slate-300 leading-relaxed translate-x-1">No Entries Documented</p>
                                    <p className="font-bold text-[10px] text-slate-400/40 italic leading-none">Populate your master menu from the catalog</p>
                                </div>
                            </div>
                        ) : (
                            selectedItems.map((item, idx) => (
                                <div key={idx} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 group/item hover:border-blue-500 hover:shadow-[0_20px_40px_-15px_rgba(15,23,42,0.05)] transition-all duration-500 relative animate-in slide-in-from-right-16">
                                    <div className="flex items-center justify-between mb-3">
                                        <h5 className="font-extrabold text-slate-950 text-[15px] truncate pr-4 uppercase tracking-tighter leading-none">{item.package?.name || item.product?.name || (item.selectedAddons?.[0]?.name)}</h5>
                                        <span className="text-[15px] font-black text-slate-950 tracking-tighter">Rs. {((item.size ? parseFloat(item.size.price) : parseFloat(item.product?.price || item.package?.price || '0')) + (item.selectedAddons?.reduce((sum, a) => sum + parseFloat(a.price), 0) || 0)).toLocaleString()}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {(item.size || (item.selectedAddons && item.selectedAddons.length > 0)) && (
                                            <div className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100">
                                                + ADD-ONS / SIZES
                                            </div>
                                        )}
                                        <div className="bg-slate-100 text-slate-400 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                            {item.quantity}x
                                        </div>

                                        <div className="flex items-center gap-2 ml-auto opacity-0 group-hover/item:opacity-100 transition-all">
                                            <button onClick={() => handleUpdateQuantity(idx, -1)} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white rounded-xl transition-all"><Minus size={14} /></button>
                                            <button onClick={() => handleUpdateQuantity(idx, 1)} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all"><Plus size={14} /></button>
                                            <button onClick={() => handleRemoveItem(idx)} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white rounded-xl transition-all"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>

                            ))
                        )}
                    </div>

                    <footer className="p-10 bg-white shadow-[0_-30px_60px_-15px_rgba(0,0,0,0.05)] mt-auto rounded-t-[4rem] border-t border-slate-100 relative z-30 font-sans">
                        <div className="mb-10 px-4">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-slate-400 uppercase tracking-[0.4em] text-[9px] font-black leading-none">Consolidated Subtotal</span>
                                <div className="text-right">
                                    <span className="text-slate-950 text-5xl font-black tracking-tighter leading-none block mb-2">Rs. {cartTotal.toLocaleString()}</span>
                                    <span className="text-[9px] font-bold text-slate-300 italic tracking-widest uppercase">Base price + Customizations</span>
                                </div>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                                <div className="h-full bg-blue-600 transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, (cartTotal / 100000) * 100)}%` }} />
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                            <button 
                                onClick={() => {
                                    onConfirm(selectedItems, cartTotal);
                                    onClose();
                                }}
                                disabled={selectedItems.length === 0}
                                className="w-full py-6 bg-slate-900 border-b-[6px] border-slate-950 hover:bg-slate-800 text-white font-black rounded-3xl text-sm uppercase tracking-[0.3em] shadow-xl transition-all active:translate-y-1 active:border-b-0 flex items-center justify-center gap-4 disabled:opacity-50 group/confirm"
                            >
                                <CheckCircle2 size={32} className="text-blue-500" /> 
                                <span>Finalize Celebration Portfolio</span>
                            </button>
                            <button 
                                onClick={onClose}
                                className="text-slate-400 hover:text-red-500 font-black text-[10px] uppercase tracking-[0.4em] transition-all text-center"
                            >
                                Discard Master Selections
                            </button>
                        </div>
                    </footer>

                </div>
            </div>

            {/* Premium Integrated Customization View */}
            {customizingProduct && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 pointer-events-none">
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md pointer-events-auto animate-in fade-in duration-500" onClick={() => {setCustomizingProduct(null); setEditingItemIdx(null);}}></div>
                    
                    <div className="relative bg-white w-full max-w-3xl rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] pointer-events-auto flex flex-col animate-in zoom-in-95 duration-500 overflow-hidden">
                        <div className="px-12 py-10 border-b border-slate-100 bg-white shrink-0 flex items-center justify-between">
                            <div>
                                <h3 className="text-4xl font-black text-slate-950 leading-tight tracking-tighter mb-1 uppercase">{customizingProduct.name}</h3>
                                <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em]">Customize your selection</p>
                            </div>
                            <button onClick={() => {setCustomizingProduct(null); setEditingItemIdx(null);}} className="w-14 h-14 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-red-500 rounded-2xl flex items-center justify-center transition-all">
                                <X size={28} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar bg-slate-50/20">
                            {/* Portion Sizes Section */}
                            {customizingProduct.sizes && customizingProduct.sizes.length > 0 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">1</div>
                                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">SELECT SIZE <span className="text-red-500">*</span></h4>
                                    </div>
                                    <div className="flex flex-wrap gap-4">
                                        {customizingProduct.sizes.map((s) => (
                                            <button 
                                                key={s.id}
                                                onClick={() => setTempSelectedSize(s)}
                                                className={`flex-1 min-w-[200px] p-6 rounded-[1.5rem] border-2 transition-all relative text-left ${tempSelectedSize?.id === s.id ? 'bg-white border-blue-600 shadow-xl shadow-blue-500/10' : 'bg-white border-slate-100'}`}
                                            >
                                                <div className="font-extrabold text-slate-950 text-lg mb-1">{s.name}</div>
                                                <div className={`font-black tracking-tight ${tempSelectedSize?.id === s.id ? 'text-blue-600' : 'text-slate-400'}`}>Rs. {parseFloat(s.price).toLocaleString()}</div>
                                                {tempSelectedSize?.id === s.id && <Check className="absolute top-4 right-4 text-blue-600" size={20} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Extra Add-ons Section */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs">2</div>
                                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">EXTRA ADD-ONS</h4>
                                </div>
                                <div className="space-y-3">
                                    {applicableAddons.map((addon) => {
                                        const count = tempAddonCounts[addon.id] || 0;
                                        return (
                                            <div key={addon.id} className="p-6 rounded-[1.5rem] bg-white border-2 border-slate-100 flex items-center justify-between">
                                                <div>
                                                    <div className="font-extrabold text-slate-950 text-lg mb-1">{addon.name}</div>
                                                    <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Rs. {parseFloat(addon.price).toLocaleString()}</div>
                                                </div>
                                                <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                                    <button 
                                                        onClick={() => setTempAddonCounts(prev => ({ ...prev, [addon.id]: Math.max(0, (prev[addon.id] || 0) - 1) }))}
                                                        className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-slate-400 hover:text-red-500 shadow-sm transition-all"
                                                    >
                                                        <Minus size={18} />
                                                    </button>
                                                    <span className="w-6 text-center font-black text-slate-950 text-lg">{count}</span>
                                                    <button 
                                                        onClick={() => setTempAddonCounts(prev => ({ ...prev, [addon.id]: (prev[addon.id] || 0) + 1 }))}
                                                        className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-slate-300 hover:text-emerald-500 shadow-sm transition-all"
                                                    >
                                                        <Plus size={18} className="text-emerald-500" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-10 bg-white border-t border-slate-100 flex items-center justify-between">
                            <div>
                                <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-1 block">Total Price:</span>
                                <div className="text-slate-950 text-5xl font-black tracking-tighter">
                                    Rs. {(
                                        (tempSelectedSize ? parseFloat(tempSelectedSize.price) : parseFloat(customizingProduct.price || '0')) +
                                        Object.entries(tempAddonCounts).reduce((sum, [id, count]) => {
                                            const addon = addons.find(a => a.id === id);
                                            return sum + (addon ? parseFloat(addon.price) * count : 0);
                                        }, 0)
                                    ).toLocaleString()}
                                </div>
                            </div>
                            <button 
                                onClick={handleConfirmCustomization}
                                className="px-14 py-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[2rem] text-sm uppercase tracking-[0.3em] flex items-center gap-4 shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                            >
                                <Plus size={24} strokeWidth={3} />
                                ADD
                            </button>
                        </div>
                    </div>
                </div>
            )}


            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 50px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .stripes-loading {
                     background-image: linear-gradient(45deg, rgba(255,255,255,.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.1) 50%, rgba(255,255,255,.1) 75%, transparent 75%, transparent);
                     background-size: 40px 40px;
                     animation: stripes-move 2s linear infinite;
                }
                @keyframes stripes-move { from { background-position: 0 0; } to { background-position: 40px 0; } }
            `}</style>
        </div>
    );
}
