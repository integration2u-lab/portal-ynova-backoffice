import { useEffect, useState } from 'react';
import { Cliente } from '../types';
import { fetchLeadSimulationClientes } from '../services/leadSimulationApi';

export function useSimulationClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    let mounted = true;

    async function load() {
      setLoading(true);
      const result = await fetchLeadSimulationClientes(abortController.signal);
      if (!mounted) return;

      setClientes(result.clientes);
      setIsUsingFallback(result.fromCache);
      setError(result.error ?? null);
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
      abortController.abort();
    };
  }, []);

  return { clientes, loading, error, isUsingFallback };
}
