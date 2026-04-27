import { supabase } from "@/lib/supabase/client";

type AdminAction =
  | { action: "overview" }
  | { action: "list_users" }
  | { action: "set_user_role"; userId: string; role: "indicador" | "admin" }
  | { action: "disable_user"; userId: string }
  | { action: "list_indicacoes" }
  | { action: "update_indicacao_status"; indicacaoId: number; status: "enviado" | "analise" | "negociacao" | "fechado" | "perdido" }
  | { action: "list_comissoes" }
  | { action: "update_comissao_status"; comissaoId: number; status: "pendente" | "disponivel" | "pago" | "cancelado" }
  | { action: "reports" };

export async function callAdminOps<T>(payload: AdminAction): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-ops", { body: payload });
  if (error) throw new Error("Não foi possível concluir a operação administrativa.");
  if (!data) throw new Error("Resposta administrativa inválida.");
  if (data.error) throw new Error("Não foi possível concluir a operação administrativa.");
  return data.data as T;
}

export async function callAdminOpsMutation(payload: Exclude<AdminAction, { action: "overview" | "list_users" | "list_indicacoes" | "list_comissoes" | "reports" }>): Promise<void> {
  const { data, error } = await supabase.functions.invoke("admin-ops", { body: payload });
  if (error || data?.error) throw new Error("Não foi possível concluir a operação administrativa.");
}

export async function setCommission(input: { indicacaoId: number; valor: number }): Promise<void> {
  const { data, error } = await supabase.functions.invoke("set-commission", { body: input });
  if (error || data?.error) throw new Error("Não foi possível definir a comissão.");
}
