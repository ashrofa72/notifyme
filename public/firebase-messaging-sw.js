// Give the service worker access to Firebase Messaging.
// Note: We must use the importScripts with the compat libraries for the service worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
  apiKey: "AIzaSyB69dA55hcFnFZIsIxCFccDMizTNPMuuwE",
  authDomain: "notify-me-efcdf.firebaseapp.com",
  projectId: "notify-me-efcdf",
  storageBucket: "notify-me-efcdf.firebasestorage.app",
  messagingSenderId: "136524070156",
  appId: "1:136524070156:web:ec5f1673ee64f164addd29"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here if needed
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg' // You can replace this with your app logo
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});