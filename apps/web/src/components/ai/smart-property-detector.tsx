'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, MapPin, Home, Sparkles, Check, Edit2 } from 'lucide-react'
import { useDetectProperty } from '@/hooks/use-ai'

interface SmartPropertyDetectorProps {
    address: string
    onDetected?: (details: PropertyDetails) => void
    className?: string
}

interface PropertyDetails {
    sqft: number
    bedrooms: number
    bathrooms: number
    propertyType: string
}

export function SmartPropertyDetector({
    address,
    onDetected,
    className = '',
}: SmartPropertyDetectorProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [details, setDetails] = useState<PropertyDetails | null>(null)

    const detectMutation = useDetectProperty()

    useEffect(() => {
        if (address && address.length > 10) {
            detectMutation.mutate(address, {
                onSuccess: (result) => {
                    if (result.success) {
                        const detected = {
                            sqft: result.estimated_sqft,
                            bedrooms: result.estimated_bedrooms,
                            bathrooms: result.estimated_bathrooms,
                            propertyType: result.property_type,
                        }
                        setDetails(detected)
                        onDetected?.(detected)
                    }
                },
            })
        }
    }, [address])

    const handleUpdate = (field: keyof PropertyDetails, value: any) => {
        if (!details) return
        const updated = { ...details, [field]: value }
        setDetails(updated)
        onDetected?.(updated)
    }

    if (!address || address.length < 10) {
        return null
    }

    return (
        <div className={`bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-violet-200 bg-white/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">AI Property Detection</h3>
                            <p className="text-sm text-gray-600">Smart property details estimation</p>
                        </div>
                    </div>
                    {details && !detectMutation.isPending && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            {isEditing ? <Check className="w-4 h-4 mr-1" /> : <Edit2 className="w-4 h-4 mr-1" />}
                            {isEditing ? 'Done' : 'Edit'}
                        </Button>
                    )}
                </div>
            </div>

            <div className="p-4">
                {/* Loading State */}
                {detectMutation.isPending && (
                    <div className="text-center py-6">
                        <Loader2 className="w-8 h-8 text-violet-600 mx-auto mb-3 animate-spin" />
                        <p className="text-sm text-gray-600">Analyzing property details...</p>
                        <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {address}
                        </p>
                    </div>
                )}

                {/* Detected Results */}
                {details && !detectMutation.isPending && (
                    <div className="space-y-4">
                        {/* Address */}
                        <div className="flex items-center gap-2 text-sm text-gray-600 pb-3 border-b">
                            <MapPin className="w-4 h-4" />
                            <span>{address}</span>
                        </div>

                        {/* Property Type */}
                        <div className="flex items-center gap-3 bg-white rounded-lg p-3 border">
                            <Home className="w-5 h-5 text-violet-600" />
                            <div className="flex-1">
                                <Label className="text-xs text-gray-500">Property Type</Label>
                                {isEditing ? (
                                    <select
                                        value={details.propertyType}
                                        onChange={(e) => handleUpdate('propertyType', e.target.value)}
                                        className="w-full text-sm border rounded px-2 py-1 mt-1"
                                    >
                                        <option value="house">House</option>
                                        <option value="condo">Condo</option>
                                        <option value="apartment">Apartment</option>
                                        <option value="townhouse">Townhouse</option>
                                    </select>
                                ) : (
                                    <p className="font-medium capitalize">{details.propertyType}</p>
                                )}
                            </div>
                        </div>

                        {/* Grid of Details */}
                        <div className="grid grid-cols-3 gap-3">
                            {/* Square Feet */}
                            <div className="bg-white rounded-lg p-3 border text-center">
                                <Label className="text-xs text-gray-500">Sq Ft</Label>
                                {isEditing ? (
                                    <Input
                                        type="number"
                                        value={details.sqft}
                                        onChange={(e) => handleUpdate('sqft', parseInt(e.target.value))}
                                        className="text-center mt-1 h-8"
                                    />
                                ) : (
                                    <p className="text-xl font-bold text-violet-600">{details.sqft.toLocaleString()}</p>
                                )}
                            </div>

                            {/* Bedrooms */}
                            <div className="bg-white rounded-lg p-3 border text-center">
                                <Label className="text-xs text-gray-500">Bedrooms</Label>
                                {isEditing ? (
                                    <Input
                                        type="number"
                                        min="0"
                                        max="10"
                                        value={details.bedrooms}
                                        onChange={(e) => handleUpdate('bedrooms', parseInt(e.target.value))}
                                        className="text-center mt-1 h-8"
                                    />
                                ) : (
                                    <p className="text-xl font-bold text-violet-600">{details.bedrooms}</p>
                                )}
                            </div>

                            {/* Bathrooms */}
                            <div className="bg-white rounded-lg p-3 border text-center">
                                <Label className="text-xs text-gray-500">Bathrooms</Label>
                                {isEditing ? (
                                    <Input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.5"
                                        value={details.bathrooms}
                                        onChange={(e) => handleUpdate('bathrooms', parseFloat(e.target.value))}
                                        className="text-center mt-1 h-8"
                                    />
                                ) : (
                                    <p className="text-xl font-bold text-violet-600">{details.bathrooms}</p>
                                )}
                            </div>
                        </div>

                        {/* AI Confidence Note */}
                        <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI-estimated details • Click Edit to adjust
                        </p>
                    </div>
                )}

                {/* Error State */}
                {detectMutation.isError && (
                    <div className="text-center py-6">
                        <p className="text-sm text-red-600">Unable to detect property details</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => detectMutation.mutate(address)}
                        >
                            Try Again
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SmartPropertyDetector
