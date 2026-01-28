'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)

        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            // Always show success to prevent email enumeration
            setIsSuccess(true)
        } catch (err) {
            setIsSuccess(true)
        } finally {
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
                    <CardTitle className="text-2xl text-white">Reset your password</CardTitle>
                    <p className="text-white/60 text-sm mt-1">
                        {isSuccess
                            ? "Check your email for a reset link"
                            : "Enter your email and we'll send you a reset link"}
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isSuccess ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-brand-500/20 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-brand-500" />
                            </div>
                            <p className="text-white/60">
                                If an account exists for <span className="text-white">{email}</span>, you will receive a password reset email shortly.
                            </p>
                            <Link href="/login">
                                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to login
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={onSubmit} className="space-y-4">
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
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
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
                                        Sending...
                                    </>
                                ) : (
                                    'Send reset link'
                                )}
                            </Button>
                        </form>
                    )}

                    {!isSuccess && (
                        <p className="text-center text-white/60 text-sm">
                            Remember your password?{' '}
                            <Link href="/login" className="text-brand-400 hover:text-brand-300 transition">
                                Sign in
                            </Link>
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
