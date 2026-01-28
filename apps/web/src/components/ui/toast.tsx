'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Toast Notification System
 * Provides global toast notifications with auto-dismiss
 */

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
    id: string
    type: ToastType
    title: string
    description?: string
    duration?: number
    action?: {
        label: string
        onClick: () => void
    }
}

interface ToastContextType {
    toasts: Toast[]
    addToast: (toast: Omit<Toast, 'id'>) => void
    removeToast: (id: string) => void
    success: (title: string, description?: string) => void
    error: (title: string, description?: string) => void
    warning: (title: string, description?: string) => void
    info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const newToast = { ...toast, id }

        setToasts((prev) => [...prev, newToast])

        // Auto-dismiss
        const duration = toast.duration ?? 5000
        if (duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id))
            }, duration)
        }
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const success = useCallback(
        (title: string, description?: string) => {
            addToast({ type: 'success', title, description })
        },
        [addToast]
    )

    const error = useCallback(
        (title: string, description?: string) => {
            addToast({ type: 'error', title, description, duration: 8000 })
        },
        [addToast]
    )

    const warning = useCallback(
        (title: string, description?: string) => {
            addToast({ type: 'warning', title, description })
        },
        [addToast]
    )

    const info = useCallback(
        (title: string, description?: string) => {
            addToast({ type: 'info', title, description })
        },
        [addToast]
    )

    return (
        <ToastContext.Provider
            value={{ toasts, addToast, removeToast, success, error, warning, info }}
        >
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    )
}

// Toast Container
function ToastContainer({
    toasts,
    removeToast,
}: {
    toasts: Toast[]
    removeToast: (id: string) => void
}) {
    if (toasts.length === 0) return null

    return (
        <div
            className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full"
            role="region"
            aria-label="Notifications"
            aria-live="polite"
        >
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
            ))}
        </div>
    )
}

// Individual Toast
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const icons = {
        success: CheckCircle,
        error: AlertCircle,
        warning: AlertTriangle,
        info: Info,
    }

    const colors = {
        success: 'bg-green-500/10 border-green-500/30 text-green-400',
        error: 'bg-red-500/10 border-red-500/30 text-red-400',
        warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    }

    const Icon = icons[toast.type]

    return (
        <div
            className={cn(
                'flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm',
                'animate-slide-up shadow-lg',
                colors[toast.type]
            )}
            role="alert"
        >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="font-medium text-white">{toast.title}</p>
                {toast.description && (
                    <p className="text-sm text-white/60 mt-1">{toast.description}</p>
                )}
                {toast.action && (
                    <button
                        onClick={toast.action.onClick}
                        className="text-sm font-medium underline mt-2 hover:opacity-80"
                    >
                        {toast.action.label}
                    </button>
                )}
            </div>
            <button
                onClick={onDismiss}
                className="text-white/40 hover:text-white transition-colors"
                aria-label="Dismiss notification"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    )
}

// HOC for adding toast to components
export function withToast<P extends object>(
    Component: React.ComponentType<P & { toast: ToastContextType }>
) {
    return function WithToastComponent(props: P) {
        const toast = useToast()
        return <Component {...props} toast={toast} />
    }
}
