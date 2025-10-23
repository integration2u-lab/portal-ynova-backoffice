import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getEvents } from '../../services/energyBalanceApi';
import { EnergyBalanceAPI, type EnergyBalance } from '../../services/energyBalance';
import { normalizeEnergyBalanceEvent } from '../../utils/normalizers/energyBalance';
import type { EnergyBalanceEvent } from '../../types/energyBalance';

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  year: 'numeric',
});

const detailedDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const numericFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
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

const parseNumericString = (value: string | null | undefined): number | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatReferenceBase = (iso: string | null): string => {
  if (!iso) return 'Não informado';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return monthFormatter.format(parsed).replace('.', '');
};

const formatDateTimeValue = (iso: string | null): string => {
  if (!iso) return 'Não informado';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return detailedDateFormatter.format(parsed);
};

const safeDisplay = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return 'Não informado';
  const text = String(value).trim();
  return text.length > 0 ? text : 'Não informado';
};

const formatBooleanDisplay = (value: boolean | null): string => {
  if (value === null) return 'Não informado';
  return value ? 'Sim' : 'Não';
};

const formatContractRange = (min: number | null, max: number | null): string => {
  const hasMin = typeof min === 'number' && Number.isFinite(min);
  const hasMax = typeof max === 'number' && Number.isFinite(max);

  if (hasMin && hasMax) {
    return `${numericFormatter.format(min as number)} – ${numericFormatter.format(max as number)} MWh`;
  }
  if (hasMin) {
    return `${numericFormatter.format(min as number)} MWh`;
  }
  if (hasMax) {
    return `${numericFormatter.format(max as number)} MWh`;
  }
  return 'Não informado';
};

