import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export default function InteligenciaPage() {
  const [params] = useSearchParams();
  const tipo = params.get('tipo') || 'todos';
  const mes = params.get('mes') || '';

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Inteligência</h1>
        <Link to="/dashboard" className="text-yn-orange">Voltar</Link>
      </div>
      <div className="text-sm text-gray-600">Filtro: tipo = {tipo}, mês = {mes}</div>
      <div className="border rounded p-4 bg-white dark:bg-[#1a1f24]">Placeholder de listagem/relatórios com filtros aplicados.</div>
    </div>
  );
}

