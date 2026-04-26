import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";

export const Route = createFileRoute("/indicacoes")({
  head: () => ({
    meta: [{ title: "Indicações — ATOM TECH" }],
  }),
  component: IndicacoesRoute,
});

function IndicacoesRoute() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-white px-6 py-8 lg:px-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o dashboard
        </Link>

        <section className="mt-8 rounded-2xl border border-border bg-card p-8">
          <h1 className="text-2xl font-bold">Minhas indicações</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Página em construção. Vamos implementar a listagem completa de indicações nesta rota.
          </p>
        </section>
      </main>
    </RequireAuth>
  );
}
