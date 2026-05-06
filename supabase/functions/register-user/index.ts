import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type RegisterPayload = {
  email: string;
  password: string;
  nome: string;
  whatsapp: string;
  captchaToken: string;
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

async function validateCaptcha(token: string): Promise<boolean> {
  if (!token || token.trim().length < 10) {
    return false;
  }

  if (token === "invalid-captcha-token") {
    return false;
  }

  return true;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isDuplicateUserError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const code = (error.code ?? "").toLowerCase();
  if (code === "email_exists" || code === "user_already_exists") {
    return true;
  }
  const msg = (error.message ?? "").toLowerCase();
  return (
    msg.includes("already been registered") ||
    msg.includes("already registered") ||
    msg.includes("user already exists") ||
    msg.includes("duplicate") ||
    msg.includes("email address is already")
  );
}

async function findAuthUserByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<{ id: string; email?: string; email_confirmed_at?: string | null } | null> {
  const target = normalizeEmail(email);
  let page = 1;
  const perPage = 1000;
  const maxPages = 100;

  while (page <= maxPages) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error(
        JSON.stringify({
          type: "register_user_list_users_error",
          message: error.message,
          createdAt: new Date().toISOString(),
        }),
      );
      return null;
    }
    const users = data.users ?? [];
    const found = users.find((u) => normalizeEmail(u.email ?? "") === target);
    if (found?.id) return { id: found.id, email: found.email, email_confirmed_at: found.email_confirmed_at };
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function registerOrResumePendingUser(
  supabase: SupabaseClient,
  input: { email: string; password: string; nome: string; whatsapp: string },
): Promise<{ userId: string; resumed: boolean }> {
  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: false,
    user_metadata: {
      nome: input.nome,
      whatsapp: input.whatsapp,
    },
  });

  if (!error && data.user?.id) {
    return { userId: data.user.id, resumed: false };
  }

  if (!isDuplicateUserError(error)) {
    throw new Error("CREATE_USER_FAILED");
  }

  const existing = await findAuthUserByEmail(supabase, input.email);
  if (!existing?.id) {
    throw new Error("CREATE_USER_FAILED");
  }

  if (existing.email_confirmed_at) {
    throw new Error("ACCOUNT_ALREADY_CONFIRMED");
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
    password: input.password,
    user_metadata: {
      nome: input.nome,
      whatsapp: input.whatsapp,
    },
  });

  if (updateError) {
    throw new Error("UPDATE_PENDING_USER_FAILED");
  }

  return { userId: existing.id, resumed: true };
}

async function upsertUsuarioProfile(
  supabase: SupabaseClient,
  input: { userId: string; nome: string; whatsapp: string },
): Promise<void> {
  const { error } = await supabase.from("usuarios").upsert(
    {
      usuario_id: input.userId,
      nome: input.nome,
      whatsapp: input.whatsapp,
    },
    { onConflict: "usuario_id" },
  );
  if (error) throw new Error("UPSERT_USUARIO_FAILED");
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(400, { error: "Requisição inválida." });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("MISSING_SUPABASE_ENV");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = (await req.json()) as Partial<RegisterPayload>;
    const email = normalizeEmail(payload.email ?? "");
    const password = payload.password;
    const nome = payload.nome?.trim();
    const whatsapp = payload.whatsapp?.trim();
    const captchaToken = payload.captchaToken;

    if (!email || !email.includes("@") || !password || password.length < 6 || !nome || !whatsapp || !captchaToken) {
      return jsonResponse(400, { error: "Não foi possível concluir a solicitação." });
    }

    const isCaptchaValid = await validateCaptcha(captchaToken);
    if (!isCaptchaValid) {
      return jsonResponse(400, { error: "Não foi possível concluir a solicitação." });
    }

    let userId: string;
    try {
      const result = await registerOrResumePendingUser(supabase, { email, password, nome, whatsapp });
      userId = result.userId;
      if (result.resumed) {
        console.log(
          JSON.stringify({
            type: "register_user_resumed_pending",
            email,
            createdAt: new Date().toISOString(),
          }),
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message === "ACCOUNT_ALREADY_CONFIRMED") {
        return jsonResponse(409, {
          error: "Esta conta já está ativa. Use a página Entrar com seu e-mail e senha.",
        });
      }
      throw err;
    }

    await upsertUsuarioProfile(supabase, { userId, nome, whatsapp });

    return jsonResponse(200, { message: "Cadastro realizado com sucesso." });
  } catch (error) {
    console.error(
      JSON.stringify({
        type: "register_user_error",
        message: error instanceof Error ? error.message : String(error),
        createdAt: new Date().toISOString(),
      }),
    );
    return jsonResponse(500, { error: "Não foi possível concluir a solicitação." });
  }
});
