import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export type Meta = {
  id: string;
  icon: string;
  titulo: string;
  fechamentos: number;
  cor: string;
  status?: 'locked' | 'achieved' | 'redeemed';
  redeemedAt?: string | null;
};

const initialMetas: Meta[] = [
  {
    id: 'camarote',
    icon: '🍻',
    titulo: 'Camarote Brahma',
    fechamentos: 8,
    cor: '#FF6B35',
    status: 'achieved',
  },
  {
    id: 'argentina',
    icon: '✈️',
    titulo: 'Viagem para Argentina',
    fechamentos: 15,
    cor: '#4ECDC4',
    status: 'achieved',
  },
  {
    id: 'cruzeiro',
    icon: '🚢📱💰',
    titulo: 'Cruzeiro + iPhone + R$10.000',
    fechamentos: 40,
    cor: '#45B7D1',
    status: 'locked',
  },
  {
    id: 'carro',
    icon: '🚗⚡',
    titulo: 'Mini Dolphin / Toyota Corolla',
    fechamentos: 100,
    cor: '#96CEB4',
    status: 'locked',
  },
];

export function ProgressoDeMetas({ fechamentosAtuais }: { fechamentosAtuais: number }) {
  const [metas, setMetas] = useState<Meta[]>(initialMetas);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleRedeem = async (metaId: string) => {
    setLoadingId(metaId);
    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metaId }),
      });
      if (!res.ok) throw new Error('Falha no resgate');
      const data = await res.json();
      setMetas((prev) =>
        prev.map((m) => (m.id === metaId ? { ...m, status: 'redeemed', redeemedAt: data.redeemedAt } : m))
      );
      toast.success('Recompensa resgatada!');
    } catch (err) {
      toast.error('Não foi possível resgatar a recompensa');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#DC2626] p-6 text-white shadow-xl">
        <h2 className="text-lg font-bold md:text-xl">Suas Metas de Premiação</h2>
        <p className="mt-1 text-sm opacity-90">Acompanhe seu progresso e resgate suas recompensas</p>
        <div className="mt-4 inline-flex flex-col items-center rounded-lg bg-white/20 px-4 py-2 text-center">
          <span className="text-xs">Fechamentos Realizados</span>
          <span className="text-lg font-bold leading-tight">{fechamentosAtuais}</span>
        </div>
      </div>

      <ul className="space-y-4">
        {metas.map((meta) => {
          const progress = Math.min((fechamentosAtuais / meta.fechamentos) * 100, 100);
          const faltam = Math.max(meta.fechamentos - fechamentosAtuais, 0);
          const status =
            meta.status === 'redeemed'
              ? 'redeemed'
              : progress >= 100
              ? 'achieved'
              : 'locked';

          return (
            <li key={meta.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden>
                    {meta.icon}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{meta.titulo}</h3>
                    <p className="text-sm text-gray-500">{meta.fechamentos} fechamentos necessários</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {status === 'locked' && (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                      Faltam {faltam} fechamentos
                    </span>
                  )}

                  {status !== 'locked' && (
                    <>
                      <span
                        aria-label="Conquistado"
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                      >
                        Conquistado! 🎉
                      </span>
                      {status === 'achieved' ? (
                        <button
                          onClick={() => handleRedeem(meta.id)}
                          disabled={loadingId === meta.id}
                          aria-busy={loadingId === meta.id}
                          className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm ${
                            loadingId === meta.id
                              ? 'bg-emerald-600 opacity-80 cursor-wait'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          {loadingId === meta.id && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Resgatar recompensa
                        </button>
                      ) : (
                        <button
                          disabled
                          className="rounded-lg bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-500 cursor-not-allowed"
                        >
                          Já resgatada
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <div
                  className="h-3 w-full overflow-hidden rounded-md bg-gray-200"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                >
                  <div
                    className="h-full rounded-md transition-all duration-500"
                    style={{ width: `${progress}%`, backgroundColor: meta.cor }}
                  />
                </div>
                <span className="w-12 text-right text-sm font-semibold text-gray-700">
                  {Math.round(progress)}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ProgressoDeMetas;

