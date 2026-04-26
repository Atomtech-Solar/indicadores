const GENERIC_ERROR_MESSAGE = "Não foi possível concluir a solicitação.";

type EdgeResult = {
  success: boolean;
  status: number;
  message: string;
};

type VerifyOtpInput = {
  email: string;
  code: string;
  nome?: string;
  whatsapp?: string;
};

function getSupabaseEnv() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!supabaseUrl || !anonKey) {
    throw new Error("MISSING_SUPABASE_ENV");
  }

  return { supabaseUrl, anonKey };
}

async function callEdgeFunction(path: string, body: Record<string, unknown>): Promise<EdgeResult> {
  try {
    const { supabaseUrl, anonKey } = getSupabaseEnv();
    const response = await fetch(`${supabaseUrl}/functions/v1/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        message: data.error || GENERIC_ERROR_MESSAGE,
      };
    }

    return {
      success: true,
      status: response.status,
      message: data.message || "Operação concluída com sucesso.",
    };
  } catch {
    return {
      success: false,
      status: 500,
      message: GENERIC_ERROR_MESSAGE,
    };
  }
}

export async function registerWithPassword(input: { email: string; password: string }): Promise<EdgeResult> {
  // A função atual register-user exige captchaToken.
  const captchaToken = `captcha-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return callEdgeFunction("register-user", {
    email: input.email.trim(),
    password: input.password,
    captchaToken,
  });
}

export async function sendOtpEdge(input: { email: string }): Promise<EdgeResult> {
  return callEdgeFunction("send-otp", { email: input.email.trim() });
}

export async function verifyOtpEdge(input: VerifyOtpInput): Promise<EdgeResult> {
  return callEdgeFunction("verify-otp", {
    email: input.email.trim(),
    code: input.code.trim(),
    nome: input.nome?.trim(),
    whatsapp: input.whatsapp?.trim(),
  });
}
