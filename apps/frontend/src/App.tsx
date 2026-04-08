import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { SidebarLayout } from './components/SidebarLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CartProvider } from './context/CartContext';
import { SettingsProvider } from './context/SettingsContext';
import { SocketProvider } from './context/SocketContext';

// Pages
import { POSDashboard } from './pages/POSDashboard';
import { EventsDashboard } from './pages/EventsDashboard';
import { InventoryDashboard } from './pages/InventoryDashboard';
import { ReportsDashboard } from './pages/ReportsDashboard';
import { StaffDashboard } from './pages/StaffDashboard';
import { MenuManagement } from './pages/MenuManagement.tsx';
import { OrdersDashboard } from './pages/OrdersDashboard';
import { Settings } from './pages/Settings';
import ReceiptPreview from './pages/ReceiptPreview';
import { Customers } from './pages/Customers';
import { AnalysisDashboard } from './pages/AnalysisDashboard';

function App() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <SocketProvider>
        <Toaster position="top-right" richColors />
        <LoginScreen />
      </SocketProvider>
    );
  }

  return (
    <SocketProvider>
      <SettingsProvider>
        <CartProvider>
          <BrowserRouter>
            <Toaster position="top-right" richColors />
            <Routes>
              {/* ... Routes ... */}
              <Route element={<SidebarLayout />}>
                <Route element={<ProtectedRoute requiredPermission="POS" />}>
                  <Route path="/" element={<POSDashboard />} />
                  <Route path="/customers" element={<Customers />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="EVENTS" />}>
                  <Route path="/events" element={<EventsDashboard />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="INVENTORY" />}>
                  <Route path="/inventory" element={<InventoryDashboard />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="REPORTS" />}>
                  <Route path="/reports" element={<ReportsDashboard />} />
                  <Route path="/orders" element={<OrdersDashboard />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermission="STAFF" />}>
                  <Route path="/staff" element={<StaffDashboard />} />
                </Route>

                <Route path="/menu-management" element={<MenuManagement />} />
                <Route path="/analysis" element={<AnalysisDashboard />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/receipt-preview" element={<ReceiptPreview />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </SettingsProvider>
    </SocketProvider>
  );
}

export default App;
