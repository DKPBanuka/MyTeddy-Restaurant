import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { SidebarLayout } from './components/SidebarLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { POSDashboard } from './pages/POSDashboard';
import { EventsDashboard } from './pages/EventsDashboard';
import { KDSDashboard } from './pages/KDSDashboard';
import { InventoryDashboard } from './pages/InventoryDashboard';
import { ReportsDashboard } from './pages/ReportsDashboard';
import { StaffDashboard } from './pages/StaffDashboard';

function App() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <LoginScreen />
      </>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route element={<SidebarLayout />}>
          <Route element={<ProtectedRoute requiredPermission="POS" />}>
            <Route path="/" element={<POSDashboard />} />
            {/* assuming CART is part of POS for now, or just /cart */}
          </Route>

          <Route element={<ProtectedRoute requiredPermission="EVENTS" />}>
            <Route path="/events" element={<EventsDashboard />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="INVENTORY" />}>
            <Route path="/inventory" element={<InventoryDashboard />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="REPORTS" />}>
            <Route path="/reports" element={<ReportsDashboard />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="STAFF" />}>
            <Route path="/staff" element={<StaffDashboard />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="KDS" />}>
            <Route path="/kds" element={<KDSDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
