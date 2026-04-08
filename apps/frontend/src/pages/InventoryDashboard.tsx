import { useState, useEffect } from 'react';
import { api } from '../api';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, AlertTriangle, Search, X } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

interface Ingredient {
    id: string;
    name: string;
    stockQty: string;
    unitOfMeasure: string;
    minLevel: string;
}

interface Product {
    id: string;
    name: string;
    price: string;
    type: string;
}

interface RetailStock {
    id: string;
    productId: string;
    stockQty: number;
    supplierDetails: string;
    product: Product;
}

interface RecipeBOM {
    id: string;
    productId: string;
    ingredientId: string;
    quantity: string;
    product: Product;
    ingredient: Ingredient;
}

type TabType = 'INGREDIENTS' | 'RETAIL' | 'BOM';

export function InventoryDashboard() {
    const [activeTab, setActiveTab] = useState<TabType>('INGREDIENTS');

    // Data States
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [retailStock, setRetailStock] = useState<RetailStock[]>([]);
    const [boms, setBoms] = useState<RecipeBOM[]>([]);
    const [foodProducts, setFoodProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { socket } = useSocket();

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    // --- Real-time Listeners ---
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            console.log('Real-time: Inventory/Order updated, refreshing data...');
            fetchData();
        };

        socket.on('INVENTORY_UPDATED', handleUpdate);
        socket.on('ORDER_UPDATED', handleUpdate);

        return () => {
            socket.off('INVENTORY_UPDATED', handleUpdate);
            socket.off('ORDER_UPDATED', handleUpdate);
        };
    }, [socket]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'INGREDIENTS') {
                const data = await api.getIngredients();
                setIngredients(data);
            } else if (activeTab === 'RETAIL') {
                const [stockData, catData] = await Promise.all([
                    api.getRetailStock(),
                    api.getCategories()
                ]);
                setRetailStock(stockData);
                setCategories(catData);
            } else if (activeTab === 'BOM') {
                const [bomData, prodData] = await Promise.all([
                    api.getRecipeBOMs(),
                    api.getProducts()
                ]);
                setBoms(bomData);
                setFoodProducts(prodData.filter(p => p.type === 'FOOD'));
                // Fetch ingredients too for the BOM dropdown
                if (ingredients.length === 0) {
                    const ingData = await api.getIngredients();
                    setIngredients(ingData);
                }
            }
        } catch (error) {
            toast.error('Failed to load inventory data');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
            {/* Header */}
            <header className="px-8 py-6 bg-white border-b border-slate-200 shrink-0">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Inventory Management</h1>
                        <p className="text-sm font-medium text-slate-500 mt-1">Manage ingredients, retail stock, and recipes</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2">
                    {[
                        { id: 'INGREDIENTS', label: 'Ingredients' },
                        { id: 'RETAIL', label: 'Retail Stock' },
                        { id: 'BOM', label: 'Recipe BOM' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-colors ${activeTab === tab.id
                                ? 'bg-slate-800 text-white shadow-md'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-auto p-8 relative">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'INGREDIENTS' && (
                            <IngredientsView
                                data={ingredients}
                                onRefresh={fetchData}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                            />
                        )}
                        {activeTab === 'RETAIL' && (
                            <RetailView
                                data={retailStock}
                                categories={categories}
                                onRefresh={fetchData}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                            />
                        )}
                        {activeTab === 'BOM' && (
                            <BOMView
                                boms={boms}
                                ingredients={ingredients}
                                foodProducts={foodProducts}
                                onRefresh={fetchData}
                            />
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

// -------------------------------------------------------------------------
// Ingredients View
// -------------------------------------------------------------------------
function IngredientsView({ data, onRefresh, searchQuery, setSearchQuery }: any) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Ingredient | null>(null);

    const filtered = data.filter((item: Ingredient) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) {
            try {
                await api.deleteIngredient(id);
                toast.success('Ingredient deleted');
                onRefresh();
            } catch (error) {
                toast.error('Failed to delete ingredient');
            }
        }
    };

    const handleSave = async (formData: any) => {
        try {
            if (editingItem) {
                await api.updateIngredient(editingItem.id, formData);
                toast.success('Ingredient updated');
            } else {
                await api.createIngredient(formData);
                toast.success('Ingredient created');
            }
            setIsModalOpen(false);
            setEditingItem(null);
            onRefresh();
        } catch (error) {
            toast.error('Failed to save ingredient');
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search ingredients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800/20"
                    />
                </div>
                <button
                    onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm shadow-sm"
                >
                    <Plus size={18} /> Add Ingredient
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                            <th className="p-4 pl-6">Name</th>
                            <th className="p-4">Stock Qty</th>
                            <th className="p-4">Unit</th>
                            <th className="p-4">Min Level</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right pr-6">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
                        {filtered.map((item: Ingredient) => {
                            const isLow = Number(item.stockQty) <= Number(item.minLevel);
                            return (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 pl-6 font-bold text-slate-900">{item.name}</td>
                                    <td className="p-4">{Number(item.stockQty).toFixed(2)}</td>
                                    <td className="p-4">{item.unitOfMeasure}</td>
                                    <td className="p-4">{Number(item.minLevel).toFixed(2)}</td>
                                    <td className="p-4">
                                        {isLow ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                                                <AlertTriangle size={12} /> Low Stock
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                                                Healthy
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 pr-6 flex justify-end gap-2">
                                        <button
                                            onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id, item.name)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500">No ingredients found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <IngredientModal
                    initialData={editingItem}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

function IngredientModal({ initialData, onClose, onSave }: any) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        stockQty: initialData ? Number(initialData.stockQty) : 0,
        unitOfMeasure: initialData?.unitOfMeasure || 'GRAMS',
        minLevel: initialData ? Number(initialData.minLevel) : 0,
    });

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-black text-slate-800">
                        {initialData ? 'Edit Ingredient' : 'New Ingredient'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Name</label>
                        <input
                            required type="text"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-medium"
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Current Stock</label>
                            <input
                                required type="number" step="0.01" min="0"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium"
                                value={formData.stockQty} onChange={e => setFormData({ ...formData, stockQty: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Unit (e.g. GRAMS)</label>
                            <input
                                required type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium uppercase"
                                value={formData.unitOfMeasure} onChange={e => setFormData({ ...formData, unitOfMeasure: e.target.value.toUpperCase() })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Minimum Level (Alert Trigger)</label>
                        <input
                            required type="number" step="0.01" min="0"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium"
                            value={formData.minLevel} onChange={e => setFormData({ ...formData, minLevel: Number(e.target.value) })}
                        />
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                        <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors shadow-md">
                            {initialData ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// -------------------------------------------------------------------------
// Retail View
// -------------------------------------------------------------------------
function RetailView({ data, categories, onRefresh, searchQuery, setSearchQuery }: any) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<RetailStock | null>(null);

    const filtered = data.filter((item: RetailStock) =>
        item.product?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete ${name}? This will also remove the item from the POS menu. This cannot be undone.`)) {
            try {
                await api.deleteRetailStock(id);
                toast.success('Retail item deleted');
                onRefresh();
            } catch (error) {
                toast.error('Failed to delete retail item');
            }
        }
    };

    const handleSave = async (formData: any) => {
        try {
            if (editingItem) {
                await api.updateRetailStock(editingItem.id, formData);
                toast.success('Retail item updated');
            } else {
                await api.createRetailStock(formData);
                toast.success('Retail item created');
            }
            setIsModalOpen(false);
            setEditingItem(null);
            onRefresh();
        } catch (error) {
            toast.error('Failed to save retail item');
        }
    };

    const handleQuickStockUpdate = async (item: RetailStock, delta: number) => {
        const newStock = Math.max(0, item.stockQty + delta);
        if (newStock === item.stockQty) return;
        try {
            await api.updateRetailStock(item.id, { stockQty: newStock });
            toast.success(`Stock updated for ${item.product.name}`);
            onRefresh(); // To keep it simple, we re-fetch. Optimistic UI could be added.
        } catch (error) {
            toast.error('Failed to update stock');
        }
    }

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search retail items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800/20"
                    />
                </div>
                <button
                    onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm shadow-sm"
                >
                    <Plus size={18} /> Add Retail Item
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                            <th className="p-4 pl-6 w-1/3">Product Name</th>
                            <th className="p-4">Price</th>
                            <th className="p-4">Physical Stock Count</th>
                            <th className="p-4">Supplier</th>
                            <th className="p-4 text-right pr-6">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
                        {filtered.map((item: RetailStock) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 pl-6 font-bold text-slate-900">{item.product?.name}</td>
                                <td className="p-4">Rs. {Number(item.product?.price || 0).toFixed(2)}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleQuickStockUpdate(item, -1)}
                                            className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center font-bold transition-colors"
                                        >-</button>
                                        <span className="w-8 text-center font-black text-slate-900 text-base">{item.stockQty}</span>
                                        <button
                                            onClick={() => handleQuickStockUpdate(item, 1)}
                                            className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center font-bold transition-colors"
                                        >+</button>
                                    </div>
                                </td>
                                <td className="p-4 text-slate-500 truncate max-w-[150px]">{item.supplierDetails || '-'}</td>
                                <td className="p-4 pr-6 flex justify-end gap-2">
                                    <button
                                        onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id, item.product?.name)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        )
                        )}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500">No retail stock found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <RetailModal
                    initialData={editingItem}
                    categories={categories}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

function RetailModal({ initialData, categories, onClose, onSave }: any) {
    const [formData, setFormData] = useState({
        name: initialData?.product?.name || '',
        price: initialData?.product ? Number(initialData.product.price) : 0,
        stockQty: initialData ? initialData.stockQty : 0,
        supplierDetails: initialData?.supplierDetails || '',
        imageUrl: initialData?.product?.imageUrl || null,
        categoryId: initialData?.product?.categoryId || '',
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsUploading(true);
            let uploadedImageUrl = formData.imageUrl;
            if (selectedFile) {
                const response = await api.uploadProductImage(selectedFile);
                uploadedImageUrl = response.imageUrl;
            }
            onSave({ ...formData, imageUrl: uploadedImageUrl });
        } catch (error) {
            toast.error('Failed to upload image');
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-black text-slate-800">
                        {initialData ? 'Edit Retail Item' : 'New Retail Item'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Product Name</label>
                        <input
                            required type="text"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all font-medium"
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Selling Price (Rs.)</label>
                            <input
                                required type="number" step="0.01" min="0"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 font-medium"
                                value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Initial Stock</label>
                            <input
                                required type="number" min="0" step="1"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 font-medium"
                                value={formData.stockQty} onChange={e => setFormData({ ...formData, stockQty: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
                        <select
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 font-medium"
                            value={formData.categoryId}
                            onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                        >
                            <option value="">No Category</option>
                            {categories?.map((cat: any) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Supplier Details (Optional)</label>
                        <textarea
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 font-medium resize-none h-24"
                            value={formData.supplierDetails} onChange={e => setFormData({ ...formData, supplierDetails: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Product Image (Optional)</label>
                        <input
                            type="file" accept="image/*"
                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 transition-colors"
                            onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                        />
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors" disabled={isUploading}>Cancel</button>
                        <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors shadow-md disabled:bg-slate-400" disabled={isUploading}>
                            {isUploading ? 'Uploading...' : (initialData ? 'Update' : 'Create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// -------------------------------------------------------------------------
// BOM View
// -------------------------------------------------------------------------
function BOMView({ boms, ingredients, foodProducts, onRefresh }: any) {
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isAddMode, setIsAddMode] = useState(false);
    const [newBomData, setNewBomData] = useState({ ingredientId: '', quantity: '' });

    // Filter BOMs for selected product
    const productBoms = boms.filter((b: RecipeBOM) => b.productId === selectedProduct?.id);

    const handleAddBom = async () => {
        if (!selectedProduct || !newBomData.ingredientId || !newBomData.quantity) return;
        try {
            await api.createRecipeBOM({
                productId: selectedProduct.id,
                ingredientId: newBomData.ingredientId,
                quantity: Number(newBomData.quantity)
            });
            toast.success('Ingredient added to recipe');
            setNewBomData({ ingredientId: '', quantity: '' });
            setIsAddMode(false);
            onRefresh();
        } catch (error) {
            toast.error('Failed to add to recipe');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.deleteRecipeBOM(id);
            toast.success('Removed from recipe');
            onRefresh();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    return (
        <div className="h-full flex gap-6">
            {/* Left side: Product List */}
            <div className="w-1/3 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-800">Food Menu Items</h3>
                </div>
                <div className="flex-1 overflow-y-auto w-full">
                    {foodProducts.map((p: Product) => (
                        <div
                            key={p.id}
                            onClick={() => { setSelectedProduct(p); setIsAddMode(false); }}
                            className={`p-4 border-b border-slate-50 cursor-pointer transition-colors flex items-center justify-between ${selectedProduct?.id === p.id ? 'bg-orange-50/80 border-l-4 border-l-orange-500' : 'hover:bg-slate-50'
                                }`}
                        >
                            <span className="font-bold text-slate-800 text-sm w-full truncate pr-2" title={p.name}>{p.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right side: BOM Details */}
            <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative">
                {!selectedProduct ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        <AlertTriangle size={48} className="mb-4 text-slate-200" />
                        <p className="font-medium text-lg">Select a food item</p>
                        <p className="text-sm">to view or edit its recipe</p>
                    </div>
                ) : (
                    <>
                        <div className="p-6 border-b border-slate-100 bg-orange-50/30 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{selectedProduct.name}</h2>
                                <p className="text-sm font-medium text-slate-500 mt-1">Recipe Bill of Materials</p>
                            </div>
                            {!isAddMode && (
                                <button
                                    onClick={() => setIsAddMode(true)}
                                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm shadow-sm"
                                >
                                    <Plus size={16} /> Add Ingredient
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            {isAddMode && (
                                <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex gap-3 items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Select Ingredient</label>
                                        <select
                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-medium text-sm text-slate-800"
                                            value={newBomData.ingredientId} onChange={e => setNewBomData({ ...newBomData, ingredientId: e.target.value })}
                                        >
                                            <option value="">-- Choose --</option>
                                            {ingredients.map((i: any) => (
                                                <option key={i.id} value={i.id}>{i.name} ({i.unitOfMeasure})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-32">
                                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Req. Qty</label>
                                        <input
                                            type="number" step="0.01" min="0" placeholder="0.00"
                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-medium text-sm text-slate-800"
                                            value={newBomData.quantity} onChange={e => setNewBomData({ ...newBomData, quantity: e.target.value })}
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddBom}
                                        className="h-10 px-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors text-sm"
                                    >Save</button>
                                    <button
                                        onClick={() => setIsAddMode(false)}
                                        className="h-10 px-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                                    >Cancel</button>
                                </div>
                            )}

                            {productBoms.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">No ingredients mapped to this recipe yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {productBoms.map((bom: RecipeBOM) => (
                                        <div key={bom.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-slate-300 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-black text-lg border border-orange-200 inner-shadow">
                                                    {Number(bom.quantity).toString().replace(/\.?0+$/, '')}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{bom.ingredient?.name}</p>
                                                    <p className="text-xs font-medium text-slate-500 mt-0.5 uppercase tracking-wider">{bom.ingredient?.unitOfMeasure}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(bom.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
