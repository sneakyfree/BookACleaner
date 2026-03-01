'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AddressAutocomplete, type ParsedAddress } from '@/components/common/AddressAutocomplete'
import {
    Plus,
    Home,
    MapPin,
    Loader2,
    Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/auth/api-client'

export default function NewPropertyPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [detecting, setDetecting] = useState(false)
    const [detected, setDetected] = useState<any>(null)
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
            const data = await apiFetch('/api/v1/properties/', {
                method: 'POST',
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
                            <AddressAutocomplete
                                value={formData.address}
                                onChange={(val) => setFormData({ ...formData, address: val })}
                                onSelect={(parsed: ParsedAddress) => {
                                    setFormData((prev) => ({
                                        ...prev,
                                        address: parsed.address,
                                        city: parsed.city || prev.city,
                                        state: parsed.state || prev.state,
                                        zipCode: parsed.zipCode || prev.zipCode,
                                    }))
                                }}
                                placeholder="Start typing an address..."
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

                        {/* AI Detect Property Details */}
                        <div className="p-4 bg-purple-50 dark:bg-purple-500/5 rounded-xl border border-purple-200 dark:border-purple-500/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-purple-500" />
                                        AI Property Detection
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Auto-detect property size, type, and room count from the address
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={detecting || !formData.address || !formData.city}
                                    onClick={async () => {
                                        setDetecting(true)
                                        try {
                                            const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`
                                            const result = await apiFetch('/api/v1/ai/detect-property', {
                                                method: 'POST',
                                                body: JSON.stringify({ address: fullAddress }),
                                            })
                                            setDetected(result)
                                            toast.success('Property details detected!')
                                        } catch {
                                            toast.error('Could not detect property details')
                                        } finally {
                                            setDetecting(false)
                                        }
                                    }}
                                >
                                    {detecting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                                    Detect
                                </Button>
                            </div>
                            {detected && (
                                <div className="mt-3 grid grid-cols-3 gap-3">
                                    {detected.sqft && (
                                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-center">
                                            <p className="text-xs text-muted-foreground">Sqft</p>
                                            <p className="font-semibold text-sm">{detected.sqft}</p>
                                        </div>
                                    )}
                                    {detected.bedrooms != null && (
                                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-center">
                                            <p className="text-xs text-muted-foreground">Bedrooms</p>
                                            <p className="font-semibold text-sm">{detected.bedrooms}</p>
                                        </div>
                                    )}
                                    {detected.bathrooms != null && (
                                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-center">
                                            <p className="text-xs text-muted-foreground">Baths</p>
                                            <p className="font-semibold text-sm">{detected.bathrooms}</p>
                                        </div>
                                    )}
                                    {detected.property_type && (
                                        <div className="col-span-3 p-2 bg-white dark:bg-slate-800 rounded-lg text-center">
                                            <p className="text-xs text-muted-foreground">Type</p>
                                            <p className="font-semibold text-sm capitalize">{detected.property_type}</p>
                                        </div>
                                    )}
                                </div>
                            )}
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
