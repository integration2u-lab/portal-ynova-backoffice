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
    <div>
      <Link to="/simulation" className="text-[#FE5200] hover:underline inline-block mb-4">
        &larr; Voltar
      </Link>
      <h1 className="text-2xl font-semibold mb-2">{cliente.nome}</h1>
      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div>
          <span className="font-medium">Bandeira:</span> {cliente.bandeira}
        </div>
        <div>
          <span className="font-medium">Imposto:</span> {cliente.imposto}
        </div>
        <div>
          <span className="font-medium">Consumo:</span> {cliente.consumo} kWh
        </div>
        <div>
          <span className="font-medium">Geração:</span> {cliente.geracao} kWh
        </div>
        <div className="col-span-2">
          <span className="font-medium">Balanço energético:</span>{' '}
          <span className={cliente.balanco >= 0 ? 'text-green-600' : 'text-red-600'}>
            {cliente.balanco} kWh
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-64 bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded">
          Dashboard 1
        </div>
        <div className="h-64 bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded">
          Dashboard 2
        </div>
      </div>
    </div>
  );
}
