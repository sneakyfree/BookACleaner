'use client'

import { useState } from 'react'
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
                redirect: false,
            })

            if (result?.error) {
                setError('Invalid email or password')
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
            <Card className="w-full max-w-md bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader className="text-center pb-2">
                    <Link href="/" className="inline-flex items-center justify-center gap-2 mb-4">
                        <Sparkles className="w-8 h-8 text-brand-500" />
                        <span className="text-2xl font-display font-bold text-white">
                            BookACleaner<span className="text-brand-500">.ai</span>
                        </span>
                    </Link>
                    <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
                    <p className="text-white/60 text-sm mt-1">
                        Sign in to your account to continue
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Google Sign In */}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full min-h-[48px] bg-white/10 hover:bg-white/20 text-white border-white/10 transition-all touch-manipulation"
                        onClick={onGoogleSignIn}
                        disabled={isGoogleLoading}
                    >
                        {isGoogleLoading ? (
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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
                    <form onSubmit={onSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

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
                                    className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-500 focus:ring-brand-500"
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
                                    className="text-sm text-brand-400 hover:text-brand-300 transition"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-500 focus:ring-brand-500"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full min-h-[48px] bg-brand-500 hover:bg-brand-600 text-white touch-manipulation"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-white/60 text-sm">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-brand-400 hover:text-brand-300 transition py-2 inline-block touch-manipulation">
                            Create one
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
