import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, Wallet, ArrowRight, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/confirmacao")({
  head: () => ({
    meta: [{ title: "Indicação enviada — IndicaPro" }],
  }),
  component: Confirmacao,
});

function Confirmacao() {
  return (
    <div className="min-h-screen bg-background grid place-items-center px-6 py-12">
      <div className="w-full max-w-lg text-center">
        <div className="relative inline-flex">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative h-24 w-24 rounded-full bg-gradient-primary grid place-items-center shadow-glow">
            <CheckCircle2 className="h-12 w-12 text-primary-foreground" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mt-7 tracking-tight">
          Indicação enviada com sucesso
        </h1>
        <p className="text-muted-foreground mt-3 text-base">
          Nossa equipe entrará em contato em até <strong className="text-foreground">24 horas</strong>.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mt-10">
          <div className="rounded-2xl bg-card border border-border shadow-card p-6 text-left">
            <div className="h-10 w-10 rounded-xl bg-warning/20 grid place-items-center mb-3">
              <Clock className="h-5 w-5 text-warning-foreground" />
            </div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Status</p>
            <p className="text-lg font-semibold mt-1">Em análise</p>
          </div>
          <div className="rounded-2xl bg-primary-light border border-primary shadow-card p-6 text-left">
            <div className="h-10 w-10 rounded-xl bg-primary grid place-items-center mb-3">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <p className="text-xs text-primary-dark font-semibold uppercase tracking-wide">Você pode ganhar</p>
            <p className="text-2xl font-bold text-primary-dark mt-1">até R$ 1.500</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/dashboard">
            <Button className="rounded-xl h-12 px-6 text-base font-semibold w-full sm:w-auto">
              Ir para o dashboard
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
          <Link to="/pos-cadastro">
            <Button variant="outline" className="rounded-xl h-12 px-6 text-base font-medium bg-card w-full sm:w-auto">
              <Send className="h-4 w-4 mr-2" />
              Enviar outra indicação
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
