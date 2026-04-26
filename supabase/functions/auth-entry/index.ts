import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type AuthEntryPayload = {
  email: string;
};

type RuntimeMode = "development" | "production";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  // Validação simples e suficiente para entrada inicial.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getRuntimeMode(): RuntimeMode {
  const env = (Deno.env.get("ENV") ?? "production").toLowerCase();
  return env === "development" ? "development" : "production";
}

function isDevAuthAllowed(mode: RuntimeMode): boolean {
  // Proteção extra: mesmo com ENV=development, exige flag explícita.
  const allowDevAuth = Deno.env.get("ALLOW_DEV_AUTH") === "true";
  return mode === "development" && allowDevAuth;
}

async function handleDevAuth(supabase: SupabaseClient, email: string): Promise<Response> {
  const { error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (!error) {
    return jsonResponse(200, { mode: "development", message: "Usuário liberado para desenvolvimento." });
  }

  // Garante idempotência sem expor detalhes.
  const message = (error.message ?? "").toLowerCase();
  const isDuplicate =
    message.includes("already") ||
    message.includes("registered") ||
    message.includes("exists") ||
    message.includes("duplicate");

  if (isDuplicate) {
    return jsonResponse(200, { mode: "development", message: "Usuário liberado para desenvolvimento." });
  }

  throw new Error("DEV_AUTH_FAILED");
}

async function handleProdAuth(supabase: SupabaseClient, email: string): Promise<Response> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    throw new Error("PROD_AUTH_FAILED");
  }

  return jsonResponse(200, { mode: "production", message: "Código OTP enviado com sucesso." });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(400, { error: "Solicitação inválida." });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("MISSING_SUPABASE_ENV");
    }

    const payload = (await req.json()) as Partial<AuthEntryPayload>;
    const email = normalizeEmail(payload.email ?? "");

    if (!email || !isValidEmail(email)) {
      return jsonResponse(400, { error: "Dados inválidos." });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const mode = getRuntimeMode();
    const canUseDevAuth = isDevAuthAllowed(mode);

    console.log(
      JSON.stringify({
        type: "auth-entry-mode",
        mode,
        devAuthEnabled: canUseDevAuth,
        createdAt: new Date().toISOString(),
      }),
    );

    if (canUseDevAuth) {
      return await handleDevAuth(supabase, email);
    }

    return await handleProdAuth(supabase, email);
  } catch {
    return jsonResponse(500, { error: "Não foi possível concluir a solicitação." });
  }
});
