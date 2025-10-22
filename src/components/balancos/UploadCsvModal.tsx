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

export default function UploadCsvModal({ isOpen, onClose, onUploadComplete }: UploadCsvModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const inputId = React.useId();
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const resetState = React.useCallback(() => {
    setFile(null);
    setError(null);
    setStatus('');
    setIsSubmitting(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

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
    [file, handleUploadSuccess],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
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

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
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
      </div>
    </div>
  );
}
