import React from 'react';
import { Link } from 'react-router-dom';
import { mockClientes } from '../data/mockData';

export default function SimulationClientsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Clientes</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Selecione um cliente para visualizar a simulação detalhada.
        </p>
      </div>

      <div className="bg-white dark:bg-[#1a1f24] rounded-xl border border-gray-200 dark:border-[#2b3238] shadow-sm">
        <ul className="divide-y divide-gray-100 dark:divide-[#2b3238]">
          {mockClientes.map((cliente, idx) => (
            <li key={cliente.id} className="p-0">
              <Link
                to={`/simulation/${cliente.id}`}
                className="group flex items-center justify-between gap-4 p-4 hover:bg-gray-50 dark:hover:bg-[#232932] transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                      {cliente.nome}
                    </p>
                    <span className="inline-flex items-center rounded-full border border-gray-200 dark:border-[#2b3238] px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#1e242b]">
                      Bandeira: {cliente.bandeira}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Imposto: {cliente.imposto} • Consumo: {cliente.consumo} kWh • Geração: {cliente.geracao} kWh
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={
                      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border ' +
                      (cliente.balanco >= 0
                        ? 'text-green-700 bg-green-50 border-green-200 dark:text-green-200 dark:bg-green-900/30 dark:border-green-800'
                        : 'text-red-700 bg-red-50 border-red-200 dark:text-red-200 dark:bg-red-900/30 dark:border-red-800')
                    }
                  >
                    {cliente.balanco >= 0 ? 'Saldo +' : 'Saldo -'} {Math.abs(cliente.balanco)} kWh
                  </span>
                  <span className="text-[#FE5200] group-hover:translate-x-0.5 transition-transform">›</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
