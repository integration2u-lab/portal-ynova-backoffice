import type { Supplier, SupplierFormData } from '../types/suppliers';
import { mockSuppliers } from '../mocks/suppliers';
import { getJson, postJson, putJson, deleteRequest } from '../lib/apiClient';

const API_BASE = '/api/suppliers';

export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const data = await getJson<Supplier[]>(API_BASE);
    // Garantir que sempre retornamos um array
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('API não disponível, usando dados mock:', error);
    return mockSuppliers;
  }
}

export async function getSupplier(id: string): Promise<Supplier> {
  try {
    const data = await getJson<Supplier>(`${API_BASE}/${id}`);
    return data;
  } catch (error) {
    console.warn('API não disponível, usando dados mock:', error);
    const supplier = mockSuppliers.find((s) => s.id === id);
    if (!supplier) throw new Error('Fornecedor não encontrado');
    return supplier;
  }
}

export async function createSupplier(supplierData: SupplierFormData): Promise<Supplier> {
  try {
    const data = await postJson<Supplier>(API_BASE, supplierData);
    return data;
  } catch (error) {
    console.warn('API não disponível, simulando criação:', error);
    const newSupplier: Supplier = {
      id: `SUP-${Date.now()}`,
      ...supplierData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockSuppliers.push(newSupplier);
    return newSupplier;
  }
}

export async function updateSupplier(id: string, supplierData: Partial<SupplierFormData>): Promise<Supplier> {
  try {
    const data = await putJson<Supplier>(`${API_BASE}/${id}`, supplierData);
    return data;
  } catch (error) {
    console.warn('API não disponível, simulando atualização:', error);
    const index = mockSuppliers.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Fornecedor não encontrado');
    mockSuppliers[index] = { ...mockSuppliers[index], ...supplierData, updatedAt: new Date().toISOString() };
    return mockSuppliers[index];
  }
}

export async function deleteSupplier(id: string): Promise<void> {
  try {
    await deleteRequest(`${API_BASE}/${id}`);
  } catch (error) {
    console.warn('API não disponível, simulando exclusão:', error);
    const index = mockSuppliers.findIndex((s) => s.id === id);
    if (index !== -1) {
      mockSuppliers.splice(index, 1);
    }
  }
}

