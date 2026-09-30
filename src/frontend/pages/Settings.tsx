import { useEffect, useState } from 'react';
import { Layers, RefreshCw, CircleCheck, MonitorPlay } from 'lucide-react';
import { cn } from '../components/AdminLayout';
import { OverlayModel } from '../lib/overlayModels';

const featureLabels: Record<string, string> = {
  scoreboard: 'Placar',
  radar: 'Radar',
  player_panels: 'Painéis de jogadores',
  observed_player: 'Jogador observado',
  player_dock: 'Cards inferiores',
  sponsor_area: 'Patrocinador',
  economy: 'Economia',
  bomb_state: 'Estado da C4',
  clutch: 'Clutch',
  round_end: 'Fim de round',
  match_end: 'Fim de partida',
  series_strip: 'Série',
};

export function Settings() {
  const [models, setModels] = useState<OverlayModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/overlays');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Resposta inválida do servidor.');
      }

      setModels(data);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setError('Não foi possível carregar os modelos de HUD. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleActivate = async (id: string) => {
    setError(null);
    setSavingId(id);

    try {
      const response = await fetch(`/api/overlays/${encodeURIComponent(id)}/active`, {
        method: 'PUT',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Falha ao ativar o modelo.');
      }

      await fetchModels();
    } catch (error) {
      console.error('Erro ao ativar modelo de overlay:', error);
      setError('Não foi possível alterar o modelo ativo.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white m-0">Configurações</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Ajuste as configurações gerais e escolha o modelo de HUD ativo para o seu workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchModels}
          className="inline-flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Modo de HUD ativo</h2>
              <p className="text-sm text-neutral-400 mt-2">
                Escolha qual modelo de overlay será usado ao abrir a HUD. Esta configuração é salva para o workspace atual.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {isLoading ? (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-6 text-neutral-400 flex items-center gap-3">
                <MonitorPlay className="w-5 h-5 animate-spin" />
                Carregando modelos...
              </div>
            ) : models.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-700 bg-neutral-900/80 p-6 text-neutral-400">
                Nenhum modelo de overlay disponível.
              </div>
            ) : (
              models.map((model) => (
                <div
                  key={model.id}
                  className={cn(
                    'rounded-2xl border p-5 transition-all',
                    model.is_active
                      ? 'border-emerald-500/70 bg-emerald-500/10'
                      : 'border-neutral-800 bg-neutral-900/80 hover:border-neutral-700'
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-white truncate">{model.name}</h3>
                        {model.is_active && (
                          <span className="rounded-full bg-emerald-500/10 text-emerald-300 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.16em]">
                            Ativo
                          </span>
                        )}
                        {model.is_default && !model.is_active && (
                          <span className="rounded-full bg-blue-500/10 text-blue-300 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.16em]">
                            Padrão
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-400 leading-relaxed">{model.description}</p>
                    </div>
                    <button
                      type="button"
                      disabled={savingId !== null}
                      onClick={() => handleActivate(model.id)}
                      className={cn(
                        'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                        model.is_active
                          ? 'bg-emerald-500 text-black cursor-default'
                          : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                      )}
                    >
                      {model.is_active ? 'Ativo' : savingId === model.id ? 'Ativando...' : 'Ativar'}
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-xl bg-neutral-950/80 border border-neutral-800 p-3">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">ID</p>
                      <p className="text-neutral-200 font-mono text-sm truncate mt-1">{model.id}</p>
                    </div>
                    <div className="rounded-xl bg-neutral-950/80 border border-neutral-800 p-3">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">Componente</p>
                      <p className="text-neutral-200 font-mono text-sm truncate mt-1">{model.component_key}</p>
                    </div>
                    <div className="rounded-xl bg-neutral-950/80 border border-neutral-800 p-3">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">Rota</p>
                      <p className="text-neutral-200 font-mono text-sm truncate mt-1">{model.route_path}</p>
                    </div>
                  </div>

                  {model.config?.features?.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {model.config.features.map((feature) => (
                        <span
                          key={feature}
                          className="rounded-full border border-neutral-800 bg-neutral-950/80 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-neutral-300"
                        >
                          {featureLabels[feature] || feature}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-6">
          <h2 className="text-lg font-semibold text-white">Informações do Workspace</h2>
          <p className="text-sm text-neutral-400 mt-3">
            Esta página mostra configurações relacionadas ao workspace atual. As alterações são aplicadas imediatamente ao overlay ativo.
          </p>

          <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-400">
                <CircleCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Configuração de modelo de HUD</p>
                <p className="text-sm text-neutral-400">Escolha e persista o modelo de overlay do workspace.</p>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-400">
              As mudanças de modelo alteram a rota de overlay usada para transmissão. Use o painel de "Overlays" para ver todos os modelos e seus detalhes.
            </div>
          </div>
        </section>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}
