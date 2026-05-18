import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, User } from 'lucide-react';
import { cn } from './AdminLayout';

export interface Player {
  id?: number;
  team_id: number | '';
  nickname: string;
  real_name: string;
  avatar: string;
  country: string;
  role: string;
  steam_link: string;
  faceit_link: string;
  status: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (player: Player) => void;
  initialData?: Player | null;
  teams: any[];
}

export function PlayerFormModal({ isOpen, onClose, onSaved, initialData, teams }: Props) {
  const [formData, setFormData] = useState<Player>({
    team_id: '',
    nickname: '',
    real_name: '',
    avatar: '',
    country: '',
    role: '',
    steam_link: '',
    faceit_link: '',
    status: 'active'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        team_id: '',
        nickname: '',
        real_name: '',
        avatar: '',
        country: '',
        role: '',
        steam_link: '',
        faceit_link: '',
        status: 'active'
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate save operational structure
    onSaved(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
      >
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 shrink-0">
          <h2 className="text-lg font-bold text-white tracking-tight">
            {initialData ? 'Editar Jogador' : 'Novo Jogador'}
          </h2>
          <button 
            type="button"
            onClick={onClose} 
            className="text-neutral-400 hover:text-white p-1 hover:bg-neutral-800 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="flex justify-center">
            <div className="flex flex-col items-center gap-3">
              <div 
                className={cn(
                  "w-32 h-32 rounded-full flex items-center justify-center border-2 border-dashed bg-neutral-950 overflow-hidden cursor-pointer group relative transition-colors shadow-inner",
                  formData.avatar ? "border-emerald-500/50" : "border-neutral-700 hover:border-emerald-500/50 hover:bg-neutral-900"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                {formData.avatar ? (
                  <>
                    <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                      <Upload className="w-6 h-6 text-white mb-1 shadow-sm" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-neutral-500 group-hover:text-emerald-500 transition-colors">
                    <User className="w-8 h-8 mb-2" />
                    <span className="text-xs font-medium">Avatar</span>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/png, image/jpeg, image/webp"
                onChange={handleAvatarUpload}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Nickname *</label>
              <input 
                required 
                name="nickname" 
                value={formData.nickname} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-bold" 
                placeholder="Ex: coldzera" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Nome Real</label>
              <input 
                name="real_name" 
                value={formData.real_name} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" 
                placeholder="Ex: Marcelo David" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">País / Região</label>
              <input 
                name="country" 
                value={formData.country} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" 
                placeholder="Ex: Brasil" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Função (Role)</label>
              <select 
                name="role" 
                value={formData.role} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">Selecione uma função</option>
                <option value="AWP">AWP</option>
                <option value="Entry">Entry</option>
                <option value="Support">Support</option>
                <option value="IGL">IGL</option>
                <option value="Lurker">Lurker</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
             <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Time</label>
              <select 
                name="team_id" 
                value={formData.team_id} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">Sem Time</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name} [{team.tag}]</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Steam Link</label>
              <input 
                name="steam_link" 
                value={formData.steam_link} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono" 
                placeholder="https://steamcommunity.com/id/..." 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Faceit Link</label>
              <input 
                name="faceit_link" 
                value={formData.faceit_link} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono" 
                placeholder="https://faceit.com/en/players/..." 
              />
            </div>
          </div>
          
           <div className="grid grid-cols-1 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Status</label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none cursor-pointer font-medium"
              >
                <option value="active">Ativo (Titular/Reserva)</option>
                <option value="inactive">Inativo (Benched/Afastado)</option>
              </select>
            </div>
          </div>
          
          <div className="pt-2"></div>
        </form>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-neutral-800 shrink-0 bg-neutral-900/50">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2.5 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-emerald-900/20 flex items-center gap-2"
          >
            {initialData ? 'Salvar Alterações' : 'Cadastrar Jogador'}
          </button>
        </div>
      </div>
    </div>
  );
}
