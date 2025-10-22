import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, X, Menu, Bell, Moon, User } from 'lucide-react';

type FieldValue = string | number | null;

type EnergyBalanceRow = {
  id: FieldValue;
  clientes: FieldValue;
  preco: FieldValue;
  dataBase: FieldValue;
  reajustado: FieldValue;
  fornecedor: FieldValue;
  medidor: FieldValue;
  consumo: FieldValue;
  perdas3: FieldValue;
  requisito: FieldValue;
  net: FieldValue;
  medicao: FieldValue;
  proinfa: FieldValue;
  contrato: FieldValue;
  minimo: FieldValue;
  maximo: FieldValue;
  faturar: FieldValue;
  cp: FieldValue;
  email: FieldValue;
  envioOk: FieldValue;
  disparo: FieldValue;
  dataVencimentoBoleto: FieldValue;
};

type ColumnKey = keyof EnergyBalanceRow;

type ColumnDefinition = {
  key: ColumnKey;
  label: string;
  width: string;
};

const API_URL = 'http://ec2-18-116-166-24.us-east-2.compute.amazonaws.com:4000/energy-balance';

const normalizeKey = (key: string) => key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

const valueFromRecord = (record: Record<string, unknown> | null | undefined, candidates: string[]): unknown => {
  if (!record) {
    return undefined;
  }

  const normalizedEntries = new Map<string, unknown>();
  Object.entries(record).forEach(([key, value]) => {
    normalizedEntries.set(normalizeKey(key), value);
  });

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeKey(candidate);
    if (normalizedEntries.has(normalizedCandidate)) {
      const value = normalizedEntries.get(normalizedCandidate);
      if (value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '')) {
        return value;
      }
    }
  }

  return undefined;
};

