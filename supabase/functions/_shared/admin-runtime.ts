import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "./cors.ts";
import { getSupabaseEdgeEnv } from "./env.ts";
import { ensureAdmin, getRequesterUserId, getUserByAuthId, listAdminIds } from "./auth-admin.ts";
import { jsonResponse } from "./http.ts";
import { adminOpsErrorResponse } from "./admin-error-response.ts";

export type AdminRequestContext = {
  req: Request;
  adminClient: SupabaseClient;
  supabaseUrl: string;
  anonKey: string;
  authHeader: string;
  authUserId: string;
  actor: { id: number; nome: string | null };
  adminIds: number[];
};

export async function runAdminEdgePost(
  req: Request,
  router: (ctx: AdminRequestContext, payload: unknown) => Promise<Response>,
): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: buildCorsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, 405, { error: "method_not_allowed" });

  try {
    const { supabaseUrl, anonKey, serviceRoleKey } = getSupabaseEdgeEnv();
    const authHeader = req.headers.get("Authorization") ?? "";

    const anonClient = createClient(supabaseUrl, anonKey);
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const authUserId = await getRequesterUserId(anonClient, authHeader);
    if (!authUserId) return jsonResponse(req, 401, { error: "unauthorized" });
    await ensureAdmin(adminClient, authUserId);
    const actor = await getUserByAuthId(adminClient, authUserId);
    const adminIds = await listAdminIds(adminClient);

    const payload = await req.json();

    return await router(
      {
        req,
        adminClient,
        supabaseUrl,
        anonKey,
        authHeader,
        authUserId,
        actor,
        adminIds,
      },
      payload,
    );
  } catch (err) {
    return adminOpsErrorResponse(req, err);
  }
}
