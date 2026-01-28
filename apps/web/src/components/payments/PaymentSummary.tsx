'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Clock, MapPin, Sparkles, Shield } from 'lucide-react'

interface PaymentSummaryProps {
    services: string[]
    propertyAddress?: string
    scheduledDate?: string
    scheduledTime?: string
    basePrice: number
    addOnPrice?: number
    serviceFee?: number
    cleanerName?: string
    cleanerRating?: number
}

export function PaymentSummary({
    services,
    propertyAddress,
    scheduledDate,
    scheduledTime,
    basePrice,
    addOnPrice = 0,
    serviceFee = 0,
    cleanerName,
    cleanerRating,
}: PaymentSummaryProps) {
    const subtotal = basePrice + addOnPrice
    const total = subtotal + serviceFee

    const formatServiceName = (service: string) => {
        return service
            .replace(/_/g, ' ')
            .replace(/-/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Services */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-brand-500" />
                        Services
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {services.map((service) => (
                            <Badge
                                key={service}
                                variant="secondary"
                                className="bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400"
                            >
                                {formatServiceName(service)}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Property & Schedule */}
                {(propertyAddress || scheduledDate) && (
                    <div className="space-y-2">
                        {propertyAddress && (
                            <div className="flex items-start gap-2 text-sm">
                                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <span>{propertyAddress}</span>
                            </div>
                        )}
                        {scheduledDate && (
                            <div className="flex items-center gap-2 text-sm">
                                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                                <span>{scheduledDate}</span>
                            </div>
                        )}
                        {scheduledTime && (
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span>{scheduledTime}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Cleaner info */}
                {cleanerName && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <div className="w-10 h-10 bg-brand-100 dark:bg-brand-500/20 rounded-full flex items-center justify-center">
                            <span className="text-brand-600 dark:text-brand-400 font-medium">
                                {cleanerName.charAt(0)}
                            </span>
                        </div>
                        <div>
                            <p className="font-medium">{cleanerName}</p>
                            {cleanerRating && (
                                <p className="text-sm text-muted-foreground">
                                    ⭐ {cleanerRating.toFixed(1)} rating
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <Separator />

                {/* Price breakdown */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Base price</span>
                        <span>${basePrice.toFixed(2)}</span>
                    </div>
                    {addOnPrice > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Add-ons</span>
                            <span>${addOnPrice.toFixed(2)}</span>
                        </div>
                    )}
                    {serviceFee > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Service fee</span>
                            <span>${serviceFee.toFixed(2)}</span>
                        </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                        <span>Total</span>
                        <span className="text-brand-600 dark:text-brand-400">
                            ${total.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Trust indicators */}
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-500/10 rounded-lg">
                    <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div className="text-sm">
                        <p className="font-medium text-green-700 dark:text-green-400">
                            Payment Protected
                        </p>
                        <p className="text-green-600/80 dark:text-green-500/80">
                            Funds held until job is complete
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default PaymentSummary
