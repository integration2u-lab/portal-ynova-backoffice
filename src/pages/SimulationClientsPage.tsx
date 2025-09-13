import React from 'react';
import { Link } from 'react-router-dom';
import { mockClientes } from '../data/mockData';

export default function SimulationClientsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Clientes</h1>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {mockClientes.map((cliente) => (
          <li key={cliente.id} className="py-4">
            <Link
              to={`/simulation/${cliente.id}`}
              className="text-[#FE5200] font-medium hover:underline"
            >
              {cliente.nome}
            </Link>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Balanço energético: {cliente.balanco} kWh
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
