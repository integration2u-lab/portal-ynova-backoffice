import React from 'react';

export default function AgendaPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agenda</h1>
      <div className="bg-white dark:bg-[#3E3E3E] rounded-lg p-6 shadow-sm border border-gray-200 dark:border-[#1E1E1E]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Agendar Apresentação</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cliente</label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-[#1E1E1E] rounded-lg focus:ring-2 focus:ring-yn-orange bg-white dark:bg-[#3E3E3E] text-gray-900 dark:text-gray-100">
              <option>Selecionar cliente...</option>
              <option>Empresa Alpha Ltda</option>
              <option>Beta Comércio SA</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duração</label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-[#1E1E1E] rounded-lg focus:ring-2 focus:ring-yn-orange bg-white dark:bg-[#3E3E3E] text-gray-900 dark:text-gray-100">
              <option>30 minutos</option>
              <option>45 minutos</option>
              <option>60 minutos</option>
            </select>
          </div>
        </div>

        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Horários Sugeridos</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {['Hoje 14:00','Amanhã 09:00','Amanhã 15:00','19/01 10:00','19/01 16:00','20/01 09:30','20/01 14:00','21/01 11:00'].map((horario, i) => (
            <button key={i} className="p-3 border border-gray-300 dark:border-[#1E1E1E] rounded-lg text-sm hover:border-yn-orange hover:bg-yn-orange/10 transition-colors">
              {horario}
            </button>
          ))}
        </div>

        <button className="bg-yn-orange hover:bg-yn-orange/90 text-white px-6 py-2 rounded-lg font-medium w-full sm:w-auto">
          Confirmar Agendamento
        </button>
      </div>

      <div className="bg-white dark:bg-[#3E3E3E] rounded-lg p-6 shadow-sm border border-gray-200 dark:border-[#1E1E1E]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Próximos Compromissos</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-[#1E1E1E] rounded-lg">
            <div>
              <p className="font-medium">Apresentação - Empresa Alpha</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">18/01/2025 às 14:00</p>
            </div>
            <button className="text-yn-orange hover:text-yn-orange/80 text-sm">Reagendar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
