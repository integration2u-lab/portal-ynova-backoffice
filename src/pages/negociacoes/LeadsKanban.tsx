import { useState, useMemo } from "react";
import { User, Building2, Calendar, Phone, Mail } from "lucide-react";

interface Lead {
  id: number;
  empresa: string;
  contato: string;
  cnpj: string;
  segmento: string;
  telefone: string;
  email: string;
  valorPotencial: number;
  dataContato: string;
  origem: string;
  status: "novo" | "qualificado" | "proposta" | "negociacao" | "fechado";
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function LeadsKanban() {
  const [leads] = useState<Lead[]>([
    {
      id: 1,
      empresa: "Empresa Alpha Ltda",
      contato: "João Silva",
      cnpj: "12.345.678/0001-90",
      segmento: "Industrial",
      telefone: "(11) 9999-8888",
      email: "joao@alpha.com.br",
      valorPotencial: 150000,
      dataContato: "2024-09-10",
      origem: "Site",
      status: "novo",
    },
    {
      id: 2,
      empresa: "Beta Solutions",
      contato: "Maria Santos",
      cnpj: "98.765.432/0001-10",
      segmento: "Tecnologia",
      telefone: "(11) 8888-7777",
      email: "maria@beta.com.br",
      valorPotencial: 85000,
      dataContato: "2024-09-08",
      origem: "LinkedIn",
      status: "qualificado",
    },
    {
      id: 3,
      empresa: "Gamma Industries",
      contato: "Carlos Oliveira",
      cnpj: "11.222.333/0001-44",
      segmento: "Industrial",
      telefone: "(11) 7777-6666",
      email: "carlos@gamma.com.br",
      valorPotencial: 220000,
      dataContato: "2024-09-05",
      origem: "Indicação",
      status: "proposta",
    },
    {
      id: 4,
      empresa: "Delta Corp",
      contato: "Ana Costa",
      cnpj: "55.666.777/0001-88",
      segmento: "Varejo",
      telefone: "(11) 6666-5555",
      email: "ana@delta.com.br",
      valorPotencial: 45000,
      dataContato: "2024-09-12",
      origem: "Google Ads",
      status: "novo",
    },
    {
      id: 5,
      empresa: "Epsilon Energy",
      contato: "Pedro Lima",
      cnpj: "33.444.555/0001-22",
      segmento: "Energia",
      telefone: "(11) 5555-4444",
      email: "pedro@epsilon.com.br",
      valorPotencial: 300000,
      dataContato: "2024-09-07",
      origem: "Evento",
      status: "negociacao",
    },
  ]);

  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const totalPipeline = leads.reduce((sum, l) => sum + l.valorPotencial, 0);
    const ticketMedio = totalLeads ? totalPipeline / totalLeads : 0;
    return { totalLeads, totalPipeline, ticketMedio };
  }, [leads]);

  const columns = [
    {
      key: "novo" as const,
      title: "Novos Leads",
      header: "bg-gray-700",
      body: "bg-gray-100",
    },
    {
      key: "qualificado" as const,
      title: "Qualificados",
      header: "bg-blue-600",
      body: "bg-blue-50",
    },
    {
      key: "proposta" as const,
      title: "Proposta Enviada",
      header: "bg-yellow-600",
      body: "bg-yellow-50",
    },
    {
      key: "negociacao" as const,
      title: "Em Negociação",
      header: "bg-orange-600",
      body: "bg-orange-50",
    },
    {
      key: "fechado" as const,
      title: "Fechado",
      header: "bg-green-600",
      body: "bg-green-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics + CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric title="Total de Leads" value={metrics.totalLeads} />
          <Metric
            title="Valor do Pipeline"
            value={formatCurrency(metrics.totalPipeline)}
          />
          <Metric
            title="Ticket Médio"
            value={formatCurrency(metrics.ticketMedio)}
          />
          <Metric title="Taxa de Conversão" value="25%" />
        </div>
        <button
          onClick={() => {}}
          className="whitespace-nowrap rounded-lg bg-[#FE5200] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#FE5200]/90"
        >
          Enviar Fatura
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const items = leads.filter((l) => l.status === col.key);
          const sum = items.reduce((acc, l) => acc + l.valorPotencial, 0);
          return (
            <div
              key={col.key}
              className="flex w-80 shrink-0 flex-col rounded-lg"
            >
              <div
                className={`${col.header} rounded-t-lg px-4 py-2 text-white`}
              >
                <div className="text-sm font-semibold">{col.title}</div>
                <div className="text-xs">
                  {items.length} {items.length === 1 ? "lead" : "leads"} • {""}
                  {formatCurrency(sum)}
                </div>
              </div>
              <div className={`${col.body} flex flex-1 flex-col gap-3 p-3`}>
                {items.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
                <button
                  onClick={() => {}}
                  className="w-full rounded-md border-2 border-dashed border-gray-300 py-2 text-sm text-gray-600 hover:bg-white"
                >
                  Adicionar lead
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-white px-4 py-2 shadow-sm">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <div className="space-y-2 rounded-md bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="font-semibold text-gray-900">{lead.empresa}</div>
      <div className="flex items-center gap-1 text-sm text-gray-600">
        <User size={14} className="text-gray-400" />
        {lead.contato}
      </div>
      <div className="flex items-center gap-1 text-sm text-gray-600">
        <Building2 size={14} className="text-gray-400" />
        {lead.cnpj}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-gray-200 px-2 py-1 text-gray-700">
          {lead.segmento}
        </span>
        <span className="rounded bg-gray-200 px-2 py-1 text-gray-700">
          {lead.origem}
        </span>
      </div>
      <div className="text-sm font-semibold text-green-600">
        {formatCurrency(lead.valorPotencial)}
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Calendar size={14} className="text-gray-400" />
        {new Date(lead.dataContato).toLocaleDateString("pt-BR")}
      </div>
      <div className="flex gap-2 pt-1">
        <a
          href={`tel:${lead.telefone}`}
          className="text-gray-600 transition-colors hover:text-gray-800"
        >
          <Phone size={16} />
        </a>
        <a
          href={`mailto:${lead.email}`}
          className="text-gray-600 transition-colors hover:text-gray-800"
        >
          <Mail size={16} />
        </a>
      </div>
    </div>
  );
}

