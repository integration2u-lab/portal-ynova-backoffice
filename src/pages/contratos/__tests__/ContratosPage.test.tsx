import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContratosPage from '..';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe('ContratosPage', () => {
  it('filtra por mês ao alterar o input', async () => {
    renderWithProviders(<ContratosPage />);
    const month = await screen.findByLabelText(/Selecionar.*\(YYYY-MM\)/i);
    await userEvent.clear(month);
    await userEvent.type(month as HTMLInputElement, '2025-06');

    // aguarda render da tabela
    const rows = await screen.findAllByRole('row');
    // pula header
    const dataRows = rows.slice(1).filter((r) => within(r).queryByRole('cell'));
    // cada linha deve conter o ciclo 2025-06
    for (const row of dataRows) {
      expect(row.textContent).toMatch(/2025-06/);
    }
  });

  it('toggle "Somente com oportunidade" filtra somente COM', async () => {
    renderWithProviders(<ContratosPage />);
    const checkbox = await screen.findByLabelText(/Somente com oportunidade/i);
    await userEvent.click(checkbox);

    // Após filtrar, cada linha deve conter o badge "Com Oportunidade"
    await waitFor(async () => {
      const rows = screen.getAllByRole('row').slice(1);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.textContent).toMatch(/Com Oportunidade/);
      }
    });
  });

  it('renderiza mini-badges de conformidades na lista', async () => {
    renderWithProviders(<ContratosPage />);
    // aguarda pelo menos uma linha com badges
    const nf = await screen.findAllByLabelText('NF Energia');
    const icms = await screen.findAllByLabelText('NF ICMS');
    const fatura = await screen.findAllByLabelText('Fatura');
    expect(nf.length).toBeGreaterThan(0);
    expect(icms.length).toBeGreaterThan(0);
    expect(fatura.length).toBeGreaterThan(0);
  });
});

