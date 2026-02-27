'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { MapPin, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ParsedAddress {
    address: string
    city: string
    state: string
    zipCode: string
    country: string
    lat?: number
    lng?: number
    formattedAddress: string
}

interface AddressAutocompleteProps {
    value: string
    onChange: (value: string) => void
    onSelect: (address: ParsedAddress) => void
    placeholder?: string
    className?: string
    disabled?: boolean
}

/**
 * Google Maps Places Autocomplete component.
 * Falls back to a normal text input if Google Maps API is unavailable.
 */
export function AddressAutocomplete({
    value,
    onChange,
    onSelect,
    placeholder = 'Start typing an address...',
    className,
    disabled,
}: AddressAutocompleteProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Load Google Maps script
    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
        if (!apiKey) {
            setIsLoading(false)
            return
        }

        // Check if already loaded
        if (window.google?.maps?.places) {
            setIsLoaded(true)
            setIsLoading(false)
            return
        }

        // Check if script tag already exists
        const existingScript = document.querySelector(
            'script[src*="maps.googleapis.com/maps/api/js"]'
        )
        if (existingScript) {
            existingScript.addEventListener('load', () => {
                setIsLoaded(true)
                setIsLoading(false)
            })
            return
        }

        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
        script.async = true
        script.defer = true
        script.onload = () => {
            setIsLoaded(true)
            setIsLoading(false)
        }
        script.onerror = () => {
            setIsLoading(false)
        }
        document.head.appendChild(script)
    }, [])

    // Initialize autocomplete
    useEffect(() => {
        if (!isLoaded || !inputRef.current || autocompleteRef.current) return

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
            types: ['address'],
            componentRestrictions: { country: 'us' },
            fields: ['address_components', 'geometry', 'formatted_address'],
        })

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace()
            if (!place.address_components) return

            const parsed = parsePlaceResult(place)
            onSelect(parsed)
            onChange(parsed.address)
        })

        autocompleteRef.current = autocomplete
    }, [isLoaded, onSelect, onChange])

    return (
        <div className={cn('relative', className)}>
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="pl-10"
                    disabled={disabled}
                    autoComplete="off"
                />
                {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                )}
            </div>
            {!isLoaded && !isLoading && (
                <p className="text-xs text-muted-foreground mt-1">
                    Type your full address manually
                </p>
            )}
        </div>
    )
}

function parsePlaceResult(place: google.maps.places.PlaceResult): ParsedAddress {
    const components = place.address_components || []

    const get = (type: string): string => {
        const comp = components.find((c: google.maps.GeocoderAddressComponent) => c.types.includes(type))
        return comp?.long_name || ''
    }

    const getShort = (type: string): string => {
        const comp = components.find((c: google.maps.GeocoderAddressComponent) => c.types.includes(type))
        return comp?.short_name || ''
    }

    const streetNumber = get('street_number')
    const route = get('route')
    const address = streetNumber ? `${streetNumber} ${route}` : route

    return {
        address,
        city: get('locality') || get('sublocality_level_1') || get('administrative_area_level_2'),
        state: getShort('administrative_area_level_1'),
        zipCode: get('postal_code'),
        country: getShort('country'),
        lat: place.geometry?.location?.lat(),
        lng: place.geometry?.location?.lng(),
        formattedAddress: place.formatted_address || '',
    }
}

// Type declaration for Google Maps (when script loaded externally)
declare global {
    interface Window {
        google: typeof google
    }
}
