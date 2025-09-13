import React from 'react';
import { UserCheck, TrendingUp, DollarSign, FileText } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import { mockKpis } from '../data/mockData';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <select className="px-3 py-2 border border-gray-300 dark:border-[#1E1E1E] rounded-lg text-sm bg-white dark:bg-[#3E3E3E] dark:text-gray-100" aria-label="Período">
            <option>Último mês</option>
            <option>Último trimestre</option>
            <option>Último ano</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Leads Ativos" value={mockKpis.leads_ativos} icon={UserCheck} color="blue" />
        <KpiCard title="Taxa de Conversão" value={`${mockKpis.taxa_conversao}%`} icon={TrendingUp} color="green" />
        <KpiCard title="Receita Potencial" value={`R$ ${(mockKpis.receita_potencial / 1000000).toFixed(1)}M`} icon={DollarSign} color="orange" />
        <KpiCard title="Propostas em Negociação" value={mockKpis.propostas_em_negociacao} icon={FileText} color="purple" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#3E3E3E] rounded-lg p-6 shadow-sm border border-gray-200 dark:border-[#1E1E1E]">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Evolução Mensal</h3>
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">Gráfico de evolução (mock)</div>
        </div>
        <div className="bg-white dark:bg-[#3E3E3E] rounded-lg p-6 shadow-sm border border-gray-200 dark:border-[#1E1E1E]">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Distribuição por Segmento</h3>
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">Gráfico de pizza (mock)</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <button onClick={() => navigate('/leads')} className="bg-yn-orange hover:bg-yn-orange/90 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto">
          Ver Leads
        </button>
        <button onClick={() => navigate('/agenda')} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto">
          Agendar Apresentação
        </button>
        <button onClick={() => navigate('/commissions')} className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto">
          Ver Comissões
        </button>
        <button onClick={() => navigate('/leads')} className="bg-[#9333EA] hover:bg-[#9333EA]/90 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full md:w-auto">
          Enviar Fatura
        </button>
      </div>
    </div>
  );
}
