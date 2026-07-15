export interface OverlayModel {
  id: string;
  name: string;
  description?: string;
  component_key: string;
  route_path: string;
  preview_label?: string;
  config?: {
    layout?: string;
    version?: number;
    features?: string[];
  };
  is_active: boolean;
  is_default: boolean;
  updated_at?: string;
}

export type OverlayVariant = 'professional' | 'broadcast';

export const ACTIVE_OVERLAY_STORAGE_KEY = 'doutrinahud_active_overlay_model';

export const DEFAULT_OVERLAY_MODELS: OverlayModel[] = [
  {
    id: 'professional_v1',
    name: 'DOUTRINA HUD Atual',
    description:
      'Modelo atual da overlay principal com radar, paineis laterais, jogador observado, economia, placar, banners de round e final da partida.',
    component_key: 'professional_v1',
    route_path: '/overlay/professional',
    preview_label: 'Modelo atual',
    config: {
      layout: 'professional',
      version: 1,
      features: [
        'scoreboard',
        'radar',
        'player_panels',
        'observed_player',
        'economy',
        'bomb_state',
        'clutch',
        'round_end',
        'match_end',
        'series_strip',
      ],
    },
    is_active: true,
    is_default: true,
  },
  {
    id: 'broadcast_v1',
    name: 'Broadcast Arena',
    description:
      'Modelo inspirado em HUDs de campeonato, com placar central compacto, area de patrocinador, cards inferiores e o mesmo radar da HUD principal.',
    component_key: 'broadcast_v1',
    route_path: '/overlay/broadcast',
    preview_label: 'Broadcast',
    config: {
      layout: 'broadcast',
      version: 1,
      features: [
        'scoreboard',
        'radar',
        'player_dock',
        'observed_player',
        'sponsor_area',
        'bomb_state',
        'clutch',
        'round_end',
        'match_end',
      ],
    },
    is_active: false,
    is_default: false,
  },
];

export function getOverlayVariantFromModelId(modelId?: string | null): OverlayVariant {
  return modelId === 'broadcast_v1' ? 'broadcast' : 'professional';
}

export function getStoredActiveOverlayId() {
  if (typeof window === 'undefined') return 'professional_v1';

  return localStorage.getItem(ACTIVE_OVERLAY_STORAGE_KEY) || 'professional_v1';
}

export function setStoredActiveOverlayId(modelId: string) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(ACTIVE_OVERLAY_STORAGE_KEY, modelId);
  window.dispatchEvent(
    new CustomEvent('doutrinahud:overlay-model-change', {
      detail: { modelId },
    })
  );
}

export function markActiveOverlayModel(models: OverlayModel[], activeId: string) {
  return models.map((model) => ({
    ...model,
    is_active: model.id === activeId,
  }));
}
