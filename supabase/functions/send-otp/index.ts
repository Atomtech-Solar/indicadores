import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type SendOtpPayload = {
  email: string;
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

async function checkRateLimit(
  supabase: SupabaseClient,
  input: { email: string; ip: string },
): Promise<RateLimitResult> {
  const oneMinuteAgoIso = new Date(Date.now() - 60_000).toISOString();

  const { error: insertError } = await supabase.from("otp_rate_limits").insert({
    email: input.email,
    ip: input.ip,
  });

  if (insertError) {
    throw new Error("OTP_RATE_LIMIT_INSERT_FAILED");
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
    throw new Error("OTP_RATE_LIMIT_COUNT_FAILED");
  }

  const emailAttemptsLastMinute = emailCount ?? 0;
  const ipAttemptsLastMinute = ipCount ?? 0;
  const hasKnownIp = input.ip !== "unknown";

  return {
    // Regra principal por e-mail; IP atua como proteção extra somente quando disponível.
    allowed:
      emailAttemptsLastMinute <= EMAIL_LIMIT_PER_MINUTE &&
      (!hasKnownIp || ipAttemptsLastMinute <= IP_LIMIT_PER_MINUTE),
    emailAttemptsLastMinute,
    ipAttemptsLastMinute,
  };
}

async function sendOtp(supabase: SupabaseClient, email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    throw new Error("SEND_OTP_FAILED");
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
    const ip = getClientIP(req);

    const payload = (await req.json()) as Partial<SendOtpPayload>;
    const email = normalizeEmail(payload.email ?? "");

    if (!email || !email.includes("@")) {
      await checkRateLimit(supabase, { email: email || "invalid", ip });
      return jsonResponse(400, { error: "Não foi possível concluir a solicitação." });
    }

    const rateLimit = await checkRateLimit(supabase, { email, ip });
    if (!rateLimit.allowed) {
      return jsonResponse(429, { error: "Não foi possível concluir a solicitação." });
    }

    await sendOtp(supabase, email);

    return jsonResponse(200, { message: "Código enviado com sucesso." });
  } catch {
    return jsonResponse(500, { error: "Não foi possível concluir a solicitação." });
  }
});
