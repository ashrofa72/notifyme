importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js');

// Config must match the one in services/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyB69dA55hcFnFZIsIxCFccDMizTNPMuuwE",
  authDomain: "notify-me-efcdf.firebaseapp.com",
  projectId: "notify-me-efcdf",
  storageBucket: "notify-me-efcdf.firebasestorage.app",
  messagingSenderId: "136524070156",
  appId: "1:136524070156:web:ec5f1673ee64f164addd29"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});