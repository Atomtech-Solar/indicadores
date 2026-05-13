import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getRequesterUserId(anonClient: SupabaseClient, authHeader: string): Promise<string | null> {
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;
  const { data, error } = await anonClient.auth.getUser(token);
  if (error || !data.user?.id) return null;
  return data.user.id;
}

export async function ensureAdmin(adminClient: SupabaseClient, authUserId: string): Promise<void> {
  const { data, error } = await adminClient
    .from("usuarios")
    .select("role")
    .eq("usuario_id", authUserId)
    .maybeSingle();

  if (error || data?.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
}

export async function getUserByAuthId(adminClient: SupabaseClient, authUserId: string) {
  const { data, error } = await adminClient
    .from("usuarios")
    .select("id, nome")
    .eq("usuario_id", authUserId)
    .maybeSingle();
  if (error || !data?.id) throw new Error("FORBIDDEN");
  return data;
}

export async function listAdminIds(adminClient: SupabaseClient): Promise<number[]> {
  const { data, error } = await adminClient.from("usuarios").select("id").eq("role", "admin");
  if (error) throw error;
  return (data ?? []).map((row) => row.id);
}
