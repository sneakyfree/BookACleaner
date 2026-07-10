'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, Mail, Lock, Loader2, User, Building2, Briefcase } from 'lucide-react'

type UserRole = 'client' | 'cleaner'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultRole = searchParams.get('role') as UserRole | null

  const [step, setStep] = useState<'role' | 'details'>(defaultRole ? 'details' : 'role')
  const [role, setRole] = useState<UserRole>(defaultRole || 'client')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setIsLoading(false)
      return
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          password: password,
          role: role,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Registration failed')
      }

      // Establish an authenticated session before onboarding. Without this
      // the onboarding wizard runs unauthenticated, its PATCH /users/me
      // 401s (data silently lost), and "Go to Dashboard" bounces to login.
      const signInResult = await signIn('credentials', {
        email: formData.get('email') as string,
        password,
        redirect: false,
      })

      if (signInResult?.error) {
        // Registration succeeded but auto-login failed — send them to
        // login rather than a broken onboarding flow.
        router.push('/login')
        return
      }

      // Redirect to onboarding flow
      router.push('/welcome')
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Cannot connect to server. The backend API may not be running.')
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12">
      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-xl">
        <CardHeader className="pb-2 text-center">
          <Link href="/" className="mb-4 inline-flex items-center justify-center gap-2">
            <Sparkles className="text-brand-500 h-8 w-8" />
            <span className="font-display text-2xl font-bold text-white">
              BookACleaner<span className="text-brand-500">.ai</span>
            </span>
          </Link>
          <CardTitle className="text-2xl text-white">Create your account</CardTitle>
          <p className="mt-1 text-sm text-white/60">
            {step === 'role'
              ? 'Choose how you want to use BookACleaner'
              : 'Enter your details to get started'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Role Selection */}
          {step === 'role' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setRole('client')
                  setStep('details')
                }}
                className={`min-h-[72px] w-full touch-manipulation rounded-xl border-2 p-4 text-left transition-all sm:p-6 ${
                  role === 'client'
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="bg-brand-500/20 rounded-lg p-3">
                    <User className="text-brand-500 h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">I need cleaning services</h3>
                    <p className="mt-1 text-sm text-white/60">
                      Find and book trusted cleaning professionals for your home, Airbnb, or
                      business.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole('cleaner')
                  setStep('details')
                }}
                className={`min-h-[72px] w-full touch-manipulation rounded-xl border-2 p-4 text-left transition-all sm:p-6 ${
                  role === 'cleaner'
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="bg-accent-sparkle/20 rounded-lg p-3">
                    <Briefcase className="text-accent-sparkle h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      I'm a cleaning professional
                    </h3>
                    <p className="mt-1 text-sm text-white/60">
                      Grow your cleaning business, find clients, and manage your schedule with AI.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Details Form */}
          {step === 'details' && (
            <form onSubmit={onSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Role Badge */}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setStep('role')}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    role === 'client'
                      ? 'bg-brand-500/20 text-brand-400 hover:bg-brand-500/30'
                      : 'bg-accent-sparkle/20 text-accent-sparkle hover:bg-accent-sparkle/30'
                  }`}
                >
                  {role === 'client' ? (
                    <>
                      <User className="h-4 w-4" />
                      Looking for cleaners
                    </>
                  ) : (
                    <>
                      <Briefcase className="h-4 w-4" />
                      Cleaning professional
                    </>
                  )}
                  <span className="ml-1 text-white/40">Change</span>
                </button>
              </div>

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
                    className="focus:border-brand-500 h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-white/80">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="focus:border-brand-500 h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-white/80">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="focus:border-brand-500 h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="bg-brand-500 hover:bg-brand-600 min-h-[48px] w-full touch-manipulation text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>

              <p className="text-center text-xs text-white/40">
                By creating an account, you agree to our{' '}
                <Link href="/terms" className="text-white/60 transition hover:text-white">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-white/60 transition hover:text-white">
                  Privacy Policy
                </Link>
              </p>
            </form>
          )}

          <p className="text-center text-sm text-white/60">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-brand-400 hover:text-brand-300 inline-block touch-manipulation py-1 transition"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
