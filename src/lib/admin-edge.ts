import { supabase } from "@/lib/supabase/client";

async function messageFromFunctionsInvokeError(error: { message?: string; context?: unknown }): Promise<string> {
  const ctx = error.context;
  if (ctx instanceof Response) {
    try {
      const json = (await ctx.json()) as { error?: string };
      if (json?.error && typeof json.error === "string" && json.error.trim()) {
        return json.error;
      }
    } catch {
      /* ignore */
    }
  }
  return error.message?.trim() || "Erro ao chamar função administrativa.";
}

export type AdminAction =
  | { action: "overview" }
  | { action: "list_users"; page?: number; limit?: number; search?: string }
  | { action: "set_user_role"; userId: string; role: "indicador" | "admin" }
  | { action: "disable_user"; userId: string }
  | { action: "reactivate_user"; userId: string }
  | { action: "list_indicacoes"; page?: number; limit?: number; search?: string; onlyCommissionEligible?: boolean }
  | { action: "update_indicacao_status"; indicacaoId: number; status: "enviado" | "analise" | "negociacao" | "fechado" | "perdido" }
  | { action: "list_comissoes"; page?: number; limit?: number; search?: string }
  | { action: "list_fotos"; page?: number; limit?: number; search?: string }
  | { action: "list_message_recipients" }
  | {
      action: "list_messages";
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      onlyFavorites?: boolean;
      sortBy?: "updated_at" | "usage_count" | "title";
      sortOrder?: "asc" | "desc";
    }
  | { action: "create_message"; title: string; category: string; content: string; isFavorite?: boolean }
  | { action: "update_message"; messageId: number; title: string; category: string; content: string; isFavorite?: boolean }
  | { action: "delete_message"; messageId: number }
  | { action: "toggle_favorite"; messageId: number; isFavorite: boolean }
  | { action: "increment_usage"; messageId: number }
  | { action: "list_project_comments"; indicacaoId: number }
  | { action: "add_project_comment"; indicacaoId: number; comment: string; anexoFotosPaths?: string[] }
  | { action: "delete_project_comment"; commentId: number }
  | { action: "delete_indicacao"; indicacaoId: number }
  | { action: "update_comissao_status"; comissaoId: number; status: "pendente" | "disponivel" | "pago" | "cancelado" }
  | { action: "reports" }
  | { action: "analytics_overview"; period: "7d" | "30d" | "90d" | "12m" | "all" };

function adminEdgeFunctionName(payload: AdminAction): string {
  switch (payload.action) {
    case "overview":
    case "analytics_overview":
    case "reports":
      return "admin-insights";
    case "list_users":
    case "set_user_role":
    case "disable_user":
    case "reactivate_user":
      return "admin-users";
    case "list_indicacoes":
    case "list_fotos":
    case "update_indicacao_status":
    case "delete_indicacao":
    case "list_project_comments":
    case "add_project_comment":
    case "delete_project_comment":
      return "admin-leads";
    case "list_comissoes":
    case "update_comissao_status":
      return "admin-finance";
    case "list_message_recipients":
    case "list_messages":
    case "create_message":
    case "update_message":
    case "delete_message":
    case "toggle_favorite":
    case "increment_usage":
      return "admin-messages";
  }
  const _exhaustive: never = payload;
  return _exhaustive;
}

export async function callAdminOps<T>(payload: AdminAction): Promise<T> {
  const fn = adminEdgeFunctionName(payload);
  const { data, error } = await supabase.functions.invoke(fn, { body: payload });
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(typeof data.error === "string" ? data.error : "Não foi possível concluir a operação administrativa.");
  }
  if (error) {
    throw new Error(await messageFromFunctionsInvokeError(error));
  }
  if (!data) throw new Error("Resposta administrativa inválida.");
  return data.data as T;
}

export async function callAdminOpsMutation(
  payload: Exclude<
    AdminAction,
    | { action: "overview" }
    | { action: "list_users" }
    | { action: "list_indicacoes" }
    | { action: "list_comissoes" }
    | { action: "list_fotos" }
    | { action: "list_message_recipients" }
    | { action: "list_messages" }
    | { action: "list_project_comments" }
    | { action: "reports" }
    | { action: "analytics_overview" }
  >,
): Promise<void> {
  const fn = adminEdgeFunctionName(payload);
  const { data, error } = await supabase.functions.invoke(fn, { body: payload });

  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(typeof data.error === "string" ? data.error : "Não foi possível concluir a operação administrativa.");
  }
  if (error) {
    throw new Error(await messageFromFunctionsInvokeError(error));
  }
}

export async function setCommission(input: {
  indicacaoId: number;
  valorComissao: number;
  valorProjeto: number;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke("set-commission", { body: input });
  if (error || data?.error) throw new Error("Não foi possível definir a comissão.");
}
