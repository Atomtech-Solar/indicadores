import { formatBRL } from "@/lib/format";
import type { AdminAnalyticsRankingItem } from "@/lib/admin-analytics";

type AnalyticsRankingTableProps = {
  ranking: AdminAnalyticsRankingItem[];
};

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

export function AnalyticsRankingTable({ ranking }: AnalyticsRankingTableProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-200">
        <h3 className="text-lg font-semibold text-zinc-900">Ranking de indicadores</h3>
        <p className="text-sm text-zinc-600">
          Top 10 por receita de comissão paga no período. Empate desempata por faturamento gerado.
        </p>
      </div>

      <div className="max-[700px]:hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left border-b border-zinc-200 bg-zinc-50">
              <th className="px-5 py-3 font-medium text-zinc-700">#</th>
              <th className="px-5 py-3 font-medium text-zinc-700">Indicador</th>
              <th className="px-5 py-3 font-medium text-zinc-700 text-right">Indicações</th>
              <th className="px-5 py-3 font-medium text-zinc-700 text-right">Fechadas</th>
              <th className="px-5 py-3 font-medium text-zinc-700 text-right">Conversão</th>
              <th className="px-5 py-3 font-medium text-zinc-700 text-right">Comissão paga</th>
              <th className="px-5 py-3 font-medium text-zinc-700 text-right">Faturamento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {ranking.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-center text-zinc-500">
                  Nenhum indicador com movimento no período selecionado.
                </td>
              </tr>
            )}
            {ranking.map((row, index) => (
              <tr key={row.usuario_id || `${row.nome}-${index}`}>
                <td className="px-5 py-3 text-zinc-500">{index + 1}</td>
                <td className="px-5 py-3 font-medium text-zinc-900">{row.nome}</td>
                <td className="px-5 py-3 text-right text-zinc-700">{row.totalIndicacoes}</td>
                <td className="px-5 py-3 text-right text-zinc-700">{row.totalFechadas}</td>
                <td className="px-5 py-3 text-right text-zinc-700">{formatPercent(row.conversao)}</td>
                <td className="px-5 py-3 text-right font-semibold text-emerald-700">{formatBRL(row.receitaComissao)}</td>
                <td className="px-5 py-3 text-right text-zinc-700">{formatBRL(row.faturamentoGerado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hidden max-[700px]:grid gap-3 p-4">
        {ranking.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
            Nenhum indicador com movimento no período selecionado.
          </div>
        )}
        {ranking.map((row, index) => (
          <div
            key={`mob-rank-${row.usuario_id || `${row.nome}-${index}`}`}
            className="rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900">
                <span className="text-zinc-500">#{index + 1}</span> · {row.nome}
              </p>
              <span className="text-sm font-semibold text-emerald-700">{formatBRL(row.receitaComissao)}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-700">
              <p>
                <span className="font-medium text-zinc-900">Indicações:</span> {row.totalIndicacoes}
              </p>
              <p>
                <span className="font-medium text-zinc-900">Fechadas:</span> {row.totalFechadas}
              </p>
              <p>
                <span className="font-medium text-zinc-900">Conversão:</span> {formatPercent(row.conversao)}
              </p>
              <p>
                <span className="font-medium text-zinc-900">Faturamento:</span> {formatBRL(row.faturamentoGerado)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
