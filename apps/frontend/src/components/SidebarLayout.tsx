import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Calendar, TrendingUp, Users, Settings, LogOut, Layers, ChevronLeft, Menu, ChefHat } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function SidebarLayout() {
    const { logout, user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(true);

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center ${isExpanded ? 'gap-4 px-6' : 'justify-center px-0'} py-3.5 transition-all text-sm font-semibold relative ${isActive ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`;

    const hasPermission = (perm: string) => user?.permissions?.includes(perm);

    return (
        <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-800">

            {/* LEFT COLUMN: Collapsible Sidebar (Desktop/Tablet) */}
            <aside className={`hidden md:flex flex-col py-6 border-r border-slate-800 z-20 flex-shrink-0 shadow-xl overflow-y-auto transition-all duration-300 relative bg-slate-900 ${isExpanded ? 'w-64' : 'w-24'}`}>
                {/* Top Logo & Toggle */}
                <div className={`px-6 mb-10 flex items-center ${isExpanded ? 'justify-between h-20' : 'justify-center flex-col gap-6 h-auto'} text-white`}>
                    <div className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer group">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shadow-lg border border-slate-700 group-hover:border-slate-600 transition-all shrink-0">
                            <ChefHat className="text-white" size={22} />
                        </div>
                        {isExpanded && (
                            <div className="flex flex-col whitespace-nowrap overflow-hidden">
                                <span className="font-black text-slate-100 tracking-tight text-lg leading-none">MYTEDDY</span>
                                <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mt-1">POS SYSTEM</span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all shrink-0 ${!isExpanded ? 'mt-4' : ''}`}
                        title="Toggle Sidebar"
                    >
                        {isExpanded ? <ChevronLeft size={20} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 flex flex-col w-full">
                    {hasPermission('POS') && (
                        <NavLink to="/" end className={navLinkClass} title="Menu">
                            <LayoutDashboard size={24} className="shrink-0" />
                            {isExpanded && <span className="whitespace-nowrap">Menu</span>}
                        </NavLink>
                    )}
                    {hasPermission('REPORTS') && (
                        <NavLink to="/orders" className={navLinkClass} title="Orders / Reconciliation">
                            <TrendingUp size={24} className="shrink-0" />
                            {isExpanded && <span className="whitespace-nowrap">Orders</span>}
                        </NavLink>
                    )}
                    {hasPermission('EVENTS') && (
                        <NavLink to="/events" className={navLinkClass} title="Party Bookings">
                            <Calendar size={24} className="shrink-0" />
                            {isExpanded && <span className="whitespace-nowrap">Party Bookings</span>}
                        </NavLink>
                    )}
                    {hasPermission('INVENTORY') && (
                        <NavLink to="/inventory" className={navLinkClass} title="Inventory">
                            <Layers size={24} className="shrink-0" />
                            {isExpanded && <span className="whitespace-nowrap">Inventory</span>}
                        </NavLink>
                    )}
                    {hasPermission('STAFF') && (
                        <NavLink to="/staff" className={navLinkClass} title="Staff">
                            <Users size={24} className="shrink-0" />
                            {isExpanded && <span className="whitespace-nowrap">Staff</span>}
                        </NavLink>
                    )}
                    {user?.role === 'ADMIN' && (
                        <NavLink to="/menu-management" className={navLinkClass} title="Menu Management">
                            <Settings size={24} className="shrink-0" />
                            {isExpanded && <span className="whitespace-nowrap">Menu Management</span>}
                        </NavLink>
                    )}
                </nav>

                {/* Bottom Settings / Logout */}
                <div className="flex flex-col w-full mt-auto">
                    <NavLink to="/settings" className={navLinkClass} title="Settings">
                        <Settings size={24} className="shrink-0" />
                        {isExpanded && <span className="whitespace-nowrap">Settings</span>}
                    </NavLink>
                    <button
                        onClick={logout}
                        className={`flex items-center ${isExpanded ? 'gap-4 px-6' : 'justify-center px-0'} py-3.5 text-sm font-semibold text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-all text-left border-t border-slate-800 mt-2 w-full`}
                        title="Logout"
                    >
                        <LogOut size={24} className="shrink-0" />
                        {isExpanded && <span className="whitespace-nowrap">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Renders the child route (e.g. POSDashboard, EventsDashboard) */}
            <div className="flex-1 overflow-auto pb-[72px] md:pb-0 relative">
                <Outlet />
            </div>

            {/* BOTTOM NAVIGATION BAR (Mobile Only) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 py-3 z-50">
                {hasPermission('POS') && (
                    <NavLink to="/" end className={({ isActive }) => `flex flex-col items-center gap-1 p-2 w-16 transition-all ${isActive ? 'text-white' : 'text-slate-500'}`}>
                        <LayoutDashboard size={24} />
                        <span className="text-[10px] font-bold">Menu</span>
                    </NavLink>
                )}
                {hasPermission('EVENTS') && (
                    <NavLink to="/events" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 w-16 transition-all ${isActive ? 'text-white' : 'text-slate-500'}`}>
                        <Calendar size={24} />
                        <span className="text-[10px] font-bold">Party</span>
                    </NavLink>
                )}
                {hasPermission('INVENTORY') && (
                    <NavLink to="/inventory" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 w-16 transition-all ${isActive ? 'text-white' : 'text-slate-500'}`}>
                        <Layers size={24} />
                        <span className="text-[10px] font-bold">Inv.</span>
                    </NavLink>
                )}
                {user?.role === 'ADMIN' && (
                    <NavLink to="/menu-management" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 w-16 transition-all ${isActive ? 'text-white' : 'text-slate-500'}`}>
                        <Settings size={24} />
                        <span className="text-[10px] font-bold">Admin</span>
                    </NavLink>
                )}
                <button onClick={logout} className="flex flex-col items-center gap-1 p-2 w-16 text-slate-500 hover:text-red-400 transition-all">
                    <LogOut size={24} />
                    <span className="text-[10px] font-bold">Exit</span>
                </button>
            </nav>

        </div>
    );
}
