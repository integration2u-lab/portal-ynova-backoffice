import React from 'react';
import { Loader2, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import { createFromCsv, pollJob } from '../../services/energyBalanceApi';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type UploadResult = { balanceId?: string; shouldRefresh?: boolean };

type UploadCsvModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (result: UploadResult) => void;
};

const ACCEPT_TYPES = ['text/csv', 'application/vnd.ms-excel'];

function isCsvFile(file: File) {
  if (!file) return false;
  const nameIsCsv = file.name.toLowerCase().endsWith('.csv');
  const typeIsCsv = ACCEPT_TYPES.includes(file.type);
  return nameIsCsv || typeIsCsv;
}

const readFileAsBase64Content = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler arquivo.'));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        resolve('');
        return;
      }
      const [, base64 = ''] = reader.result.split(',');
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });

const extractReferenceLabel = async (file: File): Promise<string | null> => {
  try {
    const base64 = await readFileAsBase64Content(file);
    if (!base64) return null;

    let csvContent = '';
    try {
      const binaryString = atob(base64);
      const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
      csvContent = new TextDecoder('utf-8').decode(bytes);
    } catch (error) {
      console.warn('[UploadCsvModal] falha ao decodificar base64 da planilha', error);
      return null;
    }

    const lines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length === 0) return null;

    // Função para parsear data no formato brasileiro dd/mm/yyyy
    const parseBrazilianDate = (dateStr: string): Date | null => {
      // Tenta identificar formato dd/mm/yyyy ou dd/mm/yy
      const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})$/);
      if (!match) return null;
      
      const [, day, month, year] = match;
      const fullYear = year.length === 2 ? parseInt(`20${year}`, 10) : parseInt(year, 10);
      const monthNum = parseInt(month, 10) - 1; // JavaScript months are 0-indexed
      const dayNum = parseInt(day, 10);
      
      if (monthNum < 0 || monthNum > 11) return null;
      if (dayNum < 1 || dayNum > 31) return null;
      
      const date = new Date(fullYear, monthNum, dayNum);
      // Verifica se a data é válida (evita problemas como 31/02)
      if (date.getFullYear() !== fullYear || date.getMonth() !== monthNum || date.getDate() !== dayNum) {
        return null;
      }
      
      return date;
    };

    const dataRows = lines.length > 1 ? lines.slice(1) : lines;
    for (const row of dataRows) {
      const delimiter = row.includes(';') ? ';' : ',';
      const columns = row.split(delimiter).map((value) => value.replace(/"/g, '').trim());
      if (columns.length < 3) continue;
      const candidate = columns[2];
      if (!candidate) continue;
      
      // Tenta parsear como data brasileira primeiro
      const parsed = parseBrazilianDate(candidate);
      if (parsed && !Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      }
      
      // Fallback: tenta com new Date() para outros formatos
      const fallbackParsed = new Date(candidate);
      if (!Number.isNaN(fallbackParsed.getTime())) {
        return fallbackParsed.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      }
      
      // Fallback final: retorna valor bruto
      return candidate;
    }
    return null;
  } catch (error) {
    console.warn('[UploadCsvModal] falha ao extrair referência da planilha', error);
    return null;
  }
};

