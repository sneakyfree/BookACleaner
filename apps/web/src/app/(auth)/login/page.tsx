'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, Mail, Lock, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  // Gate the submit button until React has hydrated so a pre-hydration
  // native submit can't fire a GET with credentials in the URL.
  const [mounted, setMounted] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  useEffect(() => setMounted(true), [])

  async function onGoogleSignIn() {
    setIsGoogleLoading(true)
    setError(null)
    try {
      await signIn('google', { callbackUrl })
    } catch (err) {
      setError('Google sign-in failed. Please try again.')
      setIsGoogleLoading(false)
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await signIn('credentials', {
        email: formData.get('email'),
        password: formData.get('password'),
        mfa_code: mfaRequired ? mfaCode : undefined,
        redirect: false,
      })

      if (result?.error) {
        // Admin accounts with MFA enabled: first attempt returns
        // MFA_REQUIRED — reveal the code field and let them retry.
        if (result.error === 'MFA_REQUIRED') {
          setMfaRequired(true)
          setError(mfaCode ? 'Invalid authentication code' : null)
        } else if (result.error === 'RATE_LIMITED') {
          setError('Too many attempts, please wait a moment.')
        } else if (result.error === 'ACCOUNT_SUSPENDED') {
          setError('This account is suspended. Contact support.')
        } else {
          setError('Invalid email or password')
        }
        setIsLoading(false)
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-xl">
        <CardHeader className="pb-2 text-center">
          <Link href="/" className="mb-4 inline-flex items-center justify-center gap-2">
            <Sparkles className="text-brand-500 h-8 w-8" />
            <span className="font-display text-2xl font-bold text-white">
              BookACleaner<span className="text-brand-500">.ai</span>
            </span>
          </Link>
          <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
          <p className="mt-1 text-sm text-white/60">Sign in to your account to continue</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Sign In */}
          <Button
            type="button"
            variant="outline"
            className="min-h-[48px] w-full touch-manipulation border-white/10 bg-white/10 text-white transition-all hover:bg-white/20"
            onClick={onGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-2 text-white/40">or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form method="post" onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-white/80">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="focus:border-brand-500 focus:ring-brand-500 h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="password" className="text-sm font-medium text-white/80">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-brand-400 hover:text-brand-300 text-sm transition"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="focus:border-brand-500 focus:ring-brand-500 h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            {mfaRequired && (
              <div className="space-y-2">
                <label htmlFor="mfa_code" className="text-sm font-medium text-white/80">
                  Authentication code
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                  <Input
                    id="mfa_code"
                    name="mfa_code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code"
                    className="focus:border-brand-500 focus:ring-brand-500 h-12 border-white/10 bg-white/5 pl-10 tracking-widest text-white placeholder:text-white/30"
                  />
                </div>
                <p className="text-xs text-white/40">Enter the code from your authenticator app.</p>
              </div>
            )}

            <Button
              type="submit"
              className="bg-brand-500 hover:bg-brand-600 min-h-[48px] w-full touch-manipulation text-white"
              disabled={!mounted || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-white/60">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-brand-400 hover:text-brand-300 inline-block touch-manipulation py-2 transition"
            >
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
