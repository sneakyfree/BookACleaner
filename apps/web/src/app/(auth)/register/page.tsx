'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

            // Redirect to login with success message
            router.push('/login?registered=true')
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12">
            <Card className="w-full max-w-md bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader className="text-center pb-2">
                    <Link href="/" className="inline-flex items-center justify-center gap-2 mb-4">
                        <Sparkles className="w-8 h-8 text-brand-500" />
                        <span className="text-2xl font-display font-bold text-white">
                            BookACleaner<span className="text-brand-500">.ai</span>
                        </span>
                    </Link>
                    <CardTitle className="text-2xl text-white">Create your account</CardTitle>
                    <p className="text-white/60 text-sm mt-1">
                        {step === 'role' ? 'Choose how you want to use BookACleaner' : 'Enter your details to get started'}
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
                                className={`w-full p-6 rounded-xl border-2 transition-all text-left ${role === 'client'
                                    ? 'border-brand-500 bg-brand-500/10'
                                    : 'border-white/10 hover:border-white/30 bg-white/5'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-lg bg-brand-500/20">
                                        <User className="w-6 h-6 text-brand-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">I need cleaning services</h3>
                                        <p className="text-white/60 text-sm mt-1">
                                            Find and book trusted cleaning professionals for your home, Airbnb, or business.
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
                                className={`w-full p-6 rounded-xl border-2 transition-all text-left ${role === 'cleaner'
                                    ? 'border-brand-500 bg-brand-500/10'
                                    : 'border-white/10 hover:border-white/30 bg-white/5'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-lg bg-accent-sparkle/20">
                                        <Briefcase className="w-6 h-6 text-accent-sparkle" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">I'm a cleaning professional</h3>
                                        <p className="text-white/60 text-sm mt-1">
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
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            {/* Role Badge */}
                            <div className="flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => setStep('role')}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${role === 'client'
                                        ? 'bg-brand-500/20 text-brand-400 hover:bg-brand-500/30'
                                        : 'bg-accent-sparkle/20 text-accent-sparkle hover:bg-accent-sparkle/30'
                                        }`}
                                >
                                    {role === 'client' ? (
                                        <>
                                            <User className="w-4 h-4" />
                                            Looking for cleaners
                                        </>
                                    ) : (
                                        <>
                                            <Briefcase className="w-4 h-4" />
                                            Cleaning professional
                                        </>
                                    )}
                                    <span className="text-white/40 ml-1">Change</span>
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium text-white/80">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="you@example.com"
                                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium text-white/80">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        minLength={8}
                                        placeholder="At least 8 characters"
                                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="confirmPassword" className="text-sm font-medium text-white/80">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-500"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-brand-500 hover:bg-brand-600 text-white"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating account...
                                    </>
                                ) : (
                                    'Create account'
                                )}
                            </Button>

                            <p className="text-center text-white/40 text-xs">
                                By creating an account, you agree to our{' '}
                                <Link href="/terms" className="text-white/60 hover:text-white transition">
                                    Terms of Service
                                </Link>{' '}
                                and{' '}
                                <Link href="/privacy" className="text-white/60 hover:text-white transition">
                                    Privacy Policy
                                </Link>
                            </p>
                        </form>
                    )}

                    <p className="text-center text-white/60 text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="text-brand-400 hover:text-brand-300 transition">
                            Sign in
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
