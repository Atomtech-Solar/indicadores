import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminAnalytics, type AnalyticsPeriod } from "@/lib/admin-analytics";
import { AnalyticsPeriodFilter } from "./analytics-period-filter";
import { AnalyticsKpiCards } from "./analytics-kpi-cards";
import { AnalyticsFunnel } from "./analytics-funnel";
import { AnalyticsRevenueChart } from "./analytics-revenue-chart";
import { AnalyticsRankingTable } from "./analytics-ranking-table";
import { AnalyticsTipoMix } from "./analytics-tipo-mix";

type AnalyticsTabProps = {
  enabled: boolean;
};

export function AnalyticsTab({ enabled }: AnalyticsTabProps) {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["admin-analytics", period],
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () => fetchAdminAnalytics(period),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Analytics</h2>
          <p className="text-sm text-zinc-600">
            Análise consolidada do programa de indicações com cálculo agregado no banco.
          </p>
        </div>
        <AnalyticsPeriodFilter value={period} onChange={setPeriod} disabled={isFetching} />
      </header>

      {isLoading && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
          Carregando analytics...
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 text-sm text-rose-700 shadow-sm">
          Não foi possível carregar os dados de analytics.
          {error instanceof Error && error.message ? <span className="block mt-1 text-xs text-rose-700/80">{error.message}</span> : null}
        </div>
      )}

      {data && (
        <>
          <AnalyticsKpiCards kpis={data.kpis} />
          <AnalyticsFunnel funnel={data.funnel} />
          <AnalyticsRevenueChart data={data.revenueSeries} />
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <AnalyticsRankingTable ranking={data.ranking} />
            <AnalyticsTipoMix mix={data.mix} />
          </div>
        </>
      )}
    </div>
  );
}
