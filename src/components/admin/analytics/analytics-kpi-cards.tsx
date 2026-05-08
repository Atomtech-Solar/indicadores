import {
  Users,
  TrendingUp,
  BadgeDollarSign,
  PiggyBank,
  Receipt,
  CircleDollarSign,
  Hourglass,
} from "lucide-react";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { formatBRL } from "@/lib/format";
import type { AdminAnalyticsKpis } from "@/lib/admin-analytics";

type AnalyticsKpiCardsProps = {
  kpis: AdminAnalyticsKpis;
};

function formatPercent(value: number) {
  const fixed = Number.isFinite(value) ? value.toFixed(1) : "0.0";
  return `${fixed.replace(".", ",")}%`;
}

function formatDays(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `${value.toFixed(1).replace(".", ",")} dias`;
}

export function AnalyticsKpiCards({ kpis }: AnalyticsKpiCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <AdminMetricCard
        label="Total de indicações"
        value={String(kpis.totalIndicacoes)}
        icon={Users}
      />
      <AdminMetricCard
        label="Conversão"
        value={formatPercent(kpis.conversionRate)}
        icon={TrendingUp}
        hint={`${kpis.totalFechadas} fechadas · ${kpis.totalPerdidas} perdidas`}
      />
      <AdminMetricCard
        label="Faturamento"
        value={formatBRL(kpis.faturamento)}
        icon={BadgeDollarSign}
      />
      <AdminMetricCard
        label="Comissões pagas"
        value={formatBRL(kpis.comissoesPagas)}
        icon={PiggyBank}
      />
      <AdminMetricCard
        label="Ticket médio"
        value={formatBRL(kpis.ticketMedio)}
        icon={Receipt}
      />
      <AdminMetricCard
        label="Pipeline em aberto"
        value={formatBRL(kpis.pipelineAberto)}
        icon={CircleDollarSign}
        hint="Soma do potencial em enviado / análise / negociação"
      />
      <AdminMetricCard
        label="Tempo médio de fechamento"
        value={formatDays(kpis.tempoMedioFechamentoDias)}
        icon={Hourglass}
        hint="Estimativa baseada em updated_at"
      />
    </div>
  );
}