export default function EnergyBalanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [balance, setBalance] = React.useState<EnergyBalance | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const balanceControllerRef = React.useRef<AbortController | null>(null);

  const [events, setEvents] = React.useState<EnergyBalanceEvent[]>([]);
  const [eventsLoading, setEventsLoading] = React.useState(true);
  const [eventsError, setEventsError] = React.useState('');
  const eventsControllerRef = React.useRef<AbortController | null>(null);

  const fetchBalance = React.useCallback(async () => {
    if (!id) {
      setBalance(null);
      setError('Identificador do balanço energético não informado.');
      setLoading(false);
      return;
    }

    balanceControllerRef.current?.abort();
    const controller = new AbortController();
    balanceControllerRef.current = controller;
    setLoading(true);
    setError('');

    try {
      const payload = await EnergyBalanceAPI.getById(id, { signal: controller.signal });
      setBalance(payload);
    } catch (fetchError) {
      if (controller.signal.aborted) {
        return;
      }
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Não foi possível carregar o balanço energético selecionado.';
      setError(message);
      setBalance(null);
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
    void fetchBalance();
    return () => {
      balanceControllerRef.current?.abort();
    };
  }, [fetchBalance]);

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
            onClick={() => void fetchBalance()}
            className="inline-flex items-center justify-center rounded-lg bg-yn-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!balance) {
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

  const consumptionKwhValue = parseNumericString(balance.consumptionKwh);
  const consumptionMwhValue = consumptionKwhValue !== null ? consumptionKwhValue / 1000 : null;
  const totalCostValue =
    balance.price !== null && Number.isFinite(balance.price) && consumptionMwhValue !== null
      ? balance.price * consumptionMwhValue
      : null;
  const proinfaValue = parseNumericString(balance.proinfaContribution);
  const priceValue = typeof balance.price === 'number' && Number.isFinite(balance.price) ? balance.price : null;

  const totalConsumptionDisplay =
    consumptionMwhValue !== null ? `${numericFormatter.format(consumptionMwhValue)} MWh` : 'Não informado';
  const totalCostDisplay = totalCostValue !== null ? currencyFormatter.format(totalCostValue) : 'Não informado';
  const proinfaDisplay = proinfaValue !== null ? currencyFormatter.format(proinfaValue) : 'Não informado';
  const potentialSavingsDisplay = 'Não informado';

  const priceDisplay = priceValue !== null ? `${currencyFormatter.format(priceValue)} / MWh` : 'Não informado';
  const contractRangeDisplay = formatContractRange(balance.minDemand, balance.maxDemand);
  const referenceLabel = formatReferenceBase(balance.referenceBase);
  const createdAtDisplay = formatDateTimeValue(balance.createdAt);
  const updatedAtDisplay = formatDateTimeValue(balance.updatedAt);
  const contactActiveDisplay = formatBooleanDisplay(balance.contactActive);
  const meterDisplay = safeDisplay(balance.meter);
  const supplierDisplay = safeDisplay(balance.supplier);
  const contractDisplay = safeDisplay(balance.contract);
  const contractIdDisplay = safeDisplay(balance.contractId);
  const clientIdDisplay = safeDisplay(balance.clientId);
  const cpCodeDisplay = safeDisplay(balance.cpCode);
  const contractLink = balance.contractId ? `/contratos/${balance.contractId}` : null;

  const detailItems = [
    { label: 'ID', value: balance.id },
    { label: 'Cliente', value: safeDisplay(balance.clientName) },
    { label: 'Fornecedor', value: supplierDisplay },
    { label: 'Medidor', value: meterDisplay },
    { label: 'Referência (ISO)', value: safeDisplay(balance.referenceBase) },
    { label: 'Referência formatada', value: referenceLabel },
    { label: 'Contrato', value: contractDisplay },
    { label: 'Contract ID', value: contractIdDisplay },
    { label: 'Client ID', value: clientIdDisplay },
    {
      label: 'Preço (R$/MWh)',
      value: priceValue !== null ? currencyFormatter.format(priceValue) : 'Não informado',
    },
    { label: 'Consumo (kWh)', value: safeDisplay(balance.consumptionKwh) },
    { label: 'Encargo PROINFA (valor bruto)', value: safeDisplay(balance.proinfaContribution) },
    {
      label: 'Demanda mínima (MWh)',
      value:
        balance.minDemand !== null && Number.isFinite(balance.minDemand)
          ? `${numericFormatter.format(balance.minDemand)} MWh`
          : 'Não informado',
    },
    {
      label: 'Demanda máxima (MWh)',
      value:
        balance.maxDemand !== null && Number.isFinite(balance.maxDemand)
          ? `${numericFormatter.format(balance.maxDemand)} MWh`
          : 'Não informado',
    },
    { label: 'Faixa contratual', value: contractRangeDisplay },
    { label: 'Código CP', value: cpCodeDisplay },
    { label: 'Contato ativo', value: contactActiveDisplay },
    { label: 'Criado em', value: createdAtDisplay },
    { label: 'Atualizado em', value: updatedAtDisplay },
  ];

  const tableRows = [
    {
      month: referenceLabel,
      meter: meterDisplay,
      consumption:
        consumptionMwhValue !== null
          ? `${numericFormatter.format(consumptionMwhValue)} MWh`
          : 'Não informado',
      price: priceDisplay,
      cost: totalCostDisplay,
      proinfa: proinfaDisplay,
      contractRange: contractRangeDisplay,
      adjusted: 'Não informado',
      actions: '—',
    },
  ];

  return (
    <div className="space-y-6 p-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Balanço Energético · {referenceLabel}
          </h1>
          <p className="text-sm font-bold text-gray-600 dark:text-white">
            {safeDisplay(balance.clientName)} · Medidor {meterDisplay}
          </p>
          <p className="text-xs font-semibold text-gray-500 dark:text-white">
            Fornecedor {supplierDisplay} · ID {balance.id}
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
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
            Contato ativo: {contactActiveDisplay}
          </span>
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
          <div className="mt-2 text-2xl font-bold text-gray-900">{totalConsumptionDisplay}</div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Custo total (R$)</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{totalCostDisplay}</div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500">PROINFA total</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{proinfaDisplay}</div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Economia potencial (R$)</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{potentialSavingsDisplay}</div>
        </div>
      </div>

      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Detalhes do balanço</h2>
          <p className="mt-1 text-xs font-bold text-gray-600">
            Informações retornadas pela API do balanço energético sem normalização adicional.
          </p>
        </div>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {detailItems.map((item) => (
            <div key={item.label} className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.label}</dt>
              <dd className="text-sm font-bold text-gray-900 break-words">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

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
                <th className="px-4 py-3 text-left">PROINFA</th>
                <th className="px-4 py-3 text-left">Faixa contratual</th>
                <th className="px-4 py-3 text-left">Ajustado</th>
                <th className="px-4 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm font-bold text-gray-500">
                    Nenhum dado mensal disponível para este balanço.
                  </td>
                </tr>
              ) : (
                tableRows.map((row, index) => (
                  <tr key={`${row.month}-${index}`} className="bg-white hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">{row.month}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.meter}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.consumption}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.price}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.cost}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.proinfa}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.contractRange}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.adjusted}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.actions}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Linha do tempo</h3>
          <p className="mt-1 text-xs font-bold text-gray-600">
            Eventos registrados durante a coleta e processamento deste balanço energético.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900">Histórico</h4>
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
