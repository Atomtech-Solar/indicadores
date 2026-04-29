import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-context";
import { resolvePostLoginDestination } from "@/lib/auth-routes";

type LoginSearch = { redirect?: string; email?: string };

function sanitizeRedirect(redirect?: string): string | undefined {
  if (!redirect) return undefined;
  const value = redirect.trim();
  if (!value.startsWith("/")) return undefined;
  if (value === "/login" || value.startsWith("/login?")) return undefined;
  return value;
}

export const Route = createFileRoute("/login")({
  validateSearch: (raw: Record<string, unknown>): LoginSearch => ({
    redirect: typeof raw.redirect === "string" ? raw.redirect : undefined,
    email: typeof raw.email === "string" ? raw.email : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar com e-mail e senha — ATOM TECH" },
      { name: "description", content: "Acesse sua conta com e-mail e senha após confirmar o cadastro." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { redirect, email: emailFromSearch } = Route.useSearch();
  const safeRedirect = sanitizeRedirect(redirect);
  const { user, isAdmin, authReady } = useAuth();
  const [email, setEmail] = useState(emailFromSearch ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authReady || !user) return;
    const destination = resolvePostLoginDestination({ isAdmin, redirect: safeRedirect });
    void navigate({ to: destination, replace: true });
  }, [authReady, user, isAdmin, safeRedirect, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Informe e-mail e senha.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("email not confirmed") || message.includes("not confirmed")) {
          toast.error("Confirme seu e-mail com o código OTP antes de entrar.");
        } else {
          toast.error("Credenciais inválidas. Verifique e tente novamente.");
        }
        return;
      }

      const { data: isAdminRpc } = await supabase.rpc("is_admin");
      const destination = resolvePostLoginDestination({
        isAdmin: isAdminRpc === true,
        redirect: safeRedirect,
      });

      navigate({ to: destination, replace: true });
    } catch {
      toast.error("Não foi possível entrar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen grid place-items-center px-6 bg-gradient-hero">
        <p className="text-sm text-muted-foreground">Verificando sessão…</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen grid place-items-center px-6 bg-gradient-hero">
        <p className="text-sm text-muted-foreground">Redirecionando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <header className="px-6 py-5">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </header>

      <div className="flex-1 grid place-items-center px-6 pb-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-card">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Entrar</h1>
            <p className="text-sm text-muted-foreground mt-2">Use seu e-mail e senha para acessar sua conta</p>
          </div>

          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <div>
              <Label htmlFor="login-email" className="text-sm font-medium">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@email.com"
                className="mt-1.5 rounded-[10px] h-11"
              />
            </div>
            <div>
              <Label htmlFor="login-password" className="text-sm font-medium">Senha</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Sua senha"
                className="mt-1.5 rounded-[10px] h-11"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-xl h-12 text-base font-semibold mt-2">
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-6">
            Ainda não confirmou cadastro?{" "}
            <Link to="/cadastro" search={{ redirect: safeRedirect }} className="text-primary font-semibold hover:underline">
              Cadastrar e confirmar código
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
