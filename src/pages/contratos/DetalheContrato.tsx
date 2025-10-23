import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ContractDetail } from './ContractDetail';
import { useContracts } from './ContractsContext';
import { GenerateEnergyBalanceModal } from '../../components/GenerateEnergyBalanceModal';

export default function DetalheContratoPage() {
  const { id } = useParams();
  const { getContractById } = useContracts();
  const contrato = React.useMemo(() => (id ? getContractById(id) : undefined), [getContractById, id]);
  const [isGenerationModalOpen, setGenerationModalOpen] = React.useState(false);

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
          <button
            type="button"
            onClick={() => setGenerationModalOpen(true)}
            className="inline-flex items-center justify-center rounded-lg bg-yn-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90"
          >
            Criar Balanço Energético
          </button>
          <Link
            to={`/contratos/${contrato.id}/balanco-energetico`}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm font-bold text-gray-700 dark:text-white transition hover:border-yn-orange hover:text-yn-orange"
            title="Abrir Balanço Energético"
          >
            Balanço Energético
          </Link>
          <Link
            to="/contratos"
            className="inline-flex items-center justify-center rounded-lg border border-yn-orange px-4 py-2 text-sm font-medium text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
          >
            Voltar para contratos
          </Link>
        </div>
      </header>

      <ContractDetail contrato={contrato} />
      <GenerateEnergyBalanceModal
        isOpen={isGenerationModalOpen}
        onClose={() => setGenerationModalOpen(false)}
        contract={contrato}
      />
    </div>
  );
}
