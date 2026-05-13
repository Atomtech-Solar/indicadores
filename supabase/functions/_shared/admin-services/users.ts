import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { ListParams } from "../list-params.ts";
import { normalizeListParams, parseBrazilianDateSearch } from "../list-params.ts";

export async function listUsers(adminClient: SupabaseClient, params: ListParams) {
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
