import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendOtpEdge, verifyOtpEdge } from "@/lib/auth-edge";

type ConfirmacaoCadastroSearch = { email?: string; redirect?: string };
type RegisterDraft = { email: string; nome: string; whatsapp: string };

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;
const REGISTER_DRAFT_KEY = "register_otp_draft";

export const Route = createFileRoute("/confirmacao-cadastro")({
  validateSearch: (raw: Record<string, unknown>): ConfirmacaoCadastroSearch => ({
    email: typeof raw.email === "string" ? raw.email : undefined,
    redirect: typeof raw.redirect === "string" ? raw.redirect : undefined,
  }),
  head: () => ({
    meta: [{ title: "Confirmar cadastro — ATOM TECH" }],
  }),
  component: ConfirmacaoCadastroOTP,
});

function ConfirmacaoCadastroOTP() {
  const navigate = useNavigate();
  const { email: emailParam, redirect } = Route.useSearch();
  const [email, setEmail] = useState((emailParam ?? "").trim());
  const [registerDraft, setRegisterDraft] = useState<RegisterDraft | null>(null);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const otpCode = useMemo(() => otpDigits.join(""), [otpDigits]);

  useEffect(() => {
    otpRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    const rawDraft = sessionStorage.getItem(REGISTER_DRAFT_KEY);
    if (!rawDraft) return;
    try {
      const parsed = JSON.parse(rawDraft) as RegisterDraft;
      setRegisterDraft(parsed);
      if (parsed.email) {
        setEmail(parsed.email.trim());
      }
      setNome(parsed.nome?.trim() ?? "");
      setWhatsapp(parsed.whatsapp?.trim() ?? "");
    } catch {
      sessionStorage.removeItem(REGISTER_DRAFT_KEY);
    }
  }, [emailParam]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const clearFeedback = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  const resendCode = async () => {
    if (!email.trim() || resendCooldown > 0 || sending) return;
    clearFeedback();
    setSending(true);
    try {
      const result = await sendOtpEdge({ email: email.trim() });
      if (!result.success) throw new Error("SEND_OTP_FAILED");
      setSuccessMessage("Código enviado para seu e-mail.");
      setResendCooldown(RESEND_SECONDS);
    } catch {
      setErrorMessage("Não foi possível enviar o código. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Informe seu e-mail.");
      return;
    }
    if (otpCode.length !== OTP_LENGTH) {
      setErrorMessage("Digite o código completo de 6 dígitos.");
      return;
    }

    clearFeedback();
    setLoading(true);
    try {
      const result = await verifyOtpEdge({
        email: email.trim(),
        code: otpCode,
        nome: nome.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
      });
      if (!result.success) throw new Error("VERIFY_OTP_FAILED");

      sessionStorage.removeItem(REGISTER_DRAFT_KEY);
      setSuccessMessage("Código validado com sucesso.");
      void redirect;
      navigate({ to: "/login", search: { email: email.trim(), redirect } });
    } catch {
      setErrorMessage("Código inválido. Confira e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, "").slice(0, 1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = nextValue;
    setOtpDigits(nextDigits);
    clearFeedback();
    if (nextValue && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;

    const nextDigits = Array(OTP_LENGTH)
      .fill("")
      .map((_, index) => pasted[index] ?? "");
    setOtpDigits(nextDigits);
    const nextFocusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    otpRefs.current[nextFocusIndex]?.focus();
    clearFeedback();
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <header className="px-6 py-5">
        <Link
          to="/cadastro"
          search={{ email, redirect }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> Editar e-mail
        </Link>
      </header>

      <div className="flex-1 grid place-items-center px-6 pb-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 md:p-7 shadow-card">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Confirme seu código</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Digite o código de 6 dígitos enviado para
              <br />
              <strong className="text-foreground">{email || "seu e-mail"}</strong>
            </p>
          </div>

          <form onSubmit={verifyCode} className="mt-5 space-y-5">
            <div>
              <Label htmlFor="confirm-email" className="text-sm font-medium">E-mail</Label>
              <Input
                id="confirm-email"
                type="email"
                value={email}
                readOnly
                disabled
                className="mt-1.5 h-11 rounded-[10px]"
              />
            </div>

            <div>
              <Label htmlFor="confirm-nome" className="text-sm font-medium">Nome</Label>
              <Input
                id="confirm-nome"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                className="mt-1.5 h-11 rounded-[10px]"
              />
            </div>

            <div>
              <Label htmlFor="confirm-whatsapp" className="text-sm font-medium">WhatsApp</Label>
              <Input
                id="confirm-whatsapp"
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                className="mt-1.5 h-11 rounded-[10px]"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Código OTP</Label>
              <div className="mt-2 grid grid-cols-6 gap-2">
                {otpDigits.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(element) => {
                      otpRefs.current[index] = element;
                    }}
                    value={digit}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    onPaste={handleOtpPaste}
                    className="h-12 rounded-xl text-center text-lg font-semibold"
                  />
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || otpCode.length !== OTP_LENGTH}
              className="w-full h-12 rounded-xl text-base font-semibold"
            >
              {loading ? "Validando..." : "Confirmar código"}
            </Button>

            <div className="text-right">
              <button
                type="button"
                onClick={() => void resendCode()}
                disabled={sending || resendCooldown > 0}
                className="text-sm text-primary hover:text-primary/80 disabled:text-muted-foreground transition"
              >
                {resendCooldown > 0
                  ? `Reenviar em ${resendCooldown}s`
                  : sending
                    ? "Reenviando..."
                    : "Reenviar código"}
              </button>
            </div>
          </form>

          {errorMessage && (
            <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="mt-4 rounded-lg bg-primary-light px-3 py-2 text-sm text-primary-dark">
              {successMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
