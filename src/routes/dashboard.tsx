import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Bell,
  Plus,
  TrendingUp,
  ArrowRight,
  Send,
  X,
  LogOut,
  CircleDollarSign,
  ChartLine,
  Hourglass,
  PiggyBank,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";
import {
  dbStatusToUi,
  mapTipoToDb,
  mapTipoDbToUi,
  type IndicacaoTipo,
  type UiIndicacaoStatus,
} from "@/lib/indicacao-domain";
import { formatBRL, formatDate } from "@/lib/format";
import { fetchUsuarioRow } from "@/lib/usuario-profile";
import type { Tables } from "@/lib/supabase/database.types";
import { RequireAuth } from "@/components/auth/RequireAuth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — IndicaPro" }] }),
  component: DashboardRouteComponent,
});

function DashboardRouteComponent() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}

const navItems = [
  { label: "Visão geral", icon: LayoutDashboard, active: true },
  { label: "Indicações", icon: Users },
  { label: "Comissões", icon: Wallet },
];

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

function last6MonthLabels() {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short" });
    out.push({ key, label: label.replace(".", "") });
  }
  return out;
}

function Dashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["usuario"],
    queryFn: fetchUsuarioRow,
  });

  const { data: indicacoes = [], isLoading: loadingInd } = useQuery({
    queryKey: ["indicacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("indicacoes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Tables<"indicacoes">[];
    },
  });

  const { data: comissoes = [], isLoading: loadingCom } = useQuery({
    queryKey: ["comissoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comissoes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Tables<"comissoes">[];
    },
  });

  const nome = profile?.nome?.split(" ")[0] ?? "Parceiro";

  const now = new Date();
  const currentMonthPrefix = monthKey(now.toISOString());

  const stats = useMemo(() => {
    const pagas = comissoes.filter((c) => c.status === "pago");
    const totalGanho = pagas.reduce((s, g) => s + Number(g.valor), 0);
    const mes = pagas
      .filter((g) => monthKey(g.created_at) === currentMonthPrefix)
      .reduce((s, g) => s + Number(g.valor), 0);
    const andamento = indicacoes
      .filter((i) => ["enviado", "analise", "negociacao"].includes(i.status))
      .reduce((s, i) => s + Number(i.valor_potencial), 0);
    const disponivel = comissoes
      .filter((c) => c.status === "disponivel")
      .reduce((s, c) => s + Number(c.valor), 0);
    return { totalGanho, mes, andamento, disponivel };
  }, [comissoes, indicacoes, currentMonthPrefix]);

  const potencialAberto = useMemo(
    () =>
      indicacoes
        .filter((i) => !["fechado", "perdido"].includes(i.status))
        .reduce((s, i) => s + Number(i.valor_potencial), 0),
    [indicacoes],
  );

  const chartData = useMemo(() => {
    const months = last6MonthLabels();
    const byMonth: Record<string, number> = {};
    for (const m of months) byMonth[m.key] = 0;
    for (const c of comissoes) {
      if (c.status !== "pago") continue;
      const k = monthKey(c.created_at);
      if (k in byMonth) byMonth[k] += Number(c.valor);
    }
    return months.map((m) => ({ m: m.label, v: byMonth[m.key] ?? 0 }));
  }, [comissoes]);

  const loading = loadingInd || loadingCom;

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Você saiu da conta.");
      setShowProfileMenu(false);
      navigate({ to: "/login" });
    } catch {
      toast.error("Não foi possível sair agora. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-[#024b2e] border-r border-[#04653f] sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-[#04653f]">
          <Link to="/" className="flex items-center justify-center">
            <img
              src="/img/Ativo 3.png"
              alt="ATOM TECH"
              className="h-16 w-auto object-contain"
            />
          </Link>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                item.active
                  ? "bg-[#23a548] text-white"
                  : "text-white/90 hover:bg-[#0b6a42] hover:text-white"
              }`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[#04653f]">
          <div className="rounded-xl bg-gradient-success p-4">
            <p className="text-xs font-semibold text-primary-dark">Potencial em aberto</p>
            <p className="text-xl font-bold text-primary-dark mt-1">{formatBRL(potencialAberto)}</p>
            <Button size="sm" onClick={() => setShowModal(true)} className="w-full mt-3 rounded-lg h-9">
              Nova indicação
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 bg-white">
        <header className="bg-card border-b border-border px-6 lg:px-10 py-4 flex items-center justify-between sticky top-0 z-20">
          <div>
            <p className="text-xs text-muted-foreground">Bem-vindo de volta</p>
            <h1 className="text-lg font-semibold">Olá, {nome}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative h-10 w-10 rounded-xl border border-border hover:bg-muted grid place-items-center transition"
            >
              <Bell className="h-[18px] w-[18px] text-muted-foreground" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileMenu((prev) => !prev)}
                className="h-10 w-10 rounded-xl bg-gradient-primary grid place-items-center text-primary-foreground font-bold text-sm"
                aria-label="Abrir menu de perfil"
              >
                {nome.slice(0, 1).toUpperCase()}
              </button>

              {showProfileMenu && (
                <>
                  <button
                    type="button"
                    aria-label="Fechar menu de perfil"
                    onClick={() => setShowProfileMenu(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <div className="absolute right-0 top-12 z-20 w-44 rounded-xl border border-border bg-card shadow-card p-1.5">
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair da conta
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="px-6 lg:px-10 py-8 space-y-7 max-w-[1400px]">
          {loading && (
            <p className="text-sm text-muted-foreground">Atualizando seus dados…</p>
          )}

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <StatCard
              label="Total ganho"
              value={formatBRL(stats.totalGanho)}
              icon={CircleDollarSign}
              iconWrapClassName="bg-emerald-100 text-emerald-700"
              valueClassName="text-emerald-600"
              footerLabel="Todas as comissões recebidas"
              footerContent={<span className="text-emerald-600">↗ 24% vs mês anterior</span>}
            />
            <StatCard
              label="Ganho este mês"
              value={formatBRL(stats.mes)}
              icon={ChartLine}
              iconWrapClassName="bg-blue-100 text-blue-600"
              valueClassName="text-blue-600"
              footerLabel={`Comissões recebidas em ${now.toLocaleDateString("pt-BR", {
                month: "long",
              })}`}
              footerContent={<span className="text-blue-600">↗ 18% vs mês anterior</span>}
            />
            <StatCard
              label="Em andamento"
              value={formatBRL(stats.andamento)}
              icon={Hourglass}
              iconWrapClassName="bg-amber-100 text-amber-600"
              valueClassName="text-amber-600"
              footerLabel="Negócios em negociação"
              footerContent={
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  {indicacoes.filter((i) => i.status === "negociacao").length} indicações
                </span>
              }
            />
            <StatCard
              label="Disponível para saque"
              value={formatBRL(stats.disponivel)}
              icon={PiggyBank}
              iconWrapClassName="bg-emerald-100 text-emerald-700"
              valueClassName="text-emerald-600"
              footerLabel="Valor disponível para transferência"
              footerContent={
                <button
                  type="button"
                  className="inline-flex items-center rounded-full bg-emerald-700 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-800 transition"
                >
                  Sacar agora
                </button>
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3">
            <div className="rounded-xl bg-[#015022] px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg border border-white/30 grid place-items-center text-white">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-white font-semibold leading-tight">Tem alguém para indicar?</p>
                  <p className="text-white/90 text-sm mt-0.5">Quanto mais você indica, mais você ganha.</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setShowModal(true)}
                className="h-11 rounded-xl bg-[#2aad2a] hover:bg-[#249824] text-white font-semibold px-5"
              >
                <Plus className="h-5 w-5 mr-1" />
                Nova indicação
              </Button>
            </div>

            <Link
              to="/indicacoes"
              className="rounded-xl border border-[#0c6a3b]/35 bg-white px-5 py-4 flex items-center justify-between text-[#0b5a34] font-semibold hover:bg-[#f8fffb] transition"
            >
              <span>Ver minhas indicações</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

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
                            {i.nome_indicado.slice(0, 1)}
                          </div>
                          <div>
                            <p className="font-medium">{i.nome_indicado}</p>
                            <p className="text-xs text-muted-foreground">{mapTipoDbToUi(i.tipo)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <StatusBadge status={dbStatusToUi(i.status)} />
                      </td>
                      <td className="py-3.5 font-semibold text-primary">
                        {formatBRL(Number(i.valor_potencial))}
                      </td>
                      <td className="py-3.5 text-muted-foreground">{formatDate(i.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <Section title="Crescimento mensal" subtitle="Comissões pagas nos últimos 6 meses">
                <SimpleLineChart data={chartData} />
              </Section>
            </div>
            <div>
              <div className="rounded-2xl bg-gradient-primary p-7 shadow-glow h-full flex flex-col justify-between min-h-[260px]">
                <div className="flex items-center gap-2 text-primary-foreground/80 text-xs font-semibold uppercase tracking-wide">
                  <TrendingUp className="h-4 w-4" /> Potencial em aberto
                </div>
                <div>
                  <p className="text-primary-foreground/80 text-sm">Você pode ganhar até</p>
                  <p className="text-4xl md:text-5xl font-bold text-primary-foreground mt-1">
                    {formatBRL(potencialAberto)}
                  </p>
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
          onSent={(id) => {
            setShowModal(false);
            navigate({ to: "/indicacao-confirmacao", search: { indicacaoId: id } });
          }}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconWrapClassName,
  valueClassName,
  footerLabel,
  footerContent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconWrapClassName: string;
  valueClassName: string;
  footerLabel: string;
  footerContent?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 md:p-5">
      <div className="flex items-center gap-3">
        <div className={`h-8 w-8 shrink-0 rounded-full grid place-items-center ${iconWrapClassName}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[15px] font-medium text-zinc-900">{label}</p>
      </div>
      <p className={`mt-2 text-[29px] leading-none font-bold ${valueClassName}`}>{value}</p>
      <p className="mt-2 text-xs text-zinc-500">{footerLabel}</p>
      {footerContent && <div className="mt-2 text-xs font-medium">{footerContent}</div>}
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

function StatusBadge({ status }: { status: UiIndicacaoStatus }) {
  const map: Record<UiIndicacaoStatus, string> = {
    "Em análise": "bg-warning/25 text-warning-foreground",
    "Em negociação": "bg-primary/15 text-primary-dark",
    Fechado: "bg-primary text-primary-foreground",
    Perdido: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${map[status]}`}>
      {status}
    </span>
  );
}

function SimpleLineChart({ data }: { data: { m: string; v: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.v));
  const w = 600;
  const h = 180;
  const pad = 24;
  const stepX = (w - pad * 2) / Math.max(1, data.length - 1);
  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (d.v / max) * (h - pad * 2);
    return [x, y] as const;
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const area =
    points.length > 0
      ? `${path} L ${points[points.length - 1][0]} ${h - pad} L ${points[0][0]} ${h - pad} Z`
      : "";

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[200px]">
        <defs>
          <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {points.length > 0 && (
          <>
            <path d={area} fill="url(#gradArea)" />
            <path
              d={path}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p[0]} cy={p[1]} r={4} fill="var(--card)" stroke="var(--primary)" strokeWidth={2} />
                <text x={p[0]} y={h - 6} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">
                  {data[i].m}
                </text>
              </g>
            ))}
          </>
        )}
      </svg>
    </div>
  );
}

function NovaIndicacaoModal({
  onClose,
  onSent,
  queryClient,
}: {
  onClose: () => void;
  onSent: (id: number) => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [form, setForm] = useState({ nome: "", whatsapp: "", tipo: "Pessoa" as IndicacaoTipo });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: uid, error: rpcErr } = await supabase.rpc("get_my_usuario_id");
      if (rpcErr) throw rpcErr;
      if (uid == null) throw new Error("Complete seu perfil antes de indicar.");

      const { data, error } = await supabase
        .from("indicacoes")
        .insert({
          usuario_id: uid,
          nome_indicado: form.nome.trim(),
          whatsapp: form.whatsapp.trim(),
          tipo: mapTipoToDb(form.tipo),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: ["indicacoes"] });
      void queryClient.invalidateQueries({ queryKey: ["atividades"] });
      toast.success("Indicação enviada.");
      onSent(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.whatsapp) return;
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-card-hover border border-border p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold">Nova indicação</h3>
            <p className="text-sm text-muted-foreground mt-1">Preencha os dados da pessoa ou empresa</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-lg hover:bg-muted grid place-items-center transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
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
            <Label htmlFor="m-nome" className="text-sm font-medium">
              Nome
            </Label>
            <Input
              id="m-nome"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="mt-1.5 rounded-[10px] h-11"
            />
          </div>
          <div>
            <Label htmlFor="m-w" className="text-sm font-medium">
              WhatsApp
            </Label>
            <Input
              id="m-w"
              required
              value={form.whatsapp}
              placeholder="(11) 99999-9999"
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              className="mt-1.5 rounded-[10px] h-11"
            />
          </div>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-xl h-12 text-base font-semibold mt-2"
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar indicação
          </Button>
        </form>
      </div>
    </div>
  );
}
