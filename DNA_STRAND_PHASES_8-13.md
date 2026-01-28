# BookACleaner.ai — DNA Strand Master Plan: Phases 8-13

> **Part 4 of Ultimate DNA Strand**  
> **Continue from Phases 3-7**

---

# PHASE 8: SCHEDULING & AI

**Timeline:** Weeks 17-19  
**Goal:** Agentic intelligence layer

---

## 8.1 Airbnb Calendar Integration

### 8.1.1 iCal Sync Service
```python
# apps/api/app/services/ical_sync.py
import httpx
from icalendar import Calendar
from datetime import datetime, timedelta
from app.database import get_db_sync

async def sync_airbnb_calendar(property_id: str, calendar_url: str, db):
    """Fetch and parse Airbnb iCal, create turnover jobs"""
    
    async with httpx.AsyncClient() as client:
        response = await client.get(calendar_url)
        
    if response.status_code != 200:
        return {"error": "Failed to fetch calendar"}
    
    cal = Calendar.from_ical(response.text)
    
    property = await db.property.find_unique(
        where={"id": property_id},
        include={"client": True}
    )
    
    created_jobs = []
    
    for component in cal.walk():
        if component.name == "VEVENT":
            summary = str(component.get('summary', ''))
            start = component.get('dtstart').dt
            end = component.get('dtend').dt
            
            # Skip blocked/unavailable dates
            if 'blocked' in summary.lower() or 'not available' in summary.lower():
                continue
            
            # This is a booking - create turnover job for checkout day
            checkout_date = end
            
            # Check if job already exists for this date
            existing = await db.job.find_first(
                where={
                    "propertyId": property_id,
                    "scheduledDate": checkout_date,
                    "title": {"contains": "Turnover"}
                }
            )
            
            if existing:
                continue
            
            # Create turnover job
            job = await db.job.create(
                data={
                    "clientId": property.client.id,
                    "propertyId": property_id,
                    "title": f"Airbnb Turnover - {property.name}",
                    "description": f"Guest checkout. Next check-in same day.",
                    "jobType": "DIRECT",
                    "scheduledDate": checkout_date,
                    "scheduledTime": "11:00",  # Default checkout time
                    "status": "PENDING",
                    "services": ["airbnb_turnover"],
                    "basePrice": 0,  # Will be calculated
                    "totalPrice": 0,
                }
            )
            
            created_jobs.append(job.id)
    
    return {"synced": len(created_jobs), "jobIds": created_jobs}

# Celery task for periodic sync
@celery.task
def sync_all_airbnb_calendars():
    """Run every hour to sync all Airbnb calendars"""
    db = get_db_sync()
    
    properties = db.property.find_many(
        where={"airbnbCalendarUrl": {"not": None}}
    )
    
    for prop in properties:
        sync_airbnb_calendar(prop.id, prop.airbnbCalendarUrl, db)
```

### 8.1.2 Google Calendar Sync
```python
# apps/api/app/services/google_calendar.py
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from datetime import datetime, timedelta

async def sync_to_google_calendar(user_id: str, job, db):
    """Add job to cleaner's Google Calendar"""
    
    # Get user's Google credentials
    credentials = await get_user_google_credentials(user_id, db)
    if not credentials:
        return None
    
    service = build('calendar', 'v3', credentials=credentials)
    
    event = {
        'summary': f'🧹 {job.title}',
        'location': f'{job.property.address}, {job.property.city}, {job.property.state}',
        'description': f'''
BookACleaner Job

Client: {job.client.displayName}
Property: {job.property.name}
Services: {', '.join(job.services)}

Special Instructions:
{job.description or 'None'}

---
View in BookACleaner: {settings.frontend_url}/jobs/{job.id}
        ''',
        'start': {
            'dateTime': f'{job.scheduledDate.isoformat()}T{job.scheduledTime}:00',
            'timeZone': 'America/New_York',
        },
        'end': {
            'dateTime': f'{job.scheduledDate.isoformat()}T{add_hours(job.scheduledTime, job.estimatedHours or 2)}:00',
            'timeZone': 'America/New_York',
        },
        'reminders': {
            'useDefault': False,
            'overrides': [
                {'method': 'popup', 'minutes': 60},
                {'method': 'popup', 'minutes': 15},
            ],
        },
    }
    
    event = service.events().insert(calendarId='primary', body=event).execute()
    
    # Store calendar event ID
    await db.job.update(
        where={"id": job.id},
        data={"googleCalendarEventId": event['id']}
    )
    
    return event['id']
```

