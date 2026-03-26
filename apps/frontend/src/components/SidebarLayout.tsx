import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
    LayoutDashboard, 
    Calendar, 
    TrendingUp, 
    ShieldCheck, 
    Contact, 
    BarChart3,
    Settings, 
    LogOut, 
    Layers, 
    ChefHat,
    Pin,
    PinOff,
    Library
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export function SidebarLayout() {
    const { logout, user } = useAuth();
    const { settings } = useSettings();
    const [isExpanded, setIsExpanded] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

    const actualExpanded = isExpanded || isHovered;

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center ${actualExpanded ? 'gap-4 px-6' : 'justify-center px-0'} py-3.5 transition-all text-sm font-semibold relative ${isActive ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`;

    const hasPermission = (perm: string) => user?.permissions?.includes(perm);

    return (
        <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-800">

            {/* LEFT COLUMN: Collapsible Sidebar (Desktop/Tablet) */}
            <aside 
                onMouseEnter={() => !isExpanded && setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`hidden md:flex flex-col py-6 border-r border-slate-800 z-50 flex-shrink-0 shadow-2xl overflow-y-auto transition-all duration-300 ease-in-out relative bg-slate-900 ${actualExpanded ? 'w-64' : 'w-20'}`}
            >
                {/* Top Logo & Toggle */}
                <div className={`px-4 mb-10 flex items-center ${actualExpanded ? 'justify-between h-20' : 'justify-center flex-col gap-6 h-auto'} text-white`}>
                    <div className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer group">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shadow-lg border border-slate-700 group-hover:border-slate-600 transition-all shrink-0 overflow-hidden">
                            {settings?.logoUrl ? (
                                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                            ) : (
                                <ChefHat className="text-white" size={26} />
                            )}
                        </div>
                        {actualExpanded && (
                            <div className="flex flex-col whitespace-nowrap overflow-hidden">
                                <span className="font-black text-slate-100 tracking-tight text-lg leading-none">MYTEDDY</span>
                                <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mt-1">POS SYSTEM</span>
                            </div>
                        )}
                    </div>
                    {actualExpanded && (
                        <button
                            onClick={() => {
                                setIsExpanded(!isExpanded);
                                if (!isExpanded) setIsHovered(false);
                            }}
                            className={`text-slate-400 hover:text-white p-2 rounded-xl transition-all shrink-0 ${isExpanded ? 'bg-slate-800' : 'bg-transparent'}`}
                            title={isExpanded ? "Unlock Sidebar (Auto-collapse)" : "Lock Sidebar (Fixed)"}
                        >
                            {isExpanded ? <Pin size={18} className="fill-current" /> : <PinOff size={18} />}
                        </button>
                    )}
                </div>

                {/* Nav Links */}
                <nav className="flex-1 flex flex-col w-full">
                    {hasPermission('POS') && (
                        <NavLink to="/" end className={navLinkClass} title="Menu">
                            <LayoutDashboard size={24} className="shrink-0" />
                            {actualExpanded && <span className="whitespace-nowrap">Menu</span>}
                        </NavLink>
                    )}
                    {hasPermission('REPORTS') && (
                        <NavLink to="/orders" className={navLinkClass} title="Orders / Reconciliation">
                            <TrendingUp size={24} className="shrink-0" />
                            {actualExpanded && <span className="whitespace-nowrap">Orders</span>}
                        </NavLink>
                    )}
                    {hasPermission('EVENTS') && (
                        <NavLink to="/events" className={navLinkClass} title="Party Bookings">
                            <Calendar size={24} className="shrink-0" />
                            {actualExpanded && <span className="whitespace-nowrap">Party Bookings</span>}
                        </NavLink>
                    )}
                    {hasPermission('INVENTORY') && (
                        <NavLink to="/inventory" className={navLinkClass} title="Inventory">
                            <Layers size={24} className="shrink-0" />
                            {actualExpanded && <span className="whitespace-nowrap">Inventory</span>}
                        </NavLink>
                    )}
                    {hasPermission('STAFF') && (
                        <NavLink to="/staff" className={navLinkClass} title="Staff">
                            <ShieldCheck size={24} className="shrink-0" />
                            {actualExpanded && <span className="whitespace-nowrap">Staff</span>}
                        </NavLink>
                    )}
                    {hasPermission('POS') && (
                        <NavLink to="/customers" className={navLinkClass} title="Customers">
                            <Contact size={24} className="shrink-0" />
                            {actualExpanded && <span className="whitespace-nowrap">Customers</span>}
                        </NavLink>
                    )}
                    {user?.role === 'ADMIN' && (
                        <NavLink to="/analysis" className={navLinkClass} title="Analysis Dashboard">
                            <BarChart3 size={24} className="shrink-0" />
                            {actualExpanded && <span className="whitespace-nowrap">Analysis</span>}
                        </NavLink>
                    )}
                    {user?.role === 'ADMIN' && (
                        <NavLink to="/menu-management" className={navLinkClass} title="Menu Management">
                            <Library size={24} className="shrink-0" />
                            {actualExpanded && <span className="whitespace-nowrap">Menu Management</span>}
                        </NavLink>
                    )}
                </nav>

                {/* Bottom Settings / Logout */}
                <div className="flex flex-col w-full mt-auto">
                    <NavLink to="/settings" className={navLinkClass} title="Settings">
                        <Settings size={24} className="shrink-0" />
                        {actualExpanded && <span className="whitespace-nowrap">Settings</span>}
                    </NavLink>
                    <button
                        onClick={logout}
                        className={`flex items-center ${actualExpanded ? 'gap-4 px-6' : 'justify-center px-0'} py-3.5 text-sm font-semibold text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-all text-left border-t border-slate-800 mt-2 w-full`}
                        title="Logout"
                    >
                        <LogOut size={24} className="shrink-0" />
                        {actualExpanded && <span className="whitespace-nowrap">Logout</span>}
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
                {hasPermission('POS') && (
                    <NavLink to="/customers" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 w-16 transition-all ${isActive ? 'text-white' : 'text-slate-500'}`}>
                        <Contact size={24} />
                        <span className="text-[10px] font-bold">Cust.</span>
                    </NavLink>
                )}
                {user?.role === 'ADMIN' && (
                    <NavLink to="/analysis" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 w-16 transition-all ${isActive ? 'text-white' : 'text-slate-500'}`}>
                        <BarChart3 size={24} />
                        <span className="text-[10px] font-bold">Analysis</span>
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
