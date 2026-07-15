import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextData {
  socket: Socket | null;
  connected: boolean;
  sessionId: string;
  socketUrl: string | null;
}

const SocketContext = createContext<SocketContextData>({
  socket: null,
  connected: false,
  sessionId: 'local',
  socketUrl: null,
});

// Porta local do seu backend
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

  // Permite trocar a URL do ngrok pela URL do navegador sem rebuild:
  // Exemplo:
  // https://diskcell.github.io/DoutrinaHUD/?socket=https://sua-url.ngrok-free.dev#/overlay
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

  const savedSocketUrl = localStorage.getItem('doutrinahud_socket_url');

  if (savedSocketUrl) {
    return savedSocketUrl;
  }

  return '';
}

function getSessionId() {
  return getUrlParams().get('session') || 'local';
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [sessionId] = useState(getSessionId);
  const [socketUrl] = useState(getSocketUrl);

  useEffect(() => {
    if (!socketUrl) {
      console.warn('Defina a URL do servidor online para conectar o DoutrinaHUD.');
      return;
    }

    console.log('Conectando Socket.io em:', socketUrl);

    const socketIo = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: {
        sessionId,
      },
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketIo.on('connect', () => {
      console.log('Socket conectado:', socketIo.id);
      setConnected(true);
    });

    socketIo.on('disconnect', (reason) => {
      console.log('Socket desconectado:', reason);
      setConnected(false);
    });

    socketIo.on('connect_error', (error) => {
      console.error('Erro ao conectar socket:', error.message);
      setConnected(false);
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, [sessionId, socketUrl]);

  return (
    <SocketContext.Provider value={{ socket, connected, sessionId, socketUrl: socketUrl || null }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
