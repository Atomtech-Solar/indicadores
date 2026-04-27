import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { queryClient } from "@/lib/query-client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  role: "indicador" | "admin" | null;
  isAdmin: boolean;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"indicador" | "admin" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const roleFetchSeqRef = useRef(0);

  useEffect(() => {
    let isMounted = true;
    const fetchRole = async (hasUser: boolean) => {
      const fetchSeq = ++roleFetchSeqRef.current;

      if (!hasUser) {
        if (isMounted && fetchSeq === roleFetchSeqRef.current) setRole(null);
        return;
      }

      const { data, error } = await supabase.rpc("is_admin");

      if (!isMounted || fetchSeq !== roleFetchSeqRef.current) return;
      if (error) {
        setRole("indicador");
        return;
      }

      const resolvedRole = data === true ? "admin" : "indicador";
      setRole(resolvedRole);
    };

    const bootstrap = async () => {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (!isMounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      await fetchRole(Boolean(initialSession?.user));
      setIsLoading(false);
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      void fetchRole(Boolean(nextSession?.user));

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
      role,
      isAdmin: role === "admin",
      isLoading,
    }),
    [session, user, role, isLoading],
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
