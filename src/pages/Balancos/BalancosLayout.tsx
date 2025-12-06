import React from 'react';
import { Outlet } from 'react-router-dom';
import { ContractsProvider } from '../contratos/ContractsContext';

/**
 * Layout para as páginas de Balanço Energético.
 * Provê o ContractsProvider para permitir acesso aos dados de contratos
 * nas páginas de balanço (necessário para exibir volumes sazonais, etc.)
 */
export default function BalancosLayout() {
  return (
    <ContractsProvider>
      <Outlet />
    </ContractsProvider>
  );
}

