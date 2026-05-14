importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAZ1E1Dt6dqsseQN6OVGkHtnYD8-WKHu8w",
  authDomain: "meu-saas-notificacoes.firebaseapp.com",
  projectId: "meu-saas-notificacoes",
  storageBucket: "meu-saas-notificacoes.firebasestorage.app",
  messagingSenderId: "889538852050",
  appId: "1:889538852050:web:5a7206258867b8940a690b"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Nova notificação';
  const options = {
    body: payload.notification?.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  };

  self.registration.showNotification(title, options);
});