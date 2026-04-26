import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { queryClient } from "@/lib/query-client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (!isMounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setIsLoading(false);
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      void queryClient.invalidateQueries({ queryKey: ["auth"] });
      void queryClient.invalidateQueries({ queryKey: ["usuario"] });
      void queryClient.invalidateQueries({ queryKey: ["indicacoes"] });
      void queryClient.invalidateQueries({ queryKey: ["comissoes"] });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      isLoading,
    }),
    [session, user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return context;
}
