import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Search, ImageIcon, DollarSign, Upload, Tag } from 'lucide-react';
import type { Product } from '../types';

export function MenuManagement() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        type: 'FOOD',
        description: '',
        imageUrl: '',
        isActive: true
    });
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Delete State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setIsLoading(true);
            const data = await api.getProducts();
            setProducts(data);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to fetch menu items');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (mode: 'create' | 'edit', product?: Product) => {
        setModalMode(mode);
        if (mode === 'edit' && product) {
            setEditingId(product.id);
            setFormData({
                name: product.name,
                price: product.price.toString(),
                type: product.type,
                description: product.description || '',
                imageUrl: product.imageUrl || '',
                isActive: product.isActive ?? true,
            });
        } else {
            setEditingId(null);
            setFormData({ name: '', price: '', type: 'FOOD', description: '', imageUrl: '', isActive: true });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ name: '', price: '', type: 'FOOD', description: '', imageUrl: '', isActive: true });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const res = await api.uploadProductImage(file);
            setFormData(prev => ({ ...prev, imageUrl: res.imageUrl }));
            toast.success("Image uploaded!");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to upload image");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.price || parseFloat(formData.price) <= 0) {
            return toast.error("Please enter a valid name and price");
        }

        const submitData = {
            ...formData,
            price: formData.price // keep as string and backend prisma decimal will accept it
        };

        try {
            if (modalMode === 'create') {
                await api.createProduct(submitData as any);
                toast.success('Menu item created');
            } else if (modalMode === 'edit' && editingId) {
                await api.updateProduct(editingId, submitData as any);
                toast.success('Menu item updated');
            }
            handleCloseModal();
            fetchProducts();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save menu item');
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        try {
            await api.deleteProduct(deletingId);
            toast.success('Menu item deleted');
            fetchProducts();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to delete item');
        } finally {
            setIsDeleteDialogOpen(false);
            setDeletingId(null);
        }
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="animate-in fade-in space-y-6">
            <div className="flex justify-between items-center">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search menu items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-colors shadow-sm"
                    />
                </div>
                <button
                    onClick={() => handleOpenModal('create')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-sm font-semibold"
                >
                    <Plus size={18} />
                    Add Menu Item
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="p-4 font-semibold text-slate-600">Item Name</th>
                                <th className="p-4 font-semibold text-slate-600">Price</th>
                                <th className="p-4 font-semibold text-slate-600">Category</th>
                                <th className="p-4 font-semibold text-slate-600 text-center">Status</th>
                                <th className="p-4 font-semibold text-slate-600 text-right w-32">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">Loading menu...</td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">No items found.</td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${!product.isActive ? 'opacity-50 grayscale' : ''}`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                                        <ImageIcon size={18} />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-slate-800">{product.name}</div>
                                                    <div className="text-xs text-slate-500 truncate max-w-[200px]">{product.description || 'No description'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-blue-600">Rs. {parseFloat(product.price.toString()).toLocaleString()}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${product.type === 'FOOD' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                                                <Tag size={12} />
                                                {product.type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${product.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {product.isActive ? 'Active' : 'Hidden'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal('edit', product)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit Item"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(product.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete Item"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Form Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">
                                {modalMode === 'create' ? 'Add Menu Item' : 'Edit Menu Item'}
                            </h2>
                            <button onClick={handleCloseModal} className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-400 hover:text-slate-600 shadow-sm transition-colors">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="flex items-start gap-6">
                                {/* Image Upload Column */}
                                <div className="space-y-3 shrink-0">
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400">Image</label>
                                    <div className="relative group">
                                        <div className={`w-28 h-28 rounded-2xl flex items-center justify-center border-2 border-dashed transition-colors overflow-hidden ${formData.imageUrl ? 'border-transparent' : 'border-slate-200 bg-slate-50 group-hover:border-blue-400 group-hover:bg-blue-50'}`}>
                                            {formData.imageUrl ? (
                                                <img src={formData.imageUrl} alt="Product preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="text-slate-300 group-hover:text-blue-400 transition-colors" size={32} />
                                            )}
                                            {isUploading && (
                                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-blue-600 shadow-md border border-slate-100 rounded-full p-2 hover:scale-110 active:scale-95 transition-all outline-none"
                                            title="Upload Image"
                                        >
                                            <Upload size={14} />
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleImageUpload}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Or Paste Image URL (For Testing)</label>
                                        <input
                                            type="text"
                                            value={formData.imageUrl}
                                            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-50 focus:border-blue-400 font-medium transition-all outline-none text-slate-700 text-xs"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>

                                {/* Texts Column */}
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5">Item Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 font-bold transition-all outline-none text-slate-700"
                                            placeholder="e.g. Mixed Fried Rice"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5">Price (Rs.)</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="number"
                                                    required
                                                    min="0.01"
                                                    step="0.01"
                                                    value={formData.price}
                                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 font-black transition-all outline-none text-slate-700"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5">Category</label>
                                            <select
                                                value={formData.type}
                                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 font-bold transition-all outline-none text-slate-700"
                                            >
                                                <option value="FOOD">Food / Prep</option>
                                                <option value="RETAIL">Retail / Drinks</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5">Description (Optional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 font-medium transition-all outline-none text-slate-700 text-sm resize-none custom-scrollbar"
                                    placeholder="Brief description of the item..."
                                />
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                                <div>
                                    <div className="text-sm font-bold text-slate-700">Available on Menu</div>
                                    <div className="text-[10px] text-slate-400 font-medium">Toggle off to hide from POS temporarily without deleting.</div>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-3 border-t border-slate-100 pt-6">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-6 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    className="px-8 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-black transition-all font-black shadow-lg shadow-slate-900/20 active:scale-95 disabled:opacity-50"
                                >
                                    {modalMode === 'create' ? 'Create Item' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteDialogOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-8 text-center animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-100 shadow-inner">
                            <Trash2 size={28} />
                        </div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight mb-2">Delete Item?</h2>
                        <p className="text-sm text-slate-500 mb-8 font-medium">
                            Are you sure you want to permanently delete this menu item? It will be removed from the POS.
                        </p>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setIsDeleteDialogOpen(false)}
                                className="flex-1 px-4 py-3 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-md shadow-red-600/20 active:scale-95"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
