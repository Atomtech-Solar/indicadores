import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase/client";

type LoginSearch = { redirect?: string; email?: string };

async function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  let timeoutId: number | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(errorMessage)), ms);
      }),
    ]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

function clearSupabaseLocalAuthStorage() {
  try {
    const localKeysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.includes("-auth-token")) {
        localKeysToRemove.push(key);
      }
    }
    localKeysToRemove.forEach((key) => localStorage.removeItem(key));

    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith("sb-") && key.includes("-auth-token")) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Ignora erros de acesso ao storage (modo privado/restrições do browser).
  }
}

async function forceAuthRecovery() {
  queryClient.clear();
  clearSupabaseLocalAuthStorage();
  try {
    await withTimeout(supabase.auth.signOut({ scope: "local" }), 3000, "Timeout ao finalizar sessão local.");
  } catch {
    // Mesmo com erro, a limpeza local já foi aplicada.
  }
}

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
  const [email, setEmail] = useState(emailFromSearch ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    if (!email.trim() || !password) {
      toast.error("Informe e-mail e senha.");
      return;
    }

    setLoading(true);
    try {
      queryClient.clear();
      // Garante estado limpo antes de autenticar novamente, sem travar o submit.
      try {
        await withTimeout(supabase.auth.signOut({ scope: "local" }), 5000, "Timeout ao limpar sessão anterior.");
      } catch {
        // Se o signOut local travar, seguimos para tentar novo login.
      }

      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        }),
        12000,
        "A autenticação demorou além do esperado.",
      );

      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("email not confirmed") || message.includes("not confirmed")) {
          toast.error("Confirme seu e-mail com o código OTP antes de entrar.");
        } else {
          toast.error("Credenciais inválidas. Verifique e tente novamente.");
        }
        return;
      }

      const destination = safeRedirect ?? "/dashboard";

      navigate({ to: destination, replace: true });
    } catch (error) {
      await forceAuthRecovery();
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("timeout") || message.includes("demorou")) {
        toast.error("Sua sessão anterior travou. Limpamos o estado local, tente entrar novamente.");
      } else {
        toast.error("Não foi possível entrar agora. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

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
              <div className="mt-2 text-right">
                <Link
                  to="/esqueci-senha"
                  search={{ email: email.trim() || undefined }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
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
