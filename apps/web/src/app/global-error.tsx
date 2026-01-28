'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Global error:', error)
    }, [error])

    return (
        <html>
            <body className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center max-w-md px-4">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-2">
                            Application Error
                        </h1>

                        <p className="text-white/60 mb-6">
                            A critical error occurred. We apologize for the inconvenience.
                        </p>

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={reset}
                                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>

                            <button
                                onClick={() => window.location.href = '/'}
                                className="px-4 py-2 border border-white/20 text-white hover:bg-white/10 rounded-lg flex items-center gap-2"
                            >
                                <Home className="w-4 h-4" />
                                Home
                            </button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    )
}
