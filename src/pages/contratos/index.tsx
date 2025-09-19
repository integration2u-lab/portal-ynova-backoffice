import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';

export type Contrato = {
  id: string;
  numero: string;
  cliente: string;
  cnpj?: string;
  segmento?: string;
  contato?: string;
  status: 'ATIVO' | 'INATIVO';
  ciclo_faturamento: string; // YYYY-MM
  volume_contratado_mwh: number;
  preco_r_mwh: number;
  fonte: 'Convencional' | 'Incentivada';
  flexibilidade_pct: number; // ex.: 0.05 = 5%
  // Novos campos mockados para oportunidade de contrato
  status_oportunidade_contrato?: 'COM' | 'SEM' | 'SOLICITAR';
  observacao_oportunidade?: string;
  resumo_conformidades?: {
    nf_energia: 'Conforme' | 'Divergente' | 'Indefinido';
    nf_icms: 'Conforme' | 'Divergente' | 'Indefinido';
    fatura: 'Conforme' | 'Divergente' | 'Indefinido';
  };
};

type Paginacao = {
  paginaAtual: number;
  totalPaginas: number;
  totalItens: number;
};

type ContratosResponse = {
  contratos: Contrato[];
  paginacao: Paginacao;
};

function ym(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export default function ContratosPage() {
  const [searchParams] = useSearchParams();
  const initialMes = searchParams.get('mes') || ym();
  const [mes, setMes] = React.useState<string>(initialMes);
  const [page, setPage] = React.useState<number>(1);
  const [somenteComOportunidade, setSomenteComOportunidade] = React.useState<boolean>(false);
  const pageSize = 10;

  const { data, isFetching } = useQuery<ContratosResponse>({
    queryKey: ['contratos', mes, page],
    queryFn: async () => {
      const params = new URLSearchParams({ mes, page: String(page), pageSize: String(pageSize) });
      const res = await fetch(`/api/contratos?${params.toString()}`);
      if (!res.ok) throw new Error('Erro ao carregar contratos');
      return res.json();
    },
    keepPreviousData: true,
  });

  const contratos = data?.contratos || [];
  const contratosFiltrados = somenteComOportunidade
    ? contratos.filter((c) => c.status_oportunidade_contrato === 'COM')
    : contratos;
  const pag = data?.paginacao || { paginaAtual: page, totalPaginas: 1, totalItens: 0 };

  const onChangeMes: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setMes(e.target.value);
    setPage(1);
  };

  const hasData = contratosFiltrados.length > 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Contratos</h1>
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={somenteComOportunidade}
              onChange={(e) => setSomenteComOportunidade(e.target.checked)}
            />
            Somente com oportunidade
          </label>
          <input
            type="month"
            value={mes}
            onChange={onChangeMes}
            className="border rounded px-2 py-1"
            aria-label="Selecionar mês (YYYY-MM)"
          />
        </div>
      </div>

      {/* Legenda Conformidades */}
      <div className="text-xs text-gray-600" aria-label="Legenda de cores das conformidades">
        <span title="Conforme" className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 mr-2">Conforme</span>
        <span title="Divergente" className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 mr-2">Divergente</span>
        <span title="Indefinido" className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700">Indefinido</span>
      </div>

      {!hasData && !isFetching ? (
        <div aria-live="polite" className="border rounded p-8 text-center text-gray-600">
          Nenhum contrato encontrado para o período selecionado.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="overflow-auto border rounded hidden sm:block">
            <table className="w-full table-auto min-w-[960px] divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="p-2 text-left">Empresa</th>
                  <th className="p-2 text-left">CNPJ</th>
                  <th className="p-2 text-left">Segmento</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Oportunidade de Contrato</th>
                  <th className="p-2 text-left">Conformidades</th>
                  <th className="p-2 text-left">Ciclo</th>
                  <th className="p-2 text-right">Volume (MWh)</th>
                  <th className="p-2 text-right">Preço (R$/MWh)</th>
                  <th className="p-2 text-left">Fonte</th>
                  <th className="p-2 text-right">Flexibilidade</th>
                  <th className="p-2 text-left">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contratosFiltrados.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="p-2">
                      <div className="text-sm font-medium text-gray-900"><Link to={'/contratos/' + c.id} className="text-yn-orange hover:underline">{c.cliente}</Link></div>
                      <div className="text-xs text-gray-500">Contrato {c.numero}{c.contato ? ` · ${c.contato}` : ''}</div>
                    </td>
                    <td className="p-2">{c.cnpj || '-'}</td>
                    <td className="p-2">{c.segmento || '-'}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${c.status==='ATIVO'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-700'}`}>{c.status}</span>
                    </td>
                    <td className="p-2">
                      {(() => {
                        const st = c.status_oportunidade_contrato || 'SOLICITAR';
                        const cls = st === 'COM'
                          ? 'bg-red-100 text-red-700'
                          : st === 'SEM'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700';
                        const label = st === 'COM' ? 'Com Oportunidade' : st === 'SEM' ? 'Sem Oportunidade' : 'Solicitar Dado';
                        return (
                          <span className={`px-2 py-1 rounded text-xs`} title={c.observacao_oportunidade || ''}>
                            <span className={`px-2 py-0.5 rounded ${cls}`}>{label}</span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-2">
                      {(() => {
                        const r = c.resumo_conformidades;
                        const badge = (status?: string, label?: string, aria?: string) => {
                          const st = status || 'Indefinido';
                          const cls = st === 'Conforme' ? 'bg-green-100 text-green-700' : st === 'Divergente' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700';
                          return <span aria-label={aria} className={`px-1.5 py-0.5 rounded text-[11px] mr-1 ${cls}`}>{label}</span>;
                        };
                        return (
                          <div>
                            {badge(r?.nf_energia, 'NF Energia', 'NF Energia')}
                            {badge(r?.nf_icms, 'NF ICMS', 'NF ICMS')}
                            {badge(r?.fatura, 'Fatura', 'Fatura')}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-2">{c.ciclo_faturamento}</td>
                    <td className="p-2 text-right">{c.volume_contratado_mwh.toFixed(2)}</td>
                    <td className="p-2 text-right">{c.preco_r_mwh.toFixed(2)}</td>
                    <td className="p-2">{c.fonte}</td>
                    <td className="p-2 text-right">{(c.flexibilidade_pct*100).toFixed(0)}%</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Link to={'/contratos/' + c.id} className="text-yn-orange hover:text-yn-orange/80">Abrir</Link>
                        <button className="text-blue-600 hover:text-blue-900">Solicitar fatura</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {isFetching && (
                  <tr>
                    <td colSpan={12} className="p-4 text-center text-gray-500">Carregando...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile simple list */}
          <div className="sm:hidden">
            <ul className="divide-y divide-gray-200 bg-white rounded-xl">
              {contratosFiltrados.map((c) => (
                <li key={c.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{c.cliente}</div>
                      <div className="text-sm text-gray-600">CNPJ: {c.cnpj || '-'}</div>
                      <div className="text-sm text-gray-600">{c.segmento || '-'}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${c.status==='ATIVO'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-700'}`}>{c.status}</span>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="mr-2 px-2 py-0.5 rounded bg-gray-100 text-gray-700">{c.ciclo_faturamento}</span>
                    <span className="mr-2 px-2 py-0.5 rounded bg-gray-100 text-gray-700">{c.fonte}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Link to={'/contratos/' + c.id} className="text-yn-orange">Abrir</Link>
                    <button className="text-blue-600">Solicitar fatura</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="flex items-center justify-between">
        <div className="space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 border rounded"
            disabled={page <= 1}
          >
            Anterior
          </button>
          <button
            onClick={() => setPage((p) => Math.min(pag.totalPaginas, p + 1))}
            className="px-3 py-1 border rounded"
            disabled={page >= pag.totalPaginas}
          >
            Próxima
          </button>
        </div>
        <div>
          Página {pag.paginaAtual} de {pag.totalPaginas}
        </div>
        <div className="text-sm text-gray-500">Total: {pag.totalItens}</div>
      </div>
    </div>
  );
}