export default function UploadCsvModal({ isOpen, onClose, onUploadComplete }: UploadCsvModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const inputId = React.useId();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const confirmationResolverRef = React.useRef<((choice: boolean) => void) | null>(null);
  const [confirmation, setConfirmation] = React.useState<{ message: string } | null>(null);

  const finishConfirmation = React.useCallback((result: boolean) => {
    if (confirmationResolverRef.current) {
      confirmationResolverRef.current(result);
      confirmationResolverRef.current = null;
    }
    setConfirmation(null);
  }, []);

  const requestConfirmation = React.useCallback(
    (message: string) =>
      new Promise<boolean>((resolve) => {
        confirmationResolverRef.current = resolve;
        setConfirmation({ message });
      }),
    [],
  );

  const resetState = React.useCallback(() => {
    finishConfirmation(false);
    setFile(null);
    setError(null);
    setStatus('');
    setIsSubmitting(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [finishConfirmation]);

  const handleClose = React.useCallback(() => {
    if (isSubmitting) return;
    resetState();
    onClose();
  }, [isSubmitting, onClose, resetState]);

  React.useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  React.useEffect(
    () => () => {
      finishConfirmation(false);
    },
    [finishConfirmation],
  );

  const handleFileChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = event.target.files?.[0];
    if (!selected) {
      setFile(null);
      return;
    }
    if (!isCsvFile(selected)) {
      setError('Envie um arquivo no formato CSV.');
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError('O arquivo excede o limite de 10MB.');
      setFile(null);
      return;
    }
    setFile(selected);
  }, []);

  const handleUploadSuccess = React.useCallback(
    (result: UploadResult) => {
      resetState();
      onClose();
      onUploadComplete(result);
    },
    [onClose, onUploadComplete, resetState],
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!file) {
        setError('Selecione uma planilha CSV para prosseguir.');
        return;
      }
      setError(null);

      let referenceLabel: string | null = null;
      try {
        referenceLabel = await extractReferenceLabel(file);
      } catch (extractError) {
        console.warn('[UploadCsvModal] não foi possível identificar a referência da planilha', extractError);
      }

      if (referenceLabel) {
        const shouldContinue = await requestConfirmation(
          `Deseja enviar o SCDE referente ao mês ${referenceLabel}?`,
        );
        if (!shouldContinue) {
          return;
        }
      } else {
        toast.warning('Não foi possível identificar a data na coluna C. Verifique manualmente antes de prosseguir.');
      }

      setIsSubmitting(true);
      setStatus('Enviando planilha...');
      try {
        const response = await createFromCsv(file);
        if (response.balanceId) {
          toast.success('Balanço energético criado com sucesso!');
          handleUploadSuccess({ balanceId: response.balanceId });
          return;
        }
        if (response.jobId) {
          toast.info('Processando planilha. Isso pode levar alguns instantes.');
          setStatus('Processando planilha...');
          try {
            const result = await pollJob(response.jobId, ({ attempt }) => {
              setStatus(`Processando planilha... tentativa ${attempt}`);
            });
            toast.success('Processamento concluído com sucesso!');
            handleUploadSuccess({ balanceId: result.balanceId });
            return;
          } catch (pollError) {
            const message =
              pollError instanceof Error
                ? pollError.message
                : 'Não foi possível concluir o processamento do balanço energético.';
            setError(message);
            toast.error(message);
            return;
          }
        }

        setStatus('Finalizando processamento...');
        await new Promise((resolve) => setTimeout(resolve, 4000));
        toast.success('Planilha enviada! Atualizando a listagem.');
        handleUploadSuccess({ shouldRefresh: true });
      } catch (uploadError) {
        const message =
          uploadError instanceof Error ? uploadError.message : 'Não foi possível enviar a planilha selecionada.';
        setError(message);
        toast.error(message);
      } finally {
        setIsSubmitting(false);
        setStatus('');
      }
    },
    [file, handleUploadSuccess, requestConfirmation],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Enviar planilha CSV</h2>
            <p className="mt-1 text-sm font-medium text-gray-600">
              Envie a planilha SCDE em CSV para criar um novo balanço energético automaticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fechar modal de envio de planilha"
          >
            <X size={18} />
          </button>
        </div>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit} aria-hidden={Boolean(confirmation)}>
          <div>
            <label
              htmlFor={inputId}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center transition hover:border-yn-orange hover:bg-yn-orange/5"
            >
              <UploadCloud className="text-yn-orange" size={32} />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900">Solte o arquivo aqui ou clique para selecionar</p>
                <p className="text-xs font-medium text-gray-500">Formatos suportados: CSV até 10MB</p>
              </div>
              <input
                ref={inputRef}
                id={inputId}
                name="file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            {file && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
                <span className="truncate" title={file.name}>{file.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (inputRef.current) {
                      inputRef.current.value = '';
                    }
                  }}
                  className="text-xs font-semibold text-yn-orange transition hover:text-yn-orange/80"
                >
                  Remover
                </button>
              </div>
            )}
            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}
            {status && !error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-yn-orange/40 bg-yn-orange/5 px-3 py-2 text-sm font-medium text-yn-orange">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{status}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-yn-orange hover:text-yn-orange disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !file}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-yn-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                'Enviar'
              )}
            </button>
          </div>
        </form>
        {confirmation && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900">Confirmar envio</h3>
              <p className="mt-2 text-sm font-medium text-gray-700">{confirmation.message}</p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => finishConfirmation(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
                >
                  Não
                </button>
                <button
                  type="button"
                  onClick={() => finishConfirmation(true)}
                  className="inline-flex items-center justify-center rounded-lg bg-yn-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90"
                >
                  Sim, enviar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
