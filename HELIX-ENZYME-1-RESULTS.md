# 🧬 HELIX PROTOCOL — ENZYME 1: SCAN RESULTS
**BookACleaner.ai Platform Gap Analysis**  
**Executed by:** Delta (Kit 0C4) — Subagent Scan  
**Date:** 2026-02-17  
**Scope:** Full codebase audit — DNA spec vs actual implementation  

---

## ⚠️ CRITICAL DISCOVERY UPFRONT

**The backend is NOT using Prisma.** The `prisma/schema.prisma` file is a design artifact — the actual backend runs on **SQLAlchemy + SQLite** (`apps/api/bookacleaner.db`). This is the most important architectural gap in the entire platform. The Prisma schema and SQLAlchemy models have diverged field naming conventions (`passwordHash` vs `password_hash`, `emailVerified` vs `email_verified_at`, etc.).

---

## 📊 MASTER GAP ANALYSIS TABLE

### PHASE 0 — FOUNDATION

| Feature/Codon | Backend (API/DB) | Frontend (UI/UX) | E2E Usable? | UX Quality | Notes |
|---|---|---|---|---|---|
| Monorepo structure (Turborepo/pnpm) | ✅ turbo.json + pnpm workspaces | ✅ apps/web, apps/mobile | ✅ Yes | N/A | `packages/` dir missing (no shared types pkg) |
| CI/CD Pipeline | ✅ .github/workflows/ci.yml + e2e.yml | N/A | 🟡 Partial | N/A | Deployment workflows (staging/prod) absent |
| Docker Compose | ✅ docker-compose.yml exists | N/A | 🟡 Partial | N/A | Not verified working; no health check configs |
| PostgreSQL (spec) | ❌ SQLite is active DB | N/A | ❌ No | N/A | **CRITICAL**: bookacleaner.db is SQLite. PostgreSQL config exists but unused in dev |
| Prisma ORM (spec) | ❌ Not in use | N/A | ❌ No | N/A | Schema exists as design doc. Backend uses SQLAlchemy. Field names diverged. |
| Redis Cache | 🟡 In requirements.txt, cache.py exists | N/A | 🟡 Unknown | N/A | No real caching calls observed; likely non-functional |
| FastAPI backend | ✅ Running, full router, 20+ endpoints | N/A | ✅ Yes | N/A | Main.py well-structured, lifespan, middleware |
| Next.js 14 (App Router) | N/A | ✅ Full app structure | ✅ Yes | ✅ Clean | Correct setup with route groups |
| Tailwind + shadcn/ui | N/A | ✅ Installed, components used | ✅ Yes | ✅ Good | Custom brand colors, dark mode |
| Design Tokens | N/A | ✅ design-tokens.ts | ✅ Yes | ✅ Good | CSS variables + token file |
| Dark Mode (next-themes) | N/A | ✅ ThemeProvider, ThemeToggle | ✅ Yes | ✅ Good | Properly wrapped in providers |
| Zustand State Management | N/A | ✅ bookingStore, uiStore, userStore, messageStore | 🟡 Partial | 🟡 Rough | Stores exist but not consistently used across pages |
| React Query Setup | N/A | ✅ QueryClientProvider in providers.tsx | 🟡 Partial | 🟡 Rough | Only useApi hook uses it; dashboard pages use raw fetch |
| Error Handling (global) | ✅ Middleware + exceptions.py | ✅ ErrorBoundary, global-error.tsx | 🟡 Partial | 🟡 Rough | API errors caught but FE error display inconsistent |
| CORS Configuration | ✅ Environment-aware CORS in main.py | N/A | ✅ Yes | N/A | Localhost + prod domains configured |
| Rate Limiting | ✅ RateLimitMiddleware (opt-in) | N/A | 🟡 Partial | N/A | Only enabled in prod or via env flag |
| Request Logging | ✅ RequestLoggingMiddleware | N/A | ✅ Yes | N/A | Logs all requests |
| Health Endpoints | ✅ /health, /health/db, /health/redis | N/A | ✅ Yes | N/A | Prometheus metrics also present |
| Environment Variables | 🟡 All mock/dev defaults hardcoded | N/A | 🟡 Risky | N/A | JWT_SECRET is a hardcoded dev value; production validator exists but relies on DEV_MODE env var |
| Startup Validation | ✅ startup_validation.py runs on boot | N/A | ✅ Yes | N/A | Checks env, db, optional services |

---

### PHASE 1 — USER SYSTEM

