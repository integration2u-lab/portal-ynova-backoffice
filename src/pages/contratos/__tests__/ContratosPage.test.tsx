import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContratosPage from '..';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ContractsProvider } from '../ContractsContext';

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <ContractsProvider>{ui}</ContractsProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('ContratosPage', () => {
  it('renderiza a tabela com dados vindos da API', async () => {
    renderWithProviders(<ContratosPage />);
    const rows = await screen.findAllByRole('row');
    // primeira linha é o cabeçalho
    expect(rows.length).toBeGreaterThan(1);
  });

  it('filtra contratos ao digitar na busca', async () => {
    renderWithProviders(<ContratosPage />);
    const searchInput = await screen.findByLabelText(/Buscar contratos/i);
    const initialRows = await screen.findAllByRole('row');
    await userEvent.type(searchInput, 'Energia Alfa');

    await waitFor(() => {
      const rows = screen.getAllByRole('row').slice(1);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.length).toBeLessThanOrEqual(initialRows.length - 1);
      expect(
        rows.some((row) => row.textContent?.toLowerCase().includes('energia alfa'))
      ).toBe(true);
    });
  });
});
