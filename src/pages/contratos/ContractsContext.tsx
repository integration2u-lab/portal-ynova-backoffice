import React from 'react';
import { ContractMock } from '../../mocks/contracts';
import { mockContracts } from '../../mocks/contracts';

export type ContractUpdater = (contract: ContractMock) => ContractMock;

type ContractsContextValue = {
  contracts: ContractMock[];
  updateContract: (id: string, updater: ContractUpdater | Partial<ContractMock>) => void;
  getContractById: (id: string) => ContractMock | undefined;
  addContract: (contract: ContractMock) => void;
};

const ContractsContext = React.createContext<ContractsContextValue | undefined>(undefined);

function applyUpdate(contract: ContractMock, update: ContractUpdater | Partial<ContractMock>): ContractMock {
  if (typeof update === 'function') {
    return update(contract);
  }
  return {
    ...contract,
    ...update,
  };
}

function cloneContract(contract: ContractMock): ContractMock {
  return JSON.parse(JSON.stringify(contract)) as ContractMock;
}

export function ContractsProvider({ children }: { children: React.ReactNode }) {
  const [contracts, setContracts] = React.useState<ContractMock[]>(() =>
    mockContracts.map((contract) => cloneContract(contract))
  );

  const addContract = React.useCallback((contract: ContractMock) => {
    setContracts((prev) => [cloneContract(contract), ...prev]);
  }, []);

  const updateContract = React.useCallback(
    (id: string, updater: ContractUpdater | Partial<ContractMock>) => {
      setContracts((prev) =>
        prev.map((contract) => (contract.id === id ? applyUpdate(contract, updater) : contract))
      );
    },
    []
  );

  const getContractById = React.useCallback(
    (id: string) => contracts.find((contract) => contract.id === id),
    [contracts]
  );

  const value = React.useMemo(
    () => ({ contracts, updateContract, getContractById, addContract }),
    [contracts, updateContract, getContractById, addContract]
  );

  return <ContractsContext.Provider value={value}>{children}</ContractsContext.Provider>;
}

export function useContracts() {
  const context = React.useContext(ContractsContext);
  if (!context) {
    throw new Error('useContracts must be used within ContractsProvider');
  }
  return context;
}