---

## 8.2 AI Scheduling

### 8.2.1 Route Optimization
```python
# apps/api/app/services/route_optimizer.py
import googlemaps
from itertools import permutations
from app.config import get_settings

settings = get_settings()
gmaps = googlemaps.Client(key=settings.google_maps_api_key)

async def optimize_route(jobs: list, start_location: str = None) -> list:
    """
    Optimize job order for minimum travel time
    Uses Google Distance Matrix API
    """
    
    if len(jobs) <= 1:
        return jobs
    
    # Get all locations
    locations = []
    if start_location:
        locations.append(start_location)
    
    for job in jobs:
        locations.append(f"{job.property.address}, {job.property.city}, {job.property.state}")
    
    # Get distance matrix
    matrix = gmaps.distance_matrix(
        origins=locations,
        destinations=locations,
        mode="driving",
        departure_time="now"
    )
    
    # Extract travel times in minutes
    n = len(locations)
    travel_times = [[0] * n for _ in range(n)]
    
    for i, row in enumerate(matrix['rows']):
        for j, element in enumerate(row['elements']):
            if element['status'] == 'OK':
                travel_times[i][j] = element['duration']['value'] // 60
    
    # Find optimal order (brute force for small n, use TSP solver for larger)
    if len(jobs) <= 6:
        best_order = None
        best_time = float('inf')
        
        start_idx = 0 if start_location else None
        job_indices = list(range(1 if start_location else 0, len(locations)))
        
        for perm in permutations(job_indices):
            total_time = 0
            prev = 0 if start_location else perm[0]
            
            for idx in perm:
                total_time += travel_times[prev][idx]
                prev = idx
            
            if total_time < best_time:
                best_time = total_time
                best_order = perm
        
        # Reorder jobs
        optimized = [jobs[i - (1 if start_location else 0)] for i in best_order]
        
        return {
            "jobs": optimized,
            "totalTravelTime": best_time,
            "route": best_order,
        }
    else:
        # Use OR-Tools for larger sets
        from ortools.constraint_solver import routing_enums_pb2
        from ortools.constraint_solver import pywrapcp
        
        # ... implement TSP solver
        pass

async def suggest_schedule_optimizations(cleaner_id: str, date: str, db) -> list:
    """Analyze schedule and suggest improvements"""
    
    jobs = await db.job.find_many(
        where={
            "cleanerId": cleaner_id,
            "scheduledDate": date,
            "status": {"in": ["CONFIRMED", "PENDING"]}
        },
        include={"property": True},
        orderBy={"scheduledTime": "asc"}
    )
    
    suggestions = []
    
    if len(jobs) >= 2:
        # Check for route optimization
        optimized = await optimize_route(jobs)
        
        current_order = [j.id for j in jobs]
        optimal_order = [j.id for j in optimized["jobs"]]
        
        if current_order != optimal_order:
            suggestions.append({
                "type": "ROUTE_OPTIMIZATION",
                "message": f"Reordering your jobs could save {optimized['totalTravelTime']} minutes of travel time",
                "action": "REORDER",
                "data": optimal_order,
            })
    
    # Check for tight turnovers
    for i, job in enumerate(jobs):
        if i < len(jobs) - 1:
            next_job = jobs[i + 1]
            gap = time_diff(job.scheduledTime, next_job.scheduledTime)
            
            if gap < job.estimatedHours * 60 + 30:  # Less than job time + 30 min buffer
                suggestions.append({
                    "type": "TIGHT_SCHEDULE",
                    "message": f"Tight turnaround between {job.title} and {next_job.title}",
                    "jobIds": [job.id, next_job.id],
                })
    
    return suggestions
```

