# HELIX Protocol — ENZYME 1B: RE-SCAN
## BookACleaner Platform Health Report (Post Enzyme 2 Repairs)
**Date:** 2026-02-17 | **Scanner:** Antigravity AI | **Previous Score:** 38/100

---

## Enzyme 2 Repairs Verification (Already Fixed)

| Fix | Status | Notes |
|-----|--------|-------|
| Client dashboard auth headers | ✅ Solid | All fetch calls have `Bearer ${accessToken}` |
| Cleaner jobs — real API | ✅ Solid | Mock removed, loading/error states present |
| Cleaner earnings — real API | ✅ Solid | Derives earnings from `/api/v1/jobs/` |
| Admin analytics — real API | ✅ Solid | Fetches from `/api/v1/admin/stats`, shapes match |
| HITL queue DB persistence | ✅ Solid | Uses `db.approval_queue.*` |
| Sponsored listings DB persistence | ✅ Solid | Uses `db.sponsored_listing.*` |

All Enzyme 2 repairs are confirmed solid. No regressions detected.

---

## Full Platform Scan Table

| Feature/Codon | Backend (API/DB) | Frontend (UI/UX) | E2E Usable? | UX Quality | Notes |
|---|---|---|---|---|---|
| **Auth (Register/Login)** | ✅ Full (register, login, OAuth Google, email verify, password reset) | ✅ NextAuth configured | ✅ Yes | 🟢 Good | Working end-to-end |
| **Token Refresh** | ❌ No refresh endpoint | ❌ No refresh logic | ❌ No | 🔴 Critical | 30min JWT expiry → users silently logged out |
| **Booking Wizard** | ✅ `/jobs` POST + `/jobs/estimate` POST exist | ✅ 4-step wizard, auth headers on all 3 fetches | ✅ Yes | 🟢 Good | Fully wired, clean implementation |
| **Client Dashboard** | ✅ `/jobs/` + `/properties/` | ✅ Real API fetch with auth | 🟡 Partial | 🟡 OK | Missing loading spinner in render |
| **Client Bookings List** | ✅ `/jobs/` exists | ❌ **MOCK DATA** (line 48) | ❌ No | 🟡 OK | Hardcoded mock booking array |
| **Client Booking Detail** | ✅ `/jobs/{id}` exists | ❌ **MOCK DATA** (line 68) | ❌ No | 🟡 OK | "Mock data for demo" |
| **Client Properties** | ✅ `/properties/` exists | ❌ **MOCK DATA** (line 17) | ❌ No | 🟡 OK | Hardcoded properties list |
| **Client Reviews** | ✅ Full CRUD (create, list, reveal, respond, badges) | ❌ **MOCK DATA** (line 47) + reveal API call uses `localStorage` instead of session | ❌ No | 🟡 OK | Backend comprehensive, frontend not wired |
| **Client Messages** | ✅ Full CRUD (conversations, messages, read/unread) | ❌ **MOCK DATA** (lines 23, 43) + `handleSend` only `console.log` | ❌ No | 🟡 OK | Backend exists, frontend fully mocked |
| **Client Settings** | ✅ User update API | ❌ **MOCK DATA** (line 35 — payment methods) | 🟡 Partial | 🟡 OK | Payment methods section mocked |
| **Cleaner Dashboard** | ✅ Stats derivable from existing APIs | ❌ **MOCK DATA** (line 21 — stats, line 31 — jobs) | ❌ No | 🟡 OK | All data hardcoded |
| **Cleaner Jobs** | ✅ `/jobs/` exists | ✅ Real API (Enzyme 2 fix) | ✅ Yes | 🟢 Good | Fixed in Enzyme 2 |
| **Cleaner Earnings** | ✅ `/jobs/` exists | ✅ Real API (Enzyme 2 fix) | ✅ Yes | 🟢 Good | Fixed in Enzyme 2 |
| **Cleaner Calendar** | ✅ Jobs API | ❌ **MOCK DATA** (line 40) | ❌ No | 🟡 OK | Hardcoded mock jobs on calendar |
| **Cleaner Messages** | ✅ Messages API | ❌ **MOCK DATA** (lines 24, 52) | ❌ No | 🟡 OK | Both conversations and messages mocked |
| **Cleaner Payments** | ✅ Stripe Connect (create account, onboarding, transfers) | ❌ **MOCK DATA** (line 67 — payouts) | ❌ No | 🟡 OK | Backend comprehensive, frontend mocked |
| **Cleaner Settings** | ✅ Profile update API | ❌ **MOCK DATA** (line 26) | ❌ No | 🟡 OK | Profile data hardcoded |
| **Cleaner Reviews** | ✅ Reviews API | ❓ Unknown | ❓ Unknown | ❓ | Needs inspection |
| **Cleaner Search/Directory** | ✅ `/cleaners/` with filters, ratings, availability | ❓ Unknown (public page?) | ❓ Unknown | ❓ | Backend comprehensive |
| **Admin Analytics** | ✅ `/admin/stats` | ✅ Real API (Enzyme 2 fix) | ✅ Yes | 🟢 Good | Fixed in Enzyme 2 |
| **Payments (Stripe)** | ✅ Full (intents, capture, refund, escrow release, Connect, webhooks) | 🟡 Booking wizard says "Confirm & Pay" but doesn't create a PaymentIntent | 🟡 Partial | 🟡 OK | Backend ready, frontend doesn't trigger payment |
| **WebSocket / Real-time** | ✅ Backend WS endpoint, service module | ✅ Full hook: auth, auto-reconnect, chat, typing, read receipts, notifications | 🟡 Partial | 🟢 Good | Hook exists but messages page doesn't use it |
| **Mobile App (Expo)** | N/A (shares backend) | ❌ **ALL MOCK** — 5 screens, no `apiFetch` imports in any screen | ❌ No | 🔴 Shell | `api.ts` has auth wiring but no screen uses it |

