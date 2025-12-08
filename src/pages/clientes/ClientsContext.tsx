import React from 'react';
import type { Client, ClientFormData } from '../../types/clients';
import { getClients, getClient, createClient, updateClient, deleteClient } from '../../services/clients';

interface ClientsContextValue {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  refreshClients: () => Promise<void>;
  addClient: (client: ClientFormData) => Promise<Client>;
  updateClientById: (id: string, client: Partial<ClientFormData>) => Promise<Client>;
  deleteClientById: (id: string) => Promise<void>;
  getClientById: (id: string) => Promise<Client | undefined>;
}

const ClientsContext = React.createContext<ClientsContextValue | undefined>(undefined);

export function ClientsProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = React.useState<Client[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refreshClients = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getClients();
      // Garantir que sempre temos um array
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes');
      console.error('Erro ao carregar clientes:', err);
      setClients([]); // Garantir array vazio em caso de erro
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshClients();
  }, [refreshClients]);

  const addClient = React.useCallback(async (clientData: ClientFormData): Promise<Client> => {
    try {
      const newClient = await createClient(clientData);
      await refreshClients();
      return newClient;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar cliente';
      setError(errorMessage);
      throw err;
    }
  }, [refreshClients]);

  const updateClientById = React.useCallback(
    async (id: string, clientData: Partial<ClientFormData>): Promise<Client> => {
      try {
        const updated = await updateClient(id, clientData);
        await refreshClients();
        return updated;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar cliente';
        setError(errorMessage);
        throw err;
      }
    },
    [refreshClients]
  );

  const deleteClientById = React.useCallback(
    async (id: string): Promise<void> => {
      try {
        await deleteClient(id);
        await refreshClients();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir cliente';
        setError(errorMessage);
        throw err;
      }
    },
    [refreshClients]
  );

  const getClientById = React.useCallback(
    async (id: string): Promise<Client | undefined> => {
      try {
        return await getClient(id);
      } catch (err) {
        console.error('Erro ao buscar cliente:', err);
        return clients.find((c) => c.id === id);
      }
    },
    [clients]
  );

  const value: ClientsContextValue = {
    clients,
    isLoading,
    error,
    refreshClients,
    addClient,
    updateClientById,
    deleteClientById,
    getClientById,
  };

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
}

export function useClients() {
  const context = React.useContext(ClientsContext);
  if (!context) {
    throw new Error('useClients deve ser usado dentro de ClientsProvider');
  }
  return context;
}

