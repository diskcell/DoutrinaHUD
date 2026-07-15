import { FormEvent, useEffect, useState } from 'react';
import { LoaderCircle, LockKeyhole, UserPlus } from 'lucide-react';

interface Props { children: React.ReactNode }

export function AuthGate({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then((response) => response.json()).then((data) => setAuthenticated(Boolean(data.user))).catch(() => setAuthenticated(false)).finally(() => setLoading(false));
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmitting(true); setError('');
    try {
      const response = await fetch(`/api/auth/${registering ? 'register' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.get('email'), password: data.get('password'), displayName: data.get('displayName') }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nao foi possivel entrar.');
      setAuthenticated(true);
    } catch (requestError: any) { setError(requestError.message); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-emerald-400"><LoaderCircle className="w-6 h-6 animate-spin" /></div>;
  if (authenticated) return <>{children}</>;

  return <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
    <form onSubmit={submit} className="w-full max-w-md border border-neutral-800 bg-neutral-900 p-7 rounded-lg space-y-5">
      <div><h1 className="text-2xl font-bold">Doutrina<span className="text-emerald-400">HUD</span></h1><p className="text-sm text-neutral-400 mt-2">{registering ? 'Crie seu workspace privado para transmissao.' : 'Entre para gerenciar suas transmissoes.'}</p></div>
      {registering && <label className="block text-sm text-neutral-300">Nome<input name="displayName" required minLength={2} className="mt-1.5 w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2.5" /></label>}
      <label className="block text-sm text-neutral-300">Email<input name="email" type="email" required className="mt-1.5 w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2.5" /></label>
      <label className="block text-sm text-neutral-300">Senha<input name="password" type="password" required minLength={8} className="mt-1.5 w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2.5" /></label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button disabled={submitting} className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded py-2.5 font-bold flex items-center justify-center gap-2 disabled:opacity-60">{registering ? <UserPlus className="w-4 h-4" /> : <LockKeyhole className="w-4 h-4" />}{submitting ? 'Aguarde...' : registering ? 'Criar conta' : 'Entrar'}</button>
      <button type="button" onClick={() => { setRegistering(!registering); setError(''); }} className="w-full text-sm text-neutral-400 hover:text-white">{registering ? 'Ja tenho uma conta' : 'Criar minha conta'}</button>
    </form>
  </main>;
}
