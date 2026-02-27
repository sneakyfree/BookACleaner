'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    MapPin, Clock, DollarSign, User, ArrowLeft, CheckCircle,
    AlertCircle, MessageSquare, Star, Play, Camera, Loader2, RotateCcw, Sparkles, ChevronDown
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type JobStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'

interface JobDetail {
    id: string
    title: string
    status: JobStatus
    services: string[]
    total_price: number
    scheduled_date: string
    scheduled_time?: string
    address: string
    city: string
    description?: string
    cleaner_name?: string
    cleaner_rating?: number
    client_name?: string
    payment_status?: string
    created_at?: string
    started_at?: string
    completed_at?: string
}

const STATUS_CONFIG: Record<JobStatus, { color: string; bg: string; label: string }> = {
    pending: { color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-500/20', label: 'Pending' },
    confirmed: { color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-500/20', label: 'Confirmed' },
    in_progress: { color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-500/20', label: 'In Progress' },
    completed: { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-500/20', label: 'Completed' },
    cancelled: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-500/20', label: 'Cancelled' },
    disputed: { color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-500/20', label: 'Disputed' },
}

export default function JobDetailPage() {
    const { data: session } = useSession()
    const params = useParams()
    const jobId = params?.id as string
    const [job, setJob] = useState<JobDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [showReviewForm, setShowReviewForm] = useState(false)
    const [reviewRating, setReviewRating] = useState(5)
    const [reviewText, setReviewText] = useState('')
    const [showRefundModal, setShowRefundModal] = useState(false)
    const [refundReason, setRefundReason] = useState('')
    const [aiSummary, setAiSummary] = useState<string | null>(null)
    const [aiExpanded, setAiExpanded] = useState(false)
    const [aiLoading, setAiLoading] = useState(false)
    const [refundLoading, setRefundLoading] = useState(false)

    useEffect(() => {
        const token = (session as any)?.accessToken
        if (!token) {
            setLoading(false)
            return
        }
        fetchJob()
    }, [jobId, session])

    const fetchJob = async () => {
        try {
            setError(null)
            const token = (session as any)?.accessToken
            const res = await fetch(`${API_URL}/api/v1/jobs/${jobId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (!res.ok) {
                throw new Error(`Failed to load job (${res.status})`)
            }
            setJob(await res.json())
        } catch (err) {
            console.error('Failed to fetch job:', err)
            setError(err instanceof Error ? err.message : 'Failed to load job details')
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (action: string) => {
        setActionLoading(true)
        try {
            const token = (session as any)?.accessToken
            await fetch(`${API_URL}/api/v1/jobs/${jobId}/${action}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            })
            fetchJob()
        } catch (err) {
            console.error(`Action ${action} failed:`, err)
        } finally {
            setActionLoading(false)
        }
    }

    const handleSubmitReview = async () => {
        setActionLoading(true)
        try {
            const token = (session as any)?.accessToken
            await fetch(`${API_URL}/api/v1/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    job_id: jobId,
                    overall_rating: reviewRating,
                    text: reviewText,
                })
            })
            setShowReviewForm(false)
        } catch (err) {
            console.error('Failed to submit review:', err)
        } finally {
            setActionLoading(false)
        }
    }

    const handleRefundRequest = async () => {
        if (!refundReason) return
        setRefundLoading(true)
        try {
            const token = (session as any)?.accessToken
            const res = await fetch(`${API_URL}/api/v1/payments/refund/${job?.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ reason: refundReason }),
            })
            if (!res.ok) throw new Error('Refund request failed')
            toast.success('Refund request submitted successfully')
            setShowRefundModal(false)
            setRefundReason('')
            fetchJob()
        } catch (err) {
            toast.error('Failed to submit refund request')
        } finally {
            setRefundLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        )
    }

    if (error || !job) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <p className="text-lg font-medium">{error || 'Job not found'}</p>
                    <Link href="/client/bookings">
                        <Button className="mt-4">Back to Bookings</Button>
                    </Link>
                </CardContent>
            </Card>
        )
    }

    const statusConfig = STATUS_CONFIG[job.status]

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Back + Status */}
            <div className="flex items-center justify-between">
                <Link href="/client/bookings" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition">
                    <ArrowLeft className="w-4 h-4" /> Back to Bookings
                </Link>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                    {statusConfig.label}
                </span>
            </div>

            {/* Job Header */}
            <Card>
                <CardContent className="p-6">
                    <h1 className="text-2xl font-bold mb-2">{job.title}</h1>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-brand-100 dark:bg-brand-500/20 rounded-lg">
                                <DollarSign className="w-4 h-4 text-brand-600" />
                            </div>
                            <div>
                                <p className="text-lg font-bold">${job.total_price}</p>
                                <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                                <Clock className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">{new Date(job.scheduled_date).toLocaleDateString()}</p>
                                <p className="text-xs text-muted-foreground">{job.scheduled_time || 'TBD'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
                                <MapPin className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">{job.city}</p>
                                <p className="text-xs text-muted-foreground">{job.address}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                                <User className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">{job.cleaner_name || 'Unassigned'}</p>
                                {job.cleaner_rating && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Star className="w-3 h-3 text-amber-500" /> {job.cleaner_rating}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Status Tracker */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Job Progress</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2">
                        {['pending', 'confirmed', 'in_progress', 'completed'].map((step, i) => {
                            const steps = ['pending', 'confirmed', 'in_progress', 'completed']
                            const currentIdx = steps.indexOf(job.status)
                            const stepIdx = i
                            const isComplete = stepIdx <= currentIdx
                            const isCurrent = step === job.status

                            return (
                                <div key={step} className="flex items-center gap-2 flex-1">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition
                                        ${isComplete ? 'bg-brand-600 text-white' : isCurrent ? 'bg-brand-100 text-brand-600 ring-2 ring-brand-600' : 'bg-muted text-muted-foreground'}`}>
                                        {isComplete ? <CheckCircle className="w-4 h-4" /> : i + 1}
                                    </div>
                                    {i < 3 && (
                                        <div className={`h-0.5 flex-1 rounded ${isComplete ? 'bg-brand-600' : 'bg-muted'}`} />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>Booked</span>
                        <span>Confirmed</span>
                        <span>In Progress</span>
                        <span>Complete</span>
                    </div>
                </CardContent>
            </Card>

            {/* Escrow Payment Status */}
            {job.payment_status && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <DollarSign className="w-4 h-4" /> Payment Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-3">
                            {['authorized', 'held', 'released'].map((stage, i) => {
                                const stageMap: Record<string, number> = {
                                    pending: -1, authorized: 0, held: 1,
                                    captured: 2, released: 2, refunded: 2
                                }
                                const currentStage = stageMap[job.payment_status || ''] ?? -1
                                const isComplete = i <= currentStage
                                const labels = ['Authorized', 'Held in Escrow', 'Released to Cleaner']
                                const icons = ['💳', '🔒', '✅']

                                return (
                                    <div key={stage} className="flex items-center gap-2 flex-1">
                                        <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${isComplete
                                            ? 'bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300'
                                            : 'bg-muted text-muted-foreground'
                                            }`}>
                                            <span>{icons[i]}</span>
                                            {labels[i]}
                                        </div>
                                        {i < 2 && (
                                            <div className={`h-0.5 flex-1 rounded ${isComplete ? 'bg-brand-500' : 'bg-muted'}`} />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        {job.payment_status === 'released' && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-3 flex items-center gap-1">
                                ✅ Payment has been released to your cleaner
                            </p>
                        )}
                        {job.payment_status === 'held' && (
                            <p className="text-xs text-muted-foreground mt-3">
                                🔒 Your payment is safely held in escrow until the job is completed
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* AI Job Summary */}
            {job.status === 'completed' && (
                <Card>
                    <button
                        onClick={async () => {
                            setAiExpanded(!aiExpanded)
                            if (!aiSummary && !aiLoading) {
                                setAiLoading(true)
                                try {
                                    const token = (session as any)?.accessToken
                                    const res = await fetch(`${API_URL}/api/v1/ai/job-summary`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                        body: JSON.stringify({ job_id: job.id, title: job.title, services: job.services, total_price: job.total_price }),
                                    })
                                    if (res.ok) {
                                        const data = await res.json()
                                        setAiSummary(data.summary || data.message || 'Summary generated successfully.')
                                    } else {
                                        setAiSummary('Unable to generate summary at this time.')
                                    }
                                } catch { setAiSummary('Unable to generate summary at this time.') }
                                setAiLoading(false)
                            }
                        }}
                        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition rounded-t-xl"
                    >
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Sparkles className="w-4 h-4 text-brand-500" />
                            AI Job Summary
                        </div>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${aiExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {aiExpanded && (
                        <CardContent className="pt-0">
                            {aiLoading ? (
                                <div className="space-y-2">
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-full" />
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-5/6" />
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiSummary}</p>
                            )}
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Description */}
            {job.description && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Special Instructions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{job.description}</p>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
                {job.status === 'pending' && (
                    <>
                        <Button onClick={() => handleAction('accept')} disabled={actionLoading} className="gap-2">
                            <CheckCircle className="w-4 h-4" /> Accept
                        </Button>
                        <Button variant="outline" onClick={() => handleAction('decline')} disabled={actionLoading} className="gap-2">
                            Decline
                        </Button>
                    </>
                )}
                {job.status === 'confirmed' && (
                    <Button onClick={() => handleAction('start')} disabled={actionLoading} className="gap-2">
                        <Play className="w-4 h-4" /> Start Job
                    </Button>
                )}
                {job.status === 'in_progress' && (
                    <Button onClick={() => handleAction('complete')} disabled={actionLoading} className="gap-2 bg-green-600 hover:bg-green-700">
                        <CheckCircle className="w-4 h-4" /> Mark Complete
                    </Button>
                )}
                {job.status === 'completed' && !showReviewForm && (
                    <Button onClick={() => setShowReviewForm(true)} className="gap-2">
                        <Star className="w-4 h-4" /> Leave Review
                    </Button>
                )}
                {(job.status === 'pending' || job.status === 'confirmed') && (
                    <Button variant="destructive" onClick={() => handleAction('cancel')} disabled={actionLoading}>
                        Cancel Job
                    </Button>
                )}
                <Link href={`/client/messages`}>
                    <Button variant="outline" className="gap-2">
                        <MessageSquare className="w-4 h-4" /> Message
                    </Button>
                </Link>
                {/* Refund button — shown for completed or cancelled jobs with payments */}
                {(job.status === 'completed' || job.status === 'cancelled') && job.payment_status && job.payment_status !== 'refunded' && (
                    <Button
                        variant="outline"
                        className="gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-500/10"
                        onClick={() => setShowRefundModal(true)}
                    >
                        <RotateCcw className="w-4 h-4" /> Request Refund
                    </Button>
                )}
            </div>

            {/* Review Form */}
            {showReviewForm && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Leave a Review</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Rating</label>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <button key={s} onClick={() => setReviewRating(s)}>
                                        <Star className={`w-8 h-8 transition ${s <= reviewRating ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Your Review</label>
                            <textarea
                                rows={3}
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl bg-background resize-none focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="How was the cleaning?"
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button onClick={handleSubmitReview} disabled={actionLoading}>
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Submit Review
                            </Button>
                            <Button variant="outline" onClick={() => setShowReviewForm(false)}>Cancel</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Refund Modal */}
            {showRefundModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <RotateCcw className="w-5 h-5 text-red-500" />
                                Request a Refund
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Refund of <strong>${job.total_price}</strong> for &quot;{job.title}&quot;
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Reason for refund</label>
                                <select
                                    value={refundReason}
                                    onChange={(e) => setRefundReason(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl bg-background focus:ring-2 focus:ring-brand-500 outline-none"
                                >
                                    <option value="">Select a reason...</option>
                                    <option value="quality">Quality not as expected</option>
                                    <option value="incomplete">Job not completed</option>
                                    <option value="no_show">Cleaner did not show up</option>
                                    <option value="scheduling">Scheduling issue</option>
                                    <option value="overcharged">Overcharged</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    onClick={handleRefundRequest}
                                    disabled={!refundReason || refundLoading}
                                    variant="destructive"
                                    className="flex-1"
                                >
                                    {refundLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Submit Refund Request
                                </Button>
                                <Button variant="outline" onClick={() => setShowRefundModal(false)} className="flex-1">
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
