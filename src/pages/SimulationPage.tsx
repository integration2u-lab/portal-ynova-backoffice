import React, { ChangeEvent, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calculator,
  Check,
  Download,
  Edit2,
  FileText,
  Upload,
} from 'lucide-react';

type Etapa = 'upload' | 'dados' | 'simulacao' | 'proposta';

type DadosExtraidos = {
  nomeCliente: string;
  distribuidora: string;
  modalidade: 'verde' | 'azul';
  demandaContratada: string;
  consumoPonta: string;
  consumoForaPonta: string;
  geracaoPropria: string;
  horarioReservado: string;
  incentivo: boolean;
};

type HistoricoMes = {
  mes: string;
  consumo: string;
  demanda: string;
};

type FormData = DadosExtraidos & {
  historicoMeses: HistoricoMes[];
};

const initialHistoricoMeses: HistoricoMes[] = Array.from({ length: 12 }, () => ({
  mes: '',
  consumo: '',
  demanda: '',
}));

const initialFormData: FormData = {
  nomeCliente: '',
  distribuidora: '',
  modalidade: 'verde',
  demandaContratada: '',
  consumoPonta: '',
  consumoForaPonta: '',
  geracaoPropria: '',
  horarioReservado: '',
  incentivo: false,
  historicoMeses: initialHistoricoMeses,
};

