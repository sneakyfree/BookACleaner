from fastapi import APIRouter
from app.api.v1 import auth, users, cleaners, clients, properties, jobs, reviews, messages, payments, uploads, notifications, ai, verification, admin, bids, feed, hitl, explain, disputes, moderation, route, sponsored, ws, services, agreements, privacy

api_router = APIRouter()

# Include all routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(cleaners.router, prefix="/cleaners", tags=["Cleaners"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(properties.router, prefix="/properties", tags=["Properties"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["Reviews"])
api_router.include_router(messages.router, prefix="/messages", tags=["Messages"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["File Uploads"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Features"])
api_router.include_router(verification.router, prefix="/verification", tags=["Verification"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(bids.router, prefix="/bids", tags=["Marketplace Bidding"])
api_router.include_router(feed.router, prefix="/feed", tags=["Newsfeed"])
# Native WebSocket endpoint the frontend connects to (ws://…/api/v1/ws?token=…).
# ws.py existed but was never mounted, so every messages page logged
# "WebSocket connection failed" and live updates were silently dead.
api_router.include_router(ws.router, tags=["WebSocket"])
api_router.include_router(hitl.router, tags=["HITL Approvals"])
api_router.include_router(explain.router, tags=["Explainability"])
api_router.include_router(disputes.router, prefix="/disputes", tags=["Disputes"])
api_router.include_router(moderation.router, prefix="/moderation", tags=["Content Moderation"])
api_router.include_router(route.router, prefix="/route", tags=["Route Optimization"])
api_router.include_router(sponsored.router, prefix="/sponsored", tags=["Sponsored Listings"])
api_router.include_router(services.router, prefix="/services", tags=["Service Categories"])
api_router.include_router(agreements.router, prefix="/agreements", tags=["Service Agreements"])
api_router.include_router(privacy.router, prefix="/privacy", tags=["Privacy & GDPR"])




