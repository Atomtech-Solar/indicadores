import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Wallet,
  BookOpenText,
  Bell,
  Plus,
  TrendingUp,
  ArrowRight,
  Send,
  X,
  Menu,
  LogOut,
  User,
  CircleDollarSign,
  ChartLine,
  Hourglass,
  PiggyBank,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  head: () => ({ meta: [{ title: "Dashboard — Atom Tech" }] }),
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
  { key: "visao-geral", label: "Visão geral", icon: LayoutDashboard },
  { key: "indicacoes", label: "Indicações", icon: Users },
  { key: "comissoes", label: "Comissões", icon: Wallet },
  { key: "tutorial", label: "Tutorial", icon: BookOpenText },
];

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

function maskWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatPotentialValue(value: number | null | undefined) {
  if (value == null) return "Ainda não definido";
  return formatBRL(Number(value));
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

function getMonthComparison(current: number, previous: number) {
  if (previous <= 0) {
    if (current <= 0) {
      return { text: "— 0% vs mês anterior", className: "text-zinc-500" };
    }
    return { text: "↗ 100% vs mês anterior", className: "text-emerald-600" };
  }

  const pct = ((current - previous) / previous) * 100;
  const abs = Math.abs(pct).toFixed(1).replace(".", ",");
  if (pct > 0) return { text: `↗ ${abs}% vs mês anterior`, className: "text-emerald-600" };
  if (pct < 0) return { text: `↘ ${abs}% vs mês anterior`, className: "text-rose-600" };
  return { text: "→ 0% vs mês anterior", className: "text-zinc-500" };
}

function makeUploadId() {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random}`;
}

function Dashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"visao-geral" | "indicacoes" | "comissoes" | "tutorial">("visao-geral");
  const [comissoesPeriodFilter, setComissoesPeriodFilter] = useState<"7d" | "30d" | "90d">("30d");
  const [comissoesStatusFilter, setComissoesStatusFilter] = useState<"all" | "pago" | "pendente">("all");
  const [funnelFilter, setFunnelFilter] = useState<"today" | "week" | "month" | "custom">("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [indicacoesSearch, setIndicacoesSearch] = useState("");
  const [expandedRecentIndicacaoId, setExpandedRecentIndicacaoId] = useState<number | null>(null);
  const [expandedMyIndicacaoId, setExpandedMyIndicacaoId] = useState<number | null>(null);
  const [expandedComissaoId, setExpandedComissaoId] = useState<number | null>(null);
  const [comissoesPage, setComissoesPage] = useState(1);
  const [editingIndicacaoId, setEditingIndicacaoId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [loadingEditIndicacao, setLoadingEditIndicacao] = useState(false);
  const [editContaEnergiaPath, setEditContaEnergiaPath] = useState<string | null>(null);
  const [editFotoPadraoPath, setEditFotoPadraoPath] = useState<string | null>(null);
  const [editContaEnergiaFile, setEditContaEnergiaFile] = useState<File | null>(null);
  const [editFotoPadraoFile, setEditFotoPadraoFile] = useState<File | null>(null);
  const [editContaEnergiaError, setEditContaEnergiaError] = useState<string | null>(null);
  const [editFotoPadraoError, setEditFotoPadraoError] = useState<string | null>(null);
  const [editContaEnergiaSignedUrl, setEditContaEnergiaSignedUrl] = useState<string | null>(null);
  const [editFotoPadraoSignedUrl, setEditFotoPadraoSignedUrl] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["usuario"],
    queryFn: fetchUsuarioRow,
  });

  const { data: indicacoes = [], isLoading: loadingInd } = useQuery({
    queryKey: ["indicacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("indicacoes")
        .select("id, nome_indicado, whatsapp, tipo, status, valor_potencial, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Pick<
        Tables<"indicacoes">,
        "id" | "nome_indicado" | "whatsapp" | "tipo" | "status" | "valor_potencial" | "created_at"
      >[];
    },
  });

  const { data: comissoes = [], isLoading: loadingCom } = useQuery({
    queryKey: ["comissoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comissoes")
        .select("id, indicacao_id, usuario_id, valor, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Tables<"comissoes">[];
    },
  });

  const nome = profile?.nome?.split(" ")[0] ?? "Parceiro";

  const now = new Date();
  const currentMonthPrefix = monthKey(now.toISOString());
  const previousMonthPrefix = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString());

  const stats = useMemo(() => {
    const pagas = comissoes.filter((c) => c.status === "pago");
    const totalGanho = pagas.reduce((s, g) => s + Number(g.valor), 0);
    const mes = pagas
      .filter((g) => monthKey(g.created_at) === currentMonthPrefix)
      .reduce((s, g) => s + Number(g.valor), 0);
    const mesAnterior = pagas
      .filter((g) => monthKey(g.created_at) === previousMonthPrefix)
      .reduce((s, g) => s + Number(g.valor), 0);
    const totalAteMesAnterior = totalGanho - mes;
    const andamento = indicacoes
      .filter((i) => ["enviado", "analise", "negociacao"].includes(i.status))
      .reduce((s, i) => s + Number(i.valor_potencial), 0);
    const disponivel = comissoes
      .filter((c) => c.status === "disponivel")
      .reduce((s, c) => s + Number(c.valor), 0);
    return { totalGanho, mes, mesAnterior, totalAteMesAnterior, andamento, disponivel };
  }, [comissoes, indicacoes, currentMonthPrefix, previousMonthPrefix]);

  const totalGanhoComparison = useMemo(
    () => getMonthComparison(stats.totalGanho, stats.totalAteMesAnterior),
    [stats.totalGanho, stats.totalAteMesAnterior],
  );
  const mesComparison = useMemo(
    () => getMonthComparison(stats.mes, stats.mesAnterior),
    [stats.mes, stats.mesAnterior],
  );

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

  const funnelIndicacoes = useMemo(() => {
    const nowDate = new Date();
    const startOfToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());

    if (funnelFilter === "today") {
      return indicacoes.filter((i) => new Date(i.created_at) >= startOfToday);
    }

    if (funnelFilter === "week") {
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      return indicacoes.filter((i) => new Date(i.created_at) >= startOfWeek);
    }

    if (funnelFilter === "month") {
      const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
      return indicacoes.filter((i) => new Date(i.created_at) >= startOfMonth);
    }

    if (!customStartDate && !customEndDate) return indicacoes;

    const start = customStartDate ? new Date(`${customStartDate}T00:00:00`) : null;
    const end = customEndDate ? new Date(`${customEndDate}T23:59:59`) : null;

    return indicacoes.filter((i) => {
      const created = new Date(i.created_at);
      if (start && created < start) return false;
      if (end && created > end) return false;
      return true;
    });
  }, [indicacoes, funnelFilter, customStartDate, customEndDate]);

  const localFunnelStats = useMemo(() => {
    const enviados = funnelIndicacoes.filter((i) => i.status === "enviado").length;
    const analise = funnelIndicacoes.filter((i) => i.status === "analise").length;
    const negociacao = funnelIndicacoes.filter((i) => i.status === "negociacao").length;
    const fechados = funnelIndicacoes.filter((i) => i.status === "fechado").length;

    return { enviados, analise, negociacao, fechados };
  }, [funnelIndicacoes]);

  const { data: funnelStatsRpc } = useQuery({
    queryKey: ["indicacoes-funnel", funnelFilter],
    enabled: activeTab === "indicacoes" && funnelFilter !== "custom",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_indicacoes_funnel", { period: funnelFilter });
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      return {
        enviados: Number(row?.enviado ?? 0),
        analise: Number(row?.analise ?? 0),
        negociacao: Number(row?.negociacao ?? 0),
        fechados: Number(row?.fechado ?? 0),
      };
    },
  });

  const { data: indicacoesByPeriodRpc } = useQuery({
    queryKey: ["indicacoes-by-period", funnelFilter],
    enabled: activeTab === "indicacoes" && funnelFilter !== "custom",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_indicacoes_by_period", { period: funnelFilter });
      if (error) throw error;
      return (data ?? []) as Pick<Tables<"indicacoes">, "id" | "nome_indicado" | "tipo" | "status" | "valor_potencial" | "created_at">[];
    },
  });

  const funnelStats = funnelFilter === "custom" ? localFunnelStats : (funnelStatsRpc ?? localFunnelStats);
  const indicacoesTabRows = funnelFilter === "custom" ? funnelIndicacoes : (indicacoesByPeriodRpc ?? indicacoes);

  const loading = loadingInd || loadingCom;
  const indicacaoNomeById = useMemo(() => {
    const out = new Map<number, string>();
    for (const i of indicacoes) out.set(Number(i.id), i.nome_indicado);
    return out;
  }, [indicacoes]);

  const indicacaoWhatsappById = useMemo(() => {
    const out = new Map<number, string>();
    for (const i of indicacoes) out.set(Number(i.id), i.whatsapp);
    return out;
  }, [indicacoes]);

  const filteredIndicacoesTabRows = useMemo(() => {
    const term = indicacoesSearch.trim().toLowerCase();
    if (!term) return indicacoesTabRows;

    return indicacoesTabRows.filter((i) => {
      const whatsapp = indicacaoWhatsappById.get(Number(i.id)) ?? "";
      const tipo = mapTipoDbToUi(i.tipo).toLowerCase();
      const status = dbStatusToUi(i.status).toLowerCase();
      const valor = formatPotentialValue(i.valor_potencial).toLowerCase();
      const data = formatDate(i.created_at).toLowerCase();
      const nome = i.nome_indicado.toLowerCase();

      return [nome, whatsapp.toLowerCase(), tipo, status, valor, data].some((value) => value.includes(term));
    });
  }, [indicacoesSearch, indicacoesTabRows, indicacaoWhatsappById]);

  const { data: comissoesSummaryRpc } = useQuery({
    queryKey: ["comissoes-summary"],
    enabled: activeTab === "comissoes" || activeTab === "visao-geral",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_comissoes_summary", { p_usuario_id: null });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        total_acumulado: Number(row?.total_acumulado ?? 0),
        total_pendente: Number(row?.total_pendente ?? 0),
        total_pago: Number(row?.total_pago ?? 0),
      };
    },
  });

  const { data: comissoesFiltradasRpc = [] } = useQuery({
    queryKey: ["comissoes-filtradas", comissoesPeriodFilter, comissoesStatusFilter],
    enabled: activeTab === "comissoes",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_comissoes_filtradas", {
        p_period: comissoesPeriodFilter,
        p_status: comissoesStatusFilter,
        p_usuario_id: null,
      });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: number;
        valor: number;
        status: "pendente" | "disponivel" | "pago" | "cancelado";
        created_at: string;
        nome_indicado: string;
      }>;
    },
  });

  const comissoesTotalPages = Math.max(1, Math.ceil(comissoesFiltradasRpc.length / 5));
  const comissoesPageSafe = Math.min(comissoesPage, comissoesTotalPages);
  const comissoesPaginadas = useMemo(() => {
    const start = (comissoesPageSafe - 1) * 5;
    return comissoesFiltradasRpc.slice(start, start + 5);
  }, [comissoesFiltradasRpc, comissoesPageSafe]);

  useEffect(() => {
    setComissoesPage(1);
  }, [comissoesPeriodFilter, comissoesStatusFilter]);

  useEffect(() => {
    if (comissoesPage > comissoesTotalPages) {
      setComissoesPage(comissoesTotalPages);
    }
  }, [comissoesPage, comissoesTotalPages]);

  const updateIndicacaoMutation = useMutation({
    mutationFn: async () => {
      if (!editingIndicacaoId) throw new Error("Indicação inválida.");
      const nome = editNome.trim();
      const whatsapp = editWhatsapp.trim();
      if (!nome || !whatsapp) throw new Error("Preencha nome e WhatsApp.");

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !authUser?.id) {
        throw new Error("Não foi possível validar sua sessão para upload.");
      }

      let contaEnergiaPath = editContaEnergiaPath;
      if (editContaEnergiaFile) {
        if (!editContaEnergiaFile.type.startsWith("image/")) {
          throw new Error("Envie apenas imagens no campo da conta de energia.");
        }
        if (editContaEnergiaFile.size > 5 * 1024 * 1024) {
          throw new Error("A imagem da conta de energia deve ter no máximo 5MB.");
        }

        const extension = editContaEnergiaFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const filePath = `${authUser.id}/${Date.now()}-${makeUploadId()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("indicacoes-comprovantes")
          .upload(filePath, editContaEnergiaFile, {
            upsert: false,
            contentType: editContaEnergiaFile.type,
          });
        if (uploadError) {
          throw new Error(`Upload da conta de energia falhou: ${uploadError.message}`);
        }
        contaEnergiaPath = filePath;
      }

      let fotoPadraoPath = editFotoPadraoPath;
      if (editFotoPadraoFile) {
        if (!editFotoPadraoFile.type.startsWith("image/")) {
          throw new Error("Envie apenas imagens no campo da foto do padrão.");
        }
        if (editFotoPadraoFile.size > 5 * 1024 * 1024) {
          throw new Error("A foto do padrão deve ter no máximo 5MB.");
        }

        const extension = editFotoPadraoFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const filePath = `${authUser.id}/${Date.now()}-${makeUploadId()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("indicacoes-comprovantes")
          .upload(filePath, editFotoPadraoFile, {
            upsert: false,
            contentType: editFotoPadraoFile.type,
          });
        if (uploadError) {
          throw new Error(`Upload da foto do padrão falhou: ${uploadError.message}`);
        }
        fotoPadraoPath = filePath;
      }

      const { error } = await supabase
        .from("indicacoes")
        .update({
          nome_indicado: nome,
          whatsapp,
          conta_energia_url: contaEnergiaPath,
          foto_padrao_url: fotoPadraoPath,
        })
        .eq("id", editingIndicacaoId);

      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["indicacoes"] }),
        queryClient.invalidateQueries({ queryKey: ["indicacoes-by-period"] }),
      ]);
      toast.success("Indicação atualizada.");
      closeEditIndicacaoModal();
    },
    onError: () => {
      toast.error("Não foi possível atualizar a indicação.");
    },
  });

  const closeEditIndicacaoModal = () => {
    setEditingIndicacaoId(null);
    setEditNome("");
    setEditWhatsapp("");
    setEditContaEnergiaPath(null);
    setEditFotoPadraoPath(null);
    setEditContaEnergiaFile(null);
    setEditFotoPadraoFile(null);
    setEditContaEnergiaError(null);
    setEditFotoPadraoError(null);
    setEditContaEnergiaSignedUrl(null);
    setEditFotoPadraoSignedUrl(null);
  };

  const openEditIndicacao = async (id: number, fallbackNome: string) => {
    try {
      setLoadingEditIndicacao(true);
      const { data, error } = await supabase
        .from("indicacoes")
        .select("nome_indicado, whatsapp, conta_energia_url, foto_padrao_url")
        .eq("id", id)
        .single();

      if (error) throw error;

      setEditingIndicacaoId(id);
      setEditNome(data?.nome_indicado ?? fallbackNome);
      setEditWhatsapp(data?.whatsapp ?? "");
      setEditContaEnergiaPath(data?.conta_energia_url ?? null);
      setEditFotoPadraoPath(data?.foto_padrao_url ?? null);
      setEditContaEnergiaFile(null);
      setEditFotoPadraoFile(null);
      setEditContaEnergiaError(null);
      setEditFotoPadraoError(null);

      const [contaSigned, padraoSigned] = await Promise.all([
        data?.conta_energia_url
          ? supabase.storage.from("indicacoes-comprovantes").createSignedUrl(data.conta_energia_url, 60 * 60)
          : Promise.resolve({ data: null, error: null }),
        data?.foto_padrao_url
          ? supabase.storage.from("indicacoes-comprovantes").createSignedUrl(data.foto_padrao_url, 60 * 60)
          : Promise.resolve({ data: null, error: null }),
      ]);

      setEditContaEnergiaSignedUrl(contaSigned.data?.signedUrl ?? null);
      setEditFotoPadraoSignedUrl(padraoSigned.data?.signedUrl ?? null);
    } catch {
      toast.error("Não foi possível abrir edição dessa indicação.");
    } finally {
      setLoadingEditIndicacao(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      toast.success("Você saiu da conta.");
      setShowProfileMenu(false);
      navigate({ to: "/login", replace: true });
    } catch {
      toast.error("Não foi possível sair agora. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden min-[1101px]:flex w-64 shrink-0 flex-col bg-[#024b2e] border-r border-[#04653f] sticky top-0 h-screen">
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
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key as "visao-geral" | "indicacoes" | "comissoes" | "tutorial")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === item.key
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
          <a
            href="https://wa.me/556139781738"
            target="_blank"
            rel="noreferrer"
            className="mb-3 w-full inline-flex items-center justify-center rounded-lg border border-white/25 px-3 py-2 text-sm font-medium text-white/95 hover:bg-[#0b6a42] hover:text-white transition"
          >
            Falar com o suporte
          </a>
          <div className="rounded-xl bg-gradient-success p-4">
            <p className="text-xs font-semibold text-primary-dark">Potencial em aberto</p>
            <p className="text-xl font-bold text-primary-dark mt-1">{formatBRL(potencialAberto)}</p>
            <Button size="sm" onClick={() => setShowModal(true)} className="w-full mt-3 rounded-lg h-9">
              Nova indicação
            </Button>
          </div>
        </div>
      </aside>

      <div
        className={`min-[1101px]:hidden fixed inset-0 z-40 transition-all duration-300 ${
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
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setActiveTab(item.key as "visao-geral" | "indicacoes" | "comissoes" | "tutorial");
                  setShowSidebarMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === item.key
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
            <a
              href="https://wa.me/556139781738"
              target="_blank"
              rel="noreferrer"
              className="mb-3 w-full inline-flex items-center justify-center rounded-lg border border-white/25 px-3 py-2 text-sm font-medium text-white/95 hover:bg-[#0b6a42] hover:text-white transition"
            >
              Falar com o suporte
            </a>
            <Button size="sm" onClick={() => { setShowModal(true); setShowSidebarMenu(false); }} className="w-full rounded-lg h-9">
              Nova indicação
            </Button>
          </div>
        </aside>
      </div>

      <main className="flex-1 min-w-0 bg-white">
        <header className="bg-card border-b border-border px-6 lg:px-10 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="min-[1101px]:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground transition hover:bg-muted"
              onClick={() => setShowSidebarMenu(true)}
              aria-label="Abrir menu lateral"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
            <p className="text-xs text-muted-foreground">Bem-vindo de volta</p>
            <h1 className="text-lg font-semibold">Olá, {nome}</h1>
            </div>
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
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate({ to: "/perfil" });
                      }}
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition"
                    >
                      <User className="h-4 w-4" />
                      Meu perfil
                    </button>
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

        <div className="px-6 lg:px-10 py-8 space-y-7 max-w-[1400px] mx-auto">
          {loading && (
            <p className="text-sm text-muted-foreground">Atualizando seus dados…</p>
          )}

          {activeTab === "visao-geral" && (
            <>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <StatCard
              label="Total ganho"
              value={formatBRL(stats.totalGanho)}
              icon={CircleDollarSign}
              iconWrapClassName="bg-emerald-100 text-emerald-700"
              valueClassName="text-emerald-600"
              footerLabel="Todas as comissões recebidas"
              footerContent={<span className={totalGanhoComparison.className}>{totalGanhoComparison.text}</span>}
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
              footerContent={<span className={mesComparison.className}>{mesComparison.text}</span>}
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
              label="Total acumulado"
              value={formatBRL(comissoesSummaryRpc?.total_acumulado ?? stats.disponivel)}
              icon={PiggyBank}
              iconWrapClassName="bg-emerald-100 text-emerald-700"
              valueClassName="text-emerald-600"
              footerLabel="Valor disponível para transferência"
              footerContent={
                <button
                  type="button"
                  onClick={() => setActiveTab("comissoes")}
                  className="inline-flex items-center rounded-full bg-emerald-700 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-800 transition"
                >
                  Ver agora
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

            <button
              type="button"
              onClick={() => setActiveTab("indicacoes")}
              className="rounded-xl border border-[#0c6a3b]/35 bg-white px-5 py-4 flex items-center justify-between text-[#0b5a34] font-semibold hover:bg-[#f8fffb] transition text-left"
            >
              <span>Ver minhas indicações</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          <Section title="Indicações recentes" subtitle="Suas últimas 8 indicações">
            <div className="max-[500px]:hidden overflow-x-auto -mx-6 lg:-mx-7 px-6 lg:px-7">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="font-medium pb-3">Nome</th>
                      <th className="font-medium pb-3">WhatsApp</th>
                    <th className="font-medium pb-3">Status</th>
                    <th className="font-medium pb-3">Valor potencial</th>
                    <th className="font-medium pb-3">Data</th>
                      <th className="font-medium pb-3 text-right">Ações</th>
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
                      <td className="py-3.5 text-muted-foreground">{i.whatsapp || "-"}</td>
                      <td className="py-3.5">
                        <StatusBadge status={dbStatusToUi(i.status)} />
                      </td>
                      <td className="py-3.5 font-semibold text-primary">{formatPotentialValue(i.valor_potencial)}</td>
                      <td className="py-3.5 text-muted-foreground">{formatDate(i.created_at)}</td>
                      <td className="py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => void openEditIndicacao(i.id, i.nome_indicado)}
                          className="inline-flex items-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="hidden max-[500px]:grid gap-3">
              {indicacoes.slice(0, 8).map((i) => {
                const isExpanded = expandedRecentIndicacaoId === i.id;
                return (
                  <div key={i.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-zinc-900">{i.nome_indicado}</p>
                      <StatusBadge status={dbStatusToUi(i.status)} />
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setExpandedRecentIndicacaoId(isExpanded ? null : i.id)}
                        className="inline-flex items-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
                      >
                        {isExpanded ? "Ocultar" : "Ver mais"}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 space-y-1.5">
                        <p>
                          <span className="font-medium text-zinc-900">Tipo:</span> {mapTipoDbToUi(i.tipo)}
                        </p>
                        <p>
                          <span className="font-medium text-zinc-900">Status:</span> {dbStatusToUi(i.status)}
                        </p>
                        <p>
                          <span className="font-medium text-zinc-900">Valor potencial:</span> {formatPotentialValue(i.valor_potencial)}
                        </p>
                        <p>
                          <span className="font-medium text-zinc-900">Data:</span> {formatDate(i.created_at)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
              {!loadingInd && indicacoes.length === 0 && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                  Você ainda não tem indicações recentes.
                </div>
              )}
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
            </>
          )}

          {activeTab === "indicacoes" && (
            <>
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

              <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900">Funil de indicações</h3>
                    <p className="text-sm text-muted-foreground mt-1">Acompanhe o status das suas indicações</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:min-w-[280px]">
                    <button
                      type="button"
                      onClick={() => setFunnelFilter("today")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
                        funnelFilter === "today"
                          ? "bg-[#015022] text-white border-[#015022]"
                          : "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      Hoje
                    </button>
                    <button
                      type="button"
                      onClick={() => setFunnelFilter("week")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
                        funnelFilter === "week"
                          ? "bg-[#015022] text-white border-[#015022]"
                          : "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      1 semana
                    </button>
                    <button
                      type="button"
                      onClick={() => setFunnelFilter("month")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
                        funnelFilter === "month"
                          ? "bg-[#015022] text-white border-[#015022]"
                          : "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      1 mês
                    </button>
                    <button
                      type="button"
                      onClick={() => setFunnelFilter("custom")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
                        funnelFilter === "custom"
                          ? "bg-[#015022] text-white border-[#015022]"
                          : "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      Personalizado
                    </button>
                  </div>
                </div>

                {funnelFilter === "custom" && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="h-10 rounded-lg"
                    />
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="h-10 rounded-lg"
                    />
                  </div>
                )}

                <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <FunnelStep
                    icon={Users}
                    value={funnelStats.enviados}
                    title="Indicações"
                    description="Enviadas"
                    iconBgClass="bg-emerald-100 text-emerald-700"
                    valueClass="text-emerald-700"
                  />
                  <FunnelStep
                    icon={Hourglass}
                    value={funnelStats.analise}
                    title="Em análise"
                    description="Pelo time"
                    iconBgClass="bg-amber-100 text-amber-700"
                    valueClass="text-amber-600"
                  />
                  <FunnelStep
                    icon={ChartLine}
                    value={funnelStats.negociacao}
                    title="Em negociação"
                    description="Em contato"
                    iconBgClass="bg-blue-100 text-blue-700"
                    valueClass="text-blue-600"
                  />
                  <FunnelStep
                    icon={BadgeCheck}
                    value={funnelStats.fechados}
                    title="Fechados"
                    description="Comissão gerada"
                    iconBgClass="bg-emerald-100 text-emerald-700"
                    valueClass="text-emerald-700"
                  />
                </div>
              </div>

              <Section title="Minhas indicações" subtitle="Lista completa das suas indicações">
              <div className="mb-4">
                <Input
                  value={indicacoesSearch}
                  onChange={(e) => setIndicacoesSearch(e.target.value)}
                  placeholder="Buscar por nome, WhatsApp, tipo, status, valor potencial ou data"
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="max-[500px]:hidden overflow-x-auto -mx-6 lg:-mx-7 px-6 lg:px-7">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="font-medium pb-3">Nome</th>
                      <th className="font-medium pb-3">WhatsApp</th>
                      <th className="font-medium pb-3">Tipo</th>
                      <th className="font-medium pb-3">Status</th>
                      <th className="font-medium pb-3">Valor potencial</th>
                      <th className="font-medium pb-3">Data</th>
                      <th className="font-medium pb-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredIndicacoesTabRows.map((i) => (
                      <tr key={i.id}>
                        <td className="py-3.5 font-medium">{i.nome_indicado}</td>
                        <td className="py-3.5 text-muted-foreground">{indicacaoWhatsappById.get(Number(i.id)) || "-"}</td>
                        <td className="py-3.5 text-muted-foreground">{mapTipoDbToUi(i.tipo)}</td>
                        <td className="py-3.5">
                          <StatusBadge status={dbStatusToUi(i.status)} />
                        </td>
                        <td className="py-3.5 font-semibold text-primary">{formatPotentialValue(i.valor_potencial)}</td>
                        <td className="py-3.5 text-muted-foreground">{formatDate(i.created_at)}</td>
                        <td className="py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => void openEditIndicacao(i.id, i.nome_indicado)}
                            className="inline-flex items-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="hidden max-[500px]:grid gap-3">
                {filteredIndicacoesTabRows.map((i) => {
                  const isExpanded = expandedMyIndicacaoId === i.id;
                  return (
                    <div key={i.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-zinc-900">{i.nome_indicado}</p>
                        <StatusBadge status={dbStatusToUi(i.status)} />
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setExpandedMyIndicacaoId(isExpanded ? null : i.id)}
                          className="inline-flex items-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
                        >
                          {isExpanded ? "Ocultar" : "Ver mais"}
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 space-y-1.5">
                          <p>
                            <span className="font-medium text-zinc-900">Tipo:</span> {mapTipoDbToUi(i.tipo)}
                          </p>
                          <p>
                            <span className="font-medium text-zinc-900">Status:</span> {dbStatusToUi(i.status)}
                          </p>
                          <p>
                            <span className="font-medium text-zinc-900">Valor potencial:</span> {formatPotentialValue(i.valor_potencial)}
                          </p>
                          <p>
                            <span className="font-medium text-zinc-900">Data:</span> {formatDate(i.created_at)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
                {!loadingInd && filteredIndicacoesTabRows.length === 0 && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                    Você ainda não tem indicações nessa visualização.
                  </div>
                )}
              </div>
              </Section>
            </>
          )}

          {activeTab === "comissoes" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 grid place-items-center">
                      <Wallet className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-zinc-900 font-semibold">Total acumulado</p>
                  </div>
                  <p className="mt-2 text-sm font-bold text-blue-600">
                    {formatBRL(comissoesSummaryRpc?.total_acumulado ?? 0)}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-amber-100 grid place-items-center">
                      <Hourglass className="h-4 w-4 text-amber-600" />
                    </div>
                    <p className="text-zinc-900 font-semibold">Saldo pendente</p>
                  </div>
                  <p className="mt-2 text-sm font-bold text-amber-600">
                    {formatBRL(comissoesSummaryRpc?.total_pendente ?? 0)}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 grid place-items-center">
                      <BadgeCheck className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="text-zinc-900 font-semibold">Total já pago</p>
                  </div>
                  <p className="mt-2 text-sm font-bold text-emerald-600">
                    {formatBRL(comissoesSummaryRpc?.total_pago ?? 0)}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 md:px-5 py-4 border-b border-zinc-200">
                  <h3 className="text-lg font-semibold text-zinc-900">Histórico de ganhos</h3>

                  <div className="flex items-center gap-2">
                    <select
                      value={comissoesPeriodFilter}
                      onChange={(e) => {
                        setComissoesPeriodFilter(e.target.value as "7d" | "30d" | "90d");
                        setComissoesPage(1);
                      }}
                      className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-700"
                    >
                      <option value="7d">Últimos 7 dias</option>
                      <option value="30d">Últimos 30 dias</option>
                      <option value="90d">Últimos 90 dias</option>
                    </select>

                    <select
                      value={comissoesStatusFilter}
                      onChange={(e) => {
                        setComissoesStatusFilter(e.target.value as "all" | "pago" | "pendente");
                        setComissoesPage(1);
                      }}
                      className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-700"
                    >
                      <option value="all">Tudo</option>
                      <option value="pago">Pago</option>
                      <option value="pendente">Pendente</option>
                    </select>
                  </div>
                </div>

                <div className="max-[550px]:hidden overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-zinc-800 border-b border-zinc-200">
                        <th className="font-semibold py-3 px-4 md:px-5">Cliente</th>
                        <th className="font-semibold py-3 px-4 md:px-5">Data</th>
                        <th className="font-semibold py-3 px-4 md:px-5">Valor ganho</th>
                        <th className="font-semibold py-3 px-4 md:px-5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {comissoesPaginadas.map((c) => (
                        <tr key={c.id}>
                          <td className="py-3 px-4 md:px-5 text-zinc-800">
                            {c.nome_indicado || `Comissão #${c.id}`}
                          </td>
                          <td className="py-3 px-4 md:px-5 text-zinc-600">
                            {new Date(c.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-4 md:px-5 text-zinc-800">{formatBRL(Number(c.valor))}</td>
                          <td className="py-3 px-4 md:px-5">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                c.status === "pago"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : c.status === "pendente"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              <span
                                className={`mr-1.5 h-2 w-2 rounded-full ${
                                  c.status === "pago"
                                    ? "bg-emerald-500"
                                    : c.status === "pendente"
                                      ? "bg-amber-500"
                                      : "bg-blue-500"
                                }`}
                              />
                              {c.status === "pago" ? "Pago" : c.status === "pendente" ? "Pendente" : "Disponível"}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {comissoesPaginadas.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 px-4 text-center text-sm text-muted-foreground">
                            Nenhum ganho encontrado para os filtros selecionados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="hidden max-[550px]:grid gap-3 p-4">
                  {comissoesPaginadas.map((c) => {
                    const isExpanded = expandedComissaoId === c.id;
                    const statusLabel = c.status === "pago" ? "Pago" : c.status === "pendente" ? "Pendente" : "Disponível";
                    return (
                      <div key={c.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-zinc-900">{c.nome_indicado || `Comissão #${c.id}`}</p>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              c.status === "pago"
                                ? "bg-emerald-100 text-emerald-700"
                                : c.status === "pendente"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            <span
                              className={`mr-1.5 h-2 w-2 rounded-full ${
                                c.status === "pago"
                                  ? "bg-emerald-500"
                                  : c.status === "pendente"
                                    ? "bg-amber-500"
                                    : "bg-blue-500"
                              }`}
                            />
                            {statusLabel}
                          </span>
                        </div>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => setExpandedComissaoId(isExpanded ? null : c.id)}
                            className="inline-flex items-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
                          >
                            {isExpanded ? "Ocultar" : "Ver mais"}
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 space-y-1.5">
                            <p>
                              <span className="font-medium text-zinc-900">Data:</span>{" "}
                              {new Date(c.created_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </p>
                            <p>
                              <span className="font-medium text-zinc-900">Valor ganho:</span> {formatBRL(Number(c.valor))}
                            </p>
                            <p>
                              <span className="font-medium text-zinc-900">Status:</span> {statusLabel}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {comissoesPaginadas.length === 0 && (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 text-center">
                      Nenhum ganho encontrado para os filtros selecionados.
                    </div>
                  )}
                </div>

                {comissoesFiltradasRpc.length > 0 && (
                  <div className="flex items-center justify-between border-t border-zinc-200 px-4 md:px-5 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 px-3 text-xs"
                      onClick={() => setComissoesPage((p) => Math.max(1, p - 1))}
                      disabled={comissoesPageSafe === 1}
                    >
                      Anterior
                    </Button>
                    <p className="text-sm font-medium text-zinc-700">
                      {comissoesPageSafe}/{comissoesTotalPages}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 px-3 text-xs"
                      onClick={() => setComissoesPage((p) => Math.min(comissoesTotalPages, p + 1))}
                      disabled={comissoesPageSafe === comissoesTotalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-4 md:p-5 flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-100 grid place-items-center shrink-0">
                  <BadgeCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-base font-semibold text-zinc-900 leading-tight">Instruções</p>
                  <p className="text-sm text-zinc-600 mt-1">
                    O total acumulado soma todos os valores das suas comissões, independentemente do
                    status.
                  </p>
                  <p className="text-sm text-zinc-600">
                    O saldo pendente considera só comissões marcadas como pendente; o total já pago,
                    só as marcadas como pago.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tutorial" && (
            <div>
              <div className="mb-5">
                <h3 className="text-lg font-semibold">Aprenda a ofertar</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Conteúdo introdutório para apresentar as soluções da ATOM TECH
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <h4 className="text-base font-semibold text-zinc-900">Painel solar</h4>
                  <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                    <iframe
                      className="aspect-video w-full"
                      src="https://www.youtube.com/embed/_W1nQT7az8c"
                      title="Tutorial de oferta de painel solar"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                  <p className="mt-2 text-sm text-zinc-600">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer viverra, nisl ac
                    ultrices feugiat, mauris massa sollicitudin nunc, sed volutpat risus nibh id ante.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <h4 className="text-base font-semibold text-zinc-900">Carregador veicular</h4>
                  <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                    <iframe
                      className="aspect-video w-full"
                      src="https://www.youtube.com/embed/GgX02LzY240"
                      title="Tutorial de oferta de carregador veicular"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                  <p className="mt-2 text-sm text-zinc-600">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce ullamcorper orci et
                    nibh tincidunt, sit amet efficitur sem suscipit. Curabitur hendrerit magna at
                    placerat blandit.
                  </p>
                </div>
              </div>
            </div>
          )}

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

      {editingIndicacaoId != null && (
        <EditIndicacaoModal
          loading={loadingEditIndicacao}
          nome={editNome}
          whatsapp={editWhatsapp}
          contaEnergiaPath={editContaEnergiaPath}
          fotoPadraoPath={editFotoPadraoPath}
          contaEnergiaSignedUrl={editContaEnergiaSignedUrl}
          fotoPadraoSignedUrl={editFotoPadraoSignedUrl}
          contaEnergiaFile={editContaEnergiaFile}
          fotoPadraoFile={editFotoPadraoFile}
          contaEnergiaError={editContaEnergiaError}
          fotoPadraoError={editFotoPadraoError}
          saving={updateIndicacaoMutation.isPending}
          onClose={closeEditIndicacaoModal}
          onNomeChange={setEditNome}
          onWhatsappChange={(value) => setEditWhatsapp(maskWhatsapp(value))}
          onContaEnergiaSelect={(file) => {
            setEditContaEnergiaError(null);
            if (!file) {
              setEditContaEnergiaFile(null);
              return;
            }
            if (!file.type.startsWith("image/")) {
              setEditContaEnergiaFile(null);
              setEditContaEnergiaError("Envie apenas arquivo de imagem.");
              return;
            }
            if (file.size > 5 * 1024 * 1024) {
              setEditContaEnergiaFile(null);
              setEditContaEnergiaError("Limite máximo de 5MB.");
              return;
            }
            setEditContaEnergiaFile(file);
          }}
          onRemoveContaEnergia={() => {
            setEditContaEnergiaFile(null);
            setEditContaEnergiaPath(null);
            setEditContaEnergiaSignedUrl(null);
            setEditContaEnergiaError(null);
          }}
          onFotoPadraoSelect={(file) => {
            setEditFotoPadraoError(null);
            if (!file) {
              setEditFotoPadraoFile(null);
              return;
            }
            if (!file.type.startsWith("image/")) {
              setEditFotoPadraoFile(null);
              setEditFotoPadraoError("Envie apenas arquivo de imagem.");
              return;
            }
            if (file.size > 5 * 1024 * 1024) {
              setEditFotoPadraoFile(null);
              setEditFotoPadraoError("Limite máximo de 5MB.");
              return;
            }
            setEditFotoPadraoFile(file);
          }}
          onRemoveFotoPadrao={() => {
            setEditFotoPadraoFile(null);
            setEditFotoPadraoPath(null);
            setEditFotoPadraoSignedUrl(null);
            setEditFotoPadraoError(null);
          }}
          onSave={() => updateIndicacaoMutation.mutate()}
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

function FunnelStep({
  icon: Icon,
  value,
  title,
  description,
  iconBgClass,
  valueClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  title: string;
  description: string;
  iconBgClass: string;
  valueClass: string;
}) {
  return (
    <div className="text-center">
      <div className={`mx-auto h-14 w-14 rounded-full grid place-items-center ${iconBgClass}`}>
        <Icon className="h-6 w-6" />
      </div>
      <p className={`mt-3 text-3xl font-bold ${valueClass}`}>{value}</p>
      <p className="text-xl font-bold text-zinc-900 leading-tight mt-1">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
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
    Enviado: "bg-blue-100 text-blue-700",
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
  const opcoesInteresse = [
    { value: "usina_solar", label: "Usina solar" },
    { value: "carregador_veicular", label: "Carregador veicular" },
  ] as const;
  const [form, setForm] = useState({
    nome: "",
    whatsapp: "",
    tipo: "Pessoa" as IndicacaoTipo,
    tipoProjetos: [] as string[],
    observacoes: "",
  });
  const [contaEnergiaFile, setContaEnergiaFile] = useState<File | null>(null);
  const [contaEnergiaError, setContaEnergiaError] = useState<string | null>(null);
  const [fotoPadraoFile, setFotoPadraoFile] = useState<File | null>(null);
  const [fotoPadraoError, setFotoPadraoError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: uid, error: rpcErr } = await supabase.rpc("get_my_usuario_id");
      if (rpcErr) throw rpcErr;
      if (uid == null) throw new Error("Complete seu perfil antes de indicar.");

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !authUser?.id) {
        throw new Error("Não foi possível validar sua sessão para upload.");
      }

      let contaEnergiaPath: string | null = null;
      if (contaEnergiaFile) {
        if (!contaEnergiaFile.type.startsWith("image/")) {
          throw new Error("Envie apenas imagens no campo da conta de energia.");
        }
        if (contaEnergiaFile.size > 5 * 1024 * 1024) {
          throw new Error("A imagem da conta de energia deve ter no máximo 5MB.");
        }

        const extension = contaEnergiaFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const filePath = `${authUser.id}/${Date.now()}-${makeUploadId()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("indicacoes-comprovantes")
          .upload(filePath, contaEnergiaFile, {
            upsert: false,
            contentType: contaEnergiaFile.type,
          });

        if (uploadError) {
          throw new Error(`Upload da conta de energia falhou: ${uploadError.message}`);
        }
        contaEnergiaPath = filePath;
      }

      let fotoPadraoPath: string | null = null;
      if (fotoPadraoFile) {
        if (!fotoPadraoFile.type.startsWith("image/")) {
          throw new Error("Envie apenas imagens no campo da foto do padrão.");
        }
        if (fotoPadraoFile.size > 5 * 1024 * 1024) {
          throw new Error("A foto do padrão deve ter no máximo 5MB.");
        }

        const extension = fotoPadraoFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const filePath = `${authUser.id}/${Date.now()}-${makeUploadId()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("indicacoes-comprovantes")
          .upload(filePath, fotoPadraoFile, {
            upsert: false,
            contentType: fotoPadraoFile.type,
          });

        if (uploadError) {
          throw new Error(`Upload da foto do padrão falhou: ${uploadError.message}`);
        }
        fotoPadraoPath = filePath;
      }

      const { data, error } = await supabase
        .from("indicacoes")
        .insert({
          usuario_id: uid,
          nome_indicado: form.nome.trim(),
          whatsapp: form.whatsapp.trim(),
          tipo: mapTipoToDb(form.tipo),
          tipo_projeto: form.tipoProjetos.length ? form.tipoProjetos.join(",") : null,
          observacoes: form.observacoes.trim() || null,
          conta_energia_url: contaEnergiaPath,
          foto_padrao_url: fotoPadraoPath,
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
    <div className="fixed inset-0 z-50 grid items-start sm:items-center place-items-center overflow-y-auto bg-foreground/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto bg-card rounded-2xl shadow-card-hover border border-border p-6">
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
              onChange={(e) => setForm({ ...form, whatsapp: maskWhatsapp(e.target.value) })}
              className="mt-1.5 rounded-[10px] h-11"
            />
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-xs text-emerald-800">
              Caso não saiba como tirar a foto, vá na aba de tutorial.
            </p>
          </div>
          <div>
            <Label htmlFor="m-conta-energia" className="text-sm font-medium">
              Suba a foto da conta de energia
            </Label>
            <Input
              id="m-conta-energia"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setContaEnergiaError(null);
                if (!file) {
                  setContaEnergiaFile(null);
                  return;
                }
                if (!file.type.startsWith("image/")) {
                  setContaEnergiaFile(null);
                  setContaEnergiaError("Envie apenas arquivo de imagem.");
                  return;
                }
                if (file.size > 5 * 1024 * 1024) {
                  setContaEnergiaFile(null);
                  setContaEnergiaError("Limite máximo de 5MB.");
                  return;
                }
                setContaEnergiaFile(file);
              }}
              className="mt-1.5 rounded-[10px] h-11 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-emerald-700"
            />
            <p className="mt-1 text-xs text-zinc-500">Formato: qualquer imagem • Limite: 5MB</p>
            {contaEnergiaError && <p className="mt-1 text-xs text-rose-600">{contaEnergiaError}</p>}
          </div>
          <div>
            <Label htmlFor="m-foto-padrao" className="text-sm font-medium">
              Suba a foto do padrão
            </Label>
            <Input
              id="m-foto-padrao"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setFotoPadraoError(null);
                if (!file) {
                  setFotoPadraoFile(null);
                  return;
                }
                if (!file.type.startsWith("image/")) {
                  setFotoPadraoFile(null);
                  setFotoPadraoError("Envie apenas arquivo de imagem.");
                  return;
                }
                if (file.size > 5 * 1024 * 1024) {
                  setFotoPadraoFile(null);
                  setFotoPadraoError("Limite máximo de 5MB.");
                  return;
                }
                setFotoPadraoFile(file);
              }}
              className="mt-1.5 rounded-[10px] h-11 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-emerald-700"
            />
            <p className="mt-1 text-xs text-zinc-500">Formato: qualquer imagem • Limite: 5MB</p>
            {fotoPadraoError && <p className="mt-1 text-xs text-rose-600">{fotoPadraoError}</p>}
          </div>
          <div>
            <Label className="text-sm font-medium">
              Solução de interesse
            </Label>
            <div className="mt-2 space-y-2 rounded-[10px] border border-input bg-background p-3">
              {opcoesInteresse.map((opcao) => {
                const checked = form.tipoProjetos.includes(opcao.value);
                return (
                  <label key={opcao.value} className="flex cursor-pointer items-center gap-3 text-sm text-zinc-800">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          tipoProjetos: e.target.checked
                            ? [...prev.tipoProjetos, opcao.value]
                            : prev.tipoProjetos.filter((value) => value !== opcao.value),
                        }))
                      }
                      className="h-4 w-4 rounded-full border-zinc-400 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{opcao.label}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-zinc-500">Você pode selecionar uma ou mais opções.</p>
          </div>
          <div>
            <Label htmlFor="m-observacoes" className="text-sm font-medium">
              Observações
            </Label>
            <Textarea
              id="m-observacoes"
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Descreva detalhes úteis do cliente (consumo, urgência, orçamento, perfil do imóvel ou negócio). Quanto mais contexto, maior a chance de fechamento."
              className="mt-1.5 min-h-[92px] rounded-[10px]"
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

function EditIndicacaoModal({
  loading,
  nome,
  whatsapp,
  contaEnergiaPath,
  fotoPadraoPath,
  contaEnergiaSignedUrl,
  fotoPadraoSignedUrl,
  contaEnergiaFile,
  fotoPadraoFile,
  contaEnergiaError,
  fotoPadraoError,
  saving,
  onClose,
  onNomeChange,
  onWhatsappChange,
  onContaEnergiaSelect,
  onRemoveContaEnergia,
  onFotoPadraoSelect,
  onRemoveFotoPadrao,
  onSave,
}: {
  loading: boolean;
  nome: string;
  whatsapp: string;
  contaEnergiaPath: string | null;
  fotoPadraoPath: string | null;
  contaEnergiaSignedUrl: string | null;
  fotoPadraoSignedUrl: string | null;
  contaEnergiaFile: File | null;
  fotoPadraoFile: File | null;
  contaEnergiaError: string | null;
  fotoPadraoError: string | null;
  saving: boolean;
  onClose: () => void;
  onNomeChange: (value: string) => void;
  onWhatsappChange: (value: string) => void;
  onContaEnergiaSelect: (file: File | null) => void;
  onRemoveContaEnergia: () => void;
  onFotoPadraoSelect: (file: File | null) => void;
  onRemoveFotoPadrao: () => void;
  onSave: () => void;
}) {
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [contaPreviewUrl, setContaPreviewUrl] = useState<string | null>(null);
  const [padraoPreviewUrl, setPadraoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!contaEnergiaFile) {
      setContaPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(contaEnergiaFile);
    setContaPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [contaEnergiaFile]);

  useEffect(() => {
    if (!fotoPadraoFile) {
      setPadraoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(fotoPadraoFile);
    setPadraoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [fotoPadraoFile]);

  const contaImageToShow = contaPreviewUrl ?? contaEnergiaSignedUrl;
  const padraoImageToShow = padraoPreviewUrl ?? fotoPadraoSignedUrl;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">Editar indicação</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            aria-label="Fechar edição"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="edit-indicacao-nome">Nome</Label>
            <Input
              id="edit-indicacao-nome"
              value={nome}
              onChange={(e) => onNomeChange(e.target.value)}
              disabled={loading || saving}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="edit-indicacao-whatsapp">WhatsApp</Label>
            <Input
              id="edit-indicacao-whatsapp"
              value={whatsapp}
              onChange={(e) => onWhatsappChange(e.target.value)}
              disabled={loading || saving}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="edit-indicacao-conta-energia">Foto da conta de energia</Label>
            <Input
              id="edit-indicacao-conta-energia"
              type="file"
              accept="image/*"
              onChange={(e) => onContaEnergiaSelect(e.target.files?.[0] ?? null)}
              disabled={loading || saving}
              className="mt-1.5 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-emerald-700"
            />
            <p className="mt-1 text-xs text-zinc-500">
              {contaEnergiaPath ? "Foto atual cadastrada. Selecione outra para substituir." : "Nenhuma foto cadastrada ainda."}
            </p>
            {contaImageToShow && (
              <div className="mt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setZoomedImageUrl(contaImageToShow)}
                  className="block w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"
                >
                  <img src={contaImageToShow} alt="Pré-visualização da conta de energia" className="h-40 w-full object-cover" />
                </button>
                <Button type="button" variant="outline" className="h-9" onClick={onRemoveContaEnergia} disabled={loading || saving}>
                  Excluir imagem
                </Button>
              </div>
            )}
            {contaEnergiaError && <p className="mt-1 text-xs text-rose-600">{contaEnergiaError}</p>}
          </div>
          <div>
            <Label htmlFor="edit-indicacao-foto-padrao">Foto do padrão</Label>
            <Input
              id="edit-indicacao-foto-padrao"
              type="file"
              accept="image/*"
              onChange={(e) => onFotoPadraoSelect(e.target.files?.[0] ?? null)}
              disabled={loading || saving}
              className="mt-1.5 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-emerald-700"
            />
            <p className="mt-1 text-xs text-zinc-500">
              {fotoPadraoPath ? "Foto atual cadastrada. Selecione outra para substituir." : "Nenhuma foto cadastrada ainda."}
            </p>
            {padraoImageToShow && (
              <div className="mt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setZoomedImageUrl(padraoImageToShow)}
                  className="block w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"
                >
                  <img src={padraoImageToShow} alt="Pré-visualização da foto do padrão" className="h-40 w-full object-cover" />
                </button>
                <Button type="button" variant="outline" className="h-9" onClick={onRemoveFotoPadrao} disabled={loading || saving}>
                  Excluir imagem
                </Button>
              </div>
            )}
            {fotoPadraoError && <p className="mt-1 text-xs text-rose-600">{fotoPadraoError}</p>}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={onSave} disabled={loading || saving}>
            Salvar
          </Button>
        </div>
      </div>
      {zoomedImageUrl && (
        <button
          type="button"
          onClick={() => setZoomedImageUrl(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
          aria-label="Fechar imagem ampliada"
        >
          <img src={zoomedImageUrl} alt="Imagem ampliada" className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" />
        </button>
      )}
    </div>
  );
}
