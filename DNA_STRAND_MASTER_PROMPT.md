# BookACleaner.ai — Ultimate DNA Strand Master Plan

> **Version:** 2.0 Ultimate  
> **Created:** January 23, 2026  
> **Purpose:** Complete genetic blueprint to regenerate the entire platform from scratch

---

## 🧬 DNA STRAND PHILOSOPHY

Like DNA, this plan is **maximally granular** — each nucleotide (task) is small enough for any AI model to execute, yet together they form the complete organism.

**Execution Rules:**
1. One task at a time — complete fully before moving on
2. Quality over speed — never sacrifice quality
3. Test as you build — every feature needs tests
4. Document everything — future you will thank you
5. Gap analysis — check progress against plan constantly

---

## 📊 MASTER METRICS

| Metric | Target |
|--------|--------|
| Total Phases | 13 |
| Total Tasks | 500+ |
| Timeline | 28 weeks |
| First Beta | Neatology (Week 26) |
| Public Launch | Week 28 |

---

# PHASE 0: FOUNDATION

**Timeline:** Weeks 1-2  
**Goal:** Project infrastructure, development environment, base architecture

---

## 0.1 Repository & DevOps

### 0.1.1 Create GitHub Repository
```
Task: Create BookACleaner monorepo on GitHub
Output: github.com/[org]/bookacleaner
Steps:
  - [ ] Create organization (if needed)
  - [ ] Create repository with README
  - [ ] Add .gitignore (Node + Python)
  - [ ] Add LICENSE (proprietary or MIT)
  - [ ] Enable branch protection on main
  - [ ] Require PR reviews
  - [ ] Require status checks to pass
```

### 0.1.2 Monorepo Structure
```
bookacleaner/
├── apps/
│   ├── web/                 # Next.js 14 frontend
│   ├── api/                 # FastAPI backend
│   └── mobile/              # React Native (future)
├── packages/
│   ├── shared/              # Shared types, utils
│   ├── ui/                  # Shared UI components
│   └── config/              # ESLint, TS configs
├── prisma/                  # Database schema
├── scripts/                 # Build, deploy scripts
├── docs/                    # Documentation
├── .github/
│   └── workflows/           # CI/CD
├── docker-compose.yml
├── package.json             # Root package.json
├── turbo.json               # Turborepo config
└── README.md
```

Steps:
- [ ] Initialize pnpm workspace
- [ ] Create folder structure
- [ ] Set up Turborepo
- [ ] Configure workspaces in package.json

### 0.1.3 Code Quality Tools
```yaml
ESLint Config:
  - @typescript-eslint/parser
  - @typescript-eslint/eslint-plugin
  - eslint-plugin-react
  - eslint-plugin-react-hooks
  - eslint-config-next
  - eslint-config-prettier

Prettier Config:
  semi: false
  singleQuote: true
  tabWidth: 2
  trailingComma: es5
  printWidth: 100
```

Steps:
- [ ] Install ESLint with TypeScript support
- [ ] Install Prettier
- [ ] Create .eslintrc.js
- [ ] Create .prettierrc
- [ ] Install Husky
- [ ] Configure pre-commit hooks (lint, format)
- [ ] Install lint-staged
- [ ] Test hooks work on commit

### 0.1.4 CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm build
```

Steps:
- [ ] Create .github/workflows/ci.yml
- [ ] Add lint job
- [ ] Add test job
- [ ] Add build job
- [ ] Test pipeline on PR
- [ ] Add deployment workflow (staging)
- [ ] Add deployment workflow (production)

### 0.1.5 Environment Variables
```
# .env.example
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/bookacleaner

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# SendGrid
SENDGRID_API_KEY=SG...

