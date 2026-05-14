import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** `undefined` = ainda não tentámos; `null` = falhou ou env incompleto */
let appSingleton: FirebaseApp | null | undefined;

function getOrInitApp(): FirebaseApp | null {
  if (appSingleton !== undefined) {
    return appSingleton;
  }
  const existing = getApps()[0];
  if (existing) {
    appSingleton = existing;
    return appSingleton;
  }
  if (!firebaseConfig.apiKey?.trim()) {
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

export async function getFirebaseMessaging() {
  const app = getOrInitApp();
  if (!app) {
    return null;
  }
  const supported = await isSupported();
  if (!supported) {
    return null;
  }
  return getMessaging(app);
}
