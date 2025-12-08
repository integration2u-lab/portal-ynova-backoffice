import type { Client } from '../types/clients';

export const mockClients: Client[] = [
  {
    id: 'CLI-001',
    nome: 'UniSolar Energia',
    razaoSocial: 'UniSolar Energia Ltda',
    cnpj: '12.345.678/0001-90',
    endereco: {
      logradouro: 'Av. Paulista',
      numero: '1000',
      complemento: 'Sala 100',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01310-100',
    },
    medidor: 'MED-001',
    grupoEconomicoId: 'GRP-001',
    grupoEconomicoNome: 'Grupo UniSolar',
    resumoConformidades: {
      Consumo: 'Conforme',
      NF: 'Em análise',
      Fatura: 'Conforme',
      Encargos: 'Conforme',
      Conformidade: 'Em análise',
    },
  },
  {
    id: 'CLI-002',
    nome: 'Brasil Foods',
    razaoSocial: 'Brasil Foods LTDA',
    cnpj: '98.765.432/0001-10',
    endereco: {
      logradouro: 'Rua das Flores',
      numero: '500',
      bairro: 'Centro',
      cidade: 'Rio de Janeiro',
      estado: 'RJ',
      cep: '20040-020',
    },
    resumoConformidades: {
      Consumo: 'Conforme',
      NF: 'Conforme',
      Fatura: 'Conforme',
      Encargos: 'Conforme',
      Conformidade: 'Conforme',
    },
  },
];

