import { createNotifications } from "../_shared/notifications.ts";
import { jsonResponse } from "../_shared/http.ts";
import { parsePositiveInt } from "../_shared/admin-parse.ts";
import type { AdminRequestContext } from "../_shared/admin-runtime.ts";
import type { ListParams } from "../_shared/list-params.ts";
import {
  createMessage,
  deleteMessage,
  incrementMessageUsage,
  listMessageRecipients,
  listMessages,
  toggleFavorite,
  updateMessage,
} from "../_shared/admin-services/messages.ts";

export async function routeAdminMessages(ctx: AdminRequestContext, payload: unknown): Promise<Response> {
  const { req, adminClient, actor } = ctx;
  const p = payload as { action?: string };

  switch (p.action) {
    case "list_message_recipients":
      return jsonResponse(req, 200, { data: await listMessageRecipients(adminClient) });
    case "list_messages":
      return jsonResponse(req, 200, {
        data: await listMessages(
          adminClient,
          p as ListParams & {
            category?: string;
            onlyFavorites?: boolean;
            sortBy?: "updated_at" | "usage_count" | "title";
            sortOrder?: "asc" | "desc";
          },
        ),
      });
    case "create_message": {
      const pl = p as { title: string; category: string; content: string; isFavorite?: boolean };
      await createMessage(adminClient, actor, pl);
      return jsonResponse(req, 200, { message: "Mensagem criada com sucesso." });
    }
    case "update_message": {
      const messageId = parsePositiveInt((p as { messageId?: unknown }).messageId);
      if (messageId == null) return jsonResponse(req, 400, { error: "ID da mensagem inválido." });
      await updateMessage(adminClient, {
        messageId,
        title: (p as { title: string }).title,
        category: (p as { category: string }).category,
        content: (p as { content: string }).content,
        isFavorite: (p as { isFavorite?: boolean }).isFavorite,
      });
      return jsonResponse(req, 200, { message: "Mensagem atualizada com sucesso." });
    }
    case "delete_message": {
      const messageId = parsePositiveInt((p as { messageId?: unknown }).messageId);
      if (messageId == null) return jsonResponse(req, 400, { error: "ID da mensagem inválido." });
      await deleteMessage(adminClient, messageId);
      return jsonResponse(req, 200, { message: "Mensagem excluída com sucesso." });
    }
    case "toggle_favorite": {
      const messageId = parsePositiveInt((p as { messageId?: unknown }).messageId);
      if (messageId == null) return jsonResponse(req, 400, { error: "ID da mensagem inválido." });
      await toggleFavorite(adminClient, messageId, Boolean((p as { isFavorite: boolean }).isFavorite));
      return jsonResponse(req, 200, { message: "Favorito atualizado com sucesso." });
    }
    case "increment_usage": {
      const messageId = parsePositiveInt((p as { messageId?: unknown }).messageId);
      if (messageId == null) return jsonResponse(req, 400, { error: "ID da mensagem inválido." });
      await incrementMessageUsage(adminClient, messageId);
      return jsonResponse(req, 200, { message: "Uso incrementado." });
    }
    default:
      return jsonResponse(req, 400, {
        error: "Ação inválida para admin-messages. Faça deploy das funções admin-* conforme o repositório.",
      });
  }
}
