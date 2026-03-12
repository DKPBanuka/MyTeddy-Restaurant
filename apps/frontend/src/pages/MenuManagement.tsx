import { useState, useEffect } from 'react';
import { api } from '../api';
import type { Category, Product } from '../types';
import { ProductType } from '../types';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Save, X, Layers, ShoppingBag, Search, Upload, Loader2 } from 'lucide-react';

export function MenuManagement() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form States
    const [catName, setCatName] = useState('');
    const [editingCatId, setEditingCatId] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<'CATEGORIES' | 'PRODUCTS'>('CATEGORIES');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [catData, prodData] = await Promise.all([
                api.getCategories(),
                api.getProducts(),
            ]);
            setCategories(catData);
            setProducts(prodData);
        } catch (error) {
            toast.error('Failed to load menu data');
        } finally {
            setIsLoading(false);
        }
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
            fetchData();
        } catch (error) {
            toast.error('Operation failed');
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Are you sure? This may affect linked products.')) return;
        try {
            await api.deleteCategory(id);
            toast.success('Category removed');
            fetchData();
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
                </div>
            </header>

            {activeTab === 'CATEGORIES' ? (
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
                            {categories.length === 0 && !isLoading && (
                                <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                                    <Layers size={40} className="mb-4 opacity-20" />
                                    <p className="font-bold">No categories added yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <ProductList categories={categories} products={products} onRefresh={fetchData} />
            )}
        </div>
    );
}

function ProductList({ categories, products, onRefresh }: { categories: Category[], products: Product[], onRefresh: () => void }) {
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.name?.toLowerCase().includes(search.toLowerCase())
    );

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
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-semibold shadow-sm text-sm"
                    />
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
            };
            if (initialData) {
                await api.updateProduct(initialData.id, productData);
                toast.success('Product updated');
            } else {
                await api.createProduct(productData);
                toast.success('Product created');
            }
            onSuccess();
        } catch (error) {
            toast.error('Save failed');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800">{initialData ? 'Edit Product' : 'Add New Product'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>
                <div className="p-8 space-y-5">
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
