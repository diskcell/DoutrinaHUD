import { useEffect, useState } from 'react';
import { Check, ExternalLink, Layers, MonitorPlay, RefreshCw } from 'lucide-react';
import { cn } from '../components/AdminLayout';
import {
  DEFAULT_OVERLAY_MODELS,
  getStoredActiveOverlayId,
  markActiveOverlayModel,
  OverlayModel,
  setStoredActiveOverlayId,
} from '../lib/overlayModels';

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

export function Overlays() {
  const [models, setModels] = useState<OverlayModel[]>(() =>
    markActiveOverlayModel(DEFAULT_OVERLAY_MODELS, getStoredActiveOverlayId())
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  const applyModels = (incomingModels: OverlayModel[]) => {
    const activeFromApi = incomingModels.find((model) => model.is_active)?.id;
    const activeId = activeFromApi || getStoredActiveOverlayId();
    setStoredActiveOverlayId(activeId);
    setModels(markActiveOverlayModel(incomingModels, activeId));
  };

  const fetchModels = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/overlays');

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          applyModels(data);
          return;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar overlays:', error);
    } finally {
      setModels((currentModels) => {
        const baseModels = currentModels.length > 0 ? currentModels : DEFAULT_OVERLAY_MODELS;
        return markActiveOverlayModel(baseModels, getStoredActiveOverlayId());
      });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleActivate = async (id: string) => {
    try {
      setIsSaving(id);
      setStoredActiveOverlayId(id);
      setModels((currentModels) => markActiveOverlayModel(currentModels, id));

      const res = await fetch(`/api/overlays/${id}/active`, {
        method: 'PUT',
      });

      if (res.ok) {
        await fetchModels();
      }
    } catch (error) {
      console.error('Erro ao ativar overlay:', error);
    } finally {
      setModels((currentModels) => markActiveOverlayModel(currentModels, getStoredActiveOverlayId()));
      setIsSaving(null);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white m-0">Overlays</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Gerencie os modelos de HUD salvos no banco local.
          </p>
        </div>

        <button
          onClick={fetchModels}
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-5 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <Layers className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white m-0">Modelo atual salvo</p>
          <p className="text-xs text-neutral-400 mt-1">
            A HUD que estamos usando agora ficou registrada como base para criarmos novas variações depois.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-neutral-950/20 rounded-lg border border-neutral-900 p-2">
        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-neutral-500">
            Carregando modelos de overlay...
          </div>
        ) : models.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-neutral-500 bg-neutral-900/30 rounded-lg border border-neutral-800/50 border-dashed m-2">
            <MonitorPlay className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium text-neutral-400">Nenhum modelo salvo</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {models.map((model) => {
              const features = model.config?.features || [];

              return (
                <div
                  key={model.id}
                  className={cn(
                    'bg-neutral-900 border rounded-lg overflow-hidden transition-colors',
                    model.is_active
                      ? 'border-emerald-500/60'
                      : 'border-neutral-800 hover:border-neutral-700'
                  )}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-black text-white leading-tight truncate m-0">
                            {model.name}
                          </h3>
                          {model.is_active && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                              Ativo
                            </span>
                          )}
                          {model.is_default && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                              Padrão
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-400 leading-relaxed m-0">
                          {model.description}
                        </p>
                      </div>

                      <div className="w-14 h-14 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0">
                        <MonitorPlay className="w-7 h-7 text-neutral-500" />
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 min-w-0">
                        <span className="text-neutral-500 font-bold text-[10px] uppercase tracking-wider">
                          ID
                        </span>
                        <p className="text-xs text-neutral-200 font-mono truncate mt-1 m-0">
                          {model.id}
                        </p>
                      </div>
                      <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 min-w-0">
                        <span className="text-neutral-500 font-bold text-[10px] uppercase tracking-wider">
                          Componente
                        </span>
                        <p className="text-xs text-neutral-200 font-mono truncate mt-1 m-0">
                          {model.component_key}
                        </p>
                      </div>
                      <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 min-w-0">
                        <span className="text-neutral-500 font-bold text-[10px] uppercase tracking-wider">
                          Rota
                        </span>
                        <p className="text-xs text-neutral-200 font-mono truncate mt-1 m-0">
                          {model.route_path}
                        </p>
                      </div>
                    </div>

                    {features.length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {features.map((feature) => (
                          <span
                            key={feature}
                            className="px-2.5 py-1 rounded bg-neutral-950 border border-neutral-800 text-[10px] font-bold uppercase tracking-wider text-neutral-400"
                          >
                            {featureLabels[feature] || feature}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="px-5 py-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between gap-3">
                    <a
                      href={`#${model.route_path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 rounded flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir
                    </a>

                    <button
                      onClick={() => handleActivate(model.id)}
                      disabled={model.is_active || isSaving === model.id}
                      className={cn(
                        'px-4 py-2 rounded text-xs font-bold transition-colors flex items-center gap-1.5',
                        model.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 cursor-default'
                          : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                      )}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {model.is_active ? 'Selecionado' : isSaving === model.id ? 'Salvando...' : 'Ativar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
