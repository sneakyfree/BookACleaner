// Firebase Cloud Messaging Service Worker
// Handles background push notifications for BookACleaner

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

firebase.initializeApp({
    apiKey: 'FIREBASE_API_KEY',
    authDomain: 'bookacleaner.firebaseapp.com',
    projectId: 'bookacleaner',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:000000000000',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
    const { title, body, icon, data } = payload.notification || {}

    const notificationTitle = title || 'BookACleaner'
    const notificationOptions = {
        body: body || 'You have a new notification',
        icon: icon || '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: data || {},
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
    }

    self.registration.showNotification(notificationTitle, notificationOptions)
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    const url = event.notification.data?.url || '/'
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url === url && 'focus' in client) {
                    return client.focus()
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url)
            }
        })
    )
})
