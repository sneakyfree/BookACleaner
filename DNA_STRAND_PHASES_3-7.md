# BookACleaner.ai — DNA Strand Master Plan: Phases 3-7 (Continued)

> **Part 3 of Ultimate DNA Strand**  
> **Continue from Phases 1-2**

---

# PHASE 3: PROPERTY INTELLIGENCE

**Timeline:** Week 7  
**Goal:** Auto-detect property details from address, property memory

---

## 3.1 Property System

### 3.1.1 Property API
```python
# apps/api/app/api/v1/properties.py
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.services.property_intel import get_property_details
from pydantic import BaseModel

router = APIRouter()

class CreatePropertyRequest(BaseModel):
    name: str
    address: str
    addressLine2: str | None = None
    city: str
    state: str
    zipCode: str
    airbnbCalendarUrl: str | None = None

@router.post("/")
async def create_property(
    data: CreatePropertyRequest,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    # Get client profile
    client = await db.clientprofile.find_first(where={"userId": user.id})
    if not client:
        raise HTTPException(400, "Client profile not found")
    
    # Auto-detect property details
    intel = await get_property_details(
        f"{data.address}, {data.city}, {data.state} {data.zipCode}"
    )
    
    # Create property
    property = await db.property.create(
        data={
            "clientId": client.id,
            "name": data.name,
            "address": data.address,
            "addressLine2": data.addressLine2,
            "city": data.city,
            "state": data.state,
            "zipCode": data.zipCode,
            "sqFt": intel.get("sqFt"),
            "bedrooms": intel.get("bedrooms"),
            "bathrooms": intel.get("bathrooms"),
            "propertyType": intel.get("propertyType"),
            "yearBuilt": intel.get("yearBuilt"),
            "airbnbCalendarUrl": data.airbnbCalendarUrl,
        }
    )
    
    # Create empty playbook
    await db.propertyplaybook.create(
        data={"propertyId": property.id}
    )
    
    return property

@router.get("/{property_id}")
async def get_property(
    property_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    property = await db.property.find_unique(
        where={"id": property_id},
        include={
            "playbook": True,
            "jobs": {"take": 10, "orderBy": {"createdAt": "desc"}}
        }
    )
    
    if not property:
        raise HTTPException(404, "Property not found")
    
    return property
```

