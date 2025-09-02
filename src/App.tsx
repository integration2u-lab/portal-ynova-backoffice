import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import { useTheme } from './hooks/useTheme';
import DashboardPage from './pages/DashboardPage';
import LeadsPage from './pages/LeadsPage';
// import AgendaPage from './pages/AgendaPage';
// import ProposalsPage from './pages/ProposalsPage';
// import CommissionsPage from './pages/CommissionsPage';
// import ProfilePage from './pages/ProfilePage';
// import NotificationsPage from './pages/NotificationsPage';
import HelpPage from './pages/HelpPage';
import LoginPage from './pages/LoginPage';
import TrainingPage from './pages/TrainingPage';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleLogin = (
    e: React.FormEvent,
    email: string,
    password: string
  ) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setTimeout(() => {
      if (email === 'admin@admin' && password === 'admin') {
        setIsAuthenticated(true);
        navigate('/dashboard');
      } else {
        setError('Credenciais inválidas');
      }
      setIsLoading(false);
    }, 800);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <Routes>
      {isAuthenticated ? (
        <>
          <Route path="/" element={<Layout onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />}> 
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="leads" element={<LeadsPage />} />
            {/* <Route path="agenda" element={<AgendaPage />} /> */}
            {/* <Route path="proposals" element={<ProposalsPage />} /> */}
            {/* <Route path="commissions" element={<CommissionsPage />} /> */}
            {/* <Route path="profile" element={<ProfilePage />} /> */}
            <Route path="training" element={<TrainingPage />} />
            {/* <Route path="notifications" element={<NotificationsPage />} /> */}
            <Route path="help" element={<HelpPage />} />
          </Route>
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </>
      ) : (
        <>
          <Route
            path="/login"
            element={
              <LoginPage
                onLogin={handleLogin}
                isLoading={isLoading}
                error={error}
              />
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      )}
    </Routes>
  );
}
