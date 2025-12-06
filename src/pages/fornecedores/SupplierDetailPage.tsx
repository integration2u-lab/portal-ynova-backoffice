import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Mail, Edit, Trash2 } from 'lucide-react';
import { useSuppliers } from './SuppliersContext';

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { suppliers, getSupplierById, deleteSupplierById } = useSuppliers();
  const [supplier, setSupplier] = React.useState<Awaited<ReturnType<typeof getSupplierById>>>(undefined);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (id) {
      setIsLoading(true);
      getSupplierById(id).then(setSupplier).finally(() => setIsLoading(false));
    }
  }, [id, getSupplierById]);

  const handleDelete = async () => {
    if (!id || !confirm('Tem certeza que deseja excluir este fornecedor?')) return;
    try {
      await deleteSupplierById(id);
      window.location.href = '/fornecedores';
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error);
      alert('Erro ao excluir fornecedor');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600 dark:text-gray-400">Carregando...</div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-8">
        <p className="text-gray-600 dark:text-gray-400">Fornecedor não encontrado</p>
        <Link to="/fornecedores" className="mt-4 text-yn-orange hover:text-yn-orange/80">
          Voltar para lista
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-4">
        <Link
          to="/fornecedores"
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{supplier.nome}</h1>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
          <Mail size={20} />
          E-mails de Contato
        </h2>
        <div className="space-y-2">
          {supplier.emails.map((email, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
            >
              <Mail size={16} className="text-gray-400" />
              <span className="text-sm font-bold text-gray-900 dark:text-white">{email}</span>
            </div>
          ))}
        </div>
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
          to={`/fornecedores/${supplier.id}/editar`}
          className="flex items-center gap-2 rounded-lg bg-yn-orange px-4 py-2 text-sm font-bold text-white hover:bg-yn-orange/90"
        >
          <Edit size={16} />
          Editar
        </Link>
      </div>
    </div>
  );
}

