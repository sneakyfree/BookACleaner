# 🧹 BookACleaner.ai

> **The AI-native operating system for the cleaning industry**

A dual-sided marketplace connecting clients with verified cleaning professionals. Built with Next.js 14, FastAPI, and powered by GPT-4o for intelligent features.

![BookACleaner Banner](https://img.shields.io/badge/BookACleaner.ai-AI%20Powered-emerald?style=for-the-badge&logo=sparkles)

## ✨ Features

### For Clients
- 🔍 **Smart Search** - Find cleaners by location, services, and availability
- ⭐ **Verified Professionals** - 5-tier verification system for trust
- 📅 **Easy Booking** - Multi-step booking flow with instant confirmation
- 💬 **Real-time Chat** - Direct messaging with cleaners
- 🤖 **AI Assistant** - Get help booking and answering questions

### For Cleaners
- 📊 **Business Dashboard** - Track jobs, earnings, and reviews
- 📆 **Smart Calendar** - Sync with Airbnb, Google Calendar, iCal
- 🛡️ **Verification Tiers** - Build trust with verified credentials
- 💳 **Fast Payouts** - Get paid quickly via Stripe Connect
- 📈 **Growth Tools** - Analytics and route optimization

### Platform Features
- 🤖 **AI-Powered** - GPT-4o for document parsing, estimates, and chat
- ⚡ **Real-time** - WebSocket notifications and live updates
- 📱 **Responsive** - Works beautifully on all devices
- 🔐 **Secure** - End-to-end encryption and verification

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- npm or pnpm

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/BookACleaner.git
cd BookACleaner
```

### 2. Frontend Setup
```bash
cd apps/web
npm install --legacy-peer-deps
npm run dev -- -p 3001
```
Frontend will be available at: **http://localhost:3001**

### 3. Backend Setup
```bash
cd apps/api
pip install fastapi uvicorn python-dotenv pydantic pydantic-settings openai httpx

# Run in development mode (mock database)
DEV_MODE=true python -m uvicorn app.main:app --port 8000
```
API will be available at: **http://localhost:8000**
API Docs at: **http://localhost:8000/docs**

---

## 📁 Project Structure

```
BookACleaner/
├── apps/
│   ├── web/                    # Next.js 14 Frontend
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   │   ├── (auth)/     # Auth pages (login, register)
│   │   │   │   ├── (admin)/    # Admin dashboard
│   │   │   │   ├── (dashboard)/ # User dashboards
│   │   │   │   └── ...
│   │   │   ├── components/     # React components
│   │   │   │   ├── ui/         # Base UI components
│   │   │   │   ├── ai/         # AI feature components
│   │   │   │   ├── realtime/   # WebSocket components
│   │   │   │   └── ...
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   └── lib/            # Utilities and API client
│   │   └── package.json
│   │
│   └── api/                    # FastAPI Backend
│       └── app/
│           ├── api/v1/         # API endpoints
│           ├── services/       # Business logic
│           ├── config.py       # Configuration
│           ├── database.py     # Database module
│           └── main.py         # FastAPI app
│
├── apps/api/alembic/           # SQLAlchemy migrations
│   └── versions/               # run: alembic upgrade head
│
├── DNA_STRAND_*.md            # Architecture documentation
└── docker-compose.yml
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bookacleaner

# Authentication
JWT_SECRET=your-secure-jwt-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio (SMS)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# SendGrid (Email)
SENDGRID_API_KEY=SG....

# OpenAI
OPENAI_API_KEY=sk-...

# AWS S3 (File Uploads)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=bookacleaner-uploads
```

> **Note:** In development mode (`DEV_MODE=true`), all settings have safe defaults.

---

## 🎯 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login user |
| POST | `/api/v1/auth/refresh` | Refresh token |
| POST | `/api/v1/auth/forgot-password` | Request password reset |

### Cleaners
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/cleaners/search` | Search cleaners |
| GET | `/api/v1/cleaners/{id}` | Get cleaner profile |
| GET | `/api/v1/cleaners/{id}/availability` | Get availability |
| GET | `/api/v1/cleaners/{id}/reviews` | Get reviews |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/jobs` | Create new booking |
| GET | `/api/v1/jobs/{id}` | Get job details |
| PATCH | `/api/v1/jobs/{id}/status` | Update job status |

### AI Features
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ai/chat` | AI chat assistant |
| POST | `/api/v1/ai/parse-document` | Extract document data |
| POST | `/api/v1/ai/verify-document` | Verify authenticity |
| POST | `/api/v1/ai/estimate` | Generate price estimate |
| POST | `/api/v1/ai/detect-property` | Auto-detect property details |

### WebSocket
```
ws://localhost:8000/api/v1/ws?token=<jwt>
```
Supports: chat messages, typing indicators, job updates, notifications

---

## 🎨 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible primitives
- **React Query** - Server state management
- **Zustand** - Client state management

### Backend
- **FastAPI** - Modern Python API framework
- **Pydantic** - Data validation
- **SQLAlchemy 2.0 (async) + Alembic** - ORM & migrations
- **OpenAI GPT-4o** - AI capabilities

### Infrastructure
- **PostgreSQL** - Primary database
- **Redis** - Caching and sessions
- **AWS S3** - File storage
- **Stripe** - Payments

---

## 🧪 Development

### Running Tests
```bash
# Frontend
cd apps/web && npm run test

# Backend
cd apps/api && pytest
```

### Code Quality
```bash
# Lint
npm run lint

# Format
npm run format
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<p align="center">
  Built with ❤️ for the cleaning industry
  <br>
  <strong>BookACleaner.ai</strong> - They schedule. We think.
</p>
