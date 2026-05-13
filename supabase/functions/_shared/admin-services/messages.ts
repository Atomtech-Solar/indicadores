import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { ListParams } from "../list-params.ts";
import { normalizeListParams } from "../list-params.ts";

function normalizeMessageInput(input: {
  title: string;
  category: string;
  content: string;
  isFavorite?: boolean;
}) {
  const title = input.title.trim();
  const category = input.category.trim();
  const content = input.content.replace(/\r\n/g, "\n").trim();
  if (title.length < 3 || title.length > 120) {
    throw new Error("Título inválido. Use entre 3 e 120 caracteres.");
  }
  if (category.length < 2 || category.length > 60) {
    throw new Error("Categoria inválida.");
  }
  if (content.length < 5 || content.length > 5000) {
    throw new Error("Conteúdo inválido. Use entre 5 e 5000 caracteres.");
  }
  return {
    title,
    category,
    content,
    is_favorite: Boolean(input.isFavorite),
  };
}

export async function listMessages(
  adminClient: SupabaseClient,
  params: ListParams & {
    category?: string;
    onlyFavorites?: boolean;
    sortBy?: "updated_at" | "usage_count" | "title";
    sortOrder?: "asc" | "desc";
  },
) {
  const { page, limit, search, from, to } = normalizeListParams(params);
  const category = (params.category ?? "").trim();
  const sortBy = params.sortBy ?? "updated_at";
  const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";

  let query = adminClient
    .from("admin_messages")
    .select("id, title, category, content, is_favorite, usage_count, created_at, updated_at, created_by", { count: "exact" })
    .order(sortBy, { ascending: sortOrder === "asc" })
    .order("updated_at", { ascending: false });

  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,category.ilike.%${search}%`);
  }
  if (category && category.toLowerCase() !== "todos") {
    query = query.eq("category", category);
  }
  if (params.onlyFavorites) {
    query = query.eq("is_favorite", true);
  }

  const { data: rows, count, error } = await query.range(from, to);
  if (error) throw error;

  const creatorIds = Array.from(new Set((rows ?? []).map((r) => r.created_by)));
  const { data: creators } = creatorIds.length
    ? await adminClient.from("usuarios").select("id, nome").in("id", creatorIds)
    : { data: [] as Array<{ id: number; nome: string | null }> };
  const creatorNameById = new Map<number, string>((creators ?? []).map((c) => [c.id, c.nome ?? "Admin"]));

  const items = (rows ?? []).map((row) => ({
    ...row,
    created_by_name: creatorNameById.get(row.created_by) ?? "Admin",
  }));

  return { items, total: count ?? 0, page, limit };
}

export async function createMessage(
  adminClient: SupabaseClient,
  actor: { id: number },
  input: { title: string; category: string; content: string; isFavorite?: boolean },
) {
  const normalized = normalizeMessageInput(input);
  const { error } = await adminClient.from("admin_messages").insert({
    ...normalized,
    created_by: actor.id,
  });
  if (error) throw error;
}

export async function updateMessage(
  adminClient: SupabaseClient,
  input: { messageId: number; title: string; category: string; content: string; isFavorite?: boolean },
) {
  const normalized = normalizeMessageInput(input);
  const { error } = await adminClient
    .from("admin_messages")
    .update(normalized)
    .eq("id", input.messageId);
  if (error) throw error;
}

export async function deleteMessage(adminClient: SupabaseClient, messageId: number) {
  const { error } = await adminClient.from("admin_messages").delete().eq("id", messageId);
  if (error) throw error;
}

export async function toggleFavorite(adminClient: SupabaseClient, messageId: number, isFavorite: boolean) {
  const { error } = await adminClient
    .from("admin_messages")
    .update({ is_favorite: isFavorite })
    .eq("id", messageId);
  if (error) throw error;
}

export async function incrementMessageUsage(adminClient: SupabaseClient, messageId: number) {
  const { data: current, error: fetchError } = await adminClient
    .from("admin_messages")
    .select("id, usage_count")
    .eq("id", messageId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!current?.id) throw new Error("NOT_FOUND");
  const { error } = await adminClient
    .from("admin_messages")
    .update({ usage_count: Number(current.usage_count ?? 0) + 1 })
    .eq("id", messageId);
  if (error) throw error;
}

export async function listMessageRecipients(adminClient: SupabaseClient) {
  const { data: indicadores, error: indicatorsError } = await adminClient
    .from("usuarios")
    .select("id, nome, whatsapp")
    .eq("role", "indicador")
    .order("nome", { ascending: true });

  if (indicatorsError) throw indicatorsError;

  const indicatorIds = (indicadores ?? []).map((item) => item.id);
  const { data: indicados, error: indicatedsError } = indicatorIds.length
    ? await adminClient
      .from("indicacoes")
      .select("id, usuario_id, nome_indicado, whatsapp, created_at")
      .in("usuario_id", indicatorIds)
      .order("created_at", { ascending: false })
    : {
      data: [] as Array<{
        id: number;
        usuario_id: number;
        nome_indicado: string;
        whatsapp: string | null;
        created_at: string;
      }>,
      error: null,
    };

  if (indicatedsError) throw indicatedsError;

  const indicadosByIndicatorId = new Map<
    number,
    Array<{ id: number; nome: string; whatsapp: string | null }>
  >();

  for (const indicado of indicados ?? []) {
    const current = indicadosByIndicatorId.get(indicado.usuario_id) ?? [];
    current.push({
      id: indicado.id,
      nome: indicado.nome_indicado,
      whatsapp: indicado.whatsapp ?? null,
    });
    indicadosByIndicatorId.set(indicado.usuario_id, current);
  }

  return {
    indicadores: (indicadores ?? []).map((indicador) => ({
      id: indicador.id,
      nome: indicador.nome ?? "Sem nome",
      whatsapp: indicador.whatsapp ?? null,
      indicados: indicadosByIndicatorId.get(indicador.id) ?? [],
    })),
  };
}
