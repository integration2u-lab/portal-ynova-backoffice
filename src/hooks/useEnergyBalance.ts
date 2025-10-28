import React from 'react';
import { EnergyBalanceAPI, EnergyBalanceRow, EnergyBalanceQuery, EnergyBalanceSummary } from '../services/energyBalance';

export type UseEnergyBalanceOptions = {
  contractId?: string;
  clientId?: string;
  meter?: string;
  referenceBase?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  autoFetch?: boolean;
};

export type UseEnergyBalanceReturn = {
  data: EnergyBalanceRow[];
  summary: EnergyBalanceSummary | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
  refetch: () => Promise<void>;
  updateData: (id: string, updates: Partial<EnergyBalanceRow>) => Promise<void>;
  deleteData: (id: string) => Promise<void>;
};

export function useEnergyBalance(options: UseEnergyBalanceOptions = {}): UseEnergyBalanceReturn {
  const {
    contractId,
    clientId,
    meter,
    referenceBase,
    startDate,
    endDate,
    page = 1,
    pageSize = 10,
    autoFetch = true,
  } = options;

  const [data, setData] = React.useState<EnergyBalanceRow[]>([]);
  const [summary, setSummary] = React.useState<EnergyBalanceSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [total, setTotal] = React.useState<number>(0);
  const [currentPage, setCurrentPage] = React.useState<number>(page);
  const [currentPageSize, setCurrentPageSize] = React.useState<number>(pageSize);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const query: EnergyBalanceQuery = {
        page: currentPage,
        pageSize: currentPageSize,
      };

      if (contractId) query.contract_id = contractId;
      if (clientId) query.client_id = clientId;
      if (meter) query.meter = meter;
      if (referenceBase) query.reference_base = referenceBase;
      if (startDate) query.start_date = startDate;
      if (endDate) query.end_date = endDate;

      const [balanceData, summaryData] = await Promise.all([
        EnergyBalanceAPI.list(query),
        EnergyBalanceAPI.getSummary(query),
      ]);

      setData(balanceData.items);
      setSummary(summaryData);
      setTotal(balanceData.total);
      setCurrentPage(balanceData.page);
      setCurrentPageSize(balanceData.pageSize);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados do balanço energético';
      setError(errorMessage);
      console.error('[useEnergyBalance] Erro ao buscar dados:', err);
    } finally {
      setIsLoading(false);
    }
  }, [contractId, clientId, meter, referenceBase, startDate, endDate, currentPage, currentPageSize]);

  const updateData = React.useCallback(async (id: string, updates: Partial<EnergyBalanceRow>) => {
    try {
      const updated = await EnergyBalanceAPI.update(id, updates);
      setData(prev => prev.map(item => item.id === id ? updated : item));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar dados';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteData = React.useCallback(async (id: string) => {
    try {
      await EnergyBalanceAPI.delete(id);
      setData(prev => prev.filter(item => item.id !== id));
      setTotal(prev => prev - 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir dados';
      setError(errorMessage);
      throw err;
    }
  }, []);

  React.useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [fetchData, autoFetch]);

  return {
    data,
    summary,
    isLoading,
    error,
    total,
    page: currentPage,
    pageSize: currentPageSize,
    refetch: fetchData,
    updateData,
    deleteData,
  };
}
