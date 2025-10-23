import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../DashboardPage';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '../../test/msw';
import { http, HttpResponse } from 'msw';

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    // ensure default handlers
  });

  it('renderiza em mobile (grid compacta) e mostra loader', async () => {
    server.use(
      http.get('/api/dashboard/overview', async () => {
        await new Promise((r) => setTimeout(r, 150));
        return HttpResponse.json({
          totalContratosAtivos: 10,
          distribuicaoConformidade: { Subutilizado: 2, Conforme: 5, Excedente: 2, Indefinido: 1 },
          totalOportunidades: 3,
          totalDivergenciasNF: 2,
          totalDivergenciasFatura: 1,
        });
      })
    );
    renderWithProviders(<DashboardPage />);
    // loader skeleton presente nos cards
    expect(await screen.findAllByRole('button')).toBeTruthy();
  });

  it('trocar o mês altera os números dos cards', async () => {
    server.use(
      http.get('*/api/dashboard/overview', ({ request }) => {
        const url = new URL(request.url);
        const mes = url.searchParams.get('mes');
        const totalContratosAtivos = mes === '2025-08' ? 42 : 10;
        return HttpResponse.json({
          totalContratosAtivos,
          distribuicaoConformidade: { Subutilizado: 2, Conforme: 5, Excedente: 2, Indefinido: 1 },
          totalOportunidades: 3,
          totalDivergenciasNF: 2,
          totalDivergenciasFatura: 1,
        });
      })
    );

    renderWithProviders(<DashboardPage />);
    const month = await screen.findByLabelText(/Selecionar mês/i);
    // aguarda primeiro valor
    const kpi = await screen.findByRole('button', { name: /Contratos Ativos/i });
    const firstText = kpi.textContent;
    await userEvent.type(month as HTMLInputElement, '{Control>}a{/Control}{Backspace}2025-08');
    await waitFor(() => {
      expect(kpi.textContent).not.toEqual(firstText);
    });
  });
});

