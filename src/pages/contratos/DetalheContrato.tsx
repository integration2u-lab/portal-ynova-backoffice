import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ContractDetail } from './ContractDetail';
import { useContracts } from './ContractsContext';

export default function DetalheContratoPage() {
  const { id } = useParams();
  const { getContractById } = useContracts();
  const contrato = React.useMemo(() => (id ? getContractById(id) : undefined), [getContractById, id]);

  if (!contrato) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-xl font-semibold text-gray-900">Contrato não encontrado</h1>
        <p className="text-sm text-gray-600">
          Não foi possível localizar o contrato selecionado. Retorne à lista de contratos e tente novamente.
        </p>
        <Link
          to="/contratos"
          className="inline-flex items-center justify-center rounded-lg border border-yn-orange px-4 py-2 text-sm font-medium text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
        >
          Voltar para contratos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Contrato {contrato.codigo}</h1>
          <p className="text-sm text-gray-600">{contrato.cliente} · CNPJ {contrato.cnpj}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/contratos"
            className="inline-flex items-center justify-center rounded-lg border border-yn-orange px-4 py-2 text-sm font-medium text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
          >
            Voltar para contratos
          </Link>
        </div>
      </header>

      <ContractDetail contrato={contrato} />
    </div>
  );
}
