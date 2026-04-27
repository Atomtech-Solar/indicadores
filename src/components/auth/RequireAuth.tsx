import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/components/auth/auth-context";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const isRedirectingRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      isRedirectingRef.current = false;
      return;
    }

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
  }, [isLoading, user, navigate, location.pathname, location.searchStr]);

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <p className="text-sm text-muted-foreground">Verificando autenticação...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
