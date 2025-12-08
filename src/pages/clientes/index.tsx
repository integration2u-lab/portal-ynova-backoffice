import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Building2, MapPin, Hash } from 'lucide-react';
import { useClients } from './ClientsContext';
import CreateClientModal from './CreateClientModal';
import { StatusBadge } from '../contratos/ContractDetail';

const pageSize = 20;

export default function ClientsPage() {
  const { clients, isLoading, error } = useClients();
  const [paginaAtual, setPaginaAtual] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  const clientsFiltrados = React.useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const numericSearch = normalizedSearch.replace(/\D/g, '');

    // Garantir que clients é um array
    if (!Array.isArray(clients)) {
      return [];
    }

    return clients.filter((client) => {
      if (!normalizedSearch) return true;

      const nome = client.nome.toLowerCase();
      const razaoSocial = client.razaoSocial.toLowerCase();
      const cnpjDigits = client.cnpj.replace(/\D/g, '');

      return (
        nome.includes(normalizedSearch) ||
        razaoSocial.includes(normalizedSearch) ||
        (!!numericSearch && cnpjDigits.includes(numericSearch))
      );
    });
  }, [clients, searchTerm]);

  React.useEffect(() => {
    setPaginaAtual(1);
  }, [searchTerm]);

  const totalPaginas = Math.max(1, Math.ceil(clientsFiltrados.length / pageSize));
  const inicio = (paginaAtual - 1) * pageSize;
  const clientsPaginados = clientsFiltrados.slice(inicio, inicio + pageSize);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600 dark:text-gray-400">Carregando clientes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        Erro ao carregar clientes: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <header className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Clientes</h1>
          <p className="mt-2 max-w-2xl text-sm font-bold text-gray-600 dark:text-white">
            Gerencie o cadastro de clientes, vincule unidades e grupos econômicos.
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
                    placeholder="Buscar por nome, razão social ou CNPJ..."
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
                <span className="hidden sm:inline">Novo Cliente</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {clientsFiltrados.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm font-bold text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-white">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-white">
                      CNPJ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-white">
                      Endereço
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-white">
                      Conformidade
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-white">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {clientsPaginados.map((client) => (
                    <tr
                      key={client.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white">{client.nome}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{client.razaoSocial}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Hash size={16} />
                          {client.cnpj}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {client.endereco ? (
                          <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                            <div>
                              {client.endereco.logradouro}, {client.endereco.numero}
                              <br />
                              {client.endereco.cidade} - {client.endereco.estado}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Não informado</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {client.resumoConformidades ? (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(client.resumoConformidades).map(([key, status]) => (
                              <StatusBadge key={key} status={status} />
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          to={`/clientes/${client.id}`}
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

      {isCreateOpen && <CreateClientModal onClose={() => setIsCreateOpen(false)} />}
    </div>
  );
}

