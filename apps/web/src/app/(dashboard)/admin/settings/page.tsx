'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/auth/api-client'
import { api } from '@/lib/api'
import {
  Settings,
  User,
  ShieldCheck,
  FileText,
  Loader2,
  ArrowRight,
  Lock,
  Copy,
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

  // Two-factor authentication state
  const [mfaLoading, setMfaLoading] = useState(true)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; otpauth_uri: string } | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaBusy, setMfaBusy] = useState(false)

  useEffect(() => {
    api.admin
      .mfaStatus()
      .then((data: { mfa_enabled: boolean }) => setMfaEnabled(!!data?.mfa_enabled))
      .catch(() => toast.error('Could not load 2FA status'))
      .finally(() => setMfaLoading(false))
  }, [])

  const handleMfaSetup = async () => {
    setMfaBusy(true)
    try {
      const data = await api.admin.mfaSetup()
      setMfaSetup(data)
      setMfaCode('')
    } catch (err: any) {
      toast.error(err?.detail || 'Failed to start 2FA setup')
    } finally {
      setMfaBusy(false)
    }
  }

  const handleMfaEnable = async (e: React.FormEvent) => {
    e.preventDefault()
    setMfaBusy(true)
    try {
      await api.admin.mfaEnable(mfaCode)
      setMfaEnabled(true)
      setMfaSetup(null)
      setMfaCode('')
      toast.success('Two-factor authentication enabled')
    } catch (err: any) {
      toast.error(err?.detail || 'Invalid code — 2FA not enabled')
    } finally {
      setMfaBusy(false)
    }
  }

  const handleMfaDisable = async (e: React.FormEvent) => {
    e.preventDefault()
    setMfaBusy(true)
    try {
      await api.admin.mfaDisable(mfaCode)
      setMfaEnabled(false)
      setMfaCode('')
      toast.success('Two-factor authentication disabled')
    } catch (err: any) {
      toast.error(err?.detail || 'Invalid code — 2FA still enabled')
    } finally {
      setMfaBusy(false)
    }
  }

  const copySecret = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Copy failed — select and copy manually')
    }
  }

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
    {
      label: 'Audit Trail',
      href: '/admin/audit',
      icon: FileText,
      desc: 'Review every admin action on record',
    },
    {
      label: 'Verifications',
      href: '/admin/verifications',
      icon: ShieldCheck,
      desc: 'Cleaner verification queue',
    },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Settings className="h-6 w-6" /> Admin Settings
        </h1>
        <p className="text-muted-foreground mt-1">Manage your admin account</p>
      </div>

      <div className="bg-card rounded-xl border p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <User className="h-5 w-5" /> Profile
        </h2>
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading profile…
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="admin-email">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                disabled
                className="bg-muted text-muted-foreground w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="admin-name">
                Full name
              </label>
              <input
                id="admin-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="admin-phone">
                Phone
              </label>
              <input
                id="admin-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
          </form>
        )}
      </div>

      <div className="bg-card rounded-xl border p-6">
        <h2 className="mb-1 flex items-center gap-2 font-semibold">
          <Lock className="h-5 w-5" /> Admin Security / Two-Factor Authentication
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Protect your admin account with a TOTP authenticator app.
        </p>
        {mfaLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking 2FA status…
          </div>
        ) : mfaEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <ShieldCheck className="h-5 w-5" /> 2FA is on
            </div>
            <form onSubmit={handleMfaDisable} className="flex items-end gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="mfa-disable-code">
                  Enter a current 6-digit code to disable
                </label>
                <input
                  id="mfa-disable-code"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="bg-background w-32 rounded-md border px-3 py-2 font-mono text-sm tracking-widest"
                />
              </div>
              <button
                type="submit"
                disabled={mfaBusy || mfaCode.length !== 6}
                className="inline-flex items-center gap-2 rounded-md border border-red-500/50 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-50"
              >
                {mfaBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                Disable 2FA
              </button>
            </form>
          </div>
        ) : mfaSetup ? (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-sm font-medium">
                1. Add this secret to your authenticator app
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-muted break-all rounded-md border px-3 py-2 font-mono text-sm tracking-wider">
                  {mfaSetup.secret}
                </code>
                <button
                  type="button"
                  onClick={() => copySecret(mfaSetup.secret)}
                  className="hover:bg-muted rounded-md border p-2"
                  aria-label="Copy secret"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                Or paste this URI into an authenticator that accepts otpauth links:
              </p>
              <p className="text-muted-foreground mt-1 break-all font-mono text-xs">
                {mfaSetup.otpauth_uri}
              </p>
            </div>
            <form onSubmit={handleMfaEnable} className="flex items-end gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="mfa-enable-code">
                  2. Enter the 6-digit code from the app
                </label>
                <input
                  id="mfa-enable-code"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="bg-background w-32 rounded-md border px-3 py-2 font-mono text-sm tracking-widest"
                />
              </div>
              <button
                type="submit"
                disabled={mfaBusy || mfaCode.length !== 6}
                className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {mfaBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                Enable
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              2FA is currently disabled on your account.
            </p>
            <button
              type="button"
              onClick={handleMfaSetup}
              disabled={mfaBusy}
              className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {mfaBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Set up 2FA
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map(({ label, href, icon: Icon, desc }) => (
          <Link
            key={href}
            href={href}
            className="bg-card hover:border-primary/50 group rounded-xl border p-5 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium">
                <Icon className="h-5 w-5" /> {label}
              </span>
              <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="text-muted-foreground mt-2 text-sm">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
