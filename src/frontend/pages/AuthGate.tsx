import { FormEvent, useCallback, useEffect, useState } from 'react';
import { KeyRound, LoaderCircle, LockKeyhole, Mail, UserPlus } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, requireSupabase } from '../../lib/supabase';
import {
  CloudSessionProvider,
  type CloudSession,
} from '../context/CloudSessionContext';

interface Props { children: React.ReactNode }

function LegacyAuthGate({ children }: Props) {
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

function SupabaseAuthGate({ children }: Props) {
  type AuthView = 'login' | 'register' | 'forgot-password' | 'reset-password';

  const recoveryRedirect = new URLSearchParams(window.location.search).get('recovery') === '1';
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<CloudSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<AuthView>(recoveryRedirect ? 'reset-password' : 'login');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadAccount = useCallback(async (activeUser: User) => {
    const client = requireSupabase();
    const [profileResult, membershipResult] = await Promise.all([
      client
        .from('profiles')
        .select('display_name')
        .eq('id', activeUser.id)
        .single(),
      client
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', activeUser.id)
        .limit(1)
        .single(),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (membershipResult.error) throw membershipResult.error;

    const membership = membershipResult.data as {
      workspace_id: string;
      role: CloudSession['role'];
    };
    const workspaceResult = await client
      .from('workspaces')
      .select('id, name')
      .eq('id', membership.workspace_id)
      .single();

    if (workspaceResult.error) throw workspaceResult.error;

    setAccount({
      user: activeUser,
      displayName: profileResult.data.display_name,
      workspaceId: workspaceResult.data.id,
      workspaceName: workspaceResult.data.name,
      role: membership.role,
    });
  }, []);

  useEffect(() => {
    const client = requireSupabase();

    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('reset-password');
        setAccount(null);
        setUser(session?.user || null);
        setLoading(false);
        return;
      }

      setUser(session?.user || null);
      if (!session?.user) {
        setAccount(null);
        setLoading(false);
      }
    });

    const initializeSession = async () => {
      const query = new URLSearchParams(window.location.search);
      const tokenHash = query.get('token_hash');
      const recoveryType = query.get('type');

      if (recoveryRedirect && tokenHash && recoveryType === 'recovery') {
        const { data, error: verificationError } = await client.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });

        if (verificationError) {
          setError('Este link de recuperacao expirou ou ja foi utilizado. Solicite um novo link.');
          setLoading(false);
          return;
        }

        setUser(data.user || data.session?.user || null);
        setLoading(false);
        return;
      }

      const { data } = await client.auth.getSession();
      setUser(data.session?.user || null);
      if (!data.session?.user || recoveryRedirect) setLoading(false);
    };

    void initializeSession();

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || view === 'reset-password') return;

    setLoading(true);
    loadAccount(user)
      .catch((accountError) => {
        console.error(accountError);
        setError('Sua conta existe, mas o workspace nao pôde ser carregado.');
      })
      .finally(() => setLoading(false));
  }, [loadAccount, user, view]);

  const switchView = (nextView: AuthView) => {
    setView(nextView);
    setError('');
    setNotice('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    const confirmPassword = String(data.get('confirmPassword') || '');
    const displayName = String(data.get('displayName') || '').trim();
    const client = requireSupabase();

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      if (view === 'forgot-password') {
        const { error: recoveryError } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${window.location.pathname}`,
        });

        if (recoveryError) throw recoveryError;

        setNotice('Se este email estiver cadastrado, enviaremos um link para redefinir sua senha. Confira tambem a caixa de spam.');
        return;
      }

      if (view === 'reset-password') {
        if (!user) {
          throw new Error('Este link de recuperacao expirou ou ja foi utilizado. Solicite um novo link.');
        }

        if (password !== confirmPassword) {
          throw new Error('As senhas informadas nao sao iguais.');
        }

        const { error: updateError } = await client.auth.updateUser({ password });
        if (updateError) throw updateError;

        await client.auth.signOut();
        window.history.replaceState(null, '', `${window.location.pathname}#/admin`);
        setView('login');
        setNotice('Senha redefinida com sucesso. Entre usando sua nova senha.');
        return;
      }

      if (view === 'register') {
        const { data: signupData, error: signupError } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: `${window.location.origin}${window.location.pathname}#/admin`,
          },
        });

        if (signupError) throw signupError;

        if (!signupData.session) {
          setNotice('Conta criada. Confira seu email para confirmar o cadastro.');
          setView('login');
        }
      } else {
        const { error: loginError } = await client.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) throw loginError;
      }
    } catch (requestError: any) {
      setError(requestError?.message || 'Nao foi possivel entrar.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-emerald-400"><LoaderCircle className="w-6 h-6 animate-spin" /></div>;
  }

  if (account) {
    return <CloudSessionProvider value={account}>{children}</CloudSessionProvider>;
  }

  const isRegistering = view === 'register';
  const isForgotPassword = view === 'forgot-password';
  const isResetPassword = view === 'reset-password';

  const heading = isRegistering
    ? 'Crie seu workspace privado para transmissao.'
    : isForgotPassword
      ? 'Informe seu email para receber o link de recuperacao.'
      : isResetPassword
        ? 'Escolha uma nova senha para sua conta.'
        : 'Entre para gerenciar suas transmissoes.';

  return <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
    <form onSubmit={submit} className="w-full max-w-md border border-neutral-800 bg-neutral-900 p-7 rounded-lg space-y-5">
      <div><h1 className="text-2xl font-bold">Doutrina<span className="text-emerald-400">HUD</span></h1><p className="text-sm text-neutral-400 mt-2">{heading}</p></div>
      {isRegistering && <label className="block text-sm text-neutral-300">Nome<input name="displayName" required minLength={2} autoComplete="name" className="mt-1.5 w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2.5" /></label>}
      {!isResetPassword && <label className="block text-sm text-neutral-300">Email<input name="email" type="email" required autoComplete="email" className="mt-1.5 w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2.5" /></label>}
      {!isForgotPassword && <label className="block text-sm text-neutral-300">{isResetPassword ? 'Nova senha' : 'Senha'}<input name="password" type="password" required minLength={8} autoComplete={isResetPassword ? 'new-password' : isRegistering ? 'new-password' : 'current-password'} className="mt-1.5 w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2.5" /></label>}
      {isResetPassword && <label className="block text-sm text-neutral-300">Confirme a nova senha<input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className="mt-1.5 w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2.5" /></label>}
      {view === 'login' && <button type="button" onClick={() => switchView('forgot-password')} className="text-sm text-emerald-400 hover:text-emerald-300">Esqueci minha senha</button>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {notice && <p className="text-sm text-emerald-400">{notice}</p>}
      <button disabled={submitting} className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded py-2.5 font-bold flex items-center justify-center gap-2 disabled:opacity-60">
        {isRegistering ? <UserPlus className="w-4 h-4" /> : isForgotPassword ? <Mail className="w-4 h-4" /> : isResetPassword ? <KeyRound className="w-4 h-4" /> : <LockKeyhole className="w-4 h-4" />}
        {submitting ? 'Aguarde...' : isRegistering ? 'Criar conta' : isForgotPassword ? 'Enviar link de recuperacao' : isResetPassword ? 'Salvar nova senha' : 'Entrar'}
      </button>
      {view === 'login'
        ? <button type="button" onClick={() => switchView('register')} className="w-full text-sm text-neutral-400 hover:text-white">Criar minha conta</button>
        : !isResetPassword && <button type="button" onClick={() => switchView('login')} className="w-full text-sm text-neutral-400 hover:text-white">Voltar para entrar</button>}
    </form>
  </main>;
}

export function AuthGate(props: Props) {
  return isSupabaseConfigured
    ? <SupabaseAuthGate {...props} />
    : <LegacyAuthGate {...props} />;
}
