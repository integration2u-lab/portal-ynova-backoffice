import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  consumoLiquido: number;
  tarifaAtual: number;
  tarifaCativo: number;
  impostoExtraRate: number; // ex: parse de cliente.imposto
};

export default function ModalEnergyDetails({
  isOpen,
  onClose,
  consumoLiquido,
  tarifaAtual,
  tarifaCativo,
  impostoExtraRate,
}: Props) {
  const [showMonths, setShowMonths] = useState(true);
  if (!isOpen) return null;

  const PIS = 0.0108;
  const COFINS = 0.05;
  const ICMS = 0.17;

  type Item = { label: string; quantidade: number; tarifa: number };
  const itensDetalheAtual: Item[] = [
    { label: 'Encargo Ponta', quantidade: consumoLiquido * 0.05, tarifa: 0.20 },
    { label: 'Encargo Fora Ponta', quantidade: consumoLiquido * 0.15, tarifa: 0.10 },
    { label: 'Demanda', quantidade: consumoLiquido * 0.02, tarifa: 0.30 },
    { label: 'Demanda sem ICMS', quantidade: consumoLiquido * 0.01, tarifa: 0.30 },
    { label: 'Energia Reativa Ponta', quantidade: consumoLiquido * 0.01, tarifa: 0.35 },
    { label: 'Energia Reativa Fora Ponta', quantidade: consumoLiquido * 0.06, tarifa: 0.35 },
    { label: 'CIP', quantidade: consumoLiquido * 0.005, tarifa: 0.05 },
  ];
  const itensDetalheCativo: Item[] = itensDetalheAtual.map((i) => ({ ...i, tarifa: i.tarifa * 0.85 }));

  const totalComImposto = (quantidade: number, tarifa: number) =>
    quantidade * tarifa * (1 + PIS + COFINS + ICMS + impostoExtraRate);

  const totalTabela = (items: Item[]) =>
    items.reduce((acc, it) => acc + totalComImposto(it.quantidade, it.tarifa), 0);

  const totalAtual = totalTabela([{ label: 'Energia (kWh)', quantidade: consumoLiquido, tarifa: tarifaAtual }, ...itensDetalheAtual]);
  const totalCativo = totalTabela([{ label: 'Energia (kWh)', quantidade: consumoLiquido, tarifa: tarifaCativo }, ...itensDetalheCativo]);
  const economia = Math.max(totalAtual - totalCativo, 0);

  const fBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fKwh = (n: number) => `${Math.round(n).toLocaleString('pt-BR')} kWh`;

  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const monthly = months.map((m, i) => {
    // sazonalidade simples: +10% no verão (Dez-Fev), -5% no inverno (Jun-Ago)
    const season = [11,0,1].includes(i) ? 1.1 : [5,6,7].includes(i) ? 0.95 : 1;
    const consumoMes = (consumoLiquido / 12) * season;
    const atual = totalComImposto(consumoMes, tarifaAtual);
    const cativo = totalComImposto(consumoMes, tarifaCativo);
    return { m, consumoMes, atual, cativo, economia: Math.max(atual - cativo, 0) };
  });

  const Linha = ({ label, quantidade, tarifa }: Item) => {
    const tarifaCI = tarifa * (1 + PIS + COFINS + ICMS + impostoExtraRate);
    const total = quantidade * tarifaCI;
    return (
      <tr className="border-b border-gray-100 dark:border-[#2b3238]">
        <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">{label}</td>
        <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">{fKwh(quantidade)}</td>
        <td className="px-4 py-2 text-sm text-right text-gray-800 dark:text-gray-200">{fBRL(tarifa)}</td>
        <td className="px-4 py-2 text-sm text-right text-gray-800 dark:text-gray-200">{fBRL(tarifaCI)}</td>
        <td className="px-4 py-2 text-sm text-right font-medium text-gray-900 dark:text-gray-100">{fBRL(total)}</td>
      </tr>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-full sm:max-w-6xl bg-white dark:bg-[#1a1f24] rounded-none sm:rounded-2xl shadow-xl border border-transparent sm:border-gray-200 sm:dark:border-[#2b3238] overflow-hidden flex flex-col h-screen sm:h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-[#2b3238] bg-yn-orange text-white">
          <h3 className="text-base sm:text-lg font-semibold">Detalhamento de Balanço Energético</h3>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-md sm:hidden"
              onClick={() => setShowMonths((s) => !s)}
            >
              <Calendar size={16} /> {showMonths ? 'Ocultar' : 'Mostrar'} meses
            </button>
            <button onClick={onClose} aria-label="Fechar" className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-white/15 hover:bg-white/25">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 flex-1 overflow-hidden">
          {/* Lateral meses */}
          <aside className={`${showMonths ? 'block' : 'hidden'} lg:block lg:col-span-1 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-[#2b3238] overflow-auto max-h-[40vh] sm:max-h-full`}>
            <div className="px-4 py-3 bg-gray-50 dark:bg-[#161b20] font-medium text-gray-800 dark:text-gray-100 sticky top-0 z-10">Meses</div>
            <table className="w-full text-sm">
              <thead className="sticky top-10 sm:top-0 bg-white dark:bg-[#1a1f24] z-10">
                <tr className="text-left text-xs uppercase text-gray-600 dark:text-gray-300">
                  <th className="px-3 py-2">Mês</th>
                  <th className="px-3 py-2 text-right">Atual</th>
                  <th className="px-3 py-2 text-right">Cativo</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((row) => (
                  <tr key={row.m} className="border-t border-gray-100 dark:border-[#2b3238]">
                    <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{row.m}</td>
                    <td className="px-3 py-2 text-right text-gray-800 dark:text-gray-200">{fBRL(row.atual)}</td>
                    <td className="px-3 py-2 text-right text-gray-800 dark:text-gray-200">{fBRL(row.cativo)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-[#161b20]">
                  <td className="px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">Total</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-100">{fBRL(monthly.reduce((a,b)=>a+b.atual,0))}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-100">{fBRL(monthly.reduce((a,b)=>a+b.cativo,0))}</td>
                </tr>
              </tfoot>
            </table>
          </aside>

          {/* Conteúdo principal */}
          <section className="lg:col-span-3 p-3 sm:p-4 space-y-4 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fatura Atual */}
              <div className="bg-white dark:bg-[#1a1f24] rounded-2xl border border-gray-200 dark:border-[#2b3238] overflow-hidden">
                <div className="px-4 py-3 bg-yn-blue text-white font-medium">Fatura Atual</div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px]">
                    <thead className="bg-gray-50 dark:bg-[#161b20] sticky top-0 z-10">
                      <tr className="text-left text-xs uppercase text-gray-600 dark:text-gray-300">
                        <th className="px-4 py-2">Item</th>
                        <th className="px-4 py-2 text-right">Quantidade</th>
                        <th className="px-4 py-2 text-right">Tarifa</th>
                        <th className="px-4 py-2 text-right">Tarifa c/ Imp.</th>
                        <th className="px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <Linha label="Energia (kWh)" quantidade={consumoLiquido} tarifa={tarifaAtual} />
                      {itensDetalheAtual.map((it) => (
                        <Linha key={it.label} {...it} />
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 dark:bg-[#161b20]">
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100" colSpan={4}>Custos Realizados</td>
                        <td className="px-4 py-3 text-right font-bold text-[#1F2775] dark:text-white">{fBRL(totalAtual)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Simulação Cativo */}
              <div className="bg-white dark:bg-[#1a1f24] rounded-2xl border border-gray-200 dark:border-[#2b3238] overflow-hidden">
                <div className="px-4 py-3 bg-yn-blue text-white font-medium">Simulação Cativo</div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px]">
                    <thead className="bg-gray-50 dark:bg-[#161b20] sticky top-0 z-10">
                      <tr className="text-left text-xs uppercase text-gray-600 dark:text-gray-300">
                        <th className="px-4 py-2">Item</th>
                        <th className="px-4 py-2 text-right">Quantidade</th>
                        <th className="px-4 py-2 text-right">Tarifa</th>
                        <th className="px-4 py-2 text-right">Tarifa c/ Imp.</th>
                        <th className="px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <Linha label="Energia (kWh)" quantidade={consumoLiquido} tarifa={tarifaCativo} />
                      {itensDetalheCativo.map((it) => (
                        <Linha key={it.label} {...it} />
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#E0F0FB] dark:bg-blue-900/30">
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100" colSpan={4}>Custo Estimado</td>
                        <td className="px-4 py-3 text-right font-bold text-[#1F2775] dark:text-white">{fBRL(totalCativo)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Economia resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-200">Economia estimada</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-200">{fBRL(economia)}</p>
              </div>
              <div className="rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-200">Atual</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-200">{fBRL(totalAtual)}</p>
              </div>
              <div className="rounded-lg p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-700 dark:text-orange-200">Cativo</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-200">{fBRL(totalCativo)}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
