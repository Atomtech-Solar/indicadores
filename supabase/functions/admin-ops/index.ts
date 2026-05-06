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
  | { action: "list_users"; page?: number; limit?: number; search?: string }
  | { action: "set_user_role"; userId: string; role: "indicador" | "admin" }
  | { action: "disable_user"; userId: string }
  | { action: "reactivate_user"; userId: string }
  | { action: "list_indicacoes"; page?: number; limit?: number; search?: string; onlyCommissionEligible?: boolean }
  | { action: "update_indicacao_status"; indicacaoId: number; status: "enviado" | "analise" | "negociacao" | "fechado" | "perdido" }
  | { action: "list_comissoes"; page?: number; limit?: number; search?: string }
  | { action: "list_fotos"; page?: number; limit?: number; search?: string }
  | { action: "delete_indicacao"; indicacaoId: number }
  | { action: "update_comissao_status"; comissaoId: number; status: "pendente" | "disponivel" | "pago" | "cancelado" }
  | { action: "reports" };

type ListParams = { page?: number; limit?: number; search?: string };

function normalizeListParams(input: ListParams) {
  const page = Number.isFinite(input.page) ? Math.max(1, Number(input.page)) : 1;
  const limit = Number.isFinite(input.limit) ? Math.min(100, Math.max(1, Number(input.limit))) : 10;
  const search = (input.search ?? "").trim();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { page, limit, search, from, to };
}

function parseBrazilianDateSearch(search: string): { startIso: string; endIso: string } | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(search.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  if (
    start.getUTCFullYear() !== year ||
    start.getUTCMonth() !== month - 1 ||
    start.getUTCDate() !== day
  ) {
    return null;
  }
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

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
  const { data, error } = await adminClient.rpc("get_admin_overview");
  if (error) throw error;
  return data;
}

async function listUsers(adminClient: SupabaseClient, params: ListParams) {
  const { page, limit, search, from, to } = normalizeListParams(params);
  const dateSearch = parseBrazilianDateSearch(search);
  let query = adminClient
    .from("usuarios")
    .select("id, usuario_id, nome, whatsapp, role, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (dateSearch) {
    query = query.gte("created_at", dateSearch.startIso).lt("created_at", dateSearch.endIso);
  } else if (search) {
    query = query.or(`nome.ilike.%${search}%,whatsapp.ilike.%${search}%,role.ilike.%${search}%`);
  }

  const [{ data: usuarios, count }, usersResult] = await Promise.all([
    query.range(from, to),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const emailMap = new Map<string, string>();
  const disabledMap = new Map<string, boolean>();
  const nowMs = Date.now();
  for (const u of usersResult.data.users ?? []) {
    if (u.id && u.email) emailMap.set(u.id, u.email);
    const bannedUntil = (u as { banned_until?: string | null }).banned_until;
    const isDisabled = Boolean(bannedUntil && new Date(bannedUntil).getTime() > nowMs);
    if (u.id) disabledMap.set(u.id, isDisabled);
  }

  const items = (usuarios ?? []).map((u) => ({
    id: u.id,
    usuario_id: u.usuario_id,
    nome: u.nome ?? "Sem nome",
    whatsapp: u.whatsapp ?? "-",
    role: u.role ?? "indicador",
    created_at: u.created_at,
    email: emailMap.get(u.usuario_id) ?? "-",
    is_disabled: disabledMap.get(u.usuario_id) ?? false,
  }));
  return { items, total: count ?? 0, page, limit };
}

async function listFotos(adminClient: SupabaseClient, params: ListParams) {
  const { page, limit, search, from, to } = normalizeListParams(params);
  let query = adminClient
      .from("indicacoes")
      .select("id, usuario_id, nome_indicado, whatsapp, tipo_projeto, observacoes, conta_energia_url, foto_padrao_url, created_at", { count: "exact" })
      .or("conta_energia_url.not.is.null,foto_padrao_url.not.is.null")
      .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`nome_indicado.ilike.%${search}%,whatsapp.ilike.%${search}%,tipo_projeto.ilike.%${search}%,observacoes.ilike.%${search}%`);
  }

  const { data: indicacoes, count } = await query.range(from, to);
  const userIds = Array.from(new Set((indicacoes ?? []).map((i) => i.usuario_id)));
  const { data: usuarios } = userIds.length
    ? await adminClient.from("usuarios").select("id, nome").in("id", userIds)
    : { data: [] as Array<{ id: number; nome: string | null }> };

  const userNameById = new Map<number, string>((usuarios ?? []).map((u) => [u.id, u.nome ?? "Sem nome"]));

  const allPaths = Array.from(
    new Set(
      (indicacoes ?? [])
        .flatMap((i) => [i.conta_energia_url, i.foto_padrao_url])
        .filter((p): p is string => Boolean(p)),
    ),
  );

  const signedUrlByPath = new Map<string, string>();
  if (allPaths.length > 0) {
    const { data: signedBatch, error: signedError } = await adminClient.storage
      .from("indicacoes-comprovantes")
      .createSignedUrls(allPaths, 60 * 60);
    if (signedError) throw signedError;
    for (const item of signedBatch ?? []) {
      if (item.path && item.signedUrl) {
        signedUrlByPath.set(item.path, item.signedUrl);
      }
    }
  }

  const withUrls = (indicacoes ?? []).map((i) => ({
    id: i.id,
    usuario_nome: userNameById.get(i.usuario_id) ?? "Usuário",
    nome_indicado: i.nome_indicado,
    whatsapp: i.whatsapp ?? null,
    tipo_projeto: i.tipo_projeto,
    observacoes: i.observacoes,
    conta_energia_url: i.conta_energia_url ? (signedUrlByPath.get(i.conta_energia_url) ?? null) : null,
    foto_padrao_url: i.foto_padrao_url ? (signedUrlByPath.get(i.foto_padrao_url) ?? null) : null,
    created_at: i.created_at,
  }));

  return { items: withUrls, total: count ?? 0, page, limit };
}