### 3.1.2 Property Intelligence Service
```python
# apps/api/app/services/property_intel.py
import httpx
from app.config import get_settings

settings = get_settings()

async def get_property_details(full_address: str) -> dict:
    """
    Fetch property details from external APIs
    Uses: Google Places + Zillow API
    """
    details = {
        "sqFt": None,
        "bedrooms": None,
        "bathrooms": None,
        "propertyType": None,
        "yearBuilt": None,
        "latitude": None,
        "longitude": None,
    }
    
    # Step 1: Google Places for geocoding and place details
    async with httpx.AsyncClient() as client:
        # Geocode address
        geo_response = await client.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={
                "address": full_address,
                "key": settings.google_maps_api_key
            }
        )
        
        if geo_response.status_code == 200:
            geo_data = geo_response.json()
            if geo_data.get("results"):
                location = geo_data["results"][0]["geometry"]["location"]
                details["latitude"] = location["lat"]
                details["longitude"] = location["lng"]
                
                # Extract address components
                for component in geo_data["results"][0]["address_components"]:
                    if "postal_code" in component["types"]:
                        zipcode = component["short_name"]
    
    # Step 2: Zillow API for property details
    async with httpx.AsyncClient() as client:
        zillow_response = await client.get(
            "https://api.bridgedataoutput.com/api/v2/zestimates",
            params={"address": full_address},
            headers={"Authorization": f"Bearer {settings.zillow_api_key}"}
        )
        
        if zillow_response.status_code == 200:
            zillow_data = zillow_response.json()
            if zillow_data.get("bundle"):
                prop = zillow_data["bundle"][0]
                details["sqFt"] = prop.get("livingArea")
                details["bedrooms"] = prop.get("bedrooms")
                details["bathrooms"] = prop.get("bathrooms")
                details["yearBuilt"] = prop.get("yearBuilt")
                
                # Map property type
                prop_type = prop.get("propertyType", "").upper()
                type_mapping = {
                    "SINGLE_FAMILY": "HOUSE",
                    "CONDO": "CONDO",
                    "APARTMENT": "APARTMENT",
                    "TOWNHOUSE": "TOWNHOUSE",
                    "MULTI_FAMILY": "HOUSE",
                }
                details["propertyType"] = type_mapping.get(prop_type, "OTHER")
    
    return details

async def estimate_cleaning_price(property_id: str, services: list, db) -> dict:
    """Calculate suggested price based on property size and services"""
    property = await db.property.find_unique(where={"id": property_id})
    
    if not property or not property.sqFt:
        return {"estimated": False}
    
    # Base rates per sq ft by service type
    BASE_RATES = {
        "standard_clean": 0.10,      # $0.10/sqft
        "deep_clean": 0.18,          # $0.18/sqft
        "move_in_out": 0.20,         # $0.20/sqft
        "airbnb_turnover": 0.12,     # $0.12/sqft
    }
    
    # Room multipliers
    room_adjustment = (property.bedrooms or 2) * 10 + (property.bathrooms or 1) * 15
    
    # Calculate for each service
    estimates = {}
    for service in services:
        rate = BASE_RATES.get(service, 0.12)
        base_price = property.sqFt * rate + room_adjustment
        
        # Min/max bounds
        base_price = max(75, min(base_price, 500))
        
        estimates[service] = round(base_price, 2)
    
    return {
        "estimated": True,
        "estimates": estimates,
        "basedOn": {
            "sqFt": property.sqFt,
            "bedrooms": property.bedrooms,
            "bathrooms": property.bathrooms,
        }
    }
```

