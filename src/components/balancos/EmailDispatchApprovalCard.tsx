import React from 'react';
import { MailCheck, ShieldAlert, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { energyBalanceRequest } from '../../services/energyBalanceApi';
import {
  convertDisplayRowToEnergyBalancePayload,
  type DisplayEnergyBalanceRow,
} from '../../utils/energyBalancePayload';

export type EmailDispatchApprovalCardProps = {
  balanceId?: string | null;
  row?: DisplayEnergyBalanceRow | null;
  rawData?: Record<string, unknown> | null;
  onSuccess?: (updatedRow: DisplayEnergyBalanceRow, response?: Record<string, unknown>) => void;
};

const truthyEmailStatusValues = new Set([
  'sim',
  's',
  'true',
  '1',
  'yes',
  'y',
  'ok',
  'liberado',
  'liberada',
  'liberados',
  'enviado',
  'enviada',
  'enviados',
  'confirmado',
  'confirmada',
  'confirmados',
]);

const falsyEmailStatusValues = new Set([
  'nao',
  'nao.',
  'n',
  'false',
  '0',
  'no',
  'pendente',
  'pendente.',
  'aguardando',
  'open',
  'liberar',
  'liberacao_pendente',
  'aguardando_liberacao',
]);

const EMAIL_STATUS_RAW_KEYS = [
  'sentOk',
  'sent_ok',
  'envioOk',
  'envio_ok',
  'sent',
  'statusEnvio',
  'status_envio',
  'envioStatus',
  'envio_status',
  'emailLiberado',
  'email_liberado',
];

const toBooleanFlag = (value: unknown): boolean | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return value > 0;
  }
  if (typeof value === 'string') {
    const normalized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
    if (!normalized || normalized === 'nao informado') return null;
    if (truthyEmailStatusValues.has(normalized)) return true;
    if (falsyEmailStatusValues.has(normalized)) return false;
  }
  return null;
};

export default function EmailDispatchApprovalCard({
  balanceId,
  row,
  rawData,
  onSuccess,
}: EmailDispatchApprovalCardProps) {
  const [pendingAction, setPendingAction] = React.useState<'release' | 'revert' | null>(null);

  const alreadySent = React.useMemo(() => {
    if (rawData && typeof rawData === 'object') {
      for (const key of EMAIL_STATUS_RAW_KEYS) {
        const candidate = (rawData as Record<string, unknown>)[key];
        const parsed = toBooleanFlag(candidate);
        if (parsed !== null) {
          return parsed;
        }
      }
    }
    const parsedFromRow = toBooleanFlag(row?.envioOk);
    return parsedFromRow ?? false;
  }, [rawData, row]);

  const extractSendDate = (data?: Record<string, unknown> | null): string | undefined => {
    if (!data) return undefined;
    const candidates = ['sendDate', 'disparo', 'disparo_at', 'enviadoEm', 'sentAt', 'sent_at', 'send_date'];
    for (const key of candidates) {
      const value = (data as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim() !== '') {
        return value;
      }
    }
    return undefined;
  };

  const toDisplayBoolean = (value: unknown): string | null => {
    const parsed = toBooleanFlag(value);
    if (parsed === null) return null;
    return parsed ? 'Sim' : 'Nao';
  };

  const handleDispatch = async (action: 'release' | 'revert') => {
    if (!row || !balanceId) {
      toast.error('Nao foi possivel identificar o registro para envio.');
      return;
    }

    setPendingAction(action);
    try {
      const payload = convertDisplayRowToEnergyBalancePayload(row, rawData ?? undefined);
      payload.sentOk = action === 'release';
      if (action === 'revert') {
        payload.sendDate = null;
      } else if (payload.sendDate !== undefined) {
        delete payload.sendDate;
      }

      const response = await energyBalanceRequest(`/energy-balance/${balanceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(payload),
      });
      toast.success(
        action === 'release'
          ? 'Disparo de email liberado com sucesso!'
          : 'Envio de email revertido com sucesso!',
      );
      const responseRecord =
        response && typeof response === 'object' ? (response as Record<string, unknown>) : undefined;
      const nextEnvioOk =
        toDisplayBoolean(
          responseRecord?.sentOk ?? responseRecord?.envioOk ?? responseRecord?.sent_ok ?? responseRecord?.envio_ok,
        ) ?? (action === 'release' ? 'Sim' : 'Nao');
      const responseSendDate = extractSendDate(responseRecord);
      const updatedRow: DisplayEnergyBalanceRow = {
        ...row,
        envioOk: nextEnvioOk,
        disparo: responseSendDate ?? (action === 'revert' ? '' : row.disparo),
      };
      onSuccess?.(updatedRow, responseRecord);
    } catch (error) {
      console.error('[EmailDispatchApprovalCard] Falha ao liberar disparo de email', error);
      toast.error(
        action === 'release'
          ? 'Nao foi possivel liberar o disparo do email. Tente novamente.'
          : 'Nao foi possivel reverter o envio do email. Tente novamente.',
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleSubmit = () => void handleDispatch('release');
  const handleRevert = () => void handleDispatch('revert');

  const isSubmitting = pendingAction !== null;
  const badgeLabel = alreadySent ? 'Email liberado' : 'Open para liberar';

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Disparo de email</h3>
          <p className="mt-1 text-xs font-semibold text-gray-600">
            Confirme se deseja liberar o envio automatico deste balanco para o cliente apos revisar os dados editados.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${alreadySent
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {alreadySent ? (
            <>
              <MailCheck className="h-3.5 w-3.5" /> {badgeLabel}
            </>
          ) : (
            <>
              <ShieldAlert className="h-3.5 w-3.5" /> {badgeLabel}
            </>
          )}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={alreadySent || isSubmitting || !row || !balanceId}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition ${alreadySent
            ? 'cursor-not-allowed bg-gray-200 text-gray-500'
            : 'bg-yn-orange text-white hover:bg-yn-orange/90'
          } ${pendingAction === 'release' ? 'opacity-70' : ''}`}
        >
          {pendingAction === 'release' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Liberando...
            </>
          ) : (
            'Liberar disparo de email'
          )}
        </button>
        <button
          type="button"
          onClick={handleRevert}
          disabled={!alreadySent || isSubmitting || !row || !balanceId}
          className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold shadow-sm transition ${
            !alreadySent || isSubmitting
              ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500'
              : 'border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:text-red-600'
          } ${pendingAction === 'revert' ? 'opacity-70' : ''}`}
        >
          {pendingAction === 'revert' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Revertendo...
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4" /> Reverter envio de email
            </>
          )}
        </button>
        <p className="text-xs font-semibold text-gray-500">
          O disparo atualizara o status deste balanco para enviado.
        </p>
      </div>
    </section>
  );
}