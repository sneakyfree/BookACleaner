'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
    interface Window {
        adsbygoogle: any[]
    }
}

interface AdSlotProps {
    /** Google AdSense client ID (e.g. ca-pub-XXXXXXXXXX) */
    adClient?: string
    /** Ad slot ID from AdSense */
    adSlot?: string
    /** Ad format: auto, horizontal, vertical, rectangle */
    format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle'
    /** If true, show a demo placeholder instead of real ad */
    demo?: boolean
    /** Optional CSS class name */
    className?: string
}

const formatStyles: Record<string, { minHeight: string; maxWidth?: string }> = {
    auto: { minHeight: '100px' },
    horizontal: { minHeight: '90px', maxWidth: '728px' },
    vertical: { minHeight: '600px', maxWidth: '160px' },
    rectangle: { minHeight: '250px', maxWidth: '336px' },
}

/**
 * Reusable Google AdSense ad slot component.
 * In development or when no ad client is configured, renders a styled placeholder.
 * In production with valid credentials, loads real Google AdSense ads.
 */
export default function AdSlot({
    adClient,
    adSlot,
    format = 'auto',
    demo = false,
    className = '',
}: AdSlotProps) {
    const adRef = useRef<HTMLDivElement>(null)
    const [adBlocked, setAdBlocked] = useState(false)
    const [loaded, setLoaded] = useState(false)

    const realAdClient = adClient || process.env.NEXT_PUBLIC_ADSENSE_CLIENT || ''
    const realAdSlot = adSlot || ''
    const isProduction = !demo && realAdClient && realAdSlot
    const style = formatStyles[format] || formatStyles.auto

    useEffect(() => {
        if (!isProduction || loaded) return

        try {
            // Load AdSense script if not already present
            if (!document.querySelector('script[src*="adsbygoogle"]')) {
                const script = document.createElement('script')
                script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${realAdClient}`
                script.async = true
                script.crossOrigin = 'anonymous'
                script.onerror = () => setAdBlocked(true)
                document.head.appendChild(script)
            }

            // Push ad
            setTimeout(() => {
                try {
                    (window.adsbygoogle = window.adsbygoogle || []).push({})
                    setLoaded(true)
                } catch {
                    setAdBlocked(true)
                }
            }, 100)
        } catch {
            setAdBlocked(true)
        }
    }, [isProduction, realAdClient, loaded])

    // For development or when ads are blocked, show a styled placeholder
    if (!isProduction || adBlocked) {
        return (
            <div
                className={`relative overflow-hidden rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 flex items-center justify-center ${className}`}
                style={{ minHeight: style.minHeight, maxWidth: style.maxWidth }}
            >
                <div className="text-center p-4">
                    <div className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        Sponsored
                    </div>
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                        {adBlocked ? 'Ad content unavailable' : 'Advertisement'}
                    </p>
                </div>
                <div className="absolute top-2 right-2 text-[10px] text-slate-300 dark:text-slate-600">
                    Ad
                </div>
            </div>
        )
    }

    // Production AdSense ad
    return (
        <div ref={adRef} className={`ad-slot ${className}`} style={{ minHeight: style.minHeight }}>
            <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client={realAdClient}
                data-ad-slot={realAdSlot}
                data-ad-format={format === 'auto' ? 'auto' : undefined}
                data-full-width-responsive={format === 'auto' ? 'true' : undefined}
            />
        </div>
    )
}
