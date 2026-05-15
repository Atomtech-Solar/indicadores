import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { getSupabaseEdgeEnv } from "../_shared/env.ts";
import { getRequesterUserId } from "../_shared/auth-admin.ts";
import { jsonResponse } from "../_shared/http.ts";
import { notifyAdminPushEvent } from "../_shared/push-fcm.ts";

/**
 * Dispara push "Nova indicação" para administradores após criação no cliente (indicador ou admin).
 * Autenticação obrigatória; o criador deve ser dono da indicação (indicador) ou admin.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: buildCorsHeaders(req) });
  }
  if (req.method !== "POST") {
    return jsonResponse(req, 405, { error: "method_not_allowed" });
  }

  try {
    const { supabaseUrl, anonKey, serviceRoleKey } = getSupabaseEdgeEnv();
    const authHeader = req.headers.get("Authorization") ?? "";
    const anonClient = createClient(supabaseUrl, anonKey);
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const authUserId = await getRequesterUserId(anonClient, authHeader);
    if (!authUserId) {
      return jsonResponse(req, 401, { error: "unauthorized" });
    }

    const payload = (await req.json()) as { indicacaoId?: unknown };
    const indicacaoId = Number(payload.indicacaoId);
    if (!Number.isInteger(indicacaoId) || indicacaoId <= 0) {
      return jsonResponse(req, 400, { error: "indicacao_id_invalido" });
    }

    const { data: actorRow, error: actorErr } = await adminClient
      .from("usuarios")
      .select("id, role")
      .eq("usuario_id", authUserId)
      .maybeSingle();
    if (actorErr || !actorRow?.id) {
      return jsonResponse(req, 403, { error: "forbidden" });
    }

    const { data: ind, error: indErr } = await adminClient
      .from("indicacoes")
      .select("id, usuario_id, nome_indicado")
      .eq("id", indicacaoId)
      .maybeSingle();
    if (indErr || !ind) {
      return jsonResponse(req, 404, { error: "indicacao_nao_encontrada" });
    }

    const isAdmin = actorRow.role === "admin";
    if (!isAdmin && ind.usuario_id !== actorRow.id) {
      return jsonResponse(req, 403, { error: "forbidden" });
    }

    await notifyAdminPushEvent(adminClient, "nova_indicacao", {
      nomeIndicado: ind.nome_indicado,
      indicacaoId: ind.id,
    });

    return jsonResponse(req, 200, { ok: true });
  } catch (e) {
    console.error(JSON.stringify({ type: "send_push_unhandled", message: String(e) }));
    return jsonResponse(req, 500, { error: "internal_error" });
  }
});
