'use client'

import { useState } from 'react'
import {
    PaymentElement,
    Elements,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Lock, CheckCircle } from 'lucide-react'

const stripePromise = loadStripe(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
)

interface PaymentFormProps {
    amount: number
    jobId: string
    onSuccess: () => void
    onError: (error: string) => void
}

function PaymentFormContent({ amount, jobId, onSuccess, onError }: PaymentFormProps) {
    const stripe = useStripe()
    const elements = useElements()
    const [isProcessing, setIsProcessing] = useState(false)
    const [isComplete, setIsComplete] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!stripe || !elements) {
            return
        }

        setIsProcessing(true)

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/client/bookings/${jobId}/success`,
            },
            redirect: 'if_required',
        })

        if (error) {
            onError(error.message || 'Payment failed')
            setIsProcessing(false)
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            setIsComplete(true)
            onSuccess()
        } else {
            setIsProcessing(false)
        }
    }

    if (isComplete) {
        return (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-green-600 dark:text-green-400">
                    Payment Successful!
                </h3>
                <p className="text-muted-foreground">
                    Your booking has been confirmed.
                </p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <PaymentElement
                    options={{
                        layout: 'tabs',
                    }}
                />
            </div>

            <div className="flex items-center justify-between p-4 bg-brand-50 dark:bg-brand-500/10 rounded-lg">
                <span className="text-sm font-medium">Total Amount</span>
                <span className="text-xl font-bold text-brand-600 dark:text-brand-400">
                    ${(amount / 100).toFixed(2)}
                </span>
            </div>

            <Button
                type="submit"
                className="w-full bg-brand-500 hover:bg-brand-600"
                size="lg"
                disabled={!stripe || isProcessing}
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <Lock className="w-4 h-4 mr-2" />
                        Pay ${(amount / 100).toFixed(2)}
                    </>
                )}
            </Button>

            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" />
                Your payment is secured with 256-bit encryption
            </p>
        </form>
    )
}

interface StripePaymentFormProps {
    clientSecret: string
    amount: number
    jobId: string
    onSuccess: () => void
    onError: (error: string) => void
}

export function StripePaymentForm({
    clientSecret,
    amount,
    jobId,
    onSuccess,
    onError,
}: StripePaymentFormProps) {
    const options = {
        clientSecret,
        appearance: {
            theme: 'stripe' as const,
            variables: {
                colorPrimary: '#10b981',
                colorBackground: '#ffffff',
                colorText: '#1e293b',
                colorDanger: '#ef4444',
                fontFamily: 'Inter, system-ui, sans-serif',
                borderRadius: '8px',
            },
        },
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Secure Payment
                </CardTitle>
                <CardDescription>
                    Your payment is protected by Stripe
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Elements stripe={stripePromise} options={options}>
                    <PaymentFormContent
                        amount={amount}
                        jobId={jobId}
                        onSuccess={onSuccess}
                        onError={onError}
                    />
                </Elements>
            </CardContent>
        </Card>
    )
}

export default StripePaymentForm
