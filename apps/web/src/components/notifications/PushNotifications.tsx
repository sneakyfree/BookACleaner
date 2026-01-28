'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, BellOff, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NotificationPermissionState {
    permission: NotificationPermission | 'unsupported'
    isLoading: boolean
    error: string | null
}

/**
 * Hook for managing push notification permissions and subscriptions
 */
export function usePushNotifications() {
    const [state, setState] = useState<NotificationPermissionState>({
        permission: 'default',
        isLoading: false,
        error: null,
    })

    useEffect(() => {
        if (!('Notification' in window)) {
            setState(prev => ({ ...prev, permission: 'unsupported' }))
            return
        }
        setState(prev => ({ ...prev, permission: Notification.permission }))
    }, [])

    const requestPermission = useCallback(async () => {
        if (!('Notification' in window)) {
            setState(prev => ({ ...prev, error: 'Notifications not supported' }))
            return false
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }))

        try {
            const permission = await Notification.requestPermission()
            setState(prev => ({ ...prev, permission, isLoading: false }))

            if (permission === 'granted') {
                // Subscribe to push notifications
                await subscribeToPush()
            }

            return permission === 'granted'
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: 'Failed to request permission',
            }))
            return false
        }
    }, [])

    return {
        ...state,
        requestPermission,
        isGranted: state.permission === 'granted',
        isDenied: state.permission === 'denied',
        isDefault: state.permission === 'default',
    }
}

async function subscribeToPush() {
    try {
        const registration = await navigator.serviceWorker.ready

        // Get VAPID public key from server
        const response = await fetch('/api/v1/notifications/vapid-public-key')
        const { publicKey } = await response.json()

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
        })

        // Send subscription to server
        await fetch('/api/v1/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription),
        })

        console.log('Push subscription successful')
    } catch (error) {
        console.error('Push subscription failed:', error)
    }
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

/**
 * Push Notification Permission Prompt Component
 */
interface NotificationPromptProps {
    className?: string
    onPermissionChange?: (granted: boolean) => void
}

export function NotificationPrompt({ className, onPermissionChange }: NotificationPromptProps) {
    const { permission, isLoading, requestPermission, isGranted, isDenied } = usePushNotifications()
    const [dismissed, setDismissed] = useState(false)

    // Check if already dismissed
    useEffect(() => {
        const wasDismissed = localStorage.getItem('notification-prompt-dismissed')
        if (wasDismissed) setDismissed(true)
    }, [])

    const handleRequest = async () => {
        const granted = await requestPermission()
        onPermissionChange?.(granted)
    }

    const handleDismiss = () => {
        setDismissed(true)
        localStorage.setItem('notification-prompt-dismissed', 'true')
    }

    // Don't show if already granted, denied, or dismissed
    if (isGranted || isDenied || dismissed || permission === 'unsupported') {
        return null
    }

    return (
        <div className={cn(
            'fixed bottom-4 right-4 z-50 max-w-sm',
            'bg-slate-800 border border-white/10 rounded-xl shadow-xl p-4',
            'animate-slide-up',
            className
        )}>
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-5 h-5 text-brand-400" />
                </div>
                <div className="flex-1">
                    <h4 className="text-white font-medium mb-1">Enable Notifications</h4>
                    <p className="text-white/60 text-sm mb-3">
                        Get instant updates about bookings, messages, and job status changes.
                    </p>
                    <div className="flex gap-2">
                        <Button
                            onClick={handleRequest}
                            disabled={isLoading}
                            size="sm"
                            className="bg-brand-500 hover:bg-brand-600"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                'Enable'
                            )}
                        </Button>
                        <Button
                            onClick={handleDismiss}
                            variant="ghost"
                            size="sm"
                            className="text-white/50 hover:text-white"
                        >
                            Not now
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * Notification Settings Toggle Component
 */
interface NotificationToggleProps {
    className?: string
}

export function NotificationToggle({ className }: NotificationToggleProps) {
    const { permission, isLoading, requestPermission, isGranted, isDenied } = usePushNotifications()

    if (permission === 'unsupported') {
        return (
            <div className={cn('flex items-center gap-3 text-white/50', className)}>
                <BellOff className="w-5 h-5" />
                <span className="text-sm">Notifications not supported</span>
            </div>
        )
    }

    return (
        <div className={cn('flex items-center justify-between', className)}>
            <div className="flex items-center gap-3">
                {isGranted ? (
                    <Bell className="w-5 h-5 text-brand-400" />
                ) : (
                    <BellOff className="w-5 h-5 text-white/40" />
                )}
                <div>
                    <p className="text-white font-medium">Push Notifications</p>
                    <p className="text-white/50 text-sm">
                        {isGranted && 'Enabled'}
                        {isDenied && 'Blocked in browser settings'}
                        {!isGranted && !isDenied && 'Receive instant updates'}
                    </p>
                </div>
            </div>

            {!isGranted && !isDenied && (
                <Button
                    onClick={requestPermission}
                    disabled={isLoading}
                    variant="outline"
                    size="sm"
                    className="border-white/20"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        'Enable'
                    )}
                </Button>
            )}

            {isGranted && (
                <CheckCircle className="w-5 h-5 text-green-500" />
            )}

            {isDenied && (
                <XCircle className="w-5 h-5 text-red-500" />
            )}
        </div>
    )
}
