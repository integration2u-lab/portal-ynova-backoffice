import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import {
  Home,
  Calendar,
  Calculator,
  FileText,
  PieChart,
  User,
  Bell,
  HelpCircle,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Handshake,
  Sun,
  Moon,
} from 'lucide-react';
import CrownIcon from './icons/CrownIcon';
import { mockUser } from '../data/mockData';

const navigation = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/contratos', label: 'Contratos', icon: PieChart },
  { to: '/analise-fatura', label: 'Análise Fatura', icon: FileText },
  { to: '/simulacao', label: 'Simulação', icon: Calculator },
  { to: '/leads', label: 'Balanço Energético', icon: FileText },
  // { to: '/negociacoes', label: 'Negociações', icon: Handshake },
  // { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/profile', label: 'Perfil', icon: User },
  // { to: '/ranking', label: 'Ranking', icon: CrownIcon },
  // { to: '/training', label: 'Treinamento para Consultor', icon: GraduationCap },
  // { to: '/notifications', label: 'Notificações', icon: Bell },
  { to: '/help', label: 'Ajuda', icon: HelpCircle },
];

interface LayoutProps {
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export default function Layout({ onLogout, theme, toggleTheme }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const user = mockUser;

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const handleLogout = () => {
    onLogout();
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#111418] dark:text-gray-100">
      <header role="banner" className="sticky top-0 z-50 bg-yn-orange text-white shadow-sm">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="hidden rounded-md p-2 text-white transition hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 md:inline-flex"
              aria-label="Alternar menu lateral"
            >
              {isSidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
            </button>
            <Link to="/dashboard" aria-label="Ir para a página inicial" className="flex items-center gap-2">
              {logoError ? (
                <span className="text-lg font-semibold text-white md:text-xl">YNOVA</span>
              ) : (
                <img
                  src="https://i.imgur.com/eFBlDDM.png"
                  alt="YNOVA"
                  className="h-10 w-auto md:h-12"
                  loading="eager"
                  onError={() => setLogoError(true)}
                />
              )}
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                className="rounded-md p-2 text-white transition hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                aria-label="Abrir notificações"
                onClick={() => setShowNotifications((prev) => !prev)}
              >
                <Bell size={20} />
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-lg dark:border-[#2b3238] dark:bg-[#1a1f24] dark:text-gray-200">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Notificações</p>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    Você ainda não possui notificações.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-md p-2 text-white transition hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              title={theme === 'dark' ? 'Alterar para tema claro' : 'Alterar para tema escuro'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
                {initials || 'YN'}
              </div>
              <div className="text-left text-xs leading-tight">
                <span className="block font-semibold text-white">{user.name}</span>
                <span className="text-white/80">{user.email}</span>
              </div>
            </div>

            <button
              type="button"
              className="rounded-md p-2 text-white transition hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 md:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`hidden md:fixed md:inset-y-0 md:top-16 md:flex md:flex-col transition-all duration-300 ${
            isSidebarCollapsed ? 'md:w-20' : 'md:w-64'
          }`}
          aria-label="Menu lateral"
        >
          <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white dark:border-[#2b3238] dark:bg-[#1a1f24]">
            <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'border border-yn-orange/40 bg-yn-orange/10 text-yn-orange dark:border-yn-orange/40 dark:bg-yn-orange/20 dark:text-yn-orange'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-[#1f252b] dark:hover:text-gray-100'
                      }`
                    }
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <Icon size={24} className={isSidebarCollapsed ? 'mx-auto' : 'mr-3'} />
                    {!isSidebarCollapsed && item.label}
                  </NavLink>
                );
              })}
            </nav>
            <div className="border-t border-gray-200 p-4 dark:border-[#2b3238]">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/40"
                title={isSidebarCollapsed ? 'Sair' : undefined}
              >
                <LogOut size={24} className={isSidebarCollapsed ? 'mx-auto' : 'mr-3'} />
                {!isSidebarCollapsed && 'Sair'}
              </button>
            </div>
          </div>
        </aside>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 md:hidden" role="dialog" aria-modal="true">
            <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl dark:bg-[#1a1f24]">
              <div className="flex h-16 items-center justify-between px-4">
                <span className="text-xl font-semibold text-yn-orange">YNOVA</span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-md p-2 text-gray-600 transition hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-yn-orange"
                  aria-label="Fechar menu"
                >
                  <X size={22} />
                </button>
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'border border-yn-orange/40 bg-yn-orange/10 text-yn-orange dark:border-yn-orange/40 dark:bg-yn-orange/20 dark:text-yn-orange'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-[#1f252b] dark:hover:text-gray-100'
                        }`
                      }
                    >
                      <Icon size={22} className="mr-3" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>
              <div className="border-t border-gray-200 p-4 dark:border-[#2b3238]">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/40"
                >
                  <LogOut size={22} className="mr-3" />
                  Sair
                </button>
              </div>
            </div>
          </div>
        )}

        <main
          className={`flex-1 overflow-x-hidden transition-all duration-300 ${
            isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
          }`}
        >
          <div className="mx-auto w-full max-w-screen-2xl overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10 2xl:px-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
