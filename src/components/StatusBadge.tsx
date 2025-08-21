import React from 'react';

export default function StatusBadge({
  status,
  type,
}: {
  status: string;
  type: 'funil' | 'migracao';
}) {
  const getColor = () => {
    if (type === 'funil') {
      switch (status) {
        case 'verde':
          return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800';
        case 'amarelo':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800';
        case 'vermelho':
          return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-[#1E1E1E] dark:text-gray-200 dark:border-[#1E1E1E]';
      }
    } else {
      switch (status) {
        case 'aprovado':
          return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800';
        case 'em_analise':
          return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800';
        case 'pendente':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800';
        case 'rejeitado':
          return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-[#1E1E1E] dark:text-gray-200 dark:border-[#1E1E1E]';
      }
    }
  };

  const getLabel = () => {
    if (type === 'funil') {
      switch (status) {
        case 'verde':
          return 'Qualificado';
        case 'amarelo':
          return 'Em análise';
        case 'vermelho':
          return 'Frio';
        default:
          return status;
      }
    } else {
      switch (status) {
        case 'aprovado':
          return 'Aprovado';
        case 'em_analise':
          return 'Em análise';
        case 'pendente':
          return 'Pendente';
        case 'rejeitado':
          return 'Rejeitado';
        default:
          return status;
      }
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getColor()}`}>
      {getLabel()}
    </span>
  );
}
