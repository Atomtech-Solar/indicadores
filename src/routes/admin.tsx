import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Wallet,
  BarChart3,
  Settings,
  Shield,
  Bell,
  LogOut,
  TrendingUp,
  BadgeDollarSign,
  CalendarDays,
  PiggyBank,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { supabase } from "@/lib/supabase/client";
import { formatBRL, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { callAdminOps, callAdminOpsMutation, setCommission } from "@/lib/admin-edge";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — ATOM TECH" }],
  }),
  component: AdminRouteComponent,
});

function AdminRouteComponent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "usuarios" | "indicacoes" | "comissoes" | "fotos" | "relatorios" | "configuracoes">("overview");
  const [commissionModal, setCommissionModal] = useState<{ indicacaoId: number; nomeIndicado: string } | null>(null);
  const [commissionValue, setCommissionValue] = useState("");
  const [projetoValue, setProjetoValue] = useState("");

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["admin-overview"],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () =>
      callAdminOps<{
        metrics: {
          totalFaturamento: number;
          faturamentoMes: number;
          totalComissoesPagas: number;
          totalIndicacoes: number;
          totalIndicadores: number;
        };
        comissoesPagasLista: {
          id: number;
          usuario_nome: string;
          indicacao_nome: string;
          valor: number;
          data_pagamento: string;
        }[];
        growthSeries: { label: string; faturamento: number; comissoesPagas: number }[];
        funnel: { enviado: number; analise: number; negociacao: number; fechado: number; perdido: number };
        alerts: string[];
      }>({ action: "overview" }),
  });

  const { data: usuarios = [], isLoading: loadingUsuarios } = useQuery({
    queryKey: ["admin-usuarios"],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () =>
      callAdminOps<
        {
          id: number;
          usuario_id: string;
          nome: string;
          email: string;
          whatsapp: string;
          role: "indicador" | "admin";
          created_at: string;
          is_disabled: boolean;
        }[]
      >({ action: "list_users" }),
  });

  const { data: fotos = [], isLoading: loadingFotos } = useQuery({
    queryKey: ["admin-fotos"],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () =>
      callAdminOps<
        {
          id: number;
          usuario_nome: string;
          nome_indicado: string;
          conta_energia_url: string | null;
          foto_padrao_url: string | null;
          created_at: string;
        }[]
      >({ action: "list_fotos" }),
  });

  const { data: indicacoes = [], isLoading: loadingIndicacoes } = useQuery({
    queryKey: ["admin-indicacoes"],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () =>
      callAdminOps<
        {
          id: number;
          usuario_id: number;
          usuario_nome: string;
          nome_indicado: string;
          tipo: string;
          status: "enviado" | "analise" | "negociacao" | "fechado" | "perdido";
          valor_potencial: number | null;
          valor_projeto: number | null;
          created_at: string;
          updated_at: string;
        }[]
      >({ action: "list_indicacoes" }),
  });

  const { data: comissoes = [], isLoading: loadingComissoes } = useQuery({
    queryKey: ["admin-comissoes"],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () =>
      callAdminOps<
        {
          id: number;
          usuario_nome: string;
          indicacao_nome: string;
          valor: number;
          status: "pendente" | "disponivel" | "pago" | "cancelado";
          created_at: string;
        }[]
      >({ action: "list_comissoes" }),
  });

  const { data: reports, isLoading: loadingReports } = useQuery({
    queryKey: ["admin-reports"],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () =>
      callAdminOps<{
        ranking: { nome: string; totalIndicacoes: number; totalFechadas: number; receita: number }[];
        conversionRate: number;
        aggregates: { totalUsuarios: number; totalIndicacoes: number; totalComissoes: number; receitaPaga: number };
      }>({ action: "reports" }),
  });

  const promoteMutation = useMutation({
    mutationFn: (userId: string) => callAdminOpsMutation({ action: "set_user_role", userId, role: "admin" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success("Usuário promovido para admin.");
    },
    onError: () => toast.error("Não foi possível promover o usuário."),
  });

  const disableMutation = useMutation({
    mutationFn: (userId: string) => callAdminOpsMutation({ action: "disable_user", userId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      toast.success("Usuário desativado com sucesso.");
    },
    onError: () => toast.error("Não foi possível desativar o usuário."),
  });

  const reactivateMutation = useMutation({
    mutationFn: (userId: string) => callAdminOpsMutation({ action: "reactivate_user", userId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      toast.success("Usuário reativado com sucesso.");
    },
    onError: () => toast.error("Não foi possível reativar o usuário."),
  });

  const updateIndicacaoMutation = useMutation({
    mutationFn: ({ indicacaoId, status }: { indicacaoId: number; status: "enviado" | "analise" | "negociacao" | "fechado" | "perdido" }) =>
      callAdminOpsMutation({ action: "update_indicacao_status", indicacaoId, status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-indicacoes"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success("Status da indicação atualizado.");
    },
    onError: () => toast.error("Não foi possível atualizar a indicação."),
  });

  const updateComissaoMutation = useMutation({
    mutationFn: ({ comissaoId, status }: { comissaoId: number; status: "pendente" | "disponivel" | "pago" | "cancelado" }) =>
      callAdminOpsMutation({ action: "update_comissao_status", comissaoId, status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-comissoes"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success("Status da comissão atualizado.");
    },
    onError: () => toast.error("Não foi possível atualizar a comissão."),
  });

  const setCommissionMutation = useMutation({
    mutationFn: async () => {
      if (!commissionModal) throw new Error("Selecione uma indicação.");
      const numericComissao = Number(commissionValue.replace(",", "."));
      const numericProjeto = Number(projetoValue.replace(",", "."));
      if (!Number.isFinite(numericComissao) || numericComissao <= 0) {
        throw new Error("Informe um valor de comissão válido.");
      }
      if (!Number.isFinite(numericProjeto) || numericProjeto <= 0) {
        throw new Error("Informe o valor do projeto (faturamento) válido.");
      }
      await setCommission({
        indicacaoId: commissionModal.indicacaoId,
        valorComissao: numericComissao,
        valorProjeto: numericProjeto,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-comissoes"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-indicacoes"] });
      toast.success("Comissão definida com sucesso.");
      setCommissionModal(null);
      setCommissionValue("");
      setProjetoValue("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível definir a comissão.");
    },
  });

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Não foi possível sair agora.");
      return;
    }
    navigate({ to: "/login", replace: true });
  };

  const menuItems = useMemo(
    () => [
      { key: "overview", label: "Overview", icon: LayoutDashboard },
      { key: "usuarios", label: "Usuários", icon: Users },
      { key: "indicacoes", label: "Indicações", icon: TrendingUp },
      { key: "comissoes", label: "Comissões", icon: Wallet },
      { key: "fotos", label: "Fotos", icon: ImageIcon },
      { key: "relatorios", label: "Relatórios", icon: BarChart3 },
      { key: "configuracoes", label: "Configurações", icon: Settings },
    ] as const,
    [],
  );

  return (
    <RequireAdmin>
      <div className="min-h-screen flex bg-background">
        <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-[#024b2e] border-r border-[#04653f] sticky top-0 h-screen">
          <div className="px-6 py-5 border-b border-[#04653f]">
            <Link to="/" className="flex items-center justify-center">
              <img src="/img/Ativo 3.png" alt="ATOM TECH" className="h-16 w-auto object-contain" />
            </Link>
          </div>
          <nav className="flex-1 px-3 py-5 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === item.key ? "bg-[#23a548] text-white" : "text-white/90 hover:bg-[#0b6a42] hover:text-white"
                }`}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 bg-white">
          <header className="bg-card border-b border-border px-6 lg:px-10 py-4 flex items-center justify-between sticky top-0 z-20">
            <div>
              <p className="text-xs text-muted-foreground">Painel administrativo</p>
              <h1 className="text-lg font-semibold">Administração ATOM TECH</h1>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="relative h-10 w-10 rounded-xl border border-border hover:bg-muted grid place-items-center transition">
                <Bell className="h-[18px] w-[18px] text-muted-foreground" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
              </button>
              <Button type="button" variant="secondary" className="rounded-xl" onClick={() => void handleSignOut()}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </header>

          <div className="px-6 lg:px-10 py-8 space-y-6 max-w-[1400px] mx-auto">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
                  <AdminMetricCard
                    label="Faturamento total"
                    value={formatBRL(overview?.metrics?.totalFaturamento ?? 0)}
                    icon={BadgeDollarSign}
                  />
                  <AdminMetricCard
                    label="Faturamento mês"
                    value={formatBRL(overview?.metrics?.faturamentoMes ?? 0)}
                    icon={CalendarDays}
                  />
                  <AdminMetricCard
                    label="Comissões pagas"
                    value={formatBRL(overview?.metrics?.totalComissoesPagas ?? 0)}
                    icon={PiggyBank}
                  />
                  <AdminMetricCard
                    label="Indicadores"
                    value={String(overview?.metrics?.totalIndicadores ?? 0)}
                    icon={Users}
                  />
                  <AdminMetricCard
                    label="Indicações"
                    value={String(overview?.metrics?.totalIndicacoes ?? 0)}
                    icon={TrendingUp}
                  />
                </div>
                {loadingOverview && <p className="text-sm text-zinc-500">Carregando métricas...</p>}

                <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900">Comissões pagas</h3>
                      <p className="text-sm text-zinc-600">
                        Registros com status <span className="font-medium text-emerald-700">pago</span> (até 50 mais
                        recentes).
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-700">
                      Total: {formatBRL(overview?.metrics?.totalComissoesPagas ?? 0)}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead>
                        <tr className="text-left border-b border-zinc-200 bg-zinc-50">
                          <th className="px-5 py-3 font-medium text-zinc-700">Indicador</th>
                          <th className="px-5 py-3 font-medium text-zinc-700">Indicação</th>
                          <th className="px-5 py-3 font-medium text-zinc-700">Valor</th>
                          <th className="px-5 py-3 font-medium text-zinc-700">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {loadingOverview && (
                          <tr>
                            <td colSpan={4} className="px-5 py-6 text-center text-zinc-500">
                              Carregando comissões...
                            </td>
                          </tr>
                        )}
                        {!loadingOverview && (overview?.comissoesPagasLista?.length ?? 0) === 0 && (
                          <tr>
                            <td colSpan={4} className="px-5 py-6 text-center text-zinc-500">
                              Nenhuma comissão com status pago ainda.
                            </td>
                          </tr>
                        )}
                        {!loadingOverview &&
                          (overview?.comissoesPagasLista ?? []).map((c) => (
                            <tr key={c.id}>
                              <td className="px-5 py-3 font-medium text-zinc-900">{c.usuario_nome}</td>
                              <td className="px-5 py-3 text-zinc-700">{c.indicacao_nome}</td>
                              <td className="px-5 py-3 font-semibold text-emerald-700">{formatBRL(c.valor)}</td>
                              <td className="px-5 py-3 text-zinc-600">{formatDate(c.data_pagamento)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <div className="grid lg:grid-cols-[2fr_1fr] gap-5">
                  <section className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6">
                    <h3 className="text-lg font-semibold text-zinc-900">Faturamento e comissões</h3>
                    <p className="text-sm text-zinc-600">
                      Linha verde: faturamento (valor projeto, indicações fechadas). Linha azul: comissões pagas.
                    </p>
                    {loadingOverview ? (
                      <p className="text-sm text-zinc-500 mt-4">Carregando...</p>
                    ) : (
                      <DualAdminLineChart data={overview?.growthSeries ?? []} />
                    )}
                  </section>

                  <section className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6">
                    <h3 className="text-lg font-semibold text-zinc-900">Alertas</h3>
                    <div className="mt-3 space-y-2">
                      {(overview?.alerts ?? []).map((alert) => (
                        <div key={alert} className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-amber-700">
                          {alert}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <section className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6">
                  <h3 className="text-lg font-semibold text-zinc-900">Funil global de indicações</h3>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                    <FunnelMini title="Enviado" value={overview?.funnel.enviado ?? 0} />
                    <FunnelMini title="Análise" value={overview?.funnel.analise ?? 0} />
                    <FunnelMini title="Negociação" value={overview?.funnel.negociacao ?? 0} />
                    <FunnelMini title="Fechado" value={overview?.funnel.fechado ?? 0} />
                    <FunnelMini title="Perdido" value={overview?.funnel.perdido ?? 0} />
                  </div>
                </section>
              </div>
            )}

            {activeTab === "usuarios" && (
              <section className="rounded-2xl border border-zinc-200 bg-white">
                <div className="px-5 py-4 border-b border-zinc-200">
                  <h3 className="text-lg font-semibold text-zinc-900">Usuários</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="text-left border-b border-zinc-200">
                        <th className="px-5 py-3">Nome</th>
                        <th className="px-5 py-3">Email</th>
                        <th className="px-5 py-3">WhatsApp</th>
                        <th className="px-5 py-3">Role</th>
                        <th className="px-5 py-3">Data criação</th>
                        <th className="px-5 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {loadingUsuarios && <tr><td colSpan={6} className="px-5 py-6 text-center text-zinc-500">Carregando usuários...</td></tr>}
                      {usuarios.map((u) => (
                        <tr key={u.usuario_id} className={u.is_disabled ? "bg-rose-50/70" : undefined}>
                          <td className="px-5 py-3">{u.nome}</td>
                          <td className="px-5 py-3">{u.email}</td>
                          <td className="px-5 py-3">{u.whatsapp}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span>{u.role}</span>
                              {u.is_disabled && (
                                <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                  desativado
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3">{formatDate(u.created_at)}</td>
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" type="button" onClick={() => promoteMutation.mutate(u.usuario_id)} disabled={u.role === "admin" || promoteMutation.isPending}>
                                Promover admin
                              </Button>
                              {u.is_disabled ? (
                                <Button
                                  size="sm"
                                  type="button"
                                  variant="secondary"
                                  onClick={() => reactivateMutation.mutate(u.usuario_id)}
                                  disabled={reactivateMutation.isPending}
                                >
                                  Reativar
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  type="button"
                                  variant="secondary"
                                  onClick={() => disableMutation.mutate(u.usuario_id)}
                                  disabled={disableMutation.isPending}
                                >
                                  Desativar
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "indicacoes" && (
              <section className="rounded-2xl border border-zinc-200 bg-white">
                <div className="px-5 py-4 border-b border-zinc-200">
                  <h3 className="text-lg font-semibold text-zinc-900">Indicações globais</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[980px]">
                    <thead>
                      <tr className="text-left border-b border-zinc-200">
                        <th className="px-5 py-3">Usuário</th>
                        <th className="px-5 py-3">Nome indicado</th>
                        <th className="px-5 py-3">Tipo</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Comissão (pot.)</th>
                        <th className="px-5 py-3">Projeto</th>
                        <th className="px-5 py-3">Data</th>
                        <th className="px-5 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {loadingIndicacoes && (
                        <tr>
                          <td colSpan={8} className="px-5 py-6 text-center text-zinc-500">
                            Carregando indicações...
                          </td>
                        </tr>
                      )}
                      {indicacoes.map((i) => (
                        <tr key={i.id}>
                          <td className="px-5 py-3">{i.usuario_nome}</td>
                          <td className="px-5 py-3">{i.nome_indicado}</td>
                          <td className="px-5 py-3">{i.tipo}</td>
                          <td className="px-5 py-3">{i.status}</td>
                          <td className="px-5 py-3">
                            {i.valor_potencial == null ? "—" : formatBRL(Number(i.valor_potencial))}
                          </td>
                          <td className="px-5 py-3">
                            {i.valor_projeto == null ? "—" : formatBRL(Number(i.valor_projeto))}
                          </td>
                          <td className="px-5 py-3">{formatDate(i.created_at)}</td>
                          <td className="px-5 py-3 text-right">
                            <select
                              className="h-9 rounded-lg border border-zinc-300 bg-white px-2"
                              value={i.status}
                              onChange={(event) =>
                                updateIndicacaoMutation.mutate({
                                  indicacaoId: i.id,
                                  status: event.target.value as "enviado" | "analise" | "negociacao" | "fechado" | "perdido",
                                })
                              }
                            >
                              <option value="enviado">enviado</option>
                              <option value="analise">analise</option>
                              <option value="negociacao">negociacao</option>
                              <option value="fechado">fechado</option>
                              <option value="perdido">perdido</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "comissoes" && (
              <div className="space-y-5">
                <section className="rounded-2xl border border-zinc-200 bg-white">
                  <div className="px-5 py-4 border-b border-zinc-200">
                    <h3 className="text-lg font-semibold text-zinc-900">Definir comissão e projeto</h3>
                    <p className="text-xs text-zinc-500 px-5 pt-1">Indicações em negociação ou fechadas (definir valores)</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                      <thead>
                        <tr className="text-left border-b border-zinc-200">
                          <th className="px-5 py-3">Usuário</th>
                          <th className="px-5 py-3">Nome indicado</th>
                          <th className="px-5 py-3">Tipo</th>
                          <th className="px-5 py-3">Valor potencial</th>
                          <th className="px-5 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {loadingIndicacoes && (
                          <tr>
                            <td colSpan={5} className="px-5 py-6 text-center text-zinc-500">Carregando indicações...</td>
                          </tr>
                        )}
                        {indicacoes
                          .filter((i) => i.status === "negociacao" || i.status === "fechado")
                          .map((i) => (
                            <tr key={`neg-${i.id}`}>
                              <td className="px-5 py-3">{i.usuario_nome}</td>
                              <td className="px-5 py-3">{i.nome_indicado}</td>
                              <td className="px-5 py-3">{i.tipo}</td>
                              <td className="px-5 py-3">
                                {i.valor_potencial == null ? "Ainda não definido" : formatBRL(Number(i.valor_potencial))}
                              </td>
                              <td className="px-5 py-3 text-right">
                                <Button
                                  size="sm"
                                  type="button"
                                  onClick={() => setCommissionModal({ indicacaoId: i.id, nomeIndicado: i.nome_indicado })}
                                >
                                  Definir comissão
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white">
                  <div className="px-5 py-4 border-b border-zinc-200">
                    <h3 className="text-lg font-semibold text-zinc-900">Comissões</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                      <thead>
                        <tr className="text-left border-b border-zinc-200">
                          <th className="px-5 py-3">Usuário</th>
                          <th className="px-5 py-3">Indicação</th>
                          <th className="px-5 py-3">Valor</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {loadingComissoes && <tr><td colSpan={5} className="px-5 py-6 text-center text-zinc-500">Carregando comissões...</td></tr>}
                        {comissoes.map((c) => (
                          <tr key={c.id}>
                            <td className="px-5 py-3">{c.usuario_nome}</td>
                            <td className="px-5 py-3">{c.indicacao_nome}</td>
                            <td className="px-5 py-3">{formatBRL(Number(c.valor))}</td>
                            <td className="px-5 py-3">{c.status}</td>
                            <td className="px-5 py-3 text-right">
                              <div className="inline-flex gap-2">
                                <Button size="sm" type="button" variant="secondary" onClick={() => updateComissaoMutation.mutate({ comissaoId: c.id, status: "disponivel" })}>
                                  Disponível
                                </Button>
                                <Button size="sm" type="button" onClick={() => updateComissaoMutation.mutate({ comissaoId: c.id, status: "pago" })}>
                                  Marcar pago
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "fotos" && (
              <section className="space-y-4">
                <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4">
                  <h3 className="text-lg font-semibold text-zinc-900">Fotos anexadas pelos indicadores</h3>
                  <p className="text-sm text-zinc-600 mt-1">
                    Conta de energia e foto do padrão enviadas no cadastro da indicação.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {loadingFotos && (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
                      Carregando fotos...
                    </div>
                  )}
                  {!loadingFotos &&
                    fotos.map((f) => (
                      <div key={f.id} className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5 shadow-sm">
                        <div className="mb-3">
                          <p className="text-sm text-zinc-600">Indicador</p>
                          <p className="font-semibold text-zinc-900">{f.usuario_nome}</p>
                          <p className="text-xs text-zinc-500 mt-1">
                            Indicado: {f.nome_indicado} • {formatDate(f.created_at)}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-zinc-200 p-2">
                            <p className="text-xs font-medium text-zinc-700 mb-2">Conta de energia</p>
                            {f.conta_energia_url ? (
                              <img src={f.conta_energia_url} alt="Conta de energia" className="h-36 w-full rounded-md object-cover" />
                            ) : (
                              <div className="h-36 rounded-md bg-zinc-100 grid place-items-center text-xs text-zinc-500">Sem foto</div>
                            )}
                          </div>
                          <div className="rounded-lg border border-zinc-200 p-2">
                            <p className="text-xs font-medium text-zinc-700 mb-2">Foto do padrão</p>
                            {f.foto_padrao_url ? (
                              <img src={f.foto_padrao_url} alt="Foto do padrão" className="h-36 w-full rounded-md object-cover" />
                            ) : (
                              <div className="h-36 rounded-md bg-zinc-100 grid place-items-center text-xs text-zinc-500">Sem foto</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  {!loadingFotos && fotos.length === 0 && (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
                      Nenhuma foto anexada encontrada.
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === "relatorios" && (
              <div className="grid lg:grid-cols-[2fr_1fr] gap-5">
                <section className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6">
                  <h3 className="text-lg font-semibold text-zinc-900">Ranking de usuários</h3>
                  <div className="mt-4 space-y-2">
                    {loadingReports && <p className="text-sm text-zinc-500">Carregando relatórios...</p>}
                    {(reports?.ranking ?? []).map((r, index) => (
                      <div key={`${r.nome}-${index}`} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-zinc-900">{r.nome}</p>
                          <p className="text-xs text-zinc-600">{r.totalFechadas}/{r.totalIndicacoes} fechadas</p>
                        </div>
                        <p className="font-semibold text-emerald-600">{formatBRL(r.receita)}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6 space-y-3">
                  <h3 className="text-lg font-semibold text-zinc-900">Métricas agregadas</h3>
                  <MetricRow label="Taxa de conversão" value={`${(reports?.conversionRate ?? 0).toFixed(1)}%`} />
                  <MetricRow label="Total usuários" value={String(reports?.aggregates.totalUsuarios ?? 0)} />
                  <MetricRow label="Total indicações" value={String(reports?.aggregates.totalIndicacoes ?? 0)} />
                  <MetricRow label="Total comissões" value={String(reports?.aggregates.totalComissoes ?? 0)} />
                  <MetricRow label="Comissões pagas (valor)" value={formatBRL(reports?.aggregates.receitaPaga ?? 0)} />
                </section>
              </div>
            )}

            {activeTab === "configuracoes" && (
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-6">
                <h3 className="text-lg font-semibold text-zinc-900">Configurações</h3>
                <p className="text-sm text-zinc-600 mt-1">
                  Área preparada para parâmetros de operação, limites e automações administrativas.
                </p>
                <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                  Em breve: regras de comissão, limites por usuário e configurações de auditoria.
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {commissionModal && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px] p-4 grid place-items-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-zinc-900">Definir comissão</h3>
            <p className="text-sm text-zinc-600 mt-1">
              Indicação: <span className="font-medium text-zinc-900">{commissionModal.nomeIndicado}</span>
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="commission-value">Valor da comissão (indicador)</Label>
                <Input
                  id="commission-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={commissionValue}
                  onChange={(event) => setCommissionValue(event.target.value)}
                  className="mt-1.5 h-11 rounded-[10px]"
                  placeholder="Ex.: 350.00"
                />
              </div>
              <div>
                <Label htmlFor="projeto-value">Valor do projeto (faturamento)</Label>
                <Input
                  id="projeto-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={projetoValue}
                  onChange={(event) => setProjetoValue(event.target.value)}
                  className="mt-1.5 h-11 rounded-[10px]"
                  placeholder="Ex.: 10000.00"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setCommissionModal(null);
                  setCommissionValue("");
                  setProjetoValue("");
                }}
                disabled={setCommissionMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => setCommissionMutation.mutate()}
                disabled={setCommissionMutation.isPending}
              >
                {setCommissionMutation.isPending ? "Salvando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </RequireAdmin>
  );
}

function AdminMetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 text-zinc-700">
        <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}

function FunnelMini({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-center">
      <p className="text-xs text-zinc-600">{title}</p>
      <p className="text-xl font-bold text-zinc-900 mt-0.5">{value}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
      <span className="text-sm text-zinc-700">{label}</span>
      <span className="text-sm font-semibold text-zinc-900">{value}</span>
    </div>
  );
}

function DualAdminLineChart({ data }: { data: { label: string; faturamento: number; comissoesPagas: number }[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.faturamento, d.comissoesPagas]));
  const w = 640;
  const h = 200;
  const pad = 28;
  const stepX = (w - pad * 2) / Math.max(1, data.length - 1);

  const pointsFat = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (d.faturamento / max) * (h - pad * 2);
    return [x, y] as const;
  });
  const pointsCom = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (d.comissoesPagas / max) * (h - pad * 2);
    return [x, y] as const;
  });

  const pathFat = pointsFat.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const pathCom = pointsCom.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");

  return (
    <div className="mt-4 w-full">
      <div className="flex flex-wrap gap-4 text-xs text-zinc-600 mb-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-6 bg-emerald-600" /> Faturamento
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-6 bg-blue-600" /> Comissões pagas
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[210px]">
        <path d={pathFat} fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" />
        <path d={pathCom} fill="none" stroke="#2563eb" strokeWidth={2.5} strokeLinecap="round" />
        {pointsFat.map((p, i) => (
          <g key={`lbl-${p[0]}`}>
            <circle cx={p[0]} cy={p[1]} r={3} fill="#fff" stroke="#16a34a" strokeWidth={2} />
            <circle cx={pointsCom[i]![0]} cy={pointsCom[i]![1]} r={3} fill="#fff" stroke="#2563eb" strokeWidth={2} />
            <text x={p[0]} y={h - 6} textAnchor="middle" fontSize="10" fill="#52525b">
              {data[i]?.label ?? ""}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