function errorMessageFromUnknown(err: unknown): string {
  if (err instanceof Error) return err.message || "Erro desconhecido.";
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

async function deleteIndicacao(adminClient: SupabaseClient, indicacaoId: number): Promise<void> {
  const { data: row, error: fetchError } = await adminClient
    .from("indicacoes")
    .select("id, conta_energia_url, foto_padrao_url")
    .eq("id", indicacaoId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(errorMessageFromUnknown(fetchError));
  }
  if (!row?.id) throw new Error("NOT_FOUND");

  const paths = [row.conta_energia_url, row.foto_padrao_url].filter((p): p is string => Boolean(p?.trim()));

  const { error: rpcError } = await adminClient.rpc("admin_delete_indicacao", { target_id: indicacaoId });
  if (rpcError) {
    const rpcMsg = errorMessageFromUnknown(rpcError);
    if (rpcMsg.includes("NOT_FOUND") || rpcMsg.includes("P0001")) {
      throw new Error("NOT_FOUND");
    }
    throw new Error(rpcMsg);
  }

  if (paths.length > 0) {
    const { error: storageError } = await adminClient.storage.from("indicacoes-comprovantes").remove(paths);
    if (storageError) {
      console.error(
        JSON.stringify({
          type: "admin_delete_indicacao_storage_cleanup_failed",
          indicacaoId,
          message: storageError.message,
          createdAt: new Date().toISOString(),
        }),
      );
    }
  }
}

async function listIndicacoes(adminClient: SupabaseClient, params: ListParams & { onlyCommissionEligible?: boolean }) {
  const { page, limit, search, from, to } = normalizeListParams(params);
  let query = adminClient
      .from("indicacoes")
      .select("id, usuario_id, nome_indicado, tipo, status, valor_potencial, valor_projeto, created_at, updated_at", { count: "exact" })
      .order("created_at", { ascending: false });

  if (params.onlyCommissionEligible) {
    query = query.in("status", ["negociacao", "fechado"]);
  }
  if (search) {
    query = query.or(`nome_indicado.ilike.%${search}%,tipo.ilike.%${search}%,status.ilike.%${search}%`);
  }

  const { data: indicacoes, count } = await query.range(from, to);
  const userIds = Array.from(new Set((indicacoes ?? []).map((i) => i.usuario_id)));
  const { data: usuarios } = userIds.length
    ? await adminClient.from("usuarios").select("id, nome").in("id", userIds)
    : { data: [] as Array<{ id: number; nome: string | null }> };

  const userNameById = new Map<number, string>((usuarios ?? []).map((u) => [u.id, u.nome ?? "Sem nome"]));
  const items = (indicacoes ?? []).map((i) => ({
    ...i,
    usuario_nome: userNameById.get(i.usuario_id) ?? "Usuário",
  }));
  return { items, total: count ?? 0, page, limit };
}

async function listComissoes(adminClient: SupabaseClient, params: ListParams) {
  const { page, limit, search, from, to } = normalizeListParams(params);
  let query = adminClient
    .from("comissoes")
    .select("id, usuario_id, indicacao_id, valor, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`status.ilike.%${search}%`);
  }

  const { data: comissoes, count } = await query.range(from, to);
  const userIds = Array.from(new Set((comissoes ?? []).map((c) => c.usuario_id)));
  const indicacaoIds = Array.from(new Set((comissoes ?? []).map((c) => c.indicacao_id)));
  const [{ data: usuarios }, { data: indicacoes }] = await Promise.all([
    userIds.length ? adminClient.from("usuarios").select("id, nome").in("id", userIds) : Promise.resolve({ data: [] as Array<{ id: number; nome: string | null }> }),
    indicacaoIds.length ? adminClient.from("indicacoes").select("id, nome_indicado").in("id", indicacaoIds) : Promise.resolve({ data: [] as Array<{ id: number; nome_indicado: string }> }),
  ]);

  const userNameById = new Map<number, string>((usuarios ?? []).map((u) => [u.id, u.nome ?? "Sem nome"]));
  const indicacaoNameById = new Map<number, string>((indicacoes ?? []).map((i) => [i.id, i.nome_indicado]));

  const items = (comissoes ?? []).map((c) => ({
    ...c,
    usuario_nome: userNameById.get(c.usuario_id) ?? "Usuário",
    indicacao_nome: indicacaoNameById.get(c.indicacao_id) ?? `Indicação #${c.indicacao_id}`,
  }));
  return { items, total: count ?? 0, page, limit };
}

async function getReports(adminClient: SupabaseClient) {
  const [indicacoesResp, comissoesResp, usuariosResp] = await Promise.all([
    listIndicacoes(adminClient, { page: 1, limit: 1000 }),
    listComissoes(adminClient, { page: 1, limit: 1000 }),
    listUsers(adminClient, { page: 1, limit: 1000 }),
  ]);
  const indicacoes = indicacoesResp.items;
  const comissoes = comissoesResp.items;
  const usuarios = usuariosResp.items;

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
        return jsonResponse(req, 200, { data: await listUsers(adminClient, payload) });
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
      case "reactivate_user": {
        const { error } = await adminClient.auth.admin.updateUserById(payload.userId, { ban_duration: "none" });
        if (error) throw error;
        return jsonResponse(req, 200, { message: "Usuário reativado com sucesso." });
      }
      case "list_indicacoes":
        return jsonResponse(req, 200, { data: await listIndicacoes(adminClient, payload) });
      case "update_indicacao_status": {
        const { error } = await adminClient.from("indicacoes").update({ status: payload.status }).eq("id", payload.indicacaoId);
        if (error) throw error;
        return jsonResponse(req, 200, { message: "Status da indicação atualizado." });
      }
      case "list_comissoes":
        return jsonResponse(req, 200, { data: await listComissoes(adminClient, payload) });
      case "list_fotos":
        return jsonResponse(req, 200, { data: await listFotos(adminClient, payload) });
      case "delete_indicacao": {
        const rawId = (payload as unknown as { indicacaoId?: unknown }).indicacaoId;
        const indicacaoId = typeof rawId === "number" && Number.isFinite(rawId) ? rawId : Number(rawId);
        if (!Number.isFinite(indicacaoId) || indicacaoId <= 0) {
          return jsonResponse(req, 400, { error: "ID da indicação inválido." });
        }
        await deleteIndicacao(adminClient, indicacaoId);
        return jsonResponse(req, 200, { message: "Indicação excluída com sucesso." });
      }
      case "update_comissao_status": {
        const patch: Record<string, unknown> = { status: payload.status };
        if (payload.status === "pago") {
          patch.data_pagamento = new Date().toISOString();
        } else {
          patch.data_pagamento = null;
        }
        const { error } = await adminClient.from("comissoes").update(patch).eq("id", payload.comissaoId);
        if (error) throw error;
        return jsonResponse(req, 200, { message: "Status da comissão atualizado." });
      }
      case "reports":
        return jsonResponse(req, 200, { data: await getReports(adminClient) });
      default:
        return jsonResponse(req, 400, {
          error:
            "Esta ação não existe no servidor. Faça o deploy da função admin-ops com o código atual do repositório.",
        });
    }
  } catch (err) {
    const message = errorMessageFromUnknown(err);
    console.error(JSON.stringify({ type: "admin_ops_error", message, createdAt: new Date().toISOString() }));
    if (message === "FORBIDDEN" || message.includes("FORBIDDEN")) {
      return jsonResponse(req, 403, { error: "Sem permissão para esta operação." });
    }
    if (message === "NOT_FOUND" || message.includes("NOT_FOUND")) {
      return jsonResponse(req, 404, { error: "Indicação não encontrada." });
    }
    const safe =
      message.length > 0 && message.length < 280
        ? message
        : "Não foi possível concluir a solicitação.";
    return jsonResponse(req, 400, { error: safe });
  }
});
