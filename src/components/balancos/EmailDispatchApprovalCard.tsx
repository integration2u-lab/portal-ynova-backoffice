import React from 'react';
import { MailCheck, ShieldAlert, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { updateEmailRow } from '../../services/emailApi';
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

const isEmailSent = (value?: string): boolean => {
  if (!value) return false;
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  return normalized === 'sim' || normalized === 'true' || normalized === 'enviado';
};

export default function EmailDispatchApprovalCard({
  balanceId,
  row,
  rawData,
  onSuccess,
}: EmailDispatchApprovalCardProps) {
  const [pendingAction, setPendingAction] = React.useState<'release' | 'revert' | null>(null);

  const alreadySent = isEmailSent(row?.envioOk);

  const extractSendDate = (data?: Record<string, unknown> | null): string | undefined => {
    if (!data) return undefined;
    const candidates = ['sendDate', 'disparo', 'disparo_at', 'enviadoEm', 'sentAt', 'sent_at', 'send_date'];
    for (const key of candidates) {
      const value = data[key];
      if (typeof value === 'string' && value.trim() !== '') {
        return value;
      }
    }
    return undefined;
  };

  const toDisplayBoolean = (value: unknown): string | null => {
    if (typeof value === 'boolean') {
      return value ? 'Sim' : 'Não';
    }
    if (typeof value === 'number') {
      return value > 0 ? 'Sim' : 'Não';
    }
    if (typeof value === 'string') {
      const normalized = value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
      if (['sim', 's', 'true', '1', 'yes'].includes(normalized)) return 'Sim';
      if (['nao', 'não', 'n', 'false', '0', 'no'].includes(normalized)) return 'Não';
    }
    return null;
  };

  const handleDispatch = async (action: 'release' | 'revert') => {
    if (!row || !balanceId) {
      toast.error('Não foi possível identificar o registro para envio.');
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

      const response = await updateEmailRow(balanceId, payload);
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
        ) ?? (action === 'release' ? 'Sim' : 'Não');
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
          ? 'Não foi possível liberar o disparo do email. Tente novamente.'
          : 'Não foi possível reverter o envio do email. Tente novamente.',
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleSubmit = () => void handleDispatch('release');
  const handleRevert = () => void handleDispatch('revert');

  const isSubmitting = pendingAction !== null;

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Disparo de email</h3>
          <p className="mt-1 text-xs font-semibold text-gray-600">
            Confirme se deseja liberar o envio automático deste balanço para o cliente após revisar os dados editados.
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
              <MailCheck className="h-3.5 w-3.5" /> Email liberado
            </>
          ) : (
            <>
              <ShieldAlert className="h-3.5 w-3.5" /> Aguardando liberação
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
          O disparo atualizará o status deste balanço para enviado.
        </p>
      </div>
    </section>
  );
}
