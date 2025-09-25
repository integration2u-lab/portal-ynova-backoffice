import { useEffect, useRef, useState } from 'react';
import { Cliente } from '../types';
import {
  fetchLeadSimulationClientes,
  getCachedLeadSimulationClientes,
} from '../services/leadSimulationApi';

export function useSimulationClientes() {
  const cached = useRef(getCachedLeadSimulationClientes());
  const [clientes, setClientes] = useState<Cliente[]>(cached.current?.clientes ?? []);
  const [loading, setLoading] = useState(!cached.current);
  const [error, setError] = useState<string | null>(cached.current?.error ?? null);
  const [isUsingFallback, setIsUsingFallback] = useState(cached.current?.fromCache ?? false);

  useEffect(() => {
    let mounted = true;
    const abortController = new AbortController();

    async function load() {
      if (!cached.current) {
        setLoading(true);
      }

      try {
        const result = await fetchLeadSimulationClientes({ signal: abortController.signal });
        if (!mounted) return;

        cached.current = result;
        setClientes(result.clientes);
        setIsUsingFallback(result.fromCache);
        setError(result.error ?? null);
      } catch (err) {
        if (!mounted) return;
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        setIsUsingFallback(true);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
      abortController.abort();
    };
  }, []);

  return { clientes, loading, error, isUsingFallback };
}
