import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Eye, ArrowLeft, PencilLine } from 'lucide-react';
import { ContractDetail } from './ContractDetail';
import { useContracts } from './ContractsContext';
import type { PricePeriods } from './PricePeriodsModal';

export default function DetalheContratoPage() {
  const { id } = useParams();
  const { getContractById, updateContract } = useContracts();
  
  console.log('[DetalheContrato] Render - ID do contrato:', id);
  
  const contrato = React.useMemo(() => {
    if (!id) {
      console.log('[DetalheContrato] useMemo - Sem ID, retornando undefined');
      return undefined;
    }
    const found = getContractById(id);
    console.log('[DetalheContrato] useMemo - Contrato encontrado:', found);
    if (found) {
      console.log('[DetalheContrato] useMemo - periodPrice do contrato:', (found as { periodPrice?: unknown }).periodPrice);
      console.log('[DetalheContrato] useMemo - price_periods direto:', (found as { price_periods?: unknown }).price_periods);
    }
    return found;
  }, [getContractById, id]);

  const handleUpdatePricePeriods = React.useCallback(
    async (periods: PricePeriods) => {
      if (!contrato || !id) return;
      try {
        await updateContract(id, (current) => ({
          ...current,
          pricePeriods: periods,
        }));
      } catch (error) {
        console.error('[DetalheContrato] Falha ao atualizar preços por período:', error);
        throw error;
      }
    },
    [contrato, id, updateContract]
  );

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

  const statusColors: Record<string, string> = {
    'Ativo': 'bg-green-100 text-green-700 border-green-200',
    'Inativo': 'bg-gray-100 text-gray-700 border-gray-200',
    'Em análise': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  };

  const statusColor = statusColors[contrato.status] || statusColors['Em análise'];

  return (
    <div className="space-y-6 p-4">
      {/* Header destacado com informações do contrato */}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm">
        <div className="border-b border-gray-200 bg-white/50 px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 flex-shrink-0">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-gray-900">Contrato {contrato.codigo}</h1>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>
                      {contrato.status}
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-gray-900">
                    {contrato.cliente} · CNPJ {contrato.cnpj}
                  </p>
                  {contrato.segmento && (
                    <p className="mt-1 text-xs text-gray-500">
                      Segmento: {contrato.segmento}
                      {contrato.fornecedor && ` · Fornecedor: ${contrato.fornecedor}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <Link
                to={`/contratos/${contrato.id}/editar`}
                className="inline-flex items-center gap-2 rounded-lg border border-yn-orange bg-white px-4 py-2 text-sm font-semibold text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
              >
                <PencilLine className="h-4 w-4" />
                Editar contrato
              </Link>
              <Link
                to="/contratos"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:border-gray-400"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ContractDetail contrato={contrato} onUpdatePricePeriods={handleUpdatePricePeriods} />
    </div>
  );
}
