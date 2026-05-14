import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { ListParams } from "../list-params.ts";
import { normalizeListParams } from "../list-params.ts";
import { errorMessageFromUnknown } from "../errors.ts";

const MAX_INDICADOR_IDS_FOR_FILTER = 500;

async function usuarioIdsByIndicadorNomeIlike(adminClient: SupabaseClient, search: string): Promise<number[]> {
  const { data } = await adminClient.from("usuarios").select("id").ilike("nome", `%${search}%`).limit(MAX_INDICADOR_IDS_FOR_FILTER);
  return (data ?? []).map((r) => r.id as number);
}

export async function listIndicacoes(adminClient: SupabaseClient, params: ListParams & { onlyCommissionEligible?: boolean }) {
  const { page, limit, search, from, to } = normalizeListParams(params);
  let query = adminClient
    .from("indicacoes")
    .select("id, usuario_id, nome_indicado, tipo, status, valor_potencial, valor_projeto, created_at, updated_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params.onlyCommissionEligible) {
    query = query.in("status", ["negociacao", "fechado"]);
  }
  if (search) {
    const indicadorIds = await usuarioIdsByIndicadorNomeIlike(adminClient, search);
    const orParts = [`nome_indicado.ilike.%${search}%`, `tipo.ilike.%${search}%`, `status.ilike.%${search}%`];
    if (indicadorIds.length > 0) {
      orParts.push(`usuario_id.in.(${indicadorIds.join(",")})`);
    }
    query = query.or(orParts.join(","));
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

export async function listFotos(adminClient: SupabaseClient, params: ListParams) {
  const { page, limit, search, from, to } = normalizeListParams(params);
  let query = adminClient
    .from("indicacoes")
    .select(
      "id, usuario_id, nome_indicado, whatsapp, tipo_projeto, observacoes, status, valor_potencial, valor_projeto, conta_energia_url, foto_padrao_url, foto_extra_1_url, foto_extra_2_url, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (search) {
    const indicadorIds = await usuarioIdsByIndicadorNomeIlike(adminClient, search);
    const orParts = [
      `nome_indicado.ilike.%${search}%`,
      `whatsapp.ilike.%${search}%`,
      `tipo_projeto.ilike.%${search}%`,
      `observacoes.ilike.%${search}%`,
      `status.ilike.%${search}%`,
    ];
    if (indicadorIds.length > 0) {
      orParts.push(`usuario_id.in.(${indicadorIds.join(",")})`);
    }
    query = query.or(orParts.join(","));
  }

  const { data: indicacoes, count } = await query.range(from, to);
  const userIds = Array.from(new Set((indicacoes ?? []).map((i) => i.usuario_id)));
  const { data: usuarios } = userIds.length
    ? await adminClient.from("usuarios").select("id, nome").in("id", userIds)
    : { data: [] as Array<{ id: number; nome: string | null }> };

  const userNameById = new Map<number, string>((usuarios ?? []).map((u) => [u.id, u.nome ?? "Sem nome"]));
  const indicacaoIds = (indicacoes ?? []).map((i) => i.id);
  const { data: comissoes } = indicacaoIds.length
    ? await adminClient
      .from("comissoes")
      .select("id, indicacao_id, valor, status")
      .in("indicacao_id", indicacaoIds)
    : { data: [] as Array<{ id: number; indicacao_id: number; valor: number; status: "pendente" | "disponivel" | "pago" | "cancelado" }> };
  const { data: commentCounts } = indicacaoIds.length
    ? await adminClient
      .from("indicacao_comentarios_admin")
      .select("indicacao_id")
      .in("indicacao_id", indicacaoIds)
    : { data: [] as Array<{ indicacao_id: number }> };

  const commentCountByIndicacaoId = new Map<number, number>();
  for (const row of commentCounts ?? []) {
    const prev = commentCountByIndicacaoId.get(row.indicacao_id) ?? 0;
    commentCountByIndicacaoId.set(row.indicacao_id, prev + 1);
  }
  const comissaoByIndicacaoId = new Map<number, { id: number; valor: number; status: "pendente" | "disponivel" | "pago" | "cancelado" }>();
  for (const comissao of comissoes ?? []) {
    if (!comissaoByIndicacaoId.has(comissao.indicacao_id)) {
      comissaoByIndicacaoId.set(comissao.indicacao_id, {
        id: comissao.id,
        valor: Number(comissao.valor ?? 0),
        status: comissao.status,
      });
    }
  }

  const allPaths = Array.from(
    new Set(
      (indicacoes ?? [])
        .flatMap((i) => [i.conta_energia_url, i.foto_padrao_url, i.foto_extra_1_url, i.foto_extra_2_url])
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
    status: i.status,
    valor_potencial: i.valor_potencial ?? null,
    valor_projeto: i.valor_projeto ?? null,
    comissao_id: comissaoByIndicacaoId.get(i.id)?.id ?? null,
    comissao_valor: comissaoByIndicacaoId.get(i.id)?.valor ?? null,
    comissao_status: comissaoByIndicacaoId.get(i.id)?.status ?? null,
    conta_energia_url: i.conta_energia_url ? (signedUrlByPath.get(i.conta_energia_url) ?? null) : null,
    foto_padrao_url: i.foto_padrao_url ? (signedUrlByPath.get(i.foto_padrao_url) ?? null) : null,
    foto_extra_1_url: i.foto_extra_1_url ? (signedUrlByPath.get(i.foto_extra_1_url) ?? null) : null,
    foto_extra_2_url: i.foto_extra_2_url ? (signedUrlByPath.get(i.foto_extra_2_url) ?? null) : null,
    comments_count: commentCountByIndicacaoId.get(i.id) ?? 0,
    created_at: i.created_at,
  }));

  return { items: withUrls, total: count ?? 0, page, limit };
}

export async function deleteIndicacao(adminClient: SupabaseClient, indicacaoId: number): Promise<void> {
  const { data: row, error: fetchError } = await adminClient
    .from("indicacoes")
    .select("id, conta_energia_url, foto_padrao_url, foto_extra_1_url, foto_extra_2_url")
    .eq("id", indicacaoId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(errorMessageFromUnknown(fetchError));
  }
  if (!row?.id) throw new Error("NOT_FOUND");

  const paths = [
    row.conta_energia_url,
    row.foto_padrao_url,
    row.foto_extra_1_url,
    row.foto_extra_2_url,
  ].filter((p): p is string => Boolean(p?.trim()));

  const { data: commentRows } = await adminClient
    .from("indicacao_comentarios_admin")
    .select("anexo_fotos_urls, anexo_documentos_urls")
    .eq("indicacao_id", indicacaoId);
  const commentFotoPaths = (commentRows ?? []).flatMap((r) => {
    const fotos = Array.isArray(r.anexo_fotos_urls)
      ? (r.anexo_fotos_urls as string[]).filter((p) => typeof p === "string" && p.trim())
      : [];
    const docs = Array.isArray((r as { anexo_documentos_urls?: unknown }).anexo_documentos_urls)
      ? ((r as { anexo_documentos_urls: string[] }).anexo_documentos_urls).filter((p) => typeof p === "string" && p.trim())
      : [];
    return [...fotos, ...docs];
  });

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

  if (commentFotoPaths.length > 0) {
    const { error: commentStorageError } = await adminClient.storage.from("indicacao-comentarios-admin").remove(commentFotoPaths);
    if (commentStorageError) {
      console.error(
        JSON.stringify({
          type: "admin_delete_indicacao_comment_photos_cleanup_failed",
          indicacaoId,
          message: commentStorageError.message,
          createdAt: new Date().toISOString(),
        }),
      );
    }
  }
}
