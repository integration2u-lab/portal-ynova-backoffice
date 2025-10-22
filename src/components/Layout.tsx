﻿import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, Link} from 'react-router-dom';
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
  Zap,
  Mail,
} from 'lucide-react';
import CrownIcon from './icons/CrownIcon';
import { mockUser } from '../data/mockData';

const navigation = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/contratos', label: 'Contratos', icon: PieChart },
  { to: '/balancos', label: 'Balanço Energético', icon: Zap },
  { to: '/email', label: 'Email', icon: Mail },
  { to: '/analise-fatura', label: 'Análise Fatura', icon: FileText },
  { to: '/simulacao', label: 'Simulação', icon: Calculator },
  /* { to: '/leads', label: 'Balanço Energético', icon: FileText }, */
  /* { to: '/negociacoes', label: 'Negociações', icon: Handshake }, */
  /* { to: '/agenda', label: 'Agenda', icon: Calendar }, */
  { to: '/profile', label: 'Perfil', icon: User },
 /*  { to: '/ranking', label: 'Ranking', icon: CrownIcon }, */
  /* { to: '/training', label: 'Treinamento para Consultor', icon: GraduationCap }, */
 /*  { to: '/notifications', label: 'Notificações', icon: Bell }, */
  { to: '/help', label: 'Ajuda', icon: HelpCircle },
];

interface LayoutProps {
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

interface LayoutState {
  isSidebarCollapsed: boolean;
}

export default function Layout({ onLogout, theme, toggleTheme }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const user = mockUser;

  const handleLogout = () => {
    onLogout();
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#111418] dark:text-gray-100">
      <header
        role="banner"
        className="sticky top-0 z-50 h-16 bg-yn-orange text-white shadow-sm px-4 md:px-6"
      >
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-md text-white hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              aria-label="Toggle sidebar"
            >
              <Menu size={20} />
            </button>
            <Link
              to="/dashboard"
              aria-label="Ir para a página inicial"
              className="flex items-center gap-2"
            >
            {logoError ? (
              <span className="font-semibold text-white">YNOVA</span>
            ) : (
              <img
                src="https://i.imgur.com/eFBlDDM.png"
                alt="YNOVA"
                className="h-40 md:h-40 w-auto"
                loading="eager"
                onError={() => setLogoError(true)}
              />
            )}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={notifRef}>
              <button
                className="p-2 rounded-md text-white hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                aria-label="NotificaÃ§Ãµes"
                onClick={() => setShowNotifications((p) => !p)}
              >
                <Bell size={20} />
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1a1f24] border border-gray-200 dark:border-[#2b3238] rounded-lg shadow-lg p-4 text-sm text-gray-700 dark:text-gray-200">
                  <ul className="space-y-2">
                    <li>Notificações serão exibidas aqui</li>
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-white hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
                aria-hidden
              >
                <span className="text-white text-sm font-medium">
                  {user.name.split(' ').map((n) => n[0]).join('')}
                </span>
              </div>
              <span className="hidden sm:block text-sm font-medium text-white">
                {user.name}
              </span>
            </div>
            <button
              className="md:hidden p-2 rounded-md text-white hover:text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 md:top-16 transition-all duration-300 ${
          isSidebarCollapsed ? 'md:w-20' : 'md:w-64'
        }`}>
          <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#1a1f24] border-r border-gray-200 dark:border-[#2b3238]">
            <nav className="flex-1 px-4 py-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-yn-orange/10 text-yn-orange border border-yn-orange/40 dark:bg-yn-orange/20 dark:text-yn-orange dark:border-yn-orange/40 dark:font-bold'
                          : 'text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1f252b] dark:font-bold'
                      }`
                    }
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <Icon size={28} className={isSidebarCollapsed ? '' : 'mr-3'} />
                    {!isSidebarCollapsed && item.label}
                  </NavLink>
                );
              })}
            </nav>
            <div className="p-4 border-t border-gray-200 dark:border-[#2b3238]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2 text-sm font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900 rounded-lg transition-colors"
                title={isSidebarCollapsed ? 'Sair' : undefined}
              >
                <LogOut size={28} className={isSidebarCollapsed ? '' : 'mr-3'} />
                {!isSidebarCollapsed && 'Sair'}
              </button>
            </div>
          </div>
        </aside>

        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50" role="dialog" aria-modal="true">
            <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-[#1a1f24]">
              <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-[#2b3238]">
                <div className="text-xl font-bold text-yn-orange">YNOVA</div>
                <button onClick={() => setIsMobileMenuOpen(false)} aria-label="Fechar menu">
                  <X size={24} />
                </button>
              </div>
              <nav className="px-4 py-4 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                        `w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          isActive
                            ? 'bg-yn-orange/10 text-yn-orange border border-yn-orange/40 dark:bg-yn-orange/20 dark:text-yn-orange dark:border-yn-orange/40 dark:font-bold'
                            : 'text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1f252b] dark:font-bold'
                        }`
                    }
                  >
                      <Icon size={20} className="mr-3" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-[#2b3238]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-3 py-2 text-sm font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900 rounded-lg transition-colors"
                >
                  <LogOut size={20} className="mr-3" />
                  Sair
                </button>
              </div>
            </div>
          </div>
        )}

        <main className={`flex-1 transition-all duration-300 ${
          isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        }`}>
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 overflow-x-hidden py-4 sm:py-6 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}


