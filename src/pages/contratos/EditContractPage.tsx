import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type {
  ContractInvoiceStatus,
  ContractMock,
  StatusResumo,
} from '../../mocks/contracts';
import { useContracts } from './ContractsContext';

const resumoStatusOptions: StatusResumo[] = ['Conforme', 'Em análise', 'Divergente'];
const invoiceStatusOptions: ContractInvoiceStatus[] = ['Paga', 'Em aberto', 'Em análise'];

type FormState = {
  codigo: string;
  cliente: string;
  cnpj: string;
  segmento: string;
  contato: string;
  status: ContractMock['status'];
  fonte: ContractMock['fonte'];
  modalidade: string;
  inicioVigencia: string;
  fimVigencia: string;
  limiteSuperior: string;
  limiteInferior: string;
  flex: string;
  precoMedio: string;
  precoSpotReferencia: string;
  cicloFaturamento: string;
  dadosContrato: ContractMock['dadosContrato'];
  resumoConformidades: ContractMock['resumoConformidades'];
  faturas: Array<{
    id: string;
    competencia: string;
    vencimento: string;
    valor: string;
    status: ContractInvoiceStatus;
  }>;
};

function buildFormState(contrato: ContractMock): FormState {
  return {
    codigo: contrato.codigo,
    cliente: contrato.cliente,
    cnpj: contrato.cnpj,
    segmento: contrato.segmento,
    contato: contrato.contato,
    status: contrato.status,
    fonte: contrato.fonte,
    modalidade: contrato.modalidade,
    inicioVigencia: contrato.inicioVigencia,
    fimVigencia: contrato.fimVigencia,
    limiteSuperior: contrato.limiteSuperior,
    limiteInferior: contrato.limiteInferior,
    flex: contrato.flex,
    precoMedio: contrato.precoMedio.toString(),
    precoSpotReferencia: contrato.precoSpotReferencia.toString(),
    cicloFaturamento: contrato.cicloFaturamento,
    dadosContrato: contrato.dadosContrato.map((campo) => ({ ...campo })),
    resumoConformidades: { ...contrato.resumoConformidades },
    faturas: contrato.faturas.map((fatura) => ({
      id: fatura.id,
      competencia: fatura.competencia,
      vencimento: fatura.vencimento,
      valor: fatura.valor.toString(),
      status: fatura.status,
    })),
  };
}

