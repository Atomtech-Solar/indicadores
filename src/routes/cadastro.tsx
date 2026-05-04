import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerWithPassword, sendOtpEdge } from "@/lib/auth-edge";

const REGISTER_DRAFT_KEY = "register_otp_draft";

function formatWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export const Route = createFileRoute("/cadastro")({
  validateSearch: (raw: Record<string, unknown>) => ({
    redirect: typeof raw.redirect === "string" ? raw.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Criar conta — ATOM TECH" },
      { name: "description", content: "Cadastre e confirme seu e-mail por código OTP para ativar sua conta." },
    ],
  }),
  component: Cadastro,
});

function Cadastro() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [form, setForm] = useState({
    nome: "",
    whatsapp: "",
    email: "",
    senha: "",
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.whatsapp.trim() || !form.email.trim() || !form.senha) {
      toast.error("Preencha todos os campos.");
      return;
    }
    if (form.senha.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    setFeedback("");
    try {
      const registerResult = await registerWithPassword({
        email: form.email.trim(),
        password: form.senha,
        nome: form.nome.trim(),
        whatsapp: form.whatsapp.trim(),
      });
      if (!registerResult.success) {
        if (registerResult.status === 429) {
          toast.error("Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.");
        } else {
          toast.error("Não foi possível concluir o cadastro. Tente novamente.");
        }
        return;
      }

      const sendOtpResult = await sendOtpEdge({ email: form.email.trim() });
      if (!sendOtpResult.success) {
        if (sendOtpResult.status === 429) {
          toast.error("Muitas tentativas para envio de código. Aguarde e tente novamente.");
        } else {
          toast.error("Não foi possível enviar o código. Tente novamente.");
        }
        return;
      }

      sessionStorage.setItem(
        REGISTER_DRAFT_KEY,
        JSON.stringify({
          email: form.email.trim(),
          nome: form.nome.trim(),
          whatsapp: form.whatsapp.trim(),
        }),
      );

      setFeedback("Código enviado para seu e-mail.");
      navigate({
        to: "/confirmacao-cadastro",
        search: { email: form.email.trim(), redirect },
      });
    } catch {
      toast.error("Não foi possível enviar o código. Tente novamente.");
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
            <h1 className="text-3xl font-bold tracking-tight">Criar conta</h1>
            <p className="text-sm text-muted-foreground mt-2">Cadastre com senha e confirme por código OTP</p>
          </div>

          <div className="bg-card rounded-2xl shadow-card border border-border p-7">
            <form onSubmit={(e) => void submit(e)} className="space-y-4">
              <div>
                <Label htmlFor="nome" className="text-sm font-medium">
                  Nome
                </Label>
                <Input
                  id="nome"
                  required
                  placeholder="Seu nome completo"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="mt-1.5 rounded-[10px] h-11"
                />
              </div>

              <div>
                <Label htmlFor="whatsapp" className="text-sm font-medium">
                  WhatsApp
                </Label>
                <Input
                  id="whatsapp"
                  required
                  placeholder="(11) 99999-9999"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: formatWhatsapp(e.target.value) })}
                  className="mt-1.5 rounded-[10px] h-11"
                />
              </div>

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
                  autoComplete="new-password"
                  required
                  placeholder="Mínimo 6 caracteres"
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
                {loading ? "Enviando..." : "Continuar"}
              </Button>

              {feedback && (
                <p className="rounded-lg bg-primary-light px-3 py-2 text-sm text-primary-dark">{feedback}</p>
              )}
            </form>
          </div>

          <p className="text-sm text-center text-muted-foreground mt-6">
            Já possui uma conta?{" "}
            <Link to="/login" search={{ email: form.email, redirect }} className="text-primary font-semibold hover:underline">
              Entrar
            </Link>
          </p>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Ao criar sua conta você concorda com nossos termos.
          </p>
        </div>
      </div>
    </div>
  );
}