| Feature/Codon | Backend (API/DB) | Frontend (UI/UX) | E2E Usable? | UX Quality | Notes |
|---|---|---|---|---|---|
| User Registration API | ✅ POST /api/v1/auth/register | ✅ Fully implemented page | ✅ Yes | ✅ Polished | Two-step role selection, password confirmation, error handling |
| User Login API | ✅ POST /api/v1/auth/login + JWT | ✅ Login page with email/password | ✅ Yes | ✅ Clean | callbackUrl redirect, error display |
| Google OAuth | ✅ POST /api/v1/auth/oauth/google | ❌ Disabled on FE ("Coming Soon") | ❌ No | ❌ Dead | NextAuth Google configured but UI button is hardcoded disabled |
| JWT Auth Tokens | ✅ jose JWT, 30min access token | ✅ NextAuth session with accessToken | 🟡 Partial | N/A | Token refresh not observed; potential expiry issue after 30min |
| Email Verification | ✅ Token-based verification endpoint | 🟡 verify-email page exists | 🟡 Partial | 🟡 Rough | SendGrid key is mock in dev; email won't actually send |
| Password Reset | ✅ forgot-password + reset-password | ✅ Both pages exist | 🟡 Partial | 🟡 OK | Same mock email issue |
| Protected Route Middleware | ✅ N/A (backend checks) | ✅ middleware.ts with withAuth | ✅ Yes | N/A | Role-based redirects work |
| User Profile (GET /me) | ✅ GET /api/v1/auth/me | 🟡 Used in some pages | 🟡 Partial | N/A | No dedicated profile page found |
| Profile Management (update) | 🟡 PUT /users/{id} likely in users.py | 🟡 Settings pages exist (mock data) | 🟡 Partial | 🟡 Rough | Settings pages don't appear wired to API |
| Account Roles (CLIENT/CLEANER/ADMIN) | ✅ UserRole enum, 3 roles | ✅ Role-aware nav/routing | ✅ Yes | ✅ Good | Role propagated through JWT and NextAuth session |
| Phone Verification (SMS OTP) | 🟡 SMS service + PhoneVerification model | 🟡 Verification page has phone step | 🟡 Partial | 🟡 Rough | Twilio credentials are mock values |
| Welcome/Onboarding Flow | N/A | 🟡 /welcome/page.tsx exists | 🟡 Partial | 🟡 Rough | Onboarding page exists but not linked from registration flow |
| Auth Token Refresh | 🟡 refresh_token fields on User model | 🟡 lib/auth/refresh.ts exists | 🟡 Partial | N/A | Refresh logic exists but may not be fully wired |

---

### PHASE 2 — CLEANER PROFILES

| Feature/Codon | Backend (API/DB) | Frontend (UI/UX) | E2E Usable? | UX Quality | Notes |
|---|---|---|---|---|---|
| Cleaner Search API | 🟡 GET /api/v1/cleaners/ exists | 🟡 Public cleaners page uses MOCK DATA | ❌ No | 🟡 Good UI | Backend: `find_many()` + in-memory filtering — no SQL WHERE; O(N) expensive; search page hard-codes mock cleaners |
| Cleaner Public Profile | 🟡 GET /api/v1/cleaners/{id} | 🟡 Profile page uses mock data | ❌ No | ✅ Rich UI | `cleanerProfilePage` has detailed mock; no real fetch |
| Cleaner Profile Update | 🟡 PATCH /api/v1/cleaners/me | 🟡 Settings page exists | 🟡 Partial | 🟡 Rough | Unclear if frontend calls API |
| Portfolio Photos | 🟡 DB model exists, upload service | ❌ No portfolio upload UI | ❌ No | N/A | S3 upload service exists but AWS keys not configured |
| Service Listings | 🟡 CleanerService model exists | 🟡 Profile shows services (mock) | 🟡 Partial | N/A | No UI for cleaner to manage their service catalog |
| Service Areas / Coverage | 🟡 ServiceArea model in SQLAlchemy | ❌ No management UI | ❌ No | N/A | Not exposed in any frontend component |
| Availability Calendar | 🟡 Availability model exists | 🟡 Calendar page exists | 🟡 Partial | 🟡 Rough | Calendar page has basic UI; not wired to API |
| Verification Tier Badge | ✅ Backend calculates tier | ✅ TierBadge component | ✅ Yes | ✅ Good | Component exists with 5-tier colors/labels |
| Cleaner Search Filters | 🟡 Backend params exist (location, service, rating, tier) | 🟡 UI filter panel exists | 🟡 Partial | 🟡 OK | Filters rendered in UI but hitting mock data, not API |
| Rating/Review Aggregation | 🟡 rating field on CleanerProfile model | 🟡 Shown in profiles (mock) | 🟡 Partial | N/A | No aggregation job/trigger observed |

---

### PHASE 3 — BOOKING SYSTEM

