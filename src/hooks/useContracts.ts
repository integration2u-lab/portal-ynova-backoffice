import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Contract } from '../services/contracts';
import { fetchContracts } from '../services/contracts';

type UseContractsResult = {
  contracts: Contract[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  setContracts: Dispatch<SetStateAction<Contract[]>>;
};

export function useContracts(): UseContractsResult {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    setLoading(true);
    setError(null);

    fetchContracts(controller.signal)
      .then((data) => {
        if (!isMounted) return;
        setContracts(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const message = err instanceof Error ? err.message : 'Erro ao carregar contratos.';
        setError(message);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [reloadToken]);

  const refetch = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return {
    contracts,
    loading,
    error,
    refetch,
    setContracts,
  };
}

