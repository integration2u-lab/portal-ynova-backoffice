import React from 'react';
import { MailCheck, ShieldAlert, Loader2 } from 'lucide-react';
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
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const alreadySent = isEmailSent(row?.envioOk);

  const handleSubmit = async () => {
    if (!row || !balanceId) {
      toast.error('Não foi possível identificar o registro para envio.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = convertDisplayRowToEnergyBalancePayload(row, rawData ?? undefined);
      payload.sentOk = true;
      const now = new Date().toISOString();
      payload.sendDate = now;

      const response = await updateEmailRow(balanceId, payload);
      toast.success('Disparo de email liberado com sucesso!');
      const updatedRow: DisplayEnergyBalanceRow = {
        ...row,
        envioOk: 'Sim',
        disparo: now,
      };
      onSuccess?.(updatedRow, response && typeof response === 'object' ? (response as Record<string, unknown>) : undefined);
    } catch (error) {
      console.error('[EmailDispatchApprovalCard] Falha ao liberar disparo de email', error);
      toast.error('Não foi possível liberar o disparo do email. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          } ${isSubmitting ? 'opacity-70' : ''}`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Liberando...
            </>
          ) : (
            'Liberar disparo de email'
          )}
        </button>
        <p className="text-xs font-semibold text-gray-500">
          O disparo atualizará o status deste balanço para enviado.
        </p>
      </div>
    </section>
  );
}
