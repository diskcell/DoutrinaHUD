import { useEffect, useState } from 'react';
import { Copy, Download, ExternalLink, Plus, Radio } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useOptionalCloudSession } from '../context/CloudSessionContext';
import {
  clearActiveCloudLiveSessionId,
  cloudLiveSessionExists,
  createCloudLiveSession,
  getCloudGsiEndpoint,
  setActiveCloudLiveSessionId,
} from '../lib/cloudLive';
import { getStoredActiveOverlayId } from '../lib/overlayModels';

interface OnlineSession {
  id: string;
  token: string;
  controlToken: string;
  createdAt: number;
  expiresAt?: string;
  overlayModelId?: string;
}

function appUrl(path: string, sessionId: string, controlToken?: string) {
  const basePath = window.location.pathname.endsWith('/')
    ? window.location.pathname
    : `${window.location.pathname}/`;

  const controlQuery = controlToken ? `&control=${encodeURIComponent(controlToken)}` : '';
  return `${window.location.origin}${basePath}#${path}?session=${encodeURIComponent(sessionId)}${controlQuery}`;
}

function getSavedOnlineSession(storageKey: string): OnlineSession | null {
  try {
    const savedSession = window.localStorage.getItem(storageKey);
    if (!savedSession) return null;

    const session = JSON.parse(savedSession) as Partial<OnlineSession>;
    if (typeof session.id !== 'string' || typeof session.token !== 'string') return null;

    return {
      id: session.id,
      token: session.token,
      controlToken: typeof session.controlToken === 'string' ? session.controlToken : '',
      createdAt: typeof session.createdAt === 'number' ? session.createdAt : Date.now(),
      expiresAt: typeof session.expiresAt === 'string' ? session.expiresAt : undefined,
      overlayModelId: typeof session.overlayModelId === 'string'
        ? session.overlayModelId
        : 'professional_v1',
    };
  } catch {
    return null;
  }
}

function createOnlineGsiConfig(session: OnlineSession, endpoint: string) {
  return `"DoutrinaHUD"
{
  "uri" "${endpoint}"
  "timeout" "5.0"
  "buffer" "0.05"
  "throttle" "0.20"
  "heartbeat" "30.0"

  "auth"
  {
    "token" "${session.token}"
  }

  "data"
  {
    "provider" "1"
    "map" "1"
    "round" "1"
    "player_id" "1"
    "player_state" "1"
    "player_weapons" "1"
    "player_match_stats" "1"
    "allplayers_id" "1"
    "allplayers_state" "1"
    "allplayers_match_stats" "1"
    "allplayers_weapons" "1"
    "allplayers_position" "1"
    "allplayers_forward" "1"
    "phase_countdowns" "1"
    "bomb" "1"
    "allgrenades" "1"
  }
}
`;
}

