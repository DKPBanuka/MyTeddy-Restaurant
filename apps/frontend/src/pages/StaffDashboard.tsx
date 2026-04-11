import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { toast } from 'sonner';
import { 
    Edit2, 
    Trash2, 
    Shield, 
    Users as UsersIcon, 
    Save, 
    UserPlus, 
    Key, 
    Search,
    ShieldCheck,
    Lock,
    Eye,
    EyeOff,
    Check,
    X,
    UserCircle,
    BadgeCheck
} from 'lucide-react';
import { Role } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

interface StaffUser {
    id: string;
    name: string;
    role: Role;
    pin?: string;
    permissions?: string[];
}

const TRANSLATIONS = {
    en: {
        title: "Staff Management",
        subtitle: "Manage your team, roles and secure access permissions.",
        addStaff: "Add Staff Member",
        staffAccounts: "Staff Accounts",
        rolePermissions: "Role Permissions",
        searchPlaceholder: "Search staff name...",
        name: "Full Name",
        role: "System Role",
        actions: "Actions",
        noStaff: "No staff members found.",
        loading: "Loading system data...",
        edit: "Edit Staff",
        delete: "Delete Staff",
        save: "Save Changes",
        create: "Create Account",
        cancel: "Cancel",
        pinLabel: "Security PIN",
        pinHint: "4-6 digits used for login",
        keepPin: "Leave blank to keep current PIN",
        roleAdmin: "Administrator",
        roleCashier: "Cashier",
        roleWaiter: "Waiter",
        roleKitchen: "Kitchen Staff",
        permissionsTitle: "Feature Access Control",
        permissionsSubtitle: "Toggle which roles can access specific system features.",
        savePermissions: "Save Matrix",
        saving: "Saving...",
        deleteConfirmTitle: "Remove Staff Member?",
        deleteConfirmDesc: "This action cannot be undone. Are you sure you want to delete this user?",
        deleteBtn: "Yes, Remove Member",
        customAccess: "Custom Access",
        managedByRole: "Default Role Permissions",
        managedByStaff: "Individual User Permissions",
        enableCustom: "Enable Custom Permission Override"
    },
    si: {
        title: "කාර්ය මණ්ඩල කළමනාකරණය",
        subtitle: "ඔබේ කණ්ඩායම, භූමිකාවන් සහ ආරක්ෂිත ප්‍රවේශ අවසර කළමනාකරණය කරන්න.",
        addStaff: "නව සාමාජිකයෙකු එක් කරන්න",
        staffAccounts: "කාර්ය මණ්ඩල ගිණුම්",
        rolePermissions: "භූමිකාවන් සහ අවසර",
        searchPlaceholder: "නම සොයන්න...",
        name: "නම",
        role: "වගකීම / භූමිකාව",
        actions: "ක්‍රියාමාර්ග",
        noStaff: "කාර්ය මණ්ඩල සාමාජිකයන් හමු නොවීය.",
        loading: "දත්ත පූරණය වෙමින් පවතී...",
        edit: "වෙනස් කරන්න",
        delete: "ඉවත් කරන්න",
        save: "සුරකින්න",
        create: "ගිණුම සාදන්න",
        cancel: "අවලංගු කරන්න",
        pinLabel: "ආරක්ෂිත PIN අංකය",
        pinHint: "ඇතුළු වීමට භාවිතා වන ඉලක්කම් 4-6",
        keepPin: "පවතින PIN අංකය තබා ගැනීමට මෙය හිස්ව තබන්න",
        roleAdmin: "පරිපාලක",
        roleCashier: "කැෂියර්",
        roleWaiter: "වේටර්",
        roleKitchen: "මුළුතැන්ගෙයි කාර්ය මණ්ඩලය",
        permissionsTitle: "පද්ධති ප්‍රවේශ පාලනය",
        permissionsSubtitle: "විවිධ භූමිකාවන්ට ප්‍රවේශ විය හැකි අංග තෝරන්න.",
        savePermissions: "අවසර සුරකින්න",
        saving: "සුරැකෙමින් පවතී...",
        deleteConfirmTitle: "සාමාජිකයා ඉවත් කරන්නද?",
        deleteConfirmDesc: "මෙය ස්ථිර ඉවත් කිරීමකි. ඔබට විශ්වාසද?",
        deleteBtn: "ඔව්, ඉවත් කරන්න",
        customAccess: "විශේෂ ප්‍රවේශය",
        managedByRole: "ප්‍රධාන අවසර",
        managedByStaff: "පුද්ගල අවසර",
        enableCustom: "පුද්ගල අවසර සබල කරන්න"
    }
};

