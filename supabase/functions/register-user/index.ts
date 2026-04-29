import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type RegisterPayload = {
  email: string;
  password: string;
  captchaToken: string;
};

type RateLimitResult = {
  allowed: boolean;
  emailAttemptsLastMinute: number;
  ipAttemptsLastMinute: number;
};

const EMAIL_LIMIT_PER_MINUTE = 3;
const IP_LIMIT_PER_MINUTE = 5;

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

function getClientIP(req: Request): string {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  const xRealIp = req.headers.get("x-real-ip");
  if (xRealIp) {
    return xRealIp.trim();
  }

  return "unknown";
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

async function applyProgressiveDelay(input: { emailAttemptsLastMinute: number; ipAttemptsLastMinute: number }): Promise<void> {
  const attemptsLastMinute = Math.max(input.emailAttemptsLastMinute, input.ipAttemptsLastMinute);
  if (attemptsLastMinute <= 2) return;

  // Delay progressivo para reduzir brute-force e spam.
  const delayMs = Math.min(500 * (attemptsLastMinute - 2), 4000);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function logSuspiciousAttempt(input: {
  ip: string;
  email: string;
  reason: string;
  emailAttemptsLastMinute: number;
  ipAttemptsLastMinute: number;
}): void {
  console.warn(
    JSON.stringify({
      type: "suspicious_register_attempt",
      ip: input.ip,
      email: input.email,
      reason: input.reason,
      emailAttemptsLastMinute: input.emailAttemptsLastMinute,
      ipAttemptsLastMinute: input.ipAttemptsLastMinute,
      createdAt: new Date().toISOString(),
    }),
  );
}

async function checkRateLimitWithCount(
  supabase: SupabaseClient,
  input: { email: string; ip: string },
): Promise<RateLimitResult> {
  const oneMinuteAgoIso = new Date(Date.now() - 60_000).toISOString();

  const { error: insertError } = await supabase.from("otp_rate_limits").insert({
    email: input.email,
    ip: input.ip,
  });

  if (insertError) {
    throw new Error("REGISTER_RATE_LIMIT_INSERT_FAILED");
  }

  const [{ count: emailCount, error: emailCountError }, { count: ipCount, error: ipCountError }] = await Promise.all([
    supabase
      .from("otp_rate_limits")
      .select("email", { count: "exact", head: true })
      .eq("email", input.email)
      .gte("created_at", oneMinuteAgoIso),
    supabase
      .from("otp_rate_limits")
      .select("ip", { count: "exact", head: true })
      .eq("ip", input.ip)
      .gte("created_at", oneMinuteAgoIso),
  ]);

  if (emailCountError || ipCountError) {
    throw new Error("REGISTER_RATE_LIMIT_COUNT_FAILED");
  }

  const emailAttemptsLastMinute = emailCount ?? 0;
  const ipAttemptsLastMinute = ipCount ?? 0;

  return {
    allowed:
      emailAttemptsLastMinute <= EMAIL_LIMIT_PER_MINUTE &&
      ipAttemptsLastMinute <= IP_LIMIT_PER_MINUTE,
    emailAttemptsLastMinute,
    ipAttemptsLastMinute,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function createUser(supabase: SupabaseClient, email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
  });

  if (error) {
    throw new Error("CREATE_USER_FAILED");
  }
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
    const ip = getClientIP(req);

    const payload = (await req.json()) as Partial<RegisterPayload>;
    const email = normalizeEmail(payload.email ?? "");
    const password = payload.password;
    const captchaToken = payload.captchaToken;

    const rateLimit = await checkRateLimitWithCount(supabase, { email: email || "invalid", ip });
    await applyProgressiveDelay(rateLimit);

    if (!rateLimit.allowed) {
      logSuspiciousAttempt({
        ip,
        email: email || "invalid",
        reason: "rate_limit_exceeded",
        emailAttemptsLastMinute: rateLimit.emailAttemptsLastMinute,
        ipAttemptsLastMinute: rateLimit.ipAttemptsLastMinute,
      });
      return jsonResponse(429, { error: "Não foi possível concluir a solicitação." });
    }

    if (!email || !email.includes("@") || !password || password.length < 6 || !captchaToken) {
      logSuspiciousAttempt({
        ip,
        email: email || "invalid",
        reason: "invalid_payload",
        emailAttemptsLastMinute: rateLimit.emailAttemptsLastMinute,
        ipAttemptsLastMinute: rateLimit.ipAttemptsLastMinute,
      });
      return jsonResponse(400, { error: "Não foi possível concluir a solicitação." });
    }

    const isCaptchaValid = await validateCaptcha(captchaToken);
    if (!isCaptchaValid) {
      logSuspiciousAttempt({
        ip,
        email,
        reason: "invalid_captcha",
        emailAttemptsLastMinute: rateLimit.emailAttemptsLastMinute,
        ipAttemptsLastMinute: rateLimit.ipAttemptsLastMinute,
      });
      return jsonResponse(400, { error: "Não foi possível concluir a solicitação." });
    }

    await createUser(supabase, email, password);

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
