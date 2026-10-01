import React, { useState, useEffect, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import { cn } from './AdminLayout';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useOptionalCloudSession } from '../context/CloudSessionContext';
import { uploadCloudImage } from '../lib/cloudAssets';
import { saveCloudTeam } from '../lib/cloudData';

export interface Team {
  id?: number;
  name: string;
  tag: string;
  logo: string;
  country: string;
  organization: string;
  social_links: string;
  status: string;
  hltv_url?: string;
  logo_path?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: Team | null;
}

const emptyTeam: Team = {
  name: '',
  tag: '',
  logo: '',
  country: '',
  organization: '',
  social_links: '',
  status: 'active',
  hltv_url: ''
};

const TEAM_CREATE_DRAFT_KEY = 'doutrinahud_team_create_draft';

function readStoredTeamDraft() {
  try {
    const stored = sessionStorage.getItem(TEAM_CREATE_DRAFT_KEY);
    return stored ? normalizeTeamFormData(JSON.parse(stored)) : emptyTeam;
  } catch {
    return emptyTeam;
  }
}

function storeTeamDraft(team: Team) {
  try {
    sessionStorage.setItem(TEAM_CREATE_DRAFT_KEY, JSON.stringify(team));
  } catch {
    // Imagens muito grandes podem ultrapassar o limite do sessionStorage.
  }
}

function normalizeTeamFormData(team?: Partial<Team> | null): Team {
  return {
    id: team?.id,
    name: team?.name || '',
    tag: team?.tag || '',
    logo: team?.logo || '',
    country: team?.country || '',
    organization: team?.organization || '',
    social_links: team?.social_links || '',
    status: team?.status || 'active',
    hltv_url: team?.hltv_url || ''
  };
}

export function TeamFormModal({ isOpen, onClose, onSaved, initialData }: Props) {
  const cloudSession = useOptionalCloudSession();
  const [formData, setFormData] = useState<Team>(emptyTeam);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(initialData ? normalizeTeamFormData(initialData) : readStoredTeamDraft());
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const nextFormData = { ...formData, [e.target.name]: e.target.value };
    setFormData(nextFormData);
    if (!initialData) storeTeamDraft(nextFormData);
  };

  const handleClose = () => {
    if (!initialData) sessionStorage.removeItem(TEAM_CREATE_DRAFT_KEY);
    onClose();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limite para base64 seguro no SQLite
        alert('A imagem deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const nextFormData = { ...formData, logo: reader.result as string };
        setFormData(nextFormData);
        if (!initialData) storeTeamDraft(nextFormData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isEdit = !!initialData?.id;
      if (isSupabaseConfigured && cloudSession) {
        let logoPath = initialData?.logo_path || null;

        if (formData.logo.startsWith('data:image')) {
          logoPath = await uploadCloudImage(cloudSession.workspaceId, 'teams', formData.logo);
        }

        await saveCloudTeam(
          cloudSession.workspaceId,
          {
            name: formData.name.trim(),
            tag: formData.tag.trim(),
            logo_path: logoPath,
            country: formData.country.trim() || null,
            organization: formData.organization.trim() || null,
            social_links: formData.social_links.trim() || null,
            status: formData.status,
            hltv_url: formData.hltv_url?.trim() || null,
          },
          initialData?.id
        );

        sessionStorage.removeItem(TEAM_CREATE_DRAFT_KEY);
        onSaved();
        onClose();
        return;
      }

      // Note: we use absolute API path relative to origin. 
      // This ensures we always hit our node server when running locally.
      const url = isEdit ? `/api/teams/${initialData.id}` : '/api/teams';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        sessionStorage.removeItem(TEAM_CREATE_DRAFT_KEY);
        onSaved();
        onClose();
      } else {
        const result = await res.json().catch(() => null);
        alert(result?.error || 'Erro ao salvar time.');
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Erro de rede ao salvar time.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 shrink-0">
          <h2 className="text-lg font-bold text-white tracking-tight">
            {initialData ? 'Editar Time' : 'Novo Time'}
          </h2>
          <button 
            onClick={handleClose}
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
                  "w-32 h-32 rounded-xl flex items-center justify-center border-2 border-dashed bg-neutral-950 overflow-hidden cursor-pointer group relative transition-colors shadow-inner",
                  formData.logo ? "border-emerald-500/50" : "border-neutral-700 hover:border-emerald-500/50 hover:bg-neutral-900"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                {formData.logo ? (
                  <>
                    <img src={formData.logo} alt="Logo" className="w-full h-full object-contain p-2" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                      <Upload className="w-6 h-6 text-white mb-1 shadow-sm" />
                      <span className="text-xs text-white font-medium drop-shadow-md">Alterar Logo</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-neutral-500 group-hover:text-emerald-500 transition-colors">
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-xs font-medium">Upload (Max 2MB)</span>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/png, image/jpeg, image/svg+xml"
                onChange={handleLogoUpload}
              />
              <span className="text-[11px] text-neutral-500 font-mono">PNG/SVG Transparente Recomendado</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Nome Oficial *</label>
              <input 
                required 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium" 
                placeholder="Ex: FURIA Esports" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">TAG (Curta) *</label>
              <input 
                required 
                name="tag" 
                maxLength={6} 
                value={formData.tag} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all uppercase font-black tracking-widest" 
                placeholder="Ex: FUR" 
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
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Organização</label>
              <input 
                name="organization" 
                value={formData.organization} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" 
                placeholder="Ex: Furia Esports LLC" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Redes Sociais</label>
              <input 
                name="social_links" 
                value={formData.social_links} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono" 
                placeholder="@furia (X/Insta)" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Status</label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleChange} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none cursor-pointer font-medium"
              >
                <option value="active">Ativo (Na Competição)</option>
                <option value="inactive">Inativo (Desclassificado/Removido)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">URL do time no HLTV</label>
            <input
              name="hltv_url"
              value={formData.hltv_url || ''}
              onChange={handleChange}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
              placeholder="Ex: https://www.hltv.org/team/8297/furia"
            />
            <p className="text-[11px] text-neutral-500">
              Usado para importar jogadores e fotos automaticamente para o banco local.
            </p>
          </div>
          
          <div className="pt-2"></div>
        </form>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-neutral-800 shrink-0 bg-neutral-900/50">
          <button 
            type="button" 
            onClick={handleClose}
            className="px-5 py-2.5 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-emerald-900/20 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Salvando...' : (initialData ? 'Salvar Alterações' : 'Cadastrar Time')}
          </button>
        </div>
      </div>
    </div>
  );
}
