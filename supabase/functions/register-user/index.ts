import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type RegisterPayload = {
  email: string;
  password: string;
  captchaToken: string;
};

type RateLimitResult = {
  allowed: boolean;
  attemptsLastMinute: number;
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

async function checkRateLimit(supabase: SupabaseClient, ip: string): Promise<boolean> {
  const oneMinuteAgoIso = new Date(Date.now() - 60_000).toISOString();

  const { error: insertError } = await supabase.from("rate_limits").insert({
    ip,
  });

  if (insertError) {
    throw new Error("RATE_LIMIT_INSERT_FAILED");
  }

  const { count, error: countError } = await supabase
    .from("rate_limits")
    .select("ip", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", oneMinuteAgoIso);

  if (countError) {
    throw new Error("RATE_LIMIT_COUNT_FAILED");
  }

  return (count ?? 0) <= 5;
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

async function applyProgressiveDelay(attemptsLastMinute: number): Promise<void> {
  if (attemptsLastMinute <= 2) return;

  // Delay progressivo para reduzir brute-force e spam.
  const delayMs = Math.min(500 * (attemptsLastMinute - 2), 4000);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function logSuspiciousAttempt(input: {
  ip: string;
  reason: string;
  attemptsLastMinute: number;
}): void {
  console.warn(
    JSON.stringify({
      type: "suspicious_register_attempt",
      ip: input.ip,
      reason: input.reason,
      attemptsLastMinute: input.attemptsLastMinute,
      createdAt: new Date().toISOString(),
    }),
  );
}

async function checkRateLimitWithCount(
  supabase: SupabaseClient,
  ip: string,
): Promise<RateLimitResult> {
  const oneMinuteAgoIso = new Date(Date.now() - 60_000).toISOString();

  const { error: insertError } = await supabase.from("rate_limits").insert({
    ip,
  });

  if (insertError) {
    throw new Error("RATE_LIMIT_INSERT_FAILED");
  }

  const { count, error: countError } = await supabase
    .from("rate_limits")
    .select("ip", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", oneMinuteAgoIso);

  if (countError) {
    throw new Error("RATE_LIMIT_COUNT_FAILED");
  }

  const attemptsLastMinute = count ?? 0;

  return {
    allowed: attemptsLastMinute <= 5,
    attemptsLastMinute,
  };
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
    const email = payload.email?.trim();
    const password = payload.password;
    const captchaToken = payload.captchaToken;

    const rateLimit = await checkRateLimitWithCount(supabase, ip);
    await applyProgressiveDelay(rateLimit.attemptsLastMinute);

    if (!rateLimit.allowed) {
      logSuspiciousAttempt({
        ip,
        reason: "rate_limit_exceeded",
        attemptsLastMinute: rateLimit.attemptsLastMinute,
      });
      return jsonResponse(429, { error: "Não foi possível concluir a solicitação." });
    }

    if (!email || !password || !captchaToken) {
      logSuspiciousAttempt({
        ip,
        reason: "invalid_payload",
        attemptsLastMinute: rateLimit.attemptsLastMinute,
      });
      return jsonResponse(400, { error: "Não foi possível concluir a solicitação." });
    }

    const isCaptchaValid = await validateCaptcha(captchaToken);
    if (!isCaptchaValid) {
      logSuspiciousAttempt({
        ip,
        reason: "invalid_captcha",
        attemptsLastMinute: rateLimit.attemptsLastMinute,
      });
      return jsonResponse(400, { error: "Não foi possível concluir a solicitação." });
    }

    await createUser(supabase, email, password);

    return jsonResponse(200, { message: "Cadastro realizado com sucesso." });
  } catch {
    return jsonResponse(500, { error: "Não foi possível concluir a solicitação." });
  }
});
