import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendOtpEdge, verifyOtpEdge } from "@/lib/auth-edge";

type AuthStep = "email" | "otp";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export function AuthOTP() {
  const navigate = useNavigate();
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const otpCode = useMemo(() => otpDigits.join(""), [otpDigits]);

  useEffect(() => {
    if (step !== "otp") return;
    otpRefs.current[0]?.focus();
  }, [step]);

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

  const sendOtpCode = async (): Promise<void> => {
    clearFeedback();
    setSendingCode(true);

    try {
      const result = await sendOtpEdge({ email: email.trim() });
      if (!result.success) throw new Error("OTP_SEND_FAILED");

      setStep("otp");
      setResendCooldown(RESEND_SECONDS);
      setSuccessMessage("Código enviado para seu e-mail.");
    } catch {
      setErrorMessage("Não foi possível enviar o código. Tente novamente.");
    } finally {
      setSendingCode(false);
    }
  };

  const verifyOtpCode = async (): Promise<void> => {
    clearFeedback();
    setVerifyingCode(true);

    try {
      const result = await verifyOtpEdge({
        email: email.trim(),
        code: otpCode,
      });
      if (!result.success) throw new Error("OTP_VERIFY_FAILED");

      setSuccessMessage("Código validado com sucesso.");
      navigate({ to: "/onboarding" });
    } catch {
      setErrorMessage("Código inválido. Confira e tente novamente.");
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSubmitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Informe um e-mail válido.");
      return;
    }
    await sendOtpCode();
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

  const handleSubmitOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (otpCode.length !== OTP_LENGTH) {
      setErrorMessage("Digite o código completo de 6 dígitos.");
      return;
    }
    await verifyOtpCode();
  };

  const goBackToEmail = () => {
    setStep("email");
    setOtpDigits(Array(OTP_LENGTH).fill(""));
    setResendCooldown(0);
    clearFeedback();
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 md:p-7 shadow-card">
      {step === "email" ? (
        <form onSubmit={handleSubmitEmail} className="space-y-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Entrar com código</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Digite seu e-mail para receber um código de acesso.
            </p>
          </div>

          <div>
            <Label htmlFor="otp-email" className="text-sm font-medium">
              E-mail
            </Label>
            <Input
              id="otp-email"
              type="email"
              autoComplete="email"
              required
              placeholder="voce@email.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearFeedback();
              }}
              className="mt-1.5 h-11 rounded-[10px]"
            />
          </div>

          <Button type="submit" disabled={sendingCode} className="w-full h-12 rounded-xl text-base font-semibold">
            {sendingCode ? "Enviando..." : "Continuar"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmitOtp} className="space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-primary-light text-primary grid place-items-center">
              <MailCheck className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Digite o código</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enviamos um código de 6 dígitos para
              <br />
              <strong className="text-foreground">{email}</strong>
            </p>
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
            disabled={verifyingCode || otpCode.length !== OTP_LENGTH}
            className="w-full h-12 rounded-xl text-base font-semibold"
          >
            {verifyingCode ? "Validando..." : "Validar código"}
          </Button>

          <div className="flex items-center justify-between gap-2 text-sm">
            <button
              type="button"
              onClick={goBackToEmail}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Editar e-mail
            </button>

            <button
              type="button"
              onClick={() => void sendOtpCode()}
              disabled={sendingCode || resendCooldown > 0}
              className="text-primary hover:text-primary/80 disabled:text-muted-foreground transition"
            >
              {resendCooldown > 0
                ? `Reenviar em ${resendCooldown}s`
                : sendingCode
                  ? "Reenviando..."
                  : "Reenviar código"}
            </button>
          </div>
        </form>
      )}

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
  );
}
