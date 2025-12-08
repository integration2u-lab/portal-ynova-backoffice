import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Building2, Mail } from 'lucide-react';
import { useSuppliers } from './SuppliersContext';
import CreateSupplierModal from './CreateSupplierModal';

const pageSize = 20;

export default function SuppliersPage() {
  const { suppliers, isLoading, error } = useSuppliers();
  const [paginaAtual, setPaginaAtual] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  const suppliersFiltrados = React.useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    // Garantir que suppliers é um array
    if (!Array.isArray(suppliers)) {
      return [];
    }

    return suppliers.filter((supplier) => {
      if (!normalizedSearch) return true;

      const nome = supplier.nome.toLowerCase();
      const emails = supplier.emails.join(' ').toLowerCase();

      return nome.includes(normalizedSearch) || emails.includes(normalizedSearch);
    });
  }, [suppliers, searchTerm]);

  React.useEffect(() => {
    setPaginaAtual(1);
  }, [searchTerm]);

  const totalPaginas = Math.max(1, Math.ceil(suppliersFiltrados.length / pageSize));
  const inicio = (paginaAtual - 1) * pageSize;
  const suppliersPaginados = suppliersFiltrados.slice(inicio, inicio + pageSize);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600 dark:text-gray-400">Carregando fornecedores...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        Erro ao carregar fornecedores: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <header className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Fornecedores</h1>
          <p className="mt-2 max-w-2xl text-sm font-bold text-gray-600 dark:text-white">
            Gerencie o cadastro de fornecedores e seus e-mails de contato.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_auto_auto] lg:items-end">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-white">Busca</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou e-mail..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm font-bold text-gray-900 placeholder-gray-400 focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-yn-orange px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-yn-orange/90 focus:outline-none focus:ring-2 focus:ring-yn-orange/20"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">Novo Fornecedor</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {suppliersFiltrados.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm font-bold text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-white">
                      Fornecedor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-white">
                      E-mails
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-white">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {suppliersPaginados.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="px-4 py-4">
                        <div className="font-bold text-gray-900 dark:text-white">{supplier.nome}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {supplier.emails.map((email, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                            >
                              <Mail size={12} />
                              {email}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          to={`/fornecedores/${supplier.id}`}
                          className="text-sm font-bold text-yn-orange hover:text-yn-orange/80"
                        >
                          Ver detalhes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPaginas > 1 && (
              <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Página {paginaAtual} de {totalPaginas}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                      disabled={paginaAtual === 1}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-bold text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                      disabled={paginaAtual === totalPaginas}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-bold text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {isCreateOpen && <CreateSupplierModal onClose={() => setIsCreateOpen(false)} />}
    </div>
  );
}

