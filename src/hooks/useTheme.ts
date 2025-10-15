import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) return stored;
    return 'light';
  });

  const location = useLocation();

  useEffect(() => {
    const root = window.document.documentElement;
    if (location.pathname === '/login') {
      root.classList.remove('dark');
      return;
    }
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme, location.pathname]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const resetTheme = () => {
    localStorage.removeItem('theme');
    setTheme('light');
  };

  return { theme, toggleTheme, resetTheme } as const;
}