export function Dashboard() {
  const { socket, connected, sessionId } = useSocket();
  const cloudSession = useOptionalCloudSession();
  const [onlineSession, setOnlineSession] = useState<OnlineSession | null>(null);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [receivingGsi, setReceivingGsi] = useState(false);

  const copyValue = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedValue(label);
    window.setTimeout(() => setCopiedValue(null), 1800);
  };

  useEffect(() => {
    let isMounted = true;

    if (isSupabaseConfigured && cloudSession) {
      const key = `doutrinahud-online-session:${cloudSession.user.id}`;
      const savedSession = getSavedOnlineSession(key);
      setStorageKey(key);

      if (!savedSession) {
        clearActiveCloudLiveSessionId();
        setOnlineSession(null);
        return () => {
          isMounted = false;
        };
      }

      cloudLiveSessionExists(cloudSession.workspaceId, savedSession.id)
        .then((exists) => {
          if (!isMounted) return;
          if (exists) {
            setOnlineSession(savedSession);
            setActiveCloudLiveSessionId(savedSession.id);
          } else {
            localStorage.removeItem(key);
            clearActiveCloudLiveSessionId(savedSession.id);
            setOnlineSession(null);
          }
        })
        .catch(() => {
          if (isMounted) {
            setOnlineSession(null);
          }
        });

      return () => {
        isMounted = false;
      };
    }

    fetch('/api/auth/me')
      .then((response) => response.json())
      .then((data) => {
        if (!data.user?.id) return;
        const key = `doutrinahud-online-session:${data.user.id}`;
        setStorageKey(key);
        setOnlineSession(getSavedOnlineSession(key));
      })
      .catch(() => setOnlineSession(null));

    return () => {
      isMounted = false;
    };
  }, [cloudSession]);

  useEffect(() => {
    if (!socket || !connected || !onlineSession || sessionId !== onlineSession.id) {
      setReceivingGsi(false);
      return;
    }

    let inactivityTimer: number | undefined;
    const handleGsiUpdate = () => {
      setReceivingGsi(true);
      if (inactivityTimer) window.clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(() => setReceivingGsi(false), 3000);
    };

    socket.on('gsi:update', handleGsiUpdate);

    return () => {
      socket.off('gsi:update', handleGsiUpdate);
      if (inactivityTimer) window.clearTimeout(inactivityTimer);
    };
  }, [connected, onlineSession, sessionId, socket]);

  const downloadGsiConfig = () => {
    if (!onlineSession) return;

    const endpoint = isSupabaseConfigured
      ? getCloudGsiEndpoint(onlineSession.id)
      : `${window.location.origin}/gsi/${encodeURIComponent(onlineSession.id)}`;
    const file = new Blob([createOnlineGsiConfig(onlineSession, endpoint)], { type: 'text/plain' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gamestate_integration_doutrinahud.cfg';
    link.click();
    URL.revokeObjectURL(url);
  };

  const createOnlineSession = async () => {
    setCreatingSession(true);

    try {
      let session: OnlineSession;

      if (isSupabaseConfigured && cloudSession) {
        session = await createCloudLiveSession(
          cloudSession.workspaceId,
          cloudSession.user.id,
          getStoredActiveOverlayId()
        );
      } else {
        const response = await fetch('/api/sessions', { method: 'POST' });

        if (!response.ok) {
          throw new Error('Nao foi possivel criar a sessao.');
        }

        session = (await response.json()) as OnlineSession;
      }

      if (storageKey) window.localStorage.setItem(storageKey, JSON.stringify(session));
      setOnlineSession(session);
      if (isSupabaseConfigured) setActiveCloudLiveSessionId(session.id);
    } catch (error) {
      console.error(error);
      alert('Nao foi possivel criar a sessao online. Verifique se a estrutura do Supabase foi instalada.');
    } finally {
      setCreatingSession(false);
    }
  };

  const overlayRoute = onlineSession?.overlayModelId === 'broadcast_v1'
    ? '/overlay/broadcast'
    : '/overlay/professional';
  const overlayUrl = onlineSession ? appUrl(overlayRoute, onlineSession.id) : '';
  const controlUrl = onlineSession ? appUrl('/admin/live', onlineSession.id, onlineSession.controlToken) : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white m-0">Visao Geral</h1>
        <p className="text-neutral-400 mt-2">Controle da transmissao e das sessoes da DoutrinaHUD.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-800/40 border border-neutral-800 rounded-lg p-6">
          <h3 className="text-neutral-400 font-medium text-sm">Partidas Ativas</h3>
          <p className="text-4xl font-bold text-white mt-2">0</p>
        </div>
        <div className="bg-neutral-800/40 border border-neutral-800 rounded-lg p-6">
          <h3 className="text-neutral-400 font-medium text-sm">Times Cadastrados</h3>
          <p className="text-4xl font-bold text-white mt-2">0</p>
        </div>
        <div className="bg-neutral-800/40 border border-neutral-800 rounded-lg p-6">
          <h3 className="text-neutral-400 font-medium text-sm">Jogadores</h3>
          <p className="text-4xl font-bold text-white mt-2">0</p>
        </div>
      </div>

      <section className="border border-neutral-800 bg-neutral-900/60 rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 p-2 bg-emerald-500/10 text-emerald-400 rounded-md">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Sessao Online</h2>
              <p className="text-sm text-neutral-400 mt-1">
                {onlineSession ? (
                  <>
                    Sessao pronta: <span className="font-mono text-neutral-200">{onlineSession.id}</span>
                    <span className={connected ? 'text-emerald-400' : 'text-amber-400'}>
                      {connected ? ' · Realtime conectado' : ' · Conectando ao Realtime'}
                    </span>
                    {connected && (
                      <span className={receivingGsi ? 'text-emerald-400' : 'text-neutral-500'}>
                        {receivingGsi ? ' · CS2 transmitindo' : ' · Aguardando CS2'}
                      </span>
                    )}
                  </>
                ) : (
                  <span className={connected ? 'text-emerald-400' : 'text-neutral-400'}>
                    Crie uma sessao para conectar o CS2 ao overlay.
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={createOnlineSession}
            disabled={creatingSession}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-4 py-2 text-sm font-bold rounded-md disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            {creatingSession ? 'Criando' : 'Nova Sessao'}
          </button>
        </div>

        {onlineSession && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-neutral-800 bg-neutral-950 p-4 rounded-md space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">ID da sessao</p>
                <p className="font-mono text-sm text-white mt-1 break-all">{onlineSession.id}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Token da sessao</p>
                <p className="font-mono text-xs text-white mt-1 break-all">{onlineSession.token}</p>
              </div>
              <button
                type="button"
                onClick={() => copyValue(onlineSession.token, 'token')}
                className="inline-flex items-center gap-2 text-sm text-neutral-300 hover:text-white"
              >
                <Copy className="w-4 h-4" />
                {copiedValue === 'token' ? 'Token copiado' : 'Copiar token'}
              </button>
              <button
                type="button"
                onClick={downloadGsiConfig}
                className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
              >
                <Download className="w-4 h-4" />
                Baixar CFG do CS2
              </button>
            </div>

            <div className="border border-neutral-800 bg-neutral-950 p-4 rounded-md space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Overlay publico</p>
                <p className="font-mono text-xs text-white mt-1 break-all">{overlayUrl}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Painel da sessao</p>
                <p className="font-mono text-xs text-white mt-1 break-all">{controlUrl}</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => copyValue(overlayUrl, 'overlay')}
                  className="inline-flex items-center gap-2 text-sm text-neutral-300 hover:text-white"
                >
                  <Copy className="w-4 h-4" />
                  {copiedValue === 'overlay' ? 'Link copiado' : 'Copiar overlay'}
                </button>
                <button
                  type="button"
                  onClick={() => copyValue(controlUrl, 'control')}
                  className="inline-flex items-center gap-2 text-sm text-neutral-300 hover:text-white"
                >
                  <Copy className="w-4 h-4" />
                  {copiedValue === 'control' ? 'Painel copiado' : 'Copiar painel'}
                </button>
                <a
                  href={overlayUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir overlay
                </a>
                <a
                  href={controlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir painel
                </a>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
