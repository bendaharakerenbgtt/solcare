import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { repo } from '../data';
import type { StaffUser } from '../data/types';

interface AuthState {
  user: StaffUser | null;
  ready: boolean;
  needsSetup: boolean;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [ready, setReady] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  const refresh = useCallback(async () => {
    setNeedsSetup(await repo.needsSetup());
    setUser(await repo.currentUser());
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value: AuthState = {
    user,
    ready,
    needsSetup,
    refresh,
    signIn: async (e, p) => {
      setUser(await repo.signIn(e, p));
    },
    signOut: async () => {
      await repo.signOut();
      setUser(null);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}
