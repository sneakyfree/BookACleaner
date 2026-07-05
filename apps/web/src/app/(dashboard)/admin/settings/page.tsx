'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/auth/api-client'
import {
    Settings,
    User,
    ShieldCheck,
    FileText,
    Loader2,
    ArrowRight,
} from 'lucide-react'

/**
 * Admin account settings.
 * The dashboard top-bar gear links to `${basePath}/settings` for every role;
 * client and cleaner pages existed but this one didn't, so admins got a 404.
 * Scope: the admin's own account (name/phone). Platform management lives in
 * the dedicated admin sections linked below.
 */
export default function AdminSettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [email, setEmail] = useState('')
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')

    useEffect(() => {
        apiFetch('/api/v1/users/me')
            .then((data: any) => {
                // GET /users/me nests the account under `user`.
                const u = data?.user || data || {}
                setEmail(u.email || '')
                setFullName(u.full_name || '')
                setPhone(u.phone || '')
            })
            .catch(() => toast.error('Could not load your profile'))
            .finally(() => setLoading(false))
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            // Backend contract is `full_name` (NOT `name`) + `phone`.
            await apiFetch('/api/v1/users/me', {
                method: 'PATCH',
                body: JSON.stringify({ full_name: fullName, phone }),
            })
            toast.success('Profile updated')
        } catch {
            toast.error('Failed to update profile')
        } finally {
            setSaving(false)
        }
    }

    const links = [
        { label: 'Audit Trail', href: '/admin/audit', icon: FileText, desc: 'Review every admin action on record' },
        { label: 'Verifications', href: '/admin/verifications', icon: ShieldCheck, desc: 'Cleaner verification queue' },
    ]

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Settings className="w-6 h-6" /> Admin Settings
                </h1>
                <p className="text-muted-foreground mt-1">Manage your admin account</p>
            </div>

            <div className="rounded-xl border bg-card p-6">
                <h2 className="font-semibold flex items-center gap-2 mb-4">
                    <User className="w-5 h-5" /> Profile
                </h2>
                {loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-6">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading profile…
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" htmlFor="admin-email">Email</label>
                            <input
                                id="admin-email"
                                type="email"
                                value={email}
                                disabled
                                className="w-full rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" htmlFor="admin-name">Full name</label>
                            <input
                                id="admin-name"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" htmlFor="admin-phone">Phone</label>
                            <input
                                id="admin-phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save changes
                        </button>
                    </form>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {links.map(({ label, href, icon: Icon, desc }) => (
                    <Link
                        key={href}
                        href={href}
                        className="rounded-xl border bg-card p-5 hover:border-primary/50 transition-colors group"
                    >
                        <div className="flex items-center justify-between">
                            <span className="font-medium flex items-center gap-2">
                                <Icon className="w-5 h-5" /> {label}
                            </span>
                            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{desc}</p>
                    </Link>
                ))}
            </div>
        </div>
    )
}
