/** iPhone / iPad (Safari e Chrome no iOS usam WebKit). */
export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** App aberta a partir do ícone na tela inicial (requisito do iOS para Web Push). */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

export type PushCapability =
  | { status: "supported" }
  | { status: "insecure" }
  | { status: "ios_needs_install" }
  | { status: "unsupported"; reason: string };

export function getPushCapability(): PushCapability {
  if (typeof window === "undefined") {
    return { status: "unsupported", reason: "Ambiente sem browser." };
  }

  if (!window.isSecureContext) {
    return { status: "insecure" };
  }

  if (isIosDevice() && !isStandalonePwa()) {
    return { status: "ios_needs_install" };
  }

  if (typeof Notification === "undefined") {
    return {
      status: "unsupported",
      reason: "Este navegador não suporta notificações web.",
    };
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return {
      status: "unsupported",
      reason: isIosDevice()
        ? "Use iOS 16.4 ou superior e abra o app pelo ícone na tela inicial."
        : "PushManager indisponível neste navegador.",
    };
  }

  return { status: "supported" };
}