### 8.2.2 Gap Detection & Filling
```python
# apps/api/app/services/gap_detection.py
from datetime import datetime, timedelta

async def detect_schedule_gaps(cleaner_id: str, week_start: datetime, db) -> list:
    """Find gaps in cleaner's schedule that could be filled"""
    
    week_end = week_start + timedelta(days=7)
    
    # Get cleaner's availability
    availability = await db.availability.find_many(
        where={"cleanerId": cleaner_id}
    )
    
    # Get existing jobs
    jobs = await db.job.find_many(
        where={
            "cleanerId": cleaner_id,
            "scheduledDate": {"gte": week_start, "lt": week_end},
            "status": {"in": ["CONFIRMED", "PENDING"]}
        },
        orderBy={"scheduledDate": "asc"}
    )
    
    gaps = []
    
    for day_offset in range(7):
        date = week_start + timedelta(days=day_offset)
        day_of_week = date.weekday()
        
        # Get availability for this day
        day_availability = next(
            (a for a in availability if a.dayOfWeek == day_of_week),
            None
        )
        
        if not day_availability:
            continue
        
        # Get jobs for this day
        day_jobs = [j for j in jobs if j.scheduledDate.date() == date.date()]
        
        if not day_jobs:
            # Entire day is free
            gaps.append({
                "date": date.isoformat(),
                "startTime": day_availability.startTime,
                "endTime": day_availability.endTime,
                "duration": time_diff(day_availability.startTime, day_availability.endTime),
                "type": "FULL_DAY",
            })
        else:
            # Check for gaps between jobs
            # Before first job
            first_job = day_jobs[0]
            if first_job.scheduledTime > day_availability.startTime:
                gap_duration = time_diff(day_availability.startTime, first_job.scheduledTime)
                if gap_duration >= 90:  # At least 1.5 hours
                    gaps.append({
                        "date": date.isoformat(),
                        "startTime": day_availability.startTime,
                        "endTime": first_job.scheduledTime,
                        "duration": gap_duration,
                        "type": "MORNING_GAP",
                    })
            
            # Between jobs
            for i in range(len(day_jobs) - 1):
                job = day_jobs[i]
                next_job = day_jobs[i + 1]
                
                job_end = add_time(job.scheduledTime, job.estimatedHours or 2)
                gap_duration = time_diff(job_end, next_job.scheduledTime)
                
                if gap_duration >= 90:
                    gaps.append({
                        "date": date.isoformat(),
                        "startTime": job_end,
                        "endTime": next_job.scheduledTime,
                        "duration": gap_duration,
                        "type": "MID_DAY_GAP",
                    })
            
            # After last job
            last_job = day_jobs[-1]
            last_job_end = add_time(last_job.scheduledTime, last_job.estimatedHours or 2)
            if last_job_end < day_availability.endTime:
                gap_duration = time_diff(last_job_end, day_availability.endTime)
                if gap_duration >= 90:
                    gaps.append({
                        "date": date.isoformat(),
                        "startTime": last_job_end,
                        "endTime": day_availability.endTime,
                        "duration": gap_duration,
                        "type": "AFTERNOON_GAP",
                    })
    
    return gaps

async def suggest_gap_fillers(cleaner_id: str, gap: dict, db) -> list:
    """Suggest clients who might want to fill a gap"""
    
    # Get cleaner's service areas
    cleaner = await db.cleanerprofile.find_unique(
        where={"id": cleaner_id},
        include={"serviceAreas": True}
    )
    
    zip_codes = [sa.zipCode for sa in cleaner.serviceAreas]
    
    # Find clients in service area who haven't been cleaned recently
    properties = await db.property.find_many(
        where={
            "zipCode": {"in": zip_codes},
        },
        include={"client": True, "jobs": {"take": 1, "orderBy": {"completedAt": "desc"}}}
    )
    
    suggestions = []
    
    for prop in properties:
        last_job = prop.jobs[0] if prop.jobs else None
        days_since_clean = (datetime.now() - last_job.completedAt).days if last_job else 999
        
        if days_since_clean >= 14:  # At least 2 weeks
            suggestions.append({
                "propertyId": prop.id,
                "propertyName": prop.name,
                "clientName": prop.client.displayName,
                "daysSinceClean": days_since_clean,
                "suggestedDiscount": 10 if gap["type"] == "MORNING_GAP" else 15,
            })
    
    return suggestions[:5]  # Top 5 suggestions
```

---

## 8.3 Agentic Features