export default function EditContractPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getContractById, updateContract } = useContracts();

  const contrato = React.useMemo(() => (id ? getContractById(id) : undefined), [getContractById, id]);
  const [formState, setFormState] = React.useState<FormState | null>(() =>
    contrato ? buildFormState(contrato) : null
  );
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (contrato) {
      setFormState(buildFormState(contrato));
    }
  }, [contrato]);

  const handleInputChange = (
    field: keyof FormState
  ) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormState((prev) => (prev ? { ...prev, [field]: event.target.value } : prev));
    };

  const handleDadoChange = (index: number, field: 'label' | 'value', value: string) => {
    setFormState((prev) => {
      if (!prev) return prev;
      const dados = prev.dadosContrato.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      );
      return { ...prev, dadosContrato: dados };
    });
  };

  const handleAddDado = () => {
    setFormState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        dadosContrato: [
          ...prev.dadosContrato,
          { label: 'Novo campo', value: '' },
        ],
      };
    });
  };

  const handleRemoveDado = (index: number) => {
    setFormState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        dadosContrato: prev.dadosContrato.filter((_, idx) => idx !== index),
      };
    });
  };

  const handleResumoChange = (chave: keyof ContractMock['resumoConformidades'], valor: StatusResumo) => {
    setFormState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        resumoConformidades: {
          ...prev.resumoConformidades,
          [chave]: valor,
        },
      };
    });
  };

  const handleFaturaChange = (
    index: number,
    field: 'competencia' | 'vencimento' | 'valor' | 'status',
    value: string
  ) => {
    setFormState((prev) => {
      if (!prev) return prev;
      const faturas = prev.faturas.map((item, idx) =>
        idx === index
          ? {
              ...item,
              [field]: field === 'status' ? (value as ContractInvoiceStatus) : value,
            }
          : item
      );
      return { ...prev, faturas };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contrato || !formState || isSaving) return;

    setSubmitError(null);
    setIsSaving(true);
    try {
      await updateContract(contrato.id, (current) => ({
        ...current,
        codigo: formState.codigo.trim(),
        cliente: formState.cliente.trim(),
        cnpj: formState.cnpj.trim(),
        segmento: formState.segmento.trim(),
        contato: formState.contato.trim(),
        status: formState.status,
        fonte: formState.fonte,
        modalidade: formState.modalidade.trim(),
        inicioVigencia: formState.inicioVigencia,
        fimVigencia: formState.fimVigencia,
        limiteSuperior: formState.limiteSuperior.trim(),
        limiteInferior: formState.limiteInferior.trim(),
        flex: formState.flex.trim(),
        precoMedio: Number(formState.precoMedio) || 0,
        precoSpotReferencia: Number(formState.precoSpotReferencia) || 0,
        cicloFaturamento: formState.cicloFaturamento,
        dadosContrato: formState.dadosContrato.map((item, index) => ({
          label: item.label.trim() || `Campo ${index + 1}`,
          value: item.value.trim(),
        })),
        resumoConformidades: { ...formState.resumoConformidades },
        faturas: formState.faturas.map((fatura) => ({
          id: fatura.id,
          competencia: fatura.competencia,
          vencimento: fatura.vencimento,
          valor: Number(fatura.valor) || 0,
          status: fatura.status,
        })),
      }));

      navigate(`/contratos/${contrato.id}`);
    } catch (error) {
      console.error('[EditContractPage] Falha ao salvar contrato.', error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível salvar as alterações. Tente novamente.';
      setSubmitError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!contrato || !formState) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-xl font-semibold text-gray-900">Contrato não encontrado</h1>
        <p className="text-sm text-gray-600">
          Não foi possível localizar o contrato solicitado. Volte para a listagem e tente novamente.
        </p>
        <Link
          to="/contratos"
          className="inline-flex items-center justify-center rounded-lg border border-yn-orange px-4 py-2 text-sm font-medium text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
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
          <h1 className="text-2xl font-semibold text-gray-900">Editar contrato · {formState.codigo}</h1>
          <p className="text-sm text-gray-500">Ajuste informações cadastrais e acompanhe o histórico de faturas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/contratos/${contrato.id}`}
            className="rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-yn-orange hover:text-yn-orange"
          >
            Ver detalhes
          </Link>
          <Link
            to="/contratos"
            className="rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-yn-orange hover:text-yn-orange"
          >
            Lista de contratos
          </Link>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Informações gerais</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Código do contrato
              <input
                value={formState.codigo}
                onChange={handleInputChange('codigo')}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Cliente
              <input
                value={formState.cliente}
                onChange={handleInputChange('cliente')}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              CNPJ
              <input
                value={formState.cnpj}
                onChange={handleInputChange('cnpj')}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Segmento
              <input
                value={formState.segmento}
                onChange={handleInputChange('segmento')}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Contato principal
              <input
                value={formState.contato}
                onChange={handleInputChange('contato')}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Status do contrato
              <select
                value={formState.status}
                onChange={handleInputChange('status')}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Fonte
              <select
                value={formState.fonte}
                onChange={handleInputChange('fonte')}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
              >
                <option value="Convencional">Convencional</option>
                <option value="Incentivada">Incentivada</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Modalidade
              <input
                value={formState.modalidade}
                onChange={handleInputChange('modalidade')}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Ciclo de faturamento
              <input
                type="month"
                value={formState.cicloFaturamento}
                onChange={handleInputChange('cicloFaturamento')}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Vigência e limites</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Início da vigência
              <input
                type="date"
                value={formState.inicioVigencia}
                onChange={handleInputChange('inicioVigencia')}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Fim da vigência
              <input
                type="date"
                value={formState.fimVigencia}
                onChange={handleInputChange('fimVigencia')}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Limite superior
              <input
                value={formState.limiteSuperior}
                onChange={handleInputChange('limiteSuperior')}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Limite inferior
              <input
                value={formState.limiteInferior}
                onChange={handleInputChange('limiteInferior')}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Flexibilidade
              <input
                value={formState.flex}
                onChange={handleInputChange('flex')}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Preço médio (R$/MWh)
              <input
                type="number"
                step="0.01"
                value={formState.precoMedio}
                onChange={handleInputChange('precoMedio')}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Preço spot de referência (R$/MWh)
              <input
                type="number"
                step="0.01"
                value={formState.precoSpotReferencia}
                onChange={handleInputChange('precoSpotReferencia')}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Dados adicionais</h2>
            <button
              type="button"
              onClick={handleAddDado}
              className="rounded-md border border-yn-orange px-3 py-1 text-sm font-medium text-yn-orange transition hover:bg-yn-orange hover:text-white"
            >
              Adicionar campo
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {formState.dadosContrato.map((campo, index) => (
              <div key={`${campo.label}-${index}`} className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <input
                    value={campo.label}
                    onChange={(event) => handleDadoChange(index, 'label', event.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveDado(index)}
                    className="text-xs font-medium text-red-500 hover:text-red-600"
                  >
                    Remover
                  </button>
                </div>
                <input
                  value={campo.value}
                  onChange={(event) => handleDadoChange(index, 'value', event.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
                  placeholder="Valor"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Resumo de conformidades</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(formState.resumoConformidades).map(([chave, valor]) => (
              <label key={chave} className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                {chave}
                <select
                  value={valor}
                  onChange={(event) => handleResumoChange(chave as keyof ContractMock['resumoConformidades'], event.target.value as StatusResumo)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
                >
                  {resumoStatusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Faturas do contrato</h2>
          <p className="mt-1 text-sm text-gray-500">Atualize status, datas de vencimento e valores das faturas vinculadas.</p>
          <div className="mt-4 overflow-auto">
            <table className="min-w-[720px] w-full table-auto text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Competência</th>
                  <th className="px-3 py-2 text-left">Vencimento</th>
                  <th className="px-3 py-2 text-left">Valor (R$)</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {formState.faturas.map((fatura, index) => (
                  <tr key={fatura.id} className="bg-white">
                    <td className="px-3 py-2">
                      <input
                        type="month"
                        value={fatura.competencia}
                        onChange={(event) => handleFaturaChange(index, 'competencia', event.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={fatura.vencimento}
                        onChange={(event) => handleFaturaChange(index, 'vencimento', event.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={fatura.valor}
                        onChange={(event) => handleFaturaChange(index, 'valor', event.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={fatura.status}
                        onChange={(event) => handleFaturaChange(index, 'status', event.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
                      >
                        {invoiceStatusOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            to={`/contratos/${contrato.id}`}
            className="inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-yn-orange hover:text-yn-orange"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-md bg-yn-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
