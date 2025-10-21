import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { ContractDetail, StatusBadge } from './ContractDetail';
import type { ContractDetails as ContractMock, StatusResumo } from '../../types/contracts';
import { formatMesLabel } from '../../types/contracts';
import { useContracts } from './ContractsContext';
import CreateContractModal from './CreateContractModal';
import { useEnergyBalance } from '../../hooks/useEnergyBalance';
import { EnergyBalanceUtils } from '../../services/energyBalance';

const pageSize = 20;
const statusOrder: StatusResumo[] = ['Conforme', 'Em análise', 'Divergente'];

function formatMonthLabel(periodo: string) {
  return formatMesLabel(periodo).replace('.', '');
}

type StatusSummaryItem = { status: StatusResumo; total: number };

function summarizeResumo(resumo: ContractMock['resumoConformidades']): StatusSummaryItem[] {
  const counts: Record<StatusResumo, number> = {
    Conforme: 0,
    'Em análise': 0,
    Divergente: 0,
  };

  Object.values(resumo).forEach((status) => {
    counts[status] += 1;
  });

  return statusOrder
    .map((status) => ({ status, total: counts[status] }))
    .filter((item) => item.total > 0);
}

function summarizeCounts(counts: Record<StatusResumo, number>): StatusSummaryItem[] {
  return statusOrder
    .map((status) => ({ status, total: counts[status] }))
    .filter((item) => item.total > 0);
}