### 8.3.1 Conversational Booking
```python
# apps/api/app/services/ai/booking_agent.py
from openai import AsyncOpenAI
from app.config import get_settings
import json

settings = get_settings()
client = AsyncOpenAI(api_key=settings.openai_api_key)

BOOKING_SYSTEM_PROMPT = """
You are the BookACleaner booking assistant. Help users book cleaning services.

You have access to the following functions:
- search_cleaners(location, service_type, date)
- get_cleaner_availability(cleaner_id, date)
- create_booking(cleaner_id, property_id, services, date, time)
- estimate_price(property_id, services)

When a user wants to book:
1. Ask what service they need (if not specified)
2. Ask when they need it (if not specified)
3. Search for available cleaners
4. Present options
5. Confirm booking details
6. Create the booking

Always be friendly and efficient. Use the user's property info to estimate prices.
"""

async def process_booking_message(user_id: str, message: str, conversation_history: list, db):
    """Process a natural language booking request"""
    
    # Get user context
    user = await db.user.find_unique(
        where={"id": user_id},
        include={"clientProfile": {"include": {"properties": True}}}
    )
    
    context = f"""
User has {len(user.clientProfile.properties)} properties:
{json.dumps([{"id": p.id, "name": p.name, "address": p.address} for p in user.clientProfile.properties])}
"""
    
    messages = [
        {"role": "system", "content": BOOKING_SYSTEM_PROMPT + "\n\nContext:\n" + context},
        *conversation_history,
        {"role": "user", "content": message}
    ]
    
    response = await client.chat.completions.create(
        model="gpt-4",
        messages=messages,
        functions=[
            {
                "name": "search_cleaners",
                "description": "Search for available cleaners",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string"},
                        "service_type": {"type": "string"},
                        "date": {"type": "string"},
                    },
                    "required": ["location", "date"]
                }
            },
            {
                "name": "create_booking",
                "description": "Create a booking",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "cleaner_id": {"type": "string"},
                        "property_id": {"type": "string"},
                        "services": {"type": "array", "items": {"type": "string"}},
                        "date": {"type": "string"},
                        "time": {"type": "string"},
                    },
                    "required": ["cleaner_id", "property_id", "services", "date", "time"]
                }
            },
            # ... other functions
        ],
        function_call="auto",
    )
    
    # Handle function calls
    if response.choices[0].message.function_call:
        func_name = response.choices[0].message.function_call.name
        func_args = json.loads(response.choices[0].message.function_call.arguments)
        
        if func_name == "search_cleaners":
            result = await search_cleaners(**func_args, db=db)
        elif func_name == "create_booking":
            result = await create_booking(**func_args, user_id=user_id, db=db)
        # ... handle other functions
        
        # Continue conversation with result
        messages.append(response.choices[0].message)
        messages.append({"role": "function", "name": func_name, "content": json.dumps(result)})
        
        follow_up = await client.chat.completions.create(
            model="gpt-4",
            messages=messages,
        )
        
        return {
            "response": follow_up.choices[0].message.content,
            "action": func_name,
            "result": result,
        }
    
    return {
        "response": response.choices[0].message.content,
        "action": None,
        "result": None,
    }
```

Steps for Phase 8:
- [ ] Create iCal sync service
- [ ] Set up periodic calendar sync
- [ ] Implement Google Calendar integration
- [ ] Build route optimization
- [ ] Create gap detection service
- [ ] Build gap-filling suggestions
- [ ] Create conversational booking agent
- [ ] Build AI scheduling UI
- [ ] Test Airbnb sync end-to-end

---

# PHASE 9: NEWSFEED & COMMUNITY

**Timeline:** Week 20

### 9.1.1 Newsfeed API
```python
# apps/api/app/api/v1/feed.py
from fastapi import APIRouter, Depends

router = APIRouter()

@router.get("/")
async def get_feed(
    page: int = 1,
    limit: int = 20,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get personalized feed for user"""
    
    # Get user context for personalization
    profile = None
    if user.role == "CLEANER":
        profile = await db.cleanerprofile.find_first(
            where={"userId": user.id},
            include={"serviceAreas": True, "services": True}
        )
    
    # Build query filters
    filters = {
        "OR": [
            {"targetAudience": "ALL"},
            {"targetAudience": user.role},
        ]
    }
    
    # Add geo targeting if available
    if profile and profile.serviceAreas:
        zip_codes = [sa.zipCode for sa in profile.serviceAreas]
        filters["OR"].append({"geoTarget": {"hasSome": zip_codes}})
    
    items = await db.feeditem.find_many(
        where=filters,
        orderBy={"createdAt": "desc"},
        skip=(page - 1) * limit,
        take=limit,
    )
    
    return {
        "items": items,
        "page": page,
        "hasMore": len(items) == limit,
    }

@router.post("/{item_id}/like")
async def like_feed_item(
    item_id: str,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    # Toggle like
    existing = await db.feedlike.find_first(
        where={"itemId": item_id, "userId": user.id}
    )
    
    if existing:
        await db.feedlike.delete(where={"id": existing.id})
        return {"liked": False}
    else:
        await db.feedlike.create(
            data={"itemId": item_id, "userId": user.id}
        )
        return {"liked": True}
```