export default function SimulationPage() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [dadosExtraidos, setDadosExtraidos] = useState<DadosExtraidos | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>('upload');
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const currentStepIndex = useMemo(() => {
    const order: Etapa[] = ['upload', 'dados', 'simulacao', 'proposta'];
    return order.indexOf(etapa);
  }, [etapa]);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setArquivo(file);

    // Simulação de extração automática
    setTimeout(() => {
      const dados: DadosExtraidos = {
        nomeCliente: 'Cliente Exemplo',
        distribuidora: 'CPFL',
        modalidade: 'verde',
        demandaContratada: '150',
        consumoPonta: '12500',
        consumoForaPonta: '45800',
        geracaoPropria: '5000',
        horarioReservado: '',
        incentivo: false,
      };

      setDadosExtraidos(dados);
      setFormData((prev) => ({
        ...prev,
        ...dados,
      }));
      setEtapa('dados');
    }, 1200);
  };

  const handleInputChange = <T extends keyof FormData>(campo: T, valor: FormData[T]) => {
    setFormData((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const calcularSimulacao = () => {
    setEtapa('simulacao');
  };

  const gerarProposta = () => {
    setEtapa('proposta');
  };

  const steps = useMemo(
    () => [
      { id: 'upload' as Etapa, label: 'Upload de Dados' },
      { id: 'dados' as Etapa, label: 'Validação' },
      { id: 'simulacao' as Etapa, label: 'Simulação' },
      { id: 'proposta' as Etapa, label: 'Proposta' },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Simulação de Propostas</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Envie a planilha de consumo, revise as informações e gere uma proposta personalizada.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-yn-orange/40 px-4 py-2 text-sm font-medium text-yn-orange transition-colors hover:bg-yn-orange/10"
        >
          <FileText size={18} />
          Ver planilha modelo
        </button>
      </div>

      <nav aria-label="Etapas da simulação" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
        <ol className="flex flex-col gap-4 md:flex-row md:items-center">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isActive = index === currentStepIndex;

            const circleClasses = isCompleted
              ? 'bg-yn-blue text-white'
              : isActive
              ? 'bg-yn-orange text-white'
              : 'bg-gray-200 text-gray-600 dark:bg-[#2b3238] dark:text-gray-300';

            const connectorClasses = isCompleted
              ? 'bg-yn-orange'
              : isActive
              ? 'bg-yn-orange/60'
              : 'bg-gray-200 dark:bg-[#2b3238]';

            return (
              <li key={step.id} className="flex flex-1 items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold transition-colors ${circleClasses}`}>
                  {isCompleted ? <Check size={22} /> : index + 1}
                </div>
                <div className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  {step.label}
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden flex-1 md:block">
                    <div className={`h-1 rounded-full ${connectorClasses}`} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {etapa === 'upload' && (
        <section className="rounded-xl border border-dashed border-yn-orange/40 bg-white p-10 text-center shadow-sm dark:border-yn-orange/30 dark:bg-[#1a1f24]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yn-orange/10 text-yn-orange">
            <Upload size={32} />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-gray-900 dark:text-gray-100">Carregue a planilha de consumo</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Arraste e solte o arquivo aqui ou clique no botão abaixo para escolher um arquivo com os últimos 12 meses.
          </p>
          <label className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-lg bg-yn-orange px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-yn-orange/90">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
            Selecionar arquivo
          </label>
          {arquivo && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <FileText size={16} />
              <span className="truncate font-medium">{arquivo.name}</span>
              <span className="text-yn-blue">Extraindo dados…</span>
            </div>
          )}
        </section>
      )}

      {etapa === 'dados' && (
        <section className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dados extraídos</h2>
              {dadosExtraidos && (
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  Revise as informações antes de seguir para a simulação.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setModoEdicao((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-lg border border-yn-orange/50 px-4 py-2 text-sm font-medium text-yn-orange transition-colors hover:bg-yn-orange/10"
            >
              {modoEdicao ? <Check size={18} /> : <Edit2 size={18} />}
              {modoEdicao ? 'Salvar alterações' : 'Editar dados'}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Nome do cliente *</label>
              <input
                type="text"
                value={formData.nomeCliente}
                onChange={(event) => handleInputChange('nomeCliente', event.target.value)}
                disabled={!modoEdicao}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition focus:border-yn-orange focus:outline-none focus:ring-1 focus:ring-yn-orange disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-[#2b3238] dark:bg-[#111418] dark:text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Distribuidora *</label>
              <select
                value={formData.distribuidora}
                onChange={(event) => handleInputChange('distribuidora', event.target.value)}
                disabled={!modoEdicao}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition focus:border-yn-orange focus:outline-none focus:ring-1 focus:ring-yn-orange disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-[#2b3238] dark:bg-[#111418] dark:text-gray-100"
              >
                <option value="">Selecione</option>
                <option value="CPFL">CPFL</option>
                <option value="CEMIG">CEMIG</option>
                <option value="ELEKTRO">ELEKTRO</option>
                <option value="ENEL">ENEL</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Modalidade tarifária *</label>
              <select
                value={formData.modalidade}
                onChange={(event) => handleInputChange('modalidade', event.target.value as FormData['modalidade'])}
                disabled={!modoEdicao}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition focus:border-yn-orange focus:outline-none focus:ring-1 focus:ring-yn-orange disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-[#2b3238] dark:bg-[#111418] dark:text-gray-100"
              >
                <option value="verde">Verde</option>
                <option value="azul">Azul</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Demanda contratada (kW) *</label>
              <input
                type="number"
                value={formData.demandaContratada}
                onChange={(event) => handleInputChange('demandaContratada', event.target.value)}
                disabled={!modoEdicao}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition focus:border-yn-orange focus:outline-none focus:ring-1 focus:ring-yn-orange disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-[#2b3238] dark:bg-[#111418] dark:text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Consumo ponta (kWh) *</label>
              <input
                type="number"
                value={formData.consumoPonta}
                onChange={(event) => handleInputChange('consumoPonta', event.target.value)}
                disabled={!modoEdicao}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition focus:border-yn-orange focus:outline-none focus:ring-1 focus:ring-yn-orange disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-[#2b3238] dark:bg-[#111418] dark:text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Consumo fora ponta (kWh) *</label>
              <input
                type="number"
                value={formData.consumoForaPonta}
                onChange={(event) => handleInputChange('consumoForaPonta', event.target.value)}
                disabled={!modoEdicao}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition focus:border-yn-orange focus:outline-none focus:ring-1 focus:ring-yn-orange disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-[#2b3238] dark:bg-[#111418] dark:text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Geração própria (kWh)</label>
              <input
                type="number"
                value={formData.geracaoPropria}
                onChange={(event) => handleInputChange('geracaoPropria', event.target.value)}
                disabled={!modoEdicao}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition focus:border-yn-orange focus:outline-none focus:ring-1 focus:ring-yn-orange disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-[#2b3238] dark:bg-[#111418] dark:text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Horário reservado (kWh)</label>
              <input
                type="number"
                value={formData.horarioReservado}
                onChange={(event) => handleInputChange('horarioReservado', event.target.value)}
                disabled={!modoEdicao}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition focus:border-yn-orange focus:outline-none focus:ring-1 focus:ring-yn-orange disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-[#2b3238] dark:bg-[#111418] dark:text-gray-100"
              />
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200">
            <AlertCircle size={18} />
            <p>Confirme os campos obrigatórios antes de avançar para a simulação.</p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setEtapa('upload')}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#2b3238] dark:text-gray-200 dark:hover:bg-[#111418]"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={calcularSimulacao}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-yn-orange px-5 py-2 text-sm font-semibold text-white transition hover:bg-yn-orange/90"
            >
              <Calculator size={18} />
              Calcular simulação
            </button>
          </div>
        </section>
      )}

      {etapa === 'simulacao' && (
        <section className="space-y-6">
          <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Resultados da simulação</h2>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-left dark:border-green-900/40 dark:bg-green-900/10">
                <p className="text-sm text-gray-600 dark:text-gray-300">Economia anual estimada</p>
                <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">R$ 142.850</p>
                <p className="mt-1 text-sm font-medium text-green-700 dark:text-green-300">23% de redução</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-left dark:border-blue-900/40 dark:bg-blue-900/10">
                <p className="text-sm text-gray-600 dark:text-gray-300">Custo atual médio</p>
                <p className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-300">R$ 621.520</p>
                <p className="mt-1 text-sm font-medium text-blue-700 dark:text-blue-200">Mercado cativo</p>
              </div>
              <div className="rounded-lg border border-yn-orange/40 bg-yn-orange/10 p-4 text-left">
                <p className="text-sm text-gray-600">Custo projetado no mercado livre</p>
                <p className="mt-1 text-3xl font-bold text-yn-orange">R$ 478.670</p>
                <p className="mt-1 text-sm font-medium text-yn-orange">Com migração</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-4 dark:border-[#2b3238]">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Impacto ambiental</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li>🌱 Redução de <strong>29 toneladas</strong> de CO₂
                  </li>
                  <li>🏞️ Equivalente a <strong>1,2 campos de futebol</strong> de floresta preservada
                  </li>
                </ul>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 dark:border-[#2b3238]">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Parâmetros do contrato</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li>🕛 Duração: <strong>5 anos</strong></li>
                  <li>📊 Desconto bandeira: <strong>Aplicado</strong></li>
                  <li>⚡ Zero Grid: <strong>Sim</strong> (geração própria)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setEtapa('dados')}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#2b3238] dark:text-gray-200 dark:hover:bg-[#111418]"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={gerarProposta}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-yn-orange px-5 py-2 text-sm font-semibold text-white transition hover:bg-yn-orange/90"
            >
              <FileText size={18} />
              Gerar proposta
            </button>
          </div>
        </section>
      )}

      {etapa === 'proposta' && (
        <section className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-[#2b3238] dark:bg-[#1a1f24]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 text-green-600">
            <Check size={40} />
          </div>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">Proposta gerada com sucesso!</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Faça o download da apresentação comercial ou exporte os dados para planilha.</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-yn-orange px-6 py-3 text-sm font-semibold text-white transition hover:bg-yn-orange/90"
            >
              <Download size={18} />
              Baixar proposta (PDF)
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-yn-orange/40 px-6 py-3 text-sm font-semibold text-yn-orange transition hover:bg-yn-orange/10"
            >
              <Download size={18} />
              Exportar dados (XLSX)
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setArquivo(null);
              setDadosExtraidos(null);
              setFormData(initialFormData);
              setEtapa('upload');
              setModoEdicao(false);
            }}
            className="mt-6 text-sm font-medium text-gray-600 underline transition hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
          >
            Iniciar nova simulação
          </button>
        </section>
      )}
    </div>
  );
}

