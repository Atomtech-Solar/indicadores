import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/format";
import type { AdminAnalyticsRevenuePoint } from "@/lib/admin-analytics";

type AnalyticsRevenueChartProps = {
  data: AdminAnalyticsRevenuePoint[];
};

function formatBRLCompact(value: number) {
  if (!Number.isFinite(value)) return "R$ 0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (abs >= 1_000) return `R$ ${(value / 1_000).toFixed(1).replace(".", ",")}k`;
  return `R$ ${value.toFixed(0)}`;
}

export function AnalyticsRevenueChart({ data }: AnalyticsRevenueChartProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Faturamento × comissões pagas</h3>
          <p className="text-sm text-zinc-600">
            Últimos 12 meses (independente do filtro). Faturamento por <span className="font-medium">updated_at</span> de
            indicações fechadas.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-zinc-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-6 bg-emerald-600" /> Faturamento
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-6 bg-blue-600" /> Comissões pagas
          </span>
        </div>
      </div>

      <div className="mt-4 h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" stroke="#71717a" fontSize={12} tickMargin={6} />
            <YAxis stroke="#71717a" fontSize={12} tickFormatter={formatBRLCompact} width={64} />
            <Tooltip
              cursor={{ stroke: "#a1a1aa", strokeWidth: 1, strokeDasharray: "3 3" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 12,
                padding: "8px 12px",
                boxShadow: "0 8px 20px -8px rgba(0,0,0,0.15)",
              }}
              labelStyle={{ color: "#111", fontWeight: 600 }}
              formatter={(value: number, name: string) => [formatBRL(Number(value)), name]}
            />
            <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="faturamento"
              name="Faturamento"
              stroke="#16a34a"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="comissoesPagas"
              name="Comissões pagas"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
