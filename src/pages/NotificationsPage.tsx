import React from 'react';
import { cnText } from '../utils/cnText';

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <h1 className={`text-2xl font-bold ${cnText()}`}>Preferências de Notificação</h1>
      <div className="bg-white dark:bg-[#1a1f24] rounded-lg p-6 shadow-sm border border-gray-200 dark:border-[#2b3238]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Canais de Notificação</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">WhatsApp</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">Receba atualizações via WhatsApp</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yn-orange/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yn-orange"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">E-mail</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">Receba atualizações por e-mail</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yn-orange/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yn-orange"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1f24] rounded-lg p-6 shadow-sm border border-gray-200 dark:border-[#2b3238]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Tipos de Notificação</h3>
        <div className="space-y-4">
          {[{ label: 'Novos leads', desc: 'Quando um novo lead for atribuído' }, { label: 'Contratos fechados', desc: 'Quando um contrato for assinado' }, { label: 'Comissão paga', desc: 'Quando uma comissão for processada' }, { label: 'Lembretes de reunião', desc: 'Lembrete 15 minutos antes da reunião' }].map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">{item.label}</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yn-orange/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yn-orange"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1f24] rounded-lg p-6 shadow-sm border border-gray-200 dark:border-[#2b3238]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Horário de Silêncio</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Das</label>
            <input type="time" defaultValue="22:00" className="w-full px-3 py-2 border border-gray-300 dark:border-[#2b3238] rounded-lg focus:ring-2 focus:ring-orange-500 bg-white dark:bg-[#20262c] placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Até</label>
            <input type="time" defaultValue="08:00" className="w-full px-3 py-2 border border-gray-300 dark:border-[#2b3238] rounded-lg focus:ring-2 focus:ring-orange-500 bg-white dark:bg-[#20262c] placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="bg-yn-orange hover:bg-yn-orange/90 text-white px-6 py-2 rounded-lg font-medium w-full sm:w-auto">Salvar Preferências</button>
      </div>
    </div>
  );
}
