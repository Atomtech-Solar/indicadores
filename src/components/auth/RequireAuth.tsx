import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/components/auth/auth-context";

/** Rotas exclusivas do indicador — administradores são redirecionados para /admin. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, authReady } = useAuth();
  const isRedirectingRef = useRef(false);

  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      if (isRedirectingRef.current) return;
      isRedirectingRef.current = true;

      const currentPath = `${location.pathname}${location.searchStr}`;
      const shouldAttachRedirect =
        !currentPath.startsWith("/login") &&
        !currentPath.startsWith("/cadastro") &&
        !currentPath.startsWith("/confirmacao") &&
        !currentPath.startsWith("/confirmacao-cadastro");

      void navigate({
        to: "/login",
        search: shouldAttachRedirect ? { redirect: currentPath } : {},
        replace: true,
      });
      return;
    }

    if (isAdmin) {
      if (isRedirectingRef.current) return;
      isRedirectingRef.current = true;
      void navigate({ to: "/admin", replace: true });
      return;
    }

    isRedirectingRef.current = false;
  }, [authReady, user, isAdmin, navigate, location.pathname, location.searchStr]);

  if (!authReady) {
    return (
      <div className="min-h-screen grid place-items-center px-6 bg-background">
        <p className="text-sm text-muted-foreground">Verificando autenticação…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center px-6 bg-background">
        <p className="text-sm text-muted-foreground">Redirecionando…</p>
      </div>
    );
  }

  return <>{children}</>;
}
