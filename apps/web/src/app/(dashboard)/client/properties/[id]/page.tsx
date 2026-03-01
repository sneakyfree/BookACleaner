'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Home,
    Loader2,
    Save,
    ArrowLeft,
    Calendar,
    Link as LinkIcon,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/auth/api-client'

interface PropertyData {
    id: string
    name: string
    address: string
    address_line_2?: string
    city: string
    state: string
    zip_code?: string
    square_feet?: number
    bedrooms?: number
    bathrooms?: number
    airbnb_calendar_url?: string
    airbnb_linked?: boolean
}

export default function EditPropertyPage() {
    const router = useRouter()
    const params = useParams()
    const propertyId = params.id as string

    const [saving, setSaving] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: '',
        squareFeet: '',
        bedrooms: '',
        bathrooms: '',
        airbnbCalendarUrl: '',
    })

    const { isLoading: loading } = useQuery({
        queryKey: ['property-detail', propertyId],
        queryFn: async () => {
            const data: PropertyData = await apiFetch(`/api/v1/properties/${propertyId}`)
            setFormData({
                name: data.name || '',
                address: data.address || '',
                addressLine2: data.address_line_2 || '',
                city: data.city || '',
                state: data.state || '',
                zipCode: data.zip_code || '',
                squareFeet: data.square_feet ? String(data.square_feet) : '',
                bedrooms: data.bedrooms ? String(data.bedrooms) : '',
                bathrooms: data.bathrooms ? String(data.bathrooms) : '',
                airbnbCalendarUrl: data.airbnb_calendar_url || '',
            })
            return data
        },
        enabled: !!propertyId,
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError('')

        try {
            await apiFetch(`/api/v1/properties/${propertyId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    name: formData.name,
                    address: formData.address,
                    address_line_2: formData.addressLine2 || undefined,
                    city: formData.city,
                    state: formData.state,
                    zip_code: formData.zipCode || undefined,
                    square_feet: formData.squareFeet ? Number(formData.squareFeet) : undefined,
                    bedrooms: formData.bedrooms ? Number(formData.bedrooms) : undefined,
                    bathrooms: formData.bathrooms ? Number(formData.bathrooms) : undefined,
                    airbnb_calendar_url: formData.airbnbCalendarUrl || undefined,
                }),
            })

            toast.success('Property updated successfully!')
            router.push('/client/properties')
        } catch (err: any) {
            setError(err.message)
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleCalendarSync = async () => {
        if (!formData.airbnbCalendarUrl) return
        setSyncing(true)
        try {
            await apiFetch(`/api/v1/properties/${propertyId}/sync-calendar`, {
                method: 'POST',
                body: JSON.stringify({ calendar_url: formData.airbnbCalendarUrl }),
            })
            toast.success('Calendar synced successfully!')
        } catch {
            toast.error('Failed to sync calendar')
        } finally {
            setSyncing(false)
        }
    }

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/client/properties">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Edit Property</h1>
                    <p className="text-muted-foreground mt-1">
                        Update your property details
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Home className="w-4 h-4" />
                            Property Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Property Name</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                placeholder="My Home"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Street Address</label>
                            <Input
                                value={formData.address}
                                onChange={(e) => updateField('address', e.target.value)}
                                placeholder="123 Main St"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Apt / Suite (optional)</label>
                            <Input
                                value={formData.addressLine2}
                                onChange={(e) => updateField('addressLine2', e.target.value)}
                                placeholder="Apt 4B"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">City</label>
                                <Input
                                    value={formData.city}
                                    onChange={(e) => updateField('city', e.target.value)}
                                    placeholder="City"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">State</label>
                                <Input
                                    value={formData.state}
                                    onChange={(e) => updateField('state', e.target.value)}
                                    placeholder="CA"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">ZIP</label>
                                <Input
                                    value={formData.zipCode}
                                    onChange={(e) => updateField('zipCode', e.target.value)}
                                    placeholder="90210"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Sq Ft</label>
                                <Input
                                    type="number"
                                    value={formData.squareFeet}
                                    onChange={(e) => updateField('squareFeet', e.target.value)}
                                    placeholder="1200"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Bedrooms</label>
                                <Input
                                    type="number"
                                    value={formData.bedrooms}
                                    onChange={(e) => updateField('bedrooms', e.target.value)}
                                    placeholder="2"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Bathrooms</label>
                                <Input
                                    type="number"
                                    value={formData.bathrooms}
                                    onChange={(e) => updateField('bathrooms', e.target.value)}
                                    placeholder="1"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Calendar Sync */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Airbnb Calendar Sync
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">iCal URL</label>
                            <div className="flex gap-2">
                                <Input
                                    value={formData.airbnbCalendarUrl}
                                    onChange={(e) => updateField('airbnbCalendarUrl', e.target.value)}
                                    placeholder="https://www.airbnb.com/calendar/ical/..."
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCalendarSync}
                                    disabled={syncing || !formData.airbnbCalendarUrl}
                                >
                                    {syncing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <LinkIcon className="w-4 h-4 mr-1" />
                                            Sync
                                        </>
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5">
                                Paste your Airbnb iCal link to auto-block occupied dates
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {error && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex gap-3">
                    <Button type="submit" disabled={saving} className="flex-1 bg-brand-500 hover:bg-brand-600">
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Link href="/client/properties">
                        <Button type="button" variant="outline">Cancel</Button>
                    </Link>
                </div>
            </form>
        </div>
    )
}