export const StaffDashboard: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [staff, setStaff] = useState<StaffUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'staff' | 'permissions'>('staff');
    const [searchQuery, setSearchQuery] = useState("");
    const [lang, setLang] = useState<'en' | 'si'>('en');

    // Permissions State
    const [rolePermissions, setRolePermissions] = useState<any[]>([]);
    const [isSavingPermissions, setIsSavingPermissions] = useState(false);
    const { socket } = useSocket();

    const AVAILABLE_FEATURES = [
        'POS_ACCESS', 
        'KDS_ACCESS', 
        'REPORTS_VIEW', 
        'EVENTS_MANAGE', 
        'INVENTORY_MANAGE', 
        'STAFF_MANAGE', 
        'ANALYSIS_VIEW', 
        'MENU_MANAGE', 
        'SETTINGS_MANAGE'
    ];

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showPin, setShowPin] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        role: 'WAITER' as Role,
        pin: '',
        permissions: [] as string[],
        useCustomPermissions: false
    });

    // Delete Confirmation State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const t = TRANSLATIONS[lang];

    useEffect(() => {
        fetchStaff();
        if (currentUser?.role === 'ADMIN') {
            fetchPermissions();
        }
    }, [currentUser?.role]);

    // --- Real-time Listeners ---
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            console.log('Real-time: Staff updated, refreshing...');
            fetchStaff();
            if (currentUser?.role === 'ADMIN') {
                fetchPermissions();
            }
        };

        socket.on('STAFF_UPDATED', handleUpdate);

        return () => {
            socket.off('STAFF_UPDATED', handleUpdate);
        };
    }, [socket, currentUser?.role]);

    const fetchPermissions = async () => {
        try {
            const data = await api.getRolePermissions();
            setRolePermissions(data);
        } catch (error: any) {
            toast.error('Failed to fetch permissions');
        }
    };

    const fetchStaff = async () => {
        try {
            setIsLoading(true);
            const data = await api.getStaff();
            setStaff(data);
        } catch (error: any) {
            toast.error('Failed to fetch staff list');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredStaff = staff.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
            toast.success('Permissions updated successfully');
            fetchPermissions();
        } catch (error: any) {
            toast.error('Failed to update permissions');
        } finally {
            setIsSavingPermissions(false);
        }
    };

    const handleOpenModal = (mode: 'create' | 'edit', user?: StaffUser) => {
        setModalMode(mode);
        setShowPin(false);
        if (mode === 'edit' && user) {
            setEditingId(user.id);
            setFormData({
                name: user.name,
                role: user.role,
                pin: '',
                permissions: user.permissions || [],
                useCustomPermissions: (user.permissions && user.permissions.length > 0) || false
            });
        } else {
            setEditingId(null);
            setFormData({ name: '', role: 'WAITER', pin: '', permissions: [], useCustomPermissions: false });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ name: '', role: 'WAITER', pin: '', permissions: [], useCustomPermissions: false });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return toast.error("Name is required");
        if (modalMode === 'create' && (!formData.pin || formData.pin.length < 4)) {
            return toast.error("PIN must be 4-6 digits");
        }

        try {
            if (modalMode === 'create') {
                await api.createStaff(formData);
                toast.success('Staff member added');
            } else if (modalMode === 'edit' && editingId) {
                const updateData = { 
                    ...formData,
                    // If custom permissions are disabled, send empty array to backend to trigger role fallback
                    permissions: formData.useCustomPermissions ? formData.permissions : []
                };
                if (!updateData.pin) delete (updateData as any).pin;
                delete (updateData as any).useCustomPermissions;
                
                await api.updateStaff(editingId, updateData);
                toast.success('Staff profile updated');
            }
            handleCloseModal();
            fetchStaff();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Operation failed');
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
            toast.success('Staff member removed');
            fetchStaff();
        } catch (error: any) {
            toast.error('Delete operation failed');
        } finally {
            setIsDeleteDialogOpen(false);
            setDeletingId(null);
        }
    };

    const getRoleBadgeClass = (role: string) => {
        switch (role) {
            case 'ADMIN': return 'bg-rose-500/10 text-rose-600 border-rose-200/50';
            case 'CASHIER': return 'bg-indigo-500/10 text-indigo-600 border-indigo-200/50';
            case 'KITCHEN': return 'bg-amber-500/10 text-amber-600 border-amber-200/50';
            default: return 'bg-emerald-500/10 text-emerald-600 border-emerald-200/50';
        }
    };

    const getTranslatedRole = (role: string) => {
        switch (role) {
            case 'ADMIN': return t.roleAdmin;
            case 'CASHIER': return t.roleCashier;
            case 'KITCHEN': return t.roleKitchen;
            default: return t.roleWaiter;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 pb-32 font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Header Section */}
            <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="animate-in fade-in slide-in-from-left duration-500">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 text-white">
                            <ShieldCheck size={28} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                            {t.title}
                        </h1>
                    </div>
                    <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-2xl">
                        {t.subtitle}
                    </p>
                </div>

                <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right duration-500">
                    <div className="flex p-1 bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <button 
                            onClick={() => setLang('en')}
                            className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${lang === 'en' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            EN
                        </button>
                        <button 
                            onClick={() => setLang('si')}
                            className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${lang === 'si' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            සිං
                        </button>
                    </div>
                    {activeTab === 'staff' && (
                        <button
                            onClick={() => handleOpenModal('create')}
                            className="flex items-center gap-2.5 px-6 py-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 font-black text-sm group active:scale-95"
                        >
                            <UserPlus size={20} className="group-hover:rotate-12 transition-transform" />
                            <span className="uppercase tracking-widest">{t.addStaff}</span>
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto">
                {/* Custom Tabs */}
                <div className="flex items-center gap-2 mb-8 p-1.5 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-[2rem] w-fit shadow-inner">
                    <button
                        onClick={() => setActiveTab('staff')}
                        className={`flex items-center gap-3 px-8 py-3.5 rounded-full text-sm font-black transition-all ${activeTab === 'staff' ? 'bg-white text-blue-600 shadow-xl shadow-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <UsersIcon size={20} />
                        {t.staffAccounts}
                    </button>
                    {currentUser?.role === 'ADMIN' && (
                        <button
                            onClick={() => setActiveTab('permissions')}
                            className={`flex items-center gap-3 px-8 py-3.5 rounded-full text-sm font-black transition-all ${activeTab === 'permissions' ? 'bg-white text-blue-600 shadow-xl shadow-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Lock size={20} />
                            {t.rolePermissions}
                        </button>
                    )}
                </div>

                {activeTab === 'staff' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Search Bar */}
                        <div className="relative mb-6 group max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t.searchPlaceholder}
                                className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-2xl outline-none font-bold text-sm transition-all shadow-sm"
                            />
                        </div>

                        {/* Staff Table */}
                        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">{t.name}</th>
                                            <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">{t.role}</th>
                                            <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px] text-right">{t.actions}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={3} className="px-8 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <div className="w-12 h-12 border-4 border-blue-50 border-t-blue-500 rounded-full animate-spin"></div>
                                                        <span className="text-sm font-bold text-slate-400 animate-pulse uppercase tracking-widest">{t.loading}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredStaff.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-8 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                                                            <UserCircle size={40} />
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t.noStaff}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredStaff.map((person) => (
                                                <tr key={person.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-inner">
                                                                <UserCircle size={28} />
                                                            </div>
                                                            <div>
                                                                <div className="font-black text-slate-800 text-base">{person.name}</div>
                                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">ID: {person.id.slice(-8).toUpperCase()}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[11px] font-black border tracking-wider uppercase
                                                            ${getRoleBadgeClass(person.role)}`}>
                                                            <BadgeCheck size={14} />
                                                            {getTranslatedRole(person.role)}
                                                        </span>
                                                        {person.permissions && person.permissions.length > 0 && person.role !== 'ADMIN' && (
                                                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 text-[9px] font-black uppercase tracking-tighter">
                                                                <Lock size={10} />
                                                                {t.customAccess}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleOpenModal('edit', person)}
                                                                className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all active:scale-90"
                                                                title={t.edit}
                                                            >
                                                                <Edit2 size={20} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteClick(person.id)}
                                                                className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all active:scale-90"
                                                                title={t.delete}
                                                            >
                                                                <Trash2 size={20} />
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
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                            <div>
                                <h2 className="text-xl font-black text-slate-800">{t.permissionsTitle}</h2>
                                <p className="text-sm font-medium text-slate-500">{t.permissionsSubtitle}</p>
                            </div>
                            <button
                                onClick={handleSavePermissions}
                                disabled={isSavingPermissions}
                                className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-black text-xs tracking-widest uppercase transition-all shadow-xl active:scale-95 ${isSavingPermissions ? 'bg-slate-300 text-white cursor-not-allowed shadow-none' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'}`}
                            >
                                <Save size={18} />
                                {isSavingPermissions ? t.saving : t.savePermissions}
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px] bg-white sticky left-0 z-10">{t.role}</th>
                                        {AVAILABLE_FEATURES.map(feature => (
                                            <th key={feature} className="px-8 py-6 font-black text-slate-400 uppercase tracking-widest text-[10px] text-center">
                                                {feature}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {rolePermissions.length === 0 ? (
                                        <tr>
                                            <td colSpan={AVAILABLE_FEATURES.length + 1} className="px-8 py-20 text-center font-bold text-slate-400 uppercase tracking-widest text-xs">
                                                {t.loading}
                                            </td>
                                        </tr>
                                    ) : (
                                        rolePermissions.map((rp) => (
                                            <tr key={rp.role} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-8 py-6 bg-white sticky left-0 z-10 font-black text-slate-700 text-sm tracking-tight capitalize">
                                                    {getTranslatedRole(rp.role)}
                                                </td>
                                                {AVAILABLE_FEATURES.map(feature => {
                                                    const hasAccess = rp.permissions.includes(feature);
                                                    return (
                                                        <td key={`${rp.role}-${feature}`} className="px-8 py-6 text-center">
                                                            <button
                                                                onClick={() => handlePermissionToggle(rp.role, feature)}
                                                                disabled={rp.role === 'ADMIN'}
                                                                className={`w-14 h-8 rounded-full p-1 transition-all duration-300 relative ${hasAccess ? 'bg-blue-500 shadow-lg shadow-blue-100' : 'bg-slate-200'} ${rp.role === 'ADMIN' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                            >
                                                                <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 transform flex items-center justify-center ${hasAccess ? 'translate-x-6' : 'translate-x-0'}`}>
                                                                    {hasAccess ? <Check size={14} className="text-blue-600" /> : <X size={14} className="text-slate-400" />}
                                                                </div>
                                                            </button>
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
            </main>

            {/* Modal: Create/Edit staff */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
                        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                    {modalMode === 'create' ? t.addStaff : t.edit}
                                </h2>
                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Staff Credentials Profile</p>
                            </div>
                            <button onClick={handleCloseModal} className="p-3 text-slate-400 hover:text-slate-800 hover:bg-white rounded-2xl transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-8">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                                    <UserCircle size={14} />
                                    {t.name}
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none font-bold text-slate-800 transition-all placeholder:text-slate-300"
                                    placeholder="e.g. Kasun Perera"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                                    <Shield size={14} />
                                    {t.role}
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['WAITER', 'CASHIER', 'KITCHEN', 'ADMIN'].map((roleOption) => (
                                        <button
                                            key={roleOption}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: roleOption as Role })}
                                            className={`px-4 py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${formData.role === roleOption ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600'}`}
                                        >
                                            {getTranslatedRole(roleOption)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        <Key size={14} />
                                        {t.pinLabel}
                                    </label>
                                    <span className="text-[10px] font-bold text-slate-400">{formData.pin.length}/6</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPin ? "text" : "password"}
                                        maxLength={6}
                                        pattern="[0-9]*"
                                        inputMode="numeric"
                                        required={modalMode === 'create'}
                                        className="w-full pl-6 pr-14 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none font-black text-slate-800 transition-all placeholder:text-slate-300 tracking-[0.5em]"
                                        placeholder="••••"
                                        value={formData.pin}
                                        onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPin(!showPin)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-800 transition-colors"
                                    >
                                        {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 ml-1 italic">
                                </p>
                            </div>

                            {/* Custom Permissions Matrix in Modal */}
                            {modalMode === 'edit' && formData.role !== 'ADMIN' && (
                                <div className="space-y-4 pt-4 border-t border-slate-50">
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                                            <ShieldCheck size={14} />
                                            {t.managedByStaff}
                                        </label>
                                        <button 
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, useCustomPermissions: !prev.useCustomPermissions }))}
                                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${formData.useCustomPermissions ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-slate-100 text-slate-400'}`}
                                        >
                                            {formData.useCustomPermissions ? 'Override Active' : 'Use Default Role'}
                                        </button>
                                    </div>

                                    {formData.useCustomPermissions && (
                                        <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-4 rounded-3xl border border-slate-100 animate-in slide-in-from-top-2 duration-300">
                                            {AVAILABLE_FEATURES.map(feature => (
                                                <button
                                                    key={feature}
                                                    type="button"
                                                    onClick={() => {
                                                        const newPerms = formData.permissions.includes(feature)
                                                            ? formData.permissions.filter(p => p !== feature)
                                                            : [...formData.permissions, feature];
                                                        setFormData(prev => ({ ...prev, permissions: newPerms }));
                                                    }}
                                                    className={`px-3 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-tight text-center transition-all ${formData.permissions.includes(feature) ? 'bg-white border-blue-200 text-blue-600 shadow-sm' : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    {feature.replace('_', ' ')}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="pt-6 flex gap-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-slate-200 transition-all active:scale-95"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
                                >
                                    {modalMode === 'create' ? t.create : t.save}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Delete confirm */}
            {isDeleteDialogOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden p-10 text-center animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-rose-50/50">
                            <Trash2 size={36} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-3">
                            {t.deleteConfirmTitle}
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed px-2">
                            {t.deleteConfirmDesc}
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={confirmDelete}
                                className="w-full py-4 bg-rose-600 text-white hover:bg-rose-700 rounded-2xl font-black text-xs tracking-widest uppercase transition-all shadow-xl shadow-rose-100 active:scale-95"
                            >
                                {t.deleteBtn}
                            </button>
                            <button
                                onClick={() => setIsDeleteDialogOpen(false)}
                                className="w-full py-4 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl font-black text-xs tracking-widest uppercase transition-all active:scale-95"
                            >
                                {t.cancel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
