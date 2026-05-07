import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type SetCommissionPayload = {
  indicacaoId: number;
  /** Valor da comissão do indicador (comissoes.valor + indicacoes.valor_potencial) */
  valorComissao: number;
  /** Valor do projeto / faturamento da empresa (indicacoes.valor_projeto) */
  valorProjeto: number;
};

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

async function getUserByAuthId(adminClient: SupabaseClient, authUserId: string) {
  const { data, error } = await adminClient
    .from("usuarios")
    .select("id, nome")
    .eq("usuario_id", authUserId)
    .maybeSingle();
  if (error || !data?.id) throw new Error("FORBIDDEN");
  return data;
}

async function upsertCommissionByIndicacao(
  adminClient: SupabaseClient,
  indicacaoId: number,
  valorComissao: number,
  valorProjeto: number,
  actor: { id: number; nome: string | null },
): Promise<void> {
  const { data: indicacao, error: indicacaoError } = await adminClient
    .from("indicacoes")
    .select("id, usuario_id, status, nome_indicado")
    .eq("id", indicacaoId)
    .maybeSingle();

  if (indicacaoError || !indicacao) throw new Error("INDICACAO_NOT_FOUND");
  if (indicacao.status !== "negociacao" && indicacao.status !== "fechado") {
    throw new Error("INVALID_STATUS_FOR_COMMISSION");
  }

  const { error: indicacaoUpdateError } = await adminClient
    .from("indicacoes")
    .update({
      valor_potencial: valorComissao,
      valor_projeto: valorProjeto,
    })
    .eq("id", indicacao.id);

  if (indicacaoUpdateError) throw new Error("UPDATE_INDICACAO_VALUE_FAILED");

  const { data: existingCommission, error: existingError } = await adminClient
    .from("comissoes")
    .select("id")
    .eq("indicacao_id", indicacao.id)
    .maybeSingle();

  if (existingError) throw new Error("LOAD_COMMISSION_FAILED");

  if (existingCommission?.id) {
    const { error: updateError } = await adminClient
      .from("comissoes")
      .update({
        valor: valorComissao,
        status: "pendente",
      })
      .eq("id", existingCommission.id);

    if (updateError) throw new Error("UPDATE_COMMISSION_FAILED");
  } else {
    const { error: insertError } = await adminClient.from("comissoes").insert({
      indicacao_id: indicacao.id,
      usuario_id: indicacao.usuario_id,
      valor: valorComissao,
      status: "pendente",
    });

    if (insertError) throw new Error("INSERT_COMMISSION_FAILED");
  }

  const { error: activityError } = await adminClient.from("atividades").insert({
    usuario_id: indicacao.usuario_id,
    tipo: "comissao_definida_admin",
    descricao: `Comissão e valor de projeto definidos para indicação ${indicacao.id}`,
    metadata: {
      indicacao_id: indicacao.id,
      valor_comissao: valorComissao,
      valor_projeto: valorProjeto,
      status: "pendente",
    },
  });

  if (activityError) throw new Error("ACTIVITY_LOG_FAILED");

  const { data: admins } = await adminClient.from("usuarios").select("id").eq("role", "admin");
  const adminNotifs = (admins ?? []).map((a) => ({
    destinatario_usuario_id: a.id,
    evento: "comissao_definida",
    titulo: "Comissão definida",
    mensagem: `${actor.nome ?? "Admin"} definiu comissão para ${indicacao.nome_indicado ?? `indicação #${indicacao.id}`}.`,
    entidade_tipo: "indicacoes",
    entidade_id: indicacao.id,
    ator_usuario_id: actor.id,
    ator_nome: actor.nome ?? "Admin",
    metadata: {
      valor_comissao: valorComissao,
      valor_projeto: valorProjeto,
    },
  }));
  adminNotifs.push({
    destinatario_usuario_id: indicacao.usuario_id,
    evento: "comissao_definida_indicador",
    titulo: "Comissão atualizada",
    mensagem: `Sua comissão da indicação "${indicacao.nome_indicado ?? indicacao.id}" foi definida em ${valorComissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
    entidade_tipo: "indicacoes",
    entidade_id: indicacao.id,
    ator_usuario_id: actor.id,
    ator_nome: actor.nome ?? "Admin",
    metadata: {
      valor_comissao: valorComissao,
      valor_projeto: valorProjeto,
    },
  });
  const { error: notifError } = await adminClient.from("notificacoes").insert(adminNotifs);
  if (notifError) throw new Error("NOTIFICATION_FAILED");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: buildCorsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, 405, { error: "method_not_allowed" });

  try {
    const { supabaseUrl, anonKey, serviceRoleKey } = getEnv();
    const authHeader = req.headers.get("Authorization") ?? "";

    const anonClient = createClient(supabaseUrl, anonKey);
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const requesterId = await getRequesterUserId(anonClient, authHeader);
    if (!requesterId) return jsonResponse(req, 401, { error: "unauthorized" });
    await ensureAdmin(adminClient, requesterId);
    const actor = await getUserByAuthId(adminClient, requesterId);

    const payload = (await req.json()) as Partial<SetCommissionPayload> & { valor?: number; indicacaoId?: number };

    const indicacaoId = Number(payload.indicacaoId);
    const valorComissao = Number(
      payload.valorComissao ?? payload.valor,
    );
    const valorProjeto = Number(payload.valorProjeto);

    if (!Number.isInteger(indicacaoId) || indicacaoId <= 0) {
      return jsonResponse(req, 400, { error: "invalid_payload" });
    }
    if (!Number.isFinite(valorComissao) || valorComissao <= 0) {
      return jsonResponse(req, 400, { error: "invalid_comissao" });
    }
    if (!Number.isFinite(valorProjeto) || valorProjeto <= 0) {
      return jsonResponse(req, 400, { error: "invalid_projeto" });
    }

    await upsertCommissionByIndicacao(adminClient, indicacaoId, valorComissao, valorProjeto, actor);
    return jsonResponse(req, 200, { message: "Comissão e faturamento definidos com sucesso." });
  } catch {
    return jsonResponse(req, 400, { error: "Não foi possível concluir a solicitação." });
  }
});