Steps for Phase 9:
- [ ] Create feed data model
- [ ] Create feed API endpoints
- [ ] Build feed UI component
- [ ] Add personalization logic
- [ ] Create admin content tool
- [ ] Implement engagement tracking
- [ ] Test feed displays correctly

---

# PHASE 10: ADMIN & MODERATION

**Timeline:** Weeks 21-22

### 10.1.1 Admin Dashboard
```typescript
// apps/web/src/app/(admin)/admin/page.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UsersTable } from './components/UsersTable'
import { JobsTable } from './components/JobsTable'
import { DisputesQueue } from './components/DisputesQueue'
import { VerificationQueue } from './components/VerificationQueue'

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => fetch('/api/admin/stats').then(r => r.json()),
  })

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.totalUsers}</div>
            <p className="text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.activeJobs}</div>
            <p className="text-muted-foreground">Active Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.pendingVerifications}</div>
            <p className="text-muted-foreground">Pending Verifications</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">${stats?.monthlyRevenue}</div>
            <p className="text-muted-foreground">Monthly Revenue</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="disputes">Disputes ({stats?.openDisputes})</TabsTrigger>
          <TabsTrigger value="verifications">Verifications ({stats?.pendingVerifications})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <UsersTable />
        </TabsContent>
        <TabsContent value="jobs">
          <JobsTable />
        </TabsContent>
        <TabsContent value="disputes">
          <DisputesQueue />
        </TabsContent>
        <TabsContent value="verifications">
          <VerificationQueue />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

Steps for Phase 10:
- [ ] Create admin routes with role check
- [ ] Build admin dashboard
- [ ] Create user management interface
- [ ] Build dispute resolution queue
- [ ] Create verification review queue
- [ ] Add content moderation tools
- [ ] Build analytics dashboard
- [ ] Test admin functions

---

# PHASE 11: MONETIZATION

**Timeline:** Weeks 23-24

### 11.1.1 Ad Integration
```typescript
// apps/web/src/components/ads/AdBanner.tsx
'use client'

import { useEffect } from 'react'

interface AdBannerProps {
  slot: string
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical'
  className?: string
}

export function AdBanner({ slot, format = 'auto', className }: AdBannerProps) {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (e) {
      console.error('Ad failed to load:', e)
    }
  }, [])

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}

// Usage in search results
// <AdBanner slot="1234567890" className="my-4" />
```

### 11.1.2 Sponsored Listings
```python
# apps/api/app/api/v1/sponsored.py
from fastapi import APIRouter, Depends
from datetime import datetime, timedelta

router = APIRouter()

