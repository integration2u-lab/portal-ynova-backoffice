import React from 'react';
import { Outlet } from 'react-router-dom';
import { ContractsProvider } from './ContractsContext';

export default function ContractsLayout() {
  return (
    <ContractsProvider>
      <Outlet />
    </ContractsProvider>
  );
}
