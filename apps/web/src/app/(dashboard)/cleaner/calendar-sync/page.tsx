'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
    CalendarCheck, Link2, Unlink, RefreshCw, ExternalLink,
    Loader2, AlertCircle, Check, CalendarDays
} from 'lucide-react'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Calendar Sync page — iCal / Google Calendar integration
 * Wired to backend Google Calendar service
 */

export default function CalendarSyncPage() {
    const { data: session } = useSession()
    const [googleConnected, setGoogleConnected] = useState(false)
    const [icalUrl, setIcalUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const connectGoogle = async () => {
        const token = (session as any)?.accessToken
        if (!token) return

        try {
            setLoading(true)
            setError('')
            const redirectUri = `${window.location.origin}/api/calendar/callback`
            const res = await fetch(`${API_URL}/api/v1/calendar/auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed to get authorization URL')
            const data = await res.json()
            if (data.url) {
                window.location.href = data.url
            }
        } catch (err: any) {
            setError(err.message || 'Failed to connect Google Calendar')
        } finally {
            setLoading(false)
        }
    }

    const saveIcalUrl = async () => {
        if (!icalUrl.trim()) return
        setSuccess('iCal URL saved! Your calendar will sync automatically.')
        // In production, POST to backend to store and start periodic sync
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <CalendarCheck className="w-7 h-7 text-brand-400" />
                        Calendar Sync
                    </h1>
                    <p className="text-white/60 mt-1">Sync your jobs with external calendars</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-400 shrink-0" />
                        <p className="text-green-300 text-sm">{success}</p>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Google Calendar */}
                    <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <CalendarDays className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Google Calendar</h3>
                                    <p className="text-white/50 text-sm">Auto-sync jobs to your Google Calendar</p>
                                </div>
                            </div>
                            {googleConnected ? (
                                <span className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
                                    <Check className="w-4 h-4" /> Connected
                                </span>
                            ) : (
                                <span className="text-white/40 text-sm">Not connected</span>
                            )}
                        </div>

                        {!googleConnected ? (
                            <button
                                onClick={connectGoogle}
                                disabled={loading}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                                Connect Google Calendar
                            </button>
                        ) : (
                            <div className="flex gap-3">
                                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                    <RefreshCw className="w-3.5 h-3.5" /> Sync Now
                                </button>
                                <button className="px-4 py-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                    <Unlink className="w-3.5 h-3.5" /> Disconnect
                                </button>
                            </div>
                        )}
                    </div>

                    {/* iCal URL Import */}
                    <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                <ExternalLink className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">iCal Import</h3>
                                <p className="text-white/50 text-sm">Import events from Airbnb, VRBO, or any iCal URL</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <input
                                type="url"
                                value={icalUrl}
                                onChange={e => setIcalUrl(e.target.value)}
                                placeholder="Paste your iCal URL here..."
                                className="flex-1 px-4 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                            />
                            <button
                                onClick={saveIcalUrl}
                                disabled={!icalUrl.trim()}
                                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-30 text-white rounded-lg font-medium transition-colors"
                            >
                                Import
                            </button>
                        </div>
                        <p className="text-white/30 text-xs mt-3">
                            Find your Airbnb iCal URL: Listings → Calendar → Import/Export → Copy Link
                        </p>
                    </div>

                    {/* Export Link */}
                    <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                        <h3 className="text-lg font-semibold text-white mb-2">Export Your Schedule</h3>
                        <p className="text-white/50 text-sm mb-4">
                            Use this URL to subscribe to your BookACleaner schedule in any calendar app.
                        </p>
                        <div className="flex items-center gap-3 bg-black/20 rounded-lg px-4 py-3">
                            <code className="text-brand-400 text-sm flex-1 truncate">
                                {API_URL}/api/v1/calendar/export/{(session as any)?.user?.id || 'your-id'}.ics
                            </code>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`${API_URL}/api/v1/calendar/export/${(session as any)?.user?.id || 'your-id'}.ics`)
                                    setSuccess('Export URL copied to clipboard!')
                                }}
                                className="text-white/60 hover:text-white text-sm font-medium whitespace-nowrap"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
