import type { ComponentType } from "react";

type AdminMetricCardProps = {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  hint?: string;
};

export function AdminMetricCard({ label, value, icon: Icon, hint }: AdminMetricCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 text-zinc-700">
        <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-zinc-900">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}
