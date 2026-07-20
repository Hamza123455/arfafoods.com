importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDhHrDsQ800-OL8a9p8KxD7x2FOgP70dh0",
  authDomain: "productionsummary-de8b2.firebaseapp.com",
  projectId: "productionsummary-de8b2",
  storageBucket: "productionsummary-de8b2.firebasestorage.app",
  messagingSenderId: "954992538861",
  appId: "1:954992538861:web:b4f15a0cde8338e71808e4"
});

const messaging = firebase.messaging();

// THIS handles notifications when tab is closed
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/arfafoods.com/productions/logo1.0.00.jpg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
