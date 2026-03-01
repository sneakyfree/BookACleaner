'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    AlertTriangle, CheckCircle, Clock, Eye,
    DollarSign, User, Filter, ChevronDown, Loader2
} from 'lucide-react'
import { useAdminDisputes, useResolveDispute } from '@/hooks/use-api'

interface Dispute {
    id: string
    job_id: string
    job_title: string
    raised_by_name: string
    raised_by_email: string
    reason: string
    status: string
    created_at: string
    resolved_at?: string
    resolution_notes?: string
}

export default function AdminDisputesPage() {
    const [statusFilter, setStatusFilter] = useState('all')
    const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
    const [resolutionNotes, setResolutionNotes] = useState('')

    const { data: rawData, isLoading: loading, error } = useAdminDisputes(1, statusFilter !== 'all' ? statusFilter : undefined)
    const resolveMut = useResolveDispute()

    const disputes: Dispute[] = rawData?.disputes || rawData || []
    const resolving = resolveMut.isPending

    const handleResolve = (disputeId: string, action: string) => {
        resolveMut.mutate(
            { id: disputeId, data: { resolution_notes: resolutionNotes, action } },
            {
                onSuccess: () => {
                    setSelectedDispute(null)
                    setResolutionNotes('')
                },
            }
        )
    }

    const getStatusBadge = (status: string) => {
        const config: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
            open: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-500/20', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
            investigating: { color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-500/20', icon: <Eye className="w-3.5 h-3.5" /> },
            resolved: { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-500/20', icon: <CheckCircle className="w-3.5 h-3.5" /> },
            closed: { color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-500/20', icon: <CheckCircle className="w-3.5 h-3.5" /> },
        }
        const c = config[status] || config.open
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.color}`}>
                {c.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Dispute Resolution</h1>
                    <p className="text-muted-foreground mt-1">Manage and resolve user disputes</p>
                </div>
                <div className="flex items-center gap-2">
                    {['all', 'open', 'investigating', 'resolved'].map(s => (
                        <Button
                            key={s}
                            variant={statusFilter === s ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter(s)}
                        >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-xl">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{disputes.filter(d => d.status === 'open').length}</p>
                            <p className="text-sm text-muted-foreground">Open</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-xl">
                            <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{disputes.filter(d => d.status === 'investigating').length}</p>
                            <p className="text-sm text-muted-foreground">Investigating</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-500/20 rounded-xl">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{disputes.filter(d => d.status === 'resolved').length}</p>
                            <p className="text-sm text-muted-foreground">Resolved</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dispute List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                    <span className="ml-3 text-muted-foreground">Loading disputes...</span>
                </div>
            ) : disputes.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No disputes found</p>
                    <p className="text-sm mt-1">{statusFilter !== 'all' ? 'Try changing the filter' : 'All clear!'}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {disputes.map(dispute => (
                        <Card key={dispute.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold">{dispute.job_title}</h3>
                                            {getStatusBadge(dispute.status)}
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2">{dispute.reason}</p>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <User className="w-3 h-3" /> {dispute.raised_by_name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {new Date(dispute.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {dispute.resolution_notes && (
                                            <div className="mt-3 p-3 bg-green-50 dark:bg-green-500/10 rounded-lg text-sm">
                                                <span className="font-medium text-green-700 dark:text-green-400">Resolution: </span>
                                                {dispute.resolution_notes}
                                            </div>
                                        )}
                                        {/* Mini Timeline */}
                                        <div className="mt-3 flex items-center gap-2 text-[10px]">
                                            <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400">
                                                Opened {new Date(dispute.created_at).toLocaleDateString()}
                                            </span>
                                            {dispute.status === 'investigating' && (
                                                <>
                                                    <span className="text-white/20">→</span>
                                                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 animate-pulse">Investigating</span>
                                                </>
                                            )}
                                            {(dispute.status === 'resolved' || dispute.status === 'closed') && dispute.resolved_at && (
                                                <>
                                                    <span className="text-white/20">→</span>
                                                    <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400">
                                                        Resolved {new Date(dispute.resolved_at).toLocaleDateString()}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {dispute.status !== 'resolved' && dispute.status !== 'closed' && (
                                        <Button
                                            size="sm"
                                            onClick={() => setSelectedDispute(dispute)}
                                        >
                                            Resolve
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Resolution Modal */}
            {selectedDispute && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg">
                        <CardHeader>
                            <CardTitle>Resolve Dispute</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="font-medium">{selectedDispute.job_title}</p>
                                <p className="text-sm text-muted-foreground mt-1">{selectedDispute.reason}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Resolution Notes</label>
                                <textarea
                                    rows={3}
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl bg-background resize-none"
                                    placeholder="Describe the resolution..."
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    onClick={() => handleResolve(selectedDispute.id, 'refund_client')}
                                    disabled={resolving || !resolutionNotes}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    <DollarSign className="w-4 h-4 mr-1" /> Refund Client
                                </Button>
                                <Button
                                    onClick={() => handleResolve(selectedDispute.id, 'pay_cleaner')}
                                    disabled={resolving || !resolutionNotes}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    Pay Cleaner
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleResolve(selectedDispute.id, 'dismiss')}
                                    disabled={resolving || !resolutionNotes}
                                >
                                    Dismiss
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => { setSelectedDispute(null); setResolutionNotes('') }}
                                >
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
