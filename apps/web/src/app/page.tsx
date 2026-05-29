'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Shield, Calendar, Star } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/context'
import { LanguageToggle } from '@/components/LanguageToggle'

export default function HomePage() {
    const { t } = useLanguage()

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass-dark">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Sparkles className="w-8 h-8 text-brand-500" />
                        <span className="text-xl font-display font-bold text-white">
                            BookACleaner<span className="text-brand-500">.ai</span>
                        </span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8">
                        <Link href="/cleaners" className="text-white/80 hover:text-white transition">
                            {t.nav.findCleaners}
                        </Link>
                        <Link href="/for-cleaners" className="text-white/80 hover:text-white transition">
                            {t.nav.forCleaners}
                        </Link>
                        <Link href="/pricing" className="text-white/80 hover:text-white transition">
                            {t.nav.pricing}
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Language Toggle - Prominent Position */}
                        <LanguageToggle />
                        
                        <Link href="/login">
                            <Button variant="ghost" className="text-white hover:bg-white/10">
                                {t.nav.signIn}
                            </Button>
                        </Link>
                        <Link href="/register">
                            <Button className="bg-brand-500 hover:bg-brand-600 text-white">
                                {t.nav.getStarted}
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4">
                <div className="container mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm mb-8">
                        <Sparkles className="w-4 h-4" />
                        <span>{t.hero.badge}</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6 leading-tight">
                        {t.hero.title1}
                        <br />
                        <span className="text-gradient">{t.hero.title2}</span>
                    </h1>

                    <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10">
                        {t.hero.subtitle}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/register?role=client">
                            <Button size="lg" className="bg-brand-500 hover:bg-brand-600 text-white text-lg px-8 py-6">
                                {t.hero.findCleaner}
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </Link>
                        <Link href="/register?role=cleaner">
                            <Button
                                size="lg"
                                variant="outline"
                                className="border-brand-500/50 bg-transparent text-white hover:bg-brand-500/10 text-lg px-8 py-6"
                            >
                                {t.hero.joinAsCleaner}
                            </Button>
                        </Link>
                    </div>

                    <p className="text-white/40 text-sm mt-6">
                        {t.hero.freeNote}
                    </p>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-4">
                <div className="container mx-auto">
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="glass rounded-2xl p-8 hover:border-brand-500/50 transition-all">
                            <div className="w-12 h-12 bg-brand-500/20 rounded-xl flex items-center justify-center mb-6">
                                <Shield className="w-6 h-6 text-brand-500" />
                            </div>
                            <h3 className="text-xl font-display font-semibold text-white mb-3">
                                {t.features.verified.title}
                            </h3>
                            <p className="text-white/60">
                                {t.features.verified.description}
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="glass rounded-2xl p-8 hover:border-brand-500/50 transition-all">
                            <div className="w-12 h-12 bg-accent-fresh/20 rounded-xl flex items-center justify-center mb-6">
                                <Calendar className="w-6 h-6 text-accent-fresh" />
                            </div>
                            <h3 className="text-xl font-display font-semibold text-white mb-3">
                                {t.features.scheduling.title}
                            </h3>
                            <p className="text-white/60">
                                {t.features.scheduling.description}
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="glass rounded-2xl p-8 hover:border-brand-500/50 transition-all">
                            <div className="w-12 h-12 bg-accent-sparkle/20 rounded-xl flex items-center justify-center mb-6">
                                <Star className="w-6 h-6 text-accent-sparkle" />
                            </div>
                            <h3 className="text-xl font-display font-semibold text-white mb-3">
                                {t.features.reviews.title}
                            </h3>
                            <p className="text-white/60">
                                {t.features.reviews.description}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4">
                <div className="container mx-auto">
                    <div className="glass rounded-3xl p-12 text-center">
                        <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                            {t.cta.title}
                        </h2>
                        <p className="text-white/60 max-w-xl mx-auto mb-8">
                            {t.cta.subtitle}
                        </p>
                        <Link href="/register">
                            <Button size="lg" className="bg-brand-500 hover:bg-brand-600 text-white text-lg px-8 py-6">
                                {t.cta.button}
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10 py-12 px-4">
                <div className="container mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-brand-500" />
                            <span className="text-lg font-display font-semibold text-white">
                                BookACleaner.ai
                            </span>
                        </div>

                        <div className="flex items-center gap-8 text-white/60 text-sm">
                            <Link href="/privacy" className="hover:text-white transition">
                                {t.footer.privacy}
                            </Link>
                            <Link href="/terms" className="hover:text-white transition">
                                {t.footer.terms}
                            </Link>
                            <Link href="/contact" className="hover:text-white transition">
                                {t.footer.contact}
                            </Link>
                        </div>

                        <p className="text-white/40 text-sm">
                            {t.footer.copyright}
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
