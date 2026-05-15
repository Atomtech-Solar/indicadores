import { getToken } from 'firebase/messaging';
import { resolveFirebaseMessaging } from './firebase';

export async function requestNotificationPermission() {
  console.log("[push] requestNotificationPermission: início", {
    permission: Notification.permission,
  });

  if (Notification.permission === 'denied') {
    throw new Error(
      'As notificações estão bloqueadas no navegador. Reative em Configurações do site.',
    );
  }

  let permission: NotificationPermission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    throw new Error('Permissão de notificações negada.');
  }

  const messagingResult = await resolveFirebaseMessaging();

  if (!messagingResult.ok) {
    console.warn('[push] FCM indisponível:', messagingResult.reason);
    throw new Error(messagingResult.reason);
  }

  const messaging = messagingResult.messaging;

  console.log('[push] Registrando Service Worker');
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  console.log('[push] Service Worker registrado:', registration);
  console.log('[push] Aguardando service worker ficar ready');
  await navigator.serviceWorker.ready;
  console.log('[push] Service Worker pronto');

  const vapidRaw = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  console.log('[push] VAPID key:', vapidRaw);
  console.log('[push] VAPID length:', vapidRaw?.length);

  const vapidKey =
    typeof vapidRaw === 'string' ? vapidRaw.trim() : '';

  if (
    vapidRaw === undefined ||
    vapidRaw === null ||
    typeof vapidRaw !== 'string' ||
    vapidKey.length <= 80
  ) {
    throw new Error('VITE_FIREBASE_VAPID_KEY inválida ou ausente.');
  }

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  console.log("[push] getToken() concluído", {
    temToken: Boolean(token && String(token).length > 0),
    comprimento: token ? String(token).length : 0,
  });
  console.log('Token retornado:', token);

  return token;
}

let foregroundListenerAttached = false;

/** Quando o admin está com o separador aberto, exibe o mesmo conteúdo do push na UI. */
export async function attachForegroundPushListener(
  onNotify: (payload: { title: string; body: string; accentColor?: string }) => void,
): Promise<void> {
  if (foregroundListenerAttached || typeof window === "undefined") return;

  const messagingResult = await resolveFirebaseMessaging();
  if (!messagingResult.ok) return;

  const { onMessage } = await import("firebase/messaging");
  onMessage(messagingResult.messaging, (payload) => {
    const title = payload.notification?.title ?? "ATOM TECH";
    const body = payload.notification?.body ?? "";
    const accentColor =
      typeof payload.data?.accentColor === "string" ? payload.data.accentColor : undefined;
    onNotify({ title, body, accentColor });
  });
  foregroundListenerAttached = true;
}
