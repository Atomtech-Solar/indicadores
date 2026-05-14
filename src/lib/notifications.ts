import { getToken } from 'firebase/messaging';
import { getFirebaseMessaging } from './firebase';

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

  const messaging = await getFirebaseMessaging();

  if (!messaging) {
    throw new Error('Push notifications não são suportadas neste navegador.');
  }

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
