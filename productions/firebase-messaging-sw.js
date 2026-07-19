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

messaging.onBackgroundMessage(function(payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: 'https://hamza123455.github.io/logo1.0.00.jpg' // use full URL
  });
});
