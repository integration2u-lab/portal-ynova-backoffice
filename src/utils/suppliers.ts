// Lista de fornecedores fixos com seus emails
export type Supplier = {
  name: string;
  emails: string[];
};

export const SUPPLIERS: Supplier[] = [
  {
    name: 'Boven',
    emails: ['bovenvarejista@bovenvarejista.com.br', 'back@boven.com.br'],
  },
  {
    name: 'Serena',
    emails: ['relacionamento.acl@srna.com', 'backoffice@srna.com'],
  },
  {
    name: 'Bolt',
    emails: ['posvenda@boltenergy.com.br'],
  },
  {
    name: 'Matrix',
    emails: ['atendimento@matrixenergia.com'],
  },
  {
    name: 'Voltta',
    emails: ['gestao@voltta.com.br', 'migracao@voltta.com.br'],
  },
  {
    name: 'Newave',
    emails: ['atendimento@newaveenergia.com'],
  },
  {
    name: 'Auren',
    emails: ['cliente@aurenenergia.com.br', 'posvenda@aurenenergia.com.br'],
  },
];

export const SUPPLIER_NAMES = SUPPLIERS.map((s) => s.name);

export function getSupplierEmails(supplierName: string): string[] {
  const supplier = SUPPLIERS.find((s) => s.name.toLowerCase() === supplierName.toLowerCase());
  return supplier?.emails ?? [];
}

