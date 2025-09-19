import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Brush, ResponsiveContainer, Legend } from 'recharts';

type DetalheResponse = {
  dados_contrato: {
    vigencia: { inicio: string; fim: string };
    fornecedor: string;
    fonte: 'Convencional' | 'Incentivada';
    preco_contratado: number;
    preco_reajustado: number;
    volume_total: number;
    sazonalizacao?: Record<string, number>;
    flexibilidade_pct: number;
  };
  financeiros: {
    economia_acumulada: number;
    custo_por_origem: { livre: number; cativo: number; encargos: number };
    bandeira_atual: string;
    tarifas: { te: number; tusd: number };
  };
  nf_fornecedora: {
    valor_nf_energia: number;
    valor_calculado_energia: number;
    status_energia: 'Conforme' | 'Divergente';
    valor_documento_icms: number;
    detalhes_icms?: string;
    status_icms: 'Conforme' | 'Divergente';
  };
  fatura_distribuidora: {
    demanda_cobrada: number;
    demanda_contratada: number;
    regra_pct_tolerancia: 1.05;
    status: 'Conforme' | 'Divergente';
    observacao?: string;
  };
  status_conformidades_resumo: {
    nf_fornecedora: 'Conforme' | 'Divergente' | 'Indefinido';
    fatura_distribuidora: 'Conforme' | 'Divergente';
  };
  indicadores: Array<{ tipo: 'DEMANDA' | 'MODALIDADE_TARIFARIA' | 'ENERGIA_REATIVA' | 'CONTRATO'; status: 'verde' | 'amarelo' | 'vermelho'; mensagem: string; acao?: { tipo: 'abrir_modal' | 'link'; rotulo: string; url?: string; modalId?: string; } }>;
};

type SerieResponse = { pontos: Array<{ competencia: string; valor: number }> };

