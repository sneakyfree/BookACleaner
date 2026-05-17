import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { AIChatWidget } from '@/components/ai-chat-widget'
import { CookieConsent } from '@/components/cookie-consent'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
})

const outfit = Outfit({
    subsets: ['latin'],
    variable: '--font-outfit',
})

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://bookacleaner.ai'),
    title: {
        default: 'BookACleaner.ai | AI-Powered Cleaning Marketplace',
        template: '%s | BookACleaner.ai',
    },
    description:
        'The world\'s first AI-native operating system for the cleaning industry. Connect with trusted cleaning professionals for Airbnb turnovers, commercial cleaning, and more.',
    keywords: [
        'cleaning service',
        'house cleaning',
        'Airbnb cleaning',
        'commercial cleaning',
        'maid service',
        'cleaning marketplace',
        'AI cleaning',
    ],
    authors: [{ name: 'BookACleaner' }],
    creator: 'BookACleaner',
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://bookacleaner.ai',
        siteName: 'BookACleaner.ai',
        title: 'BookACleaner.ai | AI-Powered Cleaning Marketplace',
        description:
            'The world\'s first AI-native operating system for the cleaning industry.',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'BookACleaner.ai',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'BookACleaner.ai | AI-Powered Cleaning Marketplace',
        description:
            'The world\'s first AI-native operating system for the cleaning industry.',
        images: ['/og-image.png'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
}

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const locale = await getLocale()
    const messages = await getMessages()

    return (
        <html lang={locale} suppressHydrationWarning>
            <body className={`${inter.variable} ${outfit.variable} font-sans antialiased`}>
                <NextIntlClientProvider messages={messages}>
                    <Providers>
                        {children}
                        <AIChatWidget />
                        <CookieConsent />
                    </Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    )
}

