import { useState, useEffect } from 'react';
import { Search, Plus, MapPin, Edit2, Trash2, Users, ShieldAlert, DownloadCloud } from 'lucide-react';
import { cn } from '../components/AdminLayout';
import { TeamFormModal, Team } from '../components/TeamFormModal';
import { isSupabaseConfigured, requireSupabase } from '../../lib/supabase';
import { useOptionalCloudSession } from '../context/CloudSessionContext';
import { deleteCloudTeam, listCloudTeams } from '../lib/cloudData';

interface TeamWithMeta extends Team {
  id: number;
  created_at: string;
}

const TEAM_CREATE_MODAL_STATE_KEY = 'doutrinahud_team_create_modal_open';

export function Teams() {
  const cloudSession = useOptionalCloudSession();
  const [teams, setTeams] = useState<TeamWithMeta[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(
    () => sessionStorage.getItem(TEAM_CREATE_MODAL_STATE_KEY) === '1'
  );
  const [editingTeam, setEditingTeam] = useState<TeamWithMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [importingTeamId, setImportingTeamId] = useState<number | null>(null);

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      if (isSupabaseConfigured && cloudSession) {
        setTeams(await listCloudTeams(cloudSession.workspaceId) as TeamWithMeta[]);
        return;
      }

      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [cloudSession?.workspaceId]);

  const handleDelete = async (id: number) => {
    if (!confirm('Você tem certeza que deseja deletar este time? Esta ação não pode ser desfeita.')) return;
    try {
      if (isSupabaseConfigured && cloudSession) {
        await deleteCloudTeam(cloudSession.workspaceId, id);
        await fetchTeams();
        return;
      }

      const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
      if (res.ok) fetchTeams();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEdit = (team: TeamWithMeta) => {
    sessionStorage.removeItem(TEAM_CREATE_MODAL_STATE_KEY);
    setEditingTeam(team);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    sessionStorage.setItem(TEAM_CREATE_MODAL_STATE_KEY, '1');
    setEditingTeam(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    sessionStorage.removeItem(TEAM_CREATE_MODAL_STATE_KEY);
    setEditingTeam(null);
    setIsModalOpen(false);
  };

  const handleImportHltv = async (team: TeamWithMeta) => {
    const hltvUrl =
      team.hltv_url ||
      prompt('Cole a URL do time no HLTV:', `https://www.hltv.org/team/`);

    if (!hltvUrl) return;

    try {
      setImportingTeamId(team.id);

      if (isSupabaseConfigured) {
        const { data, error } = await requireSupabase().functions.invoke('import-hltv-team', {
          body: { teamId: team.id, hltvUrl },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Erro ao importar jogadores do HLTV.');

        const withoutAvatar = data.players.filter((player: any) => !player.avatar_path).length;
        alert(
          `HLTV importado: ${data.players.length} jogadores processados.` +
            (withoutAvatar > 0
              ? `\n${withoutAvatar} jogador(es) vieram sem foto.`
              : '')
        );
        await fetchTeams();
        return;
      }

      const res = await fetch('/api/hltv/import-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: team.id,
          hltvUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || 'Erro ao importar jogadores do HLTV.');
        return;
      }

      const withoutAvatar = data.players.filter((player: any) => !player.avatar).length;
      alert(
        `HLTV importado: ${data.players.length} jogadores processados.` +
          (withoutAvatar > 0
            ? `\n${withoutAvatar} jogador(es) vieram sem foto por bloqueio/ausencia de imagem.`
            : '')
      );
      fetchTeams();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Erro de rede ao importar jogadores do HLTV.');
    } finally {
      setImportingTeamId(null);
    }
  };

  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.tag?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white m-0">Gerenciar Times</h1>
          <p className="text-neutral-400 text-sm mt-1">Controle as equipes participantes da competição.</p>
        </div>
        
        <button 
          onClick={handleCreate}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo Time
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 bg-neutral-900/50 p-2.5 rounded-xl border border-neutral-800">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou tag..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-11 pr-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
          />
        </div>
        <div className="pr-2 text-sm text-neutral-500 font-medium">
          {filteredTeams.length} times
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto bg-neutral-950/20 rounded-xl border border-neutral-900 p-2">
        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-neutral-500">Carregando times...</div>
        ) : filteredTeams.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-neutral-500 bg-neutral-900/30 rounded-xl border border-neutral-800/50 border-dashed m-2">
            <Users className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium text-neutral-400">Nenhum time encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTeams.map(team => (
              <div key={team.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-colors group flex flex-col">
                <div className="p-5 flex-1 hover:bg-neutral-800/20 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-16 h-16 rounded-xl bg-neutral-950 flex flex-col items-center justify-center p-2.5 shrink-0 border border-neutral-800 shadow-inner">
                        {team.logo ? (
                          <img src={team.logo} alt={team.name} className="w-full h-full object-contain drop-shadow-md" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        ) : (
                          <ShieldAlert className="w-8 h-8 text-neutral-700" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 shrink-0">
                          <h3 className="text-lg font-black text-white leading-tight truncate" title={team.name}>{team.name}</h3>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0",
                            team.status === 'active' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20"
                          )}>
                            {team.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <p className="text-emerald-500 font-mono text-xs font-bold tracking-widest uppercase">[{team.tag || 'SEM TAG'}]</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4 text-sm bg-neutral-950 p-3 rounded-lg border border-neutral-800/60">
                    <div className="flex flex-col space-y-0.5 min-w-0">
                      <span className="text-neutral-500 font-bold text-[10px] uppercase tracking-wider">País</span>
                      <div className="flex items-center gap-1.5 text-neutral-300">
                        <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <span className="truncate text-xs font-medium">{team.country || '-'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-0.5 min-w-0">
                      <span className="text-neutral-500 font-bold text-[10px] uppercase tracking-wider">Org</span>
                      <div className="flex items-center gap-1.5 text-neutral-300">
                        <span className="truncate text-xs font-medium">{team.organization || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2.5 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-neutral-600 font-mono">ID: {team.id}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleImportHltv(team)}
                      disabled={importingTeamId === team.id}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <DownloadCloud className="w-3.5 h-3.5" />
                      {importingTeamId === team.id ? 'Importando...' : 'HLTV'}
                    </button>
                    <button 
                      onClick={() => handleEdit(team)}
                      className="px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 rounded flex items-center gap-1.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(team.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-red-500/80 hover:text-red-400 hover:bg-red-500/10 rounded flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TeamFormModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialData={editingTeam}
        onSaved={fetchTeams}
      />
    </div>
  );
}
