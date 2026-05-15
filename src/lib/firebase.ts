import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const FIREBASE_ENV_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

/** `undefined` = ainda não tentámos; `null` = falhou ou env incompleto */
let appSingleton: FirebaseApp | null | undefined;

function listMissingFirebaseEnvKeys(): string[] {
  const values: Record<(typeof FIREBASE_ENV_KEYS)[number], string | undefined> = {
    VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
    VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
    VITE_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
    VITE_FIREBASE_APP_ID: firebaseConfig.appId,
  };
  return FIREBASE_ENV_KEYS.filter((key) => !values[key]?.trim());
}

function getOrInitApp(): FirebaseApp | null {
  if (appSingleton !== undefined) {
    return appSingleton;
  }
  const existing = getApps()[0];
  if (existing) {
    appSingleton = existing;
    return appSingleton;
  }
  const missing = listMissingFirebaseEnvKeys();
  if (missing.length > 0) {
    console.warn("[Firebase] Variáveis ausentes no build:", missing.join(", "));
    appSingleton = null;
    return null;
  }
  try {
    appSingleton = initializeApp(firebaseConfig);
    return appSingleton;
  } catch (err) {
    console.warn("[Firebase] Falha ao inicializar:", err);
    appSingleton = null;
    return null;
  }
}

export type FirebaseMessagingResult =
  | { ok: true; messaging: Messaging }
  | { ok: false; reason: string };

/** Diagnóstico explícito antes de usar FCM (evita mensagem genérica "não suportado"). */
export async function resolveFirebaseMessaging(): Promise<FirebaseMessagingResult> {
  if (typeof window === "undefined") {
    return { ok: false, reason: "Push só funciona no navegador (não no servidor)." };
  }

  if (!window.isSecureContext) {
    return {
      ok: false,
      reason:
        "O site precisa de HTTPS (ou http://localhost). Em http:// com IP da rede o Firebase Push não funciona.",
    };
  }

  if (!("Notification" in window)) {
    return { ok: false, reason: "Este navegador não expõe a API Notification." };
  }

  if (!("serviceWorker" in navigator)) {
    return { ok: false, reason: "Service Workers não estão disponíveis neste navegador." };
  }

  if (!("PushManager" in window)) {
    return {
      ok: false,
      reason:
        "PushManager indisponível (comum em Safari iOS, alguns modos privados ou navegadores sem Web Push). Use Chrome/Edge no desktop ou Android.",
    };
  }

  const missing = listMissingFirebaseEnvKeys();
  if (missing.length > 0) {
    return {
      ok: false,
      reason: `Configuração Firebase ausente no build (${missing.join(", ")}). No deploy (Vercel), adicione as variáveis VITE_FIREBASE_* e faça redeploy.`,
    };
  }

  const app = getOrInitApp();
  if (!app) {
    return {
      ok: false,
      reason: "Não foi possível inicializar o Firebase. Verifique as variáveis VITE_FIREBASE_* no ambiente de produção.",
    };
  }

  const supported = await isSupported();
  if (!supported) {
    console.warn("[Firebase] isSupported() = false", {
      isSecureContext: window.isSecureContext,
      hasServiceWorker: "serviceWorker" in navigator,
      hasPushManager: "PushManager" in window,
      userAgent: navigator.userAgent,
    });
    return {
      ok: false,
      reason:
        "Firebase Cloud Messaging não é suportado neste navegador/ambiente. Tente Chrome ou Edge em HTTPS (desktop ou Android).",
    };
  }

  return { ok: true, messaging: getMessaging(app) };
}

/** @deprecated Prefira resolveFirebaseMessaging() para mensagens de erro claras. */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  const result = await resolveFirebaseMessaging();
  return result.ok ? result.messaging : null;
}
