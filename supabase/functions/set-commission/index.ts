import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { getSupabaseEdgeEnv } from "../_shared/env.ts";
import { ensureAdmin, getRequesterUserId, getUserByAuthId } from "../_shared/auth-admin.ts";
import { jsonResponse } from "../_shared/http.ts";

type SetCommissionPayload = {
  indicacaoId: number;
  /** Valor da comissão do indicador (comissoes.valor + indicacoes.valor_potencial) */
  valorComissao: number;
  /** Valor do projeto / faturamento da empresa (indicacoes.valor_projeto) */
  valorProjeto: number;
};

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

  const { data: indicadorRow } = await adminClient
    .from("usuarios")
    .select("nome")
    .eq("id", indicacao.usuario_id)
    .maybeSingle();
  const indicadorNome = indicadorRow?.nome?.trim() || "Indicador";
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

  const propostaTitulo = "Nova proposta";
  const propostaMensagem = `${actor.nome ?? "Admin"} anexou uma nova proposta em ${indicadorNome}.`;

  const { data: admins } = await adminClient.from("usuarios").select("id").eq("role", "admin");
  const adminNotifs = (admins ?? []).map((a) => ({
    destinatario_usuario_id: a.id,
    evento: "proposta_anexada",
    titulo: propostaTitulo,
    mensagem: propostaMensagem,
    entidade_tipo: "indicacoes",
    entidade_id: indicacao.id,
    ator_usuario_id: actor.id,
    ator_nome: actor.nome ?? "Admin",
    metadata: {
      valor_comissao: valorComissao,
      valor_projeto: valorProjeto,
      nome_indicado: indicacao.nome_indicado,
      indicador_nome: indicadorNome,
    },
  }));
  adminNotifs.push({
    destinatario_usuario_id: indicacao.usuario_id,
    evento: "proposta_anexada_indicador",
    titulo: propostaTitulo,
    mensagem: propostaMensagem,
    entidade_tipo: "indicacoes",
    entidade_id: indicacao.id,
    ator_usuario_id: actor.id,
    ator_nome: actor.nome ?? "Admin",
    metadata: {
      valor_comissao: valorComissao,
      valor_projeto: valorProjeto,
      nome_indicado: indicacao.nome_indicado,
      indicador_nome: indicadorNome,
    },
  });
  const { error: notifError } = await adminClient.from("notificacoes").insert(adminNotifs);
  if (notifError) throw new Error("NOTIFICATION_FAILED");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: buildCorsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, 405, { error: "method_not_allowed" });

  try {
    const { supabaseUrl, anonKey, serviceRoleKey } = getSupabaseEdgeEnv();
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
