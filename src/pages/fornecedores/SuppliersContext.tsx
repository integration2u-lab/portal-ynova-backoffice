import React from 'react';
import type { Supplier, SupplierFormData } from '../../types/suppliers';
import { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier } from '../../services/suppliers';

interface SuppliersContextValue {
  suppliers: Supplier[];
  isLoading: boolean;
  error: string | null;
  refreshSuppliers: () => Promise<void>;
  addSupplier: (supplier: SupplierFormData) => Promise<Supplier>;
  updateSupplierById: (id: string, supplier: Partial<SupplierFormData>) => Promise<Supplier>;
  deleteSupplierById: (id: string) => Promise<void>;
  getSupplierById: (id: string) => Promise<Supplier | undefined>;
}

const SuppliersContext = React.createContext<SuppliersContextValue | undefined>(undefined);

export function SuppliersProvider({ children }: { children: React.ReactNode }) {
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refreshSuppliers = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSuppliers();
      // Garantir que sempre temos um array
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar fornecedores');
      console.error('Erro ao carregar fornecedores:', err);
      setSuppliers([]); // Garantir array vazio em caso de erro
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshSuppliers();
  }, [refreshSuppliers]);

  const addSupplier = React.useCallback(async (supplierData: SupplierFormData): Promise<Supplier> => {
    try {
      const newSupplier = await createSupplier(supplierData);
      await refreshSuppliers();
      return newSupplier;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar fornecedor';
      setError(errorMessage);
      throw err;
    }
  }, [refreshSuppliers]);

  const updateSupplierById = React.useCallback(
    async (id: string, supplierData: Partial<SupplierFormData>): Promise<Supplier> => {
      try {
        const updated = await updateSupplier(id, supplierData);
        await refreshSuppliers();
        return updated;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar fornecedor';
        setError(errorMessage);
        throw err;
      }
    },
    [refreshSuppliers]
  );

  const deleteSupplierById = React.useCallback(
    async (id: string): Promise<void> => {
      try {
        await deleteSupplier(id);
        await refreshSuppliers();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir fornecedor';
        setError(errorMessage);
        throw err;
      }
    },
    [refreshSuppliers]
  );

  const getSupplierById = React.useCallback(
    async (id: string): Promise<Supplier | undefined> => {
      try {
        return await getSupplier(id);
      } catch (err) {
        console.error('Erro ao buscar fornecedor:', err);
        return suppliers.find((s) => s.id === id);
      }
    },
    [suppliers]
  );

  const value: SuppliersContextValue = {
    suppliers,
    isLoading,
    error,
    refreshSuppliers,
    addSupplier,
    updateSupplierById,
    deleteSupplierById,
    getSupplierById,
  };

  return <SuppliersContext.Provider value={value}>{children}</SuppliersContext.Provider>;
}

export function useSuppliers() {
  const context = React.useContext(SuppliersContext);
  if (!context) {
    throw new Error('useSuppliers deve ser usado dentro de SuppliersProvider');
  }
  return context;
}

