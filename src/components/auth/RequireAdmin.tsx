import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/components/auth/auth-context";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";

/** Rotas exclusivas do administrador — indicadores são redirecionados para /dashboard. */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
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

    if (!isAdmin) {
      if (isRedirectingRef.current) return;
      isRedirectingRef.current = true;
      void navigate({ to: "/dashboard", replace: true });
      return;
    }

    isRedirectingRef.current = false;
  }, [authReady, user, isAdmin, navigate, location.pathname, location.searchStr]);

  if (!authReady) {
    return <AuthLoadingScreen active message="Validando permissões…" />;
  }

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return <AuthLoadingScreen active={false} message="Redirecionando para o painel do indicador…" />;
  }

  return <>{children}</>;
}