| Feature/Codon | Backend (API/DB) | Frontend (UI/UX) | E2E Usable? | UX Quality | Notes |
|---|---|---|---|---|---|
| Booking Wizard UI | N/A | ✅ Multi-step wizard (5 steps) | 🟡 Partial | ✅ Good UX | Step 1: Property (fetches API ✅), Steps 2-5 need auth token fixes |
| Job Creation API | ✅ POST /api/v1/jobs/ | 🟡 Wizard submits to API | 🟡 Partial | N/A | Property fetch works; subsequent steps use localStorage token |
| Price Estimation API | ✅ POST /api/v1/jobs/estimate | ✅ Called in wizard step 4 | ✅ Yes | ✅ Good | SERVICE_PRICES dict with sqft multiplier |
| Job Type: Direct Booking | 🟡 jobType=DIRECT, cleaner_id assignable | 🟡 Wizard allows cleaner selection | 🟡 Partial | N/A | cleaner_id selection not fully exposed in wizard |
| Job Type: Marketplace/Bid | 🟡 BID type, bids table | 🟡 Marketplace page exists | 🟡 Partial | 🟡 Rough | Falls back to mock on API error |
| Job Listing (Client) | ✅ GET /api/v1/jobs/ (auth required) | 🟡 bookings/page exists | 🟡 Partial | 🟡 Rough | Page exists, unclear if properly wired |
| Job Listing (Cleaner) | ✅ GET /api/v1/jobs/ (filters by role) | 🟡 Jobs page uses mock data | ❌ No | 🟡 Good UI | Mock data hardcoded in cleaner/jobs/page.tsx |
| Job Detail View | 🟡 GET /api/v1/jobs/{id} | 🟡 client/bookings/[id]/page.tsx | 🟡 Partial | 🟡 Rough | Single job page exists |
| Job Status Update | ✅ PATCH /api/v1/jobs/{id}/status | 🟡 "Start" button in cleaner UI | 🟡 Partial | N/A | Button exists, wiring unclear |
| Real-time Job Status Tracker | N/A | 🟡 job-status-tracker.tsx component | 🟡 Partial | 🟡 Rough | Component exists but likely not integrated on job pages |
| Cleaner Accept/Reject Job | 🟡 API endpoint exists | 🟡 UI button shown | 🟡 Partial | N/A | accept/decline endpoints in jobs.py |
| Bid System | ✅ POST /api/v1/bids/, accept bid endpoint | 🟡 Marketplace page with bid modal | 🟡 Partial | 🟡 OK | Backend robust; frontend has mock fallback |
| Client Booking Dashboard | 🟡 API calls but missing auth header | 🟡 Dashboard fetches /jobs/ and /properties/ | ❌ Broken | 🟡 Good UI | **SECURITY BUG**: client/page.tsx fetches without Authorization header |

---

### PHASE 4 — REVIEWS & RATINGS

| Feature/Codon | Backend (API/DB) | Frontend (UI/UX) | E2E Usable? | UX Quality | Notes |
|---|---|---|---|---|---|
| Create Review API | ✅ POST /api/v1/reviews/ (auth, completed jobs only) | ❌ No review submission UI found | ❌ No | N/A | Backend solid; no frontend form to create a review |
| Two-sided Reviews | ✅ author/subject fields, both roles can review | ❌ No bidirectional review UI | ❌ No | N/A | Schema supports it; not exposed |
| Category Ratings | 🟡 categoryRatings JSON field + schema | ❌ No multi-category rating UI | ❌ No | N/A | Only overall rating in request schema |
| Review Tags | 🟡 tags JSON array field | ❌ No tag selection UI | ❌ No | N/A | Not surfaced in frontend |
| Review Photos | 🟡 photos JSON array field | ❌ No photo upload on review | ❌ No | N/A | S3 upload service not connected here |
| Blind Review Reveal | 🟡 `revealed` field on Review model | ❌ No reveal mechanism UI | ❌ No | N/A | DNA spec requires both reviews locked until both submit |
| Review Response (by subject) | ✅ POST /api/v1/reviews/{id}/respond | ❌ No response UI | ❌ No | N/A | Endpoint exists, no UI |
| Reviews Display (Cleaner Profile) | ❌ No real review fetch in profile | 🟡 Mock reviews shown on profile | ❌ No | 🟡 OK | All mock data |
| Review Moderation | 🟡 FlaggedContent model, moderation API | 🟡 Admin moderation page (mock) | 🟡 Partial | N/A | Backend wired; admin UI uses mock data |
| Rating Aggregation on Profile | ❌ No rating recalc trigger | 🟡 Rating shown (mock) | ❌ No | N/A | After review creation, no code updates cleaner's rating |

---

### PHASE 5 — MESSAGING

