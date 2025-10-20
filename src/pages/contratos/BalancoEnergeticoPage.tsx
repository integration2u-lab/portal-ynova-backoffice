import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useContracts } from './ContractsContext';
import { useEnergyBalance } from '../../hooks/useEnergyBalance';
import { EnergyBalanceUtils } from '../../services/energyBalance';

export default function BalancoEnergeticoPage() {
  const { id } = useParams();
  const { getContractById } = useContracts();
  const contrato = React.useMemo(() => (id ? getContractById(id) : undefined), [getContractById, id]);

  // Fetch energy balance data from API
  const { 
    data: energyBalanceData, 
    summary, 
    isLoading, 
    error, 
    refetch 
  } = useEnergyBalance({
    contractId: id,
    pageSize: 50, // Show more items per page
    autoFetch: !!id,
  });

  if (!contrato) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Contrato não encontrado</h1>
        <p className="text-sm font-bold text-gray-600 dark:text-white">
          Não foi possível localizar o contrato selecionado. Retorne à lista de contratos e tente novamente.
        </p>
        <Link
          to="/contratos"
          className="inline-flex items-center justify-center rounded-lg border border-yn-orange px-4 py-2 text-sm font-bold text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Balanço Energético · {contrato.codigo}</h1>
          <p className="text-sm font-bold text-gray-600 dark:text-white">{contrato.cliente} · CNPJ {contrato.cnpj}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/contratos/${contrato.id}`}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm font-bold text-gray-700 dark:text-white transition hover:border-yn-orange hover:text-yn-orange"
          >
            Ver Contrato
          </Link>
          <Link
            to="/contratos"
            className="inline-flex items-center justify-center rounded-lg border border-yn-orange px-4 py-2 text-sm font-bold text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
          >
            Voltar para contratos
          </Link>
        </div>
      </header>

      <div className="space-y-6">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <div className="text-sm font-bold text-gray-500 dark:text-white">Carregando dados do balanço energético...</div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
            <div className="text-sm font-bold text-red-700 dark:text-red-300">
              Erro ao carregar dados: {error}
            </div>
            <button
              onClick={() => refetch()}
              className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1 text-sm font-bold text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* KPIs do balanço */}
        {summary && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Consumo total</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {EnergyBalanceUtils.formatMwh(summary.total_consumption_mwh)} MWh
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Custo total</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {EnergyBalanceUtils.formatCurrency(summary.total_cost)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wide text-gray-500">PROINFA total</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {EnergyBalanceUtils.formatCurrency(summary.total_proinfa)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Economia potencial</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {EnergyBalanceUtils.formatCurrency(summary.potential_savings)}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-auto">
          <table className="min-w-[920px] w-full table-auto text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Mês</th>
                <th className="px-4 py-3 text-left">Medidor</th>
                <th className="px-4 py-3 text-left">Consumo (MWh)</th>
                <th className="px-4 py-3 text-left">Preço (R$/MWh)</th>
                <th className="px-4 py-3 text-left">Custo do mês</th>
                <th className="px-4 py-3 text-left">PROINFA</th>
                <th className="px-4 py-3 text-left">Faixa contratual</th>
                <th className="px-4 py-3 text-left">Ajustado</th>
                <th className="px-4 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {energyBalanceData.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm font-bold text-gray-500 dark:text-white">
                    Nenhum dado de balanço energético encontrado para este contrato.
                  </td>
                </tr>
              ) : (
                energyBalanceData.map((row) => {
                  const consumoMwh = EnergyBalanceUtils.kwhToMwh(row.consumption_kwh);
                  const custo = EnergyBalanceUtils.calculateCurrentCost(row);
                  const faixaMin = row.min_demand || 0;
                  const faixaMax = row.max_demand || 0;
                  
                  return (
                    <tr key={row.id} className="bg-white hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-900">{EnergyBalanceUtils.formatMonthReference(row.reference_base)}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{row.meter}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{EnergyBalanceUtils.formatMwh(consumoMwh)}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{EnergyBalanceUtils.formatCurrency(row.price)}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{EnergyBalanceUtils.formatCurrency(custo)}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{EnergyBalanceUtils.formatCurrency(row.proinfa_contribution)}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {faixaMin > 0 && faixaMax > 0 ? `${faixaMin.toFixed(0)} – ${faixaMax.toFixed(0)} MWh` : 'Não informado'}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">{row.adjusted ? 'Sim' : 'Não'}</td>
                      <td className="px-4 py-3">
                        <DetalhamentoButton row={row} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-gray-900">Balanço Energético</div>
          <p className="mt-1 text-xs font-bold text-gray-600">
            Linha do tempo mensal por medidor/cliente/contrato consolidando consumo, preço e encargos para cálculo, auditoria e geração de oportunidades.
          </p>
        </div>
      </div>
    </div>
  );
}

// Botão e Modal de detalhamento
function DetalhamentoButton({ row }: { row: any }) {
  const [open, setOpen] = React.useState(false);

  const consumoMwh = EnergyBalanceUtils.kwhToMwh(row.consumption_kwh);
  const custoAtual = EnergyBalanceUtils.calculateCurrentCost(row);
  const alvo = row.min_demand || 0; // Using min_demand as contracted volume approximation
  const faixaMin = row.min_demand || 0;
  const faixaMax = row.max_demand || 0;
  const custoEsperado = row.price * alvo; // Expected cost calculation
  const economiaPotencial = EnergyBalanceUtils.calculatePotentialSavings(custoAtual, custoEsperado);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-gray-200 px-3 py-1 font-bold text-gray-600 transition hover:border-yn-orange hover:text-yn-orange"
      >
        Detalhamento
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-5xl rounded-xl bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Detalhamento · {row.meter} · {EnergyBalanceUtils.formatMonthReference(row.reference_base)}</h3>
              <button onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-sm font-bold text-gray-600 hover:text-yn-orange">Fechar</button>
            </div>

            {/* KPIs principais exigidos */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Kpi label="Consumo (MWh)" value={EnergyBalanceUtils.formatMwh(consumoMwh)} />
              <Kpi label="Custo atual do mês" value={EnergyBalanceUtils.formatCurrency(custoAtual)} />
              <Kpi label="Alvo contratual (MWh)" value={EnergyBalanceUtils.formatMwh(alvo)} />
              <Kpi label="Faixa contratual" value={`${faixaMin.toFixed(0)} – ${faixaMax.toFixed(0)} MWh`} />
              <Kpi label="PROINFA (R$)" value={EnergyBalanceUtils.formatCurrency(row.proinfa_contribution)} />
              <Kpi label="Custo esperado" value={EnergyBalanceUtils.formatCurrency(custoEsperado)} />
              <Kpi label="Economia potencial" value={EnergyBalanceUtils.formatCurrency(economiaPotencial)} />
            </div>

            {/* Tabelas espelhando as guias da imagem */}
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <div className="mb-2 text-sm font-bold text-gray-900">Medições / Requisitos</div>
                <table className="w-full table-fixed text-xs">
                  <thead className="bg-blue-900 text-white">
                    <tr>
                      <th className="px-2 py-1 text-left">Mês</th>
                      <th className="px-2 py-1 text-left">Consumo</th>
                      <th className="px-2 py-1 text-left">Perdas (3%)</th>
                      <th className="px-2 py-1 text-left">Proinfa</th>
                      <th className="px-2 py-1 text-left">Requisito</th>
                      <th className="px-2 py-1 text-left">Recurso</th>
                      <th className="px-2 py-1 text-left">NET</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-2 py-1 font-bold">{EnergyBalanceUtils.formatMonthReference(row.reference_base)}</td>
                      <td className="px-2 py-1">{EnergyBalanceUtils.formatMwh(consumoMwh)} MWh</td>
                      <td className="px-2 py-1">{(consumoMwh * 0.03).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} MWh</td>
                      <td className="px-2 py-1">{(row.proinfa_contribution / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} MWh</td>
                      <td className="px-2 py-1">{EnergyBalanceUtils.formatMwh(consumoMwh)} MWh</td>
                      <td className="px-2 py-1">{EnergyBalanceUtils.formatMwh(consumoMwh)} MWh</td>
                      <td className="px-2 py-1">{(0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} MWh</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <div className="mb-2 text-sm font-bold text-gray-900">Faixa Contratual</div>
                <table className="w-full table-fixed text-xs">
                  <thead className="bg-blue-900 text-white">
                    <tr>
                      <th className="px-2 py-1 text-left">Mês</th>
                      <th className="px-2 py-1 text-left">Contrato</th>
                      <th className="px-2 py-1 text-left">Mínimo</th>
                      <th className="px-2 py-1 text-left">Máximo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-2 py-1 font-bold">{EnergyBalanceUtils.formatMonthReference(row.reference_base)}</td>
                      <td className="px-2 py-1">{EnergyBalanceUtils.formatMwh(alvo)} MWh</td>
                      <td className="px-2 py-1">{faixaMin.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} MWh</td>
                      <td className="px-2 py-1">{faixaMax.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} MWh</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
