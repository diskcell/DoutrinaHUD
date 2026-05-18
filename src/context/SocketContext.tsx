import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextData {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextData>({ socket: null, connected: false });

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Roteamento inteligente: usa localhost no desenvolvimento, e a URL do ngrok no GitHub Pages
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const socketUrl = isLocal 
      ? 'http://localhost:3000' 
      : 'https://shower-disfigure-subject.ngrok-free.dev';

    const socketIo = io(socketUrl, {
      // O ngrok gratuito intercepta a primeira conexão com uma tela de aviso HTML.
      // Este header pula essa tela, garantindo que o Socket.io conecte direto ao backend.
      extraHeaders: {
        "ngrok-skip-browser-warning": "true"
      }
    });
    
    socketIo.on('connect', () => {
      setConnected(true);
    });

    socketIo.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}