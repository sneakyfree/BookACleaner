'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Dashboard error:', error)
    }, [error])

    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center max-w-md px-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>

                <h2 className="text-xl font-semibold text-white mb-2">
                    Something went wrong
                </h2>

                <p className="text-white/60 text-sm mb-6">
                    We encountered an error while loading this page.
                </p>

                {process.env.NODE_ENV === 'development' && (
                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
                        <p className="text-red-400 text-xs font-mono break-all">
                            {error.message}
                        </p>
                    </div>
                )}

                <div className="flex gap-3 justify-center">
                    <Button
                        onClick={reset}
                        className="bg-brand-500 hover:bg-brand-600"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>

                    <Button
                        onClick={() => window.location.href = '/'}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                    >
                        <Home className="w-4 h-4 mr-2" />
                        Home
                    </Button>
                </div>
            </div>
        </div>
    )
}
