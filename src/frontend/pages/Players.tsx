import { useState, useEffect } from 'react';
import { Search, Plus, MapPin, Edit2, Trash2, Users, User, ShieldAlert, Crosshair, ExternalLink } from 'lucide-react';
import { cn } from '../components/AdminLayout';
import { PlayerFormModal, Player } from '../components/PlayerFormModal';

interface PlayerWithMeta extends Player {
  id: number;
  created_at: string;
}

const MOCK_PLAYERS: PlayerWithMeta[] = [
  {
    id: 1,
    team_id: '',
    nickname: 'FalleN',
    real_name: 'Gabriel Toledo',
    avatar: '',
    country: 'Brasil',
    role: 'IGL',
    steam_link: 'https://steamcommunity.com/id/fallen',
    faceit_link: 'https://faceit.com/en/players/FalleN',
    status: 'active',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    team_id: '',
    nickname: 'KSCERATO',
    real_name: 'Kaike Cerato',
    avatar: '',
    country: 'Brasil',
    role: 'Lurker',
    steam_link: 'https://steamcommunity.com/id/kscerato',
    faceit_link: 'https://faceit.com/en/players/KSCERATO',
    status: 'active',
    created_at: new Date().toISOString()
  }
];

export function Players() {
  const [players, setPlayers] = useState<PlayerWithMeta[]>(MOCK_PLAYERS);
  const [teams, setTeams] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerWithMeta | null>(null);

  useEffect(() => {
    // Fetch real teams to relate to players visually
    fetch('/api/teams')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTeams(data);
      })
      .catch(console.error);
  }, []);

  const handleDelete = (id: number) => {
    if (!confirm('Você tem certeza que deseja deletar este jogador?')) return;
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const handleEdit = (player: PlayerWithMeta) => {
    setEditingPlayer(player);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingPlayer(null);
    setIsModalOpen(true);
  };

  const handleSave = (playerData: Player) => {
    if (playerData.id) {
       setPlayers(prev => prev.map(p => p.id === playerData.id ? { ...p, ...playerData } as PlayerWithMeta : p));
    } else {
       setPlayers(prev => [{ ...playerData, id: Date.now(), created_at: new Date().toISOString() } as PlayerWithMeta, ...prev]);
    }
  };

  const getTeamName = (teamId: number | '') => {
    const team = teams.find(t => t.id === Number(teamId));
    return team ? team.name : 'Sem Time';
  };

  const filteredPlayers = players.filter(p => 
    p.nickname.toLowerCase().includes(search.toLowerCase()) || 
    p.real_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white m-0">Gerenciar Jogadores</h1>
          <p className="text-neutral-400 text-sm mt-1">Controle o elenco e perfis dos jogadores (Modo Estrutura).</p>
        </div>
        
        <button 
          onClick={handleCreate}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo Jogador
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 bg-neutral-900/50 p-2.5 rounded-xl border border-neutral-800">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input 
            type="text" 
            placeholder="Buscar por nickname ou nome real..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-11 pr-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
          />
        </div>
        <div className="pr-2 text-sm text-neutral-500 font-medium">
          {filteredPlayers.length} jogadores
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto bg-neutral-950/20 rounded-xl border border-neutral-900 p-2">
        {filteredPlayers.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-neutral-500 bg-neutral-900/30 rounded-xl border border-neutral-800/50 border-dashed m-2">
            <Users className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium text-neutral-400">Nenhum jogador encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPlayers.map(player => (
              <div key={player.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-colors group flex flex-col relative">
                <div className="p-5 flex-1 hover:bg-neutral-800/20 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-16 h-16 rounded-full bg-neutral-950 flex flex-col items-center justify-center p-1 shrink-0 border border-neutral-800 shadow-inner overflow-hidden relative">
                        {player.avatar ? (
                          <img src={player.avatar} alt={player.nickname} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-neutral-700" />
                        )}
                        {!player.avatar && <div className="absolute bottom-0 w-full h-1/3 bg-neutral-800/50" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 shrink-0">
                          <h3 className="text-lg font-black text-white leading-tight truncate" title={player.nickname}>{player.nickname}</h3>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0",
                            player.status === 'active' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20"
                          )}>
                            {player.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <p className="text-neutral-400 text-xs font-medium truncate">{player.real_name || 'Nome Desconhecido'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm bg-neutral-950 p-3 rounded-lg border border-neutral-800/60">
                     <div className="flex flex-col space-y-1 min-w-0">
                      <span className="text-neutral-500 font-bold text-[10px] uppercase tracking-wider">Time</span>
                      <div className="flex items-center gap-1.5 text-neutral-300">
                        <ShieldAlert className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate text-xs font-bold text-emerald-500">{getTeamName(player.team_id)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-1 min-w-0">
                      <span className="text-neutral-500 font-bold text-[10px] uppercase tracking-wider">Role</span>
                      <div className="flex items-center gap-1.5 text-neutral-300">
                        <Crosshair className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <span className="truncate text-xs font-medium">{player.role || '-'}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-1 min-w-0 pt-2 mt-1 border-t border-neutral-800/50 col-span-2">
                       <div className="flex gap-4">
                        {player.steam_link ? (
                           <a href={player.steam_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors">
                              <ExternalLink className="w-3 h-3" /> Steam
                           </a>
                        ) : (
                           <span className="flex items-center gap-1 text-[11px] text-neutral-600">
                              <ExternalLink className="w-3 h-3 opacity-50" /> Sem Steam
                           </span>
                        )}
                        
                        {player.faceit_link ? (
                           <a href={player.faceit_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors">
                              <ExternalLink className="w-3 h-3" /> Faceit
                           </a>
                        ) : (
                           <span className="flex items-center gap-1 text-[11px] text-neutral-600">
                              <ExternalLink className="w-3 h-3 opacity-50" /> Sem Faceit
                           </span>
                        )}
                       </div>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2.5 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-neutral-600 font-mono">ID: {player.id}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleEdit(player)}
                      className="px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 rounded flex items-center gap-1.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(player.id)}
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

      <PlayerFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingPlayer}
        onSaved={handleSave}
        teams={teams}
      />
    </div>
  );
}
