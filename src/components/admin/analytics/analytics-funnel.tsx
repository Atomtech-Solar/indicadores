import { Fragment } from "react";
import type { AdminAnalyticsFunnel } from "@/lib/admin-analytics";

type AnalyticsFunnelProps = {
  funnel: AdminAnalyticsFunnel;
};

const STAGES: { key: keyof AdminAnalyticsFunnel; label: string }[] = [
  { key: "enviado", label: "Enviado" },
  { key: "analise", label: "Em análise" },
  { key: "negociacao", label: "Em negociação" },
  { key: "fechado", label: "Fechado" },
];

function rate(current: number, previous: number) {
  if (previous <= 0) return 0;
  return Math.round((current / previous) * 1000) / 10;
}

function formatRate(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

export function AnalyticsFunnel({ funnel }: AnalyticsFunnelProps) {
  const total = funnel.enviado + funnel.analise + funnel.negociacao + funnel.fechado + funnel.perdido;
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Funil de conversão</h3>
          <p className="text-sm text-zinc-600">
            Indicações criadas no período. Setas mostram a taxa relativa entre estágios consecutivos.
          </p>
        </div>
        <p className="text-xs text-zinc-500">Total no período: <span className="font-semibold text-zinc-700">{total}</span></p>
      </div>

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-stretch">
        {STAGES.map((stage, index) => {
          const value = funnel[stage.key];
          const next = STAGES[index + 1];
          const nextValue = next ? funnel[next.key] : null;
          const stageRate = next && nextValue !== null ? rate(nextValue, value) : null;
          return (
            <Fragment key={stage.key}>
              <div className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{stage.label}</p>
                <p className="mt-1 text-3xl font-bold text-zinc-900">{value}</p>
              </div>
              {next && stageRate !== null && (
                <div
                  className="flex items-center justify-center gap-1 text-zinc-500 md:flex-col md:gap-0.5"
                  aria-label={`Conversão de ${stage.label} para ${next.label}: ${formatRate(stageRate)}`}
                >
                  <span aria-hidden className="text-lg md:hidden">↓</span>
                  <span aria-hidden className="hidden text-lg md:inline">→</span>
                  <span className="text-xs font-semibold text-emerald-700">{formatRate(stageRate)}</span>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50/60 px-3 py-1 text-xs font-medium text-rose-700">
          Perdidos: <span className="font-semibold">{funnel.perdido}</span>
        </span>
        {total > 0 && (
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/60 px-3 py-1 text-xs font-medium text-emerald-700">
            Conversão geral: <span className="font-semibold">{formatRate(rate(funnel.fechado, total))}</span>
          </span>
        )}
      </div>
    </section>
  );
}
