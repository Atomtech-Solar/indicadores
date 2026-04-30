import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [{ title: "Redefinir senha — ATOM TECH" }],
  }),
  component: RedefinirSenha,
});

function RedefinirSenha() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [canReset, setCanReset] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let isMounted = true;

    const validateRecoverySession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!isMounted) return;
      setCanReset(Boolean(session?.user));
      setCheckingLink(false);
    };

    void validateRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canReset) {
      setFeedback("Seu link expirou. Solicite uma nova recuperação de senha.");
      return;
    }
    if (password.length < 6) {
      setFeedback("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setFeedback("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    setFeedback("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut({ scope: "local" });
      navigate({ to: "/login", replace: true });
    } catch {
      setFeedback("Não foi possível redefinir a senha agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <header className="px-6 py-5">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para login
        </Link>
      </header>

      <div className="flex-1 grid place-items-center px-6 pb-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-card">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Nova senha</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Defina uma nova senha para sua conta.
            </p>
          </div>

          {checkingLink ? (
            <p className="text-sm text-center text-muted-foreground">Validando link de recuperação...</p>
          ) : !canReset ? (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                O link de redefinição é inválido ou expirou.
              </p>
              <Button asChild className="w-full rounded-xl h-11">
                <Link to="/esqueci-senha">Solicitar novo link</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={(event) => void submit(event)} className="space-y-4">
              <div>
                <Label htmlFor="new-password" className="text-sm font-medium">
                  Nova senha
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  className="mt-1.5 rounded-[10px] h-11"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password" className="text-sm font-medium">
                  Confirmar nova senha
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repita a nova senha"
                  className="mt-1.5 rounded-[10px] h-11"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-xl h-12 text-base font-semibold">
                {loading ? "Salvando..." : "Redefinir senha"}
              </Button>
            </form>
          )}

          {feedback && <p className="mt-4 text-sm text-center text-muted-foreground">{feedback}</p>}
        </div>
      </div>
    </div>
  );
}
