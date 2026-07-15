import { useState } from 'react';
import { Copy, ExternalLink, Plus, Radio } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

interface OnlineSession {
  id: string;
  token: string;
  createdAt: number;
}

function appUrl(path: string, sessionId: string) {
  const basePath = window.location.pathname.endsWith('/')
    ? window.location.pathname
    : `${window.location.pathname}/`;

  return `${window.location.origin}${basePath}#${path}?session=${encodeURIComponent(sessionId)}`;
}

export function Dashboard() {
  const { connected, sessionId } = useSocket();
  const [onlineSession, setOnlineSession] = useState<OnlineSession | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const copyValue = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedValue(label);
    window.setTimeout(() => setCopiedValue(null), 1800);
  };

  const createOnlineSession = async () => {
    setCreatingSession(true);

    try {
      const response = await fetch('/api/sessions', { method: 'POST' });

      if (!response.ok) {
        throw new Error('Nao foi possivel criar a sessao.');
      }

      setOnlineSession(await response.json());
    } catch (error) {
      console.error(error);
      alert('Nao foi possivel criar a sessao. Verifique se o servidor online esta conectado.');
    } finally {
      setCreatingSession(false);
    }
  };

  const overlayUrl = onlineSession ? appUrl('/overlay', onlineSession.id) : '';
  const controlUrl = onlineSession ? appUrl('/admin/live', onlineSession.id) : '';

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
                Sessao atual: <span className="font-mono text-neutral-200">{sessionId}</span>
                <span className={connected ? 'text-emerald-400' : 'text-amber-400'}>
                  {connected ? ' conectado' : ' aguardando servidor'}
                </span>
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
                <p className="text-xs uppercase tracking-wide text-neutral-500">Token do conector</p>
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
                <a
                  href={overlayUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir overlay
                </a>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
