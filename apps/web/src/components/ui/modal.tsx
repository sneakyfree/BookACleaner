'use client'

import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/lib/accessibility'
import { Button } from '@/components/ui/button'

/**
 * Accessible Modal Dialog Component
 * Implements WAI-ARIA dialog pattern with focus trap
 */

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    description?: string
    children: React.ReactNode
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    showCloseButton?: boolean
    closeOnOverlayClick?: boolean
    closeOnEscape?: boolean
}

const modalSizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
}

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
}: ModalProps) {
    const focusTrapRef = useFocusTrap({ enabled: isOpen })
    const [isVisible, setIsVisible] = useState(false)

    // Handle escape key
    useEffect(() => {
        if (!isOpen || !closeOnEscape) return

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, closeOnEscape, onClose])

    // Handle visibility for animation
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true)
            // Prevent body scroll
            document.body.style.overflow = 'hidden'
            return () => {
                document.body.style.overflow = ''
            }
        } else {
            const timer = setTimeout(() => setIsVisible(false), 200)
            document.body.style.overflow = ''
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    if (!isVisible && !isOpen) return null

    return (
        <div
            className={cn(
                'fixed inset-0 z-50 flex items-center justify-center p-4',
                'transition-opacity duration-200',
                isOpen ? 'opacity-100' : 'opacity-0'
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby={description ? 'modal-description' : undefined}
        >
            {/* Backdrop */}
            <div
                className={cn(
                    'absolute inset-0 bg-black/60 backdrop-blur-sm',
                    'transition-opacity duration-200',
                    isOpen ? 'opacity-100' : 'opacity-0'
                )}
                onClick={closeOnOverlayClick ? onClose : undefined}
                aria-hidden="true"
            />

            {/* Modal content */}
            <div
                ref={focusTrapRef}
                className={cn(
                    'relative w-full bg-slate-800 rounded-xl shadow-2xl border border-white/10',
                    'transition-all duration-200',
                    isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
                    modalSizes[size]
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div>
                        <h2 id="modal-title" className="text-lg font-semibold text-white">
                            {title}
                        </h2>
                        {description && (
                            <p id="modal-description" className="text-sm text-white/60 mt-1">
                                {description}
                            </p>
                        )}
                    </div>
                    {showCloseButton && (
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                            aria-label="Close modal"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="p-4">{children}</div>
            </div>
        </div>
    )
}

// ============================================
// Confirmation Dialog
// ============================================

interface ConfirmDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: 'default' | 'danger'
    isLoading?: boolean
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'default',
    isLoading = false,
}: ConfirmDialogProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <p className="text-white/70 mb-6">{message}</p>
            <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                    {cancelText}
                </Button>
                <Button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className={cn(
                        variant === 'danger' && 'bg-red-500 hover:bg-red-600'
                    )}
                >
                    {isLoading ? 'Processing...' : confirmText}
                </Button>
            </div>
        </Modal>
    )
}

// ============================================
// Alert Dialog
// ============================================

interface AlertDialogProps {
    isOpen: boolean
    onClose: () => void
    title: string
    message: string
    buttonText?: string
    variant?: 'info' | 'success' | 'warning' | 'error'
}

export function AlertDialog({
    isOpen,
    onClose,
    title,
    message,
    buttonText = 'OK',
    variant = 'info',
}: AlertDialogProps) {
    const variantColors = {
        info: 'text-blue-400',
        success: 'text-green-400',
        warning: 'text-amber-400',
        error: 'text-red-400',
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <p className={cn('mb-6', variantColors[variant])}>{message}</p>
            <div className="flex justify-end">
                <Button onClick={onClose}>{buttonText}</Button>
            </div>
        </Modal>
    )
}
