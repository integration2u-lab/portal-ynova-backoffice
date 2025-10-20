import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useContracts } from './ContractsContext';

export default function BalancoEnergeticoPage() {
  const { id } = useParams();
  const { getContractById } = useContracts();
  const contrato = React.useMemo(() => (id ? getContractById(id) : undefined), [getContractById, id]);

  // Mock de dados do Balanço Energético
  type EnergyBalanceRow = {
    id: string;
    meter: string;
    reference: string; // AAAA-MM
    consumptionKwh: number;
    pricePerMwh: number; // R$/MWh
    billable?: number; // custo do mês, quando houver
    proinfaContribution: number; // R$
    contractedVolumeMwh: number;
    lowerLimitPct: number; // 0.95 -> 95%
    upperLimitPct: number; // 1.05 -> 105%
    adjusted: boolean;
  };

  const mockEnergyBalance: EnergyBalanceRow[] = React.useMemo(() => {
    const base: EnergyBalanceRow[] = [
      {
        id: 'mb-1',
        meter: 'MTR-001',
        reference: '2024-04',
        consumptionKwh: 3200000,
        pricePerMwh: 272.4,
        billable: 872000,
        proinfaContribution: 14500,
        contractedVolumeMwh: 3200,
        lowerLimitPct: 0.95,
        upperLimitPct: 1.05,
        adjusted: false,
      },
      {
        id: 'mb-2',
        meter: 'MTR-001',
        reference: '2024-05',
        consumptionKwh: 3120000,
        pricePerMwh: 274.3,
        billable: 856000,
        proinfaContribution: 14120,
        contractedVolumeMwh: 3200,
        lowerLimitPct: 0.95,
        upperLimitPct: 1.05,
        adjusted: false,
      },
      {
        id: 'mb-3',
        meter: 'MTR-001',
        reference: '2024-06',
        consumptionKwh: 3450000,
        pricePerMwh: 277.9,
        billable: 958000,
        proinfaContribution: 15080,
        contractedVolumeMwh: 3200,
        lowerLimitPct: 0.95,
        upperLimitPct: 1.05,
        adjusted: true,
      },
      {
        id: 'mb-4',
        meter: 'MTR-002',
        reference: '2024-04',
        consumptionKwh: 1580000,
        pricePerMwh: 269.8,
        billable: 428000,
        proinfaContribution: 7300,
        contractedVolumeMwh: 1600,
        lowerLimitPct: 0.95,
        upperLimitPct: 1.05,
        adjusted: false,
      },
      {
        id: 'mb-5',
        meter: 'MTR-002',
        reference: '2024-05',
        consumptionKwh: 1510000,
        pricePerMwh: 271.1,
        proinfaContribution: 7200,
        contractedVolumeMwh: 1600,
        lowerLimitPct: 0.95,
        upperLimitPct: 1.05,
        adjusted: false,
      },
      {
        id: 'mb-6',
        meter: 'MTR-002',
        reference: '2024-06',
        consumptionKwh: 1680000,
        pricePerMwh: 275.0,
        billable: 462000,
        proinfaContribution: 7800,
        contractedVolumeMwh: 1600,
        lowerLimitPct: 0.95,
        upperLimitPct: 1.05,
        adjusted: false,
      },
    ];
    return base;
  }, []);

  const formatMonthShort = (isoMonth: string) => {
    const [y, m] = isoMonth.split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString('pt-BR', {
      month: 'short',
      year: 'numeric',
    }).replace('.', '');
  };

  if (!contrato) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Contrato não encontrado</h1>
        <p className="text-sm font-bold text-gray-600 dark:text-white">
          Não foi possível localizar o contrato selecionado. Retorne à lista de contratos e tente novamente.
        </p>
        <Link
          to="/contratos"
          className="inline-flex items-center justify-center rounded-lg border border-yn-orange px-4 py-2 text-sm font-bold text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
        >
          Voltar para contratos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Balanço Energético · {contrato.codigo}</h1>
          <p className="text-sm font-bold text-gray-600 dark:text-white">{contrato.cliente} · CNPJ {contrato.cnpj}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/contratos/${contrato.id}`}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm font-bold text-gray-700 dark:text-white transition hover:border-yn-orange hover:text-yn-orange"
          >
            Ver Contrato
          </Link>
          <Link
            to="/contratos"
            className="inline-flex items-center justify-center rounded-lg border border-yn-orange px-4 py-2 text-sm font-bold text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
          >
            Voltar para contratos
          </Link>
        </div>
      </header>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* KPIs do balanço */}
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Consumo do mês</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              { (mockEnergyBalance[0].consumptionKwh / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) } MWh
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Custo do mês</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              { (mockEnergyBalance[0].billable ?? (mockEnergyBalance[0].pricePerMwh * (mockEnergyBalance[0].consumptionKwh / 1000))).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500">PROINFA</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              { mockEnergyBalance[0].proinfaContribution.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Economia potencial</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">R$ 31.200</div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-auto">
          <table className="min-w-[920px] w-full table-auto text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Mês</th>
                <th className="px-4 py-3 text-left">Medidor</th>
                <th className="px-4 py-3 text-left">Consumo (MWh)</th>
                <th className="px-4 py-3 text-left">Preço (R$/MWh)</th>
                <th className="px-4 py-3 text-left">Custo do mês</th>
                <th className="px-4 py-3 text-left">PROINFA</th>
                <th className="px-4 py-3 text-left">Faixa contratual</th>
                <th className="px-4 py-3 text-left">Ajustado</th>
                <th className="px-4 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockEnergyBalance.map((row) => {
                const consumoMwh = row.consumptionKwh / 1000;
                const custo = row.billable ?? (row.pricePerMwh * consumoMwh);
                const faixaMin = row.contractedVolumeMwh * row.lowerLimitPct;
                const faixaMax = row.contractedVolumeMwh * row.upperLimitPct;
                return (
                  <tr key={row.id} className="bg-white hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">{formatMonthShort(row.reference)}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.meter}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{consumoMwh.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.pricePerMwh.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.proinfaContribution.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{faixaMin.toFixed(0)} – {faixaMax.toFixed(0)} MWh</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.adjusted ? 'Sim' : 'Não'}</td>
                    <td className="px-4 py-3">
                      <DetalhamentoButton row={row} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-sm font-bold text-gray-900">Balanço Energético</div>
          <p className="mt-1 text-xs font-bold text-gray-600">
            Linha do tempo mensal por medidor/cliente/contrato consolidando consumo, preço e encargos para cálculo, auditoria e geração de oportunidades.
          </p>
        </div>
      </div>
    </div>
  );
}

// Botão e Modal de detalhamento
function DetalhamentoButton({ row }: { row: any }) {
  const [open, setOpen] = React.useState(false);

  const consumoMwh = row.consumptionKwh / 1000;
  const custoAtual = row.billable ?? row.pricePerMwh * consumoMwh;
  const alvo = row.contractedVolumeMwh;
  const faixaMin = alvo * row.lowerLimitPct;
  const faixaMax = alvo * row.upperLimitPct;
  const custoEsperado = row.pricePerMwh * alvo; // mock simplificado
  const economiaPotencial = Math.max(0, custoAtual - custoEsperado);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-gray-200 px-3 py-1 font-bold text-gray-600 transition hover:border-yn-orange hover:text-yn-orange"
      >
        Detalhamento
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-5xl rounded-xl bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Detalhamento · {row.meter} · {new Date(row.reference + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')}</h3>
              <button onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-sm font-bold text-gray-600 hover:text-yn-orange">Fechar</button>
            </div>

            {/* KPIs principais exigidos */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Kpi label="Consumo (MWh)" value={`${consumoMwh.toLocaleString('pt-BR')}`} />
              <Kpi label="Custo atual do mês" value={custoAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
              <Kpi label="Alvo contratual (MWh)" value={alvo.toLocaleString('pt-BR')} />
              <Kpi label="Faixa contratual" value={`${faixaMin.toFixed(0)} – ${faixaMax.toFixed(0)} MWh`} />
              <Kpi label="PROINFA (R$)" value={row.proinfaContribution.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
              <Kpi label="Custo esperado" value={custoEsperado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
              <Kpi label="Economia potencial" value={economiaPotencial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
            </div>

            {/* Tabelas espelhando as guias da imagem */}
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <div className="mb-2 text-sm font-bold text-gray-900">Medições / Requisitos</div>
                <table className="w-full table-fixed text-xs">
                  <thead className="bg-blue-900 text-white">
                    <tr>
                      <th className="px-2 py-1 text-left">Mês</th>
                      <th className="px-2 py-1 text-left">Consumo</th>
                      <th className="px-2 py-1 text-left">Perdas (3%)</th>
                      <th className="px-2 py-1 text-left">Proinfa</th>
                      <th className="px-2 py-1 text-left">Requisito</th>
                      <th className="px-2 py-1 text-left">Recurso</th>
                      <th className="px-2 py-1 text-left">NET</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-2 py-1 font-bold">{new Date(row.reference + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')}</td>
                      <td className="px-2 py-1">{consumoMwh.toLocaleString('pt-BR')} MWh</td>
                      <td className="px-2 py-1">{(consumoMwh * 0.03).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} MWh</td>
                      <td className="px-2 py-1">{(row.proinfaContribution / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} MWh</td>
                      <td className="px-2 py-1">{consumoMwh.toLocaleString('pt-BR')} MWh</td>
                      <td className="px-2 py-1">{consumoMwh.toLocaleString('pt-BR')} MWh</td>
                      <td className="px-2 py-1">{(0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} MWh</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <div className="mb-2 text-sm font-bold text-gray-900">Faixa Contratual</div>
                <table className="w-full table-fixed text-xs">
                  <thead className="bg-blue-900 text-white">
                    <tr>
                      <th className="px-2 py-1 text-left">Mês</th>
                      <th className="px-2 py-1 text-left">Contrato</th>
                      <th className="px-2 py-1 text-left">Mínimo</th>
                      <th className="px-2 py-1 text-left">Máximo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-2 py-1 font-bold">{new Date(row.reference + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')}</td>
                      <td className="px-2 py-1">{alvo.toLocaleString('pt-BR')} MWh</td>
                      <td className="px-2 py-1">{faixaMin.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} MWh</td>
                      <td className="px-2 py-1">{faixaMax.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} MWh</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
