import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import { useTheme } from './hooks/useTheme';
import DashboardPage from './pages/DashboardPage';
import AgendaPage from './pages/AgendaPage';
import CommissionsPage from './pages/CommissionsPage';
import ProfilePage from './pages/ProfilePage';
import RankingPage from './pages/Ranking';
import NotificationsPage from './pages/NotificationsPage';
import InteligenciaPage from './pages/InteligenciaPage';
import HelpPage from './pages/HelpPage';
import LoginPage from './pages/LoginPage';
import TrainingPage from './pages/TrainingPage';
import SimulationClientsPage from './pages/SimulationClientsPage';
import SimulationClientPage from './pages/SimulationClientPage';
import SimulationPage from './pages/SimulationPage';
import InvoiceProcessingPage from './pages/InvoiceProcessingPage';
import InvoiceAnalysisPage from './pages/InvoiceAnalysisPage';
import OportunidadesPage from './pages/OportunidadesPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import ContratosPage from './pages/contratos';
import DetalheContratoPage from './pages/contratos/DetalheContrato';
import EditarContratoPage from './pages/contratos/EditContractPage';
import ContractsLayout from './pages/contratos/ContractsLayout';
import EnergyBalanceListPage from './pages/Balancos/EnergyBalanceListPage';
import EnergyBalanceYearViewPage from './pages/Balancos/EnergyBalanceYearViewPage';
import EnergyBalanceDetailPage from './pages/Balancos/EnergyBalanceDetailPage';
import BalancosLayout from './pages/Balancos/BalancosLayout';
import ClientsPage from './pages/clientes';
import ClientsLayout from './pages/clientes/ClientsLayout';
import ClientDetailPage from './pages/clientes/ClientDetailPage';
import SuppliersPage from './pages/fornecedores';
import SuppliersLayout from './pages/fornecedores/SuppliersLayout';
import SupplierDetailPage from './pages/fornecedores/SupplierDetailPage';
// import EmailPage from './pages/EmailPage'; // Temporariamente desabilitada
const Negociacoes = lazy(() => import('./pages/Negociacoes'));

function AppRoutes() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { user, login, logout, loading, error } = useAuth();

  // Função helper para verificar SKIP_LOGIN
  const getSkipLogin = (): boolean => {
    try {
      const flag = import.meta.env.VITE_SKIP_LOGIN;
      if (typeof flag === 'string') {
        return flag.toLowerCase() === 'true' || flag === '1';
      }
      if (flag === true) return true;
      return false;
    } catch {
      return false;
    }
  };

  const SKIP_LOGIN = getSkipLogin();
  
  console.log('[AppRoutes] SKIP_LOGIN:', SKIP_LOGIN, 'VITE_SKIP_LOGIN:', import.meta.env.VITE_SKIP_LOGIN);

  const handleLogin = async (e: React.FormEvent, email: string, password: string) => {
    e.preventDefault();
    await login(email, password);
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) return null;

  // Se SKIP_LOGIN estiver ativo e não houver usuário, redireciona para dashboard
  // (o AuthContext já deve ter criado o usuário, mas garantimos o redirecionamento)
  if (SKIP_LOGIN && !user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Routes>
      {user ? (
        <>
          <Route path="/" element={<Layout onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />}> 
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="oportunidades" element={<OportunidadesPage />} />
            <Route path="inteligencia" element={<InteligenciaPage />} />
            <Route path="processamento-fatura" element={<InvoiceProcessingPage />} />
            <Route path="analise-faturas" element={<InvoiceAnalysisPage />} />
            <Route path="simulacao" element={<SimulationPage />} />
            <Route path="balancos" element={<BalancosLayout />}>
              <Route index element={<EnergyBalanceYearViewPage />} />
              <Route path="lista" element={<EnergyBalanceListPage />} />
              <Route path=":id" element={<EnergyBalanceDetailPage />} />
            </Route>

            {/* <Route path="email" element={<EmailPage />} /> */}

            {/* Gestão: Contratos */}
            <Route path="contratos" element={<ContractsLayout />}>
              <Route index element={<ContratosPage />} />
              <Route path=":id" element={<DetalheContratoPage />} />
              <Route path=":id/editar" element={<EditarContratoPage />} />
            </Route>

            {/* Gestão: Clientes */}
            <Route path="clientes" element={<ClientsLayout />}>
              <Route index element={<ClientsPage />} />
              <Route path=":id" element={<ClientDetailPage />} />
            </Route>

            {/* Gestão: Fornecedores */}
            <Route path="fornecedores" element={<SuppliersLayout />}>
              <Route index element={<SuppliersPage />} />
              <Route path=":id" element={<SupplierDetailPage />} />
            </Route>

            {/* Conteúdo legado do portal de consultores (pode ser ajustado por role no futuro) */}
            <Route path="leads" element={<SimulationClientsPage />} />
            <Route path="leads/:clientId" element={<SimulationClientPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="commissions" element={<CommissionsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="ranking" element={<RankingPage />} />
            <Route path="training" element={<TrainingPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route
              path="negociacoes"
              element={
                <Suspense fallback={null}>
                  <Negociacoes />
                </Suspense>
              }
            />
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
                isLoading={loading}
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

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}




