import { supabase } from "@/lib/supabase/client";

export async function savePushToken(token: string) {
  console.log("Salvando token no Supabase");

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }
  if (!user) {
    throw new Error("Sem usuário autenticado.");
  }

  console.log("[push] savePushToken: utilizador", user.id);

  const now = new Date().toISOString();

  const { error } = await supabase.from("push_tokens").upsert(
    { user_id: user.id, token, updated_at: now },
    { onConflict: "token" },
  );

  if (error) {
    console.error("[push] upsert push_tokens falhou:", error);
    throw error;
  }

  console.log('Push token salvo com sucesso');
}
