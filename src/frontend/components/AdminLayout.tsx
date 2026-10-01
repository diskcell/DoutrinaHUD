import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { LayoutDashboard, Users, Trophy, Radio, Settings, ShieldAlert, Layers, LogOut } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isSupabaseConfigured, requireSupabase } from '../../lib/supabase';
import { useOptionalCloudSession } from '../context/CloudSessionContext';
import { clearActiveCloudLiveSessionId } from '../lib/cloudLive';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function AdminLayout() {
  const { connected, sessionId, transport } = useSocket();
  const location = useLocation();
  const cloudSession = useOptionalCloudSession();
  const [account, setAccount] = useState<{ displayName: string; workspaceName: string } | null>(null);

  const menu = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { name: 'Partidas', icon: Trophy, path: '/admin/matches' },
    { name: 'Times', icon: Users, path: '/admin/teams' },
    { name: 'Jogadores', icon: Users, path: '/admin/players' },
    { name: 'Live Control', icon: Radio, path: '/admin/live' },
    { name: 'Overlays', icon: Layers, path: '/admin/overlays' },
    { name: 'Configurações', icon: Settings, path: '/admin/settings' },
  ];

  const handleLogout = async () => {
    clearActiveCloudLiveSessionId();
    if (isSupabaseConfigured) {
      await requireSupabase().auth.signOut();
    } else {
      await fetch('/api/auth/logout', { method: 'POST' });
    }
    window.location.reload();
  };

  useEffect(() => {
    if (cloudSession) {
      setAccount({
        displayName: cloudSession.displayName,
        workspaceName: cloudSession.workspaceName,
      });
      return;
    }

    if (isSupabaseConfigured) return;

    fetch('/api/auth/me')
      .then((response) => response.json())
      .then((data) => setAccount(data.user || null))
      .catch(() => setAccount(null));
  }, [cloudSession]);

  return (
    <div className="flex h-screen bg-neutral-900 text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-neutral-800 bg-neutral-950 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Doutrina<span className="text-emerald-500">HUD</span>
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {menu.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-emerald-500/10 text-emerald-500" 
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-neutral-800">
          {account && (
            <div className="mb-4 px-2 min-w-0">
              <p className="text-xs font-semibold text-neutral-200 truncate">{account.displayName}</p>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wide truncate">{account.workspaceName}</p>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm px-2">
            <div className={cn("w-2 h-2 rounded-full", connected ? "bg-emerald-500" : "bg-red-500")} />
            <span className="text-neutral-400">
              {connected
                ? transport === 'supabase' ? 'Sessao Conectada' : 'Servidor Conectado'
                : sessionId === 'local' ? 'Sem sessao ativa' : 'Conectando sessao'}
            </span>
          </div>
          <Link
            to={sessionId === 'local' ? '/overlay' : `/overlay?session=${encodeURIComponent(sessionId)}`}
            target="_blank"
            className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm text-neutral-300 transition-colors"
          >
            <Radio className="w-4 h-4" />
            Abrir Overlay
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex items-center justify-center gap-2 w-full py-2 text-sm text-neutral-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-neutral-800 bg-neutral-950/50 flex items-center px-8">
          <h2 className="text-sm font-medium text-neutral-400">Painel de Administração</h2>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