---

## Updated Health Score

### **55 / 100** (up from 38/100)

| Category | Score | Max | Notes |
|----------|-------|-----|-------|
| Auth & Security | 7 | 10 | Auth works, but no token refresh is critical |
| API Coverage | 9 | 10 | Backend is comprehensive across all domains |
| Frontend Wiring (Web) | 4 | 10 | Only 5/18+ pages use real API data |
| Frontend Wiring (Mobile) | 0 | 5 | All 5 screens are mock shells |
| E2E Flows | 3 | 10 | Only auth + booking wizard work end-to-end |
| Data Persistence | 9 | 10 | All critical data persisted in SQLite |
| Real-time Features | 6 | 10 | WebSocket hook is production-ready, but pages don't use it |
| Payment Integration | 5 | 10 | Backend fully wired, no frontend trigger |
| Error Handling | 6 | 10 | Fixed pages have it, mocked pages don't |
| UX Polish | 6 | 15 | UI looks good but mock data breaks trust |

---

## Top 5 New Critical Blockers

### 🔴 1. Mock Data Plague (12 pages still infected)
**Impact:** Most of the app shows fake data. Users see hardcoded names, prices, and dates.
**Pages affected:**
- `client/bookings/page.tsx` (line 48)
- `client/bookings/[id]/page.tsx` (line 68)
- `client/properties/page.tsx` (line 17)
- `client/reviews/page.tsx` (line 47)
- `client/messages/page.tsx` (lines 23, 43)
- `client/settings/page.tsx` (line 35)
- `cleaner/page.tsx` (line 21)
- `cleaner/calendar/page.tsx` (line 40)
- `cleaner/messages/page.tsx` (lines 24, 52)
- `cleaner/payments/page.tsx` (line 67)
- `cleaner/settings/page.tsx` (line 26)

### 🔴 2. No Token Refresh
**Impact:** Users get silently logged out after 30 minutes. No `/auth/refresh` endpoint exists. No client-side refresh logic.
**Fix:** Add a `POST /auth/refresh` endpoint that accepts a refresh token and returns a new access token. Add NextAuth `jwt` callback to auto-refresh.

### 🔴 3. Booking → Payment Flow Disconnected
**Impact:** The booking wizard says "Confirm & Pay" but only creates a job — it never calls `POST /payments/create-intent`. No payment is collected.
**Fix:** After `POST /api/v1/jobs`, call `POST /api/v1/payments/create-intent` with the job ID and amount, then confirm payment with Stripe.js.

### 🟡 4. Messages Page Not Using WebSocket
**Impact:** The WebSocket hook (`use-websocket.ts`) is production-ready with chat, typing indicators, and read receipts. But neither `client/messages` nor `cleaner/messages` pages use it — they both render hardcoded conversations and `handleSend` only logs to console.
**Fix:** Wire messages pages to (1) fetch conversations from API, (2) use `useRealtimeChat` hook for live messaging.

### 🟡 5. Mobile App is a Shell
**Impact:** All 5 mobile screens render hardcoded data. `api.ts` has proper auth wiring (`SecureStore` + `apiFetch` with Bearer headers) but no screen imports or uses it.
**Fix:** Wire each screen to use `apiFetch` from `lib/api.ts`.

---

## Recommended Enzyme 2 Repair Order (Next Loop)

### Priority 1 — Critical Path (gets core flows working)
1. **Wire client/bookings + client/bookings/[id]** — Replace mock with real API fetch from `/api/v1/jobs/`. These pages are the post-booking experience.
2. **Wire client/properties** — Replace mock with real API fetch from `/api/v1/properties/`. This feeds the booking wizard.
3. **Wire cleaner dashboard** — Replace mock with real API fetch (aggregate from `/api/v1/jobs/` for stats + today's jobs).

### Priority 2 — Communication (enables user interaction)
4. **Wire client/messages + cleaner/messages** — Fetch conversations from `/api/v1/messages/conversations`, use `useRealtimeChat` hook for live messaging.
5. **Wire client/reviews** — Replace mock with real API fetch from `/api/v1/reviews/`, use `useSession` for auth (not `localStorage`).

### Priority 3 — Business Critical
6. **Add token refresh** — `POST /auth/refresh` endpoint + NextAuth jwt callback.
7. **Connect booking wizard to Stripe** — Call `/payments/create-intent` after job creation.

### Priority 4 — Remaining Pages
8. Wire `cleaner/calendar`, `cleaner/payments`, `cleaner/settings`, `client/settings` to real API.
9. Wire mobile app screens to use `apiFetch`.

---

## Summary

The Enzyme 2 repairs are confirmed solid. The platform's backend is **comprehensive** — APIs exist for every feature (auth, jobs, reviews, payments, messages, cleaners, admin). The critical gap is the **frontend-to-backend wiring**: 12 of 18+ pages still display mock data. The recommended next repair cycle targets the 6 most impactful pages to bring the health score from 55 → ~75.

**ENZYME 1B: RE-SCAN — COMPLETE** ✅
