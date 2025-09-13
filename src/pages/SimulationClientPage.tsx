import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { mockClientes } from '../data/mockData';

export default function SimulationClientPage() {
  const { clientId } = useParams();
  const cliente = mockClientes.find((c) => c.id.toString() === clientId);

  if (!cliente) {
    return <div>Cliente não encontrado</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/simulation"
            className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#2b3238] rounded-lg px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-[#232932] transition-colors"
          >
            ← Voltar
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {cliente.nome}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Resumo de consumo, geração e saldo energético.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1a1f24] rounded-xl p-5 border border-gray-200 dark:border-[#2b3238] shadow-sm">
          <p className="text-sm text-gray-600 dark:text-gray-300">Consumo</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{cliente.consumo} kWh</p>
        </div>
        <div className="bg-white dark:bg-[#1a1f24] rounded-xl p-5 border border-gray-200 dark:border-[#2b3238] shadow-sm">
          <p className="text-sm text-gray-600 dark:text-gray-300">Geração</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{cliente.geracao} kWh</p>
        </div>
        <div className="bg-white dark:bg-[#1a1f24] rounded-xl p-5 border border-gray-200 dark:border-[#2b3238] shadow-sm">
          <p className="text-sm text-gray-600 dark:text-gray-300">Balanço energético</p>
          <p
            className={
              'mt-1 text-2xl font-bold ' +
              (cliente.balanco >= 0 ? 'text-green-600' : 'text-red-600')
            }
          >
            {cliente.balanco} kWh
          </p>
        </div>
      </div>

      {/* Detalhes */}
      <div className="bg-white dark:bg-[#1a1f24] rounded-xl border border-gray-200 dark:border-[#2b3238] shadow-sm">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-[#2b3238]">
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-600 dark:text-gray-300">Bandeira</dt>
            <dd className="mt-1 text-gray-900 dark:text-gray-100">{cliente.bandeira}</dd>
          </div>
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-600 dark:text-gray-300">Imposto</dt>
            <dd className="mt-1 text-gray-900 dark:text-gray-100">{cliente.imposto}</dd>
          </div>
        </dl>
      </div>

      {/* Dashboards placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#1a1f24] rounded-xl border border-gray-200 dark:border-[#2b3238] shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#2b3238]">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Consumo x Geração</h3>
            <span className="text-xs text-[#FE5200]">Simulação</span>
          </div>
          <div className="h-64 flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">
            (gráfico/visualização)
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a1f24] rounded-xl border border-gray-200 dark:border-[#2b3238] shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#2b3238]">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Economia Estimada</h3>
            <span className="text-xs text-[#FE5200]">Mensal</span>
          </div>
          <div className="h-64 flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">
            (gráfico/visualização)
          </div>
        </div>
      </div>
    </div>
  );
}
