/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

const ATOM_LOGO_URL = 'https://i.ibb.co/nqCbqzLG/Documento-de-Bryan-Henrique-1.png';

firebase.initializeApp({
  apiKey: 'AIzaSyAZ1E1Dt6dqsseQN6OVGkHtnYD8-WKHu8w',
  authDomain: 'meu-saas-notificacoes.firebaseapp.com',
  projectId: 'meu-saas-notificacoes',
  storageBucket: 'meu-saas-notificacoes.firebasestorage.app',
  messagingSenderId: '889538852050',
  appId: '1:889538852050:web:5a7206258867b8940a690b',
});

const messaging = firebase.messaging();

const EVENT_DEFAULTS = {
  nova_indicacao: { tag: 'atomtech-nova-indicacao', requireInteraction: true },
  status_indicacao: { tag: 'atomtech-status-indicacao', requireInteraction: false },
  comissao_paga: { tag: 'atomtech-comissao-paga', requireInteraction: true },
  proposta_registrada: { tag: 'atomtech-proposta', requireInteraction: false },
  novo_indicador: { tag: 'atomtech-novo-indicador', requireInteraction: false },
};

function parseVibrate(raw) {
  if (!raw || typeof raw !== 'string') return [120, 60, 120];
  const parts = raw.split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !Number.isNaN(n));
  return parts.length ? parts : [120, 60, 120];
}

function resolveClickUrl(data) {
  const fromPayload = data.clickUrl || data.click_url;
  if (fromPayload && /^https?:\/\//i.test(fromPayload)) return fromPayload;
  if (fromPayload && fromPayload.startsWith('/')) {
    return `${self.location.origin}${fromPayload}`;
  }
  return `${self.location.origin}/admin`;
}

function buildNotificationPayload(fcmPayload) {
  const data = fcmPayload.data || {};
  const notification = fcmPayload.notification || {};
  const evento = data.evento || 'nova_indicacao';
  const defaults = EVENT_DEFAULTS[evento] || EVENT_DEFAULTS.nova_indicacao;

  const title = notification.title || 'ATOM TECH';
  const body = notification.body || '';
  const icon = data.iconUrl || ATOM_LOGO_URL;
  const badge = data.badgeUrl || icon;
  const tag = data.tag || defaults.tag;
  const requireInteraction = data.requireInteraction === 'true' || defaults.requireInteraction;

  return {
    title,
    options: {
      body,
      icon,
      badge,
      tag,
      requireInteraction,
      vibrate: parseVibrate(data.vibrate),
      data: {
        url: resolveClickUrl(data),
        evento,
        accentColor: data.accentColor || '#1B8F3A',
        brand: data.brand || 'ATOM TECH',
        indicacaoId: data.indicacaoId || '',
      },
    },
  };
}

messaging.onBackgroundMessage((payload) => {
  const { title, options } = buildNotificationPayload(payload);
  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || `${self.location.origin}/admin`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }),
  );
});
