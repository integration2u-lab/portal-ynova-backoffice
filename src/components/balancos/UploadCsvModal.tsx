import React from 'react';
import { X, UploadCloud } from 'lucide-react';
import { createFromCsv } from '../../services/energyBalanceApi';

export type UploadCsvModalResult = {
  balanceId?: string;
  jobId?: string;
};

type UploadCsvModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: UploadCsvModalResult) => void;
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function UploadCsvModal({ isOpen, onClose, onComplete }: UploadCsvModalProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      setFile(null);
      return;
    }

    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (extension !== 'csv') {
      setError('Envie um arquivo no formato CSV (.csv).');
      setFile(null);
      event.target.value = '';
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError('O arquivo ultrapassa o limite de 10MB.');
      setFile(null);
      event.target.value = '';
      return;
    }

    setError('');
    setFile(selectedFile);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError('Selecione um arquivo CSV para enviar.');
      fileInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await createFromCsv(file);
      onComplete({ balanceId: response.balanceId, jobId: response.jobId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível enviar a planilha.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setError('');
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Enviar planilha CSV</h2>
            <p className="mt-1 text-sm font-bold text-gray-600">
              Envie a planilha SCDE em CSV para gerar automaticamente o balanço energético.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label
              htmlFor="energy-balance-upload"
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center transition hover:border-yn-orange hover:bg-orange-50"
            >
              <UploadCloud className="h-10 w-10 text-yn-orange" aria-hidden />
              <span className="mt-3 text-sm font-bold text-gray-700">
                Arraste e solte o arquivo ou clique para selecionar
              </span>
              <span className="mt-1 text-xs font-bold text-gray-500">Formatos aceitos: .csv · Máx. 10MB</span>
              <input
                ref={fileInputRef}
                id="energy-balance-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            {file && (
              <p className="mt-2 text-sm font-bold text-gray-600" aria-live="polite">
                Arquivo selecionado: {file.name}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700" role="alert">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:border-yn-orange hover:text-yn-orange"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-yn-orange px-4 py-2 text-sm font-bold text-white transition hover:bg-yn-orange/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-ping rounded-full bg-white" aria-hidden />
                  Processando planilha...
                </span>
              ) : (
                <>
                  <UploadCloud size={18} aria-hidden />
                  Enviar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UploadCsvModal;
