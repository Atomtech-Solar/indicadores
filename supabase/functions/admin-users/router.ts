import { createNotifications } from "../_shared/notifications.ts";
import { jsonResponse } from "../_shared/http.ts";
import type { AdminRequestContext } from "../_shared/admin-runtime.ts";
import type { ListParams } from "../_shared/list-params.ts";
import { listUsers } from "../_shared/admin-services/users.ts";

export async function routeAdminUsers(ctx: AdminRequestContext, payload: unknown): Promise<Response> {
  const { req, adminClient, actor, adminIds } = ctx;
  const p = payload as { action?: string };

  switch (p.action) {
    case "list_users": {
      const { action: _a, ...listParams } = payload as { action: string } & ListParams;
      return jsonResponse(req, 200, { data: await listUsers(adminClient, listParams) });
    }
    case "set_user_role": {
      const pl = p as { userId: string; role: "indicador" | "admin" };
      const { data: targetUser } = await adminClient
        .from("usuarios")
        .select("id, nome")
        .eq("usuario_id", pl.userId)
        .maybeSingle();
      const { error } = await adminClient.from("usuarios").update({ role: pl.role }).eq("usuario_id", pl.userId);
      if (error) throw error;
      await createNotifications(
        adminClient,
        adminIds.map((destId) => ({
          destinatario_usuario_id: destId,
          evento: "admin_role_alterado",
          titulo: "Permissão de usuário alterada",
          mensagem: `${actor.nome ?? "Admin"} alterou ${targetUser?.nome ?? "usuário"} para ${pl.role}.`,
          entidade_tipo: "usuarios",
          entidade_id: targetUser?.id,
          ator_usuario_id: actor.id,
          ator_nome: actor.nome ?? "Admin",
        })),
      );
      return jsonResponse(req, 200, { message: "Role atualizado com sucesso." });
    }
    case "disable_user": {
      const pl = p as { userId: string };
      const { data: targetUser } = await adminClient
        .from("usuarios")
        .select("id, nome")
        .eq("usuario_id", pl.userId)
        .maybeSingle();
      const { error } = await adminClient.auth.admin.updateUserById(pl.userId, { ban_duration: "876000h" });
      if (error) throw error;
      await createNotifications(
        adminClient,
        adminIds.map((destId) => ({
          destinatario_usuario_id: destId,
          evento: "usuario_desativado",
          titulo: "Usuário desativado",
          mensagem: `${actor.nome ?? "Admin"} desativou ${targetUser?.nome ?? "usuário"}.`,
          entidade_tipo: "usuarios",
          entidade_id: targetUser?.id,
          ator_usuario_id: actor.id,
          ator_nome: actor.nome ?? "Admin",
        })),
      );
      return jsonResponse(req, 200, { message: "Usuário desativado com sucesso." });
    }
    case "reactivate_user": {
      const pl = p as { userId: string };
      const { data: targetUser } = await adminClient
        .from("usuarios")
        .select("id, nome")
        .eq("usuario_id", pl.userId)
        .maybeSingle();
      const { error } = await adminClient.auth.admin.updateUserById(pl.userId, { ban_duration: "none" });
      if (error) throw error;
      await createNotifications(
        adminClient,
        adminIds.map((destId) => ({
          destinatario_usuario_id: destId,
          evento: "usuario_reativado",
          titulo: "Usuário reativado",
          mensagem: `${actor.nome ?? "Admin"} reativou ${targetUser?.nome ?? "usuário"}.`,
          entidade_tipo: "usuarios",
          entidade_id: targetUser?.id,
          ator_usuario_id: actor.id,
          ator_nome: actor.nome ?? "Admin",
        })),
      );
      return jsonResponse(req, 200, { message: "Usuário reativado com sucesso." });
    }
    default:
      return jsonResponse(req, 400, {
        error: "Ação inválida para admin-users. Faça deploy das funções admin-* conforme o repositório.",
      });
  }
}
