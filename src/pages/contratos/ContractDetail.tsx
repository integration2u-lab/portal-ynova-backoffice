import React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  ContractMock,
  StatusResumo,
  AnaliseStatus,
} from '../../mocks/contracts';
import { obrigacaoColunas, formatMesLabel } from '../../mocks/contracts';

const statusStyles: Record<StatusResumo, string> = {
  Conforme: 'bg-green-100 text-green-700 border border-green-200',
  'Divergente': 'bg-red-100 text-red-700 border border-red-200',
  'Em análise': 'bg-yellow-100 text-yellow-700 border border-yellow-200',
};

const analiseStyles: Record<AnaliseStatus, string> = {
  verde: 'bg-green-500',
  amarelo: 'bg-yellow-400',
  vermelho: 'bg-red-500',
};

const variationColors: Record<'up' | 'down' | 'neutral', string> = {
  up: 'text-emerald-600',
  down: 'text-red-600',
  neutral: 'text-gray-500',
};

const variationSymbol: Record<'up' | 'down' | 'neutral', string> = {
  up: '▲',
  down: '▼',
  neutral: '■',
};

function formatMonth(periodo: string) {
  return formatMesLabel(periodo).replace('.', '');
}

type Props = {
  contrato: ContractMock;
};

export function StatusBadge({ status }: { status: StatusResumo }) {
  return <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${statusStyles[status]}`}>{status}</span>;
}

export const ContractDetail: React.FC<Props> = ({ contrato }) => {
  return (
    <div className="space-y-6">
      <section aria-labelledby="indicadores" className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 id="indicadores" className="text-base font-semibold text-gray-900">
            Indicadores / KPIs
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {contrato.kpis.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm shadow-sm transition hover:border-yn-orange/60 hover:shadow"
            >
              <div className="text-gray-500">{item.label}</div>
              <div className="mt-2 text-lg font-semibold text-gray-900">{item.value}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                {item.helper && <span>{item.helper}</span>}
                {item.variation && (
                  <span className={`font-semibold ${variationColors[item.variation.direction]}`}>
                    {variationSymbol[item.variation.direction]} {item.variation.value}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="dados-contrato" className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 id="dados-contrato" className="text-base font-semibold text-gray-900">
            Dados do Contrato
          </h2>
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {contrato.dadosContrato.map((field) => (
            <div key={field.label} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{field.label}</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">{field.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="historico" className="space-y-4">
        <h2 id="historico" className="text-base font-semibold text-gray-900">
          Histórico
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-900">Histórico de Demanda</h3>
            <p className="text-xs text-gray-500">Comparativo de demanda ponta e fora-ponta</p>
            <div className="h-60 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={contrato.historicoDemanda}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="mes" tickFormatter={formatMonth} fontSize={11} stroke="#6b7280" />
                  <YAxis fontSize={11} stroke="#6b7280" />
                  <Tooltip
                    labelFormatter={(label) => formatMonth(String(label))}
                    contentStyle={{ fontSize: '0.75rem', borderRadius: '0.75rem' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Line type="monotone" dataKey="ponta" name="Ponta" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="foraPonta" name="Fora-Ponta" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-900">Histórico de Consumo</h3>
            <p className="text-xs text-gray-500">Meta vs realizado (MWh)</p>
            <div className="h-60 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={contrato.historicoConsumo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="mes" tickFormatter={formatMonth} fontSize={11} stroke="#6b7280" />
                  <YAxis fontSize={11} stroke="#6b7280" />
                  <Tooltip
                    labelFormatter={(label) => formatMonth(String(label))}
                    contentStyle={{ fontSize: '0.75rem', borderRadius: '0.75rem' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Line type="monotone" dataKey="meta" name="Meta" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="realizado" name="Realizado" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="obrigacoes" className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 id="obrigacoes" className="text-base font-semibold text-gray-900">
            Obrigações &amp; Status
          </h2>
        </div>
        <div className="overflow-auto">
          <table className="min-w-[960px] w-full table-auto divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {obrigacaoColunas.map((col) => (
                  <th key={col} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {contrato.obrigacoes.map((linha) => (
                <tr key={linha.periodo} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-900">{linha.periodo}</td>
                  {obrigacaoColunas.slice(1).map((col) => (
                    <td key={col} className="px-3 py-2">
                      <StatusBadge status={linha.status[col]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="indicadores-analises" className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 id="indicadores-analises" className="text-base font-semibold text-gray-900">
            Indicadores de Análises
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
          {contrato.analises.map((area) => (
            <div key={area.area} className="rounded-lg border border-gray-100 bg-gray-50 p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-gray-900">{area.area}</div>
              <ol className="space-y-2 text-xs text-gray-600">
                {area.etapas.map((etapa) => (
                  <li key={etapa.nome} className="flex items-center justify-between gap-4 rounded-md bg-white px-3 py-2 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${analiseStyles[etapa.status]}`} aria-hidden />
                      <span className="font-medium text-gray-800">{etapa.nome}</span>
                    </div>
                    {etapa.observacao && <span className="text-[11px] text-gray-500">{etapa.observacao}</span>}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
