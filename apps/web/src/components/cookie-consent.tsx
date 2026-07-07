'use client'

import { useState, useEffect } from 'react'
import { Cookie, X, Settings, Shield } from 'lucide-react'

/**
 * Cookie Consent Banner — GDPR/CCPA compliant cookie consent
 * Persists preference to localStorage. Does not set analytics cookies until consent given.
 */

type CookieCategory = 'essential' | 'analytics' | 'marketing'

interface CookiePreferences {
    essential: boolean   // Always true
    analytics: boolean
    marketing: boolean
    consentedAt?: string
}

const DEFAULT_PREFS: CookiePreferences = {
    essential: true,
    analytics: false,
    marketing: false,
}

const STORAGE_KEY = 'bac_cookie_consent'

export function CookieConsent() {
    const [visible, setVisible] = useState(false)
    const [showDetails, setShowDetails] = useState(false)
    const [prefs, setPrefs] = useState<CookiePreferences>(DEFAULT_PREFS)

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) {
            // No consent given yet — show banner after a short delay for UX
            const timer = setTimeout(() => setVisible(true), 1500)
            return () => clearTimeout(timer)
        }
        return undefined
    }, [])

    const saveAndClose = (preferences: CookiePreferences) => {
        const withTimestamp = { ...preferences, consentedAt: new Date().toISOString() }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(withTimestamp))
        setVisible(false)
        // Dispatch event so analytics scripts can listen
        window.dispatchEvent(new CustomEvent('cookie-consent', { detail: withTimestamp }))
    }

    const acceptAll = () => saveAndClose({ essential: true, analytics: true, marketing: true })
    const rejectOptional = () => saveAndClose({ essential: true, analytics: false, marketing: false })
    const saveCustom = () => saveAndClose(prefs)

    if (!visible) return null

    return (
        <div className="fixed bottom-0 left-0 z-[9999] p-4 sm:p-6 animate-in slide-in-from-bottom-5 duration-500 pointer-events-none max-w-full">
            <div className="max-w-md mr-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden pointer-events-auto">
                {/* Main Banner */}
                <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-brand-100 dark:bg-brand-500/15 rounded-xl shrink-0">
                            <Cookie className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                                We value your privacy
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                                We use cookies to enhance your experience, analyze site traffic, and serve personalized content.
                                You can manage your preferences anytime.
                            </p>
                        </div>
                    </div>

                    {/* Cookie Details (expandable) */}
                    {showDetails && (
                        <div className="mt-5 space-y-3 pt-4 border-t border-gray-200 dark:border-white/10">
                            {/* Essential */}
                            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                                <div className="flex items-center gap-3">
                                    <Shield className="w-4 h-4 text-green-500" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Essential</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Required for login, security, and core functionality</p>
                                    </div>
                                </div>
                                <div className="px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-medium">
                                    Always on
                                </div>
                            </div>

                            {/* Analytics */}
                            <label className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-white/5 cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <Settings className="w-4 h-4 text-blue-500" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Analytics</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Help us improve with usage data</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={prefs.analytics}
                                        onChange={e => setPrefs(p => ({ ...p, analytics: e.target.checked }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-5 bg-gray-300 dark:bg-gray-600 peer-checked:bg-brand-500 rounded-full transition-colors" />
                                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
                                </div>
                            </label>

                            {/* Marketing */}
                            <label className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-white/5 cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <Cookie className="w-4 h-4 text-purple-500" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Marketing</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Personalized ads and offers</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={prefs.marketing}
                                        onChange={e => setPrefs(p => ({ ...p, marketing: e.target.checked }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-5 bg-gray-300 dark:bg-gray-600 peer-checked:bg-brand-500 rounded-full transition-colors" />
                                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
                                </div>
                            </label>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <button
                            onClick={acceptAll}
                            className="flex-1 sm:flex-none px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium text-sm transition-colors"
                        >
                            Accept All
                        </button>
                        {showDetails ? (
                            <button
                                onClick={saveCustom}
                                className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-900 dark:text-white rounded-xl font-medium text-sm transition-colors"
                            >
                                Save Preferences
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowDetails(true)}
                                className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-900 dark:text-white rounded-xl font-medium text-sm transition-colors"
                            >
                                Customize
                            </button>
                        )}
                        <button
                            onClick={rejectOptional}
                            className="flex-1 sm:flex-none px-5 py-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm transition-colors"
                        >
                            Reject Optional
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CookieConsent
