import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Wallet,
  CreditCard,
  BarChart3,
  User,
  Bell,
  Plus,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore, formatBRL, formatDate, type IndicacaoStatus, type IndicacaoTipo } from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — IndicaPro" }] }),
  component: Dashboard,
});

const navItems = [
  { label: "Visão geral", icon: LayoutDashboard, active: true },
  { label: "Indicações", icon: Users },
  { label: "Comissões", icon: Wallet },
  { label: "Pagamentos", icon: CreditCard },
  { label: "Relatórios", icon: BarChart3 },
  { label: "Perfil", icon: User },
];

function Dashboard() {
  const usuario = useAppStore((s) => s.usuario);
  const indicacoes = useAppStore((s) => s.indicacoes);
  const ganhos = useAppStore((s) => s.ganhos);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const nome = usuario?.nome?.split(" ")[0] ?? "João";

  const stats = useMemo(() => {
    const totalGanho = ganhos.reduce((s, g) => s + g.valor, 0);
    const mes = ganhos
      .filter((g) => g.data.startsWith("2025-04"))
      .reduce((s, g) => s + g.valor, 0);
    const andamento = indicacoes
      .filter((i) => i.status === "Em análise" || i.status === "Em negociação")
      .reduce((s, i) => s + i.valorPotencial, 0);
    return { totalGanho, mes, andamento, disponivel: 1200 };
  }, [ganhos, indicacoes]);

  const funil = useMemo(() => {
    const total = indicacoes.length;
    const analise = indicacoes.filter((i) => i.status === "Em análise").length;
    const negociacao = indicacoes.filter((i) => i.status === "Em negociação").length;
    const fechados = indicacoes.filter((i) => i.status === "Fechado").length;
    return [
      { label: "Indicações", value: total, color: "bg-muted-foreground/20", text: "text-foreground" },
      { label: "Em análise", value: analise, color: "bg-warning/30", text: "text-warning-foreground" },
      { label: "Em negociação", value: negociacao, color: "bg-primary/30", text: "text-primary-dark" },
      { label: "Fechados", value: fechados, color: "bg-primary", text: "text-primary-foreground" },
    ];
  }, [indicacoes]);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">IndicaPro</span>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                item.active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="rounded-xl bg-gradient-success p-4">
            <p className="text-xs font-semibold text-primary-dark">Potencial em aberto</p>
            <p className="text-xl font-bold text-primary-dark mt-1">R$ 8.500</p>
            <Button
              size="sm"
              onClick={() => setShowModal(true)}
              className="w-full mt-3 rounded-lg h-9"
            >
              Nova indicação
            </Button>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 min-w-0">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 lg:px-10 py-4 flex items-center justify-between sticky top-0 z-20">
          <div>
            <p className="text-xs text-muted-foreground">Bem-vindo de volta</p>
            <h1 className="text-lg font-semibold">Olá, {nome} 👋</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative h-10 w-10 rounded-xl border border-border hover:bg-muted grid place-items-center transition">
              <Bell className="h-[18px] w-[18px] text-muted-foreground" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
            </button>
            <div className="h-10 w-10 rounded-xl bg-gradient-primary grid place-items-center text-primary-foreground font-bold text-sm">
              {nome.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="px-6 lg:px-10 py-8 space-y-7 max-w-[1400px]">
          {/* Cards de stats */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <StatCard label="Total ganho" value={formatBRL(stats.totalGanho)} tone="primary" trend="+18% vs mês anterior" />
            <StatCard label="Este mês" value={formatBRL(stats.mes)} tone="primary" trend="+R$ 750 esta semana" />
            <StatCard label="Em andamento" value={formatBRL(stats.andamento)} tone="warning" trend="6 negociações ativas" />
            <StatCard label="Disponível para saque" value={formatBRL(stats.disponivel)} tone="primary" trend="Saque imediato via Pix" cta />
          </div>

          {/* CTA Nova Indicação */}
          <div className="rounded-2xl bg-gradient-primary p-6 lg:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-glow">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-primary-foreground">
                Indique mais e ganhe ainda mais
              </h3>
              <p className="text-primary-foreground/85 mt-1 text-sm">
                Cada indicação aprovada pode render até R$ 1.500.
              </p>
            </div>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setShowModal(true)}
              className="rounded-xl h-12 px-6 font-semibold bg-card text-foreground hover:bg-card/90"
            >
              <Plus className="h-5 w-5 mr-1" />
              Nova indicação
            </Button>
          </div>

          {/* Funil */}
          <Section title="Funil de indicações" subtitle="Acompanhe o progresso de cada lead">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {funil.map((f, i) => (
                <div key={f.label} className="relative">
                  <div className={`rounded-xl p-5 ${f.color}`}>
                    <p className={`text-xs font-semibold ${f.text} opacity-80`}>{f.label}</p>
                    <p className={`text-3xl font-bold ${f.text} mt-1`}>{f.value}</p>
                  </div>
                  {i < funil.length - 1 && (
                    <ArrowUpRight className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rotate-45 z-10" />
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* Grid: tabela + ganhos */}
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <Section title="Indicações recentes" subtitle="Suas últimas 8 indicações">
                <div className="overflow-x-auto -mx-6 lg:-mx-7 px-6 lg:px-7">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b border-border">
                        <th className="font-medium pb-3">Nome</th>
                        <th className="font-medium pb-3">Status</th>
                        <th className="font-medium pb-3">Valor potencial</th>
                        <th className="font-medium pb-3">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {indicacoes.slice(0, 8).map((i) => (
                        <tr key={i.id} className="group">
                          <td className="py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-muted grid place-items-center text-xs font-semibold text-muted-foreground">
                                {i.nome.slice(0, 1)}
                              </div>
                              <div>
                                <p className="font-medium">{i.nome}</p>
                                <p className="text-xs text-muted-foreground">{i.tipo}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5"><StatusBadge status={i.status} /></td>
                          <td className="py-3.5 font-semibold text-primary">{formatBRL(i.valorPotencial)}</td>
                          <td className="py-3.5 text-muted-foreground">{formatDate(i.data)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </div>

            <div>
              <Section title="Últimos ganhos" subtitle="Comissões recebidas">
                <ul className="space-y-3">
                  {ganhos.map((g) => (
                    <li key={g.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 shrink-0 rounded-xl bg-primary-light grid place-items-center">
                          <Wallet className="h-4 w-4 text-primary-dark" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{g.nomeIndicado}</p>
                          <p className="text-xs text-muted-foreground">Comissão recebida · {formatDate(g.data)}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary shrink-0">+ {formatBRL(g.valor)}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          </div>

          {/* Gráfico simples + Potencial */}
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <Section title="Crescimento mensal" subtitle="Comissões nos últimos 6 meses">
                <SimpleLineChart />
              </Section>
            </div>
            <div>
              <div className="rounded-2xl bg-gradient-primary p-7 shadow-glow h-full flex flex-col justify-between min-h-[260px]">
                <div className="flex items-center gap-2 text-primary-foreground/80 text-xs font-semibold uppercase tracking-wide">
                  <TrendingUp className="h-4 w-4" /> Potencial em aberto
                </div>
                <div>
                  <p className="text-primary-foreground/80 text-sm">Você pode ganhar até</p>
                  <p className="text-4xl md:text-5xl font-bold text-primary-foreground mt-1">R$ 8.500</p>
                  <p className="text-primary-foreground/80 text-xs mt-2">com indicações já em andamento</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setShowModal(true)}
                  className="rounded-xl h-11 font-semibold bg-card text-foreground hover:bg-card/90"
                >
                  Indicar mais alguém
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showModal && (
        <NovaIndicacaoModal
          onClose={() => setShowModal(false)}
          onSent={() => {
            setShowModal(false);
            navigate({ to: "/confirmacao" });
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label, value, tone, trend, cta,
}: {
  label: string; value: string; tone: "primary" | "warning"; trend: string; cta?: boolean;
}) {
  const valueColor = tone === "primary" ? "text-primary" : "text-warning-foreground";
  return (
    <div className="rounded-2xl bg-card border border-border shadow-card p-5 hover:shadow-card-hover transition">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${valueColor}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-2">{trend}</p>
      {cta && (
        <button className="mt-3 text-xs font-semibold text-primary hover:underline">
          Sacar agora →
        </button>
      )}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border shadow-card p-6 lg:p-7">
      <div className="mb-5">
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: IndicacaoStatus }) {
  const map: Record<IndicacaoStatus, string> = {
    "Em análise": "bg-warning/25 text-warning-foreground",
    "Em negociação": "bg-primary/15 text-primary-dark",
    "Fechado": "bg-primary text-primary-foreground",
    "Perdido": "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${map[status]}`}>
      {status}
    </span>
  );
}

function SimpleLineChart() {
  const data = [
    { m: "Nov", v: 1200 },
    { m: "Dez", v: 1800 },
    { m: "Jan", v: 1500 },
    { m: "Fev", v: 2400 },
    { m: "Mar", v: 2200 },
    { m: "Abr", v: 3200 },
  ];
  const max = Math.max(...data.map((d) => d.v));
  const w = 600;
  const h = 180;
  const pad = 24;
  const stepX = (w - pad * 2) / (data.length - 1);
  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((d.v / max) * (h - pad * 2));
    return [x, y] as const;
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const area = `${path} L ${points[points.length - 1][0]} ${h - pad} L ${points[0][0]} ${h - pad} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[200px]">
        <defs>
          <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#gradArea)" />
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r={4} fill="var(--card)" stroke="var(--primary)" strokeWidth={2} />
            <text x={p[0]} y={h - 6} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">
              {data[i].m}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function NovaIndicacaoModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const addIndicacao = useAppStore((s) => s.addIndicacao);
  const [form, setForm] = useState({ nome: "", whatsapp: "", tipo: "Pessoa" as IndicacaoTipo });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.whatsapp) return;
    addIndicacao(form);
    onSent();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-card-hover border border-border p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold">Nova indicação</h3>
            <p className="text-sm text-muted-foreground mt-1">Preencha os dados da pessoa ou empresa</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-muted grid place-items-center transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Tipo</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
              {(["Pessoa", "Empresa"] as IndicacaoTipo[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, tipo: t })}
                  className={`py-2 rounded-lg text-sm font-semibold transition ${
                    form.tipo === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="m-nome" className="text-sm font-medium">Nome</Label>
            <Input id="m-nome" required value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="mt-1.5 rounded-[10px] h-11" />
          </div>
          <div>
            <Label htmlFor="m-w" className="text-sm font-medium">WhatsApp</Label>
            <Input id="m-w" required value={form.whatsapp} placeholder="(11) 99999-9999"
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              className="mt-1.5 rounded-[10px] h-11" />
          </div>
          <Button type="submit" className="w-full rounded-xl h-12 text-base font-semibold mt-2">
            <Send className="h-4 w-4 mr-2" />
            Enviar indicação
          </Button>
        </form>
      </div>
    </div>
  );
}
