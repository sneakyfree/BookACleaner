'use client'

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
} from 'lucide-react'

export default function PropertiesPage() {
    // Mock data
    const properties = [
        {
            id: '1',
            name: 'Lake House',
            address: '123 Lake Street',
            city: 'Austin',
            state: 'TX',
            sqFt: 2200,
            bedrooms: 4,
            bathrooms: 2.5,
            lastCleaned: '2 days ago',
            nextCleaning: 'Tomorrow',
            hasAirbnb: true,
        },
        {
            id: '2',
            name: 'Downtown Condo',
            address: '456 Main Avenue, Unit 12B',
            city: 'Austin',
            state: 'TX',
            sqFt: 1100,
            bedrooms: 2,
            bathrooms: 1,
            lastCleaned: '1 week ago',
            nextCleaning: null,
            hasAirbnb: true,
        },
        {
            id: '3',
            name: 'Beach Cottage',
            address: '789 Ocean Drive',
            city: 'Galveston',
            state: 'TX',
            sqFt: 1600,
            bedrooms: 3,
            bathrooms: 2,
            lastCleaned: '3 weeks ago',
            nextCleaning: null,
            hasAirbnb: false,
        },
    ]

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
                                            {property.address}, {property.city}, {property.state}
                                        </p>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                            <span>{property.sqFt.toLocaleString()} sq ft</span>
                                            <span>•</span>
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
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="w-4 h-4" />
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
                                    <Link href={`/book?propertyId=${property.id}`}>
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
        </div>
    )
}
