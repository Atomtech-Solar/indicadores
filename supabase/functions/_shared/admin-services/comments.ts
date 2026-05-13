import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export function normalizeAnexoFotosPaths(raw: unknown): string[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new Error("Formato de anexos inválido.");
  const paths = raw.map((p) => String(p).trim()).filter(Boolean);
  if (paths.length > 4) throw new Error("No máximo 4 fotos por comentário.");
  for (const p of paths) {
    if (p.length > 400) throw new Error("Caminho de anexo inválido.");
    if (!/^[a-zA-Z0-9/_\-.]+$/.test(p)) throw new Error("Caminho de anexo inválido.");
  }
  return paths;
}

export async function listProjectComments(adminClient: SupabaseClient, indicacaoId: number, authUserId: string) {
  const { data: comments, error } = await adminClient
    .from("indicacao_comentarios_admin")
    .select("id, indicacao_id, comentario, usuario_id, created_at, anexo_fotos_urls")
    .eq("indicacao_id", indicacaoId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const userIds = Array.from(
    new Set((comments ?? []).map((c) => c.usuario_id).filter((id): id is string => Boolean(id))),
  );
  const { data: usuarios } = userIds.length
    ? await adminClient.from("usuarios").select("usuario_id, nome").in("usuario_id", userIds)
    : { data: [] as Array<{ usuario_id: string; nome: string | null }> };

  const userNameByAuthId = new Map<string, string>(
    (usuarios ?? []).map((u) => [u.usuario_id, u.nome?.trim() || "Admin"]),
  );

  const items = (comments ?? []).map((c) => ({
    id: c.id,
    indicacao_id: c.indicacao_id,
    comentario: c.comentario,
    usuario_id: c.usuario_id,
    usuario_nome: userNameByAuthId.get(c.usuario_id) ?? "Admin",
    can_delete: c.usuario_id === authUserId,
    created_at: c.created_at,
    anexo_fotos_urls: Array.isArray(c.anexo_fotos_urls) ? c.anexo_fotos_urls.filter((u: unknown) => typeof u === "string" && u.trim()) : [],
  }));

  return { items };
}

export async function deleteProjectComment(
  adminClient: SupabaseClient,
  input: { commentId: number; authUserId: string },
) {
  const { data: row, error: fetchError } = await adminClient
    .from("indicacao_comentarios_admin")
    .select("id, usuario_id, anexo_fotos_urls")
    .eq("id", input.commentId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!row?.id) throw new Error("NOT_FOUND");
  if (row.usuario_id !== input.authUserId) throw new Error("FORBIDDEN");

  const fotoPaths = Array.isArray(row.anexo_fotos_urls)
    ? (row.anexo_fotos_urls as string[]).filter((p) => typeof p === "string" && p.trim())
    : [];

  const { error: deleteError } = await adminClient
    .from("indicacao_comentarios_admin")
    .delete()
    .eq("id", input.commentId)
    .eq("usuario_id", input.authUserId);
  if (deleteError) throw deleteError;

  if (fotoPaths.length > 0) {
    const { error: storageError } = await adminClient.storage.from("indicacao-comentarios-admin").remove(fotoPaths);
    if (storageError) {
      console.error(
        JSON.stringify({
          type: "admin_delete_project_comment_storage_cleanup_failed",
          commentId: input.commentId,
          message: storageError.message,
          createdAt: new Date().toISOString(),
        }),
      );
    }
  }
}

export async function addProjectComment(
  adminClient: SupabaseClient,
  input: { indicacaoId: number; comment: string; authUserId: string; anexoFotosPaths?: string[] },
) {
  const comment = input.comment.trim();
  if (!comment) throw new Error("Comentário vazio.");
  if (comment.length > 1200) throw new Error("Comentário muito longo. Limite de 1200 caracteres.");

  const anexoPaths = normalizeAnexoFotosPaths(input.anexoFotosPaths);
  const prefix = `${input.indicacaoId}/`;
  for (const p of anexoPaths) {
    if (!p.startsWith(prefix)) throw new Error("Anexo não pertence a esta indicação.");
  }

  const { data: project, error: projectError } = await adminClient
    .from("indicacoes")
    .select("id")
    .eq("id", input.indicacaoId)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project?.id) throw new Error("NOT_FOUND");

  const { error: insertError } = await adminClient.from("indicacao_comentarios_admin").insert({
    indicacao_id: input.indicacaoId,
    usuario_id: input.authUserId,
    comentario: comment,
    anexo_fotos_urls: anexoPaths,
  });
  if (insertError) throw insertError;
}
