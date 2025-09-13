import React from 'react';
import { HelpCircle, Phone, Mail, Clock } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Central de Ajuda</h1>
      <div className="bg-white dark:bg-[#3E3E3E] rounded-lg p-6 shadow-sm border border-gray-200 dark:border-[#1E1E1E]">
        <div className="text-center py-12">
          <HelpCircle className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Central de Ajuda</h3>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Encontre respostas para suas dúvidas ou entre em contato conosco</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-yn-orange hover:bg-yn-orange/90 text-white px-6 py-3 rounded-lg font-medium w-full sm:w-auto">Abrir Ticket de Suporte</button>
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium">Acessar FAQ</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#3E3E3E] rounded-lg p-6 shadow-sm border border-gray-200 dark:border-[#1E1E1E]">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Contatos Úteis</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-gray-400" />
              <span className="text-sm">(11) 4000-0000</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-gray-400" />
              <span className="text-sm">suporte@ynova.com.br</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-gray-400" />
              <span className="text-sm">Seg-Sex: 8h às 18h</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#3E3E3E] rounded-lg p-6 shadow-sm border border-gray-200 dark:border-[#1E1E1E]">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Links Rápidos</h4>
          <div className="space-y-2">
            <a href="#" className="block text-sm text-blue-600 hover:text-blue-700">Manual do Usuário</a>
            <a href="#" className="block text-sm text-blue-600 hover:text-blue-700">Vídeos Tutoriais</a>
            <a href="#" className="block text-sm text-blue-600 hover:text-blue-700">Políticas e Termos</a>
            <a href="#" className="block text-sm text-blue-600 hover:text-blue-700">Atualizações do Sistema</a>
          </div>
        </div>
      </div>
    </div>
  );
}