### 3.1.3 Property Add UI
```typescript
// apps/web/src/app/(dashboard)/client/properties/new/page.tsx
'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

const propertySchema = z.object({
  name: z.string().min(1, 'Name required'),
  address: z.string().min(5, 'Address required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City required'),
  state: z.string().length(2, 'State required'),
  zipCode: z.string().min(5, 'ZIP required'),
  airbnbCalendarUrl: z.string().url().optional().or(z.literal('')),
})

export default function NewPropertyPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [detectedInfo, setDetectedInfo] = useState(null)
  
  const form = useForm({
    resolver: zodResolver(propertySchema),
  })

  const mutation = useMutation({
    mutationFn: (data) => 
      fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      toast.success('Property added!')
      setDetectedInfo(data) // Show detected info
    },
  })

  const handleAddressSelect = (place: google.maps.places.PlaceResult) => {
    // Parse address components
    const components = place.address_components || []
    
    let street = ''
    let city = ''
    let state = ''
    let zip = ''
    
    for (const component of components) {
      if (component.types.includes('street_number')) {
        street = component.long_name + ' '
      }
      if (component.types.includes('route')) {
        street += component.long_name
      }
      if (component.types.includes('locality')) {
        city = component.long_name
      }
      if (component.types.includes('administrative_area_level_1')) {
        state = component.short_name
      }
      if (component.types.includes('postal_code')) {
        zip = component.long_name
      }
    }
    
    form.setValue('address', street)
    form.setValue('city', city)
    form.setValue('state', state)
    form.setValue('zipCode', zip)
  }

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-3xl font-bold mb-8">Add Property</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Property Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
            {/* Property Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Property Name</label>
              <Input 
                {...form.register('name')} 
                placeholder="Lake House, Downtown Condo, etc."
              />
            </div>

            {/* Address Autocomplete */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <AddressAutocomplete onSelect={handleAddressSelect} />
              <Input 
                {...form.register('address')} 
                placeholder="Street address"
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Input {...form.register('city')} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">State</label>
                  <Input {...form.register('state')} maxLength={2} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">ZIP</label>
                  <Input {...form.register('zipCode')} />
                </div>
              </div>
            </div>

            {/* Airbnb Calendar URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Airbnb Calendar URL (optional)</label>
              <Input 
                {...form.register('airbnbCalendarUrl')} 
                placeholder="https://www.airbnb.com/calendar/ical/..."
              />
              <p className="text-sm text-muted-foreground">
                Add this to auto-create cleaning jobs from your Airbnb bookings
              </p>
            </div>

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Detecting property info...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Add Property
                </>
              )}
            </Button>
          </form>

          {/* Show detected info */}
          {detectedInfo && detectedInfo.sqFt && (
            <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <h3 className="font-semibold text-emerald-800 mb-2">
                ✨ Auto-detected property info:
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Square Feet: <strong>{detectedInfo.sqFt}</strong></div>
                <div>Bedrooms: <strong>{detectedInfo.bedrooms}</strong></div>
                <div>Bathrooms: <strong>{detectedInfo.bathrooms}</strong></div>
                <div>Year Built: <strong>{detectedInfo.yearBuilt}</strong></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

Steps for Phase 3:
- [ ] Create property CRUD endpoints
- [ ] Set up Google Maps API
- [ ] Set up Zillow API
- [ ] Create property intelligence service
- [ ] Build address autocomplete component
- [ ] Create property add page
- [ ] Create property list page
- [ ] Create property detail page
- [ ] Build price estimation service
- [ ] Create property playbook system
- [ ] Test auto-detection works

---

# PHASE 4: JOBS & BOOKING

**Timeline:** Weeks 8-10  
**Goal:** Complete booking flow

---

## 4.1 Service Taxonomy

### 4.1.1 Seed Service Categories
```typescript
// prisma/seed.ts
const serviceCategories = [
  // Tier 1: Standard Cleaning
  {
    name: "Standard Cleaning",
    tier: 1,
    description: "Regular residential and commercial cleaning",
    icon: "sparkles",
    services: [
      { name: "Standard Clean", description: "Regular cleaning with dusting, vacuuming, mopping", pricingModel: "SQFT", pricePerSqFt: 0.10, estimatedMinutes: 120 },
      { name: "Deep Clean", description: "Thorough cleaning including inside cabinets, appliances", pricingModel: "SQFT", pricePerSqFt: 0.18, estimatedMinutes: 240 },
      { name: "Move In/Out Clean", description: "Complete cleaning for empty properties", pricingModel: "SQFT", pricePerSqFt: 0.20, estimatedMinutes: 300 },
      { name: "Airbnb Turnover", description: "Quick turnover between guests", pricingModel: "SQFT", pricePerSqFt: 0.12, estimatedMinutes: 90 },
    ]
  },
  // Tier 2: Specialty Surfaces
  {
    name: "Specialty Surfaces",
    tier: 2,
    description: "Specialized surface cleaning",
    icon: "layers",
    services: [
      { name: "Carpet Cleaning", description: "Deep carpet extraction cleaning", pricingModel: "SQFT", pricePerSqFt: 0.25 },
      { name: "Window Cleaning", description: "Interior and exterior window cleaning", pricingModel: "FLAT", basePrice: 150 },
      { name: "Pressure Washing", description: "Exterior surfaces, driveways, decks", pricingModel: "HOURLY", pricePerHour: 85 },
      { name: "Hardwood Floor Care", description: "Buffing, polishing, refinishing", pricingModel: "SQFT", pricePerSqFt: 0.30 },
    ]
  },
  // Tier 3: Disaster Restoration
  {
    name: "Disaster Restoration",
    tier: 3,
    description: "Damage restoration services",
    icon: "cloud-rain",
    requiresCert: true,
    requiredCerts: ["IICRC_WRT", "IICRC_FSRT"],
    services: [
      { name: "Water Damage Restoration", pricingModel: "CUSTOM" },
      { name: "Fire & Smoke Restoration", pricingModel: "CUSTOM" },
      { name: "Mold Remediation", pricingModel: "CUSTOM" },
      { name: "Storm Damage Cleanup", pricingModel: "CUSTOM" },
    ]
  },
  // ... continue for tiers 4-7
]
```

### 4.1.2 Direct Booking Flow
```typescript
// apps/web/src/app/(public)/book/[cleanerId]/page.tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'

