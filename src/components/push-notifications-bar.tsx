import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
    console.warn(
      "[push] Serviço push indisponível neste ambiente (ex.: site em HTTP num IP da rede, janela anónima, extensão ou rede a bloquear o Push). FCM não foi registado. Use HTTPS ou http://localhost.",
    );
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
 * Registo FCM para administradores no painel /admin: em contexto seguro (HTTPS ou localhost)
 * pede permissão com gesto do utilizador; em http://IP da LAN o browser não trata como seguro.
 *
 * O módulo de notificações/Firebase só é carregado quando necessário (evita derrubar o /admin
 * se o .env do Firebase estiver em falta).
 */
export function PushNotificationsBar() {
  const [showInsecureBanner, setShowInsecureBanner] = useState(false);
  const [insecureBannerDismissed, setInsecureBannerDismissed] = useState(false);
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
        style: {
          borderLeft: `4px solid ${accentColor ?? "#1B8F3A"}`,
        },
        icon: (
          <img
            src={SITE_LOGO_URL}
            alt=""
            className="h-8 w-8 rounded-md object-contain shrink-0"
          />
        ),
      });
    });
    foregroundAttachedRef.current = true;
  }, []);

  const registerPushNotifications = useCallback(async () => {
    if (registerInFlightRef.current) {
      return;
    }
    registerInFlightRef.current = true;
    console.log("Iniciando configuração de push");
    try {
      const { requestNotificationPermission } = await import("@/lib/notifications");
      const token = await requestNotificationPermission();
      console.log("Token retornado:", token);
      console.log("FCM Token:", token);
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
    if (typeof window === "undefined") return;

    console.log("[push] useEffect", {
      isSecureContext: window.isSecureContext,
      notification: typeof Notification !== "undefined" ? Notification.permission : "API indisponível",
    });

    if (!window.isSecureContext) {
      console.warn(
        "[push] contexto não seguro — requestNotificationPermission não será chamada automaticamente (use HTTPS ou localhost).",
      );
      setShowInsecureBanner(true);
      return;
    }

    if (typeof Notification === "undefined") {
      console.warn("[push] Notification API indisponível — fluxo push abortado.");
      return;
    }

    if (Notification.permission === "denied") {
      console.warn("[push] permissão de notificações: denied — não há pedido automático.");
      return;
    }

    if (Notification.permission === "granted") {
      if (!("PushManager" in window)) {
        console.warn("[push] PushManager indisponível — FCM não será tentado.");
        return;
      }
      void attachForeground();
      console.log("[push] permissão já granted — a chamar registerPushNotifications()");
      void registerPushNotifications();
      return;
    }

    console.log('[push] permissão "default" — mostrar botão "Permitir notificações"');
    setShowPushEnableBanner(true);
  }, [registerPushNotifications, attachForeground]);

  return (
    <>
      {showInsecureBanner && !insecureBannerDismissed && (
        <div
          role="region"
          aria-label="Ambiente e notificações push"
          className="border-b border-amber-200 bg-amber-50 px-6 lg:px-10 py-3"
        >
          <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-amber-950 max-w-[min(100%,48rem)]">
              Notificações push neste browser exigem contexto seguro (HTTPS ou{" "}
              <strong className="font-semibold">localhost</strong>). Com{" "}
              <strong className="font-semibold">http://</strong> num{" "}
              <strong className="font-semibold">IP da rede</strong> (ex.: 192.168.x.x) o pedido de
              permissão costuma não aparecer ou ser bloqueado. Use HTTPS no servidor, ou teste em{" "}
              <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs">http://localhost:…</code>{" "}
              nesta máquina.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0 border-amber-300 text-amber-950"
              onClick={() => setInsecureBannerDismissed(true)}
            >
              Ocultar aviso
            </Button>
          </div>
        </div>
      )}

      {showPushEnableBanner && (
        <div
          role="region"
          aria-label="Ativar notificações push"
          className="border-b border-border bg-muted/50 px-6 lg:px-10 py-3"
        >
          <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground max-w-[min(100%,42rem)]">
              O navegador só mostra o pedido de permissão depois de um clique seu. Use o botão para
              autorizar alertas deste site no dispositivo.
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
          </div>
        </div>
      )}
    </>
  );
}
