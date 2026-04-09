import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    requiredPermission?: string;
}

export function ProtectedRoute({ requiredPermission }: ProtectedRouteProps) {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (requiredPermission && user?.permissions && !user.permissions.includes(requiredPermission)) {
        // Fallback strategy: find the first available route they DO have access to
        const permissions = user.permissions;
        const fallback = permissions.includes('POS_ACCESS') ? '/' :
            permissions.includes('EVENTS_MANAGE') ? '/events' :
                permissions.includes('INVENTORY_MANAGE') ? '/inventory' :
                    permissions.includes('REPORTS_VIEW') ? '/orders' :
                        permissions.includes('STAFF_MANAGE') ? '/staff' :
                            permissions.includes('MENU_MANAGE') ? '/menu-management' : null;

        if (!fallback || (fallback === '/' && !permissions.includes('POS_ACCESS'))) {
            return (
                <div className="flex items-center justify-center h-screen bg-slate-50">
                    <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center max-w-md">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl font-bold">!</span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h1>
                        <p className="text-slate-500 mb-6">You don't have the required permission ({requiredPermission}) to view this page.</p>
                        <button 
                            onClick={() => window.location.href = '/'}
                            className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-700 transition-all"
                        >
                            Return Home
                        </button>
                    </div>
                </div>
            );
        }

        return <Navigate to={fallback} replace />;
    }

    return <Outlet />;
}
