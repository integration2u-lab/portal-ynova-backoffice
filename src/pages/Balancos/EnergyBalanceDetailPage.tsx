import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getById, getEvents } from '../../services/energyBalanceApi';
import {
  normalizeEnergyBalanceDetail,
  normalizeEnergyBalanceEvent,
} from '../../utils/normalizers/energyBalance';
import type { EnergyBalanceDetail, EnergyBalanceEvent } from '../../types/energyBalance';

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const parseEventDate = (value: unknown): string => {
  if (!value) return 'Data não informada';
  const text = String(value);
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    try {
      return dateTimeFormatter.format(parsed).replace('.', '');
    } catch (error) {
      console.warn('[EnergyBalanceDetail] falha ao formatar data de evento', error);
    }
  }
  return text;
};

export default function EnergyBalanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = React.useState<EnergyBalanceDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const detailControllerRef = React.useRef<AbortController | null>(null);

  const [events, setEvents] = React.useState<EnergyBalanceEvent[]>([]);
  const [eventsLoading, setEventsLoading] = React.useState(true);
  const [eventsError, setEventsError] = React.useState('');
  const eventsControllerRef = React.useRef<AbortController | null>(null);

  const fetchDetail = React.useCallback(async () => {
    if (!id) return;
    detailControllerRef.current?.abort();
    const controller = new AbortController();
    detailControllerRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const payload = await getById(id, controller.signal);
      const normalized = normalizeEnergyBalanceDetail(payload);
      setDetail(normalized);
    } catch (fetchError) {
      if (controller.signal.aborted) {
        return;
      }
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Não foi possível carregar o balanço energético selecionado.';
      setError(message);
      console.error('[EnergyBalanceDetail] Erro ao buscar balanço', fetchError);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [id]);

  const fetchEvents = React.useCallback(async () => {
    if (!id) {
      setEvents([]);
      setEventsLoading(false);
      return;
    }
    eventsControllerRef.current?.abort();
    const controller = new AbortController();
    eventsControllerRef.current = controller;
    setEventsLoading(true);
    setEventsError('');
    try {
      const payload = await getEvents(id, controller.signal);
      const array = Array.isArray(payload) ? payload : [];
      const normalizedEvents = array.map((item, index) => {
        const normalized = normalizeEnergyBalanceEvent(item, index);
        return {
          ...normalized,
          createdAt: parseEventDate(normalized.createdAt),
        };
      });
      setEvents(normalizedEvents);
    } catch (fetchError) {
      if (controller.signal.aborted) {
        return;
      }
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Não foi possível carregar a linha do tempo deste balanço.';
      setEventsError(message);
      console.warn('[EnergyBalanceDetail] Erro ao buscar eventos', fetchError);
      setEvents([]);
    } finally {
      if (!controller.signal.aborted) {
        setEventsLoading(false);
      }
    }
  }, [id]);

  React.useEffect(() => {
    void fetchDetail();
    return () => {
      detailControllerRef.current?.abort();
    };
  }, [fetchDetail]);

  React.useEffect(() => {
    void fetchEvents();
    return () => {
      eventsControllerRef.current?.abort();
    };
  }, [fetchEvents]);

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
          Carregando balanço energético...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm font-bold text-red-600">
          {error}
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void fetchDetail()}
            className="inline-flex items-center justify-center rounded-lg bg-yn-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-6 p-4">
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
          Nenhum balanço energético encontrado.
        </div>
        <div className="flex justify-center gap-2">
          <Link
            to="/balancos"
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:border-yn-orange hover:text-yn-orange"
          >
            Voltar para balanços
          </Link>
          <Link
            to="/contratos"
            className="inline-flex items-center justify-center rounded-lg border border-yn-orange px-4 py-2 text-sm font-bold text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
          >
            Voltar para contratos
          </Link>
        </div>
      </div>
    );
  }

  const contractLink = detail.header.contractId ? `/contratos/${detail.header.contractId}` : null;

  return (
    <div className="space-y-6 p-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Balanço Energético · {detail.header.titleSuffix || '-'}
          </h1>
          <p className="text-sm font-bold text-gray-600 dark:text-white">
            {detail.header.razao} · CNPJ {detail.header.cnpj || 'Não informado'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {contractLink ? (
            <Link
              to={contractLink}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm font-bold text-gray-700 dark:text-white transition hover:border-yn-orange hover:text-yn-orange"
            >
              Ver Contrato
            </Link>
          ) : (
            <span className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-bold text-gray-400">
              Ver Contrato
            </span>
          )}
          <Link
            to="/contratos"
            className="inline-flex items-center justify-center rounded-lg border border-yn-orange px-4 py-2 text-sm font-bold text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
          >
            Voltar para contratos
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Consumo total (MWh)</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{detail.metrics.consumoTotalMWh}</div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Custo total (R$)</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{detail.metrics.custoTotalBRL}</div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500">PROINFA total</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{detail.metrics.proinfaTotal}</div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Economia potencial (R$)</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{detail.metrics.economiaPotencialBRL}</div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-auto">
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
                    Nenhum dado mensal disponível para este balanço.
                  </td>
                </tr>
              ) : (
                detail.months.map((month) => (
                  <tr key={month.id} className="bg-white hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">{month.mes}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{month.medidor}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{month.consumoMWh}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{month.precoReaisPorMWh}</td>
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
      </div>

      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Balanço Energético</h3>
          <p className="mt-1 text-xs font-bold text-gray-600">
            Linha do tempo mensal por medidor/cliente/contrato consolidando consumo, preço e encargos para cálculo,
            auditoria e geração de oportunidades.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900">Linha do tempo</h4>
            {eventsLoading && (
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-yn-orange">
                <Loader2 className="h-3 w-3 animate-spin" /> Carregando eventos...
              </span>
            )}
          </div>

          {eventsError && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs font-semibold text-yellow-700">
              {eventsError}
            </div>
          )}

          {!eventsLoading && events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm font-bold text-gray-500">
              Sem eventos ainda
            </div>
          ) : null}

          {!eventsLoading && events.length > 0 && (
            <ol className="relative border-l border-gray-200 pl-6">
              {events.map((event, index) => (
                <li key={event.id || index} className="relative mb-6 last:mb-0">
                  <span className="absolute -left-[13px] top-1.5 h-3 w-3 rounded-full bg-yn-orange" />
                  <div className="text-sm font-bold text-gray-900">{event.title}</div>
                  <div className="mt-1 text-xs font-bold text-gray-500">
                    {event.createdAt} · {event.user}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {eventsLoading && events.length === 0 && !eventsError && (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm font-bold text-gray-500">
              Carregando eventos...
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
