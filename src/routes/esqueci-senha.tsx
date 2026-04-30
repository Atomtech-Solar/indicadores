import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";

type EsqueciSenhaSearch = { email?: string };

export const Route = createFileRoute("/esqueci-senha")({
  validateSearch: (raw: Record<string, unknown>): EsqueciSenhaSearch => ({
    email: typeof raw.email === "string" ? raw.email : undefined,
  }),
  head: () => ({
    meta: [{ title: "Esqueci minha senha — ATOM TECH" }],
  }),
  component: EsqueciSenha,
});

function EsqueciSenha() {
  const { email: emailFromSearch } = Route.useSearch();
  const [email, setEmail] = useState(emailFromSearch ?? "");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setFeedback("Informe seu e-mail para recuperar a senha.");
      return;
    }

    setLoading(true);
    setFeedback("");
    try {
      const redirectTo = `${window.location.origin}/redefinir-senha`;
      await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      setFeedback("Se o e-mail existir, enviaremos um link para redefinição de senha.");
    } catch {
      setFeedback("Não foi possível enviar o link agora. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <header className="px-6 py-5">
        <Link
          to="/login"
          search={{ email: email.trim() || undefined }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para login
        </Link>
      </header>

      <div className="flex-1 grid place-items-center px-6 pb-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-card">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Recuperar senha</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Digite seu e-mail para receber o link de redefinição.
            </p>
          </div>

          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <div>
              <Label htmlFor="recover-email" className="text-sm font-medium">
                E-mail
              </Label>
              <Input
                id="recover-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@email.com"
                className="mt-1.5 rounded-[10px] h-11"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-xl h-12 text-base font-semibold">
              {loading ? "Enviando..." : "Enviar link de redefinição"}
            </Button>
          </form>

          {feedback && <p className="mt-4 text-sm text-center text-muted-foreground">{feedback}</p>}
        </div>
      </div>
    </div>
  );
}
