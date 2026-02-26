'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    FileText,
    CheckCircle,
    Clock,
    Loader2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Agreement {
    id: string
    job_id: string
    role: string
    agreement_type: string
    version: string
    accepted: boolean
    accepted_at?: string
    job_title?: string
    job_status?: string
}

export default function ClientAgreementsPage() {
    const { data: session } = useSession()
    const [agreements, setAgreements] = useState<Agreement[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    useEffect(() => {
        const token = (session as any)?.accessToken
        if (!token) { setLoading(false); return }

        async function fetchAgreements() {
            try {
                const res = await fetch(`${API_URL}/api/v1/agreements/my`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (!res.ok) throw new Error(`Failed to load agreements (${res.status})`)
                const data = await res.json()
                setAgreements(data.agreements || [])
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load agreements')
            } finally {
                setLoading(false)
            }
        }

        fetchAgreements()
    }, [session])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                    <p className="text-lg font-medium text-red-600">{error}</p>
                    <Button className="mt-4" onClick={() => window.location.reload()}>Try Again</Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Service Agreements</h1>
                <p className="text-muted-foreground mt-1">
                    Your accepted service agreements for each booking
                </p>
            </div>

            {agreements.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No agreements yet</p>
                        <p className="text-muted-foreground mt-1">
                            Agreements are created when you complete a booking.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {agreements.map((agreement) => (
                        <Card key={agreement.id}>
                            <CardContent className="p-4">
                                <div
                                    className="flex items-center justify-between cursor-pointer"
                                    onClick={() => setExpandedId(expandedId === agreement.id ? null : agreement.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium capitalize">
                                                {agreement.agreement_type} Agreement
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {agreement.job_title || `Job ${agreement.job_id.slice(0, 8)}...`}
                                                {agreement.job_status && (
                                                    <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs capitalize">
                                                        {agreement.job_status}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-muted-foreground">
                                            {agreement.accepted_at
                                                ? new Date(agreement.accepted_at).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric', year: 'numeric'
                                                })
                                                : ''}
                                        </span>
                                        {expandedId === agreement.id ? (
                                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </div>
                                </div>

                                {expandedId === agreement.id && (
                                    <div className="mt-4 pt-4 border-t text-sm space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Agreement ID</span>
                                            <span className="font-mono text-xs">{agreement.id}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Type</span>
                                            <span className="capitalize">{agreement.agreement_type}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Version</span>
                                            <span>{agreement.version}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Role</span>
                                            <span className="capitalize">{agreement.role}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Status</span>
                                            <span className="text-green-600 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Accepted
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
