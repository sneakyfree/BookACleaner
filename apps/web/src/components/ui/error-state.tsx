'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Error State — contextual error display with retry action
 * Usage: <ErrorState message="Failed to load data" onRetry={() => refetch()} />
 */

interface ErrorStateProps {
    message: string
    onRetry?: () => void
    className?: string
}

export function ErrorState({ message, onRetry, className = '' }: ErrorStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1">
                Something went wrong
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
                {message}
            </p>
            {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                </Button>
            )}
        </div>
    )
}

export default ErrorState
