import { Outlet, Link, useLocation } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { LayoutDashboard, Users, Trophy, Radio, Settings, ShieldAlert } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function AdminLayout() {
  const { connected } = useSocket();
  const location = useLocation();

  const menu = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { name: 'Partidas', icon: Trophy, path: '/admin/matches' },
    { name: 'Times', icon: Users, path: '/admin/teams' },
    { name: 'Jogadores', icon: Users, path: '/admin/players' },
    { name: 'Live Control', icon: Radio, path: '/admin/live' },
    { name: 'Configurações', icon: Settings, path: '/admin/settings' },
  ];

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
          <div className="flex items-center gap-3 text-sm px-2">
            <div className={cn("w-2 h-2 rounded-full", connected ? "bg-emerald-500" : "bg-red-500")} />
            <span className="text-neutral-400">
              {connected ? 'Servidor Conectado' : 'Desconectado'}
            </span>
          </div>
          <Link to="/overlay" target="_blank" className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-sm text-neutral-300 transition-colors">
            <Radio className="w-4 h-4" />
            Abrir Overlay
          </Link>
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
