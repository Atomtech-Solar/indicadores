import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { ListParams } from "../list-params.ts";
import { normalizeListParams } from "../list-params.ts";

export async function listComissoes(adminClient: SupabaseClient, params: ListParams) {
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
