import { createNotifications } from "../_shared/notifications.ts";
import { notifyAdminPushEvent } from "../_shared/push-fcm.ts";
import { jsonResponse } from "../_shared/http.ts";
import { parsePositiveInt } from "../_shared/admin-parse.ts";
import type { AdminRequestContext } from "../_shared/admin-runtime.ts";
import type { ListParams } from "../_shared/list-params.ts";
import { deleteIndicacao, listFotos, listIndicacoes } from "../_shared/admin-services/indicacoes.ts";
import {
  addProjectComment,
  deleteProjectComment,
  listProjectComments,
  normalizeAnexoDocumentosPaths,
  normalizeAnexoFotosPaths,
} from "../_shared/admin-services/comments.ts";

export async function routeAdminLeads(ctx: AdminRequestContext, payload: unknown): Promise<Response> {
  const { req, adminClient, authUserId, actor, adminIds } = ctx;
  const p = payload as { action?: string };

  switch (p.action) {
    case "list_indicacoes":
      return jsonResponse(req, 200, {
        data: await listIndicacoes(
          adminClient,
          p as ListParams & { onlyCommissionEligible?: boolean },
        ),
      });
    case "list_fotos": {
      const { action: _a, ...listParams } = payload as { action: string } & ListParams;
      return jsonResponse(req, 200, { data: await listFotos(adminClient, listParams) });
    }
    case "update_indicacao_status": {
      const pl = p as { indicacaoId: number; status: "enviado" | "analise" | "negociacao" | "fechado" | "perdido" };
      const { data: indicacaoBefore } = await adminClient
        .from("indicacoes")
        .select("id, nome_indicado, status")
        .eq("id", pl.indicacaoId)
        .maybeSingle();
      const { error } = await adminClient.from("indicacoes").update({ status: pl.status }).eq("id", pl.indicacaoId);
      if (error) throw error;
      await createNotifications(
        adminClient,
        adminIds.map((destId) => ({
          destinatario_usuario_id: destId,
          evento: "status_indicacao_alterado_admin",
          titulo: "Status de projeto alterado",
          mensagem: `${actor.nome ?? "Admin"} alterou ${indicacaoBefore?.nome_indicado ?? "indicação"} de ${indicacaoBefore?.status ?? "—"} para ${pl.status}.`,
          entidade_tipo: "indicacoes",
          entidade_id: pl.indicacaoId,
          ator_usuario_id: actor.id,
          ator_nome: actor.nome ?? "Admin",
          metadata: {
            status_anterior: indicacaoBefore?.status ?? null,
            status_novo: pl.status,
          },
        })),
      );
      const pushStatuses = new Set(["negociacao", "fechado", "perdido"]);
      if (pushStatuses.has(pl.status)) {
        void notifyAdminPushEvent(adminClient, "status_indicacao", {
          nomeIndicado: indicacaoBefore?.nome_indicado ?? "Indicação",
          status: pl.status,
          indicacaoId: pl.indicacaoId,
        });
      }
      return jsonResponse(req, 200, { message: "Status da indicação atualizado." });
    }
    case "list_project_comments": {
      const indicacaoId = parsePositiveInt((p as { indicacaoId?: unknown }).indicacaoId);
      if (indicacaoId == null) return jsonResponse(req, 400, { error: "ID da indicação inválido." });
      return jsonResponse(req, 200, { data: await listProjectComments(adminClient, indicacaoId, authUserId) });
    }
    case "add_project_comment": {
      const indicacaoId = parsePositiveInt((p as { indicacaoId?: unknown }).indicacaoId);
      if (indicacaoId == null) return jsonResponse(req, 400, { error: "ID da indicação inválido." });
      let anexoFotosPaths: string[] | undefined;
      try {
        anexoFotosPaths = normalizeAnexoFotosPaths((p as { anexoFotosPaths?: unknown }).anexoFotosPaths);
      } catch (err) {
        return jsonResponse(req, 400, { error: err instanceof Error ? err.message : "Anexos inválidos." });
      }
      let anexoDocumentosPaths: string[] | undefined;
      try {
        anexoDocumentosPaths = normalizeAnexoDocumentosPaths((p as { anexoDocumentosPaths?: unknown }).anexoDocumentosPaths);
      } catch (err) {
        return jsonResponse(req, 400, { error: err instanceof Error ? err.message : "Documentos inválidos." });
      }
      await addProjectComment(adminClient, {
        indicacaoId,
        comment: String((p as { comment?: unknown }).comment ?? ""),
        authUserId,
        anexoFotosPaths: anexoFotosPaths.length ? anexoFotosPaths : undefined,
        anexoDocumentosPaths: anexoDocumentosPaths.length ? anexoDocumentosPaths : undefined,
      });
      const { data: indicacao } = await adminClient
        .from("indicacoes")
        .select("id, nome_indicado")
        .eq("id", indicacaoId)
        .maybeSingle();
      await createNotifications(
        adminClient,
        adminIds.map((destId) => ({
          destinatario_usuario_id: destId,
          evento: "comentario_projeto_adicionado",
          titulo: "Novo comentário em projeto",
          mensagem: `${actor.nome ?? "Admin"} comentou no projeto ${indicacao?.nome_indicado ?? `#${indicacaoId}`}.`,
          entidade_tipo: "indicacoes",
          entidade_id: indicacaoId,
          ator_usuario_id: actor.id,
          ator_nome: actor.nome ?? "Admin",
        })),
      );
      return jsonResponse(req, 200, { message: "Comentário adicionado com sucesso." });
    }
    case "delete_project_comment": {
      const commentId = parsePositiveInt((p as { commentId?: unknown }).commentId);
      if (commentId == null) return jsonResponse(req, 400, { error: "ID do comentário inválido." });
      await deleteProjectComment(adminClient, { commentId, authUserId });
      await createNotifications(
        adminClient,
        adminIds.map((destId) => ({
          destinatario_usuario_id: destId,
          evento: "comentario_projeto_removido",
          titulo: "Comentário removido",
          mensagem: `${actor.nome ?? "Admin"} removeu um comentário de projeto.`,
          entidade_tipo: "indicacao_comentarios_admin",
          entidade_id: commentId,
          ator_usuario_id: actor.id,
          ator_nome: actor.nome ?? "Admin",
        })),
      );
      return jsonResponse(req, 200, { message: "Comentário removido com sucesso." });
    }
    case "delete_indicacao": {
      const indicacaoId = parsePositiveInt((p as { indicacaoId?: unknown }).indicacaoId);
      if (indicacaoId == null) return jsonResponse(req, 400, { error: "ID da indicação inválido." });
      const { data: project } = await adminClient
        .from("indicacoes")
        .select("id, nome_indicado")
        .eq("id", indicacaoId)
        .maybeSingle();
      await deleteIndicacao(adminClient, indicacaoId);
      await createNotifications(
        adminClient,
        adminIds.map((destId) => ({
          destinatario_usuario_id: destId,
          evento: "projeto_excluido",
          titulo: "Projeto excluído",
          mensagem: `${actor.nome ?? "Admin"} excluiu o projeto ${project?.nome_indicado ?? `#${indicacaoId}`}.`,
          entidade_tipo: "indicacoes",
          entidade_id: indicacaoId,
          ator_usuario_id: actor.id,
          ator_nome: actor.nome ?? "Admin",
        })),
      );
      return jsonResponse(req, 200, { message: "Indicação excluída com sucesso." });
    }
    default:
      return jsonResponse(req, 400, {
        error: "Ação inválida para admin-leads. Faça deploy das funções admin-* conforme o repositório.",
      });
  }
}
