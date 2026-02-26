'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Plus,
    Home,
    MapPin,
    Loader2,
    Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

export default function NewPropertyPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const [isLoading, setIsLoading] = useState(false)
    const [detectedInfo, setDetectedInfo] = useState<any>(null)
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: '',
        airbnbCalendarUrl: '',
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsLoading(true)

        try {
            const token = (session as any)?.accessToken
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/properties/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: formData.name,
                    address: formData.address,
                    address_line_2: formData.addressLine2 || undefined,
                    city: formData.city,
                    state: formData.state,
                    zip_code: formData.zipCode,
                    airbnb_calendar_url: formData.airbnbCalendarUrl || undefined,
                }),
            })

            if (!res.ok) throw new Error('Failed to create property')

            const data = await res.json()
            setDetectedInfo(data)
            toast.success('Property added successfully!')

            // Wait a moment to show detected info, then redirect
            setTimeout(() => {
                router.push('/client/properties')
            }, 2000)
        } catch (error) {
            toast.error('Failed to add property')
            setIsLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Add Property</h1>
                <p className="text-muted-foreground mt-1">
                    Add a new property to your account. We&apos;ll automatically detect property details.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Home className="w-5 h-5" />
                        Property Details
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Property Name</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Lake House, Downtown Condo"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                A friendly name to identify this property
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                Street Address
                            </label>
                            <Input
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="123 Main Street"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Unit/Suite (optional)</label>
                            <Input
                                value={formData.addressLine2}
                                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                                placeholder="Apt 4B"
                            />
                        </div>

                        <div className="grid grid-cols-6 gap-4">
                            <div className="col-span-3 space-y-2">
                                <label className="text-sm font-medium">City</label>
                                <Input
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="col-span-1 space-y-2">
                                <label className="text-sm font-medium">State</label>
                                <Input
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    maxLength={2}
                                    placeholder="TX"
                                    required
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <label className="text-sm font-medium">ZIP Code</label>
                                <Input
                                    value={formData.zipCode}
                                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="border-t pt-6 space-y-2">
                            <label className="text-sm font-medium">Airbnb Calendar URL (optional)</label>
                            <Input
                                value={formData.airbnbCalendarUrl}
                                onChange={(e) => setFormData({ ...formData, airbnbCalendarUrl: e.target.value })}
                                placeholder="https://www.airbnb.com/calendar/ical/..."
                            />
                            <p className="text-xs text-muted-foreground">
                                Add your Airbnb iCal link to auto-create cleaning jobs when guests check out
                            </p>
                        </div>

                        <Button type="submit" disabled={isLoading} className="w-full bg-brand-500 hover:bg-brand-600">
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Detecting property info...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Property
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Auto-detected info */}
                    {detectedInfo && detectedInfo.sqFt && (
                        <div className="mt-6 p-4 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-5 h-5 text-brand-600" />
                                <span className="font-medium text-brand-700 dark:text-brand-400">
                                    Auto-detected property info
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {detectedInfo.sqFt && (
                                    <div>
                                        <span className="text-muted-foreground">Square Feet:</span>{' '}
                                        <strong>{detectedInfo.sqFt.toLocaleString()}</strong>
                                    </div>
                                )}
                                {detectedInfo.bedrooms && (
                                    <div>
                                        <span className="text-muted-foreground">Bedrooms:</span>{' '}
                                        <strong>{detectedInfo.bedrooms}</strong>
                                    </div>
                                )}
                                {detectedInfo.bathrooms && (
                                    <div>
                                        <span className="text-muted-foreground">Bathrooms:</span>{' '}
                                        <strong>{detectedInfo.bathrooms}</strong>
                                    </div>
                                )}
                                {detectedInfo.yearBuilt && (
                                    <div>
                                        <span className="text-muted-foreground">Year Built:</span>{' '}
                                        <strong>{detectedInfo.yearBuilt}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
