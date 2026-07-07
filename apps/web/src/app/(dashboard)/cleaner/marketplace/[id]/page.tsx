'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    MapPin, Clock, ArrowLeft, DollarSign, Loader2, AlertCircle,
    CheckCircle, Briefcase, Home, Star, Send
} from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/auth/api-client'

interface MarketplaceJob {
    id: string
    title: string
    services: string[]
    total_price: number
    address?: string
    city?: string
    scheduled_date?: string
    scheduled_time?: string
    description?: string
    bid_count?: number
    property?: { bedrooms?: number; bathrooms?: number; sqft?: number }
}

const serviceBadge = (service: string) => {
    const colors: Record<string, string> = {
        deep_clean: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
        turnover: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
        standard: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
        move_out: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
    }
    return colors[service] || 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300'
}

export default function MarketplaceJobBidPage() {
    const params = useParams()
    const router = useRouter()
    const jobId = params?.id as string

    const [amount, setAmount] = useState('')
    const [message, setMessage] = useState('')
    const [estimatedHours, setEstimatedHours] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    // A browsing cleaner can't GET /jobs/{id} (not assigned → 403), so we source
    // the job from the marketplace listing, which returns full open-job objects.
    const { data: rawData, isLoading: loading, error: loadError } = useQuery({
        queryKey: ['marketplace-jobs'],
        queryFn: () => apiFetch('/api/v1/bids/marketplace'),
    })

    const job: MarketplaceJob | undefined = useMemo(() => {
        const jobs: MarketplaceJob[] = (rawData as any)?.jobs || []
        return jobs.find((j) => j.id === jobId)
    }, [rawData, jobId])

    const handleSubmit = async () => {
        setError('')
        const amt = parseFloat(amount)
        if (!amt || amt <= 0) {
            setError('Please enter a valid bid amount')
            return
        }
        setSubmitting(true)
        try {
            await apiFetch(`/api/v1/bids/jobs/${jobId}/bids`, {
                method: 'POST',
                body: JSON.stringify({
                    job_id: jobId,
                    amount: amt,
                    message: message || undefined,
                    estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
                }),
            })
            setSuccess(true)
        } catch (err: any) {
            setError(err?.detail || 'Failed to submit bid')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        )
    }

    if (loadError || !job) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <p className="text-lg font-medium">This job is no longer available</p>
                    <p className="text-muted-foreground mt-1">It may have been assigned or removed from the marketplace.</p>
                    <Link href="/cleaner/marketplace">
                        <Button className="mt-4">Back to Marketplace</Button>
                    </Link>
                </CardContent>
            </Card>
        )
    }

    if (success) {
        return (
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardContent className="py-14 text-center">
                        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-9 h-9 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Bid Submitted!</h2>
                        <p className="text-muted-foreground">
                            Your bid of <span className="font-semibold text-brand-600">${parseFloat(amount).toFixed(2)}</span> for
                            &quot;{job.title}&quot; has been sent to the client. You&apos;ll be notified if it&apos;s accepted.
                        </p>
                        <div className="flex gap-3 justify-center mt-6">
                            <Link href="/cleaner/bids">
                                <Button>View My Bids</Button>
                            </Link>
                            <Link href="/cleaner/marketplace">
                                <Button variant="outline">Browse More Jobs</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <Link href="/cleaner/marketplace" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition w-fit">
                <ArrowLeft className="w-4 h-4" /> Back to Marketplace
            </Link>

            {/* Job Detail */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-brand-500" /> {job.title}
                        </CardTitle>
                        <p className="text-2xl font-bold text-brand-600 whitespace-nowrap">${job.total_price}</p>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {(job.services || []).map((s) => (
                            <span key={s} className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${serviceBadge(s)}`}>
                                {s.replace(/_/g, ' ')}
                            </span>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        {job.city && (
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span>{job.city}</span>
                            </div>
                        )}
                        {job.scheduled_date && (
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span>{new Date(job.scheduled_date).toLocaleDateString()} {job.scheduled_time || ''}</span>
                            </div>
                        )}
                        {job.property && (job.property.bedrooms || job.property.bathrooms) && (
                            <div className="flex items-center gap-2">
                                <Home className="w-4 h-4 text-muted-foreground" />
                                <span>{job.property.bedrooms || 0} bed • {job.property.bathrooms || 0} bath</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-muted-foreground" />
                            <span>{job.bid_count || 0} existing bids</span>
                        </div>
                    </div>
                    {job.description && (
                        <div className="pt-2 border-t">
                            <p className="text-sm font-medium mb-1">Details</p>
                            <p className="text-sm text-muted-foreground">{job.description}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Bid Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-brand-500" /> Submit Your Bid
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1.5 block">Your Bid Amount (USD)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="number"
                                min="1"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder={String(job.total_price || '')}
                                className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-background focus:ring-2 focus:ring-brand-500 outline-none transition"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Client&apos;s budget: ${job.total_price}</p>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1.5 block">Estimated Hours (optional)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={estimatedHours}
                            onChange={(e) => setEstimatedHours(e.target.value)}
                            placeholder="e.g. 3"
                            className="w-full px-4 py-2.5 border rounded-xl bg-background focus:ring-2 focus:ring-brand-500 outline-none transition"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1.5 block">Message to Client (optional)</label>
                        <textarea
                            rows={4}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Introduce yourself, describe your approach, availability, etc."
                            className="w-full px-4 py-2.5 border rounded-xl bg-background resize-none focus:ring-2 focus:ring-brand-500 outline-none transition"
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-sm text-red-500">
                            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                        </div>
                    )}

                    <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {submitting ? 'Submitting Bid...' : 'Submit Bid'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
