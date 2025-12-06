import React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type SyncResultItem = {
  balanceId: string;
  balanceMonth: string;
  contractId: string;
  contractCode: string;
  clientName: string;
  medidor: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  updatedFields?: string[];
};

export type SyncResult = {
  totalBalances: number;
  totalContracts: number;
  synced: number;
  skipped: number;
  errors: number;
  items: SyncResultItem[];
};

type SyncResultModalProps = {
  open: boolean;
  onClose: () => void;
  result: SyncResult | null;
  isLoading?: boolean;
};

export default function SyncResultModal({ open, onClose, result, isLoading }: SyncResultModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Resultado da Sincronização
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sincronização entre contratos e balanços energéticos
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-yn-orange border-t-transparent" />
              <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-400">
                Sincronizando...
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Buscando contratos e atualizando balanços
              </p>
            </div>
          ) : result ? (
            <>
              {/* Summary Cards */}
              <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {result.totalContracts}
                  </div>
                  <div className="text-xs font-medium text-slate-500">Contratos</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {result.totalBalances}
                  </div>
                  <div className="text-xs font-medium text-slate-500">Balanços</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-700 dark:bg-emerald-900/20">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {result.synced}
                  </div>
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-500">Sincronizados</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-700 dark:bg-amber-900/20">
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {result.skipped}
                  </div>
                  <div className="text-xs font-medium text-amber-600 dark:text-amber-500">Ignorados</div>
                </div>
              </div>

              {/* Results List */}
              {result.items.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Detalhes ({result.items.length} itens)
                  </h3>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                    {result.items.map((item, index) => (
                      <div
                        key={`${item.balanceId}-${index}`}
                        className={`flex items-start gap-3 p-4 ${
                          item.status === 'success'
                            ? 'bg-emerald-50/50 dark:bg-emerald-900/10'
                            : item.status === 'error'
                            ? 'bg-red-50/50 dark:bg-red-900/10'
                            : 'bg-slate-50/50 dark:bg-slate-900/10'
                        }`}
                      >
                        <div className="flex-shrink-0 pt-0.5">
                          {item.status === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                          ) : item.status === 'error' ? (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Info className="h-5 w-5 text-amber-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {item.clientName}
                            </span>
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              {item.balanceMonth}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            <span className="font-medium">Medidor:</span> {item.medidor}
                          </div>
                          <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            <span className="font-medium">Contrato:</span> {item.contractCode || item.contractId}
                          </div>
                          <div className="mt-1 text-sm text-slate-500 dark:text-slate-500">
                            {item.message}
                          </div>
                          {item.updatedFields && item.updatedFields.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {item.updatedFields.map((field) => (
                                <span
                                  key={field}
                                  className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                >
                                  {field}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
                  <Info className="h-12 w-12 text-slate-400" />
                  <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-400">
                    Nenhum balanço para sincronizar
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Não foram encontrados balanços com medidores correspondentes aos contratos.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-slate-400" />
              <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-400">
                Nenhum resultado disponível
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg bg-yn-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:opacity-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}


