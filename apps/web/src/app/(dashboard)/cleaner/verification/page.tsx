'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    CheckCircle,
    Circle,
    Lock,
    Mail,
    Phone,
    FileText,
    Shield,
    Award,
    AlertCircle,
    Upload,
    Loader2,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/auth/api-client'

interface VerificationStatus {
    tier: number
    tier_name: string
    verifications: Record<string, { status: string; verified_at?: string }>
    next_tier_requirements: Array<{ type: string; label: string; completed: boolean }>
    progress_percentage: number
}

const TIER_COLORS: Record<number, string> = {
    1: 'bg-gray-500',
    2: 'bg-blue-500',
    3: 'bg-green-500',
    4: 'bg-amber-500',
    5: 'bg-purple-500',
}

const TIER_NAMES: Record<number, string> = {
    1: 'Starter',
    2: 'Verified',
    3: 'Professional',
    4: 'Certified',
    5: 'Elite',
}

const VERIFICATION_ICONS: Record<string, any> = {
    email: Mail,
    phone: Phone,
    id: FileText,
    business_license: FileText,
    insurance: Shield,
    certification: Award,
    background_check: Shield,
}

export default function VerificationPage() {
    const queryClient = useQueryClient()
    const [error, setError] = useState('')

    // Phone verification state
    const [phoneNumber, setPhoneNumber] = useState('')
    const [verifyCode, setVerifyCode] = useState('')
    const [phoneSending, setPhoneSending] = useState(false)
    const [phoneVerifying, setPhoneVerifying] = useState(false)
    const [phoneStep, setPhoneStep] = useState<'input' | 'verify'>('input')
    const [phoneMessage, setPhoneMessage] = useState('')

    // Upload state
    const [uploading, setUploading] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const pendingUploadType = useRef<string | null>(null)

    const { data: status, isLoading: loading } = useQuery<VerificationStatus | null>({
        queryKey: ['verification-status'],
        queryFn: async () => {
            try {
                return await apiFetch('/api/v1/verification/status')
            } catch {
                setError('Failed to fetch verification status')
                return null
            }
        },
    })

    const refetchStatus = () => queryClient.invalidateQueries({ queryKey: ['verification-status'] })

    const sendPhoneCode = async () => {
        setPhoneSending(true)
        setPhoneMessage('')
        try {
            await apiFetch('/api/v1/verification/phone/send', {
                method: 'POST',
                body: JSON.stringify({ phone: phoneNumber }),
            })
            setPhoneStep('verify')
            setPhoneMessage('Code sent! Check your phone.')
        } catch (err: any) {
            setPhoneMessage(err?.detail || 'Failed to send code')
        } finally {
            setPhoneSending(false)
        }
    }

    const verifyPhoneCode = async () => {
        setPhoneVerifying(true)
        setPhoneMessage('')
        try {
            await apiFetch('/api/v1/verification/phone/verify', {
                method: 'POST',
                body: JSON.stringify({ code: verifyCode }),
            })
            setPhoneMessage('Phone verified!')
            setPhoneStep('input')
            setPhoneNumber('')
            setVerifyCode('')
            refetchStatus()
        } catch (err: any) {
            setPhoneMessage(err?.detail || 'Invalid code')
        } finally {
            setPhoneVerifying(false)
        }
    }

    const uploadDocument = (type: string) => {
        pendingUploadType.current = type
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
            fileInputRef.current.click()
        }
    }

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        const type = pendingUploadType.current
        if (!file || !type) return

        setUploading(type)
        try {
            const fd = new FormData()
            fd.append('file', file)
            await apiFetch(`/api/v1/verification/upload/${type}`, {
                method: 'POST',
                body: fd,
                headers: {},  // Let browser set Content-Type with boundary
            })
            refetchStatus()
        } catch {
            setError(`Failed to upload ${type.replace('_', ' ')}`)
        } finally {
            setUploading(null)
            pendingUploadType.current = null
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const currentTier = status?.tier || 1
    const progressPercent = status?.progress_percentage || 0
    const verifications = status?.verifications || {}

    const allTiers = [1, 2, 3, 4, 5].map(tier => ({
        tier,
        name: TIER_NAMES[tier],
        color: TIER_COLORS[tier],
    }))

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Hidden file input for document uploads */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={handleFileSelected}
            />
            <div>
                <h1 className="text-2xl font-bold">Verification Center</h1>
                <p className="text-muted-foreground mt-1">
                    Complete verifications to unlock higher tiers and build trust with clients
                </p>
            </div>

            {/* Progress Overview */}
            <Card className="bg-gradient-to-r from-slate-800 to-slate-700 text-white border-0">
                <CardContent className="py-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm text-white/60">Current Level</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${TIER_COLORS[currentTier]}`}>
                                    Tier {currentTier}
                                </span>
                                <span className="text-xl font-bold">{TIER_NAMES[currentTier]}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-white/60">Overall Progress</p>
                            <p className="text-2xl font-bold">{progressPercent}%</p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    {/* Tier indicators */}
                    <div className="flex justify-between mt-4">
                        {allTiers.map((tier) => (
                            <div
                                key={tier.tier}
                                className={`flex flex-col items-center ${tier.tier <= currentTier ? 'opacity-100' : 'opacity-40'}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tier.color}`}>
                                    {tier.tier <= currentTier ? (
                                        <CheckCircle className="w-5 h-5 text-white" />
                                    ) : tier.tier === currentTier + 1 ? (
                                        <Circle className="w-5 h-5 text-white" />
                                    ) : (
                                        <Lock className="w-4 h-4 text-white/60" />
                                    )}
                                </div>
                                <span className="text-xs mt-1 text-white/60">{tier.name}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Next Steps */}
            {status?.next_tier_requirements && status.next_tier_requirements.length > 0 && (
                <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="py-4">
                        <div className="flex items-start gap-4">
                            <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                            <div>
                                <p className="font-medium">Complete Tier {currentTier + 1} to unlock more clients</p>
                                <p className="text-sm text-muted-foreground">
                                    {currentTier + 1 === 3 && 'Professional tier cleaners receive 3x more booking requests.'}
                                    {currentTier + 1 === 4 && 'Certified cleaners are featured in premium search results.'}
                                    {currentTier + 1 === 5 && 'Elite cleaners have the highest booking rates and can charge premium rates.'}
                                    {' '}Complete the requirements below to level up.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Verification Items */}
            <div className="space-y-4">
                {/* Email Verification */}
                <Card>
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${verifications.email?.status === 'verified' ? 'bg-green-100' : 'bg-slate-100'}`}>
                                    <Mail className={`w-5 h-5 ${verifications.email?.status === 'verified' ? 'text-green-600' : 'text-slate-500'}`} />
                                </div>
                                <div>
                                    <p className="font-medium">Email Verification</p>
                                    <p className="text-sm text-muted-foreground">Verify your email address</p>
                                </div>
                            </div>
                            {verifications.email?.status === 'verified' ? (
                                <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                    <CheckCircle className="w-4 h-4" />
                                    Verified
                                </span>
                            ) : (
                                <Button size="sm" variant="outline">Verify Email</Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Phone Verification */}
                <Card>
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${verifications.phone?.status === 'verified' ? 'bg-green-100' : 'bg-slate-100'}`}>
                                    <Phone className={`w-5 h-5 ${verifications.phone?.status === 'verified' ? 'text-green-600' : 'text-slate-500'}`} />
                                </div>
                                <div>
                                    <p className="font-medium">Phone Verification</p>
                                    <p className="text-sm text-muted-foreground">Verify your phone number via SMS</p>
                                </div>
                            </div>
                            {verifications.phone?.status === 'verified' ? (
                                <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                    <CheckCircle className="w-4 h-4" />
                                    Verified
                                </span>
                            ) : phoneStep === 'input' ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="tel"
                                        placeholder="+1234567890"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="w-40"
                                    />
                                    <Button size="sm" onClick={sendPhoneCode} disabled={phoneSending || !phoneNumber}>
                                        {phoneSending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Code'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="text"
                                        placeholder="123456"
                                        value={verifyCode}
                                        onChange={(e) => setVerifyCode(e.target.value)}
                                        className="w-24"
                                        maxLength={6}
                                    />
                                    <Button size="sm" onClick={verifyPhoneCode} disabled={phoneVerifying || verifyCode.length !== 6}>
                                        {phoneVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                                    </Button>
                                </div>
                            )}
                        </div>
                        {phoneMessage && (
                            <p className={`text-sm mt-2 ${phoneMessage.includes('verified') || phoneMessage.includes('sent') ? 'text-green-600' : 'text-red-500'}`}>
                                {phoneMessage}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Document Verifications */}
                {['id', 'business_license', 'insurance', 'certification'].map((type) => {
                    const Icon = VERIFICATION_ICONS[type] || FileText
                    const isVerified = verifications[type]?.status === 'verified'
                    const isPending = verifications[type]?.status === 'pending'
                    const labels: Record<string, string> = {
                        id: 'Government ID',
                        business_license: 'Business License',
                        insurance: 'Liability Insurance',
                        certification: 'Industry Certification (IICRC, EPA)',
                    }

                    return (
                        <Card key={type}>
                            <CardContent className="py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isVerified ? 'bg-green-100' : 'bg-slate-100'}`}>
                                            <Icon className={`w-5 h-5 ${isVerified ? 'text-green-600' : 'text-slate-500'}`} />
                                        </div>
                                        <div>
                                            <p className="font-medium">{labels[type]}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {isPending ? 'Under review (24-48 hours)' : 'Upload for verification'}
                                            </p>
                                        </div>
                                    </div>
                                    {isVerified ? (
                                        <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                            <CheckCircle className="w-4 h-4" />
                                            Verified
                                        </span>
                                    ) : isPending ? (
                                        <span className="flex items-center gap-1 text-amber-600 text-sm font-medium">
                                            <Loader2 className="w-4 h-4" />
                                            Pending
                                        </span>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => uploadDocument(type)}
                                            disabled={uploading === type}
                                        >
                                            {uploading === type ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Upload className="w-4 h-4 mr-1" />
                                                    Upload
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}

                {/* Background Check — Checkr Integration */}
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${verifications.background_check?.status === 'verified'
                                    ? 'bg-green-100'
                                    : verifications.background_check?.status === 'pending'
                                        ? 'bg-blue-100'
                                        : 'bg-slate-100'
                                    }`}>
                                    <Shield className={`w-5 h-5 ${verifications.background_check?.status === 'verified'
                                        ? 'text-green-600'
                                        : verifications.background_check?.status === 'pending'
                                            ? 'text-blue-600'
                                            : 'text-slate-500'
                                        }`} />
                                </div>
                                <div>
                                    <p className="font-medium">Background Check</p>
                                    <p className="text-sm text-muted-foreground">
                                        {verifications.background_check?.status === 'verified'
                                            ? 'Passed — verified by Checkr'
                                            : verifications.background_check?.status === 'pending'
                                                ? 'Processing via Checkr (3-5 business days)'
                                                : 'Powered by Checkr — required for Tier 4+'}
                                    </p>
                                </div>
                            </div>
                            {verifications.background_check?.status === 'verified' ? (
                                <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                    <CheckCircle className="w-4 h-4" />
                                    Passed
                                </span>
                            ) : verifications.background_check?.status === 'pending' ? (
                                <div className="text-right">
                                    <span className="flex items-center gap-1 text-blue-600 text-sm font-medium">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing
                                    </span>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">est. 3-5 days</p>
                                </div>
                            ) : (
                                <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => uploadDocument('background_check')}
                                    disabled={uploading === 'background_check'}
                                >
                                    {uploading === 'background_check' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Shield className="w-4 h-4 mr-1" />
                                            Initiate Check
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

