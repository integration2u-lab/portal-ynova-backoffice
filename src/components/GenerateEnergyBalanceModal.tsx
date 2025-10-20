import React from 'react';
import { Loader2, UploadCloud } from 'lucide-react';
import type { ContractMock } from '../mocks/contracts';
import { EnergyBalanceAPI, type EnergyBalanceGenerationRequest } from '../services/energyBalance';

type FilePayload = {
  name: string;
  type: string;
  size: number;
  data: string;
};

type GenerateEnergyBalanceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  contract: ContractMock | null | undefined;
  onSuccess?: () => Promise<void> | void;
};

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

function getDefaultPeriod(contract: ContractMock | null | undefined) {
  if (contract?.periodos?.length) {
    const ordered = [...contract.periodos].sort();
    return {
      start: ordered[0],
      end: ordered[ordered.length - 1],
    };
  }

  const now = new Date();
  const current = now.toISOString().slice(0, 7);
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .slice(0, 7);

  return {
    start: previous,
    end: current,
  };
}

async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function formatMonthLabel(value: string) {
  if (!value) return '';
  try {
    const [year, month] = value.split('-').map((part) => Number(part));
    if (!year || !month) return value;
    const date = new Date(year, month - 1, 1);
    return monthFormatter.format(date);
  } catch (error) {
    console.warn('[GenerateEnergyBalanceModal] Erro ao formatar mês', error);
    return value;
  }
}

export function GenerateEnergyBalanceModal({ isOpen, onClose, contract, onSuccess }: GenerateEnergyBalanceModalProps) {
  const defaultPeriod = React.useMemo(() => getDefaultPeriod(contract), [contract]);
  const [startMonth, setStartMonth] = React.useState<string>(defaultPeriod.start);
  const [endMonth, setEndMonth] = React.useState<string>(defaultPeriod.end);
  const [filePayload, setFilePayload] = React.useState<FilePayload | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setStartMonth(defaultPeriod.start);
    setEndMonth(defaultPeriod.end);
  }, [defaultPeriod.start, defaultPeriod.end]);

  const handleFileSelection = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) {
      setFilePayload(null);
      return;
    }

    if (!/csv|plain/.test(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
      setError('Selecione um arquivo CSV válido.');
      setFilePayload(null);
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setFilePayload({
        name: file.name,
        type: file.type || 'text/csv',
        size: file.size,
        data: base64,
      });
    } catch (err) {
      console.error('[GenerateEnergyBalanceModal] Falha ao processar arquivo CSV', err);
      setError('Não foi possível ler o arquivo selecionado. Tente novamente.');
      setFilePayload(null);
    }
  }, []);

  const handleOpenFilePicker = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const resetState = React.useCallback(() => {
    setError(null);
    setIsSubmitting(false);
    setFilePayload(null);
  }, []);

  const handleClose = React.useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handleSubmit = React.useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!contract) {
      setError('Contrato inválido ou não encontrado.');
      return;
    }

    if (!startMonth || !endMonth) {
      setError('Informe o período desejado.');
      return;
    }

    if (startMonth > endMonth) {
      setError('O mês inicial deve ser anterior ou igual ao mês final.');
      return;
    }

    if (!filePayload) {
      setError('Selecione o arquivo CSV que será utilizado no processamento.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const requestPayload: EnergyBalanceGenerationRequest = {
      contract: {
        id: contract.id,
        codigo: contract.codigo,
        cliente: contract.cliente,
        cnpj: contract.cnpj,
        fornecedor: contract.fornecedor,
        modalidade: contract.modalidade,
        fonte: contract.fonte,
        inicioVigencia: contract.inicioVigencia,
        fimVigencia: contract.fimVigencia,
        cicloFaturamento: contract.cicloFaturamento,
      },
      startMonth,
      endMonth,
      file: filePayload,
      requestedAt: new Date().toISOString(),
      triggerSource: 'portal-backoffice',
    };

    try {
      await EnergyBalanceAPI.triggerGeneration(requestPayload);
      if (onSuccess) {
        await onSuccess();
      }
      handleClose();
    } catch (err) {
      console.error('[GenerateEnergyBalanceModal] Erro ao gerar balanço energético', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao gerar balanço energético.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [contract, endMonth, filePayload, handleClose, onSuccess, startMonth]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Criar Balanço Energético</h2>
            {contract && (
              <p className="mt-1 text-sm text-gray-600">
                {contract.cliente} · {contract.cnpj}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md px-2 py-1 text-sm font-medium text-gray-500 hover:text-gray-800"
          >
            Fechar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="startMonth" className="text-sm font-medium text-gray-700">
              Mês inicial
            </label>
            <input
              id="startMonth"
              name="startMonth"
              type="month"
              value={startMonth}
              onChange={(event) => setStartMonth(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-yn-orange focus:outline-none"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Será considerado o período a partir de {formatMonthLabel(startMonth)}.
            </p>
          </div>

          <div>
            <label htmlFor="endMonth" className="text-sm font-medium text-gray-700">
              Mês final
            </label>
            <input
              id="endMonth"
              name="endMonth"
              type="month"
              value={endMonth}
              onChange={(event) => setEndMonth(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-yn-orange focus:outline-none"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Será considerado o período até {formatMonthLabel(endMonth)}.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Planilha CSV</label>
            <div className="mt-1 flex items-center justify-between gap-3 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
              <div className="flex flex-1 items-center gap-3">
                <UploadCloud className="h-5 w-5 text-gray-500" />
                <div className="text-sm">
                  {filePayload ? (
                    <>
                      <p className="font-medium text-gray-900">{filePayload.name}</p>
                      <p className="text-xs text-gray-500">{(filePayload.size / 1024).toFixed(1)} KB</p>
                    </>
                  ) : (
                    <p className="text-gray-500">Selecione o arquivo CSV exportado da distribuidora.</p>
                  )}
                </div>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileSelection}
                />
                <button
                  type="button"
                  onClick={handleOpenFilePicker}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {filePayload ? 'Trocar' : 'Selecionar'}
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              O arquivo será enviado ao fluxo do n8n para cálculo automático do balanço energético.
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-md bg-yn-orange px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yn-orange/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Enviando...' : 'Gerar balanço'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GenerateEnergyBalanceModal;