type BookingStep = 'property' | 'services' | 'datetime' | 'review' | 'payment'

export default function BookCleanerPage({ params }: { params: { cleanerId: string } }) {
  const router = useRouter()
  const [step, setStep] = useState<BookingStep>('property')
  const [booking, setBooking] = useState({
    propertyId: null,
    services: [],
    addOns: [],
    date: null,
    time: null,
    instructions: '',
  })

  // Fetch cleaner info
  const { data: cleaner } = useQuery({
    queryKey: ['cleaner', params.cleanerId],
    queryFn: () => fetch(`/api/cleaners/${params.cleanerId}`).then(r => r.json()),
  })

  // Fetch user properties
  const { data: properties } = useQuery({
    queryKey: ['my-properties'],
    queryFn: () => fetch('/api/properties').then(r => r.json()),
  })

  // Fetch cleaner availability
  const { data: availability } = useQuery({
    queryKey: ['availability', params.cleanerId, booking.date],
    queryFn: () => fetch(`/api/cleaners/${params.cleanerId}/availability?date=${booking.date}`).then(r => r.json()),
    enabled: !!booking.date,
  })

  // Calculate price
  const { data: priceEstimate } = useQuery({
    queryKey: ['price-estimate', booking.propertyId, booking.services],
    queryFn: () => fetch('/api/jobs/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: booking.propertyId,
        services: booking.services,
        addOns: booking.addOns,
      }),
    }).then(r => r.json()),
    enabled: !!booking.propertyId && booking.services.length > 0,
  })

  // Create booking
  const createBooking = useMutation({
    mutationFn: (data) => fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        cleanerId: params.cleanerId,
        jobType: 'DIRECT',
      }),
    }).then(r => r.json()),
    onSuccess: (data) => {
      router.push(`/jobs/${data.id}/checkout`)
    },
  })

  return (
    <div className="container max-w-4xl py-8">
      {/* Progress Steps */}
      <div className="flex justify-between mb-8">
        {['property', 'services', 'datetime', 'review', 'payment'].map((s, i) => (
          <div key={s} className={`flex items-center ${
            step === s ? 'text-emerald-600' : 'text-muted-foreground'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === s ? 'bg-emerald-600 text-white' : 'bg-muted'
            }`}>
              {i + 1}
            </div>
            <span className="ml-2 hidden md:inline capitalize">{s}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Select Property */}
      {step === 'property' && (
        <Card>
          <CardHeader>
            <CardTitle>Select Property</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={booking.propertyId}
              onValueChange={(v) => setBooking({ ...booking, propertyId: v })}
            >
              {properties?.map((property) => (
                <div key={property.id} className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value={property.id} id={property.id} />
                  <label htmlFor={property.id} className="flex-1 cursor-pointer">
                    <div className="font-medium">{property.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {property.address}, {property.city}
                      {property.sqFt && ` • ${property.sqFt} sq ft`}
                    </div>
                  </label>
                </div>
              ))}
            </RadioGroup>
            
            <div className="flex justify-end mt-6">
              <Button 
                onClick={() => setStep('services')}
                disabled={!booking.propertyId}
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Services */}
      {step === 'services' && (
        <Card>
          <CardHeader>
            <CardTitle>Select Services</CardTitle>
          </CardHeader>
          <CardContent>
            {cleaner?.services?.map((service) => (
              <div key={service.id} className="flex items-start space-x-3 p-4 border rounded-lg mb-2">
                <Checkbox
                  checked={booking.services.includes(service.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setBooking({ ...booking, services: [...booking.services, service.id] })
                    } else {
                      setBooking({ ...booking, services: booking.services.filter(s => s !== service.id) })
                    }
                  }}
                />
                <div className="flex-1">
                  <div className="font-medium">{service.name}</div>
                  <div className="text-sm text-muted-foreground">{service.description}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${priceEstimate?.estimates?.[service.id] || service.basePrice}</div>
                </div>
              </div>
            ))}
            
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep('property')}>Back</Button>
              <Button onClick={() => setStep('datetime')} disabled={booking.services.length === 0}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Date & Time */}
      {step === 'datetime' && (
        <Card>
          <CardHeader>
            <CardTitle>Select Date & Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <Calendar
                  mode="single"
                  selected={booking.date}
                  onSelect={(date) => setBooking({ ...booking, date })}
                  disabled={(date) => date < new Date()}
                />
              </div>
              <div>
                <h3 className="font-medium mb-4">Available Times</h3>
                {availability?.slots?.map((slot) => (
                  <Button
                    key={slot}
                    variant={booking.time === slot ? 'default' : 'outline'}
                    className="mr-2 mb-2"
                    onClick={() => setBooking({ ...booking, time: slot })}
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="mt-6">
              <label className="font-medium">Special Instructions</label>
              <Textarea
                value={booking.instructions}
                onChange={(e) => setBooking({ ...booking, instructions: e.target.value })}
                placeholder="Any special requests or access instructions..."
                className="mt-2"
              />
            </div>
            
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep('services')}>Back</Button>
              <Button onClick={() => setStep('review')} disabled={!booking.date || !booking.time}>
                Review Booking
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle>Review Your Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b">
                <span>Property</span>
                <span className="font-medium">
                  {properties?.find(p => p.id === booking.propertyId)?.name}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>Date & Time</span>
                <span className="font-medium">
                  {format(booking.date, 'PPP')} at {booking.time}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>Services</span>
                <span className="font-medium">{booking.services.length} selected</span>
              </div>
              <div className="flex justify-between py-2 text-lg font-bold">
                <span>Total</span>
                <span>${priceEstimate?.total}</span>
              </div>
            </div>
            
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep('datetime')}>Back</Button>
              <Button 
                onClick={() => createBooking.mutate(booking)}
                disabled={createBooking.isPending}
              >
                Proceed to Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

Steps for Phase 4:
- [ ] Seed service categories and services
- [ ] Create job creation endpoint
- [ ] Build direct booking flow UI
- [ ] Build marketplace search page
- [ ] Create bid/RFQ posting UI
- [ ] Create bid submission UI
- [ ] Create bid comparison view
- [ ] Build job management dashboard
- [ ] Create job status workflow
- [ ] Test full booking flow

---

# PHASE 5: PAYMENTS & ESCROW

**Timeline:** Weeks 11-12  
**Goal:** Stripe Connect with escrow

---

## 5.1 Stripe Integration

### 5.1.1 Cleaner Stripe Onboarding
```python
# apps/api/app/api/v1/stripe.py
import stripe
from fastapi import APIRouter, Depends, HTTPException
from app.config import get_settings
from app.database import get_db

settings = get_settings()
stripe.api_key = settings.stripe_secret_key

router = APIRouter()

@router.post("/connect/onboard")
async def create_connect_account(
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Create Stripe Connect account for cleaner"""
    
    cleaner = await db.cleanerprofile.find_first(where={"userId": user.id})
    if not cleaner:
        raise HTTPException(400, "Cleaner profile not found")
    
    # Create or get existing account
    if cleaner.stripeAccountId:
        account = stripe.Account.retrieve(cleaner.stripeAccountId)
    else:
        account = stripe.Account.create(
            type="express",
            email=user.email,
            metadata={"user_id": user.id},
        )
        
        await db.cleanerprofile.update(
            where={"id": cleaner.id},
            data={"stripeAccountId": account.id}
        )
    
    # Create onboarding link
    account_link = stripe.AccountLink.create(
        account=account.id,
        refresh_url=f"{settings.frontend_url}/cleaner/settings/payments?refresh=true",
        return_url=f"{settings.frontend_url}/cleaner/settings/payments?success=true",
        type="account_onboarding",
    )
    
    return {"url": account_link.url}

@router.get("/connect/status")
async def get_connect_status(
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Check Stripe Connect account status"""
    
    cleaner = await db.cleanerprofile.find_first(where={"userId": user.id})
    if not cleaner or not cleaner.stripeAccountId:
        return {"connected": False}
    
    account = stripe.Account.retrieve(cleaner.stripeAccountId)
    
    return {
        "connected": True,
        "chargesEnabled": account.charges_enabled,
        "payoutsEnabled": account.payouts_enabled,
        "detailsSubmitted": account.details_submitted,
    }
```

### 5.1.2 Payment Flow
```python
# apps/api/app/api/v1/payments.py
import stripe
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from datetime import datetime, timedelta

router = APIRouter()

@router.post("/jobs/{job_id}/checkout")
async def create_checkout_session(
    job_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Create Stripe checkout session for job payment"""
    
    job = await db.job.find_unique(
        where={"id": job_id},
        include={"cleaner": True, "client": True, "property": True}
    )
    
    if not job or job.client.userId != user.id:
        raise HTTPException(404, "Job not found")
    
    if job.paymentStatus != "PENDING":
        raise HTTPException(400, "Job already paid")
    
    # Create checkout session
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="payment",
        customer_email=user.email,
        line_items=[{
            "price_data": {
                "currency": "usd",
                "unit_amount": int(float(job.totalPrice) * 100),  # Convert to cents
                "product_data": {
                    "name": f"Cleaning Service - {job.title}",
                    "description": f"Property: {job.property.name}",
                },
            },
            "quantity": 1,
        }],
        payment_intent_data={
            # Hold funds, don't transfer to cleaner yet
            "capture_method": "automatic",
            "transfer_group": job.id,
            "metadata": {
                "job_id": job.id,
                "cleaner_id": job.cleanerId,
                "cleaner_stripe_account": job.cleaner.stripeAccountId,
            },
        },
        success_url=f"{settings.frontend_url}/jobs/{job.id}?payment=success",
        cancel_url=f"{settings.frontend_url}/jobs/{job.id}?payment=cancelled",
        metadata={"job_id": job.id},
    )
    
    return {"checkoutUrl": session.url}

@router.post("/webhooks/stripe")
async def handle_stripe_webhook(request: Request, db = Depends(get_db)):
    """Handle Stripe webhooks for payment events"""
    
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except Exception as e:
        raise HTTPException(400, str(e))
    
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        job_id = session["metadata"]["job_id"]
        
        # Update job payment status to HELD (escrow)
        await db.job.update(
            where={"id": job_id},
            data={
                "paymentStatus": "HELD",
                "stripePaymentId": session["payment_intent"],
                "paidAt": datetime.utcnow(),
            }
        )
        
        # Notify cleaner
        await send_notification(
            job.cleaner.userId,
            "Payment received! You can see the job details now."
        )
    
    return {"received": True}

async def release_payment_to_cleaner(job_id: str, db):
    """Transfer funds to cleaner after job completion + review window"""
    
    job = await db.job.find_unique(
        where={"id": job_id},
        include={"cleaner": True}
    )
    
    if not job or job.paymentStatus != "HELD":
        return
    
    # Calculate platform fee (future)
    platform_fee = 0  # Start with 0%, add later
    cleaner_amount = int(float(job.totalPrice) * 100) - platform_fee
    
    # Create transfer to cleaner's Stripe account
    transfer = stripe.Transfer.create(
        amount=cleaner_amount,
        currency="usd",
        destination=job.cleaner.stripeAccountId,
        transfer_group=job.id,
        metadata={"job_id": job.id},
    )
    
    # Update job
    await db.job.update(
        where={"id": job_id},
        data={
            "paymentStatus": "RELEASED",
            "paidOutAt": datetime.utcnow(),
        }
    )
    
    # Notify cleaner
    await send_notification(
        job.cleaner.userId,
        f"Payment of ${job.totalPrice} has been released to your account!"
    )
```

Steps for Phase 5:
- [ ] Set up Stripe account
- [ ] Create Connect onboarding flow
- [ ] Build checkout session creation
- [ ] Implement webhook handler
- [ ] Create escrow hold mechanism
- [ ] Create payment release logic
- [ ] Build payment confirmation UI
- [ ] Create earnings dashboard
- [ ] Test full payment flow

---

# PHASE 6: REVIEWS & TRUST

**Timeline:** Weeks 13-14

### 6.1.1 Review Submission
```python
# apps/api/app/api/v1/reviews.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

router = APIRouter()

class CreateReviewRequest(BaseModel):
    jobId: str
    overallRating: int  # 1-5
    categoryRatings: dict  # {"quality": 5, "punctuality": 4, ...}
    text: str | None = None
    tags: List[str] = []
    photos: List[str] = []

@router.post("/")
async def create_review(
    data: CreateReviewRequest,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    job = await db.job.find_unique(
        where={"id": data.jobId},
        include={"client": True, "cleaner": True}
    )
    
    if not job:
        raise HTTPException(404, "Job not found")
    
    if job.status != "COMPLETED":
        raise HTTPException(400, "Job must be completed to review")
    
    # Determine subject based on who is reviewing
    if user.id == job.client.userId:
        # Client reviewing cleaner
        subject_id = job.cleaner.userId
    elif user.id == job.cleaner.userId:
        # Cleaner reviewing client
        subject_id = job.client.userId
    else:
        raise HTTPException(403, "Forbidden")
    
    # Check for existing review
    existing = await db.review.find_first(
        where={
            "jobId": data.jobId,
            "authorId": user.id
        }
    )
    
    if existing:
        raise HTTPException(400, "Already reviewed")
    
    # Create review
    review = await db.review.create(
        data={
            "jobId": data.jobId,
            "authorId": user.id,
            "subjectId": subject_id,
            "overallRating": data.overallRating,
            "categoryRatings": data.categoryRatings,
            "text": data.text,
            "tags": data.tags,
            "photos": data.photos,
        }
    )
    
    # Update subject's ratings
    await update_user_ratings(subject_id, db)
    
    return review

async def update_user_ratings(user_id: str, db):
    """Recalculate user's overall ratings"""
    
    reviews = await db.review.find_many(
        where={"subjectId": user_id}
    )
    
    if not reviews:
        return
    
    total_rating = sum(r.overallRating for r in reviews)
    avg_rating = total_rating / len(reviews)
    
    positive = sum(1 for r in reviews if r.overallRating >= 4)
    satisfaction_pct = (positive / len(reviews)) * 100
    
    # Update appropriate profile
    user = await db.user.find_unique(where={"id": user_id})
    
    if user.role == "CLEANER":
        await db.cleanerprofile.update(
            where={"userId": user_id},
            data={
                "overallRating": avg_rating,
                "totalReviews": len(reviews),
                "satisfactionPct": satisfaction_pct,
            }
        )
    else:
        await db.clientprofile.update(
            where={"userId": user_id},
            data={
                "overallRating": avg_rating,
                "totalReviews": len(reviews),
            }
        )
```

Steps for Phase 6:
- [ ] Create review submission endpoint
- [ ] Build review form UI
- [ ] Implement two-sided simultaneous reveal
- [ ] Create rating calculation logic
- [ ] Build review display component
- [ ] Create badge awarding system
- [ ] Add reviews to profiles
- [ ] Test review flow

---

# PHASE 7: COMMUNICATION

**Timeline:** Weeks 15-16

### 7.1.1 Real-Time Chat
```typescript
// apps/web/src/hooks/useChat.ts
import { useEffect, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useChat(conversationId: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [messages, setMessages] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_WS_URL}/chat/${conversationId}`
    )

    ws.onopen = () => {
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'message') {
        setMessages((prev) => [...prev, data.message])
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      } else if (data.type === 'read') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId ? { ...m, readAt: data.readAt } : m
          )
        )
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
    }

    setSocket(ws)

    return () => {
      ws.close()
    }
  }, [conversationId])

  const sendMessage = useCallback(
    (content: string, attachments: string[] = []) => {
      if (socket && isConnected) {
        socket.send(
          JSON.stringify({
            type: 'message',
            content,
            attachments,
          })
        )
      }
    },
    [socket, isConnected]
  )

  const markAsRead = useCallback(
    (messageId: string) => {
      if (socket && isConnected) {
        socket.send(
          JSON.stringify({
            type: 'read',
            messageId,
          })
        )
      }
    },
    [socket, isConnected]
  )

  return {
    messages,
    sendMessage,
    markAsRead,
    isConnected,
  }
}
```

### 7.1.2 Chat Backend (WebSocket)
```python
# apps/api/app/api/v1/chat.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.database import get_db
from app.services.auth import get_user_from_token
from datetime import datetime
import json

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, conversation_id: str):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        self.active_connections[conversation_id].append(websocket)

    def disconnect(self, websocket: WebSocket, conversation_id: str):
        self.active_connections[conversation_id].remove(websocket)

    async def broadcast(self, conversation_id: str, message: dict):
        if conversation_id in self.active_connections:
            for connection in self.active_connections[conversation_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/chat/{conversation_id}")
async def chat_websocket(
    websocket: WebSocket,
    conversation_id: str,
    db = Depends(get_db)
):
    # Authenticate from query param
    token = websocket.query_params.get("token")
    user = await get_user_from_token(token)
    
    if not user:
        await websocket.close(code=4001)
        return
    
    # Verify user is participant
    participant = await db.conversationparticipant.find_first(
        where={
            "conversationId": conversation_id,
            "userId": user.id
        }
    )
    
    if not participant:
        await websocket.close(code=4003)
        return
    
    await manager.connect(websocket, conversation_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data["type"] == "message":
                # Create message in database
                message = await db.message.create(
                    data={
                        "conversationId": conversation_id,
                        "senderId": user.id,
                        "content": message_data["content"],
                        "attachments": message_data.get("attachments", []),
                        "deliveredAt": datetime.utcnow(),
                    }
                )
                
                # Update conversation last message time
                await db.conversation.update(
                    where={"id": conversation_id},
                    data={"lastMessageAt": datetime.utcnow()}
                )
                
                # Broadcast to all participants
                await manager.broadcast(conversation_id, {
                    "type": "message",
                    "message": {
                        "id": message.id,
                        "senderId": user.id,
                        "content": message.content,
                        "attachments": message.attachments,
                        "createdAt": message.createdAt.isoformat(),
                    }
                })
                
            elif message_data["type"] == "read":
                message_id = message_data["messageId"]
                
                await db.message.update(
                    where={"id": message_id},
                    data={"readAt": datetime.utcnow()}
                )
                
                await manager.broadcast(conversation_id, {
                    "type": "read",
                    "messageId": message_id,
                    "readAt": datetime.utcnow().isoformat(),
                })
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, conversation_id)
```

Steps for Phase 7:
- [ ] Set up WebSocket server
- [ ] Create connection manager
- [ ] Build chat hook
- [ ] Create chat UI component
- [ ] Implement file upload in chat
- [ ] Set up Twilio for SMS
- [ ] Create SMS routing logic
- [ ] Build unified inbox
- [ ] Create notification system
- [ ] Test real-time messaging

---

## GAP ANALYSIS CHECKPOINT: PHASES 3-7

Before proceeding:
- [ ] Property auto-detection works
- [ ] Booking flow completes end-to-end
- [ ] Payments process through Stripe
- [ ] Escrow holds and releases correctly
- [ ] Reviews submit and display
- [ ] Ratings calculate correctly
- [ ] Real-time chat works
- [ ] SMS notifications work

---

*Continue to Phases 8-13 in next section...*
