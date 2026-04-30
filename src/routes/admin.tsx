import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  MoreVertical,
  Menu,
  X,
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
  const [fotosSearch, setFotosSearch] = useState("");
  const [fotosPage, setFotosPage] = useState(1);
  const [overviewComissoesPage, setOverviewComissoesPage] = useState(1);
  const [comissoesDefinicaoSearch, setComissoesDefinicaoSearch] = useState("");
  const [comissoesDefinicaoPage, setComissoesDefinicaoPage] = useState(1);
  const [comissoesHistoricoSearch, setComissoesHistoricoSearch] = useState("");
  const [comissoesHistoricoPage, setComissoesHistoricoPage] = useState(1);
  const [usuariosSearch, setUsuariosSearch] = useState("");
  const [usuariosPage, setUsuariosPage] = useState(1);
  const [actionUserModal, setActionUserModal] = useState<{
    usuario_id: string;
    nome: string;
    role: "indicador" | "admin";
    is_disabled: boolean;
  } | null>(null);
  const [indicacoesSearch, setIndicacoesSearch] = useState("");
  const [indicacoesPage, setIndicacoesPage] = useState(1);
  const [actionIndicacaoModal, setActionIndicacaoModal] = useState<{
    id: number;
    nome_indicado: string;
    status: "enviado" | "analise" | "negociacao" | "fechado" | "perdido";
  } | null>(null);
  const [zoomedFotoUrl, setZoomedFotoUrl] = useState<string | null>(null);
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  const [avaliacaoModal, setAvaliacaoModal] = useState<{
    id: number;
    usuario_nome: string;
    nome_indicado: string;
    whatsapp: string | null;
    tipo_projeto: string | null;
    observacoes: string | null;
    created_at: string;
  } | null>(null);
  const shouldLoadOverview = activeTab === "overview";
  const shouldLoadUsuarios = activeTab === "usuarios";
  const shouldLoadFotos = activeTab === "fotos";
  const shouldLoadIndicacoes = activeTab === "indicacoes" || activeTab === "comissoes";
  const shouldLoadComissoes = activeTab === "comissoes";
  const shouldLoadReports = activeTab === "relatorios";
  const usuariosSearchDebounced = useDebouncedValue(usuariosSearch, 500);
  const indicacoesSearchDebounced = useDebouncedValue(indicacoesSearch, 500);
  const fotosSearchDebounced = useDebouncedValue(fotosSearch, 500);
  const comissoesDefinicaoSearchDebounced = useDebouncedValue(comissoesDefinicaoSearch, 500);
  const comissoesHistoricoSearchDebounced = useDebouncedValue(comissoesHistoricoSearch, 500);
  const PAGE_SIZE = 10;
  const formatTipoProjeto = (value: string | null) => {
    if (!value?.trim()) return "Não informada";
    const labels = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        if (item === "usina_solar") return "Usina solar";
        if (item === "carregador_veicular") return "Carregador veicular";
        return item;
      });
    return labels.length ? labels.join(" • ") : "Não informada";
  };
  const whatsappHref = (value: string | null) => {
    const digits = (value ?? "").replace(/\D/g, "");
    if (!digits) return null;
    return `https://wa.me/${digits}`;
  };

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["admin-overview"],
    enabled: shouldLoadOverview,
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

  const { data: usuariosResp, isLoading: loadingUsuarios } = useQuery({
    queryKey: ["admin-usuarios", usuariosPage, usuariosSearchDebounced],
    enabled: shouldLoadUsuarios,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () =>
      callAdminOps<{
        items: {
          id: number;
          usuario_id: string;
          nome: string;
          email: string;
          whatsapp: string;
          role: "indicador" | "admin";
          created_at: string;
          is_disabled: boolean;
        }[];
        total: number;
        page: number;
        limit: number;
      }>({ action: "list_users", page: usuariosPage, limit: PAGE_SIZE, search: usuariosSearchDebounced }),
  });

  const { data: fotosResp, isLoading: loadingFotos } = useQuery({
    queryKey: ["admin-fotos", fotosPage, fotosSearchDebounced],
    enabled: shouldLoadFotos,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () =>
      callAdminOps<{
        items: {
          id: number;
          usuario_nome: string;
          nome_indicado: string;
          whatsapp: string | null;
          tipo_projeto: string | null;
          observacoes: string | null;
          conta_energia_url: string | null;
          foto_padrao_url: string | null;
          created_at: string;
        }[];
        total: number;
        page: number;
        limit: number;
      }>({ action: "list_fotos", page: fotosPage, limit: PAGE_SIZE, search: fotosSearchDebounced }),
  });

  const { data: indicacoesResp, isLoading: loadingIndicacoes } = useQuery({
    queryKey: ["admin-indicacoes", indicacoesPage, indicacoesSearchDebounced],
    enabled: shouldLoadIndicacoes,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () =>
      callAdminOps<{
        items: {
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
        }[];
        total: number;
        page: number;
        limit: number;
      }>({ action: "list_indicacoes", page: indicacoesPage, limit: PAGE_SIZE, search: indicacoesSearchDebounced }),
  });

  const { data: comissoesResp, isLoading: loadingComissoes } = useQuery({
    queryKey: ["admin-comissoes", comissoesHistoricoPage, comissoesHistoricoSearchDebounced],
    enabled: shouldLoadComissoes,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () =>
      callAdminOps<{
        items: {
          id: number;
          usuario_nome: string;
          indicacao_nome: string;
          valor: number;
          status: "pendente" | "disponivel" | "pago" | "cancelado";
          created_at: string;
        }[];
        total: number;
        page: number;
        limit: number;
      }>({ action: "list_comissoes", page: comissoesHistoricoPage, limit: PAGE_SIZE, search: comissoesHistoricoSearchDebounced }),
  });
  const { data: indicacoesElegiveisResp, isLoading: loadingIndicacoesElegiveis } = useQuery({
    queryKey: ["admin-indicacoes-elegiveis", comissoesDefinicaoPage, comissoesDefinicaoSearchDebounced],
    enabled: shouldLoadComissoes,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () =>
      callAdminOps<{
        items: {
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
        }[];
        total: number;
        page: number;
        limit: number;
      }>({
        action: "list_indicacoes",
        page: comissoesDefinicaoPage,
        limit: PAGE_SIZE,
        search: comissoesDefinicaoSearchDebounced,
        onlyCommissionEligible: true,
      }),
  });

  const usuarios = usuariosResp?.items ?? [];
  const indicacoes = indicacoesResp?.items ?? [];
  const fotos = fotosResp?.items ?? [];
  const comissoes = comissoesResp?.items ?? [];
  const indicacoesElegiveisComissaoPaginadas = indicacoesElegiveisResp?.items ?? [];
  const comissoesHistoricoPaginadas = comissoes;
  const usuariosTotalPages = Math.max(1, Math.ceil((usuariosResp?.total ?? 0) / PAGE_SIZE));
  const indicacoesTotalPages = Math.max(1, Math.ceil((indicacoesResp?.total ?? 0) / PAGE_SIZE));
  const fotosTotalPages = Math.max(1, Math.ceil((fotosResp?.total ?? 0) / PAGE_SIZE));
  const comissoesDefinicaoTotalPages = Math.max(1, Math.ceil((indicacoesElegiveisResp?.total ?? 0) / PAGE_SIZE));
  const comissoesHistoricoTotalPages = Math.max(1, Math.ceil((comissoesResp?.total ?? 0) / PAGE_SIZE));
  const overviewComissoesTotalPages = Math.max(1, Math.ceil((overview?.comissoesPagasLista?.length ?? 0) / 10));
  const overviewComissoesPaginadas = useMemo(() => {
    const start = (overviewComissoesPage - 1) * 10;
    return (overview?.comissoesPagasLista ?? []).slice(start, start + 10);
  }, [overview?.comissoesPagasLista, overviewComissoesPage]);

  const { data: reports, isLoading: loadingReports } = useQuery({
    queryKey: ["admin-reports"],
    enabled: shouldLoadReports,
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
      if (shouldLoadOverview) {
        await queryClient.invalidateQueries({ queryKey: ["admin-overview"], exact: true });
      }
      toast.success("Usuário promovido para admin.");
    },
    onError: () => toast.error("Não foi possível promover o usuário."),
  });

  const revokeAdminMutation = useMutation({
    mutationFn: (userId: string) => callAdminOpsMutation({ action: "set_user_role", userId, role: "indicador" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      if (shouldLoadOverview) {
        await queryClient.invalidateQueries({ queryKey: ["admin-overview"], exact: true });
      }
      toast.success("Privilégio de admin revogado.");
    },
    onError: () => toast.error("Não foi possível revogar admin."),
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
      if (shouldLoadOverview) {
        await queryClient.invalidateQueries({ queryKey: ["admin-overview"], exact: true });
      }
      toast.success("Status da indicação atualizado.");
    },
    onError: () => toast.error("Não foi possível atualizar a indicação."),
  });

  const updateComissaoMutation = useMutation({
    mutationFn: ({ comissaoId, status }: { comissaoId: number; status: "pendente" | "disponivel" | "pago" | "cancelado" }) =>
      callAdminOpsMutation({ action: "update_comissao_status", comissaoId, status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-comissoes"] });
      if (shouldLoadOverview) {
        await queryClient.invalidateQueries({ queryKey: ["admin-overview"], exact: true });
      }
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
      await queryClient.invalidateQueries({ queryKey: ["admin-indicacoes"] });
      if (shouldLoadOverview) {
        await queryClient.invalidateQueries({ queryKey: ["admin-overview"], exact: true });
      }
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
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      toast.error("Não foi possível sair agora.");
      return;
    }
    queryClient.clear();
    navigate({ to: "/login", replace: true });
  };

  const menuItems = useMemo(
    () => [
      { key: "overview", label: "Overview", icon: LayoutDashboard },
      { key: "usuarios", label: "Usuários", icon: Users },
      { key: "fotos", label: "Avaliações", icon: ImageIcon },
      { key: "indicacoes", label: "Status", icon: TrendingUp },
      { key: "comissoes", label: "Comissões", icon: Wallet },
      { key: "relatorios", label: "Relatórios", icon: BarChart3 },
      { key: "configuracoes", label: "Configurações", icon: Settings },
    ] as const,
    [],
  );

  const formatIndicacaoStatusLabel = (status: "enviado" | "analise" | "negociacao" | "fechado" | "perdido") => {
    if (status === "enviado") return "recebido";
    return status;
  };
  useEffect(() => {
    if (usuariosPage > usuariosTotalPages) setUsuariosPage(usuariosTotalPages);
    if (indicacoesPage > indicacoesTotalPages) setIndicacoesPage(indicacoesTotalPages);
    if (fotosPage > fotosTotalPages) setFotosPage(fotosTotalPages);
    if (comissoesDefinicaoPage > comissoesDefinicaoTotalPages) setComissoesDefinicaoPage(comissoesDefinicaoTotalPages);
    if (comissoesHistoricoPage > comissoesHistoricoTotalPages) setComissoesHistoricoPage(comissoesHistoricoTotalPages);
    if (overviewComissoesPage > overviewComissoesTotalPages) setOverviewComissoesPage(overviewComissoesTotalPages);
  }, [
    usuariosPage,
    usuariosTotalPages,
    indicacoesPage,
    indicacoesTotalPages,
    fotosPage,
    fotosTotalPages,
    comissoesDefinicaoPage,
    comissoesDefinicaoTotalPages,
    comissoesHistoricoPage,
    comissoesHistoricoTotalPages,
    overviewComissoesPage,
    overviewComissoesTotalPages,
  ]);

  return (
    <RequireAdmin>
      <div className="min-h-screen flex bg-background">
        <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-[#024b2e] border-r border-[#04653f] sticky top-0 h-screen">
          <div className="px-6 py-5 border-b border-[#04653f]">
            <Link to="/" className="flex items-center justify-center">
              <img
                src="https://i.ibb.co/pv36YBgf/Ativo-3.png"
                alt="ATOM TECH"
                className="h-16 w-auto object-contain"
              />
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

        <div
          className={`lg:hidden fixed inset-0 z-40 transition-all duration-300 ${
            showSidebarMenu ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <button
            type="button"
            aria-label="Fechar menu lateral"
            className={`absolute inset-0 bg-black/35 transition-opacity duration-300 ${
              showSidebarMenu ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setShowSidebarMenu(false)}
          />
          <aside
            className={`absolute left-0 top-0 h-full w-[84vw] max-w-xs bg-[#024b2e] border-r border-[#04653f] shadow-2xl transition-transform duration-300 ${
              showSidebarMenu ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="h-16 px-4 border-b border-[#04653f] flex items-center justify-between">
              <img
                src="https://i.ibb.co/pv36YBgf/Ativo-3.png"
                alt="ATOM TECH"
                className="h-10 w-auto object-contain"
              />
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/25 text-white"
                onClick={() => setShowSidebarMenu(false)}
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="px-3 py-5 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.key);
                    setShowSidebarMenu(false);
                  }}
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
        </div>

        <main className="flex-1 min-w-0 bg-white">
          <header className="bg-card border-b border-border px-6 lg:px-10 py-4 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground transition hover:bg-muted"
                onClick={() => setShowSidebarMenu(true)}
                aria-label="Abrir menu lateral"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
              <p className="text-xs text-muted-foreground">Painel administrativo</p>
              <h1 className="text-lg font-semibold">Administração ATOM TECH</h1>
              </div>
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
                  <div className="max-[700px]:hidden overflow-x-auto">
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
                          overviewComissoesPaginadas.map((c) => (
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
                  <div className="hidden max-[700px]:grid gap-3 p-4">
                    {loadingOverview && (
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                        Carregando comissões...
                      </div>
                    )}
                    {!loadingOverview && overviewComissoesPaginadas.length === 0 && (
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                        Nenhuma comissão com status pago ainda.
                      </div>
                    )}
                    {!loadingOverview &&
                      overviewComissoesPaginadas.map((c) => (
                        <div key={`mob-cp-${c.id}`} className="rounded-xl border border-zinc-200 bg-white p-4">
                          <p className="text-sm font-semibold text-zinc-900">{c.usuario_nome}</p>
                          <p className="mt-1 text-sm text-zinc-700">{c.indicacao_nome}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-sm font-semibold text-emerald-700">{formatBRL(c.valor)}</p>
                            <p className="text-xs text-zinc-600">{formatDate(c.data_pagamento)}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                  {(overview?.comissoesPagasLista?.length ?? 0) > 0 && (
                    <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        onClick={() => setOverviewComissoesPage((p) => Math.max(1, p - 1))}
                        disabled={overviewComissoesPage === 1}
                      >
                        Anterior
                      </Button>
                      <p className="text-sm font-medium text-zinc-700">
                        {overviewComissoesPage}/{overviewComissoesTotalPages}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        onClick={() => setOverviewComissoesPage((p) => Math.min(overviewComissoesTotalPages, p + 1))}
                        disabled={overviewComissoesPage === overviewComissoesTotalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  )}
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
                  <div className="mt-3">
                    <Input
                      value={usuariosSearch}
                      onChange={(e) => {
                        setUsuariosSearch(e.target.value);
                        setUsuariosPage(1);
                      }}
                      placeholder='Buscar por nome, e-mail, WhatsApp, role/status ou data (ex.: "admin", "desativado", "ativo", "12/04/2026")'
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="max-[700px]:hidden overflow-x-auto">
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
                      {!loadingUsuarios && usuarios.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-5 py-6 text-center text-zinc-500">Nenhum usuário encontrado para os filtros.</td>
                        </tr>
                      )}
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
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  setActionUserModal({
                                    usuario_id: u.usuario_id,
                                    nome: u.nome,
                                    role: u.role,
                                    is_disabled: u.is_disabled,
                                  })
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                                aria-label="Abrir ações do usuário"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="hidden max-[700px]:grid gap-3 p-4">
                  {loadingUsuarios && (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                      Carregando usuários...
                    </div>
                  )}
                  {!loadingUsuarios && usuarios.length === 0 && (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                      Nenhum usuário encontrado para os filtros.
                    </div>
                  )}
                  {!loadingUsuarios &&
                    usuarios.map((u) => (
                      <div key={`mob-user-${u.usuario_id}`} className={`rounded-xl border p-4 ${u.is_disabled ? "border-rose-200 bg-rose-50/50" : "border-zinc-200 bg-white"}`}>
                        <p className="text-sm font-semibold text-zinc-900">{u.nome}</p>
                        <p className="mt-1 text-xs text-zinc-600">{u.email}</p>
                        <div className="mt-2 space-y-1 text-sm text-zinc-700">
                          <p><span className="font-medium text-zinc-900">WhatsApp:</span> {u.whatsapp}</p>
                          <p>
                            <span className="font-medium text-zinc-900">Role:</span> {u.role}
                            {u.is_disabled && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                desativado
                              </span>
                            )}
                          </p>
                          <p><span className="font-medium text-zinc-900">Data:</span> {formatDate(u.created_at)}</p>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setActionUserModal({
                                usuario_id: u.usuario_id,
                                nome: u.nome,
                                role: u.role,
                                is_disabled: u.is_disabled,
                              })
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                            aria-label="Abrir ações do usuário"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
                {(usuariosResp?.total ?? 0) > 0 && (
                  <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-3">
                    <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => setUsuariosPage((p) => Math.max(1, p - 1))} disabled={usuariosPage === 1}>
                      Anterior
                    </Button>
                    <p className="text-sm font-medium text-zinc-700">{usuariosPage}/{usuariosTotalPages}</p>
                    <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => setUsuariosPage((p) => Math.min(usuariosTotalPages, p + 1))} disabled={usuariosPage === usuariosTotalPages}>
                      Próxima
                    </Button>
                  </div>
                )}
              </section>
            )}

            {activeTab === "indicacoes" && (
              <section className="rounded-2xl border border-zinc-200 bg-white">
                <div className="px-5 py-4 border-b border-zinc-200">
                  <h3 className="text-lg font-semibold text-zinc-900">Indicações globais</h3>
                  <div className="mt-3">
                    <Input
                      value={indicacoesSearch}
                      onChange={(e) => {
                        setIndicacoesSearch(e.target.value);
                        setIndicacoesPage(1);
                      }}
                      placeholder='Buscar por usuário, indicado, tipo, status, valores ou data (ex.: "fechado", "negociação")'
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="max-[700px]:hidden overflow-x-auto">
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
                      {!loadingIndicacoes && indicacoes.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-5 py-6 text-center text-zinc-500">
                            Nenhuma indicação encontrada para o filtro informado.
                          </td>
                        </tr>
                      )}
                      {indicacoes.map((i) => (
                        <tr key={i.id}>
                          <td className="px-5 py-3">{i.usuario_nome}</td>
                          <td className="px-5 py-3">{i.nome_indicado}</td>
                          <td className="px-5 py-3">{i.tipo}</td>
                          <td className="px-5 py-3">{formatIndicacaoStatusLabel(i.status)}</td>
                          <td className="px-5 py-3">
                            {i.valor_potencial == null ? "—" : formatBRL(Number(i.valor_potencial))}
                          </td>
                          <td className="px-5 py-3">
                            {i.valor_projeto == null ? "—" : formatBRL(Number(i.valor_projeto))}
                          </td>
                          <td className="px-5 py-3">{formatDate(i.created_at)}</td>
                          <td className="px-5 py-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setActionIndicacaoModal({
                                  id: i.id,
                                  nome_indicado: i.nome_indicado,
                                  status: i.status,
                                })
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                              aria-label="Abrir ações da indicação"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="hidden max-[700px]:grid gap-3 p-4">
                  {loadingIndicacoes && (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                      Carregando indicações...
                    </div>
                  )}
                  {!loadingIndicacoes && indicacoes.length === 0 && (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                      Nenhuma indicação encontrada para o filtro informado.
                    </div>
                  )}
                  {!loadingIndicacoes &&
                    indicacoes.map((i) => (
                      <div key={`mob-ind-${i.id}`} className="rounded-xl border border-zinc-200 bg-white p-4">
                        <p className="text-sm font-semibold text-zinc-900">{i.nome_indicado}</p>
                        <p className="mt-1 text-xs text-zinc-600">Usuário: {i.usuario_nome}</p>
                        <div className="mt-2 space-y-1 text-sm text-zinc-700">
                          <p><span className="font-medium text-zinc-900">Tipo:</span> {i.tipo}</p>
                          <p><span className="font-medium text-zinc-900">Status:</span> {formatIndicacaoStatusLabel(i.status)}</p>
                          <p><span className="font-medium text-zinc-900">Comissão (pot.):</span> {i.valor_potencial == null ? "—" : formatBRL(Number(i.valor_potencial))}</p>
                          <p><span className="font-medium text-zinc-900">Projeto:</span> {i.valor_projeto == null ? "—" : formatBRL(Number(i.valor_projeto))}</p>
                          <p><span className="font-medium text-zinc-900">Data:</span> {formatDate(i.created_at)}</p>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setActionIndicacaoModal({
                                id: i.id,
                                nome_indicado: i.nome_indicado,
                                status: i.status,
                              })
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                            aria-label="Abrir ações da indicação"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
                {(indicacoesResp?.total ?? 0) > 0 && (
                  <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-3">
                    <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => setIndicacoesPage((p) => Math.max(1, p - 1))} disabled={indicacoesPage === 1}>
                      Anterior
                    </Button>
                    <p className="text-sm font-medium text-zinc-700">{indicacoesPage}/{indicacoesTotalPages}</p>
                    <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => setIndicacoesPage((p) => Math.min(indicacoesTotalPages, p + 1))} disabled={indicacoesPage === indicacoesTotalPages}>
                      Próxima
                    </Button>
                  </div>
                )}
              </section>
            )}

            {activeTab === "comissoes" && (
              <div className="space-y-5">
                <section className="rounded-2xl border border-zinc-200 bg-white">
                  <div className="px-5 py-4 border-b border-zinc-200">
                    <h3 className="text-lg font-semibold text-zinc-900">Definir comissão e projeto</h3>
                    <p className="text-xs text-zinc-500 px-5 pt-1">Indicações em negociação ou fechadas (definir valores)</p>
                    <div className="mt-3">
                      <Input
                        value={comissoesDefinicaoSearch}
                        onChange={(e) => {
                          setComissoesDefinicaoSearch(e.target.value);
                          setComissoesDefinicaoPage(1);
                        }}
                        placeholder='Buscar por usuário, indicado, tipo, status, valor ou data (ex.: "negociação", "fechado")'
                        className="h-10"
                      />
                    </div>
                  </div>
                  <div className="max-[700px]:hidden overflow-x-auto">
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
                        {loadingIndicacoesElegiveis && (
                          <tr>
                            <td colSpan={5} className="px-5 py-6 text-center text-zinc-500">Carregando indicações...</td>
                          </tr>
                        )}
                        {!loadingIndicacoes && indicacoesElegiveisComissaoPaginadas.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-5 py-6 text-center text-zinc-500">
                              Nenhuma indicação encontrada para o filtro informado.
                            </td>
                          </tr>
                        )}
                        {indicacoesElegiveisComissaoPaginadas.map((i) => (
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
                  <div className="hidden max-[700px]:grid gap-3 p-4">
                    {loadingIndicacoesElegiveis && (
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">Carregando indicações...</div>
                    )}
                    {!loadingIndicacoesElegiveis && indicacoesElegiveisComissaoPaginadas.length === 0 && (
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                        Nenhuma indicação encontrada para o filtro informado.
                      </div>
                    )}
                    {!loadingIndicacoesElegiveis &&
                      indicacoesElegiveisComissaoPaginadas.map((i) => (
                        <div key={`mob-neg-${i.id}`} className="rounded-xl border border-zinc-200 bg-white p-4">
                          <p className="text-sm font-semibold text-zinc-900">{i.nome_indicado}</p>
                          <p className="mt-1 text-xs text-zinc-600">Usuário: {i.usuario_nome}</p>
                          <div className="mt-2 space-y-1 text-sm text-zinc-700">
                            <p><span className="font-medium text-zinc-900">Tipo:</span> {i.tipo}</p>
                            <p><span className="font-medium text-zinc-900">Valor potencial:</span> {i.valor_potencial == null ? "Ainda não definido" : formatBRL(Number(i.valor_potencial))}</p>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <Button size="sm" type="button" onClick={() => setCommissionModal({ indicacaoId: i.id, nomeIndicado: i.nome_indicado })}>
                              Definir comissão
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                  {(indicacoesElegiveisResp?.total ?? 0) > 0 && (
                    <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        onClick={() => setComissoesDefinicaoPage((p) => Math.max(1, p - 1))}
                        disabled={comissoesDefinicaoPage === 1}
                      >
                        Anterior
                      </Button>
                      <p className="text-sm font-medium text-zinc-700">
                        {comissoesDefinicaoPage}/{comissoesDefinicaoTotalPages}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        onClick={() => setComissoesDefinicaoPage((p) => Math.min(comissoesDefinicaoTotalPages, p + 1))}
                        disabled={comissoesDefinicaoPage === comissoesDefinicaoTotalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white">
                  <div className="px-5 py-4 border-b border-zinc-200">
                    <h3 className="text-lg font-semibold text-zinc-900">Comissões</h3>
                    <div className="mt-3">
                      <Input
                        value={comissoesHistoricoSearch}
                        onChange={(e) => {
                          setComissoesHistoricoSearch(e.target.value);
                          setComissoesHistoricoPage(1);
                        }}
                        placeholder='Buscar por usuário, indicação, status, valor ou data (ex.: "pago", "disponível")'
                        className="h-10"
                      />
                    </div>
                  </div>
                  <div className="max-[700px]:hidden overflow-x-auto">
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
                        {!loadingComissoes && comissoesHistoricoPaginadas.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-5 py-6 text-center text-zinc-500">
                              Nenhuma comissão encontrada para o filtro informado.
                            </td>
                          </tr>
                        )}
                        {comissoesHistoricoPaginadas.map((c) => (
                          <tr key={c.id}>
                            <td className="px-5 py-3">{c.usuario_nome}</td>
                            <td className="px-5 py-3">{c.indicacao_nome}</td>
                            <td className="px-5 py-3">{formatBRL(Number(c.valor))}</td>
                            <td className="px-5 py-3">{c.status}</td>
                            <td className="px-5 py-3 text-right">
                              <div className="inline-flex gap-2">
                                {c.status === "pago" ? (
                                  <Button
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                    className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                                    onClick={() => updateComissaoMutation.mutate({ comissaoId: c.id, status: "pendente" })}
                                  >
                                    Desmarcar como pago
                                  </Button>
                                ) : (
                                  <Button size="sm" type="button" onClick={() => updateComissaoMutation.mutate({ comissaoId: c.id, status: "pago" })}>
                                    Marcar pago
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="hidden max-[700px]:grid gap-3 p-4">
                    {loadingComissoes && (
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">Carregando comissões...</div>
                    )}
                    {!loadingComissoes && comissoesHistoricoPaginadas.length === 0 && (
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                        Nenhuma comissão encontrada para o filtro informado.
                      </div>
                    )}
                    {!loadingComissoes &&
                      comissoesHistoricoPaginadas.map((c) => (
                        <div key={`mob-com-${c.id}`} className="rounded-xl border border-zinc-200 bg-white p-4">
                          <p className="text-sm font-semibold text-zinc-900">{c.indicacao_nome}</p>
                          <p className="mt-1 text-xs text-zinc-600">Usuário: {c.usuario_nome}</p>
                          <div className="mt-2 space-y-1 text-sm text-zinc-700">
                            <p><span className="font-medium text-zinc-900">Valor:</span> {formatBRL(Number(c.valor))}</p>
                            <p><span className="font-medium text-zinc-900">Status:</span> {c.status}</p>
                          </div>
                          <div className="mt-3 flex justify-end gap-2">
                            {c.status === "pago" ? (
                              <Button
                                size="sm"
                                type="button"
                                variant="outline"
                                className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                                onClick={() => updateComissaoMutation.mutate({ comissaoId: c.id, status: "pendente" })}
                              >
                                Desmarcar como pago
                              </Button>
                            ) : (
                              <Button size="sm" type="button" onClick={() => updateComissaoMutation.mutate({ comissaoId: c.id, status: "pago" })}>
                                Marcar pago
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                  {(comissoesResp?.total ?? 0) > 0 && (
                    <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        onClick={() => setComissoesHistoricoPage((p) => Math.max(1, p - 1))}
                        disabled={comissoesHistoricoPage === 1}
                      >
                        Anterior
                      </Button>
                      <p className="text-sm font-medium text-zinc-700">
                        {comissoesHistoricoPage}/{comissoesHistoricoTotalPages}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        onClick={() => setComissoesHistoricoPage((p) => Math.min(comissoesHistoricoTotalPages, p + 1))}
                        disabled={comissoesHistoricoPage === comissoesHistoricoTotalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  )}
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
                  <div className="mt-3">
                    <Input
                      value={fotosSearch}
                      onChange={(e) => {
                        setFotosSearch(e.target.value);
                        setFotosPage(1);
                      }}
                      placeholder='Buscar por indicador, indicado, solução, observação ou data (ex.: "usina solar")'
                      className="h-10"
                    />
                  </div>
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
                          <p className="text-xs text-zinc-700 mt-1">
                            <span className="font-medium">WhatsApp do indicado:</span> {f.whatsapp?.trim() || "Não informado"}
                          </p>
                          <p className="text-xs text-zinc-700 mt-1">
                            <span className="font-medium">Solução:</span>{" "}
                            {formatTipoProjeto(f.tipo_projeto)}
                          </p>
                          <p className="text-xs text-zinc-700 mt-1">
                            <span className="font-medium">Observações:</span> {f.observacoes?.trim() || "Sem observações."}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-zinc-200 p-2">
                            <p className="text-xs font-medium text-zinc-700 mb-2">Conta de energia</p>
                            {f.conta_energia_url ? (
                              <button
                                type="button"
                                onClick={() => setZoomedFotoUrl(f.conta_energia_url)}
                                className="block w-full overflow-hidden rounded-md"
                              >
                                <img src={f.conta_energia_url} alt="Conta de energia" className="h-36 w-full rounded-md object-cover" />
                              </button>
                            ) : (
                              <div className="h-36 rounded-md bg-zinc-100 grid place-items-center text-xs text-zinc-500">Sem foto</div>
                            )}
                          </div>
                          <div className="rounded-lg border border-zinc-200 p-2">
                            <p className="text-xs font-medium text-zinc-700 mb-2">Foto do padrão</p>
                            {f.foto_padrao_url ? (
                              <button
                                type="button"
                                onClick={() => setZoomedFotoUrl(f.foto_padrao_url)}
                                className="block w-full overflow-hidden rounded-md"
                              >
                                <img src={f.foto_padrao_url} alt="Foto do padrão" className="h-36 w-full rounded-md object-cover" />
                              </button>
                            ) : (
                              <div className="h-36 rounded-md bg-zinc-100 grid place-items-center text-xs text-zinc-500">Sem foto</div>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-3 text-xs"
                            onClick={() =>
                              setAvaliacaoModal({
                                id: f.id,
                                usuario_nome: f.usuario_nome,
                                nome_indicado: f.nome_indicado,
                                whatsapp: f.whatsapp,
                                tipo_projeto: f.tipo_projeto,
                                observacoes: f.observacoes,
                                created_at: f.created_at,
                              })
                            }
                          >
                            Ver mais
                          </Button>
                        </div>
                      </div>
                    ))}
                  {!loadingFotos && fotos.length === 0 && (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
                      Nenhuma foto anexada encontrada para o filtro informado.
                    </div>
                  )}
                </div>
                {(fotosResp?.total ?? 0) > 0 && (
                  <div className="flex items-center justify-between border border-zinc-200 rounded-2xl bg-white px-5 py-3">
                    <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => setFotosPage((p) => Math.max(1, p - 1))} disabled={fotosPage === 1}>
                      Anterior
                    </Button>
                    <p className="text-sm font-medium text-zinc-700">{fotosPage}/{fotosTotalPages}</p>
                    <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => setFotosPage((p) => Math.min(fotosTotalPages, p + 1))} disabled={fotosPage === fotosTotalPages}>
                      Próxima
                    </Button>
                  </div>
                )}
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

      {actionUserModal && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px] p-4 grid place-items-center">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-zinc-900">Ações do usuário</h3>
            <p className="text-sm text-zinc-600 mt-1">
              {actionUserModal.nome}
            </p>

            <div className="mt-4 space-y-2">
              {actionUserModal.role !== "admin" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    promoteMutation.mutate(actionUserModal.usuario_id);
                    setActionUserModal(null);
                  }}
                  disabled={promoteMutation.isPending}
                >
                  Promover admin
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                  onClick={() => {
                    revokeAdminMutation.mutate(actionUserModal.usuario_id);
                    setActionUserModal(null);
                  }}
                  disabled={revokeAdminMutation.isPending}
                >
                  Revogar admin
                </Button>
              )}

              {actionUserModal.is_disabled ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    reactivateMutation.mutate(actionUserModal.usuario_id);
                    setActionUserModal(null);
                  }}
                  disabled={reactivateMutation.isPending}
                >
                  Reativar usuário
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    disableMutation.mutate(actionUserModal.usuario_id);
                    setActionUserModal(null);
                  }}
                  disabled={disableMutation.isPending}
                >
                  Desativar usuário
                </Button>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setActionUserModal(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {actionIndicacaoModal && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px] p-4 grid place-items-center">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-zinc-900">Ações da indicação</h3>
            <p className="text-sm text-zinc-600 mt-1">
              {actionIndicacaoModal.nome_indicado}
            </p>

            <div className="mt-4">
              <Label htmlFor="indicacao-status-admin">Status</Label>
              <select
                id="indicacao-status-admin"
                className="mt-1.5 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-700"
                value={actionIndicacaoModal.status}
                onChange={(event) =>
                  setActionIndicacaoModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          status: event.target.value as "enviado" | "analise" | "negociacao" | "fechado" | "perdido",
                        }
                      : prev,
                  )
                }
              >
                <option value="enviado">recebido</option>
                <option value="analise">analise</option>
                <option value="negociacao">negociacao</option>
                <option value="fechado">fechado</option>
                <option value="perdido">perdido</option>
              </select>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setActionIndicacaoModal(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  updateIndicacaoMutation.mutate({
                    indicacaoId: actionIndicacaoModal.id,
                    status: actionIndicacaoModal.status,
                  });
                  setActionIndicacaoModal(null);
                }}
                disabled={updateIndicacaoMutation.isPending}
              >
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {zoomedFotoUrl && (
        <button
          type="button"
          onClick={() => setZoomedFotoUrl(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
          aria-label="Fechar visualização da foto"
        >
          <img src={zoomedFotoUrl} alt="Foto ampliada" className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" />
        </button>
      )}

      {avaliacaoModal && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px] p-4 grid place-items-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-zinc-900">Detalhes da avaliação</h3>
            <div className="mt-3 space-y-2 text-sm text-zinc-700">
              <p><span className="font-medium text-zinc-900">Indicador:</span> {avaliacaoModal.usuario_nome}</p>
              <p><span className="font-medium text-zinc-900">Indicado:</span> {avaliacaoModal.nome_indicado}</p>
              <p><span className="font-medium text-zinc-900">WhatsApp do indicado:</span> {avaliacaoModal.whatsapp?.trim() || "Não informado"}</p>
              <p><span className="font-medium text-zinc-900">Solução:</span> {formatTipoProjeto(avaliacaoModal.tipo_projeto)}</p>
              <p><span className="font-medium text-zinc-900">Observações:</span> {avaliacaoModal.observacoes?.trim() || "Sem observações."}</p>
              <p><span className="font-medium text-zinc-900">Data:</span> {formatDate(avaliacaoModal.created_at)}</p>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setAvaliacaoModal(null)}>
                Fechar
              </Button>
              <Button
                asChild
                type="button"
                disabled={!whatsappHref(avaliacaoModal.whatsapp)}
              >
                <a
                  href={whatsappHref(avaliacaoModal.whatsapp) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  Chamar no WhatsApp
                </a>
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
            <text x={p[0]} y={p[1] - 8} textAnchor="middle" fontSize="9" fill="#15803d">
              {Math.round(data[i]?.faturamento ?? 0).toLocaleString("pt-BR")}
            </text>
            <text x={pointsCom[i]![0]} y={pointsCom[i]![1] - 8} textAnchor="middle" fontSize="9" fill="#1d4ed8">
              {Math.round(data[i]?.comissoesPagas ?? 0).toLocaleString("pt-BR")}
            </text>
            <text x={p[0]} y={h - 6} textAnchor="middle" fontSize="10" fill="#52525b">
              {data[i]?.label ?? ""}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