# OpenAI
OPENAI_API_KEY=sk-...

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=bookacleaner-uploads
AWS_REGION=us-east-1
```

Steps:
- [ ] Create .env.example with all variables
- [ ] Add .env to .gitignore
- [ ] Create .env.local for development
- [ ] Document each variable in README
- [ ] Set up secrets in GitHub for CI

---

## 0.2 Frontend Foundation

### 0.2.1 Initialize Next.js 14
```bash
cd apps
pnpm create next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Steps:
- [ ] Run create-next-app
- [ ] Verify App Router is enabled
- [ ] Verify TypeScript is configured
- [ ] Verify Tailwind is installed
- [ ] Test dev server runs (`pnpm dev`)
- [ ] Test build succeeds (`pnpm build`)

### 0.2.2 TypeScript Strict Configuration
```json
// tsconfig.json additions
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "exactOptionalPropertyTypes": true
  }
}
```

Steps:
- [ ] Enable strict mode in tsconfig.json
- [ ] Enable all strict flags
- [ ] Fix any type errors
- [ ] Verify build still succeeds

### 0.2.3 Tailwind Configuration
```javascript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          // ... full palette
          900: '#0c4a6e',
        },
        accent: {
          // Cleaning industry colors
          clean: '#10b981',      // Success green
          fresh: '#06b6d4',      // Cyan
          sparkle: '#fbbf24',    // Gold
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

Steps:
- [ ] Create brand color palette
- [ ] Add custom fonts (Inter, Outfit)
- [ ] Configure dark mode
- [ ] Add custom animations
- [ ] Add Tailwind plugins (forms, typography)
- [ ] Create global CSS with base styles
- [ ] Import fonts in layout.tsx

### 0.2.4 Install shadcn/ui
```bash
pnpm dlx shadcn-ui@latest init
```

Configuration:
```json
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

Steps:
- [ ] Initialize shadcn/ui
- [ ] Install Button component
- [ ] Install Input component
- [ ] Install Card component
- [ ] Install Form component
- [ ] Install Dialog component
- [ ] Install Toast component
- [ ] Install Dropdown Menu
- [ ] Install Avatar component
- [ ] Install Tabs component
- [ ] Customize default styles

### 0.2.5 Design System Tokens
```typescript
// src/lib/design-tokens.ts
export const tokens = {
  colors: {
    background: {
      primary: 'var(--bg-primary)',
      secondary: 'var(--bg-secondary)',
      elevated: 'var(--bg-elevated)',
    },
    text: {
      primary: 'var(--text-primary)',
      secondary: 'var(--text-secondary)',
      muted: 'var(--text-muted)',
    },
    border: {
      default: 'var(--border-default)',
      subtle: 'var(--border-subtle)',
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    verification: {
      tier1: '#6b7280', // Gray
      tier2: '#3b82f6', // Blue
      tier3: '#10b981', // Green
      tier4: '#f59e0b', // Yellow/Gold
      tier5: '#8b5cf6', // Purple
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  radius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    glow: '0 0 20px rgba(16, 185, 129, 0.3)',
  },
}
```

Steps:
- [ ] Create design tokens file
- [ ] Define color palette
- [ ] Define spacing scale
- [ ] Define border radius scale
- [ ] Define shadow presets
- [ ] Create CSS variables in globals.css
- [ ] Test dark mode toggle

### 0.2.6 Layout Components
```typescript
// Component hierarchy
src/components/
├── layout/
│   ├── Header.tsx           # Main navigation header
│   ├── Footer.tsx           # Site footer
│   ├── Sidebar.tsx          # Dashboard sidebar
│   ├── MobileNav.tsx        # Mobile navigation
│   ├── PageContainer.tsx    # Page wrapper
│   └── DashboardLayout.tsx  # Dashboard wrapper
├── ui/                      # shadcn components
└── common/
    ├── Logo.tsx
    ├── UserMenu.tsx
    └── NotificationBell.tsx
```

Header Tasks:
- [ ] Create Header component
- [ ] Add logo
- [ ] Add navigation links
- [ ] Add user menu (when logged in)
- [ ] Add login/signup buttons (when logged out)
- [ ] Add mobile hamburger menu
- [ ] Implement sticky header
- [ ] Add glassmorphism background

