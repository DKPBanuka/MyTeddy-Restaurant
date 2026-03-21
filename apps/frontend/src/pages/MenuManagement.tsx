import { useState, useEffect } from 'react';
import { api } from '../api';
import type { Category, Product } from '../types';
import { ProductType } from '../types';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Save, X, Layers, ShoppingBag, Search, Upload, Loader2, Calendar as CalendarIcon, Package as PackageIcon } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export function MenuManagement() {
    const queryClient = useQueryClient();

    // Form States
    const [catName, setCatName] = useState('');
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'CATEGORIES' | 'PRODUCTS' | 'GLOBAL_ADDONS' | 'PACKAGES'>('CATEGORIES');

    // Queries
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: () => api.getCategories(),
    });

    const { data: products = [] } = useQuery({
        queryKey: ['products'],
        queryFn: () => api.getProducts(),
    });

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['packages'] });
        queryClient.invalidateQueries({ queryKey: ['global-addons'] });
    };

    const handleCreateCategory = async () => {
        if (!catName.trim()) return;
        try {
            if (editingCatId) {
                await api.updateCategory(editingCatId, catName);
                toast.success('Category updated');
            } else {
                await api.createCategory(catName);
                toast.success('Category created');
            }
            setCatName('');
            setEditingCatId(null);
            invalidateAll();
        } catch (error) {
            toast.error('Operation failed');
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Are you sure? This may affect linked products.')) return;
        try {
            await api.deleteCategory(id);
            toast.success('Category removed');
            invalidateAll();
        } catch (error) {
            toast.error('Failed to delete category');
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Menu Management</h1>
                    <p className="text-slate-500 font-medium">Configure your restaurant categories and items.</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                    <button
                        onClick={() => setActiveTab('CATEGORIES')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'CATEGORIES' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Categories
                    </button>
                    <button
                        onClick={() => setActiveTab('PRODUCTS')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'PRODUCTS' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Products
                    </button>
                    <button
                        onClick={() => setActiveTab('GLOBAL_ADDONS')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'GLOBAL_ADDONS' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Global Add-ons
                    </button>
                    <button
                        onClick={() => setActiveTab('PACKAGES')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'PACKAGES' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Packages
                    </button>
                </div>
            </header>

            {activeTab === 'CATEGORIES' && (
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Category Creation Form */}
                    <div className="md:col-span-1">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-8">
                            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Layers size={20} className="text-blue-500" />
                                {editingCatId ? 'Edit Category' : 'New Category'}
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Category Name</label>
                                    <input
                                        type="text"
                                        value={catName}
                                        onChange={(e) => setCatName(e.target.value)}
                                        placeholder="e.g. Appetizers"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-semibold"
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={handleCreateCategory}
                                        disabled={!catName.trim()}
                                        className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
                                    >
                                        {editingCatId ? <Save size={18} /> : <Plus size={18} />}
                                        {editingCatId ? 'Update' : 'Create'}
                                    </button>
                                    {editingCatId && (
                                        <button
                                            onClick={() => { setEditingCatId(null); setCatName(''); }}
                                            className="bg-slate-100 text-slate-500 p-3 rounded-xl hover:bg-slate-200 transition-all"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Categories List */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            {categories.map((cat) => (
                                <div key={cat.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                                {cat.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800">{cat.name}</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditingCatId(cat.id); setCatName(cat.name); }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(cat.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'PRODUCTS' && (
                <ProductList categories={categories} products={products} onRefresh={invalidateAll} />
            )}

            {activeTab === 'GLOBAL_ADDONS' && (
                <GlobalAddonsManager categories={categories} onRefresh={invalidateAll} />
            )}

            {activeTab === 'PACKAGES' && (
                <PackagesManager products={products} onRefresh={invalidateAll} />
            )}
        </div>
    );
}

function ProductList({ categories, products, onRefresh }: { categories: Category[], products: Product[], onRefresh: () => void }) {
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.category?.name?.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this product?')) return;
        try {
            await api.deleteProduct(id);
            toast.success('Product removed');
            onRefresh();
        } catch (error) {
            toast.error('Deletion failed');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-md flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-semibold shadow-sm text-sm"
                        />
                    </div>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-semibold shadow-sm text-sm min-w-[150px]"
                    >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
                    className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-all shadow-lg"
                >
                    <Plus size={18} /> Add Product
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-bottom border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((prod) => (
                                <tr key={prod.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            {prod.imageUrl ? (
                                                <img src={prod.imageUrl} className="w-10 h-10 rounded-lg object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <ShoppingBag size={18} />
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm">{prod.name}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{prod.type}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                                        {prod.category?.name || <span className="text-slate-300 italic">Uncategorized</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-black text-slate-800">
                                        Rs. {Number(prod.price).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${prod.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {prod.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditingProduct(prod); setIsModalOpen(true); }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(prod.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <ProductModal
                    categories={categories}
                    initialData={editingProduct}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => { setIsModalOpen(false); onRefresh(); }}
                />
            )}
        </div>
    );
}

function ProductModal({ categories, initialData, onClose, onSuccess }: { categories: Category[], initialData: Product | null, onClose: () => void, onSuccess: () => void }) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        price: initialData?.price ? Number(initialData.price) : 0,
        type: initialData?.type || ProductType.FOOD,
        categoryId: initialData?.categoryId || '',
        description: initialData?.description || '',
        imageUrl: initialData?.imageUrl || '',
    });
    const [sizes, setSizes] = useState<{ name: string, price: number }[]>(
        initialData?.sizes?.map((s: any) => ({ name: s.name, price: Number(s.price) })) || []
    );
    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const { imageUrl } = await api.uploadProductImage(file);
            setFormData(prev => ({ ...prev, imageUrl }));
            toast.success('Image uploaded successfully');
        } catch (error) {
            toast.error('Failed to upload image');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const productData = {
                ...formData,
                price: formData.price.toString(),
                categoryId: formData.categoryId || null,
                sizes,
            };
            if (initialData) {
                await api.updateProduct(initialData.id, productData as any);
                toast.success('Product updated');
            } else {
                await api.createProduct(productData as any);
                toast.success('Product created');
            }
            onSuccess();
        } catch (error) {
            toast.error('Save failed');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800">{initialData ? 'Edit Product' : 'Add New Product'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto">
                    {/* Image Upload Section */}
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 group hover:border-blue-400 hover:bg-blue-50/30 transition-all relative overflow-hidden h-48">
                        {formData.imageUrl ? (
                            <>
                                <img src={formData.imageUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <label className="p-3 bg-white rounded-xl text-slate-800 cursor-pointer hover:scale-110 transition-transform shadow-lg">
                                        <Upload size={20} />
                                        <input type="file" className="hidden" aria-label='Upload product image' accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                                    </label>
                                    <button 
                                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                                        className="p-3 bg-white rounded-xl text-red-500 hover:scale-110 transition-transform shadow-lg"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <label className="flex flex-col items-center gap-3 cursor-pointer">
                                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all">
                                    {isUploading ? <Loader2 size={32} className="animate-spin text-blue-500" /> : <Upload size={32} />}
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-slate-700">Click to upload image</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">JPG, PNG or WEBP (Max 5MB)</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" aria-label="Upload product image" onChange={handleImageUpload} disabled={isUploading} />
                            </label>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Product Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-semibold text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Price (Rs.)</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-semibold text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as ProductType })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-semibold text-sm appearance-none"
                            >
                                <option value={ProductType.FOOD}>Food</option>
                                <option value={ProductType.RETAIL}>Retail</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Category</label>
                            <select
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-semibold text-sm appearance-none"
                            >
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Variants Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Product Sizes</h3>
                            <button 
                                onClick={() => setSizes([...sizes, { name: '', price: 0 }])}
                                className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1"
                            >
                                <Plus size={14} /> Add Size
                            </button>
                        </div>
                        <div className="space-y-2">
                            {sizes.map((s, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <input 
                                        placeholder="Size Name (e.g. Small)"
                                        value={s.name}
                                        onChange={(e) => {
                                            const newS = [...sizes];
                                            newS[i].name = e.target.value;
                                            setSizes(newS);
                                        }}
                                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                                    />
                                    <input 
                                        type="number"
                                        placeholder="Price"
                                        value={s.price}
                                        onChange={(e) => {
                                            const newS = [...sizes];
                                            newS[i].price = Number(e.target.value);
                                            setSizes(newS);
                                        }}
                                        className="w-24 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                                    />
                                    <button onClick={() => setSizes(sizes.filter((_, idx) => idx !== i))} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                            {sizes.length === 0 && <p className="text-xs text-slate-400 italic">No sizes added. Product will use the base price.</p>}
                        </div>
                    </div>
                </div>
                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 px-6 py-3 font-bold text-slate-500 border border-slate-200 rounded-2xl hover:bg-white transition-all">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} className="flex-1 px-6 py-3 font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">
                        Save Product
                    </button>
                </div>
            </div>
        </div>
    );
}

function GlobalAddonsManager({ categories, onRefresh }: { categories: Category[], onRefresh: () => void }) {
    const [addons, setAddons] = useState<any[]>([]);
    const [name, setName] = useState('');
    const [price, setPrice] = useState(0);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [filterCategoryId, setFilterCategoryId] = useState<string>('all');

    useEffect(() => {
        fetchAddons();
    }, []);

    const fetchAddons = async () => {
        const data = await api.getGlobalAddons();
        setAddons(data);
    };

    const handleSubmit = async () => {
        if (!name) return;
        try {
            if (editingId) {
                await api.updateGlobalAddon(editingId, { name, price, categoryIds: selectedCategoryIds });
                toast.success('Add-on updated');
            } else {
                await api.createGlobalAddon({ name, price, categoryIds: selectedCategoryIds });
                toast.success('Add-on created');
            }
            setName('');
            setPrice(0);
            setSelectedCategoryIds([]);
            setEditingId(null);
            fetchAddons();
            onRefresh();
        } catch (error) {
            toast.error('Operation failed');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this add-on?')) return;
        await api.deleteGlobalAddon(id);
        toast.success('Add-on deleted');
        fetchAddons();
        onRefresh();
    };
    const filteredAddons = addons.filter(a => {
        if (filterCategoryId === 'all') return true;
        return a.categories?.some((c: any) => c.id === filterCategoryId);
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto max-w-full">
                    <button
                        onClick={() => setFilterCategoryId('all')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterCategoryId === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        All Categories
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setFilterCategoryId(cat.id)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterCategoryId === cat.id ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
                <h3 className="text-lg font-bold mb-4">{editingId ? 'Edit Add-on' : 'New Global Add-on'}</h3>
                <div className="space-y-4">
                    <input 
                        placeholder="Add-on Name" 
                        value={name} 
                        onChange={e => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none"
                    />
                    <input 
                        type="number" 
                        placeholder="Price" 
                        value={price} 
                        onChange={e => setPrice(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none"
                    />

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Apply to Categories</label>
                        <div className="flex flex-wrap gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        setSelectedCategoryIds(prev => 
                                            prev.includes(cat.id) 
                                                ? prev.filter(id => id !== cat.id) 
                                                : [...prev, cat.id]
                                        );
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                        selectedCategoryIds.includes(cat.id)
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400'
                                    }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button onClick={handleSubmit} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">
                        {editingId ? 'Update' : 'Create'}
                    </button>
                    {editingId && (
                        <button 
                            onClick={() => { 
                                setEditingId(null); 
                                setName(''); 
                                setPrice(0); 
                                setSelectedCategoryIds([]); 
                            }} 
                            className="w-full text-slate-500 font-bold"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
            <div className="md:col-span-2 space-y-3">
                {filteredAddons.map(a => (
                    <div key={a.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center group hover:border-blue-200 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-800 truncate">{a.name}</div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {a.categories?.map((c: any) => (
                                        <span key={c.id} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-tighter inline-block">
                                            {c.name}
                                        </span>
                                    ))}
                                    {(!a.categories || a.categories.length === 0) && (
                                        <span className="text-[9px] font-bold text-slate-300 italic">Global</span>
                                    )}
                                </div>
                            </div>
                            <div className="text-sm font-black text-slate-900 px-4 whitespace-nowrap">
                                Rs. {Number(a.price).toFixed(2)}
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => { 
                                    setEditingId(a.id); 
                                    setName(a.name); 
                                    setPrice(Number(a.price)); 
                                    setSelectedCategoryIds(a.categories?.map((c: any) => c.id) || []);
                                }} 
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button 
                                onClick={() => handleDelete(a.id)} 
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
                {filteredAddons.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                        <Layers size={32} className="mb-2 opacity-20" />
                        <p className="text-sm font-bold">No add-ons found for this category</p>
                    </div>
                )}
            </div>
        </div>
    </div>
    );
}

function PackagesManager({ products, onRefresh }: { products: Product[], onRefresh: () => void }) {
    const [packages, setPackages] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState<any | null>(null);

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        const data = await api.getPackages();
        setPackages(data);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this package?')) return;
        await api.deletePackage(id);
        toast.success('Package deleted');
        fetchPackages();
        onRefresh();
    };

    return (
        <div className="space-y-6">
            <button 
                onClick={() => { setEditingPackage(null); setIsModalOpen(true); }}
                className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg"
            >
                <Plus size={18} /> Add Package
            </button>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map(pkg => {
                    // Calculate "Laabaya" (Savings)
                    const individualTotal = pkg.items?.reduce((sum: number, pkgItem: any) => {
                        const product = products.find(p => p.id === pkgItem.productId);
                        const size = product?.sizes?.find((s: any) => s.id === pkgItem.sizeId);
                        const price = size ? parseFloat(size.price) : parseFloat(product?.price || '0');
                        return sum + (price * pkgItem.quantity);
                    }, 0) || 0;
                    const laabaya = individualTotal - parseFloat(pkg.price || '0');

                    return (
                        <div key={pkg.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col">
                            <div className="relative h-40 overflow-hidden">
                                {pkg.imageUrl ? (
                                    <img src={pkg.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200">
                                        <PackageIcon size={48} />
                                    </div>
                                )}
                                {laabaya > 0 && (
                                    <div className="absolute bottom-3 left-3 bg-green-500 text-white px-2 py-1 rounded-lg font-black text-[8px] uppercase tracking-widest shadow-lg shadow-green-500/20">
                                        Save Rs. {laabaya.toLocaleString()}
                                    </div>
                                )}
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-800">{pkg.name}</h3>
                                    <span className="text-blue-600 font-black">Rs. {Number(pkg.price).toFixed(2)}</span>
                                </div>
                                
                                <div className="mt-2 space-y-1 mb-4">
                                    <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1.5">Includes:</p>
                                    <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100/50">
                                        {pkg.items?.map((pkgI: any, idx: number) => {
                                            const product = products.find(p => p.id === pkgI.productId);
                                            return (
                                                <div key={idx} className="text-[9px] font-bold text-slate-600 flex justify-between gap-2 mb-1 last:mb-0">
                                                    <span className="truncate">{product?.name || 'Unknown Item'}</span>
                                                    <span className="text-slate-400 shrink-0">x{pkgI.quantity}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <p className="text-sm text-slate-500 mb-4 line-clamp-2 italic">{pkg.description || 'Premium selection.'}</p>
                                <div className="flex justify-end gap-2 mt-auto">
                                    <button onClick={() => { setEditingPackage(pkg); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(pkg.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {isModalOpen && (
                <PackageModal 
                    initialData={editingPackage} 
                    onClose={() => setIsModalOpen(false)} 
                    onSuccess={() => { setIsModalOpen(false); fetchPackages(); onRefresh(); }} 
                />
            )}
        </div>
    );
}

function PackageModal({ initialData, onClose, onSuccess }: { initialData: any | null, onClose: () => void, onSuccess: () => void }) {
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        description: initialData?.description || '',
        price: initialData?.price ? Number(initialData.price) : 0,
        imageUrl: initialData?.imageUrl || '',
        isActive: initialData?.isActive ?? true,
        validFrom: initialData?.validFrom ? new Date(initialData.validFrom).toISOString().slice(0, 16) : '',
        validUntil: initialData?.validUntil ? new Date(initialData.validUntil).toISOString().slice(0, 16) : ''
    });
    const [showCalendar, setShowCalendar] = useState(false);
    const [items, setItems] = useState<{ productId: string, sizeId: string | null, quantity: number }[]>(
        initialData?.items?.map((it: any) => ({
            productId: it.productId,
            sizeId: it.sizeId || null,
            quantity: it.quantity
        })) || []
    );
    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const { imageUrl } = await api.uploadProductImage(file);
            setFormData(prev => ({ ...prev, imageUrl }));
            toast.success('Image uploaded successfully');
        } catch (error) {
            toast.error('Failed to upload image');
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        api.getProducts().then(setAllProducts);
    }, []);

    const addItem = () => {
        setItems([...items, { productId: '', sizeId: null, quantity: 1 }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        // Reset size if product changes
        if (field === 'productId') {
            newItems[index].sizeId = null;
        }
        setItems(newItems);
    };

    const handleSubmit = async () => {
        if (!formData.name || items.length === 0) {
            toast.error('Please provide a name and at least one item');
            return;
        }
        try {
            const payload = { 
                ...formData, 
                items,
                validFrom: formData.validFrom || null,
                validUntil: formData.validUntil || null
            };
            if (initialData) {
                await api.updatePackage(initialData.id, payload);
                toast.success('Package updated');
            } else {
                await api.createPackage(payload);
                toast.success('Package created');
            }
            onSuccess();
        } catch (error) {
            toast.error('Operation failed');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800">{initialData ? 'Edit Package bundle' : 'New Package Bundle'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>
                
                <div className="p-8 space-y-6 overflow-y-auto">
                    {/* Image Upload Section */}
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 group hover:border-blue-400 hover:bg-blue-50/30 transition-all relative overflow-hidden h-44">
                        {formData.imageUrl ? (
                            <>
                                <img src={formData.imageUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <label className="p-3 bg-white rounded-xl text-slate-800 cursor-pointer hover:scale-110 transition-transform shadow-lg">
                                        <Upload size={20} />
                                        <input type="file" className="hidden" aria-label='Upload bundle image' accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                                    </label>
                                    <button 
                                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                                        className="p-3 bg-white rounded-xl text-red-500 hover:scale-110 transition-transform shadow-lg"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <label className="flex flex-col items-center gap-3 cursor-pointer">
                                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all">
                                    {isUploading ? <Loader2 size={24} className="animate-spin text-blue-500" /> : <Upload size={24} />}
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-slate-700">Click to upload bundle image</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">JPG, PNG or WEBP (Max 5MB)</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" aria-label="Upload bundle image" onChange={handleImageUpload} disabled={isUploading} />
                            </label>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Package Name</label>
                            <input 
                                placeholder="Combo Meal Title" 
                                value={formData.name} 
                                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-blue-500" 
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Description</label>
                            <textarea 
                                placeholder="What's included in this bundle?" 
                                value={formData.description} 
                                onChange={e => setFormData({ ...formData, description: e.target.value })} 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-blue-500" 
                                rows={2} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Bundle Price (Rs.)</label>
                            <input 
                                type="number" 
                                placeholder="0.00" 
                                value={formData.price} 
                                onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black outline-none focus:border-blue-500" 
                            />
                        </div>
                        <div className="col-span-1 border-r border-slate-100 pr-4">
                            <label className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">
                                Valid From
                                <button onClick={() => setShowCalendar(!showCalendar)} className="text-blue-500 hover:text-blue-700 transition-colors">
                                    <CalendarIcon size={14} />
                                </button>
                            </label>
                            <input 
                                type="datetime-local" 
                                value={formData.validFrom} 
                                onChange={e => setFormData({ ...formData, validFrom: e.target.value })} 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-blue-500" 
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Valid Until</label>
                            <input 
                                type="datetime-local" 
                                value={formData.validUntil} 
                                onChange={e => setFormData({ ...formData, validUntil: e.target.value })} 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-blue-500" 
                            />
                        </div>

                        {showCalendar && (
                            <div className="col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center">
                                <div className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Select Validity Range</div>
                                <Calendar 
                                    selectRange={true}
                                    onChange={(value: any) => {
                                        if (Array.isArray(value)) {
                                            const [start, end] = value;
                                            setFormData({
                                                ...formData,
                                                validFrom: start ? new Date(start.setHours(0,0,0,0)).toISOString().slice(0, 16) : '',
                                                validUntil: end ? new Date(end.setHours(23,59,59,999)).toISOString().slice(0, 16) : ''
                                            });
                                        }
                                    }}
                                    value={formData.validFrom && formData.validUntil ? [new Date(formData.validFrom), new Date(formData.validUntil)] : null}
                                    className="rounded-xl border-none shadow-sm"
                                />
                                <style>{`
                                    .react-calendar { width: 100%; max-width: 400px; background: white; border: 1px solid #f1f5f9 !important; border-radius: 1rem; padding: 1rem; }
                                    .react-calendar__tile--active { background: #3b82f6 !important; border-radius: 0.5rem; }
                                    .react-calendar__tile--rangeBetween { background: #eff6ff !important; color: #3b82f6; }
                                `}</style>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Layers size={16} className="text-blue-500" /> Bundle Contents
                            </h3>
                            <button 
                                onClick={addItem}
                                className="text-blue-600 text-xs font-bold hover:underline py-1 px-3 bg-blue-50 rounded-lg flex items-center gap-1"
                            >
                                <Plus size={14} /> Add Item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {items.map((it, idx) => {
                                const selectedProd = allProducts.find(p => p.id === it.productId);
                                return (
                                    <div key={idx} className="flex gap-2 items-start bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                        <div className="flex-1 space-y-2">
                                            <select 
                                                value={it.productId}
                                                onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none"
                                            >
                                                <option value="">Select Product</option>
                                                {allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                            
                                            {selectedProd && selectedProd.sizes && selectedProd.sizes.length > 0 && (
                                                <select 
                                                    value={it.sizeId || ''}
                                                    onChange={(e) => updateItem(idx, 'sizeId', e.target.value || null)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 outline-none"
                                                >
                                                    <option value="">Base Size</option>
                                                    {selectedProd.sizes.map(s => <option key={s.id} value={s.id}>{s.name} (+ Rs.{s.price})</option>)}
                                                </select>
                                            )}
                                        </div>

                                        <div className="w-20">
                                            <input 
                                                type="number"
                                                min="1"
                                                placeholder="Qty"
                                                value={it.quantity}
                                                onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-black text-center outline-none"
                                            />
                                            <p className="text-[10px] font-black text-slate-400 text-center uppercase tracking-tighter mt-1">Quantity</p>
                                        </div>

                                        <button 
                                            onClick={() => removeItem(idx)}
                                            className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all self-center"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                );
                            })}
                            {items.length === 0 && (
                                <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-2xl">
                                    <p className="text-sm text-slate-400 italic">No items added to this bundle yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 px-6 py-3 font-bold text-slate-500 border border-slate-200 rounded-2xl hover:bg-white transition-all">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} className="flex-1 px-6 py-3 font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">
                        {initialData ? 'Update Bundle' : 'Create Bundle'}
                    </button>
                </div>
            </div>
        </div>
    );
}
