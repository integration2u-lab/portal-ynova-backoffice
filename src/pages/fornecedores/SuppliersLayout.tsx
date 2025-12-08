import React from 'react';
import { Outlet } from 'react-router-dom';
import { SuppliersProvider } from './SuppliersContext';

export default function SuppliersLayout() {
  return (
    <SuppliersProvider>
      <Outlet />
    </SuppliersProvider>
  );
}

