import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

export default function OportunidadesPage() {
  const [params] = useSearchParams();
  const mes = params.get('mes') || '';
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Oportunidades de Contrato</h1>
        <Link to="/dashboard" className="text-yn-orange">Voltar</Link>
      </div>
      <div className="text-sm text-gray-600">Mês: {mes || 'atual'}</div>
      <div className="border rounded p-4 bg-white dark:bg-[#1a1f24]">Lista completa (mock) a ser preenchida.</div>
    </div>
  );
}

