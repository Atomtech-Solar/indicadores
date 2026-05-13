import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getOverview(adminClient: SupabaseClient) {
  const { data, error } = await adminClient.rpc("get_admin_overview");
  if (error) throw error;
  return data;
}

export async function getAnalyticsOverview(supabaseUrl: string, anonKey: string, authHeader: string, period: string) {
  const allowed = new Set(["7d", "30d", "90d", "12m", "all"]);
  const safePeriod = allowed.has(period) ? period : "30d";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await userClient.rpc("get_admin_analytics", { p_period: safePeriod });
  if (error) throw error;
  return data;
}

export async function getReports(adminClient: SupabaseClient) {
  const { data, error } = await adminClient.rpc("get_admin_reports");
  if (error) throw error;
  return data;
}