import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { SidebarLayout } from './components/SidebarLayout';

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
          <Route path="/" element={<POSDashboard />} />
          <Route path="/events" element={<EventsDashboard />} />
          <Route path="/inventory" element={<InventoryDashboard />} />
          <Route path="/reports" element={<ReportsDashboard />} />
          <Route path="/staff" element={<StaffDashboard />} />
          <Route path="/kds" element={<KDSDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
