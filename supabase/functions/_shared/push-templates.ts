/** Logo ATOM TECH (URL absoluta — necessária para ícone em push web). */
export const PUSH_BRAND_LOGO_URL =
  "https://i.ibb.co/nqCbqzLG/Documento-de-Bryan-Henrique-1.png";

export type PushEventType =
  | "nova_indicacao"
  | "status_indicacao"
  | "comissao_paga"
  | "proposta_registrada"
  | "novo_indicador";

type EventStyle = {
  accentColor: string;
  tag: string;
  /** Padrão de vibração (Android). */
  vibrate: number[];
  requireInteraction: boolean;
};

const EVENT_STYLES: Record<PushEventType, EventStyle> = {
  nova_indicacao: {
    accentColor: "#1B8F3A",
    tag: "atomtech-nova-indicacao",
    vibrate: [120, 60, 120],
    requireInteraction: true,
  },
  status_indicacao: {
    accentColor: "#2563EB",
    tag: "atomtech-status-indicacao",
    vibrate: [100, 50, 100],
    requireInteraction: false,
  },
  comissao_paga: {
    accentColor: "#059669",
    tag: "atomtech-comissao-paga",
    vibrate: [150, 80, 150, 80, 150],
    requireInteraction: true,
  },
  proposta_registrada: {
    accentColor: "#7C3AED",
    tag: "atomtech-proposta",
    vibrate: [100, 40, 100],
    requireInteraction: false,
  },
  novo_indicador: {
    accentColor: "#0D9488",
    tag: "atomtech-novo-indicador",
    vibrate: [120, 60, 120, 60, 120],
    requireInteraction: false,
  },
};

const STATUS_COLORS: Record<string, string> = {
  negociacao: "#D97706",
  fechado: "#1B8F3A",
  perdido: "#DC2626",
};

const STATUS_LABELS: Record<string, string> = {
  negociacao: "negociação",
  fechado: "fechado",
  perdido: "perdido",
};

export type AdminPushParams = {
  nomeIndicado?: string;
  nome?: string;
  status?: string;
  valorBrl?: string;
  indicacaoId?: number | string;
  comissaoId?: number | string;
  userId?: string;
};

export type BuiltAdminPush = {
  title: string;
  body: string;
  data: Record<string, string>;
  webpush: {
    notification: {
      icon: string;
      badge: string;
      tag: string;
      requireInteraction: boolean;
    };
    fcm_options?: { link: string };
  };
};

function getPushSiteOrigin(): string {
  const raw = Deno.env.get("PUSH_SITE_ORIGIN")?.trim() || Deno.env.get("SITE_URL")?.trim() || "";
  return raw.replace(/\/$/, "");
}

function adminClickUrl(path = "/admin"): string {
  const origin = getPushSiteOrigin();
  if (origin) return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
  return path;
}

function resolveStatusStyle(status?: string): { color: string; label: string } {
  const key = (status ?? "").trim().toLowerCase();
  return {
    color: STATUS_COLORS[key] ?? EVENT_STYLES.status_indicacao.accentColor,
    label: STATUS_LABELS[key] ?? (key || "atualizado"),
  };
}

export function buildAdminPushMessage(event: PushEventType, params: AdminPushParams): BuiltAdminPush {
  const style = EVENT_STYLES[event];
  let title = "ATOM TECH";
  let body = "";
  let accentColor = style.accentColor;
  const data: Record<string, string> = {
    evento: event,
    accentColor,
    iconUrl: PUSH_BRAND_LOGO_URL,
    badgeUrl: PUSH_BRAND_LOGO_URL,
    tag: style.tag,
    brand: "ATOM TECH",
  };

  switch (event) {
    case "nova_indicacao": {
      title = "🔔 Nova indicação recebida";
      body = `${params.nomeIndicado ?? "Indicado"} foi cadastrado.`;
      if (params.indicacaoId != null) data.indicacaoId = String(params.indicacaoId);
      break;
    }
    case "status_indicacao": {
      const { color, label } = resolveStatusStyle(params.status);
      accentColor = color;
      data.accentColor = color;
      data.status = params.status ?? "";
      title = "📈 Status da indicação atualizado";
      body = `${params.nomeIndicado ?? "Indicação"} agora está em ${label}.`;
      if (params.indicacaoId != null) data.indicacaoId = String(params.indicacaoId);
      break;
    }
    case "comissao_paga": {
      title = "💰 Comissão paga";
      body = `${params.nomeIndicado ?? "Indicado"} — ${params.valorBrl ?? "—"}.`;
      if (params.comissaoId != null) data.comissaoId = String(params.comissaoId);
      if (params.indicacaoId != null) data.indicacaoId = String(params.indicacaoId);
      break;
    }
    case "proposta_registrada": {
      title = "📄 Proposta registrada";
      body = `Nova proposta para ${params.nomeIndicado ?? "indicação"}.`;
      if (params.indicacaoId != null) data.indicacaoId = String(params.indicacaoId);
      break;
    }
    case "novo_indicador": {
      title = "👤 Novo indicador cadastrado";
      body = `${params.nome ?? "Alguém"} criou uma conta.`;
      if (params.userId) data.userId = params.userId;
      break;
    }
  }

  data.clickUrl = adminClickUrl("/admin");

  return {
    title,
    body,
    data,
    webpush: {
      notification: {
        icon: PUSH_BRAND_LOGO_URL,
        badge: PUSH_BRAND_LOGO_URL,
        tag: style.tag,
        requireInteraction: style.requireInteraction,
      },
      fcm_options: { link: data.clickUrl },
    },
  };
}

/** Vibração por evento (serializada para o SW ler em `data.vibrate`). */
export function vibratePatternForEvent(event: PushEventType, status?: string): number[] {
  if (event === "status_indicacao" && status === "fechado") {
    return [200, 100, 200, 100, 200];
  }
  return EVENT_STYLES[event].vibrate;
}
