import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type NotificationInsert = {
  destinatario_usuario_id: number;
  evento: string;
  titulo: string;
  mensagem: string;
  entidade_tipo?: string;
  entidade_id?: number;
  ator_usuario_id?: number;
  ator_nome?: string;
  metadata?: Record<string, unknown>;
};

export async function createNotifications(adminClient: SupabaseClient, notifications: NotificationInsert[]) {
  if (!notifications.length) return;
  const payload = notifications.map((n) => ({
    destinatario_usuario_id: n.destinatario_usuario_id,
    evento: n.evento,
    titulo: n.titulo,
    mensagem: n.mensagem,
    entidade_tipo: n.entidade_tipo ?? null,
    entidade_id: n.entidade_id ?? null,
    ator_usuario_id: n.ator_usuario_id ?? null,
    ator_nome: n.ator_nome ?? null,
    metadata: n.metadata ?? {},
  }));
  const { error } = await adminClient.from("notificacoes").insert(payload);
  if (error) {
    console.error(
      JSON.stringify({
        type: "admin_ops_notification_insert_failed",
        message: error.message,
        createdAt: new Date().toISOString(),
      }),
    );
  }
}