Footer Tasks:
- [ ] Create Footer component
- [ ] Add company info
- [ ] Add link columns
- [ ] Add social links
- [ ] Add copyright

Sidebar Tasks:
- [ ] Create Sidebar component
- [ ] Add navigation items
- [ ] Add collapsed state
- [ ] Add user info
- [ ] Add logout button

### 0.2.7 Dark Mode Support
```typescript
// src/components/ThemeProvider.tsx
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes/dist/types'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

// src/components/ThemeToggle.tsx
'use client'

import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
```

Steps:
- [ ] Install next-themes
- [ ] Create ThemeProvider
- [ ] Wrap app in ThemeProvider
- [ ] Create ThemeToggle component
- [ ] Add to header
- [ ] Test theme persistence
- [ ] Verify all components work in dark mode

### 0.2.8 State Management (Zustand)
```typescript
// src/store/index.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// User store
interface UserState {
  user: User | null
  setUser: (user: User | null) => void
  isLoading: boolean
  setLoading: (loading: boolean) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      isLoading: true,
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    { name: 'user-storage' }
  )
)

// UI store
interface UIState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  notifications: Notification[]
  addNotification: (n: Notification) => void
  removeNotification: (id: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  notifications: [],
  addNotification: (n) => set((s) => ({ notifications: [...s.notifications, n] })),
  removeNotification: (id) => set((s) => ({
    notifications: s.notifications.filter((n) => n.id !== id)
  })),
}))
```

Steps:
- [ ] Install zustand
- [ ] Create store directory
- [ ] Create user store
- [ ] Create UI store
- [ ] Create booking store
- [ ] Create search/filter store
- [ ] Test persistence works

### 0.2.9 React Query Setup
```typescript
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// src/app/providers.tsx
'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

Steps:
- [ ] Install @tanstack/react-query
- [ ] Install @tanstack/react-query-devtools
- [ ] Create query client with defaults
- [ ] Create Providers component
- [ ] Wrap app in providers
- [ ] Test devtools appear

---

## 0.3 Backend Foundation

### 0.3.1 Initialize FastAPI
```
apps/api/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application entry
│   ├── config.py            # Settings management
│   ├── database.py          # DB connection
│   ├── dependencies.py      # Dependency injection
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py    # V1 router aggregator
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── cleaners.py
│   │   │   ├── clients.py
│   │   │   ├── jobs.py
│   │   │   ├── bookings.py
│   │   │   ├── reviews.py
│   │   │   ├── messages.py
│   │   │   └── properties.py
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── services/            # Business logic
│   ├── utils/               # Helper functions
│   └── middleware/          # Custom middleware
├── tests/
├── requirements.txt
├── pyproject.toml
└── Dockerfile
```

Steps:
- [ ] Create apps/api directory
- [ ] Create virtual environment
- [ ] Install FastAPI, uvicorn
- [ ] Create main.py with basic app
- [ ] Create requirements.txt
- [ ] Test server runs (`uvicorn app.main:app --reload`)

### 0.3.2 Pydantic Settings
```python
# app/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App
    app_name: str = "BookACleaner API"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    
    # Database
    database_url: str
    
    # Auth
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Stripe
    stripe_secret_key: str
    stripe_webhook_secret: str
    
    # Twilio
    twilio_account_sid: str
    twilio_auth_token: str
    twilio_phone_number: str
    
    # SendGrid
    sendgrid_api_key: str
    
    # OpenAI
    openai_api_key: str
    
    # AWS
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_s3_bucket: str
    aws_region: str = "us-east-1"

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

Steps:
- [ ] Install pydantic-settings
- [ ] Create config.py
- [ ] Define all settings
- [ ] Create .env file
- [ ] Test settings load correctly

