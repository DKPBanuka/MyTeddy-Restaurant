import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';
import type { Product, OrderItemDto, ProductSize, GlobalAddon } from '../types';
import { ProductType } from '../types';
import { ProductCard } from '../components/ProductCard';
import { Cart } from '../components/Cart';
import { toast } from 'sonner';
import { Store, PackageSearch, Coffee, Search, ShoppingBag, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { CheckoutModal } from '../components/CheckoutModal';
import { ProductSelectionModal } from '../components/ProductSelectionModal';
import { HeldOrdersModal } from '../components/HeldOrdersModal';
import { CheckoutSuccessModal } from '../components/CheckoutSuccessModal';
import { useCart } from '../context/CartContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSettings } from '../context/SettingsContext';


type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

export function POSDashboard() {
    const { user } = useAuth();
    const { settings } = useSettings();
    const location = useLocation();

    const [activeFilter, setActiveFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const {
        items: cartItems, setItems: setCartItems,
        orderType, setOrderType,
        orderMetadata, setOrderMetadata,
        clearCart: handleClearCart
    } = useCart();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [isHeldOrdersModalOpen, setIsHeldOrdersModalOpen] = useState(false);
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
    const [generatedToken, setGeneratedToken] = useState<string | null>(null);
    const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const [lastOrder, setLastOrder] = useState<any>(null);
    const queryClient = useQueryClient();

    const { data: products = [], isLoading: productsLoading } = useQuery({
        queryKey: ['products'],
        queryFn: () => api.getProducts(),
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: () => api.getCategories(),
    });

    const { data: globalAddons = [] } = useQuery({
        queryKey: ['global-addons'],
        queryFn: () => api.getGlobalAddons(),
    });

    const { data: packages = [] } = useQuery({
        queryKey: ['packages'],
        queryFn: () => api.getPackages(),
    });

    const isLoading = productsLoading;

    const handleRecallOrder = (order: any) => {
        setActiveOrderId(order.id);
        setOrderType(order.orderType as OrderType);
        setGeneratedToken(order.tokenId || null);
        setOrderMetadata({
            tableNo: order.tableNumber || '',
            customerName: order.customerName || '',
            customerPhone: order.customerPhone || '',
            deliveryAddress: order.deliveryAddress || ''
        });
        setCartItems(order.orderItems?.map((item: any) => ({
            productId: item.productId,
            packageId: item.packageId,
            quantity: item.quantity,
            type: (item.product?.type || (item.package ? 'PACKAGE' : ProductType.FOOD)) as any,
            product: item.product,
            package: item.package,
            sizeId: item.sizeId,
            size: item.size,
            addonIds: item.addonIds,
            selectedAddons: item.selectedAddons,
            notes: item.notes || ''
        })) || []);
    };

    useEffect(() => {
        const state = location.state as { tableNo?: string; orderId?: string } | null;
        if (state?.tableNo && !state.orderId) {
            handleClearCart();
            setOrderType('DINE_IN');
            setOrderMetadata(prev => ({ ...prev, tableNo: state.tableNo as string }));
        }

        if (state?.orderId) {
            const fetchAndOpenOrder = async () => {
                try {
                    const data = await api.getOrders({ status: 'READY' });
                    const orderToOpen = data.orders.find((o: any) => o.id === state.orderId);
                    if (orderToOpen) {
                        handleRecallOrder(orderToOpen);
                    }
                } catch (error) {
                    console.error('Failed to load order:', error);
                    toast.error('Failed to load order.');
                }
            }
            fetchAndOpenOrder();
        }
    }, [location.state]);

    const filteredItems = useMemo(() => {
        let result = [
            ...products.map(p => ({ ...p, isPackage: false })),
            ...packages.map(p => ({ ...p, isPackage: true, type: 'PACKAGE' as const }))
        ];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p => p.name.toLowerCase().includes(query));
        }
        if (activeFilter !== 'ALL') {
            if (activeFilter === 'PACKAGES') {
                result = result.filter((p: any) => p.isPackage);
            } else {
                result = result.filter((p: any) => p.categoryId === activeFilter);
            }
        }
        return result;
    }, [products, packages, activeFilter, searchQuery]);

    const handleAddToCart = (item: any) => {
        if (item.isPackage) {
            setCartItems((prev) => {
                const existing = prev.find(i => i.packageId === item.id);
                if (existing) {
                    return prev.map(i => i.packageId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
                }
                return [...prev, {
                    packageId: item.id,
                    quantity: 1,
                    type: 'PACKAGE',
                    package: item,
                    addonIds: []
                }];
            });
            toast.success(`Added bundle ${item.name} to order`);
            return;
        }

        const product = item as Product;
        const relevantAddons = globalAddons.filter(a =>
            a.categories?.some((c: any) => c.id === product.categoryId)
        );

        if ((product.sizes && product.sizes.length > 1) || relevantAddons.length > 0) {
            setSelectedProductForModal(product);
            return;
        }

        const selectedSize = product.sizes && product.sizes.length === 1 ? product.sizes[0] : undefined;

        setCartItems((prev) => {
            const existing = prev.find((item) =>
                item.productId === product.id &&
                item.sizeId === selectedSize?.id &&
                (!item.addonIds || item.addonIds.length === 0)
            );
            if (existing) {
                return prev.map((item) =>
                    (item.productId === product.id && item.sizeId === selectedSize?.id && (!item.addonIds || item.addonIds.length === 0))
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, {
                productId: product.id,
                quantity: 1,
                type: product.type,
                product,
                sizeId: selectedSize?.id,
                size: selectedSize,
                addonIds: []
            }];
        });
        toast.success(`Added ${product.name} to order`);
    };

    const handleSelectionConfirm = (size?: ProductSize, selectedAddons?: GlobalAddon[]) => {
        if (!selectedProductForModal) return;

        const product = selectedProductForModal;
        const sortedAddonIds = selectedAddons?.map(a => a.id).sort() || [];

        setCartItems((prev) => {
            if (editingItemIndex !== null) {
                const newItems = [...prev];
                newItems[editingItemIndex] = {
                    ...newItems[editingItemIndex],
                    sizeId: size?.id,
                    size: size,
                    addonIds: sortedAddonIds,
                    selectedAddons: selectedAddons
                };
                return newItems;
            }

            const existingIndex = prev.findIndex((item) =>
                item.productId === product.id &&
                item.sizeId === size?.id &&
                JSON.stringify(item.addonIds?.sort() || []) === JSON.stringify(sortedAddonIds)
            );

            if (existingIndex !== -1) {
                const newItems = [...prev];
                newItems[existingIndex] = {
                    ...newItems[existingIndex],
                    quantity: newItems[existingIndex].quantity + 1
                };
                return newItems;
            }

            return [...prev, {
                productId: product.id,
                quantity: 1,
                type: product.type,
                product,
                sizeId: size?.id,
                size: size,
                addonIds: sortedAddonIds,
                selectedAddons: selectedAddons
            }];
        });

        setSelectedProductForModal(null);
        setEditingItemIndex(null);
        toast.success(editingItemIndex !== null ? `Updated ${product.name}` : `Added ${product.name} to order`);
    };

    const handleEditCartItem = (item: OrderItemDto) => {
        const index = cartItems.indexOf(item);
        if (index === -1) return;
        setEditingItemIndex(index);
        setSelectedProductForModal(item.product as Product);
    };

    const handleUpdateProductQty = (productId: string, delta: number) => {
        setCartItems((prev) => {
            const index = prev.findIndex(item => item.productId === productId);
            if (index === -1) return prev;

            const newItems = [...prev];
            newItems[index] = {
                ...newItems[index],
                quantity: Math.max(0, newItems[index].quantity + delta)
            };
            return newItems.filter(item => item.quantity > 0);
        });
    };

    const getProductQtyInCart = (productId: string) => {
        const item = cartItems.find((itm) => itm.productId === productId);
        return item ? item.quantity : 0;
    };

    const cartTotalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotalPrice = cartItems.reduce((sum, item) => {
        const basePrice = item.size ? Number(item.size.price) : Number(item.product?.price || item.package?.price || 0);
        const addonsPrice = item.selectedAddons?.reduce((s, a) => s + Number(a.price), 0) || 0;
        return sum + (basePrice + addonsPrice) * item.quantity;
    }, 0);

    const taxRate = settings?.taxRate || 0;
    const cartGrandTotal = cartTotalPrice + (cartTotalPrice * taxRate / 100);

    const handleOpenCheckout = () => {
        if (cartItems.length === 0) return;
        setIsCheckoutModalOpen(true);
    };

    const handleConfirmCheckout = async (paymentDetails: {
        method: string;
        amountReceived?: number;
        change?: number;
        subTotal?: number;
        discount?: number;
        grandTotal?: number;
        discountPercentage?: number;
    }) => {
        try {
            setIsSubmitting(true);

            const calculatedTotal = cartItems.reduce((sum, item) => {
                const basePrice = item.size ? Number(item.size.price) : Number(item.product?.price || item.package?.price || 0);
                const addonsPrice = item.selectedAddons?.reduce((s, a) => s + Number(a.price), 0) || 0;
                return sum + (basePrice + addonsPrice) * item.quantity;
            }, 0);

            const payloadItems: any[] = cartItems.map((item) => ({
                productId: item.productId,
                packageId: item.packageId || undefined,
                quantity: item.quantity,
                type: item.type,
                sizeId: item.sizeId,
                addonIds: item.addonIds,
                notes: item.notes
            }));

            let createdOrder: any = null;

            if (activeOrderId) {
                await api.updateOrderItems(activeOrderId, {
                    items: payloadItems,
                    totalAmount: paymentDetails.grandTotal || calculatedTotal,
                    subTotal: paymentDetails.subTotal || calculatedTotal,
                    discount: paymentDetails.discount || 0,
                    grandTotal: paymentDetails.grandTotal || calculatedTotal
                });
                createdOrder = await api.payOrder(activeOrderId, paymentDetails);
            } else {
                createdOrder = await api.createOrder({
                    items: payloadItems,
                    totalAmount: paymentDetails.grandTotal || calculatedTotal,
                    subTotal: paymentDetails.subTotal || calculatedTotal,
                    discount: paymentDetails.discount || 0,
                    grandTotal: paymentDetails.grandTotal || calculatedTotal,
                    paymentMethod: paymentDetails.method as any,
                    amountReceived: paymentDetails.amountReceived,
                    change: paymentDetails.change,
                    paymentStatus: 'PAID',
                    orderType,
                    ...orderMetadata
                });
            }

            console.log('Checkout SUCCESS. createdOrder from API:', createdOrder);
            console.log('Current cartItems in state:', cartItems);

            const orderToSave = {
                ...createdOrder,
                // Hardened enrichment: Map cart metadata to order items for the receipt utility.
                orderItems: (createdOrder.orderItems || createdOrder.items || []).map((oi: any) => {
                    const oiProdId = oi.productId?.toString();
                    const oiPkgId = oi.packageId?.toString();

                    const cartItem = (cartItems as any[]).find(ci => {
                        const ciProdId = ci.productId?.toString() || ci.id?.toString();
                        const ciPkgId = ci.packageId?.toString() || ci.id?.toString();
                        
                        if (oiProdId && ciProdId === oiProdId) return true;
                        if (oiPkgId && ciPkgId === oiPkgId) return true;
                        return false;
                    });

                    console.log(`Mapping OI (Prod:${oiProdId}, Pkg:${oiPkgId}) -> Found CartItem:`, cartItem?.name || 'NOT FOUND');

                    return {
                        ...oi,
                        name: cartItem?.name || cartItem?.product?.name || cartItem?.package?.name || oi.product?.name || oi.package?.name || `Item (${oiProdId || oiPkgId || '?'})`,
                        unitPrice: Number(oi.unitPrice || oi.priceAtTimeOfSale || (cartItem?.size ? cartItem.size.price : cartItem?.product?.price || cartItem?.package?.price || 0)),
                        product: cartItem?.product || oi.product,
                        package: cartItem?.package || oi.package,
                        size: cartItem?.size || oi.size,
                        selectedAddons: cartItem?.selectedAddons || oi.selectedAddons || []
                    };
                }),
                subTotal: Number(paymentDetails.subTotal || createdOrder.subTotal || calculatedTotal),
                discount: Number(paymentDetails.discount || createdOrder.discount || 0),
                grandTotal: Number(paymentDetails.grandTotal || createdOrder.grandTotal || (calculatedTotal - (paymentDetails.discount || 0))),
                discountPercentage: paymentDetails.discountPercentage || createdOrder.discountPercentage,
                invoiceNumber: createdOrder.invoiceNumber || `TMP-${Date.now()}`
            };
            
            console.log('FINAL orderToSave for receipt:', orderToSave);
            
            setLastOrder(orderToSave);
            toast.success('Payment processed successfully!');
            setActiveOrderId(null);
            setIsMobileCartOpen(false);
            queryClient.invalidateQueries({ queryKey: ['products'] });
            
            // Clear cart LAST to ensure all state used above was available
            handleClearCart();
            
            // Open Success Modal instead of just toast
            setIsSuccessModalOpen(true);
            
            return orderToSave;

        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                toast.error(`Checkout Failed: ${error.response.data.message || 'Validation error'}`);
            } else {
                toast.error('An unexpected error occurred during checkout.');
            }
            console.error(error);
            throw error;
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex h-full w-full relative">
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 w-full pb-20 md:pb-0 relative">

                <header className="px-4 md:px-8 pt-4 md:pt-8 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-8 z-10 shrink-0">
                    <div className="flex w-full md:hidden justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden border border-slate-200 shadow-sm">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 text-sm leading-tight">{user?.name}</div>
                                <div className="text-[10px] font-bold text-blue-600 tracking-wider uppercase">{user?.role}</div>
                            </div>
                        </div>
                    </div>

                    <div className="relative w-full max-w-xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search Menu..."
                            className="w-full pl-12 pr-4 py-3 md:py-3.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-full outline-none font-semibold text-sm transition-all shadow-sm"
                        />
                    </div>

                    <div className="hidden md:flex items-center gap-6">
                        {lastOrder && (
                            <button
                                onClick={() => {
                                    import('../utils/modernPdfReceipt').then(m => m.downloadModernPDFReceipt(lastOrder, settings));
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm group"
                            >
                                <ShoppingBag size={18} className="group-hover:scale-110 transition-transform" />
                                Reprint Last Bill
                            </button>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden border border-slate-200 shadow-sm">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 text-sm leading-tight">{user?.name}</div>
                                <div className="text-[10px] font-bold text-blue-600 tracking-wider uppercase">{user?.role}</div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="px-4 md:px-8 pb-4 shrink-0 mt-2">
                    <div className="flex gap-3 md:gap-4 mb-4 md:mb-6 overflow-x-auto pb-2 scrollbar-hide snap-x">
                        <PillCategory
                            active={orderType === 'DINE_IN'}
                            onClick={() => setOrderType('DINE_IN')}
                            icon={<Coffee size={18} className="md:w-5 md:h-5" />}
                            title="Dine-In"
                            subtitle="Table Order"
                        />
                        <PillCategory
                            active={orderType === 'TAKEAWAY'}
                            onClick={() => setOrderType('TAKEAWAY')}
                            icon={<PackageSearch size={18} className="md:w-5 md:h-5" />}
                            title="Takeaway"
                            subtitle="Pack & Go"
                        />
                        <PillCategory
                            active={orderType === 'DELIVERY'}
                            onClick={() => setOrderType('DELIVERY')}
                            icon={<Store size={18} className="md:w-5 md:h-5" />}
                            title="Delivery"
                            subtitle="Dispatch"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between xl:justify-start gap-4 mb-2 md:mb-4">
                        <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight block xl:mr-auto">
                            {activeFilter === 'ALL' ? 'All Menu' : categories.find(c => c.id === activeFilter)?.name || 'Filtered Menu'}
                        </h2>

                        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex w-full sm:w-auto overflow-x-auto scrollbar-hide">
                            <button
                                onClick={() => setActiveFilter('ALL')}
                                className={`flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-1.5 text-xs md:text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${activeFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setActiveFilter('PACKAGES')}
                                className={`flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-1.5 text-xs md:text-sm font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${activeFilter === 'PACKAGES' ? 'bg-orange-500 text-white' : 'text-orange-600 hover:bg-orange-50'}`}
                            >
                                <PackageSearch size={16} />
                                Packages
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveFilter(cat.id)}
                                    className={`flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-1.5 text-xs md:text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${activeFilter === cat.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32 md:pb-8 pt-2 scroll-smooth">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full pb-20">
                            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5 content-start">
                            {filteredItems.map((item: any) => (
                                <ProductCard
                                    key={item.id}
                                    product={item}
                                    qtyInCart={getProductQtyInCart(item.id)}
                                    onAdd={() => handleAddToCart(item)}
                                    onUpdateQty={(delta) => handleUpdateProductQty(item.id, delta)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {cartItems.length > 0 && (
                    <div className="lg:hidden fixed bottom-[72px] md:bottom-6 left-0 right-0 px-4 md:px-8 z-40">
                        <button
                            onClick={() => setIsMobileCartOpen(true)}
                            className="w-full bg-slate-900 border border-slate-700 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center justify-between active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 text-white p-2 rounded-xl">
                                    <ShoppingBag size={20} />
                                </div>
                                <div className="text-left">
                                    <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Current Order</div>
                                    <div className="font-bold text-white text-sm">{cartTotalQty} {cartTotalQty === 1 ? 'Item' : 'Items'}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="font-black text-xl">Rs. {cartTotalPrice.toFixed(1)}</div>
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                    &rarr;
                                </div>
                            </div>
                        </button>
                    </div>
                )}
            </main>

            <aside className="hidden lg:flex w-[380px] bg-white h-full shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-20 flex-shrink-0 flex-col border-l border-slate-100 relative">
                <Cart
                    onCheckout={handleOpenCheckout}
                    isSubmitting={isSubmitting}
                    generatedToken={generatedToken}
                    discount={0}
                    onViewHeldOrders={() => setIsHeldOrdersModalOpen(true)}
                    onEdit={handleEditCartItem}
                />
            </aside>

            {isMobileCartOpen && (
                <div className="lg:hidden fixed inset-0 z-[100] flex flex-col justify-end bg-slate-900/40 backdrop-blur-sm">
                    <div className="absolute inset-0" onClick={() => setIsMobileCartOpen(false)}></div>
                    <div className="relative bg-white w-full h-[85vh] md:h-[90vh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
                        <div className="absolute top-4 right-4 z-10 text-slate-400 p-2">
                            <button onClick={() => setIsMobileCartOpen(false)} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>
                        <Cart
                            onCheckout={handleOpenCheckout}
                            isSubmitting={isSubmitting}
                            generatedToken={generatedToken}
                            discount={0}
                            onViewHeldOrders={() => setIsHeldOrdersModalOpen(true)}
                            onEdit={handleEditCartItem}
                        />
                    </div>
                </div>
            )}

            <HeldOrdersModal
                isOpen={isHeldOrdersModalOpen}
                onClose={() => setIsHeldOrdersModalOpen(false)}
            />

            <CheckoutModal
                isOpen={isCheckoutModalOpen}
                onClose={() => setIsCheckoutModalOpen(false)}
                totalAmount={cartGrandTotal}
                onConfirm={handleConfirmCheckout}
            />

            <CheckoutSuccessModal
                isOpen={isSuccessModalOpen}
                onClose={() => setIsSuccessModalOpen(false)}
                orderData={lastOrder}
                onPrint={() => {
                    if (lastOrder) {
                        import('../utils/htmlReceipt').then(m => 
                            m.generateHTMLReceipt(lastOrder, settings)
                        );
                    }
                }}
            />

            {selectedProductForModal && (
                <ProductSelectionModal
                    product={selectedProductForModal}
                    globalAddons={
                        globalAddons.filter(a =>
                            a.categories?.some((c: any) => c.id === (selectedProductForModal as Product).categoryId)
                        )
                    }
                    initialSize={editingItemIndex !== null ? cartItems[editingItemIndex].size : undefined}
                    initialAddons={editingItemIndex !== null ? cartItems[editingItemIndex].selectedAddons : undefined}
                    onClose={() => {
                        setSelectedProductForModal(null);
                        setEditingItemIndex(null);
                    }}
                    onConfirm={handleSelectionConfirm}
                />
            )}
        </div>
    );
}

function PillCategory({ active, onClick, icon, title, subtitle }: { active: boolean, onClick: () => void, icon: React.ReactNode, title: string, subtitle: string }) {
    return (
        <button
            onClick={onClick}
            className={`min-w-[140px] md:min-w-[170px] snap-center flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-2xl text-left transition-all border shrink-0 ${active
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
        >
            <div className={`p-2 md:p-2.5 rounded-xl block ${active ? 'bg-white text-blue-600 shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                {icon}
            </div>
            <div>
                <div className={`font-black text-[13px] md:text-sm leading-tight ${active ? 'text-white' : 'text-slate-800'}`}>{title}</div>
                <div className={`text-[10px] md:text-xs font-semibold mt-0.5 ${active ? 'text-blue-100' : 'text-slate-400'}`}>{subtitle}</div>
            </div>
        </button>
    );
}
