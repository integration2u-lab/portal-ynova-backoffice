import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Hash, Edit, Trash2 } from 'lucide-react';
import { useClients } from './ClientsContext';
import { StatusBadge } from '../contratos/ContractDetail';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { clients, getClientById, deleteClientById } = useClients();
  const [client, setClient] = React.useState<Awaited<ReturnType<typeof getClientById>>>(undefined);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (id) {
      setIsLoading(true);
      getClientById(id).then(setClient).finally(() => setIsLoading(false));
    }
  }, [id, getClientById]);

  const handleDelete = async () => {
    if (!id || !confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      await deleteClientById(id);
      window.location.href = '/clientes';
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      alert('Erro ao excluir cliente');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600 dark:text-gray-400">Carregando...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8">
        <p className="text-gray-600 dark:text-gray-400">Cliente não encontrado</p>
        <Link to="/clientes" className="mt-4 text-yn-orange hover:text-yn-orange/80">
          Voltar para lista
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-4">
        <Link
          to="/clientes"
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{client.nome}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{client.razaoSocial}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Informações Básicas</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-white">Nome</label>
              <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{client.nome}</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-white">Razão Social</label>
              <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{client.razaoSocial}</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-white">CNPJ</label>
              <div className="mt-1 flex items-center gap-2">
                <Hash size={16} className="text-gray-400" />
                <p className="text-sm font-bold text-gray-900 dark:text-white">{client.cnpj}</p>
              </div>
            </div>
            {client.medidor && (
              <div>
                <label className="text-xs font-bold uppercase text-gray-500 dark:text-white">Medidor</label>
                <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{client.medidor}</p>
              </div>
            )}
          </div>
        </div>

        {client.endereco && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <MapPin size={20} />
              Endereço
            </h2>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>
                {client.endereco.logradouro}, {client.endereco.numero}
                {client.endereco.complemento && ` - ${client.endereco.complemento}`}
              </p>
              <p>
                {client.endereco.bairro} - {client.endereco.cidade}/{client.endereco.estado}
              </p>
              <p>CEP: {client.endereco.cep}</p>
            </div>
          </div>
        )}

        {client.resumoConformidades && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Conformidade</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(client.resumoConformidades).map(([key, status]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{key}:</span>
                  <StatusBadge status={status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
        >
          <Trash2 size={16} />
          Excluir
        </button>
        <Link
          to={`/clientes/${client.id}/editar`}
          className="flex items-center gap-2 rounded-lg bg-yn-orange px-4 py-2 text-sm font-bold text-white hover:bg-yn-orange/90"
        >
          <Edit size={16} />
          Editar
        </Link>
      </div>
    </div>
  );
}