function StatusPills({ summary }: { summary: StatusSummaryItem[] }) {
  if (!summary.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-600">
      {summary.map(({ status, total }) => (
        <span
          key={status}
          className="inline-flex items-center gap-2 rounded-full bg-white px-2 py-1 shadow-sm"
        >
          <StatusBadge status={status} />
          <span className="text-[11px] font-bold">
            {total} {total === 1 ? 'item' : 'itens'}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function ContratosPage() {
  const { contracts, addContract, isLoading, error, refreshContracts } = useContracts();

  const [referencePeriod] = React.useState<'all'>('all');
  const [paginaAtual, setPaginaAtual] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [contratoSelecionado, setContratoSelecionado] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const isUpdating = isLoading || isRefreshing;

  const handleRefreshContracts = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshContracts();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshContracts]);

  React.useEffect(() => {
    const handleCreated = () => {
      void handleRefreshContracts();
    };
    window.addEventListener('contracts:created', handleCreated);
    return () => window.removeEventListener('contracts:created', handleCreated);
  }, [handleRefreshContracts]);

  const contratosFiltrados = React.useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const numericSearch = normalizedSearch.replace(/\D/g, '');

    const filtrados = contracts.filter((contrato) => {
      if (!normalizedSearch) return true;

      const codigo = contrato.codigo.toLowerCase();
      const cliente = contrato.cliente.toLowerCase();
      const cnpjDigits = contrato.cnpj.replace(/\D/g, '');

      return (
        codigo.includes(normalizedSearch) ||
        cliente.includes(normalizedSearch) ||
        (!!numericSearch && cnpjDigits.includes(numericSearch))
      );
    });

    return filtrados;
  }, [contracts, searchTerm]);

  React.useEffect(() => {
    setPaginaAtual(1);
  }, [searchTerm]);

  const totalPaginas = Math.max(1, Math.ceil(contratosFiltrados.length / pageSize));
  const inicio = (paginaAtual - 1) * pageSize;
  const contratosPaginados = contratosFiltrados.slice(inicio, inicio + pageSize);

  React.useEffect(() => {
    if (!contratosFiltrados.length) {
      setContratoSelecionado(null);
      return;
    }
    if (!contratoSelecionado || !contratosFiltrados.some((c) => c.id === contratoSelecionado)) {
      setContratoSelecionado(contratosFiltrados[0].id);
    }
  }, [contratoSelecionado, contratosFiltrados]);

  const contratoDetalhado = contratosFiltrados.find((c) => c.id === contratoSelecionado) ?? null;

  // Aba ativa para a seção de detalhes do contrato
  const [detailTab, setDetailTab] = React.useState<'resumo' | 'balanco'>('resumo');

  const {
    data: energyBalanceData,
    summary: energyBalanceSummary,
    isLoading: isEnergyBalanceLoading,
    error: energyBalanceError,
    refetch: refetchEnergyBalance,
  } = useEnergyBalance({
    contractId: contratoSelecionado ?? undefined,
    pageSize: 12,
    autoFetch: false,
  });

  React.useEffect(() => {
    if (detailTab === 'balanco' && contratoSelecionado) {
      void refetchEnergyBalance();
    }
  }, [detailTab, contratoSelecionado, refetchEnergyBalance]);

  const statusResumoGeral = React.useMemo(() => {
    const counts: Record<StatusResumo, number> = {
      Conforme: 0,
      'Em análise': 0,
      Divergente: 0,
    };

    contratosFiltrados.forEach((contrato) => {
      Object.values(contrato.resumoConformidades).forEach((status) => {
        counts[status] += 1;
      });
    });

    return counts;
  }, [contratosFiltrados]);

  const handleCreateContract = React.useCallback(
    async (contract: ContractMock) => {
      const saved = await addContract(contract);
      setIsCreateOpen(false);
      await handleRefreshContracts();
      setSearchTerm('');
      setContratoSelecionado(saved.id);
      setPaginaAtual(1);
      return saved;
    },
    [addContract, handleRefreshContracts]
  );

  return (
    <div className="space-y-6 p-4">
      <header className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contratos</h1>
          <p className="mt-2 max-w-2xl text-sm font-bold text-gray-600 dark:text-white">
            Visualize contratos ativos, acompanhe indicadores e status das análises com filtros inteligentes.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_auto_auto] lg:items-end">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-white">Busca</span>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar por código, cliente ou CNPJ"
                    aria-label="Buscar contratos"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm font-bold text-gray-900 placeholder-gray-500 shadow-sm transition focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-white">Período de referência</span>
              <select
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-bold text-gray-900 shadow-sm transition focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
                value={referencePeriod}
                onChange={() => {}}
              >
                <option value="all">Mostrar todos</option>
              </select>
            </div>
            <div className="flex items-end justify-end">
              <button
                type="button"
                onClick={() => void handleRefreshContracts()}
                disabled={isUpdating}
                className="inline-flex items-center rounded-md bg-yn-orange px-4 py-2 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdating ? 'Atualizando…' : 'Atualizar'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setPaginaAtual(1);
                setContratoSelecionado(null);
                setSearchTerm('');
              }}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 px-4 text-sm font-bold text-gray-600 dark:text-white shadow-sm transition hover:border-yn-orange hover:text-yn-orange lg:self-end"
            >
              Resetar filtros
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-yn-orange px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 sm:col-span-2 lg:col-auto lg:self-end"
            >
              <Plus size={18} /> Criar contrato manualmente
            </button>
          </div>
        </div>
      </header>

      <section aria-labelledby="lista-contratos" className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="lista-contratos" className="text-lg font-bold text-gray-900 dark:text-white">
            Lista de Contratos
          </h2>
          <StatusPills summary={summarizeCounts(statusResumoGeral)} />
        </div>

        {error && (
          <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-bold">Não foi possível carregar os contratos da API.</p>
              <p className="font-bold text-red-600/80 dark:text-red-400">{error}</p>
              <p className="font-bold text-red-600/80 dark:text-red-400">Os dados exibidos podem estar desatualizados.</p>
            </div>
            <button
              type="button"
              onClick={() => void handleRefreshContracts()}
              disabled={isUpdating}
              className="inline-flex items-center justify-center rounded-lg border border-red-300 dark:border-red-700 px-4 py-2 text-sm font-bold text-red-700 dark:text-red-300 transition hover:border-red-400 dark:hover:border-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUpdating ? 'Atualizando…' : 'Tentar novamente'}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-8 text-center text-sm font-bold text-gray-500 dark:text-white">
            Carregando contratos...
          </div>
        ) : contratosFiltrados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-8 text-center text-sm font-bold text-gray-500 dark:text-white">
            Nenhum contrato encontrado.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="hidden overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm lg:block">
              <table className="min-w-full table-auto text-sm">
                <thead className="bg-gray-50 dark:bg-[#3E3E3E] text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Contrato</th>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left">Segmento</th>
                    <th className="px-4 py-3 text-left">Ciclo</th>
                    <th className="px-4 py-3 text-left">Preço Médio</th>
                    <th className="px-4 py-3 text-left">Fonte</th>
                    <th className="px-4 py-3 text-left">Resumo</th>
                    <th className="px-4 py-3 text-left">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contratosPaginados.map((contrato) => (
                    <tr
                      key={contrato.id}
                      className={`transition hover:bg-yn-orange/5 ${
                        contratoSelecionado === contrato.id ? 'bg-yn-orange/10' : 'bg-white'
                      }`}
                      onClick={() => setContratoSelecionado(contrato.id)}
                    >
                      <td className="px-4 py-3 font-bold text-gray-900">{contrato.codigo}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900">{contrato.cliente}</div>
                        <div className="text-xs font-bold text-gray-500">CNPJ {contrato.cnpj}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-600">{contrato.segmento}</td>
                      <td className="px-4 py-3 font-bold text-gray-600">{formatMonthLabel(contrato.cicloFaturamento)}</td>
                      <td className="px-4 py-3 font-bold text-gray-600">R$ {contrato.precoMedio.toFixed(2)}</td>
                      <td className="px-4 py-3 font-bold text-gray-600">{contrato.fonte}</td>
                      <td className="px-4 py-3">
                        <StatusPills summary={summarizeResumo(contrato.resumoConformidades)} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Link
                            to={`/contratos/${contrato.id}`}
                            className="rounded-md border border-gray-200 dark:border-gray-600 px-3 py-1 font-bold text-gray-600 dark:text-white transition hover:border-yn-orange hover:text-yn-orange"
                            onClick={(event) => event.stopPropagation()}
                          >
                            Abrir
                          </Link>
                          <Link
                            to={`/contratos/${contrato.id}/editar`}
                            className="rounded-md border border-yn-orange px-3 py-1 font-bold text-yn-orange transition hover:bg-yn-orange hover:text-white"
                            onClick={(event) => event.stopPropagation()}
                          >
                            Editar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 lg:hidden">
              {contratosPaginados.map((contrato) => (
                <div
                  key={contrato.id}
                  className={`rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:border-yn-orange hover:shadow ${
                    contratoSelecionado === contrato.id ? 'border-yn-orange bg-yn-orange/10' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setContratoSelecionado(contrato.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between text-sm font-bold text-gray-900">
                      <span>{contrato.codigo}</span>
                      <span className="text-xs font-bold text-gray-500">{formatMonthLabel(contrato.cicloFaturamento)}</span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-gray-700">{contrato.cliente}</div>
                    <div className="mt-2">
                      <StatusPills summary={summarizeResumo(contrato.resumoConformidades)} />
                    </div>
                  </button>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Link
                      to={`/contratos/${contrato.id}`}
                      className="flex-1 rounded-md border border-gray-200 dark:border-gray-600 px-3 py-2 text-center font-bold text-gray-600 dark:text-white transition hover:border-yn-orange hover:text-yn-orange"
                    >
                      Abrir
                    </Link>
                    <Link
                      to={`/contratos/${contrato.id}/editar`}
                      className="flex-1 rounded-md border border-yn-orange px-3 py-2 text-center font-bold text-yn-orange transition hover:bg-yn-orange hover:text-white"
                    >
                      Editar
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 dark:text-white">
                Página {paginaAtual} de {totalPaginas}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaginaAtual((page) => Math.max(1, page - 1))}
                  disabled={paginaAtual === 1}
                  className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1 text-sm font-bold text-gray-600 dark:text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPaginaAtual((page) => Math.min(totalPaginas, page + 1))}
                  disabled={paginaAtual === totalPaginas}
                  className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1 text-sm font-bold text-gray-600 dark:text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {contratoDetalhado && (
        <section aria-labelledby="detalhes-contrato" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="detalhes-contrato" className="text-lg font-bold text-gray-900 dark:text-white">
                Detalhe do Contrato · {contratoDetalhado.codigo}
              </h2>
              <p className="text-sm font-bold text-gray-500 dark:text-white">{contratoDetalhado.cliente} · CNPJ {contratoDetalhado.cnpj}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPills summary={summarizeResumo(contratoDetalhado.resumoConformidades)} />
              <Link
                to={`/contratos/${contratoDetalhado.id}/editar`}
                className="inline-flex items-center justify-center rounded-md border border-yn-orange px-3 py-2 text-sm font-bold text-yn-orange transition hover:bg-yn-orange hover:text-white"
              >
                Editar contrato
              </Link>
              <button
                type="button"
                onClick={() => setDetailTab('balanco')}
                className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-bold transition border ${detailTab === 'balanco' ? 'bg-yn-orange text-white border-yn-orange' : 'text-gray-600 dark:text-white border-gray-200 dark:border-gray-600 hover:border-yn-orange hover:text-yn-orange'}`}
                title="Abrir Balanço Energético"
              >
                Balanço Energético
              </button>
            </div>
          </div>

          {/* Tabs simples entre Resumo e Balanço Energético */}
          <div className="border-b border-gray-200 dark:border-[#2b3238]">
            <nav className="-mb-px flex flex-wrap gap-2" role="tablist">
              <button
                onClick={() => setDetailTab('resumo')}
                className={`py-2 px-3 border-b-2 text-sm font-bold ${detailTab === 'resumo' ? 'border-yn-orange text-yn-orange' : 'border-transparent text-gray-600 dark:text-white hover:text-yn-orange hover:border-yn-orange/40'}`}
                aria-selected={detailTab === 'resumo'}
              >
                Resumo
              </button>
              <button
                onClick={() => setDetailTab('balanco')}
                className={`py-2 px-3 border-b-2 text-sm font-bold ${detailTab === 'balanco' ? 'border-yn-orange text-yn-orange' : 'border-transparent text-gray-600 dark:text-white hover:text-yn-orange hover:border-yn-orange/40'}`}
                aria-selected={detailTab === 'balanco'}
              >
                Balanço Energético
              </button>
            </nav>
          </div>

          {detailTab === 'resumo' ? (
            <ContractDetail contrato={contratoDetalhado} />
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-white/80">
                  Dados carregados via API de balanço energético
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void refetchEnergyBalance()}
                    disabled={isEnergyBalanceLoading || !contratoSelecionado}
                    className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm font-bold text-gray-700 dark:text-white transition hover:border-yn-orange hover:text-yn-orange disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isEnergyBalanceLoading ? 'Atualizando…' : 'Atualizar balanço'}
                  </button>
                  <Link
                    to={`/contratos/${contratoDetalhado.id}/balanco-energetico`}
                    className="inline-flex items-center rounded-md border border-yn-orange px-3 py-2 text-sm font-bold text-yn-orange transition hover:bg-yn-orange hover:text-white"
                  >
                    Ver página completa
                  </Link>
                </div>
              </div>

              {energyBalanceError && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
                  <div className="text-sm font-bold text-red-700 dark:text-red-300">
                    Erro ao carregar balanço energético: {energyBalanceError}
                  </div>
                  <button
                    type="button"
                    onClick={() => void refetchEnergyBalance()}
                    className="mt-2 inline-flex items-center rounded-md border border-red-300 dark:border-red-700 px-3 py-1 text-sm font-bold text-red-700 dark:text-red-300 transition hover:border-red-400 hover:bg-red-100 dark:hover:border-red-500 dark:hover:bg-red-900/40"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {isEnergyBalanceLoading && (
                <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-600 bg-white p-6 text-center text-sm font-bold text-gray-500 dark:text-white">
                  Carregando dados do balanço energético...
                </div>
              )}

              {!isEnergyBalanceLoading && !energyBalanceError && energyBalanceData.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-600 bg-white p-6 text-center text-sm font-bold text-gray-500 dark:text-white">
                  Nenhum dado de balanço energético disponível para este contrato.
                </div>
              )}

              {energyBalanceSummary && energyBalanceData.length > 0 && !isEnergyBalanceLoading && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Consumo total</div>
                    <div className="mt-2 text-2xl font-bold text-gray-900">
                      {EnergyBalanceUtils.formatMwh(energyBalanceSummary.total_consumption_mwh)} MWh
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Custo total</div>
                    <div className="mt-2 text-2xl font-bold text-gray-900">
                      {EnergyBalanceUtils.formatCurrency(energyBalanceSummary.total_cost)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500">PROINFA total</div>
                    <div className="mt-2 text-2xl font-bold text-gray-900">
                      {EnergyBalanceUtils.formatCurrency(energyBalanceSummary.total_proinfa)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Economia potencial</div>
                    <div className="mt-2 text-2xl font-bold text-gray-900">
                      {EnergyBalanceUtils.formatCurrency(energyBalanceSummary.potential_savings)}
                    </div>
                  </div>
                </div>
              )}

              {energyBalanceData.length > 0 && !isEnergyBalanceLoading && (
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
                      {energyBalanceData.map((row) => {
                        const consumoMwh = EnergyBalanceUtils.kwhToMwh(row.consumption_kwh);
                        const custo = EnergyBalanceUtils.calculateCurrentCost(row);
                        const faixaMin = row.min_demand ?? null;
                        const faixaMax = row.max_demand ?? null;

                        return (
                          <tr key={row.id} className="bg-white hover:bg-gray-50">
                            <td className="px-4 py-3 font-bold text-gray-900">
                              {EnergyBalanceUtils.formatMonthReference(row.reference_base)}
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">{row.meter}</td>
                            <td className="px-4 py-3 font-bold text-gray-900">
                              {EnergyBalanceUtils.formatMwh(consumoMwh)}
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">
                              {EnergyBalanceUtils.formatCurrency(row.price)} / MWh
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">
                              {EnergyBalanceUtils.formatCurrency(custo)}
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">
                              {EnergyBalanceUtils.formatCurrency(row.proinfa_contribution)}
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">
                              {faixaMin !== null && faixaMax !== null
                                ? `${EnergyBalanceUtils.formatMwh(faixaMin)} – ${EnergyBalanceUtils.formatMwh(faixaMax)} MWh`
                                : 'Não informado'}
                            </td>
                            <td className="px-4 py-3 font-bold text-gray-900">{row.adjusted ? 'Sim' : 'Não'}</td>
                            <td className="px-4 py-3">
                              <Link
                                to={`/contratos/${contratoDetalhado.id}/balanco-energetico`}
                                className="rounded-md border border-gray-200 dark:border-gray-600 px-3 py-1 text-xs font-bold text-gray-600 dark:text-white transition hover:border-yn-orange hover:text-yn-orange"
                              >
                                Ver detalhes
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                <div className="text-sm font-bold text-gray-900">Balanço Energético</div>
                <p className="mt-1 text-xs font-bold text-gray-600 dark:text-white/80">
                  Dados provenientes da API de balanço energético consolidam consumo, preço e encargos para cálculo,
                  auditoria e geração de oportunidades.
                </p>
              </div>
            </div>
          )}
        </section>
      )}
      <CreateContractModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreate={handleCreateContract} />
    </div>
  );
}
