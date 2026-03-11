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
        // Fallback strategy: redirect to the first available authorized route or root if none
        const fallback = user.permissions.includes('POS') ? '/' :
            user.permissions.includes('KDS') ? '/kds' : '/';

        return <Navigate to={fallback} replace />;
    }

    return <Outlet />;
}
