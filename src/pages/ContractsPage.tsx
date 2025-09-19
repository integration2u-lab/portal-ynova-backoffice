import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ContractsAPI, ContractSummary } from '../services/api';

function toCsv(rows: ContractSummary[]) {
  const headers = [
    'ID','Cliente','CNPJ','UC','Status','Ciclo','Contratada (MWh)','Utilizada (MWh)','Flex (%)','Excedente (MWh)','Custo Extra'
  ];
  const lines = rows.map(r => [r.id, r.cliente, r.cnpj, r.uc, r.status, r.ciclo, r.energiaContratadaMWh, r.energiaUtilizadaMWh, r.flexibilidadePct, r.excedenteMWh, r.custoExtra].join(','));
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

  const onExport = () => {
    const csv = toCsv(data?.items || []);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contratos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = useMemo(() => (data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1), [data]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Contratos Ativos</h1>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar Cliente/UC" className="border rounded px-2 py-1" />
        <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="CNPJ" className="border rounded px-2 py-1" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Status</option>
          <option value="ativo">Ativo</option>
          <option value="pendente">Pendente</option>
          <option value="inativo">Inativo</option>
        </select>
        <input type="month" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded px-2 py-1" />
        <input type="month" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded px-2 py-1" />
        <div className="flex gap-2">
          <button onClick={() => { setPage(1); }} className="px-3 py-1 border rounded">Filtrar</button>
          <button onClick={onExport} className="px-3 py-1 border rounded bg-yn-orange text-white">Exportar CSV</button>
        </div>
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="p-2 text-left">Cliente</th>
              <th className="p-2 text-left">CNPJ</th>
              <th className="p-2 text-left">UC</th>
              <th className="p-2 text-left">Ciclo</th>
              <th className="p-2 text-right">Contratada</th>
              <th className="p-2 text-right">Utilizada</th>
              <th className="p-2 text-right">Flex (%)</th>
              <th className="p-2 text-right">Excedente</th>
              <th className="p-2 text-right">Custo Extra</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2">{c.cliente}</td>
                <td className="p-2">{c.cnpj}</td>
                <td className="p-2">{c.uc}</td>
                <td className="p-2">{c.ciclo}</td>
                <td className="p-2 text-right">{c.energiaContratadaMWh.toFixed(2)}</td>
                <td className="p-2 text-right">{c.energiaUtilizadaMWh.toFixed(2)}</td>
                <td className="p-2 text-right">{c.flexibilidadePct}</td>
                <td className={`p-2 text-right ${c.excedenteMWh>0? 'text-red-600':''}`}>{c.excedenteMWh.toFixed(2)}</td>
                <td className="p-2 text-right">{c.custoExtra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-xs ${c.status==='ativo'?'bg-green-100 text-green-700': c.status==='pendente'?'bg-yellow-100 text-yellow-700':'bg-gray-100 text-gray-700'}`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
            {isFetching && (
              <tr><td colSpan={10} className="p-4 text-center text-gray-500">Carregando...</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-x-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded" disabled={page<=1}>Anterior</button>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 border rounded" disabled={page>=totalPages}>Próxima</button>
        </div>
        <div>
          Página {page} de {totalPages}
        </div>
        <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border rounded px-2 py-1">
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>
    </div>
  );
}
