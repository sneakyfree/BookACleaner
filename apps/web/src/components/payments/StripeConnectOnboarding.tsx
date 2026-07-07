'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Loader2,
    CheckCircle,
    XCircle,
    ExternalLink,
    CreditCard,
    Building2,
    AlertCircle,
} from 'lucide-react'

interface StripeConnectStatus {
    accountId?: string
    chargesEnabled: boolean
    payoutsEnabled: boolean
    detailsSubmitted: boolean
}

interface StripeConnectOnboardingProps {
    status?: StripeConnectStatus
    onStartOnboarding: () => Promise<string>
}

export function StripeConnectOnboarding({
    status,
    onStartOnboarding,
}: StripeConnectOnboardingProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleStartOnboarding = async () => {
        try {
            setIsLoading(true)
            setError(null)
            const onboardingUrl = await onStartOnboarding()
            if (!onboardingUrl) {
                setError('Payouts setup is not available yet. Please try again later or contact support.')
                setIsLoading(false)
                return
            }
            window.location.href = onboardingUrl
        } catch (err) {
            const detail = (err as any)?.detail || (err instanceof Error ? err.message : '')
            const status = (err as any)?.status
            // A 400 from Stripe Connect almost always means Connect/payouts is not
            // enabled on the platform account yet — surface a clear message rather
            // than silently doing nothing.
            if (status === 400) {
                setError('Payouts setup is not available yet. Please try again later or contact support.')
            } else {
                setError(detail || 'Failed to start onboarding. Please try again.')
            }
            setIsLoading(false)
        }
    }

    // Not connected yet
    if (!status?.accountId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Get Paid with Stripe
                    </CardTitle>
                    <CardDescription>
                        Connect your bank account to receive payments directly
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg space-y-2">
                        <h4 className="font-medium text-blue-700 dark:text-blue-400">
                            Why Stripe Connect?
                        </h4>
                        <ul className="text-sm text-blue-600 dark:text-blue-500 space-y-1">
                            <li>✓ Secure, encrypted payments</li>
                            <li>✓ Direct deposit to your bank account</li>
                            <li>✓ Fast payouts (1-2 business days)</li>
                            <li>✓ Track all earnings in one place</li>
                        </ul>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <Button
                        className="w-full bg-brand-500 hover:bg-brand-600"
                        size="lg"
                        onClick={handleStartOnboarding}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Setting up...
                            </>
                        ) : (
                            <>
                                <Building2 className="w-4 h-4 mr-2" />
                                Connect Bank Account
                            </>
                        )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                        You'll be redirected to Stripe's secure onboarding
                    </p>
                </CardContent>
            </Card>
        )
    }

    // Connected but incomplete
    if (!status.chargesEnabled || !status.payoutsEnabled || !status.detailsSubmitted) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        Complete Your Setup
                    </CardTitle>
                    <CardDescription>
                        A few more steps to start receiving payments
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <StatusItem
                            label="Details submitted"
                            isComplete={status.detailsSubmitted}
                        />
                        <StatusItem
                            label="Charges enabled"
                            isComplete={status.chargesEnabled}
                        />
                        <StatusItem
                            label="Payouts enabled"
                            isComplete={status.payoutsEnabled}
                        />
                    </div>

                    <Button
                        className="w-full"
                        variant="outline"
                        onClick={handleStartOnboarding}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            <>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Continue Setup
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        )
    }

    // Fully connected
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Stripe Connected
                </CardTitle>
                <CardDescription>
                    You're all set to receive payments
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-500/10 rounded-lg">
                    <div className="space-y-1">
                        <p className="font-medium text-green-700 dark:text-green-400">
                            Account Active
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-500">
                            ID: {status.accountId?.slice(0, 10)}...
                        </p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
                        Verified
                    </Badge>
                </div>

                <div className="space-y-2">
                    <StatusItem label="Charges enabled" isComplete={true} />
                    <StatusItem label="Payouts enabled" isComplete={true} />
                    <StatusItem label="Bank account linked" isComplete={true} />
                </div>

                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
                >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Stripe Dashboard
                </Button>
            </CardContent>
        </Card>
    )
}

function StatusItem({ label, isComplete }: { label: string; isComplete: boolean }) {
    return (
        <div className="flex items-center gap-2 text-sm">
            {isComplete ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
                <XCircle className="w-4 h-4 text-amber-500" />
            )}
            <span className={isComplete ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}>
                {label}
            </span>
        </div>
    )
}

export default StripeConnectOnboarding
