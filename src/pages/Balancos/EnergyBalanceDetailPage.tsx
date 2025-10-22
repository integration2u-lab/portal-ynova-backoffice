import React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getById, getEvents, type EnergyBalanceEvent } from '../../services/energyBalanceApi';
import {
  normalizeDetail,
  type NormalizedEnergyBalanceDetail,
} from '../../utils/normalizers/energyBalance';

const LOADING_DETAIL_TEXT = 'Carregando balanço energético...';

const formatEventDate = (value?: string) => {
  if (!value) return 'Data não informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function EnergyBalanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = React.useState<NormalizedEnergyBalanceDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [events, setEvents] = React.useState<EnergyBalanceEvent[]>([]);
  const [eventsLoading, setEventsLoading] = React.useState(false);
  const [eventsError, setEventsError] = React.useState('');

  React.useEffect(() => {
    if (!id) {
      setDetail(null);
      setLoading(false);
      setError('Identificador do balanço não informado.');
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    const fetchDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await getById(id, controller.signal);
        if (!isActive) return;
        setDetail(normalizeDetail(response));
      } catch (err) {
        if (
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === 'AbortError') ||
          (err instanceof Error && err.name === 'AbortError')
        ) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Erro ao carregar o balanço energético.';
        if (!isActive) return;
        setError(message);
        setDetail(null);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void fetchDetail();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [id]);

  React.useEffect(() => {
    if (!id) {
      setEvents([]);
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    const fetchEvents = async () => {
      setEventsLoading(true);
      setEventsError('');
      try {
        const response = await getEvents(id, controller.signal);
        if (!isActive) return;
        setEvents(Array.isArray(response) ? response : []);
      } catch (err) {
        if (
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === 'AbortError') ||
          (err instanceof Error && err.name === 'AbortError')
        ) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Não foi possível carregar os eventos.';
        if (!isActive) return;
        setEventsError(message);
        setEvents([]);
      } finally {
        if (isActive) {
          setEventsLoading(false);
        }
      }
    };

    void fetchEvents();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [id]);

  const sortedEvents = React.useMemo(() => {
    return [...events].sort((a, b) => {
      const first = new Date(a.created_at ?? '').getTime();
      const second = new Date(b.created_at ?? '').getTime();
      if (Number.isNaN(first) && Number.isNaN(second)) return 0;
      if (Number.isNaN(first)) return 1;
      if (Number.isNaN(second)) return -1;
      return first - second;
    });
  }, [events]);

  const showCreateButton = Boolean(detail?.header.contractId);

  return (
    <div className="space-y-6 p-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm font-bold text-gray-500 dark:text-white">
          {LOADING_DETAIL_TEXT}
        </div>
      ) : !detail ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm font-bold text-gray-500 dark:text-white">
          Balanço energético não encontrado.
        </div>
      ) : (
        <div className="space-y-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Balanço Energético · {detail.header.titleSuffix || 'Não informado'}
              </h1>
              <p className="text-sm font-bold text-gray-600 dark:text-white">
                {detail.header.razao || 'Não informado'} · CNPJ {detail.header.cnpj || 'Não informado'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {showCreateButton && detail.header.contractId && (
                <button
                  type="button"
                  onClick={() => navigate(`/contratos/${detail.header.contractId}/balanco-energetico`)}
                  className="inline-flex items-center justify-center rounded-lg bg-yn-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90"
                >
                  Criar Balanço Energético
                </button>
              )}
              {detail.header.contractId && (
                <Link
                  to={`/contratos/${detail.header.contractId}`}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-yn-orange hover:text-yn-orange"
                >
                  Ver Contrato
                </Link>
              )}
              <Link
                to="/contratos"
                className="inline-flex items-center justify-center rounded-lg border border-yn-orange px-4 py-2 text-sm font-bold text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
              >
                Voltar para contratos
              </Link>
            </div>
          </header>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Consumo total (MWh)" value={detail.metrics.consumoTotalMWh} />
            <MetricCard label="Custo total (R$)" value={detail.metrics.custoTotalBRL} />
            <MetricCard label="PROINFA total" value={detail.metrics.proinfaTotal} />
            <MetricCard label="Economia potencial (R$)" value={detail.metrics.economiaPotencialBRL} />
          </section>

          <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-auto">
            <table className="min-w-[960px] w-full table-auto text-sm">
              <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Mês</th>
                  <th className="px-4 py-3 text-left">Medidor</th>
                  <th className="px-4 py-3 text-left">Consumo (MWh)</th>
                  <th className="px-4 py-3 text-left">Preço (R$/MWh)</th>
                  <th className="px-4 py-3 text-left">Custo do mês</th>
                  <th className="px-4 py-3 text-left">Proinfa</th>
                  <th className="px-4 py-3 text-left">Faixa contratual</th>
                  <th className="px-4 py-3 text-left">Ajustado</th>
                  <th className="px-4 py-3 text-left">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {detail.months.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm font-bold text-gray-500">
                      Nenhuma competência encontrada para este balanço energético.
                    </td>
                  </tr>
                ) : (
                  detail.months.map((month, index) => (
                    <tr key={`${month.mes}-${month.medidor}-${index}`} className="bg-white hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-900">{month.mes}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{month.medidor}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{month.consumoMWh}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{month.precoR$/MWh}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{month.custoMesBRL}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{month.proinfa}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{month.faixaContratual}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{month.ajustado}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{month.actions ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="text-sm font-bold text-gray-900">Balanço Energético</div>
            <p className="mt-1 text-xs font-bold text-gray-600">
              Linha do tempo mensal consolidando consumo, geração, preços e ajustes para análise e auditoria dos contratos.
            </p>
          </div>

          <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Linha do tempo</h2>
            </div>

            {eventsLoading ? (
              <p className="mt-4 text-sm font-bold text-gray-500">Carregando eventos...</p>
            ) : eventsError ? (
              <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm font-bold text-yellow-700" role="alert">
                {eventsError}
              </div>
            ) : sortedEvents.length > 0 ? (
              <ol className="mt-4 space-y-4">
                {sortedEvents.map((event) => (
                  <li key={event.id} className="relative pl-6">
                    <span className="absolute left-0 top-1 h-3 w-3 -translate-x-1/2 rounded-full bg-yn-orange" aria-hidden />
                    <div className="text-sm font-bold text-gray-900">
                      {event.message || (event as Record<string, unknown>).description || event.type || 'Evento'}
                    </div>
                    <div className="mt-1 text-xs font-bold text-gray-500">
                      {formatEventDate(event.created_at)}
                      {event.user ? ` · ${event.user}` : ''}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm font-bold text-gray-500">Sem eventos ainda</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
