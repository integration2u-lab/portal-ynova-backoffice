import type { StatusResumo } from '../mocks/contracts';

export type Client = {
  id: string;
  nome: string;
  razaoSocial: string;
  cnpj: string;
  endereco?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  medidor?: string;
  grupoEconomicoId?: string; // ID do grupo econômico
  grupoEconomicoNome?: string; // Nome do grupo econômico
  filiais?: string[]; // IDs de filiais do mesmo CNPJ raiz
  cnpjRaiz?: string; // CNPJ raiz para vincular filiais
  createdAt?: string;
  updatedAt?: string;
  // Condições mensais de conformidade (movidas de Contrato)
  resumoConformidades?: Record<'Consumo' | 'NF' | 'Fatura' | 'Encargos' | 'Conformidade', StatusResumo>;
  // Dados da Receita Federal (preenchidos automaticamente)
  dadosReceita?: {
    razaoSocial: string;
    nomeFantasia?: string;
    situacao: string;
    dataAbertura: string;
    naturezaJuridica: string;
    endereco: {
      logradouro: string;
      numero: string;
      complemento?: string;
      bairro: string;
      cidade: string;
      estado: string;
      cep: string;
    };
  };
};

export type ClientFormData = {
  nome: string;
  razaoSocial: string;
  cnpj: string;
  endereco?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  medidor?: string;
  grupoEconomicoId?: string;
  filiais?: string[];
};

