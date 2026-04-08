import { useState, useEffect, useMemo } from 'react';
import { X, Search, ShoppingBag, Package as PackageIcon, Utensils, Plus, Minus, CheckCircle2, Loader2 } from 'lucide-react';
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
        setSelectedItems(prev => {
            const existingIdx = prev.findIndex(i => {
                if (item.packageId) return i.packageId === item.packageId;
                if (item.productId) return i.productId === item.productId && i.sizeId === item.sizeId;
                if (item.addonIds && i.addonIds && !item.productId) return i.addonIds[0] === item.addonIds[0] && !i.productId && !i.packageId;
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
            if (prev[idx].quantity + delta === 0) {
                return prev.filter((_, i) => i !== idx);
            }
            return prev.map((item, i) => 
                i === idx ? { ...item, quantity: item.quantity + delta } : item
            );
        });
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
            } else if (item.addonIds && item.selectedAddons) {
                price = parseFloat(item.selectedAddons[0].price || '0');
            }
            return acc + (price * item.quantity);
        }, 0);
    }, [selectedItems]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose}></div>
            
            <div className="relative bg-white w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0 bg-white">
                    <header className="px-8 py-6 border-b border-slate-100 shrink-0">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                    <ShoppingBag className="text-blue-600" size={24} />
                                    Menu Selection Portal
                                </h2>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Select Packages, Items, and Add-ons</p>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex bg-slate-100 p-1.5 rounded-2xl shrink-0">
                                <button
                                    onClick={() => { setActiveTab('PACKAGES'); setSelectedCategoryId(null); }}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'PACKAGES' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <PackageIcon size={14} /> Packages
                                </button>
                                <button
                                    onClick={() => { setActiveTab('ITEMS'); setSelectedCategoryId(null); }}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'ITEMS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Utensils size={14} /> Food Items
                                </button>
                                <button
                                    onClick={() => { setActiveTab('ADDONS'); setSelectedCategoryId(null); }}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'ADDONS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Plus size={14} /> Add-ons
                                </button>
                            </div>

                            <div className="flex-1 relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder={`Search for ${activeTab.toLowerCase()}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-slate-700 transition-all focus:bg-white"
                                />
                            </div>
                        </div>

                        {activeTab === 'ITEMS' && categories.length > 0 && (
                            <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2 custom-scrollbar no-scrollbar scroll-smooth">
                                <button 
                                    onClick={() => setSelectedCategoryId(null)}
                                    className={`px-5 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all whitespace-nowrap ${!selectedCategoryId ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    ALL
                                </button>
                                {categories.map(cat => (
                                    <button 
                                        key={cat.id}
                                        onClick={() => setSelectedCategoryId(cat.id)}
                                        className={`px-5 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all whitespace-nowrap ${selectedCategoryId === cat.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        {cat.name.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        )}
                    </header>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/30">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                                <Loader2 className="animate-spin" size={48} />
                                <p className="font-bold">Syncing Menu Data...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4">
                                {filteredContent.map((item: any) => {
                                    // Calculate "Laabaya" (Savings) for packages
                                    let laabaya = 0;
                                    if (activeTab === 'PACKAGES' && item.items) {
                                        const individualTotal = item.items.reduce((sum: number, pkgItem: any) => {
                                            const price = pkgItem.size ? parseFloat(pkgItem.size.price) : parseFloat(pkgItem.product?.price || '0');
                                            return sum + (price * pkgItem.quantity);
                                        }, 0);
                                        laabaya = individualTotal - parseFloat(item.price || '0');
                                    }

                                    return (
                                        <div key={item.id} className={`bg-white border-2 border-slate-100 rounded-[2rem] overflow-hidden hover:border-blue-500 transition-all group shadow-sm flex flex-col hover:shadow-xl hover:shadow-blue-600/5 hover:-translate-y-1 duration-300 ${activeTab === 'ADDONS' ? 'scale-95' : ''}`}>
                                            <div className={`relative ${activeTab === 'ADDONS' ? 'h-24' : 'h-32'} bg-slate-50 overflow-hidden`}>
                                                {item.imageUrl ? (
                                                    <img 
                                                        src={item.imageUrl} 
                                                        alt={item.name} 
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                        {activeTab === 'PACKAGES' ? <PackageIcon size={32} /> : (activeTab === 'ADDONS' ? <Plus size={24} /> : <Utensils size={32} />)}
                                                    </div>
                                                )}
                                                
                                                {/* Show single price only if no sizes or not an item */}
                                                {(!item.sizes || item.sizes.length === 0) && (
                                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg font-black text-blue-600 text-[9px] shadow-sm border border-blue-100">
                                                        Rs. {parseFloat(item.price || '0').toLocaleString()}
                                                    </div>
                                                )}

                                                {/* Laabaya Tag */}
                                                {laabaya > 0 && (
                                                    <div className="absolute bottom-3 left-3 bg-green-500 text-white px-2 py-1 rounded-lg font-black text-[8px] uppercase tracking-widest shadow-lg shadow-green-500/20 animate-bounce">
                                                        Save Rs. {laabaya.toLocaleString()}
                                                    </div>
                                                )}
                                            </div>

                                            <div className={`${activeTab === 'ADDONS' ? 'p-3' : 'p-4'} flex flex-col flex-1`}>
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className={`font-black text-slate-800 ${activeTab === 'ADDONS' ? 'text-xs' : 'text-sm'} leading-tight line-clamp-1`}>{item.name}</h4>
                                                </div>
                                                {activeTab === 'PACKAGES' && (
                                                    <div className="mt-1 space-y-1 mb-3">
                                                        <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                            <CheckCircle2 size={10} /> Includes:
                                                        </p>
                                                        <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100/50">
                                                            {item.items?.map((pkgI: any, idx: number) => (
                                                                <div key={idx} className="text-[9px] font-bold text-slate-600 flex justify-between gap-2 mb-1 last:mb-0">
                                                                    <span className="truncate">{pkgI.product?.name}</span>
                                                                    <span className="text-slate-400 shrink-0">x{pkgI.quantity}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                <p className={`text-slate-400 ${activeTab === 'ADDONS' ? 'text-[9px]' : 'text-[10px]'} font-bold line-clamp-2 mb-4 flex-1 italic`}>{item.description || 'Premium selection.'}</p>

                                                <div className="space-y-2">
                                                    {/* Size Selection with Prices */}
                                                    {activeTab === 'ITEMS' && item.sizes && item.sizes.length > 0 && (
                                                        <div className="grid grid-cols-1 gap-1.5 mb-2">
                                                            {item.sizes.map((s: ProductSize) => (
                                                                <button 
                                                                    key={s.id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleAddItem({ productId: item.id, product: item, sizeId: s.id, size: s });
                                                                    }}
                                                                    className="flex items-center justify-between px-3 py-2 rounded-xl text-[9px] font-black uppercase bg-slate-50 text-slate-600 hover:bg-blue-600 hover:text-white transition-all border border-transparent hover:border-blue-600 group/btn"
                                                                >
                                                                    <span>{s.name}</span>
                                                                    <span className="text-blue-600 group-hover/btn:text-white/80">Rs. {parseFloat(s.price).toLocaleString()}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {(!item.sizes || item.sizes.length === 0) && (
                                                        <button 
                                                            onClick={() => {
                                                                if (activeTab === 'PACKAGES') handleAddItem({ packageId: item.id, package: item });
                                                                else if (activeTab === 'ADDONS') handleAddItem({ addonIds: [item.id], selectedAddons: [item] });
                                                                else handleAddItem({ productId: item.id, product: item });
                                                            }}
                                                            className={`w-full bg-slate-900 text-white ${activeTab === 'ADDONS' ? 'py-2 rounded-lg' : 'py-3 rounded-xl'} text-[10px] font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95 group-hover:bg-blue-600 group-hover:shadow-blue-600/20`}
                                                        >
                                                            <Plus size={activeTab === 'ADDONS' ? 10 : 12} /> Add
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar: Current Selection */}
                <div className="w-full md:w-[400px] bg-slate-50 flex flex-col shrink-0 border-l border-slate-100">
                    <div className="p-8 border-b border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            Summary
                            <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-1 rounded-md">{selectedItems.length} items</span>
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        {selectedItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4 py-20">
                                <ShoppingBag size={48} className="opacity-20" />
                                <p className="font-bold text-center">Your selection is empty.<br/>Browse the menu to add items.</p>
                            </div>
                        ) : (
                            selectedItems.map((item, idx) => (
                                <div key={idx} className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 flex items-center gap-4 group">
                                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                                        {item.packageId ? <PackageIcon size={20} /> : <Utensils size={20} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="font-black text-slate-800 text-sm truncate">{item.package?.name || item.product?.name || (item.selectedAddons?.[0]?.name)}</h5>
                                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
                                            {item.size?.name && <span className="text-blue-500 uppercase">{item.size.name}</span>}
                                            {item.packageId ? 'Package Bundle' : 'Food Item'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-xl">
                                        <button 
                                            onClick={() => handleUpdateQuantity(idx, -1)}
                                            className="w-6 h-6 flex items-center justify-center bg-white rounded-lg text-slate-400 hover:text-red-500 transition-colors shadow-sm"
                                        >
                                            <Minus size={12} />
                                        </button>
                                        <span className="text-xs font-black text-slate-700 w-4 text-center">{item.quantity}</span>
                                        <button 
                                            onClick={() => handleUpdateQuantity(idx, 1)}
                                            className="w-6 h-6 flex items-center justify-center bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-colors shadow-sm"
                                        >
                                            <Plus size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <footer className="p-8 border-t border-slate-100 bg-white/50 backdrop-blur-sm space-y-6">
                        <div className="flex justify-between items-center text-sm font-black">
                            <span className="text-slate-400 uppercase tracking-widest text-[10px]">Total Selection</span>
                            <span className="text-slate-800 text-2xl">Rs. {cartTotal.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={onClose}
                                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 font-black rounded-2xl text-xs transition-all active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    onConfirm(selectedItems, cartTotal);
                                    onClose();
                                }}
                                disabled={selectedItems.length === 0}
                                className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <CheckCircle2 size={16} /> Confirm Menu
                            </button>
                        </div>
                    </footer>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
