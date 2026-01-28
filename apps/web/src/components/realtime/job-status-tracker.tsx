'use client'

import { useEffect, useState } from 'react'
import { Clock, CheckCircle2, Play, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useJobUpdates } from '@/hooks/use-websocket'

interface JobStatusTrackerProps {
    jobId: string
    initialStatus?: string
    onStatusChange?: (status: string) => void
    className?: string
}

const statusConfig: Record<string, {
    label: string
    icon: React.ReactNode
    color: string
    bgColor: string
    description: string
}> = {
    pending: {
        label: 'Pending',
        icon: <Clock className="w-5 h-5" />,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        description: 'Waiting for cleaner confirmation',
    },
    accepted: {
        label: 'Accepted',
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        description: 'Cleaner has accepted the job',
    },
    in_progress: {
        label: 'In Progress',
        icon: <Play className="w-5 h-5" />,
        color: 'text-violet-600',
        bgColor: 'bg-violet-50',
        description: 'Cleaning is currently in progress',
    },
    completed: {
        label: 'Completed',
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        description: 'Job completed successfully',
    },
    cancelled: {
        label: 'Cancelled',
        icon: <XCircle className="w-5 h-5" />,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        description: 'Job was cancelled',
    },
    declined: {
        label: 'Declined',
        icon: <XCircle className="w-5 h-5" />,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        description: 'Cleaner declined the job',
    },
}

const statusOrder = ['pending', 'accepted', 'in_progress', 'completed']

export function JobStatusTracker({
    jobId,
    initialStatus = 'pending',
    onStatusChange,
    className = '',
}: JobStatusTrackerProps) {
    const [currentStatus, setCurrentStatus] = useState(initialStatus)
    const { getJobStatus, isConnected } = useJobUpdates([jobId])

    // Watch for real-time updates
    useEffect(() => {
        const update = getJobStatus(jobId)
        if (update?.status && update.status !== currentStatus) {
            setCurrentStatus(update.status)
            onStatusChange?.(update.status)
        }
    }, [getJobStatus, jobId, currentStatus, onStatusChange])

    const config = statusConfig[currentStatus] || statusConfig.pending
    const currentStepIndex = statusOrder.indexOf(currentStatus)
    const isCancelledOrDeclined = ['cancelled', 'declined'].includes(currentStatus)

    return (
        <div className={`bg-white rounded-xl border overflow-hidden ${className}`}>
            {/* Current Status */}
            <div className={`p-4 ${config.bgColor} border-b`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`${config.color}`}>
                            {config.icon}
                        </div>
                        <div>
                            <h3 className={`font-semibold ${config.color}`}>
                                {config.label}
                            </h3>
                            <p className="text-sm text-gray-600">{config.description}</p>
                        </div>
                    </div>
                    {!isConnected && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Connecting...
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Timeline */}
            {!isCancelledOrDeclined && (
                <div className="p-4">
                    <div className="relative">
                        {/* Progress Line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                        <div
                            className="absolute left-4 top-0 w-0.5 bg-violet-600 transition-all duration-500"
                            style={{
                                height: `${(currentStepIndex / (statusOrder.length - 1)) * 100}%`
                            }}
                        />

                        {/* Steps */}
                        <div className="space-y-6">
                            {statusOrder.map((status, index) => {
                                const stepConfig = statusConfig[status]
                                const isCompleted = index < currentStepIndex
                                const isCurrent = index === currentStepIndex
                                const isPending = index > currentStepIndex

                                return (
                                    <div key={status} className="flex items-center gap-4 relative">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${isCompleted
                                                    ? 'bg-violet-600 text-white'
                                                    : isCurrent
                                                        ? 'bg-violet-100 border-2 border-violet-600 text-violet-600'
                                                        : 'bg-gray-100 text-gray-400'
                                                }`}
                                        >
                                            {isCompleted ? (
                                                <CheckCircle2 className="w-4 h-4" />
                                            ) : (
                                                <span className="text-sm font-medium">{index + 1}</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p
                                                className={`font-medium ${isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                                                    }`}
                                            >
                                                {stepConfig.label}
                                            </p>
                                            {isCurrent && (
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {stepConfig.description}
                                                </p>
                                            )}
                                        </div>
                                        {isCurrent && (
                                            <span className="flex items-center gap-1 text-xs text-violet-600 bg-violet-50 px-2 py-1 rounded-full">
                                                <span className="w-1.5 h-1.5 bg-violet-600 rounded-full animate-pulse" />
                                                Current
                                            </span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Cancelled/Declined State */}
            {isCancelledOrDeclined && (
                <div className="p-4 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                        This job is no longer active
                    </p>
                </div>
            )}
        </div>
    )
}

export default JobStatusTracker
