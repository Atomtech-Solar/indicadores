import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getFcmAccessToken, readFcmEnv, sendFcmNotification } from "../lib/firebase-fcm.ts";
import {
  buildAdminPushMessage,
  vibratePatternForEvent,
  type AdminPushParams,
  type PushEventType,
} from "./push-templates.ts";

/** Lista `auth.users.id` (uuid) de todos os administradores. */
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

export async function sendPushToAuthUserIds(
  adminClient: SupabaseClient,
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
  webpush?: Parameters<typeof sendFcmNotification>[6],
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
      const result = await sendFcmNotification(env, accessToken, token, title, body, data, webpush);
      if (result === "ok") {
        console.log(JSON.stringify({ type: "push_send_ok", tokenSuffix: token.slice(-8), evento: data?.evento ?? null }));
      } else if (result === "invalid_token") {
        await deletePushToken(adminClient, token);
      }
    } catch (e) {
      console.error(JSON.stringify({ type: "push_send_loop_error", message: String(e) }));
    }
  }
}

/** Push com identidade visual ATOM TECH por tipo de evento. */
export async function notifyAdminPushEvent(
  adminClient: SupabaseClient,
  event: PushEventType,
  params: AdminPushParams,
): Promise<void> {
  try {
    const built = buildAdminPushMessage(event, params);
    built.data.vibrate = vibratePatternForEvent(event, params.status).join(",");
    const adminIds = await listAdminAuthUserIds(adminClient);
    await sendPushToAuthUserIds(
      adminClient,
      adminIds,
      built.title,
      built.body,
      built.data,
      built.webpush,
    );
  } catch (e) {
    console.error(JSON.stringify({ type: "notify_admin_push_event_failed", message: String(e) }));
  }
}

/** Compatibilidade: envio manual título/corpo (preferir notifyAdminPushEvent). */
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
