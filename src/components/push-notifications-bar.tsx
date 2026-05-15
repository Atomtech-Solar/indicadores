import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getPushCapability, type PushCapability } from "@/lib/push-platform";
import { savePushToken } from "@/lib/push-tokens";
import { SITE_LOGO_URL } from "@/lib/site-logo";

function isPushServiceUnavailableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  if (name === "AbortError" && /push service not available|Registration failed/i.test(msg)) {
    return true;
  }
  return msg.includes("push service not available");
}

function logPushSetupError(error: unknown) {
  if (isPushServiceUnavailableError(error)) {
    console.warn("[push] Serviço push indisponível neste ambiente.");
    return;
  }
  const message = error instanceof Error ? error.message : "";
  if (message.includes("bloqueadas no navegador")) {
    console.warn(message);
    return;
  }
  if (
    message.includes("VITE_FIREBASE") ||
    message.includes("Configuração Firebase") ||
    message.includes("HTTPS") ||
    message.includes("PushManager") ||
    message.includes("não é suportado")
  ) {
    console.warn("[push]", message);
    return;
  }
  console.error("[push] Erro ao configurar notificações:", error);
}

/**
 * Registo FCM para administradores no painel /admin.
 * iPhone: push só funciona com o app na tela inicial (PWA), não no Safari normal.
 */
export function PushNotificationsBar() {
  const [capability, setCapability] = useState<PushCapability>(() =>
    typeof window !== "undefined" ? getPushCapability() : { status: "supported" },
  );
  const [insecureBannerDismissed, setInsecureBannerDismissed] = useState(false);
  const [iosBannerDismissed, setIosBannerDismissed] = useState(false);
  const [showPushEnableBanner, setShowPushEnableBanner] = useState(false);
  const registerInFlightRef = useRef(false);
  const foregroundAttachedRef = useRef(false);

  const attachForeground = useCallback(async () => {
    if (foregroundAttachedRef.current) return;
    const { attachForegroundPushListener } = await import("@/lib/notifications");
    await attachForegroundPushListener(({ title, body, accentColor }) => {
      toast(title, {
        description: body,
        duration: 8000,
        style: { borderLeft: `4px solid ${accentColor ?? "#1B8F3A"}` },
        icon: (
          <img src={SITE_LOGO_URL} alt="" className="h-8 w-8 rounded-md object-contain shrink-0" />
        ),
      });
    });
    foregroundAttachedRef.current = true;
  }, []);

  const registerPushNotifications = useCallback(async () => {
    const cap = getPushCapability();
    setCapability(cap);
    if (cap.status !== "supported") return;
    if (registerInFlightRef.current) return;

    registerInFlightRef.current = true;
    try {
      const { requestNotificationPermission } = await import("@/lib/notifications");
      const token = await requestNotificationPermission();
      await savePushToken(token);
      await attachForeground();
      setShowPushEnableBanner(false);
    } catch (error) {
      logPushSetupError(error);
    } finally {
      registerInFlightRef.current = false;
    }
  }, [attachForeground]);

  useEffect(() => {
    const cap = getPushCapability();
    setCapability(cap);

    if (cap.status !== "supported") {
      setShowPushEnableBanner(false);
      return;
    }

    if (typeof Notification === "undefined") return;
    if (Notification.permission === "denied") return;

    if (Notification.permission === "granted") {
      void attachForeground();
      void registerPushNotifications();
      return;
    }

    setShowPushEnableBanner(true);
  }, [registerPushNotifications, attachForeground]);

  return (
    <>
      {capability.status === "insecure" && !insecureBannerDismissed && (
        <PushBanner className="border-amber-200 bg-amber-50" label="Ambiente e notificações push">
          <p className="text-sm text-amber-950 max-w-[min(100%,48rem)]">
            Notificações push exigem <strong>HTTPS</strong>. Em <strong>http://</strong> com IP da rede o
            dispositivo costuma bloquear o push.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 border-amber-300 text-amber-950"
            onClick={() => setInsecureBannerDismissed(true)}
          >
            Ocultar
          </Button>
        </PushBanner>
      )}

      {capability.status === "ios_needs_install" && !iosBannerDismissed && (
        <PushBanner className="border-blue-200 bg-blue-50" label="Notificações no iPhone">
          <div className="max-w-[min(100%,48rem)] text-sm text-blue-950">
            <strong className="font-semibold">iPhone:</strong> notificações push só funcionam com o app na{" "}
            <strong>tela inicial</strong>, não no Safari normal.
            <ol className="mt-2 list-decimal list-inside space-y-1 text-sm">
              <li>No <strong>Safari</strong>, abra este site (URL da Vercel).</li>
              <li>Toque em <strong>Compartilhar</strong> (quadrado com seta para cima).</li>
              <li>Escolha <strong>Adicionar à Tela de Início</strong>.</li>
              <li>Abra pelo <strong>ícone ATOM TECH</strong> na tela inicial.</li>
              <li>No admin, toque em <strong>Permitir notificações</strong>.</li>
            </ol>
            <span className="mt-2 block text-xs text-blue-800/90">
              Requer iOS 16.4 ou superior. No Android e no computador, use o browser normalmente.
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 border-blue-300 text-blue-950"
            onClick={() => setIosBannerDismissed(true)}
          >
            Entendi
          </Button>
        </PushBanner>
      )}

      {capability.status === "unsupported" && (
        <PushBanner className="border-zinc-200 bg-zinc-50" label="Notificações indisponíveis">
          <p className="text-sm text-zinc-700 max-w-[min(100%,48rem)]">{capability.reason}</p>
        </PushBanner>
      )}

      {capability.status === "supported" && showPushEnableBanner && (
        <PushBanner className="border-border bg-muted/50" label="Ativar notificações push">
          <p className="text-sm text-muted-foreground max-w-[min(100%,42rem)]">
            Toque no botão para autorizar alertas neste site (é necessário um clique seu).
          </p>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button type="button" size="sm" className="rounded-lg" onClick={() => void registerPushNotifications()}>
              Permitir notificações
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-lg text-muted-foreground"
              onClick={() => setShowPushEnableBanner(false)}
            >
              Agora não
            </Button>
          </div>
        </PushBanner>
      )}
    </>
  );
}

function PushBanner({
  className,
  label,
  children,
}: {
  className: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div role="region" aria-label={label} className={`border-b px-6 lg:px-10 py-3 ${className}`}>
      <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {children}
      </div>
    </div>
  );
}
