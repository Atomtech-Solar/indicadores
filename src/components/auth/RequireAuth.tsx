import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/components/auth/auth-context";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (user) return;

    void navigate({
      to: "/login",
      search: { redirect: `${location.pathname}${location.searchStr}` },
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
