import { jsonResponse } from "../_shared/http.ts";
import type { AdminRequestContext } from "../_shared/admin-runtime.ts";
import { getAnalyticsOverview, getOverview, getReports } from "../_shared/admin-services/dashboard.ts";

export async function routeAdminInsights(ctx: AdminRequestContext, payload: unknown): Promise<Response> {
  const { req, adminClient, supabaseUrl, anonKey, authHeader } = ctx;
  const p = payload as { action?: string };

  switch (p.action) {
    case "overview":
      return jsonResponse(req, 200, { data: await getOverview(adminClient) });
    case "analytics_overview":
      return jsonResponse(req, 200, {
        data: await getAnalyticsOverview(supabaseUrl, anonKey, authHeader, (p as { period: string }).period),
      });
    case "reports":
      return jsonResponse(req, 200, { data: await getReports(adminClient) });
    default:
      return jsonResponse(req, 400, {
        error: "Ação inválida para admin-insights. Faça deploy das funções admin-* conforme o repositório.",
      });
  }
}
