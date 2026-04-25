import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  UserPlus,
  Send,
  Wallet,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  TrendingUp,
  Users,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IndicaPro — Ganhe dinheiro indicando pessoas ou empresas" },
      {
        name: "description",
        content:
          "Indique pessoas ou empresas e receba comissão por cada negócio fechado. Simples, rápido e transparente.",
      },
      { property: "og:title", content: "IndicaPro — Ganhe indicando" },
      {
        property: "og:description",
        content: "Você indica. Nós fechamos. Você recebe comissão.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">IndicaPro</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#como-funciona" className="hover:text-foreground transition">Como funciona</a>
            <a href="#prova" className="hover:text-foreground transition">Resultados</a>
            <a href="#objeções" className="hover:text-foreground transition">Dúvidas</a>
          </nav>
          <Link to="/cadastro">
            <Button variant="default" className="rounded-xl">Começar</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-gradient-hero overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-50"
             style={{ backgroundImage: "radial-gradient(circle at 20% 20%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 50%)" }} />
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-light text-primary-dark text-xs font-semibold mb-6">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Mais de 2.000 indicações pagas
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-[40px] font-bold leading-[1.1] tracking-tight">
              Ganhe dinheiro <span className="text-primary">indicando</span> pessoas
              <br />ou empresas
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              Você indica. Nós fechamos. Você recebe comissão. Sem precisar vender, sem precisar investir.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/cadastro">
                <Button size="lg" className="rounded-xl h-13 px-7 text-base font-semibold shadow-glow group">
                  Começar a ganhar agora
                  <ArrowRight className="ml-1 h-5 w-5 group-hover:translate-x-1 transition" />
                </Button>
              </Link>
              <a href="#como-funciona">
                <Button size="lg" variant="outline" className="rounded-xl h-13 px-7 text-base font-medium bg-card">
                  Ver como funciona
                </Button>
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Cadastro grátis</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Pagamento garantido</div>
            </div>
          </div>

          {/* Mock Dashboard */}
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-2xl" />
            <div className="relative rounded-2xl bg-card shadow-card-hover border border-border p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs text-muted-foreground">Total ganho</p>
                  <p className="text-3xl font-bold text-primary">R$ 12.450</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary-light grid place-items-center">
                  <Wallet className="h-5 w-5 text-primary-dark" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <MiniStat label="Este mês" value="R$ 2.150" tone="primary" />
                <MiniStat label="Pendente" value="R$ 3.800" tone="accent" />
                <MiniStat label="Indicações" value="48" tone="muted" />
              </div>
              <div className="space-y-2.5">
                {[
                  { n: "Mariana Silva", v: "+ R$ 750", s: "Fechado" },
                  { n: "Padaria Bom Pão", v: "+ R$ 1.500", s: "Em negociação" },
                  { n: "Carlos Eduardo", v: "+ R$ 500", s: "Em análise" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{r.n}</p>
                      <p className="text-xs text-muted-foreground">{r.s}</p>
                    </div>
                    <span className="text-sm font-bold text-primary">{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider">Como funciona</p>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">Em 3 passos simples</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 relative">
            <Step n={1} icon={UserPlus} title="Cadastro" desc="Crie sua conta grátis em menos de 1 minuto. Sem burocracia." />
            <Step n={2} icon={Send} title="Indicação" desc="Indique pessoas ou empresas que podem precisar dos nossos serviços." />
            <Step n={3} icon={Wallet} title="Comissão" desc="Receba até R$ 1.500 por cada negócio fechado direto na sua conta." highlight />
          </div>
        </div>
      </section>

      {/* Prova */}
      <section id="prova" className="py-20 px-6 bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider">Resultados reais</p>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">Quem indica, ganha de verdade</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <ProofCard icon={Wallet} value="+ R$ 750" label="Por indicação fechada" />
            <ProofCard icon={TrendingUp} value="+ R$ 12.450" label="Ganhos médios anuais" />
            <ProofCard icon={Users} value="+ 2.000" label="Indicações pagas" />
            <ProofCard icon={ShieldCheck} value="100%" label="Pagamentos garantidos" />
          </div>
        </div>
      </section>

      {/* Objeções */}
      <section id="objeções" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider">Sem complicação</p>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">Perguntas que você está fazendo agora</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <ObjCard q="Precisa vender?" a="Não" positive={false} />
            <ObjCard q="Precisa investir?" a="Não" positive={false} />
            <ObjCard q="Funciona pra mim?" a="Sim" positive={true} />
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-primary p-10 md:p-14 text-center shadow-glow relative overflow-hidden">
          <div className="absolute inset-0 opacity-20"
               style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white, transparent 40%)" }} />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">
              Comece agora e faça sua primeira indicação
            </h2>
            <p className="mt-4 text-primary-foreground/90 text-lg">
              Você pode ganhar sua primeira comissão ainda esta semana.
            </p>
            <Link to="/cadastro" className="inline-block mt-8">
              <Button size="lg" variant="secondary" className="rounded-xl h-13 px-8 text-base font-semibold bg-card text-foreground hover:bg-card/90">
                Quero começar a ganhar
                <ArrowRight className="ml-1 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between text-sm text-muted-foreground">
          <p>© 2025 IndicaPro. Todos os direitos reservados.</p>
          <p>Pagamentos garantidos por contrato.</p>
        </div>
      </footer>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "primary" | "accent" | "muted" }) {
  const toneClass =
    tone === "primary" ? "text-primary" : tone === "accent" ? "text-accent-foreground" : "text-foreground";
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-base font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Step({
  n, icon: Icon, title, desc, highlight,
}: { n: number; icon: React.ComponentType<{ className?: string }>; title: string; desc: string; highlight?: boolean }) {
  return (
    <div
      className={`relative rounded-2xl p-7 shadow-card border transition hover:shadow-card-hover ${
        highlight ? "bg-primary-light border-primary" : "bg-card border-border"
      }`}
    >
      <div className={`h-14 w-14 rounded-2xl grid place-items-center mb-5 ${
        highlight ? "bg-primary text-primary-foreground" : "bg-primary-light text-primary-dark"
      }`}>
        <Icon className="h-7 w-7" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-xs font-bold ${highlight ? "text-primary-dark" : "text-muted-foreground"}`}>
          PASSO {n}
        </span>
      </div>
      <h3 className={`text-xl font-semibold mt-1 ${highlight ? "text-primary-dark" : ""}`}>{title}</h3>
      <p className="text-sm text-muted-foreground mt-2">{desc}</p>
    </div>
  );
}

function ProofCard({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-6 shadow-card hover:shadow-card-hover transition">
      <div className="h-11 w-11 rounded-xl bg-primary-light grid place-items-center mb-4">
        <Icon className="h-5 w-5 text-primary-dark" />
      </div>
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function ObjCard({ q, a, positive }: { q: string; a: string; positive: boolean }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-6 shadow-card text-center">
      <p className="text-base text-muted-foreground">{q}</p>
      <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-lg ${
        positive ? "bg-primary-light text-primary-dark" : "bg-muted text-foreground"
      }`}>
        {positive ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
        {a}
      </div>
    </div>
  );
}
