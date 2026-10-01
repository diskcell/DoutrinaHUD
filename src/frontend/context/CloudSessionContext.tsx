import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';

export interface CloudSession {
  user: User;
  displayName: string;
  workspaceId: string;
  workspaceName: string;
  role: 'owner' | 'editor' | 'viewer';
}

const CloudSessionContext = createContext<CloudSession | null>(null);

export function CloudSessionProvider({
  value,
  children,
}: {
  value: CloudSession;
  children: ReactNode;
}) {
  return (
    <CloudSessionContext.Provider value={value}>
      {children}
    </CloudSessionContext.Provider>
  );
}

export function useOptionalCloudSession() {
  return useContext(CloudSessionContext);
}

export function useCloudSession() {
  const session = useOptionalCloudSession();

  if (!session) {
    throw new Error('Sessao Supabase indisponivel.');
  }

  return session;
}
