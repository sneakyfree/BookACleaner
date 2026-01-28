'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get('token')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState<'form' | 'success' | 'error'>('form')
    const [message, setMessage] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            setMessage('Passwords do not match')
            return
        }

        if (password.length < 8) {
            setMessage('Password must be at least 8 characters')
            return
        }

        if (!token) {
            setStatus('error')
            setMessage('No reset token provided')
            return
        }

        setIsLoading(true)
        setMessage('')

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            })

            const data = await res.json()

            if (res.ok) {
                setStatus('success')
                setMessage('Password reset successfully!')
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push('/login?reset=true')
                }, 3000)
            } else {
                setStatus('error')
                setMessage(data.detail || 'Failed to reset password')
            }
        } catch (error) {
            setStatus('error')
            setMessage('An error occurred. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <div className="w-full max-w-md p-8">
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Invalid Reset Link</h1>
                        <p className="text-white/60 mb-6">This password reset link is invalid or has expired.</p>
                        <Link
                            href="/forgot-password"
                            className="inline-block px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                        >
                            Request New Link
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="w-full max-w-md p-8">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8">
                    {status === 'form' && (
                        <>
                            <div className="text-center mb-8">
                                <h1 className="text-2xl font-bold text-white mb-2">Reset Your Password</h1>
                                <p className="text-white/60">Enter your new password below.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {message && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                        {message}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white">New Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="••••••••"
                                        minLength={8}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="••••••••"
                                        minLength={8}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                                >
                                    {isLoading ? 'Resetting...' : 'Reset Password'}
                                </button>
                            </form>
                        </>
                    )}

                    {status === 'success' && (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Password Reset! ✨</h1>
                            <p className="text-white/60 mb-6">{message}</p>
                            <p className="text-white/40 text-sm">Redirecting to login...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Reset Failed</h1>
                            <p className="text-white/60 mb-6">{message}</p>
                            <Link
                                href="/forgot-password"
                                className="inline-block px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Request New Link
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
