/**
 * Firebase Cloud Messaging HTTP v1 — credenciais só no backend (Edge).
 * Variáveis: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */

const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

export type FcmEnv = {
  projectId: string;
  clientEmail: string;
  privateKeyPem: string;
};

export function readFcmEnv(): FcmEnv {
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID")?.trim() ?? "";
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL")?.trim() ?? "";
  const rawKey = Deno.env.get("FIREBASE_PRIVATE_KEY") ?? "";
  const privateKeyPem = rawKey.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKeyPem) {
    throw new Error("MISSING_FIREBASE_FCM_ENV");
  }
  return { projectId, clientEmail, privateKeyPem };
}

let accessTokenCache: { token: string; expiresAtMs: number } | null = null;

async function signServiceAccountJwt(clientEmail: string, privateKeyPem: string): Promise<string> {
  const { SignJWT, importPKCS8 } = await import("https://deno.land/x/jose@v5.9.6/index.ts");
  const key = await importPKCS8(privateKeyPem, "RS256");
  return await new SignJWT({ scope: FCM_SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience(OAUTH_TOKEN_URL)
    .setIssuedAt()
    .setExpirationTime("35m")
    .sign(key);
}

export async function getFcmAccessToken(env: FcmEnv): Promise<string> {
  const now = Date.now();
  if (accessTokenCache && now < accessTokenCache.expiresAtMs - 60_000) {
    return accessTokenCache.token;
  }

  const assertion = await signServiceAccountJwt(env.clientEmail, env.privateKeyPem);
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`FcmOAuthFailed ${res.status}: ${text}`);
  }
  const json = JSON.parse(text) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error("FcmOAuthNoAccessToken");
  }
  const ttlMs = (json.expires_in ?? 3600) * 1000;
  accessTokenCache = { token: json.access_token, expiresAtMs: now + ttlMs };
  return json.access_token;
}

export type FcmSendResult = "ok" | "invalid_token" | "error";

export async function sendFcmNotification(
  env: FcmEnv,
  accessToken: string,
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<FcmSendResult> {
  const url = `https://fcm.googleapis.com/v1/projects/${env.projectId}/messages:send`;
  const dataPayload = data
    ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
    : undefined;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        ...(dataPayload && Object.keys(dataPayload).length ? { data: dataPayload } : {}),
      },
    }),
  });

  const text = await res.text();
  if (res.ok) {
    return "ok";
  }

  let statusField = "";
  try {
    const j = JSON.parse(text) as { error?: { status?: string; code?: number } };
    statusField = j.error?.status ?? "";
  } catch {
    /* ignore */
  }

  const invalid =
    res.status === 404 ||
    statusField === "NOT_FOUND" ||
    statusField === "INVALID_ARGUMENT" ||
    /UNREGISTERED|Requested entity was not found|registration-token-not-registered/i.test(text);

  if (invalid) {
    return "invalid_token";
  }
  console.error(JSON.stringify({ type: "fcm_send_http_error", status: res.status, body: text }));
  return "error";
}
