import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "*";
  const reqHeaders = req.headers.get("access-control-request-headers");
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": reqHeaders ?? "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin, Access-Control-Request-Headers",
  };
}

type ActionPayload =
  | { action: "overview" }
  | { action: "list_users" }
  | { action: "set_user_role"; userId: string; role: "indicador" | "admin" }
  | { action: "disable_user"; userId: string }
  | { action: "list_indicacoes" }
  | { action: "update_indicacao_status"; indicacaoId: number; status: "enviado" | "analise" | "negociacao" | "fechado" | "perdido" }
  | { action: "list_comissoes" }
  | { action: "update_comissao_status"; comissaoId: number; status: "pendente" | "disponivel" | "pago" | "cancelado" }
  | { action: "reports" };

function jsonResponse(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function getEnv() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("MISSING_ENV");
  return { supabaseUrl, anonKey, serviceRoleKey };
}

async function getRequesterUserId(anonClient: SupabaseClient, authHeader: string): Promise<string | null> {
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;
  const { data, error } = await anonClient.auth.getUser(token);
  if (error || !data.user?.id) return null;
  return data.user.id;
}

async function ensureAdmin(adminClient: SupabaseClient, authUserId: string): Promise<void> {
  const { data, error } = await adminClient
    .from("usuarios")
    .select("role")
    .eq("usuario_id", authUserId)
    .maybeSingle();

  if (error || data?.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
}

async function getOverview(adminClient: SupabaseClient) {
  const [{ data: usuarios }, { data: indicacoes }, { data: comissoes }] = await Promise.all([
    adminClient.from("usuarios").select("id, created_at"),
    adminClient.from("indicacoes").select("id, status, created_at"),
    adminClient.from("comissoes").select("id, valor, status, created_at"),
  ]);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthKey = (iso: string) => iso.slice(0, 7);
  const safeUsuarios = usuarios ?? [];
  const safeIndicacoes = indicacoes ?? [];
  const safeComissoes = comissoes ?? [];

  const receitaTotal = safeComissoes.reduce((acc, c) => acc + Number(c.valor), 0);
  const receitaMes = safeComissoes
    .filter((c) => monthKey(c.created_at) === currentMonth)
    .reduce((acc, c) => acc + Number(c.valor), 0);

  const growthSeries = Array.from({ length: 6 }).map((_, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    const receita = safeComissoes
      .filter((c) => monthKey(c.created_at) === key && c.status === "pago")
      .reduce((acc, c) => acc + Number(c.valor), 0);
    return { label, receita };
  });

  const funnel = {
    enviado: safeIndicacoes.filter((i) => i.status === "enviado").length,
    analise: safeIndicacoes.filter((i) => i.status === "analise").length,
    negociacao: safeIndicacoes.filter((i) => i.status === "negociacao").length,
    fechado: safeIndicacoes.filter((i) => i.status === "fechado").length,
    perdido: safeIndicacoes.filter((i) => i.status === "perdido").length,
  };

  const alerts: string[] = [];
  if (funnel.analise > funnel.fechado * 3) alerts.push("Muitas indicações paradas em análise.");
  if ((safeComissoes.filter((c) => c.status === "pendente").length ?? 0) > 10) alerts.push("Volume alto de comissões pendentes.");
  if (alerts.length === 0) alerts.push("Operação estável no momento.");

  return {
    metrics: {
      receitaTotal,
      receitaMes,
      totalUsuarios: safeUsuarios.length,
      novosUsuarios: safeUsuarios.filter((u) => monthKey(u.created_at) === currentMonth).length,
      totalIndicacoes: safeIndicacoes.length,
      comissoesPagas: safeComissoes.filter((c) => c.status === "pago").length,
    },
    growthSeries,
    funnel,
    alerts,
  };
}

async function listUsers(adminClient: SupabaseClient) {
  const [{ data: usuarios }, usersResult] = await Promise.all([
    adminClient.from("usuarios").select("id, usuario_id, nome, whatsapp, role, created_at").order("created_at", { ascending: false }),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const emailMap = new Map<string, string>();
  for (const u of usersResult.data.users ?? []) {
    if (u.id && u.email) emailMap.set(u.id, u.email);
  }

  return (usuarios ?? []).map((u) => ({
    id: u.id,
    usuario_id: u.usuario_id,
    nome: u.nome ?? "Sem nome",
    whatsapp: u.whatsapp ?? "-",
    role: u.role ?? "indicador",
    created_at: u.created_at,
    email: emailMap.get(u.usuario_id) ?? "-",
  }));
}

async function listIndicacoes(adminClient: SupabaseClient) {
  const [{ data: indicacoes }, { data: usuarios }] = await Promise.all([
    adminClient
      .from("indicacoes")
      .select("id, usuario_id, nome_indicado, tipo, status, valor_potencial, created_at")
      .order("created_at", { ascending: false }),
    adminClient.from("usuarios").select("id, nome"),
  ]);

  const userNameById = new Map<number, string>((usuarios ?? []).map((u) => [u.id, u.nome ?? "Sem nome"]));
  return (indicacoes ?? []).map((i) => ({
    ...i,
    usuario_nome: userNameById.get(i.usuario_id) ?? "Usuário",
  }));
}

async function listComissoes(adminClient: SupabaseClient) {
  const [{ data: comissoes }, { data: usuarios }, { data: indicacoes }] = await Promise.all([
    adminClient.from("comissoes").select("id, usuario_id, indicacao_id, valor, status, created_at").order("created_at", { ascending: false }),
    adminClient.from("usuarios").select("id, nome"),
    adminClient.from("indicacoes").select("id, nome_indicado"),
  ]);

  const userNameById = new Map<number, string>((usuarios ?? []).map((u) => [u.id, u.nome ?? "Sem nome"]));
  const indicacaoNameById = new Map<number, string>((indicacoes ?? []).map((i) => [i.id, i.nome_indicado]));

  return (comissoes ?? []).map((c) => ({
    ...c,
    usuario_nome: userNameById.get(c.usuario_id) ?? "Usuário",
    indicacao_nome: indicacaoNameById.get(c.indicacao_id) ?? `Indicação #${c.indicacao_id}`,
  }));
}

async function getReports(adminClient: SupabaseClient) {
  const [indicacoes, comissoes, usuarios] = await Promise.all([
    listIndicacoes(adminClient),
    listComissoes(adminClient),
    listUsers(adminClient),
  ]);

  const closed = indicacoes.filter((i) => i.status === "fechado").length;
  const conversionRate = indicacoes.length > 0 ? (closed / indicacoes.length) * 100 : 0;

  const rankingMap = new Map<number, { nome: string; totalIndicacoes: number; totalFechadas: number; receita: number }>();
  for (const user of usuarios) {
    rankingMap.set(user.id, { nome: user.nome, totalIndicacoes: 0, totalFechadas: 0, receita: 0 });
  }

  for (const i of indicacoes) {
    const row = rankingMap.get(i.usuario_id);
    if (!row) continue;
    row.totalIndicacoes += 1;
    if (i.status === "fechado") row.totalFechadas += 1;
  }

  for (const c of comissoes) {
    const row = rankingMap.get(c.usuario_id);
    if (!row) continue;
    row.receita += Number(c.valor);
  }

  const ranking = Array.from(rankingMap.values())
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 10);

  return {
    ranking,
    conversionRate,
    aggregates: {
      totalUsuarios: usuarios.length,
      totalIndicacoes: indicacoes.length,
      totalComissoes: comissoes.length,
      receitaPaga: comissoes.filter((c) => c.status === "pago").reduce((acc, c) => acc + Number(c.valor), 0),
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: buildCorsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, 405, { error: "method_not_allowed" });

  try {
    const { supabaseUrl, anonKey, serviceRoleKey } = getEnv();
    const authHeader = req.headers.get("Authorization") ?? "";

    const anonClient = createClient(supabaseUrl, anonKey);
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const authUserId = await getRequesterUserId(anonClient, authHeader);
    if (!authUserId) return jsonResponse(req, 401, { error: "unauthorized" });
    await ensureAdmin(adminClient, authUserId);

    const payload = (await req.json()) as ActionPayload;

    switch (payload.action) {
      case "overview":
        return jsonResponse(req, 200, { data: await getOverview(adminClient) });
      case "list_users":
        return jsonResponse(req, 200, { data: await listUsers(adminClient) });
      case "set_user_role": {
        const { error } = await adminClient.from("usuarios").update({ role: payload.role }).eq("usuario_id", payload.userId);
        if (error) throw error;
        return jsonResponse(req, 200, { message: "Role atualizado com sucesso." });
      }
      case "disable_user": {
        const { error } = await adminClient.auth.admin.updateUserById(payload.userId, { ban_duration: "876000h" });
        if (error) throw error;
        return jsonResponse(req, 200, { message: "Usuário desativado com sucesso." });
      }
      case "list_indicacoes":
        return jsonResponse(req, 200, { data: await listIndicacoes(adminClient) });
      case "update_indicacao_status": {
        const { error } = await adminClient.from("indicacoes").update({ status: payload.status }).eq("id", payload.indicacaoId);
        if (error) throw error;
        return jsonResponse(req, 200, { message: "Status da indicação atualizado." });
      }
      case "list_comissoes":
        return jsonResponse(req, 200, { data: await listComissoes(adminClient) });
      case "update_comissao_status": {
        const patch: Record<string, unknown> = { status: payload.status };
        if (payload.status === "pago") patch.data_pagamento = new Date().toISOString();
        const { error } = await adminClient.from("comissoes").update(patch).eq("id", payload.comissaoId);
        if (error) throw error;
        return jsonResponse(req, 200, { message: "Status da comissão atualizado." });
      }
      case "reports":
        return jsonResponse(req, 200, { data: await getReports(adminClient) });
      default:
        return jsonResponse(req, 400, { error: "invalid_action" });
    }
  } catch {
    return jsonResponse(req, 400, { error: "Não foi possível concluir a solicitação." });
  }
});
