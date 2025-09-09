import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Bell, Search, Filter } from 'lucide-react';

// Tipos locais para os mocks
export type Lead = {
  id: number;
  empresa: string;
  responsavel: string;
  cnpj: string;
  segmento: string;
  statusFunil: 'Qualificado' | 'Em análise' | 'Novo';
  migracao: 'Aprovado' | 'Em análise' | 'Pendente';
};

export type Comissao = {
  id: number;
  cliente: string;
  valor: string;
  status: 'Pago' | 'Pendente';
  data: string;
  tipo: 'Fechamento' | 'Recorrência';
};

// Dados mockados
const leads: Lead[] = [
  {
    id: 1,
    empresa: 'Empresa Alpha Ltda',
    responsavel: 'João Silva',
    cnpj: '12.345.678/0001-90',
    segmento: 'Industrial',
    statusFunil: 'Qualificado',
    migracao: 'Aprovado',
  },
  {
    id: 2,
    empresa: 'Beta Comércio SA',
    responsavel: 'Maria Santos',
    cnpj: '98.765.432/0001-10',
    segmento: 'Comercial',
    statusFunil: 'Em análise',
    migracao: 'Em análise',
  },
];

const comissoes: Comissao[] = [
  {
    id: 1,
    cliente: 'Empresa Alpha Ltda',
    valor: 'R$ 2.500,00',
    status: 'Pago',
    data: '10/02/2025',
    tipo: 'Fechamento',
  },
  {
    id: 2,
    cliente: 'Beta Comércio SA',
    valor: 'R$ 1.800,00',
    status: 'Pendente',
    data: '05/02/2025',
    tipo: 'Recorrência',
  },
];

const metas = [
  { id: 1, titulo: 'Camarote Brahma', total: 8, progresso: 8 },
  { id: 2, titulo: 'Viagem para Argentina', total: 15, progresso: 15 },
];

const tabs = [
  { id: 'leads', label: 'Leads' },
  { id: 'comissoes', label: 'Comissões' },
  { id: 'metas', label: 'Progresso de Metas' },
] as const;

const NegociacoesHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]['id']>('leads');
  const [searchLead, setSearchLead] = useState('');
  const [searchComissao, setSearchComissao] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredLeads = leads.filter(
    (l) =>
      l.empresa.toLowerCase().includes(searchLead.toLowerCase()) ||
      l.cnpj.includes(searchLead)
  );

  const filteredComissoes = comissoes.filter((c) =>
    c.cliente.toLowerCase().includes(searchComissao.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 h-16 bg-gradient-to-r from-[#FE5200] to-[#FF7A33] text-white shadow px-4 flex items-center justify-between">
        <div className="font-bold text-lg">YNOVA</div>
        <div className="flex items-center gap-4">
          <button
            aria-label="Notificações"
            className="p-2 rounded-md hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <Bell size={20} />
          </button>
          <div
            className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-medium"
            aria-hidden
          >
            JC
          </div>
          <button
            className="md:hidden p-2 rounded-md hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="hidden md:block w-64 border-r bg-white">
          <nav className="p-4 space-y-1">
            <Link
              to="/dashboard"
              className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Dashboard
            </Link>
            <span className="block px-3 py-2 rounded-lg text-sm bg-[#FE5200]/10 text-[#FE5200] border border-[#FE5200]/20">
              Negociações
            </span>
            <Link
              to="/training"
              className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Treinamento para Consultor
            </Link>
            <Link
              to="/help"
              className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Ajuda
            </Link>
          </nav>
        </aside>

        {/* Sidebar mobile */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            ></div>
            <div className="absolute inset-y-0 left-0 w-3/4 max-w-xs bg-white p-4 space-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className="font-bold text-lg text-[#FE5200]">YNOVA</div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Fechar menu"
                >
                  <X size={24} />
                </button>
              </div>
              <Link
                to="/dashboard"
                onClick={() => setSidebarOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Dashboard
              </Link>
              <span className="block px-3 py-2 rounded-lg text-sm bg-[#FE5200]/10 text-[#FE5200] border border-[#FE5200]/20">
                Negociações
              </span>
              <Link
                to="/training"
                onClick={() => setSidebarOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Treinamento para Consultor
              </Link>
              <Link
                to="/help"
                onClick={() => setSidebarOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Ajuda
              </Link>
            </div>
          </div>
        )}

        <main className="flex-1 md:ml-64">
          <div className="max-w-screen-lg mx-auto p-4 space-y-4">
            <div>
              <h1 className="text-2xl font-bold">Negociações</h1>
              <p className="text-sm text-gray-600">
                Central de acompanhamento de leads, comissões e metas
              </p>
            </div>

            {/* Tabs */}
            <div className="overflow-x-auto">
              <div className="flex border-b gap-4 whitespace-nowrap">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 -mb-px border-b-2 focus:outline-none ${
                      activeTab === tab.id
                        ? 'border-[#FE5200] text-[#FE5200]'
                        : 'border-transparent text-gray-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conteúdo Leads */}
            {activeTab === 'leads' && (
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search
                      size={20}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Buscar leads..."
                      value={searchLead}
                      onChange={(e) => setSearchLead(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FE5200] focus:border-transparent"
                    />
                  </div>
                  <button
                    className="p-2 border border-gray-300 rounded-lg w-full sm:w-auto"
                    aria-label="Filtros"
                  >
                    <Filter size={20} />
                  </button>
                </div>

                <button className="bg-[#FE5200] hover:bg-[#FE5200]/90 text-white px-4 py-2 rounded-lg w-full sm:w-auto">
                  Enviar Fatura
                </button>

                <div
                  className="overflow-x-auto -mx-4 sm:mx-0"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <table className="min-w-[900px] w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Empresa
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          CNPJ
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Segmento
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Status Funil
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Migração
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className="border-t">
                          <td className="px-4 py-3">
                            <div className="font-medium">{lead.empresa}</div>
                            <div className="text-sm text-gray-500">
                              {lead.responsavel}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">{lead.cnpj}</td>
                          <td className="px-4 py-3 text-sm">{lead.segmento}</td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                lead.statusFunil === 'Qualificado'
                                  ? 'bg-green-100 text-green-800'
                                  : lead.statusFunil === 'Em análise'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {lead.statusFunil}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                lead.migracao === 'Aprovado'
                                  ? 'bg-green-100 text-green-800'
                                  : lead.migracao === 'Em análise'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {lead.migracao}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button className="text-[#FE5200] hover:underline">
                              Abrir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Conteúdo Comissões */}
            {activeTab === 'comissoes' && (
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search
                      size={20}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Buscar comissões..."
                      value={searchComissao}
                      onChange={(e) => setSearchComissao(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FE5200] focus:border-transparent"
                    />
                  </div>
                </div>

                <div
                  className="overflow-x-auto -mx-4 sm:mx-0"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <table className="min-w-[820px] w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Cliente
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Valor
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Data
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Tipo
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredComissoes.map((c) => (
                        <tr key={c.id} className="border-t">
                          <td className="px-4 py-3 text-sm">{c.cliente}</td>
                          <td className="px-4 py-3 text-sm">{c.valor}</td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                c.status === 'Pago'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{c.data}</td>
                          <td className="px-4 py-3 text-sm">{c.tipo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-gradient-to-r from-[#FE5200] to-[#FF7A33] text-white p-4 rounded-lg">
                  <h3 className="font-medium">Resumo de Comissões</h3>
                  <p className="text-2xl font-bold mt-2">R$ 4.300,00</p>
                </div>
              </section>
            )}

            {/* Conteúdo Progresso de Metas */}
            {activeTab === 'metas' && (
              <section className="space-y-4">
                <div className="bg-gradient-to-r from-[#FE5200] to-[#FF7A33] text-white p-6 rounded-lg">
                  <h3 className="text-lg font-semibold">Suas Metas de Premiação</h3>
                  <p className="text-sm mt-1">
                    Acompanhe seu progresso e conquiste prêmios.
                  </p>
                  <div className="mt-4 text-4xl font-bold">36</div>
                  <p className="text-sm">Fechamentos Realizados</p>
                </div>

                {metas.map((meta) => (
                  <div
                    key={meta.id}
                    className="bg-white rounded-lg border p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{meta.titulo}</h4>
                        <p className="text-sm text-gray-600">
                          {meta.total} fechamentos necessários
                        </p>
                      </div>
                      {meta.progresso === meta.total && (
                        <span className="text-xs bg-[#FE5200]/10 text-[#FE5200] px-2 py-1 rounded-full">
                          Conquistado! 🎉
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#FE5200] h-2 rounded-full"
                        style={{ width: `${(meta.progresso / meta.total) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-right text-sm font-medium mt-1">
                      {((meta.progresso / meta.total) * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default NegociacoesHub;

