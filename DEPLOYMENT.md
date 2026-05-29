# BookACleaner Deployment Checklist

## Pre-Deployment

### Environment Variables

**Frontend (`apps/web/.env.local` → `.env.production`):**
```env
NEXTAUTH_URL=https://bookacleaner.ai
NEXTAUTH_SECRET=<generate-secure-secret>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
NEXT_PUBLIC_API_URL=https://api.bookacleaner.ai
```

**Backend (`apps/api/.env`):**
```env
DEV_MODE=false
DATABASE_URL=postgresql://user:pass@host:5432/bookacleaner
REDIS_URL=redis://host:6379
JWT_SECRET=<generate-secure-secret>
STRIPE_SECRET_KEY=<your-stripe-key>
OPENAI_API_KEY=<your-openai-key>
```

### Database Setup
- [ ] PostgreSQL database created
- [ ] Migrations applied (from `apps/api`, venv active): `alembic upgrade head`
- [ ] (Optional) Seed demo data: `python scripts/seed_demo.py`

---

## Build & Deploy

### Frontend (Port 3847)
```bash
cd apps/web
npm run build
npm run start  # Runs on port 3847
```

### Backend (Port 8000)
```bash
cd apps/api
pip install -r requirements.txt
alembic upgrade head  # apply database migrations
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## Post-Deployment Verification

- [ ] Health check: `curl https://api.bookacleaner.ai/health`
- [ ] Frontend loads at https://bookacleaner.ai
- [ ] User registration works
- [ ] User login works
- [ ] Cleaner search displays results
- [ ] Booking wizard submits successfully

---

## Ports Summary

| Service | Dev Port | Prod Port |
|---------|----------|-----------|
| Frontend | 3002 | 3847 |
| Backend API | 8000 | 8000 |
