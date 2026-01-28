'use client'

import Link from 'next/link'
import { WifiOff, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Offline fallback page
 * Shown when user is offline and requested page isn't cached
 */
export default function OfflinePage() {
    const handleRefresh = () => {
        window.location.reload()
    }

    const handleGoBack = () => {
        window.history.back()
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                {/* Offline icon */}
                <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <WifiOff className="w-12 h-12 text-white/40" />
                </div>

                {/* Message */}
                <h1 className="text-2xl font-bold text-white mb-3">
                    You&apos;re Offline
                </h1>
                <p className="text-white/60 mb-8">
                    It looks like you&apos;ve lost your internet connection.
                    Some features may not be available until you&apos;re back online.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        onClick={handleRefresh}
                        className="bg-brand-500 hover:bg-brand-600 gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </Button>
                    <Button
                        onClick={handleGoBack}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/5 gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </Button>
                </div>

                {/* Cached pages hint */}
                <div className="mt-12 p-4 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-white/50 text-sm mb-3">
                        Some pages you&apos;ve visited before may still be available:
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        <Link
                            href="/"
                            className="px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-sm hover:bg-white/20 transition-colors"
                        >
                            <Home className="w-3 h-3 inline mr-1" />
                            Home
                        </Link>
                        <Link
                            href="/login"
                            className="px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-sm hover:bg-white/20 transition-colors"
                        >
                            Login
                        </Link>
                        <Link
                            href="/client"
                            className="px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-sm hover:bg-white/20 transition-colors"
                        >
                            Dashboard
                        </Link>
                    </div>
                </div>

                {/* Status indicator */}
                <div className="mt-8 flex items-center justify-center gap-2 text-white/30 text-xs">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Waiting for connection...
                </div>
            </div>
        </div>
    )
}