### 0.3.3 PostgreSQL Setup
```python
# app/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

Steps:
- [ ] Install PostgreSQL locally (or use Docker)
- [ ] Create bookacleaner database
- [ ] Install SQLAlchemy, psycopg2-binary
- [ ] Create database.py
- [ ] Test connection works

### 0.3.4 Prisma Schema
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-py"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== USERS ====================

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String?
  role            UserRole  @default(CLIENT)
  emailVerified   DateTime?
  phoneVerified   DateTime?
  phone           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  cleanerProfile  CleanerProfile?
  clientProfile   ClientProfile?
  verifications   Verification[]
  sentMessages    Message[]       @relation("SentMessages")
  conversations   ConversationParticipant[]
  reviews         Review[]        @relation("ReviewAuthor")
  reviewsReceived Review[]        @relation("ReviewSubject")
}

enum UserRole {
  CLIENT
  CLEANER
  ADMIN
}

// ==================== PROFILES ====================

model CleanerProfile {
  id                String    @id @default(cuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id])
  
  businessName      String
  bio               String?   @db.Text
  profilePhoto      String?
  
  // Verification
  verificationTier  Int       @default(1)
  stripeAccountId   String?
  
  // Ratings
  overallRating     Float     @default(0)
  totalReviews      Int       @default(0)
  satisfactionPct   Float     @default(0)
  
  // Stats
  jobsCompleted     Int       @default(0)
  onTimeRate        Float     @default(0)
  responseTime      Int?      // minutes
  repeatClientRate  Float     @default(0)
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  services          CleanerService[]
  serviceAreas      ServiceArea[]
  certifications    Certification[]
  portfolioPhotos   PortfolioPhoto[]
  availability      Availability[]
  jobs              Job[]
  bids              Bid[]
}

model ClientProfile {
  id                String    @id @default(cuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id])
  
  displayName       String
  profilePhoto      String?
  
  // Verification
  verificationTier  Int       @default(1)
  stripeCustomerId  String?
  
  // Ratings (from cleaners)
  overallRating     Float     @default(0)
  totalReviews      Int       @default(0)
  
  // Stats
  jobsPosted        Int       @default(0)
  jobsCompleted     Int       @default(0)
  onTimePaymentRate Float     @default(100)
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  properties        Property[]
  jobs              Job[]
}

// ==================== PROPERTIES ====================

model Property {
  id              String    @id @default(cuid())
  clientId        String
  client          ClientProfile @relation(fields: [clientId], references: [id])
  
  name            String
  address         String
  addressLine2    String?
  city            String
  state           String
  zipCode         String
  country         String    @default("US")
  
  // Auto-detected
  sqFt            Int?
  bedrooms        Int?
  bathrooms       Float?
  propertyType    PropertyType?
  yearBuilt       Int?
  
  // Preferences
  accessInfo      String?   @db.Text
  specialNotes    String?   @db.Text
  
  // Airbnb sync
  airbnbCalendarUrl String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  jobs            Job[]
  playbook        PropertyPlaybook?
}

enum PropertyType {
  HOUSE
  APARTMENT
  CONDO
  TOWNHOUSE
  CABIN
  STUDIO
  OFFICE
  RETAIL
  WAREHOUSE
  OTHER
}

model PropertyPlaybook {
  id              String    @id @default(cuid())
  propertyId      String    @unique
  property        Property  @relation(fields: [propertyId], references: [id])
  
  hostPreferences Json?
  quirks          Json?     // Array of known issues
  cleanerNotes    Json?     // Notes from cleaners
  checklist       Json?     // Auto-generated checklist
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// ==================== JOBS & BOOKINGS ====================

model Job {
  id              String    @id @default(cuid())
  clientId        String
  client          ClientProfile @relation(fields: [clientId], references: [id])
  cleanerId       String?
  cleaner         CleanerProfile? @relation(fields: [cleanerId], references: [id])
  propertyId      String?
  property        Property? @relation(fields: [propertyId], references: [id])
  
  // Type
  jobType         JobType   @default(DIRECT)
  
  // Details
  title           String
  description     String?   @db.Text
  services        Json      // Selected services
  
  // Schedule
  scheduledDate   DateTime
  scheduledTime   String
  estimatedHours  Float?
  
  // Pricing
  basePrice       Decimal   @db.Decimal(10, 2)
  addOnPrice      Decimal   @default(0) @db.Decimal(10, 2)
  totalPrice      Decimal   @db.Decimal(10, 2)
  
  // Status
  status          JobStatus @default(PENDING)
  
  // Payment
  paymentStatus   PaymentStatus @default(PENDING)
  stripePaymentId String?
  paidAt          DateTime?
  paidOutAt       DateTime?
  
  // Completion
  startedAt       DateTime?
  completedAt     DateTime?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  bids            Bid[]
  reviews         Review[]
  messages        Message[]
}

enum JobType {
  DIRECT      // Direct booking with specific cleaner
  MARKETPLACE // Client found cleaner via search
  BID         // Posted for bids
}

enum JobStatus {
  PENDING     // Awaiting cleaner acceptance or bid
  CONFIRMED   // Cleaner accepted
  IN_PROGRESS // Job started
  COMPLETED   // Job finished
  CANCELLED   // Cancelled by either party
  DISPUTED    // Under dispute
}

enum PaymentStatus {
  PENDING     // Not yet paid
  HELD        // Paid, held in escrow
  RELEASED    // Released to cleaner
  REFUNDED    // Refunded to client
  DISPUTED    // Under dispute
}

model Bid {
  id              String    @id @default(cuid())
  jobId           String
  job             Job       @relation(fields: [jobId], references: [id])
  cleanerId       String
  cleaner         CleanerProfile @relation(fields: [cleanerId], references: [id])
  
  amount          Decimal   @db.Decimal(10, 2)
  message         String?   @db.Text
  estimatedHours  Float?
  
  status          BidStatus @default(PENDING)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum BidStatus {
  PENDING
  ACCEPTED
  REJECTED
  WITHDRAWN
  EXPIRED
}

// ==================== REVIEWS ====================

model Review {
  id              String    @id @default(cuid())
  jobId           String
  job             Job       @relation(fields: [jobId], references: [id])
  authorId        String
  author          User      @relation("ReviewAuthor", fields: [authorId], references: [id])
  subjectId       String
  subject         User      @relation("ReviewSubject", fields: [subjectId], references: [id])
  
  // Ratings
  overallRating   Int       // 1-5
  categoryRatings Json?     // { quality: 5, punctuality: 4, ... }
  
  // Content
  text            String?   @db.Text
  tags            String[]  // ["thorough", "on-time", ...]
  photos          String[]  // URLs
  
  // Response
  response        String?   @db.Text
  respondedAt     DateTime?
  
  // Moderation
  isPublic        Boolean   @default(true)
  moderatedAt     DateTime?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// ==================== MESSAGING ====================

model Conversation {
  id              String    @id @default(cuid())
  jobId           String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lastMessageAt   DateTime  @default(now())
  
  participants    ConversationParticipant[]
  messages        Message[]
}

model ConversationParticipant {
  id              String    @id @default(cuid())
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id])
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  
  lastReadAt      DateTime?
  
  @@unique([conversationId, userId])
}

model Message {
  id              String    @id @default(cuid())
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id])
  senderId        String
  sender          User      @relation("SentMessages", fields: [senderId], references: [id])
  jobId           String?
  job             Job?      @relation(fields: [jobId], references: [id])
  
  content         String    @db.Text
  attachments     String[]  // URLs
  
  channel         MessageChannel @default(APP)
  
  createdAt       DateTime  @default(now())
  deliveredAt     DateTime?
  readAt          DateTime?
}

enum MessageChannel {
  APP
  SMS
  EMAIL
}

// ==================== VERIFICATION ====================

model Verification {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  
  type            VerificationType
  status          VerificationStatus @default(PENDING)
  
  documentUrl     String?
  extractedData   Json?
  
  verifiedAt      DateTime?
  expiresAt       DateTime?
  rejectionReason String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum VerificationType {
  EMAIL
  PHONE
  ID
  BUSINESS_LICENSE
  INSURANCE
  IICRC
  EPA
  OSHA
  BACKGROUND_CHECK
}

enum VerificationStatus {
  PENDING
  IN_REVIEW
  VERIFIED
  REJECTED
  EXPIRED
}

model Certification {
  id              String    @id @default(cuid())
  cleanerId       String
  cleaner         CleanerProfile @relation(fields: [cleanerId], references: [id])
  
  type            String    // IICRC_WRT, OSHA_30, etc.
  name            String
  issuer          String
  certNumber      String?
  issuedDate      DateTime?
  expiresAt       DateTime?
  
  documentUrl     String?
  verified        Boolean   @default(false)
  verifiedAt      DateTime?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// ==================== SERVICES ====================

model ServiceCategory {
  id              String    @id @default(cuid())
  name            String
  tier            Int       // 1-7
  description     String?
  icon            String?
  
  requiresCert    Boolean   @default(false)
  requiredCerts   String[]  // Certification types required
  
  services        Service[]
}

model Service {
  id              String    @id @default(cuid())
  categoryId      String
  category        ServiceCategory @relation(fields: [categoryId], references: [id])
  
  name            String
  description     String?
  
  pricingModel    PricingModel @default(FLAT)
  basePrice       Decimal?  @db.Decimal(10, 2)
  pricePerSqFt    Decimal?  @db.Decimal(10, 2)
  pricePerHour    Decimal?  @db.Decimal(10, 2)
  
  estimatedMinutes Int?
  
  cleanerServices CleanerService[]
}

enum PricingModel {
  FLAT
  HOURLY
  SQFT
  CUSTOM
}

model CleanerService {
  id              String    @id @default(cuid())
  cleanerId       String
  cleaner         CleanerProfile @relation(fields: [cleanerId], references: [id])
  serviceId       String
  service         Service   @relation(fields: [serviceId], references: [id])
  
  customPrice     Decimal?  @db.Decimal(10, 2)
  isActive        Boolean   @default(true)
  
  @@unique([cleanerId, serviceId])
}

// ==================== AVAILABILITY ====================

model ServiceArea {
  id              String    @id @default(cuid())
  cleanerId       String
  cleaner         CleanerProfile @relation(fields: [cleanerId], references: [id])
  
  zipCode         String
  city            String?
  state           String?
  radiusMiles     Int       @default(25)
  
  @@unique([cleanerId, zipCode])
}

model Availability {
  id              String    @id @default(cuid())
  cleanerId       String
  cleaner         CleanerProfile @relation(fields: [cleanerId], references: [id])
  
  dayOfWeek       Int       // 0-6 (Sunday-Saturday)
  startTime       String    // "09:00"
  endTime         String    // "17:00"
  
  @@unique([cleanerId, dayOfWeek])
}

model PortfolioPhoto {
  id              String    @id @default(cuid())
  cleanerId       String
  cleaner         CleanerProfile @relation(fields: [cleanerId], references: [id])
  
  url             String
  caption         String?
  
  createdAt       DateTime  @default(now())
}
```

