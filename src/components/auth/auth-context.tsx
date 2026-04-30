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
  /** Sessão inicial lida e papel resolvido (ou usuário ausente). */
  authReady: boolean;
  /** @deprecated use authReady — mantido para compatibilidade (equivale a !authReady) */
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"indicador" | "admin" | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const roleFetchSeqRef = useRef(0);
  const lastUserIdRef = useRef<string | null>(null);
  const roleCacheRef = useRef<Map<string, "indicador" | "admin">>(new Map());
  /** Recarga por atalho (F5 / Ctrl+R / Cmd+R): não limpa sessão no pagehide. Botão do browser ainda pode encerrar sessão. */
  const reloadViaKeyboardRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const resolveRole = async (authUserId: string | null) => {
      const seq = ++roleFetchSeqRef.current;

      if (!authUserId) {
        if (!isMounted || seq !== roleFetchSeqRef.current) return;
        setRole(null);
        return;
      }

      const cachedRole = roleCacheRef.current.get(authUserId);
      if (cachedRole) {
        if (!isMounted || seq !== roleFetchSeqRef.current) return;
        setRole(cachedRole);
        return;
      }

      const { data, error } = await supabase.rpc("is_admin");
      if (!isMounted || seq !== roleFetchSeqRef.current) return;

      if (error) {
        setRole("indicador");
        return;
      }

      const resolvedRole = data === true ? "admin" : "indicador";
      roleCacheRef.current.set(authUserId, resolvedRole);
      setRole(resolvedRole);
    };

    const finishBootstrap = () => {
      if (isMounted) setAuthReady(true);
    };

    const bootstrap = async () => {
      setAuthReady(false);
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      const uid = initialSession?.user?.id ?? null;
      lastUserIdRef.current = uid;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (!uid) {
        setRole(null);
        finishBootstrap();
        return;
      }

      setRole(null);
      await resolveRole(uid);
      finishBootstrap();
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      const nextId = nextSession?.user?.id ?? null;
      const prevId = lastUserIdRef.current;

      if (nextId !== prevId) {
        lastUserIdRef.current = nextId;
        setAuthReady(false);
        setRole(null);
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextId) {
        setRole(null);
        setAuthReady(true);
        void queryClient.invalidateQueries({ queryKey: ["auth"] });
        void queryClient.invalidateQueries({ queryKey: ["usuario"] });
        return;
      }

      if (nextId === prevId) {
        const cachedRole = roleCacheRef.current.get(nextId);
        if (cachedRole) {
          setRole(cachedRole);
          setAuthReady(true);
          return;
        }
      }

      await resolveRole(nextId);
      setAuthReady(true);

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        reloadViaKeyboardRef.current = true;
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R")) {
        reloadViaKeyboardRef.current = true;
      }
    };
    const onPageHide = (ev: PageTransitionEvent) => {
      if (ev.persisted) return;
      if (reloadViaKeyboardRef.current) {
        reloadViaKeyboardRef.current = false;
        return;
      }
      void supabase.auth.signOut({ scope: "local" });
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  useEffect(() => {
    const refreshCache = () => {
      void queryClient.invalidateQueries();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshCache();
      }
    };
    window.addEventListener("focus", refreshCache);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", refreshCache);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      role,
      isAdmin: role === "admin",
      authReady,
      isLoading: !authReady,
    }),
    [session, user, role, authReady],
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
