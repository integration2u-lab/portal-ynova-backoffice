import React, { useState } from 'react';

interface ModalUploadInvoiceProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalUploadInvoice({ isOpen, onClose }: ModalUploadInvoiceProps) {
  const [isDragging, setIsDragging] = useState(false);

  const simulateUpload = () => {
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      simulateUpload();
    }
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      simulateUpload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-[#3E3E3E] p-6 rounded-lg w-full max-w-md">
        <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Enviar Fatura</h2>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            isDragging
              ? 'border-yn-orange bg-yn-orange/10 dark:bg-yn-orange/20'
              : 'border-gray-300 dark:border-[#1E1E1E]'
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Arraste e solte o arquivo PDF/PNG/JPG aqui
          </p>
          <input
            id="invoice-upload"
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            className="hidden"
            onChange={handleSelect}
          />
          <label
            htmlFor="invoice-upload"
            className="inline-block px-4 py-2 bg-yn-orange hover:bg-yn-orange/90 text-white rounded-lg cursor-pointer"
          >
            Selecionar arquivo
          </label>
        </div>
        <button
          onClick={onClose}
          className="mt-4 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

