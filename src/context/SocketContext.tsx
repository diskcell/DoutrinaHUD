import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import type { ReactNode } from 'react';
import { io } from 'socket.io-client';
import { isSupabaseConfigured, requireSupabase, supabaseProjectUrl } from '../lib/supabase';
import { loadCloudLiveBootstrap, updateCloudLiveHudState } from '../frontend/lib/cloudLive';

type SocketHandler = (payload: any) => void;

export interface SocketLike {
  on: (event: string, handler: SocketHandler) => SocketLike;
  off: (event: string, handler: SocketHandler) => SocketLike;
  emit: (event: string, payload?: unknown) => SocketLike;
}

interface SocketContextData {
  socket: SocketLike | null;
  connected: boolean;
  sessionId: string;
  socketUrl: string | null;
  transport: 'supabase' | 'socket.io' | null;
}

const SocketContext = createContext<SocketContextData>({
  socket: null,
  connected: false,
  sessionId: 'local',
  socketUrl: null,
  transport: null,
});

const LOCAL_BACKEND_URL = 'http://127.0.0.1:3000';

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const hashQuery = window.location.hash.split('?')[1];

  if (hashQuery) {
    const hashParams = new URLSearchParams(hashQuery);
    hashParams.forEach((value, key) => {
      if (!params.has(key)) params.set(key, value);
    });
  }

  return params;
}

function getSocketUrl() {
  if (window.location.port === '3000') {
    return window.location.origin;
  }

  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (isLocal) {
    return LOCAL_BACKEND_URL;
  }

  const params = getUrlParams();
  const socketFromUrl = params.get('socket');

  if (socketFromUrl) {
    localStorage.setItem('doutrinahud_socket_url', socketFromUrl);
    return socketFromUrl;
  }

  const isGitHubPages = window.location.hostname.endsWith('github.io');

  if (!isGitHubPages) {
    return window.location.origin;
  }

  return localStorage.getItem('doutrinahud_socket_url') || '';
}

function getSessionId() {
  return getUrlParams().get('session') || 'local';
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<SocketLike | null>(null);
  const [connected, setConnected] = useState(false);
  const [transport, setTransport] = useState<'supabase' | 'socket.io' | null>(null);
  const [sessionId, setSessionId] = useState(getSessionId);
  const [socketUrl] = useState(getSocketUrl);

  useEffect(() => {
    const syncSessionFromUrl = () => setSessionId(getSessionId());
    window.addEventListener('hashchange', syncSessionFromUrl);
    window.addEventListener('popstate', syncSessionFromUrl);

    return () => {
      window.removeEventListener('hashchange', syncSessionFromUrl);
      window.removeEventListener('popstate', syncSessionFromUrl);
    };
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured && sessionId !== 'local') {
      const client = requireSupabase();
      const handlers = new Map<string, Set<SocketHandler>>();
      const channel = client.channel(`live:${sessionId}`, {
        config: {
          broadcast: { self: true, ack: true },
        },
      });

      const dispatch = (event: string, payload: unknown) => {
        handlers.get(event)?.forEach((handler) => handler(payload));
      };

      const adapter: SocketLike = {
        on(event, handler) {
          const eventHandlers = handlers.get(event) || new Set<SocketHandler>();
          eventHandlers.add(handler);
          handlers.set(event, eventHandlers);
          return adapter;
        },
        off(event, handler) {
          handlers.get(event)?.delete(handler);
          return adapter;
        },
        emit(event, payload) {
          if (event === 'overlay:ready') {
            loadCloudLiveBootstrap(sessionId)
              .then((bootstrap) => {
                if (bootstrap?.latestHudState) {
                  dispatch('hud:update', bootstrap.latestHudState);
                }
              })
              .catch((error) => console.error('Falha ao recuperar estado da HUD:', error));
            return adapter;
          }

          if (event === 'hud:command') {
            updateCloudLiveHudState(sessionId, payload)
              .then(() => channel.send({
                type: 'broadcast',
                event: 'hud:update',
                payload,
              }))
              .catch((error) => console.error('Falha ao sincronizar a HUD:', error));
            return adapter;
          }

          if (event.startsWith('veto:')) {
            console.warn('O veto online sera migrado em uma proxima etapa.');
          }

          return adapter;
        },
      };

      channel
        .on('broadcast', { event: 'gsi:update' }, ({ payload }) => {
          dispatch('gsi:update', payload);
        })
        .on('broadcast', { event: 'hud:update' }, ({ payload }) => {
          void loadCloudLiveBootstrap(sessionId)
            .then((bootstrap) => {
              if (bootstrap?.latestHudState) {
                dispatch('hud:update', bootstrap.latestHudState);
              } else if (payload) {
                console.warn('Atualizacao da HUD recebida sem estado persistido.');
              }
            })
            .catch((error) => console.error('Falha ao validar estado da HUD:', error));
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnected(true);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setConnected(false);
          }
        });

      setSocket(adapter);
      setTransport('supabase');

      return () => {
        setConnected(false);
        setSocket(null);
        void client.removeChannel(channel);
      };
    }

    if (!socketUrl) {
      console.warn('Defina a URL do servidor online para conectar o DoutrinaHUD.');
      setTransport(null);
      return;
    }

    const socketIo = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: {
        sessionId,
        controlToken: getUrlParams().get('control'),
      },
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketIo.on('connect', () => setConnected(true));
    socketIo.on('disconnect', () => setConnected(false));
    socketIo.on('connect_error', () => setConnected(false));

    setSocket(socketIo as SocketLike);
    setTransport('socket.io');

    return () => {
      socketIo.disconnect();
    };
  }, [sessionId, socketUrl]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        sessionId,
        socketUrl: transport === 'supabase' ? supabaseProjectUrl : socketUrl || null,
        transport,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
