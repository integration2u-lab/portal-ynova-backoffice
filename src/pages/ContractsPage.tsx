import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ContractsAPI, Contract } from '../services/api';

function toCsv(rows: Contract[]) {
  const headers = [
    'ID',
    'Contract Code',
    'Client Name',
    'CNPJ',
    'Segment',
    'Contact Responsible',
    'Contracted Volume (MWh)',
    'Status',
    'Energy Source',
    'Contracted Modality',
    'Billing Cycle',
    'Start Date',
    'End Date',
  ];
  const lines = rows.map((row) => [
    row.id,
    row.contract_code,
    row.client_name,
    row.cnpj,
    row.segment,
    row.contact_responsible,
    row.contracted_volume_mwh ?? '',
    row.status,
    row.energy_source,
    row.contracted_modality,
    row.billing_cycle,
    row.start_date,
    row.end_date,
  ].join(','));
  return [headers.join(','), ...lines].join('\n');
}

export default function ContractsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['contracts', { page, pageSize, search, cnpj, status, startDate, endDate }],
    queryFn: () => ContractsAPI.list({ page, pageSize, search, cnpj, status, startDate, endDate }),
    keepPreviousData: true,
  });

  const formatNumber = (value: string | number | null) => {
    if (value === null || value === undefined || value === '') return '-';
    const numeric = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(numeric)) return String(value);
    return numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (value: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('pt-BR');
  };

  const onExport = () => {
    const csv = toCsv(data?.items || []);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contracts.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = useMemo(() => (data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1), [data]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Contratos Ativos</h1>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar Código/Cliente"
          className="border rounded px-2 py-1"
        />
        <input
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          placeholder="CNPJ"
          className="border rounded px-2 py-1"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Status</option>
          <option value="Ativo">Ativo</option>
          <option value="Em análise">Em análise</option>
          <option value="Inativo">Inativo</option>
        </select>
        <input
          type="month"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          type="month"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <div className="flex gap-2">
          <button onClick={() => { setPage(1); }} className="px-3 py-1 border rounded">Filtrar</button>
          <button onClick={onExport} className="px-3 py-1 border rounded bg-yn-orange text-white">Exportar CSV</button>
        </div>
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="p-2 text-left">Código</th>
              <th className="p-2 text-left">Cliente</th>
              <th className="p-2 text-left">CNPJ</th>
              <th className="p-2 text-left">Segmento</th>
              <th className="p-2 text-left">Responsável</th>
              <th className="p-2 text-right">Volume Contratado (MWh)</th>
              <th className="p-2 text-left">Fonte</th>
              <th className="p-2 text-left">Modalidade</th>
              <th className="p-2 text-left">Ciclo de Faturamento</th>
              <th className="p-2 text-left">Início</th>
              <th className="p-2 text-left">Fim</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map((contract) => {
              const statusVariant = contract.status.toLowerCase();
              const badgeClass = statusVariant === 'ativo'
                ? 'bg-green-100 text-green-700'
                : statusVariant === 'em análise'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700';

              return (
                <tr key={contract.id} className="border-t">
                  <td className="p-2">{contract.contract_code}</td>
                  <td className="p-2">{contract.client_name}</td>
                  <td className="p-2">{contract.cnpj}</td>
                  <td className="p-2">{contract.segment}</td>
                  <td className="p-2">{contract.contact_responsible}</td>
                  <td className="p-2 text-right">{formatNumber(contract.contracted_volume_mwh)}</td>
                  <td className="p-2">{contract.energy_source}</td>
                  <td className="p-2">{contract.contracted_modality}</td>
                  <td className="p-2">{contract.billing_cycle}</td>
                  <td className="p-2">{formatDate(contract.start_date)}</td>
                  <td className="p-2">{formatDate(contract.end_date)}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs ${badgeClass}`}>
                      {contract.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {isFetching && (
              <tr><td colSpan={12} className="p-4 text-center text-gray-500">Carregando...</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-x-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded" disabled={page <= 1}>Anterior</button>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 border rounded" disabled={page >= totalPages}>Próxima</button>
        </div>
        <div>
          Página {page} de {totalPages}
        </div>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          className="border rounded px-2 py-1"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>
    </div>
  );
}
