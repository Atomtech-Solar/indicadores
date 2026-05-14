import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getFcmAccessToken, readFcmEnv, sendFcmNotification } from "../lib/firebase-fcm.ts";

/** Lista `auth.users.id` (uuid) de todos os administradores. O projeto não tem `company_id`; inclui todos os admins. */
export async function listAdminAuthUserIds(adminClient: SupabaseClient): Promise<string[]> {
  const { data, error } = await adminClient.from("usuarios").select("usuario_id").eq("role", "admin");
  if (error) throw error;
  const ids = (data ?? [])
    .map((r) => r.usuario_id as string | null)
    .filter((x): x is string => Boolean(x && typeof x === "string"));
  return [...new Set(ids)];
}

async function deletePushToken(adminClient: SupabaseClient, token: string): Promise<void> {
  const { error } = await adminClient.from("push_tokens").delete().eq("token", token);
  if (error) {
    console.error(JSON.stringify({ type: "push_token_delete_failed", message: error.message, tokenSuffix: token.slice(-8) }));
  } else {
    console.log(JSON.stringify({ type: "push_token_removed_invalid", tokenSuffix: token.slice(-8) }));
  }
}

/**
 * Envia push FCM para os `userIds` (auth uuid) informados: busca tokens em `push_tokens`,
 * envia um a um, remove tokens inválidos. Erros não propagam.
 */
export async function sendPushToAuthUserIds(
  adminClient: SupabaseClient,
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueUserIds.length) {
    console.log(JSON.stringify({ type: "push_send_skipped", reason: "empty_user_ids" }));
    return;
  }

  let env;
  try {
    env = readFcmEnv();
  } catch (e) {
    console.error(JSON.stringify({ type: "push_send_config_missing", message: String(e) }));
    return;
  }

  const { data: rows, error } = await adminClient.from("push_tokens").select("token").in("user_id", uniqueUserIds);
  if (error) {
    console.error(JSON.stringify({ type: "push_tokens_select_failed", message: error.message }));
    return;
  }

  const tokens = [...new Set((rows ?? []).map((r) => r.token).filter((t): t is string => Boolean(t?.trim())))];
  if (!tokens.length) {
    console.log(JSON.stringify({ type: "push_send_skipped", reason: "no_tokens_for_users", userCount: uniqueUserIds.length }));
    return;
  }

  let accessToken: string;
  try {
    accessToken = await getFcmAccessToken(env);
  } catch (e) {
    console.error(JSON.stringify({ type: "push_oauth_failed", message: String(e) }));
    return;
  }

  for (const token of tokens) {
    try {
      const result = await sendFcmNotification(env, accessToken, token, title, body, data);
      if (result === "ok") {
        console.log(JSON.stringify({ type: "push_send_ok", tokenSuffix: token.slice(-8) }));
      } else if (result === "invalid_token") {
        await deletePushToken(adminClient, token);
      }
    } catch (e) {
      console.error(JSON.stringify({ type: "push_send_loop_error", message: String(e) }));
    }
  }
}

/** Envia push a todos os administradores (tokens em `push_tokens`). */
export async function notifyAdminsPush(
  adminClient: SupabaseClient,
  input: { title: string; body: string; data?: Record<string, string> },
): Promise<void> {
  try {
    const adminIds = await listAdminAuthUserIds(adminClient);
    await sendPushToAuthUserIds(adminClient, adminIds, input.title, input.body, input.data);
  } catch (e) {
    console.error(JSON.stringify({ type: "notify_admins_push_failed", message: String(e) }));
  }
}
