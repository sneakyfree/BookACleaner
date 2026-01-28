# BookACleaner.ai API Reference

> **Version:** 1.0.0  
> **Base URL:** `http://localhost:8000/api/v1`

---

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### POST /auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "client"
  }
}
```

### POST /auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "client",
  "full_name": "John Doe"
}
```

---

## Users

### GET /users/me
Get current user profile.

### PUT /users/me
Update current user profile.

---

## Cleaners

### GET /cleaners
List all cleaners with filters.

**Query Parameters:**
- `service` - Filter by service type
- `city` - Filter by city
- `min_rating` - Minimum rating (1-5)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

### GET /cleaners/{id}
Get cleaner profile by ID.

### PUT /cleaners/profile
Update cleaner profile (cleaner only).

---

## Jobs

### GET /jobs
List jobs for current user.

**Query Parameters:**
- `status` - Filter by status (pending, confirmed, completed)
- `role` - View as client or cleaner

### POST /jobs
Create a new job/booking.

**Request:**
```json
{
  "cleaner_id": "cleaner-123",
  "property_id": "property-456",
  "services": ["standard", "deep"],
  "scheduled_date": "2026-01-30",
  "scheduled_time": "10:00",
  "notes": "Please bring eco-friendly products"
}
```

### GET /jobs/{id}
Get job details.

### PUT /jobs/{id}/status
Update job status.

**Request:**
```json
{
  "status": "confirmed"
}
```

---

## Properties

### GET /properties
List properties for current client.

### POST /properties
Add a new property.

**Request:**
```json
{
  "name": "Main Residence",
  "address": "123 Main St",
  "city": "Los Angeles",
  "state": "CA",
  "zip_code": "90001",
  "property_type": "house",
  "sqft": 2000,
  "bedrooms": 3,
  "bathrooms": 2
}
```

---

## Messages

### GET /messages/conversations
List conversations.

### GET /messages/conversations/{id}
Get messages in a conversation.

### POST /messages
Send a message.

**Request:**
```json
{
  "conversation_id": "conv-123",
  "content": "Hello, I have a question..."
}
```

---

## Reviews

### GET /reviews
List reviews for a user.

### POST /reviews
Submit a review.

**Request:**
```json
{
  "job_id": "job-123",
  "overall_rating": 5,
  "text": "Excellent service!",
  "category_ratings": {
    "quality": 5,
    "punctuality": 5,
    "communication": 4
  }
}
```

---

## Payments

### POST /payments/create-payment-intent
Create Stripe payment intent.

### POST /payments/create-connected-account
Create Stripe Connect account (cleaner only).

### GET /payments/account-status/{id}
Get Stripe account status.

---

## Bidding (Marketplace)

### GET /bids/marketplace
List open marketplace jobs.

### POST /bids/jobs/{job_id}/bids
Submit a bid on a job.

### POST /bids/{bid_id}/accept
Accept a bid (client only).

---

## Newsfeed

### GET /feed
Get personalized news feed.

**Query Parameters:**
- `role` - Filter by target role
- `type` - Filter by item type (announcement, tip, promo)

---

## Admin

### GET /admin/stats
Get platform statistics.

### GET /admin/users
List all users with filters.

### GET /admin/verifications
List pending verifications.

### POST /admin/verifications/{id}/approve
Approve a verification.

---

## Error Responses

All errors return:

```json
{
  "detail": "Error message description"
}
```

**Status Codes:**
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error
