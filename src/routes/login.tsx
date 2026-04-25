import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, ArrowLeft, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";

type LoginSearch = { redirect?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (raw: Record<string, unknown>): LoginSearch => ({
    redirect: typeof raw.redirect === "string" ? raw.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — IndicaPro" },
      { name: "description", content: "Acesse sua conta para acompanhar indicações e comissões." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [form, setForm] = useState({ email: "", senha: "" });
  const [loading, setLoading] = useState(false);

  const goAfterLogin = () => {
    if (redirect?.startsWith("/") && !redirect.startsWith("//")) {
      window.location.assign(redirect);
      return;
    }
    navigate({ to: "/dashboard" });
  };

  const signInPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.senha) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.senha,
      });
      if (error) throw error;
      toast.success("Login realizado.");
      goAfterLogin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Não foi possível entrar.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const magicLink = async () => {
    if (!form.email.trim()) {
      toast.error("Informe seu e-mail para receber o link.");
      return;
    }
    setLoading(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOtp({
        email: form.email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: origin ? `${origin}/pos-cadastro` : undefined,
        },
      });
      if (error) throw error;
      toast.success("Verifique seu e-mail para o link de acesso.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Não foi possível enviar o link.";
      toast.error(msg);
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
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-primary items-center justify-center shadow-glow mb-4">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Entrar</h1>
            <p className="text-sm text-muted-foreground mt-2">Use e-mail e senha ou magic link</p>
          </div>

          <div className="bg-card rounded-2xl shadow-card border border-border p-7">
            <form onSubmit={signInPassword} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="voce@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1.5 rounded-[10px] h-11"
                />
              </div>
              <div>
                <Label htmlFor="senha" className="text-sm font-medium">
                  Senha
                </Label>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Sua senha"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  className="mt-1.5 rounded-[10px] h-11"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl h-12 text-base font-semibold mt-2"
              >
                Entrar
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-card text-xs text-muted-foreground">ou</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => void magicLink()}
                className="w-full rounded-xl h-12 text-base font-medium bg-card"
              >
                <MessageCircle className="h-5 w-5 mr-2 text-primary" />
                Receber magic link no e-mail
              </Button>
            </form>
          </div>

          <p className="text-sm text-center text-muted-foreground mt-6">
            Não tem conta?{" "}
            <Link to="/cadastro" className="text-primary font-semibold hover:underline">
              Criar grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
