import { NavLink, Outlet } from 'react-router-dom';
import { Store, LayoutDashboard, Calendar, ShoppingBag, TrendingUp, Users, ChefHat, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function SidebarLayout() {
    const { logout } = useAuth();

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `p-3 rounded-2xl transition-all ${isActive ? 'text-white bg-blue-600 shadow-md shadow-blue-500/30' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`;

    const bottomNavLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex flex-col items-center gap-1 p-2 w-16 transition-all ${isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`;

    return (
        <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-800">

            {/* LEFT COLUMN: Icon-Only Slim Sidebar (Desktop/Tablet) */}
            <aside className="hidden md:flex w-20 bg-white flex-col items-center py-6 border-r border-slate-100 z-20 flex-shrink-0 shadow-sm">
                {/* Top Logo */}
                <div className="mb-10 text-blue-600 bg-blue-50 p-2.5 rounded-xl cursor-default">
                    <Store size={28} />
                </div>

                {/* Nav Icons */}
                <nav className="flex-1 flex flex-col gap-6 w-full items-center">
                    <NavLink to="/" end className={navLinkClass} title="POS / New Sale">
                        <LayoutDashboard size={24} />
                    </NavLink>
                    <NavLink to="/events" className={navLinkClass} title="Party & Events">
                        <Calendar size={24} />
                    </NavLink>
                    <NavLink to="/inventory" className={navLinkClass} title="Inventory & Recipes">
                        <ShoppingBag size={24} />
                    </NavLink>
                    <NavLink to="/reports" className={navLinkClass} title="Reports & Analytics">
                        <TrendingUp size={24} />
                    </NavLink>
                    <NavLink to="/staff" className={navLinkClass} title="Staff Management">
                        <Users size={24} />
                    </NavLink>
                    <NavLink to="/kds" className={navLinkClass} title="Kitchen Display">
                        <ChefHat size={24} />
                    </NavLink>
                </nav>

                {/* Bottom Icons */}
                <div className="flex flex-col gap-4 w-full items-center">
                    <button className="p-3 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-all" title="Settings">
                        <Settings size={24} />
                    </button>
                    <button
                        onClick={logout}
                        className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                        title="Logout"
                    >
                        <LogOut size={24} />
                    </button>
                </div>
            </aside>

            {/* Renders the child route (e.g. POSDashboard, EventsDashboard) */}
            <div className="flex-1 overflow-hidden pb-[72px] md:pb-0 relative">
                <Outlet />
            </div>

            {/* BOTTOM NAVIGATION BAR (Mobile Only) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around px-2 py-2 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
                <NavLink to="/" end className={bottomNavLinkClass}>
                    <LayoutDashboard size={24} />
                    <span className="text-[10px] font-bold">POS</span>
                </NavLink>
                <NavLink to="/events" className={bottomNavLinkClass}>
                    <Calendar size={24} />
                    <span className="text-[10px] font-bold">Events</span>
                </NavLink>
                <NavLink to="/kds" className={bottomNavLinkClass}>
                    <ChefHat size={24} />
                    <span className="text-[10px] font-bold">Kitchen</span>
                </NavLink>
                <button onClick={logout} className="flex flex-col items-center gap-1 p-2 w-16 text-slate-400 hover:text-red-500 transition-all">
                    <LogOut size={24} />
                    <span className="text-[10px] font-bold">Logout</span>
                </button>
            </nav>

        </div>
    );
}
