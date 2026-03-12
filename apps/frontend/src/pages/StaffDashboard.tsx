import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Shield, Users as UsersIcon, Save, UtensilsCrossed } from 'lucide-react';
import { Role } from '../types';
import { useAuth } from '../context/AuthContext';
import { MenuManagement } from '../components/MenuManagement';

interface StaffUser {
    id: string;
    name: string;
    role: Role;
}

export const StaffDashboard: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [staff, setStaff] = useState<StaffUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'staff' | 'permissions'>('staff');

    // Permissions State
    const [rolePermissions, setRolePermissions] = useState<any[]>([]);
    const [isSavingPermissions, setIsSavingPermissions] = useState(false);

    const AVAILABLE_FEATURES = ['POS', 'KDS', 'REPORTS', 'EVENTS', 'INVENTORY', 'STAFF'];

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        role: 'WAITER',
        pin: '',
    });

    // Delete Confirmation State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchStaff();
        if (currentUser?.role === 'ADMIN') {
            fetchPermissions();
        }
    }, [currentUser?.role]);

    const fetchPermissions = async () => {
        try {
            const data = await api.getRolePermissions();
            setRolePermissions(data);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to fetch permissions');
        }
    };

    const fetchStaff = async () => {
        try {
            setIsLoading(true);
            const data = await api.getStaff();
            setStaff(data);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to fetch staff');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePermissionToggle = (role: string, feature: string) => {
        setRolePermissions(prev => prev.map(rp => {
            if (rp.role === role) {
                const newPerms = rp.permissions.includes(feature)
                    ? rp.permissions.filter((p: string) => p !== feature)
                    : [...rp.permissions, feature];
                return { ...rp, permissions: newPerms };
            }
            return rp;
        }));
    };

    const handleSavePermissions = async () => {
        try {
            setIsSavingPermissions(true);
            for (const rp of rolePermissions) {
                await api.updateRolePermissions(rp.role, rp.permissions);
            }
            toast.success('Role permissions updated successfully!');
            fetchPermissions();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to update permissions');
        } finally {
            setIsSavingPermissions(false);
        }
    };

    const handleOpenModal = (mode: 'create' | 'edit', user?: StaffUser) => {
        setModalMode(mode);
        if (mode === 'edit' && user) {
            setEditingId(user.id);
            setFormData({
                name: user.name,
                role: user.role,
                pin: '', // Keep PIN empty for edit unless they want to change it
            });
        } else {
            setEditingId(null);
            setFormData({ name: '', role: 'WAITER', pin: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ name: '', role: 'WAITER', pin: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Simple Validation
        if (!formData.name.trim()) return toast.error("Name is required");
        if (modalMode === 'create' && (!formData.pin || formData.pin.length < 4)) {
            return toast.error("A PIN of at least 4 digits is required for new users");
        }

        try {
            if (modalMode === 'create') {
                await api.createStaff(formData);
                toast.success('Staff member created');
            } else if (modalMode === 'edit' && editingId) {
                // If editing, only send PIN if it was changed
                const updateData = { ...formData };
                if (!updateData.pin) {
                    delete (updateData as any).pin;
                }
                await api.updateStaff(editingId, updateData);
                toast.success('Staff member updated');
            }
            handleCloseModal();
            fetchStaff();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to save staff member');
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        try {
            await api.deleteStaff(deletingId);
            toast.success('Staff member deleted');
            fetchStaff();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to delete staff member');
        } finally {
            setIsDeleteDialogOpen(false);
            setDeletingId(null);
        }
    };


    return (
        <div className="p-8 max-w-6xl mx-auto pb-32">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">System Settings</h1>
                    <p className="text-slate-500 mt-1">Manage system users, roles, and feature access.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-slate-200/50 rounded-xl mb-6 w-max">
                <button
                    onClick={() => setActiveTab('staff')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'staff' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <UsersIcon size={18} />
                    Staff Accounts
                </button>
                {currentUser?.role === 'ADMIN' && (
                    <button
                        onClick={() => setActiveTab('permissions')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'permissions' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Shield size={18} />
                        Role Permissions
                    </button>
                )}
            </div>

            {activeTab === 'staff' && (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-700">Staff Members</h2>
                        <button
                            onClick={() => handleOpenModal('create')}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-sm font-semibold"
                        >
                            <Plus size={18} />
                            Add User
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="p-4 font-semibold text-slate-600">Name</th>
                                        <th className="p-4 font-semibold text-slate-600">Role</th>
                                        <th className="p-4 font-semibold text-slate-600 text-right w-32">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={3} className="p-8 text-center text-slate-500">Loading staff data...</td>
                                        </tr>
                                    ) : staff.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="p-8 text-center text-slate-500">No staff members found.</td>
                                        </tr>
                                    ) : (
                                        staff.map((user) => (
                                            <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-medium text-slate-800">{user.name}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                                                            user.role === 'CASHIER' ? 'bg-blue-100 text-blue-800' :
                                                                user.role === 'KITCHEN' ? 'bg-orange-100 text-orange-800' :
                                                                    'bg-green-100 text-green-800'}`}>
                                                        {user.role.toLowerCase()}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleOpenModal('edit', user)}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Edit User"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(user.id)}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete User"
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
                </>
            )}

            {/* PERMISSIONS TAB */}
            {activeTab === 'permissions' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Feature Access Control</h2>
                            <p className="text-sm text-slate-500">Toggle which roles can access specific system features.</p>
                        </div>
                        <button
                            onClick={handleSavePermissions}
                            disabled={isSavingPermissions}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm ${isSavingPermissions ? 'bg-slate-300 text-white cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                        >
                            <Save size={18} />
                            {isSavingPermissions ? 'Saving...' : 'Save Permissions'}
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="p-4 font-semibold text-slate-600 bg-white sticky left-0 z-10 w-48">Role / Feature</th>
                                    {AVAILABLE_FEATURES.map(feature => (
                                        <th key={feature} className="p-4 font-semibold text-slate-600 text-center">
                                            {feature}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rolePermissions.length === 0 ? (
                                    <tr>
                                        <td colSpan={AVAILABLE_FEATURES.length + 1} className="p-8 text-center text-slate-500">
                                            Loading permissions... (Make sure backend is initialized)
                                        </td>
                                    </tr>
                                ) : (
                                    rolePermissions.map((rp) => (
                                        <tr key={rp.role} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 bg-white sticky left-0 z-10 font-bold text-slate-700 capitalize">
                                                {rp.role.toLowerCase()}
                                            </td>
                                            {AVAILABLE_FEATURES.map(feature => {
                                                const hasAccess = rp.permissions.includes(feature);
                                                return (
                                                    <td key={`${rp.role}-${feature}`} className="p-4 text-center">
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={hasAccess}
                                                                onChange={() => handlePermissionToggle(rp.role, feature)}
                                                                disabled={rp.role === 'ADMIN'} // Optional: Stop them from locking themselves out entirely
                                                            />
                                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                        </label>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}


            {/* Add / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-slate-800">
                                {modalMode === 'create' ? 'Add New Staff' : 'Edit Staff Member'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                    placeholder="e.g. John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">System Role</label>
                                <select
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="WAITER">Waiter</option>
                                    <option value="CASHIER">Cashier</option>
                                    <option value="KITCHEN">Kitchen Staff</option>
                                    <option value="ADMIN">Administrator</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Login PIN {modalMode === 'edit' && <span className="text-slate-400 font-normal">(Leave blank to keep current)</span>}
                                </label>
                                <input
                                    type="password"
                                    maxLength={6}
                                    pattern="[0-9]*"
                                    inputMode="numeric"
                                    required={modalMode === 'create'}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                    placeholder="4-6 digit number"
                                    value={formData.pin}
                                    onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
                                >
                                    {modalMode === 'create' ? 'Create User' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Delete Staff Member?</h2>
                        <p className="text-slate-500 mb-6">
                            This action cannot be undone. Are you sure you want to permanently delete this user?
                        </p>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setIsDeleteDialogOpen(false)}
                                className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl font-medium transition-colors shadow-sm"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
