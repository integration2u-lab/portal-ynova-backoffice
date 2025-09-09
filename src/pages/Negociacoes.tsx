import { useState } from "react";
import { Search, Filter, Users, TrendingUp, Trophy } from "lucide-react";
import { ProgressoDeMetas } from "./ProgressoMetas";

export default function Negociacoes() {
  const [tab, setTab] = useState<"leads" | "comissoes" | "metas">("leads");

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      {/* Título */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 md:text-3xl">Negociações</h1>
        <p className="text-sm text-gray-500 md:text-base">
          Central de acompanhamento de leads, comissões e metas
        </p>
      </div>

      {/* Tabs */}
      <div className="rounded-xl bg-white shadow">
        <div className="overflow-x-auto border-b border-gray-200">
          <nav className="flex gap-4 px-4">
            <TabBtn
              icon={Users}
              label="Leads"
              active={tab === "leads"}
              onClick={() => setTab("leads")}
            />
            <TabBtn
              icon={TrendingUp}
              label="Comissões"
              active={tab === "comissoes"}
              onClick={() => setTab("comissoes")}
            />
            <TabBtn
              icon={Trophy}
              label="Progresso de Metas"
              active={tab === "metas"}
              onClick={() => setTab("metas")}
            />
          </nav>
        </div>

        <div className="p-4 md:p-6">
          {tab === "leads" && <LeadsSection />}
          {tab === "comissoes" && <ComissoesSection />}
          {tab === "metas" && <ProgressoDeMetas fechamentosAtuais={36} />}
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 border-b-2 px-2 py-3 text-sm font-semibold ${
        active
          ? "border-[#ff6b35] text-[#ff6b35]"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      <Icon size={18} />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function LeadsSection() {
  return (
    <div className="space-y-4">
      {/* Busca + filtro */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex-1 min-w-[260px] max-w-[480px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar leads..."
            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:border-[#ff6b35] focus:ring-2 focus:ring-[#ff6b35]/20"
          />
        </label>

        <button className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50">
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {/* CTA Enviar Fatura */}
      <button className="w-full rounded-lg bg-gradient-to-r from-[#ff6b35] to-[#f7931e] py-3 text-center text-white shadow-md transition hover:shadow-lg">
        Enviar Fatura
      </button>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="min-w-[900px] w-full bg-white text-sm">
          <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wide text-gray-500">
            <tr>
              <Th>Empresa</Th>
              <Th>CNPJ</Th>
              <Th>Segmento</Th>
              <Th>Status Funil</Th>
              <Th>Migração</Th>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <Td>
                <div className="font-semibold text-gray-900">Empresa Alpha Ltda</div>
                <div className="text-xs text-gray-500">João Silva</div>
              </Td>
              <Td>12.345.678/0001-90</Td>
              <Td>Industrial</Td>
              <Td>
                <Badge color="green">Qualificado</Badge>
              </Td>
              <Td>
                <Badge color="blue">Aprovado</Badge>
              </Td>
              <Td>
                <div className="flex gap-2">
                  <BtnLink color="brand">Abrir</BtnLink>
                  <BtnLink color="blue">Solicitar fatura</BtnLink>
                </div>
              </Td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComissoesSection() {
  return (
    <div className="space-y-4">
      {/* Busca + filtro */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex-1 min-w-[260px] max-w-[480px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar comissões..."
            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:border-[#ff6b35] focus:ring-2 focus:ring-[#ff6b35]/20"
          />
        </label>

        <button className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50">
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="min-w-[900px] w-full bg-white text-sm">
          <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wide text-gray-500">
            <tr>
              <Th>Cliente</Th>
              <Th>Valor</Th>
              <Th>Status</Th>
              <Th>Data</Th>
              <Th>Tipo</Th>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <Td>Empresa Alpha Ltda</Td>
              <Td>R$ 2.500,00</Td>
              <Td>
                <Badge color="green">Pago</Badge>
              </Td>
              <Td>10/02/2025</Td>
              <Td>Fechamento</Td>
              <Td>
                <div className="flex gap-2">
                  <BtnLink color="brand">Detalhes</BtnLink>
                </div>
              </Td>
            </tr>
            <tr>
              <Td>Beta Comércio SA</Td>
              <Td>R$ 1.800,00</Td>
              <Td>
                <Badge color="yellow">Pendente</Badge>
              </Td>
              <Td>05/02/2025</Td>
              <Td>Recorrência</Td>
              <Td>
                <div className="flex gap-2">
                  <BtnLink color="brand">Detalhes</BtnLink>
                </div>
              </Td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-3 text-left">{children}</th>
);

const Td = ({ children }: { children: React.ReactNode }) => (
  <td className="px-4 py-3 align-middle text-gray-700">{children}</td>
);

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "green" | "blue" | "yellow";
}) {
  const map = {
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    yellow: "bg-amber-100 text-amber-700",
  } as const;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${map[color]}`}>
      {children}
    </span>
  );
}

function BtnLink({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "brand" | "blue";
}) {
  const map = {
    brand: "border-[#ffd0bf] text-[#ff6b35] hover:bg-[#fff0ea]",
    blue: "border-blue-200 text-blue-600 hover:bg-blue-50",
  } as const;
  return (
    <button className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${map[color]}`}>
      {children}
    </button>
  );
}

