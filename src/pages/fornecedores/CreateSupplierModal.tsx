import React from 'react';
import { X, Plus, Trash2, Mail } from 'lucide-react';
import { useSuppliers } from './SuppliersContext';
import type { SupplierFormData } from '../../types/suppliers';

interface CreateSupplierModalProps {
  onClose: () => void;
}

export default function CreateSupplierModal({ onClose }: CreateSupplierModalProps) {
  const { addSupplier } = useSuppliers();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof SupplierFormData, string>>>({});

  const [formData, setFormData] = React.useState<SupplierFormData>({
    nome: '',
    emails: [''],
  });

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...formData.emails];
    newEmails[index] = value;
    setFormData((prev) => ({ ...prev, emails: newEmails }));
  };

  const handleAddEmail = () => {
    setFormData((prev) => ({ ...prev, emails: [...prev.emails, ''] }));
  };

  const handleRemoveEmail = (index: number) => {
    if (formData.emails.length > 1) {
      const newEmails = formData.emails.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, emails: newEmails }));
    }
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Partial<Record<keyof SupplierFormData, string>> = {};
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    const validEmails = formData.emails.filter((email) => email.trim() !== '').map((email) => email.trim());
    if (validEmails.length === 0) {
      newErrors.emails = 'Pelo menos um e-mail é obrigatório';
    } else {
      const invalidEmails = validEmails.filter((email) => !validateEmail(email));
      if (invalidEmails.length > 0) {
        newErrors.emails = 'Um ou mais e-mails são inválidos';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await addSupplier({
        nome: formData.nome.trim(),
        emails: validEmails,
      });
      onClose();
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Erro ao criar fornecedor' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Novo Fornecedor</h2>
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
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-gray-700 dark:text-white">
                  E-mails <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddEmail}
                  className="flex items-center gap-1 text-xs font-bold text-yn-orange hover:text-yn-orange/80"
                >
                  <Plus size={14} />
                  Adicionar e-mail
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {formData.emails.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => handleEmailChange(index, e.target.value)}
                        placeholder="email@exemplo.com"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    {formData.emails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(index)}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {errors.emails && <p className="mt-1 text-xs text-red-500">{errors.emails}</p>}
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

