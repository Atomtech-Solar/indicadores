import type { AdminAnalyticsMix } from "@/lib/admin-analytics";

type AnalyticsTipoMixProps = {
  mix: AdminAnalyticsMix;
};

type MixRow = {
  label: string;
  value: number;
  color: string;
};

function MixBars({ rows, total, emptyLabel }: { rows: MixRow[]; total: number; emptyLabel: string }) {
  if (total <= 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const pct = total > 0 ? (row.value / total) * 100 : 0;
        return (
          <div key={row.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-700">{row.label}</span>
              <span className="font-medium text-zinc-900">
                {row.value}{" "}
                <span className="text-xs font-normal text-zinc-500">
                  ({pct.toFixed(1).replace(".", ",")}%)
                </span>
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className={`h-full rounded-full ${row.color}`}
                style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsTipoMix({ mix }: AnalyticsTipoMixProps) {
  const tipoTotal = mix.porTipo.pessoa + mix.porTipo.empresa;
  const projetoTotal =
    mix.porTipoProjeto.usina_solar + mix.porTipoProjeto.carregador_veicular + mix.porTipoProjeto.outros;

  const tipoRows: MixRow[] = [
    { label: "Pessoa física", value: mix.porTipo.pessoa, color: "bg-emerald-500" },
    { label: "Empresa", value: mix.porTipo.empresa, color: "bg-blue-500" },
  ];

  const projetoRows: MixRow[] = [
    { label: "Usina solar", value: mix.porTipoProjeto.usina_solar, color: "bg-amber-500" },
    { label: "Carregador veicular", value: mix.porTipoProjeto.carregador_veicular, color: "bg-indigo-500" },
    { label: "Outros / não informado", value: mix.porTipoProjeto.outros, color: "bg-zinc-400" },
  ];

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-zinc-900">Mix de indicações</h3>
      <p className="text-sm text-zinc-600">Distribuição das indicações criadas no período.</p>

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-800">Pessoa / Empresa</p>
          <MixBars rows={tipoRows} total={tipoTotal} emptyLabel="Sem indicações no período." />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-800">Tipo de projeto</p>
          <MixBars rows={projetoRows} total={projetoTotal} emptyLabel="Sem tipo de projeto informado no período." />
        </div>
      </div>
    </section>
  );
}