| Feature/Codon | Backend (API/DB) | Frontend (UI/UX) | E2E Usable? | UX Quality | Notes |
|---|---|---|---|---|---|
| Conversations API | 🟡 GET /api/v1/messages/conversations (fragile) | 🟡 Messages pages exist | 🟡 Partial | 🟡 Rough | Backend gets ALL conversations, no participant filter in DB query |
| Send Message API | 🟡 POST /api/v1/messages/send | 🟡 Chat UI components exist | 🟡 Partial | 🟡 Rough | Basic send/receive |
| WebSocket Server (Socket.IO) | ✅ socketio server mounted at /ws | ✅ useWebSocket + useRealtimeChat hooks | 🟡 Partial | 🟡 Rough | Server exists; frontend hooks exist; integration on pages unclear |
| Real-time Chat UI | N/A | ✅ RealtimeChat component, job-status-tracker | 🟡 Partial | ✅ Good | Clean component with typing indicators, read receipts |
| Notification Bell | N/A | ✅ notification-bell.tsx component | 🟡 Partial | ✅ Good | Component exists; needs real data feed |
| SMS Fallback (Twilio) | 🟡 sms service + Twilio client init | ❌ No UI trigger for SMS | 🟡 Partial | N/A | Twilio keys are mock |
| In-app Notifications | ✅ Notification model, notifications API | 🟡 notification-bell component | 🟡 Partial | 🟡 Rough | Backend stores notifications; frontend component doesn't fetch real data |
| Push Notifications (Firebase) | 🟡 Firebase service (non-critical path) | 🟡 PushNotifications.tsx component | 🟡 Partial | N/A | Firebase not initialized without credentials |
| Message Attachments | 🟡 attachments JSON array in Message model | ❌ No attachment upload UI in chat | ❌ No | N/A | S3 service available but not connected |

---

### PHASE 6 — ADMIN PANEL