Steps:
- [ ] Install prisma-client-py
- [ ] Create prisma/schema.prisma
- [ ] Add all models
- [ ] Run `prisma generate`
- [ ] Run `prisma migrate dev`
- [ ] Verify tables created

### 0.3.5 Redis Setup
```python
# app/cache.py
import redis.asyncio as redis
from app.config import get_settings

settings = get_settings()

redis_client = redis.from_url(
    settings.redis_url,
    encoding="utf-8",
    decode_responses=True
)

async def get_redis():
    return redis_client
```

Steps:
- [ ] Install Redis (Docker or local)
- [ ] Install redis-py
- [ ] Create cache.py
- [ ] Test connection

### 0.3.6 API Router Structure
```python
# app/api/v1/router.py
from fastapi import APIRouter
from app.api.v1 import auth, users, cleaners, clients, jobs, bookings, reviews, messages, properties

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(cleaners.router, prefix="/cleaners", tags=["cleaners"])
router.include_router(clients.router, prefix="/clients", tags=["clients"])
router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
router.include_router(messages.router, prefix="/messages", tags=["messages"])
router.include_router(properties.router, prefix="/properties", tags=["properties"])
```

Steps:
- [ ] Create api/v1/ directory
- [ ] Create router.py
- [ ] Create placeholder for each endpoint file
- [ ] Register in main.py

