import { callAdminOps } from "@/lib/admin-edge";

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "12m" | "all";

export type AdminAnalyticsKpis = {
  totalIndicacoes: number;
  totalFechadas: number;
  totalPerdidas: number;
  conversionRate: number;
  lossRate: number;
  ticketMedio: number;
  faturamento: number;
  comissoesPagas: number;
  pipelineAberto: number;
  tempoMedioFechamentoDias: number;
};

export type AdminAnalyticsFunnel = {
  enviado: number;
  analise: number;
  negociacao: number;
  fechado: number;
  perdido: number;
};

export type AdminAnalyticsRevenuePoint = {
  month: string;
  label: string;
  faturamento: number;
  comissoesPagas: number;
  fechadas: number;
};

export type AdminAnalyticsRankingItem = {
  usuario_id: number;
  nome: string;
  totalIndicacoes: number;
  totalFechadas: number;
  conversao: number;
  receitaComissao: number;
  faturamentoGerado: number;
};

export type AdminAnalyticsMix = {
  porTipo: { pessoa: number; empresa: number };
  porTipoProjeto: {
    usina_solar: number;
    carregador_veicular: number;
    outros: number;
  };
};

export type AdminAnalyticsPayload = {
  period: AnalyticsPeriod;
  kpis: AdminAnalyticsKpis;
  funnel: AdminAnalyticsFunnel;
  revenueSeries: AdminAnalyticsRevenuePoint[];
  ranking: AdminAnalyticsRankingItem[];
  mix: AdminAnalyticsMix;
};

export const ANALYTICS_PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
  { key: "12m", label: "12 meses" },
  { key: "all", label: "Tudo" },
];

function asNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asPeriod(value: unknown): AnalyticsPeriod {
  if (value === "7d" || value === "30d" || value === "90d" || value === "12m" || value === "all") {
    return value;
  }
  return "30d";
}

type RawPayload = Partial<{
  period: unknown;
  kpis: Partial<Record<keyof AdminAnalyticsKpis, unknown>>;
  funnel: Partial<Record<keyof AdminAnalyticsFunnel, unknown>>;
  revenueSeries: Array<Partial<Record<keyof AdminAnalyticsRevenuePoint, unknown>>>;
  ranking: Array<Partial<Record<keyof AdminAnalyticsRankingItem, unknown>>>;
  mix: Partial<{
    porTipo: Partial<Record<keyof AdminAnalyticsMix["porTipo"], unknown>>;
    porTipoProjeto: Partial<Record<keyof AdminAnalyticsMix["porTipoProjeto"], unknown>>;
  }>;
}>;

function normalizePayload(raw: unknown): AdminAnalyticsPayload {
  const obj = (raw ?? {}) as RawPayload;
  return {
    period: asPeriod(obj.period),
    kpis: {
      totalIndicacoes: asNumber(obj.kpis?.totalIndicacoes),
      totalFechadas: asNumber(obj.kpis?.totalFechadas),
      totalPerdidas: asNumber(obj.kpis?.totalPerdidas),
      conversionRate: asNumber(obj.kpis?.conversionRate),
      lossRate: asNumber(obj.kpis?.lossRate),
      ticketMedio: asNumber(obj.kpis?.ticketMedio),
      faturamento: asNumber(obj.kpis?.faturamento),
      comissoesPagas: asNumber(obj.kpis?.comissoesPagas),
      pipelineAberto: asNumber(obj.kpis?.pipelineAberto),
      tempoMedioFechamentoDias: asNumber(obj.kpis?.tempoMedioFechamentoDias),
    },
    funnel: {
      enviado: asNumber(obj.funnel?.enviado),
      analise: asNumber(obj.funnel?.analise),
      negociacao: asNumber(obj.funnel?.negociacao),
      fechado: asNumber(obj.funnel?.fechado),
      perdido: asNumber(obj.funnel?.perdido),
    },
    revenueSeries: (obj.revenueSeries ?? []).map((point) => ({
      month: typeof point?.month === "string" ? point.month : "",
      label: typeof point?.label === "string" ? point.label : "",
      faturamento: asNumber(point?.faturamento),
      comissoesPagas: asNumber(point?.comissoesPagas),
      fechadas: asNumber(point?.fechadas),
    })),
    ranking: (obj.ranking ?? []).map((row) => ({
      usuario_id: asNumber(row?.usuario_id),
      nome: typeof row?.nome === "string" && row.nome.trim() ? row.nome : "Indicador",
      totalIndicacoes: asNumber(row?.totalIndicacoes),
      totalFechadas: asNumber(row?.totalFechadas),
      conversao: asNumber(row?.conversao),
      receitaComissao: asNumber(row?.receitaComissao),
      faturamentoGerado: asNumber(row?.faturamentoGerado),
    })),
    mix: {
      porTipo: {
        pessoa: asNumber(obj.mix?.porTipo?.pessoa),
        empresa: asNumber(obj.mix?.porTipo?.empresa),
      },
      porTipoProjeto: {
        usina_solar: asNumber(obj.mix?.porTipoProjeto?.usina_solar),
        carregador_veicular: asNumber(obj.mix?.porTipoProjeto?.carregador_veicular),
        outros: asNumber(obj.mix?.porTipoProjeto?.outros),
      },
    },
  };
}

export async function fetchAdminAnalytics(period: AnalyticsPeriod): Promise<AdminAnalyticsPayload> {
  const raw = await callAdminOps<unknown>({ action: "analytics_overview", period });
  return normalizePayload(raw);
}