@router.post("/create")
async def create_sponsored_listing(
    data: CreateSponsoredRequest,
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Create a sponsored listing for a cleaner"""
    
    cleaner = await db.cleanerprofile.find_first(where={"userId": user.id})
    if not cleaner:
        raise HTTPException(400, "Cleaner profile not found")
    
    # Calculate price
    duration_days = {
        "week": 7,
        "month": 30,
        "quarter": 90,
    }
    
    base_prices = {
        "week": 25,
        "month": 75,
        "quarter": 200,
    }
    
    days = duration_days[data.duration]
    price = base_prices[data.duration]
    
    # Create Stripe checkout
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": "usd",
                "unit_amount": price * 100,
                "product_data": {
                    "name": f"Sponsored Profile - {data.duration}",
                },
            },
            "quantity": 1,
        }],
        success_url=f"{settings.frontend_url}/cleaner/sponsored?success=true",
        cancel_url=f"{settings.frontend_url}/cleaner/sponsored?cancelled=true",
        metadata={
            "type": "sponsored_listing",
            "cleaner_id": cleaner.id,
            "duration_days": days,
        },
    )
    
    return {"checkoutUrl": session.url}

@router.get("/active")
async def get_sponsored_listings(db = Depends(get_db)):
    """Get currently active sponsored cleaners"""
    
    now = datetime.utcnow()
    
    sponsored = await db.sponsoredlisting.find_many(
        where={
            "status": "ACTIVE",
            "expiresAt": {"gt": now}
        },
        include={"cleaner": True},
        orderBy={"priority": "desc"},
    )
    
    return [s.cleaner for s in sponsored]
```

Steps for Phase 11:
- [ ] Set up Google AdSense
- [ ] Create AdBanner component
- [ ] Integrate ads in search results
- [ ] Build sponsored listings system
- [ ] Create premium tier features
- [ ] Build subscription flow
- [ ] Test ad display
- [ ] Test sponsored listings

---

# PHASE 12: TESTING & QUALITY

**Timeline:** Weeks 25-26

### 12.1.1 E2E Test Example
```typescript
// apps/web/tests/e2e/booking.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test client
    await page.goto('/login')
    await page.fill('[name="email"]', 'test-client@example.com')
    await page.fill('[name="password"]', 'testpassword123')
    await page.click('[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should complete direct booking', async ({ page }) => {
    // Navigate to cleaner profile
    await page.goto('/cleaners/test-cleaner-id')
    await expect(page.locator('h1')).toContainText('Test Cleaner')
    
    // Click book button
    await page.click('text=Book Now')
    
    // Step 1: Select property
    await page.click('[data-property-id="test-property-id"]')
    await page.click('text=Continue')
    
    // Step 2: Select services
    await page.click('text=Standard Clean')
    await page.click('text=Continue')
    
    // Step 3: Select date/time
    await page.click('[data-date="2026-01-30"]')
    await page.click('[data-time="10:00"]')
    await page.click('text=Review Booking')
    
    // Step 4: Review and proceed
    await expect(page.locator('[data-total]')).toContainText('$')
    await page.click('text=Proceed to Payment')
    
    // Should redirect to Stripe
    await expect(page).toHaveURL(/checkout.stripe.com/)
  })

  test('should show cleaner availability', async ({ page }) => {
    await page.goto('/cleaners/test-cleaner-id')
    
    // Check availability calendar
    const calendar = page.locator('[data-testid="availability-calendar"]')
    await expect(calendar).toBeVisible()
    
    // Available dates should be clickable
    const availableDate = calendar.locator('.available').first()
    await expect(availableDate).not.toHaveClass('disabled')
  })
})
```

Steps for Phase 12:
- [ ] Write unit tests for services
- [ ] Write integration tests for APIs
- [ ] Write E2E tests for critical flows
- [ ] Run load testing
- [ ] Perform security audit
- [ ] Manual QA all flows
- [ ] Test mobile responsiveness
- [ ] Run accessibility audit
- [ ] Optimize performance
- [ ] Fix all critical bugs

---

# PHASE 13: LAUNCH PREP

**Timeline:** Weeks 27-28

### 13.1 Deployment Checklist

```markdown
## Pre-Launch Checklist

### Infrastructure
- [ ] Production database provisioned
- [ ] Database backups configured
- [ ] Redis production instance ready
- [ ] SSL certificates installed
- [ ] CDN configured (Cloudflare)
- [ ] Monitoring (Sentry, LogRocket)
- [ ] Alerting (PagerDuty, Slack)

### Security
- [ ] Environment variables secured
- [ ] API rate limiting enabled
- [ ] CORS properly configured
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection enabled

### Legal
- [ ] Privacy Policy published
- [ ] Terms of Service published
- [ ] Cookie consent implemented
- [ ] GDPR compliance verified
- [ ] CCPA compliance verified

### Third-Party Services
- [ ] Stripe production mode enabled
- [ ] Twilio production numbers
- [ ] SendGrid verified domain
- [ ] Google APIs production keys
- [ ] AWS production credentials

### Content
- [ ] Landing page complete
- [ ] Help documentation
- [ ] FAQ page
- [ ] Contact page
- [ ] About page

### Beta Launch
- [ ] Neatology onboarded
- [ ] Test all flows in production
- [ ] Collect feedback
- [ ] Fix critical issues
- [ ] Iterate

### Public Launch
- [ ] Press release ready
- [ ] Social media accounts set up
- [ ] Launch announcement drafted
- [ ] Support process documented
- [ ] On-call rotation scheduled
```

Steps for Phase 13:
- [ ] Complete deployment checklist
- [ ] Set up production environment
- [ ] Configure monitoring
- [ ] Onboard Neatology for beta
- [ ] Collect and address feedback
- [ ] Prepare for public launch

---

# FINAL GAP ANALYSIS

Before declaring complete:

- [ ] All 13 phases completed
- [ ] All tests passing
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Security audited
- [ ] Documentation complete
- [ ] Neatology successfully using platform
- [ ] Ready for public launch

---

## 🎉 LAUNCH READY

When all checkboxes are complete, BookACleaner.ai is ready to launch.

**Remember the mission:**
> "They schedule. We think."

**The platform should feel 20 years from the future.**

🚀 Good luck!