### 0.3.7 Health Check Endpoints
```python
# app/api/v1/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.cache import get_redis

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "healthy"}

@router.get("/health/db")
async def db_health(db: Session = Depends(get_db)):
    try:
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}

@router.get("/health/redis")
async def redis_health():
    try:
        redis = await get_redis()
        await redis.ping()
        return {"status": "healthy", "redis": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "redis": str(e)}
```

Steps:
- [ ] Create health.py
- [ ] Add basic health endpoint
- [ ] Add database health endpoint
- [ ] Add Redis health endpoint
- [ ] Test all endpoints respond

### 0.3.8 Logging
```python
# app/logging_config.py
import logging
import sys
from pythonjsonlogger import jsonlogger

def setup_logging():
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger
```

Steps:
- [ ] Install python-json-logger
- [ ] Create logging config
- [ ] Initialize in main.py
- [ ] Test logs are JSON formatted

### 0.3.9 CORS Configuration
```python
# In main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://bookacleaner.ai",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Steps:
- [ ] Add CORS middleware
- [ ] Configure allowed origins
- [ ] Test frontend can call API

### 0.3.10 Error Handling
```python
# app/middleware/error_handler.py
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging

logger = logging.getLogger(__name__)

class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except HTTPException as e:
            return JSONResponse(
                status_code=e.status_code,
                content={"error": e.detail}
            )
        except Exception as e:
            logger.exception("Unhandled exception")
            return JSONResponse(
                status_code=500,
                content={"error": "Internal server error"}
            )
