import { createNotifications } from "../_shared/notifications.ts";
import { notifyAdminPushEvent } from "../_shared/push-fcm.ts";
import { jsonResponse } from "../_shared/http.ts";
import type { AdminRequestContext } from "../_shared/admin-runtime.ts";
import type { ListParams } from "../_shared/list-params.ts";
import { listComissoes } from "../_shared/admin-services/comissoes.ts";

export async function routeAdminFinance(ctx: AdminRequestContext, payload: unknown): Promise<Response> {
  const { req, adminClient, actor, adminIds } = ctx;
  const p = payload as { action?: string };

  switch (p.action) {
    case "list_comissoes": {
      const { action: _a, ...listParams } = payload as { action: string } & ListParams;
      return jsonResponse(req, 200, { data: await listComissoes(adminClient, listParams) });
    }
    case "update_comissao_status": {
      const pl = p as { comissaoId: number; status: "pendente" | "disponivel" | "pago" | "cancelado" };
      const patch: Record<string, unknown> = { status: pl.status };
      if (pl.status === "pago") {
        patch.data_pagamento = new Date().toISOString();
      } else {
        patch.data_pagamento = null;
      }
      const { data: commission } = await adminClient
        .from("comissoes")
        .select("id, indicacao_id, status, valor, indicacoes(nome_indicado)")
        .eq("id", pl.comissaoId)
        .maybeSingle();
      const { error } = await adminClient.from("comissoes").update(patch).eq("id", pl.comissaoId);
      if (error) throw error;
      await createNotifications(
        adminClient,
        adminIds.map((destId) => ({
          destinatario_usuario_id: destId,
          evento: "status_comissao_alterado",
          titulo: "Status de comissão alterado",
          mensagem: `${actor.nome ?? "Admin"} alterou comissão #${pl.comissaoId} de ${commission?.status ?? "—"} para ${pl.status}.`,
          entidade_tipo: "comissoes",
          entidade_id: pl.comissaoId,
          ator_usuario_id: actor.id,
          ator_nome: actor.nome ?? "Admin",
          metadata: {
            status_anterior: commission?.status ?? null,
            status_novo: pl.status,
            indicacao_id: commission?.indicacao_id ?? null,
          },
        })),
      );
      if (pl.status === "pago") {
        const indRow = commission as {
          valor?: number | null;
          indicacoes?: { nome_indicado?: string | null } | null;
        } | null;
        const nome = indRow?.indicacoes?.nome_indicado?.trim() || "Indicado";
        const valorNum = Number(indRow?.valor ?? 0);
        const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorNum);
        void notifyAdminPushEvent(adminClient, "comissao_paga", {
          nomeIndicado: nome,
          valorBrl: brl,
          comissaoId: pl.comissaoId,
          indicacaoId: commission?.indicacao_id ?? undefined,
        });
      }
      return jsonResponse(req, 200, { message: "Status da comissão atualizado." });
    }
    default:
      return jsonResponse(req, 400, {
        error: "Ação inválida para admin-finance. Faça deploy das funções admin-* conforme o repositório.",
      });
  }
}
