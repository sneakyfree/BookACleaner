/**
 * Push Notification Client
 * Handles FCM token registration and foreground message handling.
 */

import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

let messagingInstance: any = null

async function getFirebaseMessaging() {
    if (messagingInstance) return messagingInstance

    try {
        const { initializeApp, getApps }: any = await import('firebase/app')
        const { getMessaging, getToken, onMessage }: any = await import('firebase/messaging')

        const firebaseConfig = {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        }

        if (!firebaseConfig.apiKey) {
            console.warn('Firebase not configured, push notifications disabled')
            return null
        }

        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
        messagingInstance = getMessaging(app)
        return messagingInstance
    } catch (err) {
        console.error('Failed to initialize Firebase:', err)
        return null
    }
}

/**
 * Request notification permission and register FCM token with server.
 */
export async function requestPushPermission(accessToken: string): Promise<boolean> {
    if (!('Notification' in window)) {
        console.warn('Push notifications not supported')
        return false
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
        return false
    }

    const messaging = await getFirebaseMessaging()
    if (!messaging) return false

    try {
        const { getToken }: any = await import('firebase/messaging')
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

        const fcmToken = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js'),
        })

        if (fcmToken) {
            // Register token with backend
            await fetch(`${API_URL}/api/v1/notifications/register-device`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    fcm_token: fcmToken,
                    device_type: 'web',
                }),
            })
            return true
        }
    } catch (err) {
        console.error('Failed to get FCM token:', err)
    }

    return false
}

/**
 * Listen for foreground messages and show toast notifications.
 */
export async function setupForegroundListener(): Promise<void> {
    const messaging = await getFirebaseMessaging()
    if (!messaging) return

    const { onMessage }: any = await import('firebase/messaging')

    onMessage(messaging, (payload: any) => {
        const title = payload.notification?.title || 'BookACleaner'
        const body = payload.notification?.body || ''

        toast(title, {
            description: body,
            action: payload.data?.url
                ? {
                    label: 'View',
                    onClick: () => window.location.assign(payload.data!.url!),
                }
                : undefined,
        })
    })
}
