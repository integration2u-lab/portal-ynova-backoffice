export type Supplier = {
  id: string;
  nome: string;
  emails: string[]; // Lista de e-mails do fornecedor
  createdAt?: string;
  updatedAt?: string;
};

export type SupplierFormData = {
  nome: string;
  emails: string[];
};