function Money({ value }: { value: number }) {
  return <>{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg bg-white dark:bg-[#1a1f24]">
      <div className="px-4 py-2 border-b dark:border-[#2b3238] text-sm font-medium">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function DetalheContratoPage() {
  const [modal, setModal] = React.useState<{ open: boolean; title?: string; modalId?: string }>({ open: false });
  const { id } = useParams();

  const { data, isLoading, isError, refetch } = useQuery<DetalheResponse>({
    queryKey: ['contrato', id],
    queryFn: async () => {
      const res = await fetch(`/api/contratos/${id}`);
      if (!res.ok) throw new Error('Erro');
      return res.json();
    },
  });

  const demandaQ = useQuery<SerieResponse>({
    queryKey: ['contrato-ciclos', id, 'demanda'],
    queryFn: async () => {
      const res = await fetch(`/api/contratos/${id}/ciclos?serie=demanda`);
      if (!res.ok) throw new Error('Erro');
      return res.json();
    },
  });

  const consumoQ = useQuery<SerieResponse>({
    queryKey: ['contrato-ciclos', id, 'consumo'],
    queryFn: async () => {
      const res = await fetch(`/api/contratos/${id}/ciclos?serie=consumo`);
      if (!res.ok) throw new Error('Erro');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse mb-4" />
              <div className="h-24 bg-gray-100 dark:bg-gray-800 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-4" aria-live="assertive">
        <p className="text-red-600 mb-2">Falha ao carregar detalhes do contrato.</p>
        <button onClick={() => refetch()} className="px-3 py-1 border rounded">Tentar novamente</button>
      </div>
    );
  }

  const { dados_contrato: dc, financeiros: fin, status_conformidades_resumo: st, nf_fornecedora, fatura_distribuidora } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Contrato {id}</h1>
        <Link to="/contratos" className="text-sm text-yn-orange">Voltar</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1) Indicadores Financeiros e de Custos */}
        <Card title="Indicadores Financeiros e de Custos">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Economia Acumulada</div>
              <div className="text-lg font-semibold"><Money value={fin.economia_acumulada} /></div>
            </div>
            <div>
              <div className="text-gray-500">Bandeira Atual</div>
              <div className="text-lg font-semibold">{fin.bandeira_atual}</div>
            </div>
            <div>
              <div className="text-gray-500">Custos - Livre</div>
              <div><Money value={fin.custo_por_origem.livre} /></div>
            </div>
            <div>
              <div className="text-gray-500">Custos - Cativo</div>
              <div><Money value={fin.custo_por_origem.cativo} /></div>
            </div>
            <div>
              <div className="text-gray-500">Custos - Encargos</div>
              <div><Money value={fin.custo_por_origem.encargos} /></div>
            </div>
            <div>
              <div className="text-gray-500">Tarifas (TE/TUSD)</div>
              <div>{fin.tarifas.te.toFixed(3)} / {fin.tarifas.tusd.toFixed(3)}</div>
            </div>
          </div>
        </Card>

        {/* Conformidades */}
        <Card title="Conformidades - NF Fornecedora">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Valor NF Energia</div>
              <div className="font-medium"><Money value={nf_fornecedora.valor_nf_energia} /></div>
            </div>
            <div>
              <div className="text-gray-500">Valor Calculado Energia</div>
              <div className="font-medium"><Money value={nf_fornecedora.valor_calculado_energia} /></div>
            </div>
            <div className="col-span-2">
              <div className="text-gray-500">Status Energia</div>
              <div>
                <span className={`px-2 py-1 rounded text-xs ${nf_fornecedora.status_energia==='Conforme'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{nf_fornecedora.status_energia}</span>
              </div>
            </div>
            <div>
              <div className="text-gray-500">Valor Documento ICMS</div>
              <div className="font-medium"><Money value={nf_fornecedora.valor_documento_icms} /></div>
            </div>
            <div>
              <div className="text-gray-500">Status ICMS</div>
              <div>
                <span className={`px-2 py-1 rounded text-xs ${nf_fornecedora.status_icms==='Conforme'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{nf_fornecedora.status_icms}</span>
              </div>
            </div>
            {nf_fornecedora.detalhes_icms && (
              <div className="col-span-2 text-red-700 bg-red-50 rounded p-2" role="note">
                {nf_fornecedora.detalhes_icms}
              </div>
            )}
          </div>
        </Card>

        <Card title="Conformidades - Fatura Distribuidora">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Demanda Cobrada</div>
              <div className="font-medium">{fatura_distribuidora.demanda_cobrada.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-500">Demanda Contratada</div>
              <div className="font-medium">{fatura_distribuidora.demanda_contratada.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-500">Tolerância</div>
              <div className="font-medium">{Math.round((fatura_distribuidora.regra_pct_tolerancia - 1) * 100)}%</div>
            </div>
            <div>
              <div className="text-gray-500">Status</div>
              <div>
                <span className={`px-2 py-1 rounded text-xs ${fatura_distribuidora.status==='Conforme'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{fatura_distribuidora.status}</span>
              </div>
            </div>
            {fatura_distribuidora.observacao && (
              <div className="col-span-2 text-red-700 bg-red-50 rounded p-2" role="note">
                {fatura_distribuidora.observacao}
              </div>
            )}
          </div>
        </Card>

        {/* 2) Dados do Contrato */}
        <Card title="Dados do Contrato">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Vigência</div>
              <div>{dc.vigencia.inicio} a {dc.vigencia.fim}</div>
            </div>
            <div>
              <div className="text-gray-500">Fornecedor</div>
              <div>{dc.fornecedor}</div>
            </div>
            <div>
              <div className="text-gray-500">Fonte</div>
              <div>{dc.fonte}</div>
            </div>
            <div>
              <div className="text-gray-500">Preço (Contratado / Reajustado)</div>
              <div><Money value={dc.preco_contratado} /> / <Money value={dc.preco_reajustado} /></div>
            </div>
            <div>
              <div className="text-gray-500">Volume Total</div>
              <div>{dc.volume_total} MWh</div>
            </div>
            <div>
              <div className="text-gray-500">Flexibilidade</div>
              <div>{(dc.flexibilidade_pct*100).toFixed(0)}%</div>
            </div>
          </div>
          {dc.sazonalizacao && (
            <div className="mt-4 text-xs text-gray-500">Sazonalização informada</div>
          )}
          <div className="mt-4 text-sm">
            <span className="mr-2">NF Fornecedora:</span>
            <span className={`px-2 py-1 rounded text-xs ${st.nf_fornecedora==='Conforme'?'bg-green-100 text-green-700': st.nf_fornecedora==='Divergente'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-700'}`}>{st.nf_fornecedora}</span>
            <span className="ml-4 mr-2">Fatura Distribuidora:</span>
            <span className={`px-2 py-1 rounded text-xs ${st.fatura_distribuidora==='Conforme'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{st.fatura_distribuidora}</span>
          </div>
        </Card>

        {/* 3) Gráfico Demanda */}
        <Card title="Histórico de Demanda">
          {demandaQ.isLoading ? (
            <div className="h-48 bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ) : demandaQ.isError ? (
            <div className="text-red-600" aria-live="assertive">Falha ao carregar demanda.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={demandaQ.data?.pontos} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="competencia" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="valor" stroke="#f97316" dot={false} name="Demanda" />
                  <Brush dataKey="competencia" height={20} stroke="#f97316" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* 4) Gráfico Consumo */}
        <Card title="Histórico de Consumo">
          {consumoQ.isLoading ? (
            <div className="h-48 bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ) : consumoQ.isError ? (
            <div className="text-red-600" aria-live="assertive">Falha ao carregar consumo.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={consumoQ.data?.pontos} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="competencia" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="valor" stroke="#2563eb" dot={false} name="Consumo" />
                  <Brush dataKey="competencia" height={20} stroke="#2563eb" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* 5) Inteligência do Contrato */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Inteligência do Contrato</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.indicadores?.map((ind, idx) => (
            <div key={idx} className="border rounded-lg bg-white dark:bg-[#1a1f24]">
              <div className="px-4 py-2 border-b dark:border-[#2b3238] text-sm font-medium flex items-center justify-between">
                <span>{labelTipo(ind.tipo)}</span>
                <span role="status" aria-label={`status ${ind.status}`} className={`px-2 py-0.5 rounded text-xs ${badgeClasses(ind.status)}`}>{ind.status}</span>
              </div>
              <div className="p-4 text-sm space-y-3">
                <p>{ind.mensagem}</p>
                {ind.acao?.tipo === 'abrir_modal' && (
                  <button className="px-3 py-1 rounded bg-yn-orange text-white" onClick={() => setModal({ open: true, title: labelTipo(ind.tipo), modalId: ind.acao?.modalId })}>
                    {ind.acao.rotulo}
                  </button>
                )}
                {ind.acao?.tipo === 'link' && ind.acao.url && (
                  <a className="px-3 py-1 inline-block rounded bg-yn-orange text-white" href={ind.acao.url} target="_blank" rel="noopener">
                    {ind.acao.rotulo}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal.open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-[#1a1f24] rounded-lg shadow-lg max-w-md w-full p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">{modal.title}</h3>
              <button aria-label="Fechar" className="px-2 py-1" onClick={() => setModal({ open: false })}>?</button>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Conteúdo do modal (placeholder) - ID: {modal.modalId}
            </div>
            <div className="mt-4 text-right">
              <button className="px-3 py-1 rounded border" onClick={() => setModal({ open: false })}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function badgeClasses(status) {
  return status === 'verde'
    ? 'bg-green-100 text-green-700'
    : status === 'amarelo'
    ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-700';
}

function labelTipo(t) {
  switch (t) {
    case 'DEMANDA': return 'Demanda';
    case 'MODALIDADE_TARIFARIA': return 'Modalidade Tarifária';
    case 'ENERGIA_REATIVA': return 'Energia Reativa';
    case 'CONTRATO': return 'Contrato';
  }
}
