'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Plus,
    Home,
    MapPin,
    Calendar,
    MoreVertical,
    Edit,
    Trash2,
    Loader2,
    AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/auth/api-client'

interface ApiProperty {
    id: string
    name: string
    address: string
    city: string
    state: string
    square_feet?: number
    bedrooms?: number
    bathrooms?: number
    last_cleaned_at?: string
    next_cleaning_at?: string
    airbnb_linked?: boolean
}

interface DisplayProperty {
    id: string
    name: string
    address: string
    city: string
    state: string
    sqFt: number
    bedrooms: number
    bathrooms: number
    lastCleaned: string
    nextCleaning: string | null
    hasAirbnb: boolean
}

export default function PropertiesPage() {
    const [deleteTarget, setDeleteTarget] = useState<DisplayProperty | null>(null)
    const queryClient = useQueryClient()

    const { data: rawData, isLoading: loading, error } = useQuery({
        queryKey: ['properties'],
        queryFn: () => apiFetch('/api/v1/properties/'),
    })

    const deleteMut = useMutation({
        mutationFn: (id: string) => apiFetch(`/api/v1/properties/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['properties'] })
            toast.success('Property deleted successfully')
            setDeleteTarget(null)
        },
        onError: () => toast.error('Failed to delete property'),
    })
    const deleting = deleteMut.isPending
    const handleDelete = (id: string) => deleteMut.mutate(id)

    const properties: DisplayProperty[] = useMemo(() => {
        const data: ApiProperty[] = Array.isArray(rawData) ? rawData : []
        return data.map((prop) => {
            const timeSince = (dateStr?: string) => {
                if (!dateStr) return 'Never'
                const diff = Date.now() - new Date(dateStr).getTime()
                const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                if (days === 0) return 'Today'
                if (days === 1) return 'Yesterday'
                if (days < 7) return `${days} days ago`
                if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`
                return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`
            }

            const timeUntil = (dateStr?: string) => {
                if (!dateStr) return null
                const diff = new Date(dateStr).getTime() - Date.now()
                const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                if (days < 0) return null
                if (days === 0) return 'Today'
                if (days === 1) return 'Tomorrow'
                return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }

            return {
                id: prop.id,
                name: prop.name || 'Unnamed Property',
                address: prop.address || '',
                city: prop.city || '',
                state: prop.state || '',
                sqFt: prop.square_feet || 0,
                bedrooms: prop.bedrooms || 0,
                bathrooms: prop.bathrooms || 0,
                lastCleaned: timeSince(prop.last_cleaned_at),
                nextCleaning: timeUntil(prop.next_cleaning_at),
                hasAirbnb: prop.airbnb_linked || false,
            }
        })
    }, [rawData])

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
                    <p className="text-lg font-medium text-red-600">{(error as any)?.message || 'Failed to load properties'}</p>
                    <Button className="mt-4" onClick={() => window.location.reload()}>
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Properties</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your properties and cleaning schedules
                    </p>
                </div>
                <Link href="/client/properties/new">
                    <Button className="bg-brand-500 hover:bg-brand-600">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Property
                    </Button>
                </Link>
            </div>

            {properties.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Home className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No properties yet</p>
                        <Link href="/client/properties/new" className="mt-4 inline-block">
                            <Button className="bg-brand-500 hover:bg-brand-600">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Your First Property
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {properties.map((property) => (
                        <Card key={property.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-brand-100 dark:bg-brand-500/20 rounded-xl">
                                            <Home className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold">{property.name}</h3>
                                            <p className="text-muted-foreground flex items-center gap-1 mt-1">
                                                <MapPin className="w-4 h-4" />
                                                {property.address}{property.city ? `, ${property.city}` : ''}{property.state ? `, ${property.state}` : ''}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                {property.sqFt > 0 && (
                                                    <>
                                                        <span>{property.sqFt.toLocaleString()} sq ft</span>
                                                        <span>•</span>
                                                    </>
                                                )}
                                                <span>{property.bedrooms} bed</span>
                                                <span>•</span>
                                                <span>{property.bathrooms} bath</span>
                                                {property.hasAirbnb && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-brand-600">Airbnb linked</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Link href={`/client/properties/${property.id}`}>
                                            <Button variant="outline" size="sm">
                                                <Edit className="w-4 h-4 mr-1" />
                                                Edit
                                            </Button>
                                        </Link>
                                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(property)}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 mt-4 pt-4 border-t">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm">
                                            Last cleaned: <strong>{property.lastCleaned}</strong>
                                        </span>
                                    </div>
                                    {property.nextCleaning ? (
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-green-500" />
                                            <span className="text-sm">
                                                Next: <strong>{property.nextCleaning}</strong>
                                            </span>
                                        </div>
                                    ) : (
                                        <Link href={`/client/book?propertyId=${property.id}`}>
                                            <Button variant="link" className="text-brand-600 p-0 h-auto">
                                                Schedule cleaning →
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-sm">
                        <CardContent className="pt-6 text-center space-y-4">
                            <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
                            <div>
                                <h3 className="font-semibold text-lg">Delete Property?</h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                    &quot;{deleteTarget.name}&quot; at {deleteTarget.address} will be permanently deleted.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                                <Button variant="destructive" className="flex-1" disabled={deleting} onClick={() => handleDelete(deleteTarget.id)}>
                                    {deleting ? 'Deleting...' : 'Delete'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
