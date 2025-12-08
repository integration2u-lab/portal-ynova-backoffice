import type { Client, ClientFormData } from '../types/clients';
import { mockClients } from '../mocks/clients';
import { getJson, postJson, putJson, deleteRequest } from '../lib/apiClient';

const API_BASE = '/api/clients';

// Função para consultar CNPJ na Receita Federal (mock por enquanto)
export async function consultarCNPJReceita(cnpj: string): Promise<Client['dadosReceita']> {
  // Remove formatação do CNPJ
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  
  // Em produção, isso faria uma chamada real à API da Receita
  // Por enquanto, retornamos um mock baseado no CNPJ
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        razaoSocial: 'Empresa Exemplo Ltda',
        nomeFantasia: 'Empresa Exemplo',
        situacao: 'ATIVA',
        dataAbertura: '2010-01-15',
        naturezaJuridica: '2062 - Sociedade Empresária Limitada',
        endereco: {
          logradouro: 'Rua Exemplo',
          numero: '123',
          complemento: 'Sala 1',
          bairro: 'Centro',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '01000-000',
        },
      });
    }, 1000);
  });
}

export async function getClients(): Promise<Client[]> {
  try {
    const data = await getJson<Client[]>(API_BASE);
    // Garantir que sempre retornamos um array
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('API não disponível, usando dados mock:', error);
    return mockClients;
  }
}

export async function getClient(id: string): Promise<Client> {
  try {
    const data = await getJson<Client>(`${API_BASE}/${id}`);
    return data;
  } catch (error) {
    console.warn('API não disponível, usando dados mock:', error);
    const client = mockClients.find((c) => c.id === id);
    if (!client) throw new Error('Cliente não encontrado');
    return client;
  }
}

export async function createClient(clientData: ClientFormData): Promise<Client> {
  try {
    const data = await postJson<Client>(API_BASE, clientData);
    return data;
  } catch (error) {
    console.warn('API não disponível, simulando criação:', error);
    const newClient: Client = {
      id: `CLI-${Date.now()}`,
      ...clientData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockClients.push(newClient);
    return newClient;
  }
}

export async function updateClient(id: string, clientData: Partial<ClientFormData>): Promise<Client> {
  try {
    const data = await putJson<Client>(`${API_BASE}/${id}`, clientData);
    return data;
  } catch (error) {
    console.warn('API não disponível, simulando atualização:', error);
    const index = mockClients.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Cliente não encontrado');
    mockClients[index] = { ...mockClients[index], ...clientData, updatedAt: new Date().toISOString() };
    return mockClients[index];
  }
}

export async function deleteClient(id: string): Promise<void> {
  try {
    await deleteRequest(`${API_BASE}/${id}`);
  } catch (error) {
    console.warn('API não disponível, simulando exclusão:', error);
    const index = mockClients.findIndex((c) => c.id === id);
    if (index !== -1) {
      mockClients.splice(index, 1);
    }
  }
}

