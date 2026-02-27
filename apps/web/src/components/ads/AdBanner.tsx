'use client'

import Script from 'next/script'
import { useEffect, useRef } from 'react'

interface AdBannerProps {
    /** AdSense ad slot ID */
    slot: string
    /** Ad format — 'auto' for responsive */
    format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle'
    /** Layout key for in-feed ads */
    layoutKey?: string
    /** Where the ad appears — used to avoid rendering in dev */
    className?: string
}

/**
 * Google AdSense Banner Component.
 * Only renders in production. Falls back to nothing if AdSense isn't configured.
 */
export function AdBanner({
    slot,
    format = 'auto',
    layoutKey,
    className = '',
}: AdBannerProps) {
    const adRef = useRef<HTMLDivElement>(null)
    const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

    useEffect(() => {
        // Only push ads in production and when client ID is set
        if (process.env.NODE_ENV !== 'production' || !clientId) return

        try {
            ; ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
        } catch (e) {
            console.error('AdSense error:', e)
        }
    }, [clientId])

    // Don't render in development or if no client ID
    if (process.env.NODE_ENV !== 'production' && !clientId) {
        return (
            <div className={`border border-dashed border-muted-foreground/30 rounded-xl p-4 text-center text-xs text-muted-foreground ${className}`}>
                <span>Ad Slot: {slot}</span>
            </div>
        )
    }

    if (!clientId) return null

    return (
        <>
            <Script
                async
                src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
                crossOrigin="anonymous"
                strategy="afterInteractive"
            />
            <div ref={adRef} className={className}>
                <ins
                    className="adsbygoogle"
                    style={{ display: 'block' }}
                    data-ad-client={clientId}
                    data-ad-slot={slot}
                    data-ad-format={format}
                    data-full-width-responsive="true"
                    {...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {})}
                />
            </div>
        </>
    )
}

export default AdBanner
