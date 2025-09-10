import React from "react";

// helpers: pseudônimo estável a partir do id
const pseudoFromId = (id: string) => {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const hex = Math.abs(h).toString(16).toUpperCase().padStart(4, "0");
  return `CONS-${hex}`;
};

const Medal: React.FC<{ pos: number }> = ({ pos }) => {
  const map: Record<number, { bg: string; fg: string; label: string }> = {
    1: { bg: "#FDE68A", fg: "#92400E", label: "🥇" },
    2: { bg: "#E5E7EB", fg: "#374151", label: "🥈" },
    3: { bg: "#FECACA", fg: "#7F1D1D", label: "🥉" },
  };
  const m = map[pos];
  if (!m) return null;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[12px] font-bold"
      style={{ background: m.bg, color: m.fg }}
    >
      {m.label}
    </span>
  );
};

const RankingPage: React.FC = () => {
  // TODO: substituir por dados reais (API)
  const currentUserId = "u12";
  const data = [
    { id: "u01", contratos: 58 },
    { id: "u02", contratos: 52 },
    { id: "u03", contratos: 49 },
    { id: "u04", contratos: 44 },
    { id: "u05", contratos: 40 },
    { id: "u06", contratos: 39 },
    { id: "u07", contratos: 36 },
    { id: "u12", contratos: 21 }, // você
    { id: "u15", contratos: 20 },
    { id: "u19", contratos: 18 },
  ];

  const sorted = [...data].sort((a, b) => b.contratos - a.contratos);
  const max = sorted[0]?.contratos || 1;
  const top7 = sorted.slice(0, 7);
  const myIndex = sorted.findIndex((x) => x.id === currentUserId);
  const myPos = myIndex >= 0 ? myIndex + 1 : null;
  const me = myIndex >= 0 ? sorted[myIndex] : null;

  return (
    <div className="min-h-screen">
      {/* header + breadcrumb são herdados do layout principal (AppShell) */}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Título da página */}
        <div className="mb-6">
          <h1 className="text-[28px] md:text-[32px] font-extrabold text-gray-900">
            Ranking de Consultores <span className="text-gray-400">(Anônimo)</span>
          </h1>
        </div>

        {/* Card: sua posição */}
        {me && (
          <div className="mb-6 rounded-2xl border border-indigo-200/60 bg-indigo-50/60 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-indigo-600 font-bold text-sm">Sua posição</div>
                <div className="text-3xl md:text-4xl font-black text-indigo-900 mt-1">
                  #{myPos}
                </div>
                <div className="text-indigo-900 mt-1">
                  {me.contratos} contratos fechados
                </div>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-white px-4 py-2 font-bold text-indigo-600">
                Você
              </div>
            </div>
          </div>
        )}

        {/* Tabela Top 7 */}
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 bg-gray-50 px-4 sm:px-6 py-3 text-[12px] font-bold uppercase tracking-wide text-gray-500">
            <div className="col-span-3 sm:col-span-2">Posição</div>
            <div className="col-span-6 sm:col-span-8">Consultor</div>
            <div className="col-span-3 sm:col-span-2 text-right">Contratos</div>
          </div>

          {/* Linhas */}
          {top7.map((row, idx) => {
            const pos = idx + 1;
            const width = Math.max(8, (row.contratos / max) * 100);

            return (
              <div
                key={row.id}
                className="grid grid-cols-12 gap-4 items-center px-4 sm:px-6 py-4 border-t border-gray-100"
              >
                {/* Posição + medalha */}
                <div className="col-span-3 sm:col-span-2 flex items-center gap-2 font-extrabold text-gray-900">
                  #{pos} <Medal pos={pos} />
                </div>

                {/* Pseudônimo + barra */}
                <div className="col-span-6 sm:col-span-8">
                  <div className="font-bold text-gray-900 mb-2">
                    {pseudoFromId(row.id)}
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${width}%`,
                        background:
                          "linear-gradient(90deg, #FE5200 0%, #F7931E 100%)",
                      }}
                    />
                  </div>
                </div>

                {/* Quantidade */}
                <div className="col-span-3 sm:col-span-2 text-right font-black text-gray-900">
                  {row.contratos}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 mt-3">
          * Ranking anônimo: apenas codinomes e totais de contratos são exibidos.
        </p>
      </div>
    </div>
  );
};

export default RankingPage;