```

Steps:
- [ ] Create error handler middleware
- [ ] Log all errors
- [ ] Return consistent error format
- [ ] Add to middleware stack

---

## 0.4 Docker Development Environment

### 0.4.1 Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: bookacleaner
      POSTGRES_PASSWORD: localpassword
      POSTGRES_DB: bookacleaner
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://bookacleaner:localpassword@db:5432/bookacleaner
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    volumes:
      - ./apps/api:/app

volumes:
  postgres_data:
  redis_data:
```

Steps:
- [ ] Create docker-compose.yml
- [ ] Create Dockerfile for API
- [ ] Test `docker-compose up`
- [ ] Verify all services start
- [ ] Test API can connect to DB and Redis

---

## GAP ANALYSIS CHECKPOINT: PHASE 0

Before proceeding to Phase 1, verify:

- [ ] Repository created and accessible
- [ ] Monorepo structure in place
- [ ] Code quality tools configured
- [ ] CI pipeline runs on PR
- [ ] Frontend dev server works
- [ ] Backend dev server works
- [ ] Database connected
- [ ] Redis connected
- [ ] All health endpoints respond
- [ ] Docker development environment works

---

# CONTINUE TO PHASE 1...

*This document continues with the same level of granularity for Phases 1-13.*

*Each phase contains:*
- *Detailed task breakdowns*
- *Code examples and schemas*
- *Configuration templates*
- *Test requirements*
- *Gap analysis checkpoints*

---

## EXECUTION COMMAND

To continue building, work through each checkbox sequentially.

**Remember the core principles:**
1. Quality over speed
2. Test as you build
3. Document everything
4. Gap analysis at each checkpoint

**The platform should feel "20 years from the future."**

🧬 Begin Phase 0.1.1 → Create GitHub Repository

Good luck! 🚀
