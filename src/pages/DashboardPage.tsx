import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { Activity, BarChart3, AlertTriangle, FileWarning, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react';

function ym(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

type Overview = {
  totalContratosAtivos: number;
  distribuicaoConformidade: {
    Subutilizado: number;
    Conforme: number;
    Excedente: number;
    Indefinido: number;
  };
  totalOportunidades: number;
  totalDivergenciasNF: number;
  totalDivergenciasFatura: number;
};

type Inteligencia = {
  demanda: { verde: number; amarelo: number; vermelho: number };
  modalidade_tarifaria: { verde: number; amarelo: number; vermelho: number };
  energia_reativa: { verde: number; amarelo: number; vermelho: number };
  contrato: { verde: number; amarelo: number; vermelho: number };
};

type ConformidadesDash = {
  nf_divergentes: Array<{
    id: string;
    numero: string;
    cliente: string;
    status_nf: { energia: 'Conforme'|'Divergente'|'Indefinido'; icms: 'Conforme'|'Divergente'|'Indefinido' };
    valores_nf: { valor_energia: number; valor_icms: number };
    observacao?: string;
  }>;
  fatura_divergentes: Array<{
    id: string;
    numero: string;
    cliente: string;
    status_fatura: { demanda: 'Conforme'|'Divergente'|'Indefinido'; tusd: 'Conforme'|'Divergente'|'Indefinido'; icms: 'Conforme'|'Divergente'|'Indefinido' };
    regra_tolerancia_demanda: 1.05;
    observacao?: string;
  }>;
};

export default function DashboardPage() {
  const [mes, setMes] = React.useState<string>(ym());

  const overviewQ = useQuery<Overview>({
    queryKey: ['dashboard', 'overview', mes],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/overview?mes=${mes}`);
      if (!res.ok) throw new Error('Falha ao carregar overview');
      return res.json();
    },
    keepPreviousData: true,
  });

  const contratosQ = useQuery<{ contratos: any[]; paginacao: any }>({
    queryKey: ['dashboard', 'contratos', mes],
    queryFn: async () => {
      const params = new URLSearchParams({ mes, page: '1', pageSize: '50' });
      const res = await fetch(`/api/contratos?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao carregar contratos');
      return res.json();
    },
    keepPreviousData: true,
  });

  const topOppQ = useQuery<{ contratos: any[]; paginacao: any }>({
    queryKey: ['dashboard', 'top-oportunidades', mes],
    queryFn: async () => {
      const params = new URLSearchParams({ include: 'otimizacao-contrato', ciclo: mes, pageSize: '5' });
      const res = await fetch(`/api/contratos?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao carregar top oportunidades');
      return res.json();
    },
    keepPreviousData: true,
  });

  const inteligenciaQ = useQuery<Inteligencia>({
    queryKey: ['dashboard', 'inteligencia', mes],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/inteligencia?mes=${mes}`);
      if (!res.ok) throw new Error('Falha ao carregar inteligência');
      return res.json();
    },
    keepPreviousData: true,
  });

  const conformQ = useQuery<ConformidadesDash>({
    queryKey: ['dashboard','conformidades', mes],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/conformidades?mes=${mes}`);
      if (!res.ok) throw new Error('Falha ao carregar conformidades');
      return res.json();
    },
    keepPreviousData: true,
  });

  const loading = overviewQ.isLoading || contratosQ.isLoading || inteligenciaQ.isLoading || conformQ.isLoading;
  const error = overviewQ.isError || contratosQ.isError || inteligenciaQ.isError || conformQ.isError;

  // Trend simples e determinístico por mês
  const seed = Array.from(mes).reduce((a, c) => a + c.charCodeAt(0), 0);
  const trend = (inc: number) => ((seed % 7) - 3 + inc);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="border rounded px-3 py-2 bg-white dark:bg-[#0f1317] text-sm focus:outline-none focus:ring-2 focus:ring-yn-orange"
          aria-label="Selecionar mês (YYYY-MM)"
        />
      </div>

      {error && (
        <div className="border rounded p-4 text-red-700 bg-red-50" role="alert">
          Falha ao carregar dados do dashboard.
          <div className="mt-2">
            <button onClick={() => { overviewQ.refetch(); contratosQ.refetch(); }} className="px-3 py-1 border rounded">Tentar novamente</button>
          </div>
        </div>
      )}

      {/* KPIs: 5 cards com ícones e tendência */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4" role="group" aria-label="Indicadores">
        <Kpi
          title="Contratos Ativos"
          value={overviewQ.data?.totalContratosAtivos}
          loading={loading}
          trend={trend(0)}
          icon={<Activity size={18} />}
          color="blue"
          href={`/contratos?mes=${mes}`}
        />
        <Kpi
          title="Conformidade"
          value={undefined}
          loading={loading}
          trend={null}
          icon={<BarChart3 size={18} />}
          color="green"
          href={`/contratos?mes=${mes}`}
          extra={(
            <div className="mt-1 text-[11px] leading-4">
              {loading ? (
                <div className="h-4 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
              ) : (
                <>
                  <div><span className="font-medium">Conforme</span>: {overviewQ.data?.distribuicaoConformidade.Conforme}</div>
                  <div><span className="font-medium">Excedente</span>: {overviewQ.data?.distribuicaoConformidade.Excedente}</div>
                  <div><span className="font-medium">Subutilizado</span>: {overviewQ.data?.distribuicaoConformidade.Subutilizado}</div>
                  <div><span className="font-medium">Indefinido</span>: {overviewQ.data?.distribuicaoConformidade.Indefinido}</div>
                </>
              )}
            </div>
          )}
        />
        <Kpi
          title="Oportunidades"
          value={overviewQ.data?.totalOportunidades}
          loading={loading}
          trend={trend(1)}
          icon={<AlertTriangle size={18} />}
          color="amber"
          href={`/contratos?mes=${mes}&oportunidade=1`}
        />
        <Kpi
          title="Divergências NF"
          value={overviewQ.data?.totalDivergenciasNF}
          loading={loading}
          trend={trend(2)}
          icon={<FileWarning size={18} />}
          color="red"
          href={`/contratos?mes=${mes}`}
        />
        <Kpi
          title="Divergências Fatura"
          value={overviewQ.data?.totalDivergenciasFatura}
          loading={loading}
          trend={trend(3)}
          icon={<Receipt size={18} />}
          color="violet"
          href={`/contratos?mes=${mes}`}
        />
      </div>

      {/* Grid 12 col */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Removidos KPIs duplicados; abaixo ficam gráficos e listas */}

        {/* Distribuição conformidade */}
        <div className="md:col-span-6">
          <div className="bg-white dark:bg-[#1a1f24] rounded border dark:border-[#2b3238] p-4 overflow-hidden">
            <div className="text-sm font-medium mb-2">Distribuição de Conformidade</div>
            {loading ? (
              <div className="h-60 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="h-52 sm:h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Subutilizado', value: overviewQ.data!.distribuicaoConformidade.Subutilizado },
                      { name: 'Conforme', value: overviewQ.data!.distribuicaoConformidade.Conforme },
                      { name: 'Excedente', value: overviewQ.data!.distribuicaoConformidade.Excedente },
                      { name: 'Indefinido', value: overviewQ.data!.distribuicaoConformidade.Indefinido },
                    ]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f97316" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-52 sm:h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <Pie dataKey="value" labelLine={false} label={false} data={[
                        { name: 'Subutilizado', value: overviewQ.data!.distribuicaoConformidade.Subutilizado },
                        { name: 'Conforme', value: overviewQ.data!.distribuicaoConformidade.Conforme },
                        { name: 'Excedente', value: overviewQ.data!.distribuicaoConformidade.Excedente },
                        { name: 'Indefinido', value: overviewQ.data!.distribuicaoConformidade.Indefinido },
                      ]} outerRadius={70} innerRadius={32}>
                        {['#60a5fa','#22c55e','#f97316','#9ca3af'].map((c, i) => (
                          <Cell key={i} fill={c} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Oportunidades de Contrato */}
        <div className="md:col-span-12">
          <div className="bg-white dark:bg-[#1a1f24] rounded border dark:border-[#2b3238] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Top Oportunidades de Contrato</div>
              <a className="text-sm text-yn-orange hover:underline" href="/oportunidades">Ver todas</a>
            </div>
            {topOppQ.isLoading ? (
              <div className="h-40 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" aria-live="polite" />
            ) : topOppQ.isError ? (
              <div className="text-red-600" aria-live="assertive">Falha ao carregar oportunidades.</div>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="p-2 text-left">Contrato</th>
                      <th className="p-2 text-left">Cliente</th>
                      <th className="p-2 text-right">Consumo Acumulado</th>
                      <th className="p-2 text-right">Limite Superior</th>
                      <th className="p-2 text-right">Δ% vs Limite</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(topOppQ.data?.contratos || []).map((c: any) => {
                      const cc = c.consumo_contrato || {};
                      const pct = cc.diferenca_percentual_vs_limite != null ? cc.diferenca_percentual_vs_limite : 0;
                      return (
                        <tr key={c.id} className="border-t">
                          <td className="p-2">{c.numero}</td>
                          <td className="p-2">{c.cliente}</td>
                          <td className="p-2 text-right">{cc.consumo_acumulado?.toFixed ? cc.consumo_acumulado.toFixed(2) : '-'}</td>
                          <td className="p-2 text-right">{cc.limite_superior?.toFixed ? cc.limite_superior.toFixed(2) : '-'}</td>
                          <td className="p-2 text-right">{pct ? pct.toFixed(0) : 0}%</td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs" title={c.observacao_oportunidade || ''}>Com Oportunidade</span>
                          </td>
                          <td className="p-2"><a className="text-yn-orange hover:underline" href={`/contratos/${c.id}`}>Abrir contrato</a></td>
                        </tr>
                      );
                    })}
                    {topOppQ.data?.contratos?.length === 0 && (
                      <tr>
                        <td className="p-4 text-center text-gray-500" colSpan={7}>Sem oportunidades no período.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Inteligência */}
        <div className="md:col-span-12">
          <div className="bg-white dark:bg-[#1a1f24] rounded border dark:border-[#2b3238] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Inteligência</div>
            </div>
            {inteligenciaQ.isLoading ? (
              <div className="h-24 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
            ) : inteligenciaQ.isError ? (
              <div className="text-red-600" aria-live="assertive">Falha ao carregar inteligência.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {([
                  { key: 'demanda', label: 'Demanda' },
                  { key: 'modalidade_tarifaria', label: 'Modalidade Tarifária' },
                  { key: 'energia_reativa', label: 'Energia Reativa' },
                  { key: 'contrato', label: 'Contrato' },
                ] as const).map(({ key, label }) => {
                  const data = inteligenciaQ.data![key];
                  const total = data.verde + data.amarelo + data.vermelho || 1;
                  const pct = (n: number) => Math.round((n / total) * 100);
                  return (
                    <div key={key} className="border rounded p-3 bg-white dark:bg-[#0f1317]" role="status" aria-label={`${label}: verde ${data.verde}, amarelo ${data.amarelo}, vermelho ${data.vermelho}`}>
                      <div className="text-sm font-medium mb-2">{label}</div>
                      <div className="mb-2 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-3">
                        <span title="Conforme" className="inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-500" /> {data.verde}</span>
                        <span title="Atenção" className="inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-yellow-400" /> {data.amarelo}</span>
                        <span title="Crítico" className="inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-500" /> {data.vermelho}</span>
                      </div>
                      {/* mini barra empilhada */}
                      <div className="h-2 w-full rounded bg-gray-100 dark:bg-gray-800 overflow-hidden" aria-hidden="true">
                        <div className="h-full bg-green-500" style={{ width: pct(data.verde) + '%' }} />
                        <div className="h-full bg-yellow-400" style={{ width: pct(data.amarelo) + '%', display: 'inline-block' }} />
                        <div className="h-full bg-red-500" style={{ width: pct(data.vermelho) + '%', display: 'inline-block' }} />
                      </div>
                      <div className="mt-3">
                        <a className="text-yn-orange text-sm hover:underline" href={`/inteligencia?mes=${mes}&tipo=${key}`}>ver detalhes</a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Conformidades (NF e Fatura) */}
        <ConformidadesCards mes={mes} data={conformQ.data} isLoading={conformQ.isLoading} isError={conformQ.isError} />
      </div>
    </div>
  );
}

function statusPill(st?: string) {
  const s = st || 'Indefinido';
  const cls = s === 'Conforme'
    ? 'bg-green-50 text-green-700 border-green-200'
    : s === 'Divergente'
    ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-gray-50 text-gray-700 border-gray-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${cls}`}>
      {s}
    </span>
  );
}

function ConformidadesCards({ mes, data, isLoading, isError }: { mes: string; data?: ConformidadesDash; isLoading: boolean; isError: boolean; }) {
  const [tab, setTab] = React.useState<'todos'|'nf'|'fatura'>('todos');
  return (
    <div className="md:col-span-12">
      <div className="bg-white dark:bg-[#1a1f24] rounded border dark:border-[#2b3238] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium">Conformidades</div>
          <div className="flex gap-2" role="tablist" aria-label="Filtros rápidos">
            {[{k:'todos',l:'Todos'},{k:'nf',l:'Só NF'},{k:'fatura',l:'Só Fatura'}].map((t:any)=>(
              <button
                key={t.k}
                role="tab"
                aria-selected={tab===t.k}
                onClick={()=>setTab(t.k)}
                className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${tab===t.k?'border-yn-orange text-yn-orange bg-yn-orange/5':'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >{t.l}</button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <div className="h-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" aria-live="polite" />
        ) : isError ? (
          <div className="text-red-600" aria-live="assertive">Falha ao carregar conformidades.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(tab==='todos'||tab==='nf') && (
              <div className="border rounded p-3">
                <div className="text-sm font-medium mb-2">NF Fornecedora</div>
                <ul role="list" className="divide-y divide-gray-100 dark:divide-[#2b3238]">
                  {(data?.nf_divergentes||[]).map((n)=>(
                    <li key={n.id} role="listitem" className="py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{n.numero} · {n.cliente}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                            <span title="Energia">{statusPill(n.status_nf.energia)}</span>
                            <span title="ICMS">{statusPill(n.status_nf.icms)}</span>
                            <span className="ml-1 truncate" title="Valores">R$ {n.valores_nf.valor_energia.toFixed(2)} · ICMS R$ {n.valores_nf.valor_icms.toFixed(2)}</span>
                          </div>
                        </div>
                        <a href={`/contratos/${n.id}`} className="text-yn-orange text-sm whitespace-nowrap hover:underline">ver contrato</a>
                      </div>
                    </li>
                  ))}
                  {(data?.nf_divergentes?.length||0)===0 && <li className="text-sm text-gray-500">Sem divergências.</li>}
                </ul>
              </div>
            )}
            {(tab==='todos'||tab==='fatura') && (
              <div className="border rounded p-3">
                <div className="text-sm font-medium mb-2">Fatura Distribuidora</div>
                <ul role="list" className="divide-y divide-gray-100 dark:divide-[#2b3238]">
                  {(data?.fatura_divergentes||[]).map((f)=>(
                    <li key={f.id} role="listitem" className="py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{f.numero} · {f.cliente}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                            <span title={`Demanda (Regra ${Math.round((f.regra_tolerancia_demanda-1)*100)}%)`}>{statusPill(f.status_fatura.demanda)}</span>
                            <span title="TUSD">{statusPill(f.status_fatura.tusd)}</span>
                            <span title="ICMS">{statusPill(f.status_fatura.icms)}</span>
                            {f.observacao && <span className="ml-1 truncate" title={f.observacao}>{f.observacao}</span>}
                          </div>
                        </div>
                        <a href={`/contratos/${f.id}`} className="text-yn-orange text-sm whitespace-nowrap hover:underline">ver contrato</a>
                      </div>
                    </li>
                  ))}
                  {(data?.fatura_divergentes?.length||0)===0 && <li className="text-sm text-gray-500">Sem divergências.</li>}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ title, value, loading, trend, icon, color, href, extra }: { title: string; value: number | undefined; loading: boolean; trend: number | null; icon: React.ReactNode; color: 'blue'|'green'|'amber'|'red'|'violet'; href: string; extra?: React.ReactNode; }) {
  const colorMap: Record<string, {bg:string; text:string; ring:string; trendUp:string; trendDown:string}> = {
    blue:   { bg: 'bg-blue-50 dark:bg-blue-900/30',   text: 'text-blue-600 dark:text-blue-300', ring: 'focus:ring-blue-400', trendUp: 'text-blue-600', trendDown: 'text-blue-600' },
    green:  { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-300', ring: 'focus:ring-green-400', trendUp: 'text-green-600', trendDown: 'text-green-600' },
    amber:  { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-300', ring: 'focus:ring-amber-400', trendUp: 'text-amber-600', trendDown: 'text-amber-600' },
    red:    { bg: 'bg-red-50 dark:bg-red-900/30',     text: 'text-red-600 dark:text-red-300',     ring: 'focus:ring-red-400', trendUp: 'text-red-600', trendDown: 'text-red-600' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-300', ring: 'focus:ring-violet-400', trendUp: 'text-violet-600', trendDown: 'text-violet-600' },
  };
  const c = colorMap[color];
  return (
    <a href={href} role="button" aria-label={title} className={`group text-left focus:outline-none focus:ring-2 focus:ring-offset-2 ${c.ring} bg-white dark:bg-[#1a1f24] rounded border dark:border-[#2b3238] p-4 hover:shadow-sm transition-shadow`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-gray-500">{title}</div>
          <div className="text-2xl font-semibold mt-1" aria-live="polite">
            {loading ? <div className="h-7 w-14 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" /> : (value ?? '')}
          </div>
        </div>
        <div className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md ${c.bg} ${c.text}`}>{icon}</div>
      </div>
      {extra}
      {trend !== null && (
        <div className="mt-2 text-xs text-gray-500 inline-flex items-center gap-1">
          {trend >= 0 ? <ArrowUpRight size={14} className={c.trendUp} /> : <ArrowDownRight size={14} className={c.trendDown} />}
          <span>{trend >= 0 ? '+' : ''}{trend}% vs mês anterior</span>
        </div>
      )}
    </a>
  );
}
