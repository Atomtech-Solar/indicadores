import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type VerifyOtpPayload = {
  email: string;
  code: string;
  nome?: string;
  whatsapp?: string;
};

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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function verifyOtp(supabase: SupabaseClient, email: string, code: string): Promise<string> {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });

  if (error || !data.user?.id) {
    throw new Error("OTP_VERIFICATION_FAILED");
  }

  return data.user.id;
}

async function getFallbackProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ nome?: string; whatsapp?: string }> {
  const [{ data: authUserResp }, { data: usuarioResp }] = await Promise.all([
    supabase.auth.admin.getUserById(userId),
    supabase.from("usuarios").select("nome, whatsapp").eq("usuario_id", userId).maybeSingle(),
  ]);

  const nomeFromAuth = authUserResp?.user?.user_metadata?.nome;
  const whatsappFromAuth = authUserResp?.user?.user_metadata?.whatsapp;
  const nomeFromDb = usuarioResp?.nome;
  const whatsappFromDb = usuarioResp?.whatsapp;

  return {
    nome: typeof nomeFromDb === "string" && nomeFromDb.trim() ? nomeFromDb.trim() : typeof nomeFromAuth === "string" ? nomeFromAuth.trim() : undefined,
    whatsapp:
      typeof whatsappFromDb === "string" && whatsappFromDb.trim()
        ? whatsappFromDb.trim()
        : typeof whatsappFromAuth === "string"
          ? whatsappFromAuth.trim()
          : undefined,
  };
}

async function confirmUser(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });

  if (error) {
    throw new Error("CONFIRM_USER_FAILED");
  }
}

async function upsertUsuarioProfile(
  supabase: SupabaseClient,
  input: { userId: string; nome?: string; whatsapp?: string },
): Promise<void> {
  if (!input.nome && !input.whatsapp) return;

  const { error } = await supabase.from("usuarios").upsert(
    {
      usuario_id: input.userId,
      nome: input.nome ?? null,
      whatsapp: input.whatsapp ?? null,
    },
    { onConflict: "usuario_id" },
  );

  if (error) {
    throw new Error("UPSERT_USUARIO_FAILED");
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(400, { error: "Não foi possível concluir a solicitação." });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("MISSING_SUPABASE_ENV");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const payload = (await req.json()) as Partial<VerifyOtpPayload>;
    const email = normalizeEmail(payload.email ?? "");
    const code = (payload.code ?? "").trim();
    const nome = payload.nome?.trim();
    const whatsapp = payload.whatsapp?.trim();

    if (!email || !isValidEmail(email) || code.length !== 6) {
      return jsonResponse(400, { error: "Não foi possível concluir a solicitação." });
    }

    const userId = await verifyOtp(supabase, email, code);
    const fallback = await getFallbackProfile(supabase, userId);
    const finalNome = nome || fallback.nome;
    const finalWhatsapp = whatsapp || fallback.whatsapp;
    if (!finalNome || !finalWhatsapp) {
      return jsonResponse(400, { error: "Não foi possível concluir a solicitação." });
    }
    await confirmUser(supabase, userId);
    await upsertUsuarioProfile(supabase, { userId, nome: finalNome, whatsapp: finalWhatsapp });

    return jsonResponse(200, { message: "Código validado com sucesso." });
  } catch {
    return jsonResponse(400, { error: "Não foi possível concluir a solicitação." });
  }
});
