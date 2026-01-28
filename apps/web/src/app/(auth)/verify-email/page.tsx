'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function VerifyEmailPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get('token')

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = useState('')

    useEffect(() => {
        if (!token) {
            setStatus('error')
            setMessage('No verification token provided')
            return
        }

        // Verify the email
        const verifyEmail = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/verify-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                })

                const data = await res.json()

                if (res.ok) {
                    setStatus('success')
                    setMessage(data.message || 'Email verified successfully!')
                    // Redirect to login after 3 seconds
                    setTimeout(() => {
                        router.push('/login?verified=true')
                    }, 3000)
                } else {
                    setStatus('error')
                    setMessage(data.detail || 'Failed to verify email')
                }
            } catch (error) {
                setStatus('error')
                setMessage('An error occurred. Please try again.')
            }
        }

        verifyEmail()
    }, [token, router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="w-full max-w-md p-8">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 text-center">
                    {status === 'loading' && (
                        <>
                            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                                <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Verifying your email...</h1>
                            <p className="text-white/60">Please wait while we verify your email address.</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Email Verified! ✨</h1>
                            <p className="text-white/60 mb-6">{message}</p>
                            <p className="text-white/40 text-sm">Redirecting to login...</p>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
                            <p className="text-white/60 mb-6">{message}</p>
                            <Link
                                href="/login"
                                className="inline-block px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Go to Login
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
