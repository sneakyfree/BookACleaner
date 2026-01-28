'use client'

import { useEffect, useState } from 'react'

/**
 * Service Worker Registration Hook
 * Handles SW registration and update lifecycle
 */
export function useServiceWorker() {
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
    const [updateAvailable, setUpdateAvailable] = useState(false)
    const [isOffline, setIsOffline] = useState(false)

    useEffect(() => {
        // Check initial online status
        setIsOffline(!navigator.onLine)

        // Listen for online/offline events
        const handleOnline = () => setIsOffline(false)
        const handleOffline = () => setIsOffline(true)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        // Register service worker
        if ('serviceWorker' in navigator) {
            registerServiceWorker()
        }

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    async function registerServiceWorker() {
        try {
            const reg = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
            })

            setRegistration(reg)
            console.log('Service Worker registered:', reg.scope)

            // Check for updates
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available
                            setUpdateAvailable(true)
                        }
                    })
                }
            })

            // Check for updates periodically
            setInterval(() => {
                reg.update()
            }, 60 * 60 * 1000) // Every hour

        } catch (error) {
            console.error('Service Worker registration failed:', error)
        }
    }

    const updateServiceWorker = () => {
        if (registration?.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' })
            window.location.reload()
        }
    }

    return {
        registration,
        updateAvailable,
        updateServiceWorker,
        isOffline,
    }
}

/**
 * Service Worker Provider Component
 * Provides SW context and handles updates
 */
export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
    const { updateAvailable, updateServiceWorker, isOffline } = useServiceWorker()

    return (
        <>
            {children}

            {/* Update available banner */}
            {updateAvailable && (
                <div className="fixed bottom-0 left-0 right-0 bg-brand-500 text-white p-3 text-center z-50">
                    <span className="text-sm">
                        A new version is available!{' '}
                        <button
                            onClick={updateServiceWorker}
                            className="underline font-medium"
                        >
                            Update now
                        </button>
                    </span>
                </div>
            )}

            {/* Offline indicator */}
            {isOffline && (
                <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-3 py-1 text-center text-sm z-50">
                    You are currently offline. Some features may be unavailable.
                </div>
            )}
        </>
    )
}

/**
 * Offline Status Hook
 * Simple hook for checking online status
 */
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(true)

    useEffect(() => {
        setIsOnline(navigator.onLine)

        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    return isOnline
}
