import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import ReportPage from './pages/ReportPage';
import TrackingPage from './pages/TrackingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import HotspotsPage from './pages/HotspotsPage';
import AiCenterPage from './pages/AiCenterPage';
import AppShell from './components/layout/AppShell';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Citizen Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/track" element={<TrackingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Administrator Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/hotspots" element={<HotspotsPage />} />
          <Route path="/ai-center" element={<AiCenterPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
