'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Shield, Calendar, Star, Menu, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export default function HomePage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const t = useTranslations()

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-x-hidden">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass-dark">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Sparkles className="w-8 h-8 text-brand-500" />
                        <span className="text-xl font-display font-bold text-white">
                            BookACleaner<span className="text-brand-500">.ai</span>
                        </span>
                    </Link>

                    {/* Desktop nav links */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link href="/cleaners" className="text-white/80 hover:text-white transition">
                            {t('nav.findCleaners')}
                        </Link>
                        <Link href="/register?role=cleaner" className="text-white/80 hover:text-white transition">
                            {t('nav.forCleaners')}
                        </Link>
                        <Link href="/pricing" className="text-white/80 hover:text-white transition">
                            {t('nav.pricing')}
                        </Link>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Language switcher — desktop */}
                        <div className="hidden sm:block">
                            <LanguageSwitcher />
                        </div>

                        {/* Sign In / Get Started — desktop */}
                        <Link href="/login" className="hidden sm:block">
                            <Button variant="ghost" className="text-white hover:bg-white/10">
                                {t('nav.signIn')}
                            </Button>
                        </Link>
                        <Link href="/register" className="hidden sm:block">
                            <Button className="bg-brand-500 hover:bg-brand-600 text-white">
                                {t('nav.getStarted')}
                            </Button>
                        </Link>

                        {/* Hamburger — mobile only */}
                        <button
                            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition touch-manipulation"
                            onClick={() => setMobileMenuOpen(true)}
                            aria-label="Open menu"
                        >
                            <Menu className="w-6 h-6 text-white" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-[60] md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* Slide-in panel */}
                    <div className="absolute top-0 right-0 w-[280px] h-full bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Close button */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <span className="text-lg font-display font-bold text-white">Menu</span>
                            <button
                                className="p-2 rounded-lg hover:bg-white/10 transition touch-manipulation"
                                onClick={() => setMobileMenuOpen(false)}
                                aria-label="Close menu"
                            >
                                <X className="w-6 h-6 text-white" />
                            </button>
                        </div>

                        {/* Nav links */}
                        <nav className="flex-1 p-4 space-y-1">
                            <Link
                                href="/cleaners"
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition min-h-[48px] touch-manipulation"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Shield className="w-5 h-5 text-brand-400" />
                                {t('nav.findCleaners')}
                            </Link>
                            <Link
                                href="/register?role=cleaner"
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition min-h-[48px] touch-manipulation"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Star className="w-5 h-5 text-accent-sparkle" />
                                {t('nav.forCleaners')}
                            </Link>
                            <Link
                                href="/pricing"
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition min-h-[48px] touch-manipulation"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Calendar className="w-5 h-5 text-accent-fresh" />
                                {t('nav.pricing')}
                            </Link>
                        </nav>

                        {/* Language switcher — mobile */}
                        <div className="px-4 py-3 border-t border-white/10">
                            <LanguageSwitcher />
                        </div>

                        {/* Auth CTAs */}
                        <div className="p-4 border-t border-white/10 space-y-3">
                            <Link href="/login" className="block" onClick={() => setMobileMenuOpen(false)}>
                                <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 min-h-[48px]">
                                    {t('nav.signIn')}
                                </Button>
                            </Link>
                            <Link href="/register" className="block" onClick={() => setMobileMenuOpen(false)}>
                                <Button className="w-full bg-brand-500 hover:bg-brand-600 text-white min-h-[48px]">
                                    {t('nav.getStarted')}
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Hero Section */}
            <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4">
                <div className="container mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs sm:text-sm mb-6 sm:mb-8">
                        <Sparkles className="w-4 h-4" />
                        <span>{t('hero.badge')}</span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold text-white mb-4 sm:mb-6 leading-tight">
                        {t('hero.title1')}
                        <br />
                        <span className="text-gradient">{t('hero.title2')}</span>
                    </h1>

                    <p className="text-base sm:text-xl text-white/60 max-w-2xl mx-auto mb-8 sm:mb-10 px-2">
                        {t('hero.subtitle')}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                        <Link href="/register?role=client" className="w-full sm:w-auto">
                            <Button size="lg" className="w-full sm:w-auto bg-brand-500 hover:bg-brand-600 text-white text-base sm:text-lg px-8 py-6 min-h-[48px]">
                                {t('hero.findCleaner')}
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </Link>
                        <Link href="/register?role=cleaner" className="w-full sm:w-auto">
                            <Button
                                size="lg"
                                variant="outline"
                                className="w-full sm:w-auto border-brand-500/50 bg-transparent text-white hover:bg-brand-500/10 text-base sm:text-lg px-8 py-6 min-h-[48px]"
                            >
                                {t('hero.joinAsCleaner')}
                            </Button>
                        </Link>
                    </div>

                    <p className="text-white/40 text-xs sm:text-sm mt-4 sm:mt-6">
                        {t('hero.freeToUse')}
                    </p>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-12 sm:py-20 px-4">
                <div className="container mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
                        {/* Feature 1 */}
                        <div className="glass rounded-2xl p-6 sm:p-8 hover:border-brand-500/50 transition-all">
                            <div className="w-12 h-12 bg-brand-500/20 rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                                <Shield className="w-6 h-6 text-brand-500" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-display font-semibold text-white mb-2 sm:mb-3">
                                {t('features.verified.title')}
                            </h3>
                            <p className="text-sm sm:text-base text-white/60">
                                {t('features.verified.description')}
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="glass rounded-2xl p-6 sm:p-8 hover:border-brand-500/50 transition-all">
                            <div className="w-12 h-12 bg-accent-fresh/20 rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                                <Calendar className="w-6 h-6 text-accent-fresh" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-display font-semibold text-white mb-2 sm:mb-3">
                                {t('features.scheduling.title')}
                            </h3>
                            <p className="text-sm sm:text-base text-white/60">
                                {t('features.scheduling.description')}
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="glass rounded-2xl p-6 sm:p-8 hover:border-brand-500/50 transition-all">
                            <div className="w-12 h-12 bg-accent-sparkle/20 rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                                <Star className="w-6 h-6 text-accent-sparkle" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-display font-semibold text-white mb-2 sm:mb-3">
                                {t('features.reviews.title')}
                            </h3>
                            <p className="text-sm sm:text-base text-white/60">
                                {t('features.reviews.description')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-12 sm:py-20 px-4">
                <div className="container mx-auto">
                    <div className="glass rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white mb-3 sm:mb-4">
                            {t('cta.title')}
                        </h2>
                        <p className="text-sm sm:text-base text-white/60 max-w-xl mx-auto mb-6 sm:mb-8">
                            {t('cta.subtitle')}
                        </p>
                        <Link href="/register" className="inline-block w-full sm:w-auto">
                            <Button size="lg" className="w-full sm:w-auto bg-brand-500 hover:bg-brand-600 text-white text-base sm:text-lg px-8 py-6 min-h-[48px]">
                                {t('cta.button')}
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10 py-8 sm:py-12 px-4">
                <div className="container mx-auto">
                    <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-brand-500" />
                            <span className="text-lg font-display font-semibold text-white">
                                BookACleaner.ai
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-white/60 text-sm">
                            <Link href="/privacy" className="hover:text-white transition py-1 touch-manipulation">
                                {t('footer.privacy')}
                            </Link>
                            <Link href="/terms" className="hover:text-white transition py-1 touch-manipulation">
                                {t('footer.terms')}
                            </Link>
                            <a href="mailto:support@bookacleaner.ai" className="hover:text-white transition py-1 touch-manipulation">
                                {t('footer.contact')}
                            </a>
                        </div>

                        <p className="text-white/40 text-sm">
                            {t('footer.copyright')}
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
