import React from 'react';
import { X, Search } from 'lucide-react';
import { useClients } from './ClientsContext';
import type { ClientFormData } from '../../types/clients';
import { consultarCNPJReceita } from '../../services/clients';

interface CreateClientModalProps {
  onClose: () => void;
}

const sanitizeCnpj = (value: string) => value.replace(/\D/g, '').slice(0, 14);

const formatCnpj = (value: string) => {
  const digits = sanitizeCnpj(value);
  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 5);
  const part3 = digits.slice(5, 8);
  const part4 = digits.slice(8, 12);
  const part5 = digits.slice(12, 14);
  const segments = [part1, part2 ? `.${part2}` : '', part3 ? `.${part3}` : '', part4 ? `/${part4}` : '', part5 ? `-${part5}` : ''];
  return segments.join('');
};

export default function CreateClientModal({ onClose }: CreateClientModalProps) {
  const { addClient } = useClients();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isConsultingCNPJ, setIsConsultingCNPJ] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof ClientFormData, string>>>({});

  const [formData, setFormData] = React.useState<ClientFormData>({
    nome: '',
    razaoSocial: '',
    cnpj: '',
    medidor: '',
  });

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpj(e.target.value);
    setFormData((prev) => ({ ...prev, cnpj: formatted }));
  };

  const handleConsultarCNPJ = React.useCallback(async () => {
    const cnpjLimpo = sanitizeCnpj(formData.cnpj);
    if (cnpjLimpo.length !== 14) {
      setErrors((prev) => ({ ...prev, cnpj: 'CNPJ deve ter 14 dígitos' }));
      return;
    }

    setIsConsultingCNPJ(true);
    setErrors((prev) => ({ ...prev, cnpj: undefined }));
    try {
      const dadosReceita = await consultarCNPJReceita(formData.cnpj);
      if (dadosReceita) {
        setFormData((prev) => ({
          ...prev,
          razaoSocial: dadosReceita.razaoSocial,
          endereco: {
            logradouro: dadosReceita.endereco.logradouro,
            numero: dadosReceita.endereco.numero,
            complemento: dadosReceita.endereco.complemento || '',
            bairro: dadosReceita.endereco.bairro,
            cidade: dadosReceita.endereco.cidade,
            estado: dadosReceita.endereco.estado,
            cep: dadosReceita.endereco.cep,
          },
        }));
      }
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      setErrors((prev) => ({ ...prev, cnpj: 'Erro ao consultar CNPJ na Receita Federal' }));
    } finally {
      setIsConsultingCNPJ(false);
    }
  }, [formData.cnpj]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Partial<Record<keyof ClientFormData, string>> = {};
    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.razaoSocial.trim()) newErrors.razaoSocial = 'Razão Social é obrigatória';
    if (sanitizeCnpj(formData.cnpj).length !== 14) newErrors.cnpj = 'CNPJ inválido';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await addClient(formData);
      onClose();
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Erro ao criar cliente' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Novo Cliente</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-white">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                required
              />
              {errors.nome && <p className="mt-1 text-xs text-red-500">{errors.nome}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-white">
                CNPJ <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={handleCNPJChange}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                />
                <button
                  type="button"
                  onClick={handleConsultarCNPJ}
                  disabled={isConsultingCNPJ || sanitizeCnpj(formData.cnpj).length !== 14}
                  className="flex items-center gap-2 rounded-lg bg-yn-orange px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  <Search size={16} />
                  {isConsultingCNPJ ? 'Consultando...' : 'Consultar Receita'}
                </button>
              </div>
              {errors.cnpj && <p className="mt-1 text-xs text-red-500">{errors.cnpj}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-white">
                Razão Social <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.razaoSocial}
                onChange={(e) => setFormData((prev) => ({ ...prev, razaoSocial: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                required
              />
              {errors.razaoSocial && <p className="mt-1 text-xs text-red-500">{errors.razaoSocial}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-white">Medidor</label>
              <input
                type="text"
                value={formData.medidor || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, medidor: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-white">Logradouro</label>
                <input
                  type="text"
                  value={formData.endereco?.logradouro || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endereco: { ...(prev.endereco || { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' }), logradouro: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-white">Número</label>
                <input
                  type="text"
                  value={formData.endereco?.numero || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endereco: { ...(prev.endereco || { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' }), numero: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-white">Complemento</label>
              <input
                type="text"
                value={formData.endereco?.complemento || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    endereco: { ...(prev.endereco || { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' }), complemento: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-white">Bairro</label>
                <input
                  type="text"
                  value={formData.endereco?.bairro || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endereco: { ...(prev.endereco || { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' }), bairro: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-white">Cidade</label>
                <input
                  type="text"
                  value={formData.endereco?.cidade || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endereco: { ...(prev.endereco || { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' }), cidade: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-white">Estado</label>
                <input
                  type="text"
                  value={formData.endereco?.estado || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endereco: { ...(prev.endereco || { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' }), estado: e.target.value },
                    }))
                  }
                  maxLength={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-white">CEP</label>
              <input
                type="text"
                value={formData.endereco?.cep || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    endereco: { ...(prev.endereco || { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' }), cep: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-yn-orange px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

