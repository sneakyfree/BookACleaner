# BookACleaner.ai Deployment Guide

## Quick Start (Development)

```bash
# Install dependencies
pnpm install

# Start all services
pnpm dev
```

## Docker Deployment

### Prerequisites
- Docker & Docker Compose
- Environment variables configured (copy `.env.example` to `.env`)

### Start Services
```bash
# Development
docker-compose up -d

# Production (includes nginx)
docker-compose --profile production up -d
```

### Services
| Service | Port | Description |
|---------|------|-------------|
| web | 3000 | Next.js frontend |
| api | 8000 | FastAPI backend |
| db | 5432 | PostgreSQL |
| redis | 6379 | Cache |

## Cloud Deployment

### Vercel (Frontend)
```bash
cd apps/web
vercel --prod
```

**Environment Variables:**
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXTAUTH_SECRET` - Auth secret
- `NEXTAUTH_URL` - App URL

### Railway/Render (Backend)
1. Connect GitHub repo
2. Set root directory: `apps/api`
3. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables

### Mobile (Expo)
```bash
cd apps/mobile
npx expo build:android
npx expo build:ios
```

## Environment Variables

See `.env.example` for all required variables:
- **Database**: PostgreSQL connection
- **Auth**: JWT secret, Google OAuth
- **Payments**: Stripe keys
- **Notifications**: SendGrid, Twilio, Firebase
- **Integrations**: Google Calendar, Checkr

## Health Checks

```bash
# API health
curl http://localhost:8000/health

# Web health
curl http://localhost:3000/api/health
```

## Monitoring

- API docs: `http://localhost:8000/docs`
- Database: Connect to PostgreSQL on port 5432
- Logs: `docker-compose logs -f [service]`
