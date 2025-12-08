import React from 'react';
import { Outlet } from 'react-router-dom';
import { ClientsProvider } from './ClientsContext';

export default function ClientsLayout() {
  return (
    <ClientsProvider>
      <Outlet />
    </ClientsProvider>
  );
}

