import React from 'react';
import { Link } from 'react-router-dom';
import ListRow from '../components/ListRow';
import { mockClientes } from '../data/mockData';

export default function SimulationClientsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Balanço Energético</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Selecione um cliente para visualizar custos atuais, estimativas e economia.
        </p>
      </div>

      <div className="bg-white dark:bg-[#1a1f24] rounded-xl border border-gray-200 dark:border-[#2b3238] shadow-sm">
        <ul className="divide-y divide-gray-100 dark:divide-[#2b3238]">
          {mockClientes.map((cliente) => (
            <ListRow
              key={cliente.id}
              to={`/leads/simulation/${cliente.id}`}
              title={cliente.nome}
              badgeLabel={`Bandeira: ${cliente.bandeira}`}
              detail={`Imposto: ${cliente.imposto} • Consumo: ${cliente.consumo} kWh • Geração: ${cliente.geracao} kWh`}
              rightPill={{
                label: `${cliente.balanco >= 0 ? 'Saldo +' : 'Saldo -'} ${Math.abs(cliente.balanco)} kWh`,
                color: cliente.balanco >= 0 ? 'green' : 'red',
              }}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