export const normalizeRow = (record: Record<string, unknown>): EnergyBalanceRow => {
  const formatValue = (value: unknown): FieldValue => {
    if (value === undefined || value === null) {
      return '-';
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length === 0 ? '-' : trimmed;
    }

    if (typeof value === 'number') {
      if (Number.isNaN(value)) {
        return '-';
      }
      return value;
    }

    if (typeof value === 'boolean') {
      return value ? 'SIM' : 'NÃO';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return String(value);
  };

  const field = (candidates: string[], fallback: FieldValue = '-'): FieldValue => {
    const found = valueFromRecord(record, candidates);
    if (found === undefined) {
      return fallback;
    }
    return formatValue(found);
  };

  return {
    id: field(['id', 'identifier', 'codigo', 'code']),
    clientes: field(['clientes', 'cliente', 'client', 'clientname', 'client_name', 'clientName', 'nomecliente', 'nome_cliente', 'customer', 'customername']),
    preco: field(['preco', 'preço', 'price', 'price_mwh', 'valor', 'valor_preco', 'valorunitario', 'valor_unitario', 'precomwh', 'valorpreco']),
    dataBase: field(['dataBase', 'database', 'data_base', 'base_date', 'basedate', 'referencedate', 'referencebase', 'reference_base', 'datareferencia', 'mesreferencia', 'reference']),
    reajustado: field(['reajustado', 'reajuste', 'reajustado_valor', 'adjustedvalue', 'adjusted_value', 'valor_reajustado', 'valorReajustado', 'adjusted']),
    fornecedor: field(['fornecedor', 'supplier', 'provider', 'vendor', 'fornecedor_nome', 'supplierName']),
    medidor: field(['medidor', 'meter', 'medidor_nome', 'metername', 'medidorname', 'meter_id']),
    consumo: field(['consumo', 'consumo_kwh', 'consumoKwh', 'consumption', 'consumptionKwh', 'consumption_kwh', 'consumoTotal', 'consumptiontotal', 'consumomwh']),
    perdas3: field(['perdas3', 'perdas_3', 'perdas', 'losses', 'losses3', 'perdaspercentual', 'perdaspercent']),
    requisito: field(['requisito', 'requisito_total', 'requirement', 'required', 'requisito_mensal', 'requisitoTotal']),
    net: field(['net', 'neto', 'net_value', 'netvalue', 'valorliquido', 'liquido']),
    medicao: field(['medicao', 'medição', 'medicao_tipo', 'medicao_tipo', 'measurement', 'measurement_type', 'tipo_medicao', 'tipoMedicao']),
    proinfa: field(['proinfa', 'proinfacontribution', 'proinfa_contribution', 'contribuicao_proinfa', 'proinfaContribution']),
    contrato: field(['contrato', 'contract', 'contract_code', 'contractcode', 'contractId', 'contract_id', 'codigo_contrato']),
    minimo: field(['minimo', 'minimo_contratado', 'min', 'minimum', 'mindemand', 'min_demand', 'minDemand']),
    maximo: field(['maximo', 'maximo_contratado', 'max', 'maximum', 'maxdemand', 'max_demand', 'maxDemand']),
    faturar: field(['faturar', 'billable', 'valor_faturar', 'valorfaturado', 'valorFaturado', 'valor_a_faturar', 'valorafaturar', 'bill']),
    cp: field(['cp', 'cpcode', 'cp_code', 'codigo_cp', 'codigocp']),
    email: field(['email', 'email_cliente', 'client_email', 'contato_email', 'contactemail', 'emaildestinatario']),
    envioOk: field(['envioOk', 'envio_ok', 'envio_status', 'enviado', 'status_envio', 'envio', 'envioConfirmado', 'envioSucesso']),
    disparo: field(['disparo', 'dataDisparo', 'disparo_data', 'disparo_at', 'enviodata', 'sendDate', 'sent_at', 'data_envio']),
    dataVencimentoBoleto: field(['dataVencimentoBoleto', 'data_vencimento_boleto', 'datavencimentoboleto', 'duedate', 'due_date', 'boleto_due_date', 'boletoDueDate', 'data_vencimento']),
  };
};

const columns: ColumnDefinition[] = [
  { key: 'id', label: 'ID', width: '80px' },
  { key: 'clientes', label: 'Clientes', width: '140px' },
  { key: 'preco', label: 'Preço', width: '100px' },
  { key: 'dataBase', label: 'Data-base', width: '100px' },
  { key: 'reajustado', label: 'Reajustado', width: '110px' },
  { key: 'fornecedor', label: 'Fornecedor', width: '110px' },
  { key: 'medidor', label: 'Medidor', width: '150px' },
  { key: 'consumo', label: 'Consumo', width: '110px' },
  { key: 'perdas3', label: 'Perdas (3%)', width: '110px' },
  { key: 'requisito', label: 'Requisito', width: '120px' },
  { key: 'net', label: 'NET', width: '70px' },
  { key: 'medicao', label: 'Medição', width: '100px' },
  { key: 'proinfa', label: 'Proinfa', width: '90px' },
  { key: 'contrato', label: 'Contrato', width: '100px' },
  { key: 'minimo', label: 'Mínimo', width: '90px' },
  { key: 'maximo', label: 'Máximo', width: '90px' },
  { key: 'faturar', label: 'Faturar', width: '120px' },
  { key: 'cp', label: 'CP', width: '90px' },
  { key: 'email', label: 'Email', width: '200px' },
  { key: 'envioOk', label: 'Envio ok', width: '90px' },
  { key: 'disparo', label: 'Disparo', width: '100px' },
  { key: 'dataVencimentoBoleto', label: 'Data vencimento boleto', width: '160px' },
];

const EmailPage: React.FC = () => {
  const [editingRow, setEditingRow] = useState<FieldValue>(null);
  const [data, setData] = useState<EnergyBalanceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleCellEdit = useCallback((rowId: FieldValue, field: ColumnKey, value: string) => {
    setData((previous) =>
      previous.map((row) => (String(row.id) === String(rowId) ? { ...row, [field]: value } : row)),
    );
  }, []);

  const handleConfirmBalance = useCallback(() => {
    alert('Balanço alterado com sucesso!');
  }, []);

  const handleEnableEdit = useCallback((rowId: FieldValue) => {
    setEditingRow(rowId);
  }, []);

  const fetchEnergyBalance = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(API_URL, { signal });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const json = await response.json();
        const records = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];

        const normalizedRows = records.map((item: Record<string, unknown>) => normalizeRow(item));

        if (!signal.aborted) {
          setData(normalizedRows);
        }
      } catch (err) {
        if (signal.aborted) {
          return;
        }
        console.error('Failed to fetch energy balance', err);
        setError('Não foi possível carregar os dados');
        setData([]);
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchEnergyBalance(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchEnergyBalance]);

  const totalRegistros = useMemo(() => data.length, [data]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Menu size={24} className="text-gray-600" />
            </button>
            <div>
              <div className="text-orange-500 text-2xl font-bold">YNOVA</div>
              <div className="text-xs text-gray-500">marketplace de energia</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Bell size={20} className="text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Moon size={20} className="text-gray-600" />
            </button>
            <div className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg">
              <User size={18} />
              <span className="text-sm">Ynova Parceiro</span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestão de Emails CCEE</h1>
          <p className="text-gray-600">Gerencie e envie emails com dados de contratos e medições de energia.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-orange-500">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-orange-400 last:border-r-0"
                      style={{ minWidth: col.width }}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th
                    className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider"
                    style={{ minWidth: '100px' }}
                  >
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="px-3 py-4 text-center text-sm font-medium text-gray-600"
                    >
                      Carregando...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="px-3 py-4 text-center text-sm font-medium text-gray-600"
                    >
                      Nenhum registro disponível.
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={String(row.id)} className="hover:bg-gray-50 transition-colors">
                      {columns.map((col) => {
                        const isEditing = String(editingRow) === String(row.id);
                        const rawValue = row[col.key];
                        const displayValue =
                          rawValue === null || rawValue === undefined || rawValue === '' ? '-' : rawValue;

                        return (
                          <td
                            key={col.key}
                            className="px-3 py-2 text-sm text-gray-900 border-r border-gray-200 last:border-r-0"
                            style={{ minWidth: col.width }}
                          >
                            {isEditing ? (
                              <input
                                type="text"
                                value={rawValue === null || rawValue === undefined ? '' : String(rawValue)}
                                onChange={(e) => handleCellEdit(row.id, col.key, e.target.value)}
                                className="w-full px-2 py-1 border border-orange-500 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            ) : (
                              <span className={col.key === 'clientes' ? 'text-purple-600 font-medium' : ''}>
                                {typeof displayValue === 'string' || typeof displayValue === 'number'
                                  ? displayValue
                                  : String(displayValue)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {String(editingRow) === String(row.id) ? (
                            <button
                              onClick={() => setEditingRow(null)}
                              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
                              title="Salvar Alterações"
                            >
                              Salvar
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={handleConfirmBalance}
                                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                title="Confirmar Balanço"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => handleEnableEdit(row.id)}
                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                title="Editar Linha"
                              >
                                <X size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>Total de registros: {totalRegistros}</span>
          <span>Página 1 de 1</span>
        </div>
      </div>
    </div>
  );
};

export default EmailPage;
