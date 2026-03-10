import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';
import type { Product, OrderItemDto } from '../types';
import { ProductType } from '../types';
import { ProductCard } from '../components/ProductCard';
import { Cart } from '../components/Cart';
import { toast } from 'sonner';
import { Store, PackageSearch, Coffee, Search, Bell, ShoppingBag, X } from 'lucide-react';
import axios from 'axios';
import { generatePDFReceipt } from '../utils/pdfReceipt';
import { useAuth } from '../context/AuthContext';
import { CheckoutModal } from '../components/CheckoutModal';
import { OpenOrdersModal } from '../components/OpenOrdersModal';

type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

export function POSDashboard() {
    const { user } = useAuth();
    const location = useLocation();

    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState<ProductType | 'ALL'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [orderType, setOrderType] = useState<OrderType>('DINE_IN');

    const [cartItems, setCartItems] = useState<OrderItemDto[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [isOpenOrdersModalOpen, setIsOpenOrdersModalOpen] = useState(false);
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
    const [generatedToken, setGeneratedToken] = useState<string | null>(null);
    const [readyOrdersCount, setReadyOrdersCount] = useState(0);
    const [orderMetadata, setOrderMetadata] = useState({
        tableNo: '',
        customerName: '',
        customerPhone: '',
        deliveryAddress: ''
    });

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setIsLoading(true);
            const data = await api.getProducts();
            setProducts(data);
        } catch (error) {
            toast.error('Failed to load products. Is the backend running?');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchReadyOrders = async () => {
        try {
            const data = await api.getPendingOrders();
            const readyCount = data.filter((o: any) => o.status === 'READY').length;
            setReadyOrdersCount(readyCount);
        } catch (error) {
            console.error('Failed to fetch ready orders:', error);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchReadyOrders();
        // Poll every 10 seconds for READY orders
        const interval = setInterval(fetchReadyOrders, 10000);
        return () => clearInterval(interval);
    }, []);

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
                    const data = await api.getPendingOrders();
                    const orderToOpen = data.find((o: any) => o.id === state.orderId);
                    if (orderToOpen) {
                        setActiveOrderId(orderToOpen.id);
                        setOrderType(orderToOpen.orderType as OrderType);
                        setGeneratedToken(orderToOpen.tokenId || null);
                        setOrderMetadata({
                            tableNo: orderToOpen.tableNumber || '',
                            customerName: orderToOpen.customerName || '',
                            customerPhone: orderToOpen.customerPhone || '',
                            deliveryAddress: orderToOpen.deliveryAddress || ''
                        });
                        setCartItems(orderToOpen.orderItems?.map((item: any) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            type: item.product?.type || ProductType.FOOD,
                            product: item.product,
                            notes: item.notes || ''
                        })) || []);
                    }
                } catch (error) {
                    console.error('Failed to load order from Floor Plan:', error);
                    toast.error('Failed to load order from Floor Plan.');
                }
            }
            fetchAndOpenOrder();
        }
    }, [location.state]);

    const filteredProducts = useMemo(() => {
        let result = products;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p => p.name.toLowerCase().includes(query) || (p.barcode && p.barcode.includes(query)));
        }
        if (activeFilter !== 'ALL') {
            result = result.filter((p) => p.type === activeFilter);
        }
        return result;
    }, [products, activeFilter, searchQuery]);

    const handleAddToCart = (product: Product) => {
        setCartItems((prev) => {
            const existing = prev.find((item) => item.productId === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { productId: product.id, quantity: 1, type: product.type, product }];
        });
    };

    const handleUpdateQty = (productId: string, delta: number) => {
        setCartItems((prev) =>
            prev.map((item) => {
                if (item.productId === productId) {
                    const newQty = Math.max(0, item.quantity + delta);
                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter(item => item.quantity > 0)
        );
    };

    const handleRemoveItem = (productId: string) => {
        setCartItems((prev) => prev.filter((item) => item.productId !== productId));
    };

    const handleClearCart = () => {
        setCartItems([]);
        setActiveOrderId(null);
        setGeneratedToken(null);
        setOrderMetadata({
            tableNo: '',
            customerName: '',
            customerPhone: '',
            deliveryAddress: ''
        });
        setIsMobileCartOpen(false);
    };

    const getProductQtyInCart = (productId: string) => {
        const item = cartItems.find((itm) => itm.productId === productId);
        return item ? item.quantity : 0;
    };

    const cartTotalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotalPrice = cartItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

    const handleOpenCheckout = () => {
        if (cartItems.length === 0) return;
        setIsCheckoutModalOpen(true);
    };

    const handleSendToKDS = async () => {
        if (cartItems.length === 0) return;

        try {
            setIsSubmitting(true);
            const totalAmount = cartItems.reduce(
                (sum, item) => sum + Number(item.product.price) * item.quantity,
                0
            );
            const payloadItems = cartItems.map(({ productId, quantity, type }) => ({
                productId,
                quantity,
                type,
            }));

            if (activeOrderId) {
                // Update existing order
                await api.updateOrderItems(activeOrderId, {
                    items: payloadItems,
                    totalAmount
                });
                toast.success('Order items updated successfully!');
            } else {
                // Create new UNPAID order
                const createdOrder = await api.createOrder({
                    items: payloadItems,
                    totalAmount,
                    paymentStatus: 'UNPAID',
                    orderType,
                    tableNo: orderMetadata.tableNo || undefined,
                    customerName: orderMetadata.customerName || undefined,
                    customerPhone: orderMetadata.customerPhone || undefined,
                    deliveryAddress: orderMetadata.deliveryAddress || undefined,
                });
                setActiveOrderId(createdOrder.id);
                setGeneratedToken(createdOrder.tokenId || null);
                if (createdOrder.tokenId) {
                    toast.success(`Order sent! Token: ${createdOrder.tokenId}`);
                } else {
                    toast.success('Order sent to KDS!');
                }
            }

            // IMMEDAITELY clear the cart so cashier can serve the next customer
            handleClearCart();
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                toast.error(`KDS Update Failed: ${error.response.data.message || 'Validation error'}`);
            } else {
                toast.error('An unexpected error occurred sending to KDS.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmCheckout = async (paymentDetails: any) => {
        try {
            setIsSubmitting(true);

            const totalAmount = cartItems.reduce(
                (sum, item) => sum + Number(item.product.price) * item.quantity,
                0
            );

            const payloadItems = cartItems.map(({ productId, quantity, type }) => ({
                productId,
                quantity,
                type,
            }));

            let createdOrderId = activeOrderId;

            if (activeOrderId) {
                // Determine whether to update items first (in case they changed after sending)
                await api.updateOrderItems(activeOrderId, { items: payloadItems, totalAmount });
                await api.payOrder(activeOrderId, paymentDetails);
            } else {
                const createdOrder = await api.createOrder({
                    items: payloadItems,
                    totalAmount,
                    paymentMethod: paymentDetails.method,
                    amountReceived: paymentDetails.amountReceived,
                    change: paymentDetails.change,
                    paymentStatus: 'PAID'
                });
                createdOrderId = createdOrder.id;
            }

            toast.success('Payment processed successfully!', {
                action: {
                    label: 'Print Receipt',
                    onClick: () => {
                        const fullReceiptData = {
                            items: cartItems,
                            totalAmount,
                            paymentMethod: paymentDetails.method,
                            amountReceived: paymentDetails.amountReceived,
                            change: paymentDetails.change
                        };
                        generatePDFReceipt(fullReceiptData, createdOrderId || 'NEW');
                    }
                },
                duration: 10000
            });

            setCartItems([]);
            setActiveOrderId(null);
            setIsMobileCartOpen(false);
            setIsCheckoutModalOpen(false);
            fetchProducts();

        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                toast.error(`Checkout Failed: ${error.response.data.message || 'Validation error'}`);
            } else {
                toast.error('An unexpected error occurred during checkout.');
            }
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex h-full w-full relative">
            {/* CENTER COLUMN: Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 w-full pb-20 md:pb-0 relative">

                {/* Top Header: Search & Profile */}
                <header className="px-4 md:px-8 pt-4 md:pt-8 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-8 z-10 shrink-0">
                    {/* Mobile Top Row: Profile */}
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
                        <button
                            onClick={() => setIsOpenOrdersModalOpen(true)}
                            className="relative bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors shadow-sm"
                        >
                            Open Orders
                            {readyOrdersCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-slate-50 shadow-sm animate-pulse">
                                    {readyOrdersCount}
                                </span>
                            )}
                        </button>
                        <button className="relative p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors bg-white border border-slate-200 shadow-sm">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </button>
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
                        <button
                            onClick={() => setIsOpenOrdersModalOpen(true)}
                            className="relative bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-700 transition shadow-sm"
                        >
                            Open Orders
                            {readyOrdersCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-50 shadow-sm animate-pulse">
                                    {readyOrdersCount}
                                </span>
                            )}
                        </button>
                        <button className="relative p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors bg-white border border-slate-200 shadow-sm">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </button>
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

                {/* Categories Section */}
                <div className="px-4 md:px-8 pb-4 shrink-0 mt-2">
                    {/* Row 1: Order Type Pills */}
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

                    {/* Header for Menu */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between xl:justify-start gap-4 mb-2 md:mb-4">
                        <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight block xl:mr-auto">
                            {activeFilter === 'ALL' ? 'All Menu' : activeFilter === ProductType.FOOD ? 'Food Menu' : 'Retail Options'}
                        </h2>

                        {/* Row 2: Product Filter Links */}
                        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex w-full sm:w-auto">
                            <button
                                onClick={() => setActiveFilter('ALL')}
                                className={`flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-1.5 text-xs md:text-sm font-bold rounded-lg transition-colors ${activeFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setActiveFilter(ProductType.FOOD)}
                                className={`flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-1.5 text-xs md:text-sm font-bold rounded-lg transition-colors ${activeFilter === ProductType.FOOD ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                Food
                            </button>
                            <button
                                onClick={() => setActiveFilter(ProductType.RETAIL)}
                                className={`flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-1.5 text-xs md:text-sm font-bold rounded-lg transition-colors ${activeFilter === ProductType.RETAIL ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                Retail
                            </button>
                        </div>
                    </div>
                </div>

                {/* Product Grid Area */}
                <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-32 md:pb-8 pt-2 scroll-smooth">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full pb-20">
                            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5 content-start">
                            {filteredProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    qtyInCart={getProductQtyInCart(product.id)}
                                    onAdd={() => handleAddToCart(product)}
                                    onUpdateQty={(delta) => handleUpdateQty(product.id, delta)}
                                />
                            ))}
                            {filteredProducts.length === 0 && (
                                <div className="col-span-full h-48 md:h-64 flex flex-col items-center justify-center text-slate-400 space-y-4">
                                    <div className="bg-white border shadow-sm p-4 rounded-full">
                                        <Search size={32} className="md:w-10 md:h-10 text-slate-300" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-base md:text-lg font-bold text-slate-600">No products found</p>
                                        <p className="text-xs md:text-sm font-medium mt-1">Try adjusting your filters or search query.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Floating Bottom Cart Summary for Mobile/Tablet (<1024px) */}
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
                                <div className="font-black text-xl">${cartTotalPrice.toFixed(1)}</div>
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                    &rarr;
                                </div>
                            </div>
                        </button>
                    </div>
                )}
            </main>

            {/* RIGHT COLUMN: Sidebar Cart (Desktop >= 1024px) */}
            <aside className="hidden lg:flex w-[380px] bg-white h-full shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-20 flex-shrink-0 flex-col border-l border-slate-100 relative">
                <Cart
                    items={cartItems}
                    onUpdateQty={handleUpdateQty}
                    onRemove={handleRemoveItem}
                    onClearCart={handleClearCart}
                    onCheckout={handleOpenCheckout}
                    onSendToKDS={handleSendToKDS}
                    isSubmitting={isSubmitting}
                    hasActiveOrder={!!activeOrderId}
                    orderType={orderType}
                    orderMetadata={orderMetadata}
                    setOrderMetadata={setOrderMetadata}
                    generatedToken={generatedToken}
                    onUpdateItemNote={(productId, note) => {
                        setCartItems(prev => prev.map(item => item.productId === productId ? { ...item, notes: note } : item));
                    }}
                />
            </aside>

            {/* Slide-Up Cart Drawer (Mobile/Tablet < 1024px) */}
            {isMobileCartOpen && (
                <div className="lg:hidden fixed inset-0 z-[100] flex flex-col justify-end bg-slate-900/40 backdrop-blur-sm">
                    {/* Dark overlay click to close */}
                    <div className="absolute inset-0" onClick={() => setIsMobileCartOpen(false)}></div>

                    {/* Drawer Content */}
                    <div className="relative bg-white w-full h-[85vh] md:h-[90vh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
                        <div className="absolute top-4 right-4 z-10 text-slate-400 p-2">
                            <button onClick={() => setIsMobileCartOpen(false)} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>
                        <Cart
                            items={cartItems}
                            onUpdateQty={handleUpdateQty}
                            onRemove={handleRemoveItem}
                            onClearCart={handleClearCart}
                            onCheckout={handleOpenCheckout}
                            onSendToKDS={handleSendToKDS}
                            isSubmitting={isSubmitting}
                            hasActiveOrder={!!activeOrderId}
                            orderType={orderType}
                            orderMetadata={orderMetadata}
                            setOrderMetadata={setOrderMetadata}
                            generatedToken={generatedToken}
                            onUpdateItemNote={(productId, note) => {
                                setCartItems(prev => prev.map(item => item.productId === productId ? { ...item, notes: note } : item));
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            <CheckoutModal
                isOpen={isCheckoutModalOpen}
                onClose={() => setIsCheckoutModalOpen(false)}
                totalAmount={cartTotalPrice + (cartTotalPrice * 0.04)}
                onConfirm={handleConfirmCheckout}
            />

            {/* Open Orders Modal */}
            <OpenOrdersModal
                isOpen={isOpenOrdersModalOpen}
                onClose={() => setIsOpenOrdersModalOpen(false)}
                onSelectOrder={(order) => {
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
                        quantity: item.quantity,
                        type: item.product?.type || ProductType.FOOD,
                        product: item.product,
                        notes: item.notes || ''
                    })) || []);
                    setIsOpenOrdersModalOpen(false);
                    fetchReadyOrders(); // Update count when an order is opened
                }}
            />
        </div>
    );
}

// Helper Pill Category Component
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