| Feature/Codon | Backend (API/DB) | Frontend (UI/UX) | E2E Usable? | UX Quality | Notes |
|---|---|---|---|---|---|
| Admin Authentication | ✅ Admin role check in get_admin_user() | ✅ /admin/* routes in middleware | ✅ Yes | N/A | Proper admin-only guard |
| Platform Stats API | ✅ GET /api/v1/admin/stats | 🟡 Analytics page uses mock data | 🟡 Partial | ✅ Rich UI | Backend stats are real; frontend ignores them (mock hardcoded) |
| User Management | ✅ Admin user list/manage endpoints | 🟡 admin/users/page uses mock data | 🟡 Partial | 🟡 OK | Same mock data pattern |
| Verification Approvals | ✅ Admin approve/reject verification | 🟡 admin/verifications/page | 🟡 Partial | 🟡 OK | Backend endpoint; frontend mock |
| Dispute Management | ✅ disputes API (create, list, resolve) | 🟡 admin/disputes/page | 🟡 Partial | 🟡 OK | Resolution actions partially wired |
| Content Moderation | ✅ moderation API (flag, review, remove) | 🟡 admin/moderation/page | 🟡 Partial | 🟡 OK | API works; UI uses mock data |
| Audit Log | 🟡 audit service (services/audit.py) | 🟡 admin/audit/page (mock) | 🟡 Partial | N/A | Audit calls likely not hooked throughout codebase |
| HITL Approval Queue | 🟡 In-memory queue only (Python list!) | 🟡 admin/approvals/page | ❌ No | N/A | **CRITICAL**: HITL queue lost on every server restart. No DB persistence. |
| Ban/Suspend Users | 🟡 Status field on User model | 🟡 Admin UI | 🟡 Partial | N/A | UserStatus enum exists; admin action endpoints unclear |
| Sponsored Listings | 🟡 In-memory only (no DB table!) | ❌ No admin management UI | ❌ No | N/A | SponsoredListing is a dict in memory. No persistence. |

---

### PHASE 7 — CLEANER TOOLS

| Feature/Codon | Backend (API/DB) | Frontend (UI/UX) | E2E Usable? | UX Quality | Notes |
|---|---|---|---|---|---|
| Cleaner Calendar View | 🟡 Jobs fetched by cleaner_id | 🟡 Calendar page exists | 🟡 Partial | 🟡 Rough | Basic calendar; no real-time job display |
| Schedule Gap Suggestions | 🟡 Route optimizer has gap logic | 🟡 Routes page shows mock gaps | 🟡 Partial | ✅ Good UI | Mock data; not pulling real schedule |
| Route Optimization API | ✅ POST /api/v1/route/optimize | 🟡 Routes page, mock route displayed | 🟡 Partial | ✅ Good UI | Backend TSP algorithm works; frontend doesn't call real API |
| Cleaner Earnings Page | 🟡 No dedicated earnings endpoint | 🟡 Earnings page (all mock data) | ❌ No | ✅ Good UI | No API call; fully mock |
| Payout Management | 🟡 Stripe transfer endpoint in payments.py | 🟡 Earnings page has mock payout list | ❌ No | 🟡 OK | Stripe Connect partially set up |

---

### PHASE 8 — SCHEDULING & AI

| Feature/Codon | Backend (API/DB) | Frontend (UI/UX) | E2E Usable? | UX Quality | Notes |
|---|---|---|---|---|---|
| Airbnb iCal Sync | ✅ ICalSyncService fully implemented | 🟡 Property has airbnb_calendar_url field | 🟡 Partial | N/A | No scheduler/cron to periodically run sync; no webhook trigger |
| Google Calendar Sync | 🟡 google_calendar.py service exists | ❌ No OAuth flow for Google Cal | ❌ No | N/A | Needs OAuth credentials and flow |
| Auto-create Turnover Jobs | 🟡 ICalSync creates jobs on checkout | 🟡 Triggered on demand only | 🟡 Partial | N/A | Manual trigger; no background job |
| Smart Property Detector | 🟡 AI address parsing endpoint | 🟡 smart-property-detector.tsx | 🟡 Partial | ✅ Good | Component exists; depends on OpenAI key |
| AI Chat Assistant | ✅ POST /api/v1/ai/chat | ✅ AIChatWidget.tsx, chat-assistant.tsx | ✅ Yes | ✅ Good | Well-implemented; needs real OpenAI key |
| Document AI Parser (GPT-4V) | ✅ parse_verification_document() | 🟡 document-scanner.tsx component | 🟡 Partial | 🟡 Rough | AI service implemented; needs real API key |
| AI Price Estimation | ✅ POST /api/v1/ai/estimate | 🟡 Called in booking wizard | 🟡 Partial | N/A | Backend uses SERVICE_PRICES dict (not AI) |
| Explainability Engine | ✅ /explain + explainer.py service | ✅ explainability/index.tsx component | 🟡 Partial | ✅ Novel | Explains AI decisions — innovative feature |
| Contradiction Detection | 🟡 contradiction.py service | ❌ No frontend integration | ❌ No | N/A | Service coded; not hooked into review flow |
| Badge Engine | 🟡 badge_engine.py service, Badge/UserBadge models | ❌ No badge display in profiles | ❌ No | N/A | Engine coded; not called anywhere observable |
| HITL Human Approvals | 🟡 hitl.py endpoint, in-memory queue | 🟡 admin/approvals/page | ❌ No | N/A | Queue lost on restart; no persistent store |

---

### PHASE 9 — MOBILE APP

| Feature/Codon | Backend (API/DB) | Frontend (UI/UX) | E2E Usable? | UX Quality | Notes |
|---|---|---|---|---|---|
| React Native Expo Setup | N/A | ✅ 5-tab Expo Router app | ✅ Runs | 🟡 Basic | Basic structure; tabs exist |
| Home Screen | N/A | 🟡 Hardcoded mock data | 🟡 Partial | 🟡 OK | Shows mock upcoming booking |
| Bookings Tab | N/A | 🟡 Mock data | ❌ No | 🟡 OK | No API calls |
| Search/Find Cleaners Tab | N/A | 🟡 Mock data | ❌ No | 🟡 OK | No API calls |
| Messages Tab | N/A | 🟡 Mock data | ❌ No | 🟡 OK | No API calls |
| Profile Tab | N/A | 🟡 Mock data | ❌ No | 🟡 OK | No API calls |
| API Client (lib/api.ts) | N/A | 🟡 Basic setup | ❌ No | N/A | File exists; unclear if any screen uses it |
| Auth (login in mobile) | N/A | ❌ No auth screens | ❌ No | ❌ Missing | No login/register screens in mobile app |
| Push Notifications (mobile) | 🟡 Firebase service on backend | ❌ No FCM in mobile app | ❌ No | N/A | Not integrated |
| Offline Support | N/A | 🟡 useOfflineStore.ts exists | 🟡 Partial | N/A | Web app has offline hook; mobile doesn't |

---

### PHASE 10 — PAYMENTS

| Feature/Codon | Backend (API/DB) | Frontend (UI/UX) | E2E Usable? | UX Quality | Notes |
|---|---|---|---|---|---|
| Stripe Payment Intent | ✅ POST /api/v1/payments/create-payment-intent | 🟡 StripePaymentForm.tsx component | 🟡 Partial | 🟡 Rough | Component exists; needs real Stripe publishable key |
| Escrow/Hold (manual capture) | ✅ capture_method="manual" in PaymentIntent | 🟡 Not surfaced to user | 🟡 Partial | N/A | Backend logic correct; no UI indication of escrow |
| Release Payment to Cleaner | ✅ POST /api/v1/payments/capture-and-transfer | ❌ No admin/client trigger UI | ❌ No | N/A | Endpoint exists; nothing calls it |
| Stripe Connect Onboarding | 🟡 Create account + onboarding link endpoints | 🟡 StripeConnectOnboarding.tsx | 🟡 Partial | 🟡 Rough | Component exists; not in settings page flow |
| Platform Fee (15%) | ✅ PLATFORM_FEE_PERCENT = 15 in code | N/A | 🟡 Partial | N/A | Hardcoded 15%; not configurable |
| Refunds | ✅ POST /api/v1/payments/refund | ❌ No refund UI | ❌ No | N/A | API only |
| Subscription Plans | 🟡 Subscription model + Stripe sub endpoints | ❌ No subscription UI/flow | ❌ No | N/A | Schema exists; no checkout for subscriptions |
| Payment Summary Component | N/A | ✅ PaymentSummary.tsx | 🟡 Partial | 🟡 OK | Component exists but may not be integrated |
| Webhook Handler | 🟡 POST /api/v1/payments/webhook | N/A | 🟡 Partial | N/A | Webhook endpoint exists; needs real Stripe secret |
| Client Stripe Customer | 🟡 stripeCustomerId on ClientProfile | 🟡 Booking wizard creates customer | 🟡 Partial | N/A | Mock key won't actually create customers |

---

### PHASE 11 — VERIFICATION SYSTEM

| Feature/Codon | Backend (API/DB) | Frontend (UI/UX) | E2E Usable? | UX Quality | Notes |
|---|---|---|---|---|---|
| 5-Tier Verification System | ✅ TIER_REQUIREMENTS dict, calculate_tier() | ✅ Verification page (full 5-tier UI) | 🟡 Partial | ✅ Polished | Backend logic solid; tier calc works |
| Email Verification | 🟡 token system, email service | 🟡 verify-email page | 🟡 Partial | 🟡 OK | SendGrid mock key blocks actual email |
| Phone Verification (OTP) | 🟡 PhoneVerification model, SMS service | 🟡 Phone step in verification page | 🟡 Partial | 🟡 OK | Twilio mock key |
| ID Document Upload | 🟡 Verification model, uploads API | 🟡 Upload UI in verification page | 🟡 Partial | 🟡 OK | AWS S3 keys not configured |
| Business License Verify | 🟡 VerificationType.BUSINESS_LICENSE | 🟡 Upload UI | 🟡 Partial | N/A | Same S3 issue |
| Insurance Verify | 🟡 VerificationType.INSURANCE | 🟡 Upload UI | 🟡 Partial | N/A | Same S3 issue |
| IICRC Certification | 🟡 Certification model + endpoint | 🟡 Certification section | 🟡 Partial | N/A | API partial |
| Background Check (Checkr) | 🟡 BackgroundCheckService fully coded | ❌ No UI trigger | ❌ No | N/A | No CHECKR_API_KEY configured |
| AI Document Parsing | ✅ AI service with GPT-4V prompts | 🟡 document-scanner.tsx | 🟡 Partial | ✅ Innovative | Needs real OpenAI key |
| Admin Approval of Docs | ✅ Admin approve/reject endpoints | 🟡 Admin verifications page (mock) | 🟡 Partial | N/A | Flow: upload→admin review→approve |

---

### PHASE 12 — PROPERTY PLAYBOOK

| Feature/Codon | Backend (API/DB) | Frontend (UI/UX) | E2E Usable? | UX Quality | Notes |
|---|---|---|---|---|---|
| Property Creation | ✅ POST /api/v1/properties/ | 🟡 /client/properties/new/page exists | 🟡 Partial | 🟡 OK | Form exists; API wiring unclear |
| Property List | ✅ GET /api/v1/properties/ | ✅ client/properties/page shows list | 🟡 Partial | 🟡 OK | Fetch called; auth token from session |
| Property Playbook Model | ✅ PropertyPlaybook table | ✅ Playbook editor UI | 🟡 Partial | ✅ Good | **Save button not wired** — comment says "Wire to PUT /api/v1/properties/{id}/playbook" |
| Airbnb Calendar URL | ✅ airbnb_calendar_url field | 🟡 Field shown in property form | 🟡 Partial | N/A | No sync trigger from property form |
| Property AI Detection | 🟡 ai.py estimate endpoint | 🟡 smart-property-detector.tsx | 🟡 Partial | ✅ Cool | Auto-detect sqft/beds from address |
| Access Info / Notes | ✅ access_info + special_notes fields | ✅ Shown in playbook editor | 🟡 Partial | ✅ Good | Data model supports it |

---

### PHASE 13 — PUBLIC PAGES & LAUNCH

| Feature/Codon | Backend (API/DB) | Frontend (UI/UX) | E2E Usable? | UX Quality | Notes |
|---|---|---|---|---|---|
| Landing Page | N/A | ✅ Full landing with hero, features, CTA | ✅ Yes | ✅ Good | Clean glassmorphism design |
| Public Cleaner Directory | ❌ No real API used | 🟡 Page uses hardcoded mock data | ❌ No | ✅ Good UI | Disconnect: good UI, no real data |
| Pricing Page | N/A | ✅ Pricing page exists | ✅ Yes | 🟡 Static | Static pricing, no dynamic tiers |
| Terms of Service | N/A | ✅ terms/page exists | ✅ Yes | 🟡 Basic | Appears to be placeholder text |
| Privacy Policy | N/A | ✅ privacy/page exists | ✅ Yes | 🟡 Basic | Same |
| FAQ Page | N/A | ✅ FAQPage component | ✅ Yes | 🟡 OK | Hardcoded FAQ content |
| Direct Booking Link | 🟡 /book/[cleanerId] page | 🟡 public booking page | 🟡 Partial | 🟡 OK | Page exists; integration depth unclear |
| Offline Page | N/A | ✅ /offline/page.tsx | ✅ Yes | 🟡 Basic | PWA offline page |
| Feed / Newsfeed | ✅ FeedItem model + feed API | 🟡 dashboard/feed/page exists | 🟡 Partial | 🟡 OK | Backend seeded; feed UI not polished |
| I18n / Localization | N/A | 🟡 I18nProvider.tsx exists | ❌ No | N/A | Provider exists but no translations; scaffolding only |
| Accessibility | N/A | 🟡 lib/accessibility.tsx exists | 🟡 Partial | N/A | Helper exists; not consistently applied |
| Performance Monitoring | N/A | 🟡 lib/performance.tsx | 🟡 Partial | N/A | Scaffolding exists |
| SEO / Metadata | N/A | 🟡 layout.tsx has basic metadata | 🟡 Partial | N/A | No per-page SEO, no OG images |

---

## 🔴 CRITICAL SECURITY ISSUES

| # | Issue | Severity | Location |
|---|---|---|---|
| 1 | **No auth headers on Client Dashboard API calls** | 🔴 CRITICAL | `client/page.tsx` fetches `/api/v1/jobs/` and `/api/v1/properties/` WITHOUT `Authorization: Bearer` header |
| 2 | **JWT secret is hardcoded dev key** | 🔴 CRITICAL | `config.py`: `jwt_secret = "dev-secret-key-change-in-production-abc123xyz789"` — relies on `DEV_MODE` env var which defaults to `"true"` |
| 3 | **HITL queue is in-memory Python list** | 🟠 HIGH | `hitl.py`: `approval_queue: List[ApprovalRequest] = []` — lost on every server restart |
| 4 | **Sponsored listings have no DB persistence** | 🟠 HIGH | `sponsored.py`: Returns in-memory dict; no DB table; data evaporates |
| 5 | **SQLite in dev (not PostgreSQL)** | 🟠 HIGH | `database.py` defaults to `sqlite+aiosqlite:///./bookacleaner.db` |
| 6 | **Google OAuth disabled on frontend** | 🟡 MEDIUM | `login/page.tsx`: Button hardcoded disabled with `cursor-not-allowed` |
| 7 | **Playbook save button not wired to API** | 🟡 MEDIUM | `playbook/page.tsx`: Comment says "Wire to PUT..." but save calls `setSaved(true)` only |
| 8 | **Cleaner dashboard jobs use mock data** | 🟡 MEDIUM | All cleaner/* pages use hardcoded mock objects |
| 9 | **Admin analytics uses mock data** | 🟡 MEDIUM | Real stats API exists but frontend ignores it |
| 10 | **No rating recalculation after review** | 🟡 MEDIUM | reviews.py creates review but never updates `cleaner_profile.rating` |

---

## 📊 FEATURE COUNTS

| Status | Count |
|--------|-------|
| ✅ Vibrant — Fully Working | **14** |
| 🟡 Partial — Exists but Incomplete | **71** |
| ❌ Missing — Not Implemented | **24** |
| **TOTAL FEATURES SCANNED** | **109** |

---

## 🏥 OVERALL HEALTH SCORE: **38 / 100**

### Breakdown:
- **Foundation/Infrastructure**: 65/100 — Good bones, wrong DB, no packages dir
- **Auth/User System**: 70/100 — Backend solid, Google OAuth dead, session expiry risk
- **Core Booking Flow**: 35/100 — Wizard exists, auth bugs, mock data everywhere
- **Reviews**: 15/100 — Backend good, virtually no frontend
- **Messaging**: 40/100 — WebSocket server exists, chat component exists, pages not wired
- **Admin Panel**: 45/100 — All pages exist, 90% mock data
- **AI Features**: 50/100 — Impressive services coded, needs real API keys
- **Payments**: 30/100 — Stripe integrated but mock keys, no E2E flow
- **Verification**: 40/100 — Good backend, all third-party keys are mock
- **Mobile App**: 10/100 — Skeleton only, no auth, no real data

---

## 🚨 TOP 5 CRITICAL BLOCKERS

### 1. 🔴 CLIENT DASHBOARD UNAUTHENTICATED API CALLS
`apps/web/src/app/(dashboard)/client/page.tsx` fetches from the backend WITHOUT passing the auth token. Every API call returns 401. The client dashboard is broken for any real user:
```javascript
// BROKEN — no auth header
fetch(`${API_URL}/api/v1/jobs/`)  
fetch(`${API_URL}/api/v1/properties/`)
```
**Fix**: Pass `Authorization: Bearer ${session?.accessToken}` in all fetch headers.

### 2. 🔴 SQLITE + NO PRISMA = PRODUCTION CATASTROPHE  
The DNA spec calls for PostgreSQL + Prisma. The actual backend uses SQLite + SQLAlchemy. The Prisma schema is dead code. SQLite has no concurrent write support, no production scalability, and no migration tooling. The field naming conventions between the Prisma schema and SQLAlchemy models diverge completely.  
**Fix**: Migrate to PostgreSQL. Choose ONE ORM (either Prisma with prisma-client-py OR SQLAlchemy) and standardize.

### 3. 🔴 MOCK DATA INFECTION — FRONTEND IS A BEAUTIFUL LIE
Nearly every dashboard page (cleaner/jobs, cleaner/earnings, cleaner/dashboard, cleaner/marketplace, cleaners search, cleaner profile, admin analytics) uses hardcoded mock data objects. The platform appears to work but is displaying fake data. A real user would register, log in, and see someone else's fake jobs and earnings.  
**Fix**: Replace all mock data with real authenticated API calls. Prioritize: cleaner dashboard, cleaner jobs, booking flow.

### 4. 🔴 HITL QUEUE + SPONSORED LISTINGS = IN-MEMORY ONLY
Both the Human-in-the-Loop approval queue and sponsored listing system store data in Python memory (lists/dicts). Every server restart wipes these. These systems CANNOT be used in production.  
**Fix**: Add `SponsoredListing` model to SQLAlchemy. Persist HITL queue to DB via a `ApprovalQueue` model.

### 5. 🔴 NO E2E PAYMENT FLOW
The payment flow requires: Stripe Payment Form → Stripe Intent Creation → Escrow Hold → Job Completion → Release to Cleaner (Stripe Connect Transfer). Currently:
- Stripe keys are mock (`sk_test_mock_dev_key`)
- StripeConnectOnboarding component isn't linked from cleaner settings
- Release payment endpoint exists but nothing triggers it
- Client dashboard doesn't even load jobs (blocker #1)

**Fix**: Get real Stripe test keys, wire StripeConnectOnboarding into cleaner onboarding, wire release button to job completion, add webhook handling.

---

## 🧬 ENZYME 2 RECOMMENDATION: REPAIR ORDER

Based on dependency chains and user-facing impact:

### Priority 1 — AUTH & DATA LAYER (Week 1)
1. Fix auth headers on ALL frontend API calls (client/page.tsx, every page)
2. Migrate SQLite → PostgreSQL in dev environment
3. Standardize on SQLAlchemy (remove Prisma confusion) OR migrate to Prisma properly
4. Add DB persistence for HITL queue and Sponsored listings

### Priority 2 — KILL THE MOCKS (Week 2)  
5. Cleaner dashboard: Replace mock jobs with real API call + auth
6. Cleaner jobs page: Wire to GET /api/v1/jobs/ with auth
7. Cleaner earnings: Build GET /api/v1/cleaners/me/earnings endpoint
8. Admin analytics: Wire to real GET /api/v1/admin/stats

### Priority 3 — REVIEWS (Week 3)
9. Build review submission UI (post-job completion trigger)
10. Wire rating recalculation after review creation
11. Implement blind reveal system

### Priority 4 — PAYMENTS (Week 4)
12. Configure real Stripe test keys
13. Wire StripeConnectOnboarding into cleaner settings page  
14. Build release payment UI (job completion → release escrow)
15. Test full payment flow E2E

### Priority 5 — VERIFICATION & AI (Week 5)
16. Configure real SendGrid key for email verification
17. Configure real Twilio for SMS OTP
18. Configure OpenAI key for document parsing and AI chat
19. Wire badge engine to run after review/job completion events

---

## 🧬 RAW ARCHITECTURE NOTES

| Observation | Details |
|---|---|
| **Backend Framework** | FastAPI 0.108.0, well-structured |
| **DB Actual** | SQLite via SQLAlchemy (not Prisma/PostgreSQL) |
| **DB Schema** | 25+ tables in SQLAlchemy models.py |
| **Auth** | JWT (30min) + NextAuth session |
| **WebSocket** | Socket.IO (python-socketio) mounted at /ws |
| **Frontend** | Next.js 14, App Router, Tailwind, shadcn/ui |
| **State** | Zustand (defined, partially used) + React Query (partially used) |
| **Mobile** | Expo Router, 5 tabs, all mock data, no auth |
| **AI** | GPT-4o for chat + document parsing |
| **File Storage** | AWS S3 service coded (keys not configured) |
| **Email** | SendGrid service coded (mock key) |
| **SMS** | Twilio service coded (mock key) |
| **Push** | Firebase service coded (no credentials) |
| **Background Jobs** | None — no Celery, no cron, no task queue |
| **Tests** | 3 test files (auth, jobs, payments) — quality unknown |
| **Docs** | FastAPI auto-docs at /docs — available |

---

*Generated by Helix Enzyme 1 SCAN — Kit 0C4 (Delta)*  
*This analysis represents a point-in-time snapshot. Code continues to evolve.*
