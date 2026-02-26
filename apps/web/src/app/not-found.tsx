import Link from 'next/link'
import { Sparkles, ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
            <div className="text-center max-w-md mx-auto">
                {/* Logo */}
                <Link href="/" className="inline-flex items-center gap-2 mb-8">
                    <Sparkles className="w-8 h-8 text-brand-500" />
                    <span className="text-xl font-display font-bold text-white">
                        BookACleaner<span className="text-brand-500">.ai</span>
                    </span>
                </Link>

                {/* 404 Indicator */}
                <div className="mb-6">
                    <h1 className="text-7xl sm:text-8xl font-display font-bold text-gradient mb-2">
                        404
                    </h1>
                    <div className="w-16 h-1 bg-brand-500 mx-auto rounded-full" />
                </div>

                {/* Message */}
                <h2 className="text-xl sm:text-2xl font-display font-semibold text-white mb-3">
                    Page not found
                </h2>
                <p className="text-white/60 text-sm sm:text-base mb-8 leading-relaxed">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    Let&apos;s get you back on track.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link href="/" className="w-full sm:w-auto">
                        <Button className="w-full sm:w-auto bg-brand-500 hover:bg-brand-600 text-white min-h-[48px] px-6">
                            <Home className="w-4 h-4 mr-2" />
                            Go Home
                        </Button>
                    </Link>
                    <Link href="/cleaners" className="w-full sm:w-auto">
                        <Button className="w-full sm:w-auto bg-transparent border border-white/20 text-white hover:bg-white/10 min-h-[48px] px-6">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Find Cleaners
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
