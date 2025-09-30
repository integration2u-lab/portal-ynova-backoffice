import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

export default function OportunidadesPage() {
  const [params] = useSearchParams();
  const mes = params.get('mes') || '';
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Oportunidades de Contrato</h1>
        <Link to="/dashboard" className="text-yn-orange text-sm font-medium hover:underline">Voltar</Link>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300">Mês: {mes || 'atual'}</div>
      <div className="border rounded-lg p-4 bg-white dark:bg-[#1a1f24] shadow-sm">Lista completa (mock) a ser preenchida.</div>
    </div>
  );
}

