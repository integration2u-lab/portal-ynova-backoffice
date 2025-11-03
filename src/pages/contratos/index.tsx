import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { ContractDetail, StatusBadge } from './ContractDetail';
import type { ContractDetails as ContractMock, StatusResumo } from '../../types/contracts';
import { formatMesLabel } from '../../types/contracts';
import { useContracts } from './ContractsContext';
import CreateContractModal from './CreateContractModal';
import EditContractModal from './EditContractModal';

// Component for displaying contract status badge
function ContractStatusBadge({ status }: { status: ContractMock['status'] }) {
  const isActive = status === 'Ativo';
  return (
    <span
      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
        isActive
          ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
          : 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
      }`}
    >
      {isActive ? 'Contrato Vigente' : 'Contrato encerrado'}
    </span>
  );
}

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
  const { contracts, addContract, isLoading, error, refreshContracts, getContractById } = useContracts();

  const [referencePeriod] = React.useState<'all'>('all');
  const [paginaAtual, setPaginaAtual] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [contratoSelecionado, setContratoSelecionado] = React.useState<string | null>(null);
  const [contratoParaEditar, setContratoParaEditar] = React.useState<ContractMock | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const { updateContract } = useContracts();
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

    // Ordenar por data de cadastro (mais recente primeiro)
    const ordenados = [...filtrados].sort((a, b) => {
      // Extrair a data de criação dos dadosContrato
      const getCreatedAt = (contrato: ContractMock): Date => {
        const criadoEmField = contrato.dadosContrato?.find((field) => 
          field.label.toLowerCase().includes('criado') || field.label.toLowerCase().includes('created')
        );
        if (criadoEmField?.value && criadoEmField.value !== 'Não informado') {
          const date = new Date(criadoEmField.value);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
        // Fallback: usar data de início de vigência ou data padrão muito antiga
        if (contrato.inicioVigencia) {
          const date = new Date(contrato.inicioVigencia);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
        // Se não houver data, usar data muito antiga para que apareçam por último
        return new Date(0);
      };

      const dateA = getCreatedAt(a);
      const dateB = getCreatedAt(b);
      
      // Ordenar crescente (mais antigo primeiro - primeiro cadastrado no topo)
      return dateA.getTime() - dateB.getTime();
    });

    return ordenados;
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

  // Use getContractById to get the full contract data, same as when opening the contract
  const contratoDetalhado = React.useMemo(() => {
    if (!contratoSelecionado) return null;
    return getContractById(contratoSelecionado) ?? null;
  }, [contratoSelecionado, getContractById]);


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

  const handleEditContract = React.useCallback(
    async (contractId: string, updates: Partial<ContractMock>) => {
      await updateContract(contractId, updates);
      await handleRefreshContracts();
    },
    [updateContract, handleRefreshContracts]
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
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Segmento</th>
                    <th className="px-4 py-3 text-left">Preço Médio</th>
                    <th className="px-4 py-3 text-left">Fonte</th>
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
                      <td className="px-4 py-3">
                        <ContractStatusBadge status={contrato.status} />
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-600">{contrato.segmento || 'Não informado'}</td>
                      <td className="px-4 py-3 font-bold text-gray-600">
                        {contrato.precoMedio > 0 ? `R$ ${contrato.precoMedio.toFixed(2)}` : 'Não informado'}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-600">{contrato.fonte || 'Não informado'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Link
                            to={`/contratos/${contrato.id}`}
                            className="rounded-md border border-gray-200 dark:border-gray-600 px-3 py-1 font-bold text-gray-600 dark:text-white transition hover:border-yn-orange hover:text-yn-orange"
                            onClick={(event) => event.stopPropagation()}
                          >
                            Abrir
                          </Link>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setContratoParaEditar(contrato);
                            }}
                            className="rounded-md border border-yn-orange px-3 py-1 font-bold text-yn-orange transition hover:bg-yn-orange hover:text-white"
                          >
                            Editar
                          </button>
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
                    </div>
                    <div className="mt-1 text-sm font-bold text-gray-700">{contrato.cliente}</div>
                    <div className="mt-2">
                      <ContractStatusBadge status={contrato.status} />
                    </div>
                  </button>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Link
                      to={`/contratos/${contrato.id}`}
                      className="flex-1 rounded-md border border-gray-200 dark:border-gray-600 px-3 py-2 text-center font-bold text-gray-600 dark:text-white transition hover:border-yn-orange hover:text-yn-orange"
                    >
                      Abrir
                    </Link>
                    <button
                      type="button"
                      onClick={() => setContratoParaEditar(contrato)}
                      className="flex-1 rounded-md border border-yn-orange px-3 py-2 text-center font-bold text-yn-orange transition hover:bg-yn-orange hover:text-white"
                    >
                      Editar
                    </button>
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
              <button
                type="button"
                onClick={() => setContratoParaEditar(contratoDetalhado)}
                className="inline-flex items-center justify-center rounded-md border border-yn-orange px-3 py-2 text-sm font-bold text-yn-orange transition hover:bg-yn-orange hover:text-white"
              >
                Editar contrato
              </button>
            </div>
          </div>

          <ContractDetail contrato={contratoDetalhado} />
        </section>
      )}
      <CreateContractModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreate={handleCreateContract} />
      {contratoParaEditar && (
        <EditContractModal
          open={!!contratoParaEditar}
          contract={contratoParaEditar}
          onClose={() => setContratoParaEditar(null)}
          onSave={handleEditContract}
        />
      )}
    </div>
  );
}
