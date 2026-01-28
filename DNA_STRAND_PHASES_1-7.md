# BookACleaner.ai — DNA Strand Master Plan: Phases 1-7

> **Part 2 of Ultimate DNA Strand**  
> **Continue from Phase 0 in DNA_STRAND_MASTER_PROMPT.md**

---

# PHASE 1: USER SYSTEM

**Timeline:** Weeks 3-4  
**Goal:** Complete authentication and profile management

---

## 1.1 Authentication System

### 1.1.1 NextAuth.js Configuration
```typescript
// apps/web/src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.passwordHash) {
          throw new Error('Invalid credentials')
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isValid) {
          throw new Error('Invalid credentials')
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role
        session.user.id = token.id
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    signUp: '/register',
    error: '/auth/error',
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

Steps:
- [ ] Install next-auth, @auth/prisma-adapter, bcryptjs
- [ ] Create auth route handler
- [ ] Configure Google OAuth
- [ ] Configure credentials provider
- [ ] Set up JWT callbacks
- [ ] Test login flow

### 1.1.2 Registration API Endpoint
```python
# apps/api/app/api/v1/auth.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from passlib.hash import bcrypt
from app.database import get_db
from app.models import User
from app.services.email import send_verification_email
import secrets

router = APIRouter()

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: str  # 'client' or 'cleaner'
    
class RegisterResponse(BaseModel):
    id: str
    email: str
    role: str
    message: str

@router.post("/register", response_model=RegisterResponse)
async def register(data: RegisterRequest, db = Depends(get_db)):
    # Check if user exists
    existing = await db.user.find_unique(where={"email": data.email})
    if existing:
        raise HTTPException(400, "Email already registered")
    
    # Hash password
    password_hash = bcrypt.hash(data.password)
    
    # Create verification token
    verification_token = secrets.token_urlsafe(32)
    
    # Create user
    user = await db.user.create(
        data={
            "email": data.email,
            "passwordHash": password_hash,
            "role": data.role.upper(),
        }
    )
    
    # Create profile based on role
    if data.role == 'cleaner':
        await db.cleanerprofile.create(
            data={
                "userId": user.id,
                "businessName": "",
            }
        )
    else:
        await db.clientprofile.create(
            data={
                "userId": user.id,
                "displayName": data.email.split('@')[0],
            }
        )
    
    # Send verification email
    await send_verification_email(data.email, verification_token)
    
    return RegisterResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        message="Verification email sent"
    )
```

Steps:
- [ ] Create auth router
- [ ] Implement registration endpoint
- [ ] Hash passwords with bcrypt
- [ ] Create user in database
- [ ] Create profile based on role
- [ ] Generate verification token
- [ ] Send verification email
- [ ] Test registration flow

### 1.1.3 Email Verification
```python
# app/api/v1/auth.py (continued)

@router.get("/verify-email")
async def verify_email(token: str, db = Depends(get_db)):
    # Find verification record
    verification = await db.verification.find_first(
        where={
            "token": token,
            "type": "EMAIL",
            "status": "PENDING"
        }
    )
    
    if not verification:
        raise HTTPException(400, "Invalid or expired token")
    
    # Update user
    await db.user.update(
        where={"id": verification.userId},
        data={"emailVerified": datetime.utcnow()}
    )
    
    # Update verification
    await db.verification.update(
        where={"id": verification.id},
        data={"status": "VERIFIED", "verifiedAt": datetime.utcnow()}
    )
    
    return {"message": "Email verified successfully"}
```

Steps:
- [ ] Create verification endpoint
- [ ] Validate token
- [ ] Update user emailVerified
- [ ] Update verification status
- [ ] Redirect to login page
- [ ] Test email verification flow

### 1.1.4 Password Reset Flow
```python
# app/api/v1/auth.py (continued)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db = Depends(get_db)):
    user = await db.user.find_unique(where={"email": data.email})
    
    if user:
        token = secrets.token_urlsafe(32)
        expires = datetime.utcnow() + timedelta(hours=1)
        
        await db.passwordreset.create(
            data={
                "userId": user.id,
                "token": token,
                "expiresAt": expires
            }
        )
        
        await send_password_reset_email(data.email, token)
    
    # Always return success to prevent email enumeration
    return {"message": "If email exists, reset link sent"}

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db = Depends(get_db)):
    reset = await db.passwordreset.find_first(
        where={
            "token": data.token,
            "expiresAt": {"gt": datetime.utcnow()},
            "usedAt": None
        }
    )
    
    if not reset:
        raise HTTPException(400, "Invalid or expired token")
    
    password_hash = bcrypt.hash(data.password)
    
    await db.user.update(
        where={"id": reset.userId},
        data={"passwordHash": password_hash}
    )
    
    await db.passwordreset.update(
        where={"id": reset.id},
        data={"usedAt": datetime.utcnow()}
    )
    
    return {"message": "Password reset successfully"}
```

Steps:
- [ ] Create forgot password endpoint
- [ ] Generate reset token with expiry
- [ ] Send reset email
- [ ] Create reset password endpoint
- [ ] Validate token and expiry
- [ ] Update password
- [ ] Mark token as used
- [ ] Test full reset flow

### 1.1.5 Protected Route Middleware
```typescript
// apps/web/src/middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Role-based routing
    if (path.startsWith('/cleaner') && token?.role !== 'CLEANER') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (path.startsWith('/client') && token?.role !== 'CLIENT') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/cleaner/:path*',
    '/client/:path*',
    '/admin/:path*',
    '/settings/:path*',
  ],
}
```

Steps:
- [ ] Create middleware.ts
- [ ] Configure protected routes
- [ ] Add role-based access
- [ ] Test redirects work
- [ ] Test unauthorized access blocked

---

## 1.2 Registration UI

### 1.2.1 Registration Page
```typescript
// apps/web/src/app/(auth)/register/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

export default function RegisterPage() {
  const router = useRouter()
  const [role, setRole] = useState<'client' | 'cleaner'>('client')
  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password'),
          role,
        }),
      })

      if (!res.ok) throw new Error('Registration failed')

      router.push('/register/verify-email')
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-white">
            Join BookACleaner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Role Selection */}
            <div className="space-y-3">
              <Label className="text-white">I am a...</Label>
              <RadioGroup
                value={role}
                onValueChange={(v) => setRole(v as 'client' | 'cleaner')}
                className="grid grid-cols-2 gap-4"
              >
                <div className={`flex items-center space-x-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  role === 'client' 
                    ? 'border-emerald-500 bg-emerald-500/10' 
                    : 'border-white/20 hover:border-white/40'
                }`}>
                  <RadioGroupItem value="client" id="client" />
                  <Label htmlFor="client" className="text-white cursor-pointer">
                    🏠 Looking to hire
                  </Label>
                </div>
                <div className={`flex items-center space-x-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  role === 'cleaner' 
                    ? 'border-emerald-500 bg-emerald-500/10' 
                    : 'border-white/20 hover:border-white/40'
                }`}>
                  <RadioGroupItem value="cleaner" id="cleaner" />
                  <Label htmlFor="cleaner" className="text-white cursor-pointer">
                    ✨ Cleaning pro
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-emerald-500 hover:bg-emerald-600"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>

            <p className="text-center text-white/60 text-sm">
              Already have an account?{' '}
              <a href="/login" className="text-emerald-400 hover:underline">
                Sign in
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

Steps:
- [ ] Create register page
- [ ] Add role selection (client/cleaner)
- [ ] Add form fields
- [ ] Add form validation
- [ ] Connect to API
- [ ] Add loading state
- [ ] Add error handling
- [ ] Style with glassmorphism
- [ ] Test registration works

### 1.2.2 Login Page
```typescript
// apps/web/src/app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    const result = await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password')
      setIsLoading(false)
    } else {
      router.push(callbackUrl)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-white">
            Welcome Back
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Sign In */}
          <Button
            variant="outline"
            className="w-full bg-white text-slate-900 hover:bg-slate-100"
            onClick={() => signIn('google', { callbackUrl })}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              {/* Google icon SVG */}
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <Separator className="bg-white/20" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 px-2 text-white/60 text-sm">
              or
            </span>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="password" className="text-white">Password</Label>
                <a href="/forgot-password" className="text-sm text-emerald-400 hover:underline">
                  Forgot?
                </a>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-emerald-500 hover:bg-emerald-600"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-white/60 text-sm">
            Don't have an account?{' '}
            <a href="/register" className="text-emerald-400 hover:underline">
              Sign up
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

Steps:
- [ ] Create login page
- [ ] Add Google OAuth button
- [ ] Add email/password form
- [ ] Handle errors
- [ ] Redirect after login
- [ ] Test both auth methods

---

## 1.3 Cleaner Profile

### 1.3.1 Profile Edit Page
```typescript
// apps/web/src/app/(dashboard)/cleaner/profile/page.tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileBasicInfo } from './components/ProfileBasicInfo'
import { ProfileServices } from './components/ProfileServices'
import { ProfileAvailability } from './components/ProfileAvailability'
import { ProfilePhotos } from './components/ProfilePhotos'
import { ProfileVerification } from './components/ProfileVerification'

export default function CleanerProfilePage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['cleaner-profile'],
    queryFn: () => fetch('/api/cleaner/profile').then(r => r.json()),
  })

  if (isLoading) return <ProfileSkeleton />

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-8">Your Profile</h1>
      
      {/* Verification Progress */}
      <ProfileVerificationProgress tier={profile.verificationTier} />
      
      <Tabs defaultValue="basic" className="mt-8">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic">
          <ProfileBasicInfo profile={profile} />
        </TabsContent>
        
        <TabsContent value="services">
          <ProfileServices profile={profile} />
        </TabsContent>
        
        <TabsContent value="availability">
          <ProfileAvailability profile={profile} />
        </TabsContent>
        
        <TabsContent value="photos">
          <ProfilePhotos profile={profile} />
        </TabsContent>
        
        <TabsContent value="verification">
          <ProfileVerification profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### 1.3.2 Basic Info Component
```typescript
// apps/web/src/app/(dashboard)/cleaner/profile/components/ProfileBasicInfo.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ImageUpload } from '@/components/common/ImageUpload'
import { toast } from 'sonner'

const profileSchema = z.object({
  businessName: z.string().min(2, 'Business name required'),
  bio: z.string().max(500, 'Bio must be under 500 characters').optional(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
})

type ProfileFormData = z.infer<typeof profileSchema>

export function ProfileBasicInfo({ profile }) {
  const queryClient = useQueryClient()
  
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      businessName: profile.businessName || '',
      bio: profile.bio || '',
      phone: profile.user.phone || '',
      website: profile.website || '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: ProfileFormData) =>
      fetch('/api/cleaner/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaner-profile'] })
      toast.success('Profile updated!')
    },
    onError: () => {
      toast.error('Failed to update profile')
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
          {/* Profile Photo */}
          <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile.profilePhoto} />
              <AvatarFallback>{profile.businessName?.[0]}</AvatarFallback>
            </Avatar>
            <ImageUpload
              onUpload={(url) => mutation.mutate({ ...form.getValues(), profilePhoto: url })}
              label="Change Photo"
            />
          </div>

          {/* Business Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Business Name</label>
            <Input {...form.register('businessName')} />
            {form.formState.errors.businessName && (
              <p className="text-sm text-red-500">{form.formState.errors.businessName.message}</p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <Textarea 
              {...form.register('bio')} 
              placeholder="Tell clients about your business..."
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              {form.watch('bio')?.length || 0}/500 characters
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone Number</label>
            <Input {...form.register('phone')} type="tel" />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Website (optional)</label>
            <Input {...form.register('website')} placeholder="https://" />
          </div>

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

Steps for Section 1.3:
- [ ] Create profile page layout
- [ ] Create tabbed navigation
- [ ] Build BasicInfo component
- [ ] Build Services component
- [ ] Build Availability component
- [ ] Build Photos component
- [ ] Build Verification component
- [ ] Add image upload functionality
- [ ] Connect all forms to API
- [ ] Test profile updates persist

---

## 1.4 Client Profile

### 1.4.1 Client Dashboard
```typescript
// apps/web/src/app/(dashboard)/client/page.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, Star, Home } from 'lucide-react'
import { UpcomingJobs } from './components/UpcomingJobs'
import { PropertyList } from './components/PropertyList'
import { RecentActivity } from './components/RecentActivity'

export default function ClientDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['client-stats'],
    queryFn: () => fetch('/api/client/stats').then(r => r.json()),
  })

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button className="bg-emerald-500 hover:bg-emerald-600">
          <Plus className="w-4 h-4 mr-2" />
          Book a Cleaning
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Calendar className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.upcomingJobs || 0}</p>
                <p className="text-sm text-muted-foreground">Upcoming Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Home className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.properties || 0}</p>
                <p className="text-sm text-muted-foreground">Properties</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Star className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.rating?.toFixed(1) || '-'}</p>
                <p className="text-sm text-muted-foreground">Your Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.completedJobs || 0}</p>
                <p className="text-sm text-muted-foreground">Jobs Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Jobs */}
        <div className="lg:col-span-2">
          <UpcomingJobs />
        </div>
        
        {/* Properties */}
        <div>
          <PropertyList />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <RecentActivity />
      </div>
    </div>
  )
}
```

Steps for Section 1.4:
- [ ] Create client dashboard page
- [ ] Add stats cards
- [ ] Create UpcomingJobs component
- [ ] Create PropertyList component
- [ ] Create RecentActivity component
- [ ] Connect to API
- [ ] Test dashboard loads

---

## GAP ANALYSIS CHECKPOINT: PHASE 1

Before proceeding to Phase 2, verify:

- [ ] Registration works (email + Google)
- [ ] Email verification works
- [ ] Login works (email + Google)
- [ ] Password reset works
- [ ] Protected routes redirect properly
- [ ] Role-based access works
- [ ] Cleaner profile edit works
- [ ] Client profile edit works
- [ ] Image upload works
- [ ] All forms validate properly
- [ ] All API endpoints have error handling
- [ ] Tests written for auth flows

---

# PHASE 2: VERIFICATION SYSTEM

**Timeline:** Weeks 5-6  
**Goal:** 5-tier verification for both cleaners and clients

---

## 2.1 Verification Infrastructure

### 2.1.1 Verification Status API
```python
# apps/api/app/api/v1/verification.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.database import get_db
from app.services.storage import upload_to_s3
from app.services.verification import calculate_tier, verify_document

router = APIRouter()

@router.get("/status")
async def get_verification_status(user = Depends(get_current_user), db = Depends(get_db)):
    verifications = await db.verification.find_many(
        where={"userId": user.id}
    )
    
    # Group by type
    status = {}
    for v in verifications:
        status[v.type] = {
            "status": v.status,
            "verifiedAt": v.verifiedAt,
            "expiresAt": v.expiresAt,
        }
    
    # Calculate current tier
    tier = calculate_tier(verifications)
    
    return {
        "tier": tier,
        "verifications": status,
        "nextTierRequirements": get_next_tier_requirements(tier),
    }

@router.post("/upload/{verification_type}")
async def upload_verification_document(
    verification_type: str,
    file: UploadFile = File(...),
    user = Depends(get_current_user),
    db = Depends(get_db)
):
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'application/pdf']
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Invalid file type")
    
    # Upload to S3
    url = await upload_to_s3(file, f"verifications/{user.id}/{verification_type}")
    
    # Create verification record
    verification = await db.verification.create(
        data={
            "userId": user.id,
            "type": verification_type.upper(),
            "status": "PENDING",
            "documentUrl": url,
        }
    )
    
    # Trigger async verification (AI + database lookup)
    await verify_document.delay(verification.id)
    
    return {"id": verification.id, "status": "PENDING"}
```

### 2.1.2 Tier Calculation Logic
```python
# apps/api/app/services/verification.py
from enum import IntEnum
from typing import List
from app.models import Verification, VerificationType, VerificationStatus

class VerificationTier(IntEnum):
    STARTER = 1
    VERIFIED = 2
    PROFESSIONAL = 3
    CERTIFIED = 4
    ELITE = 5

def calculate_cleaner_tier(verifications: List[Verification], profile) -> int:
    verified = {
        v.type: v for v in verifications 
        if v.status == VerificationStatus.VERIFIED
    }
    
    # Tier 1: Email + Phone
    if not (VerificationType.EMAIL in verified and VerificationType.PHONE in verified):
        return VerificationTier.STARTER
    
    # Tier 2: ID + Stripe
    if not (VerificationType.ID in verified and profile.stripeAccountId):
        return VerificationTier.VERIFIED
    
    # Tier 3: Business license + Insurance
    if not (VerificationType.BUSINESS_LICENSE in verified and VerificationType.INSURANCE in verified):
        return VerificationTier.VERIFIED
    
    # Tier 4: Industry certifications
    certs = [v for v in verifications if v.type in [
        VerificationType.IICRC,
        VerificationType.EPA,
        VerificationType.OSHA,
    ] and v.status == VerificationStatus.VERIFIED]
    
    if len(certs) == 0:
        return VerificationTier.PROFESSIONAL
    
    # Tier 5: Background check + performance metrics
    if VerificationType.BACKGROUND_CHECK not in verified:
        return VerificationTier.CERTIFIED
    
    if profile.jobsCompleted < 100 or profile.satisfactionPct < 98:
        return VerificationTier.CERTIFIED
    
    return VerificationTier.ELITE

def get_next_tier_requirements(current_tier: int, verifications, profile):
    """Return what's needed for next tier"""
    requirements = []
    
    if current_tier == 1:
        requirements.append({
            "type": "ID",
            "label": "Upload government ID",
            "completed": False
        })
        requirements.append({
            "type": "STRIPE",
            "label": "Complete Stripe onboarding",
            "completed": bool(profile.stripeAccountId)
        })
    elif current_tier == 2:
        requirements.append({
            "type": "BUSINESS_LICENSE",
            "label": "Upload business license",
            "completed": False
        })
        requirements.append({
            "type": "INSURANCE",
            "label": "Upload insurance certificate",
            "completed": False
        })
    # ... etc
    
    return requirements
```

### 2.1.3 Verification Progress UI
```typescript
// apps/web/src/components/verification/VerificationProgress.tsx
'use client'

import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Circle, Lock } from 'lucide-react'

const TIER_COLORS = {
  1: 'bg-gray-500',
  2: 'bg-blue-500',
  3: 'bg-green-500',
  4: 'bg-amber-500',
  5: 'bg-purple-500',
}

const TIER_NAMES = {
  1: 'Starter',
  2: 'Verified',
  3: 'Professional',
  4: 'Certified',
  5: 'Elite',
}

export function VerificationProgress({ 
  tier, 
  requirements 
}: { 
  tier: number
  requirements: Array<{ type: string; label: string; completed: boolean }>
}) {
  const progress = (tier / 5) * 100

  return (
    <div className="p-6 bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-white/60">Verification Level</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={TIER_COLORS[tier]}>
              {TIER_NAMES[tier]}
            </Badge>
            <span className="text-white text-lg font-semibold">
              Tier {tier}/5
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-white/60">Progress</p>
          <p className="text-2xl font-bold text-white">{progress.toFixed(0)}%</p>
        </div>
      </div>

      <Progress value={progress} className="h-3 mb-6" />

      {/* Tier Badges */}
      <div className="flex justify-between mb-6">
        {[1, 2, 3, 4, 5].map((t) => (
          <div 
            key={t} 
            className={`flex flex-col items-center ${t <= tier ? 'opacity-100' : 'opacity-40'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              t <= tier ? TIER_COLORS[t] : 'bg-gray-600'
            }`}>
              {t <= tier ? (
                <CheckCircle className="w-5 h-5 text-white" />
              ) : t === tier + 1 ? (
                <Circle className="w-5 h-5 text-white" />
              ) : (
                <Lock className="w-4 h-4 text-white" />
              )}
            </div>
            <span className="text-xs text-white/60 mt-1">{TIER_NAMES[t]}</span>
          </div>
        ))}
      </div>

      {/* Next Steps */}
      {tier < 5 && (
        <div className="border-t border-white/10 pt-4">
          <p className="text-sm text-white/60 mb-3">
            To reach {TIER_NAMES[tier + 1]}:
          </p>
          <ul className="space-y-2">
            {requirements.map((req) => (
              <li key={req.type} className="flex items-center gap-2 text-white">
                {req.completed ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Circle className="w-4 h-4 text-white/40" />
                )}
                <span className={req.completed ? 'line-through opacity-60' : ''}>
                  {req.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

Steps for Section 2.1:
- [ ] Create verification API endpoints
- [ ] Implement tier calculation logic
- [ ] Create document upload endpoint
- [ ] Integrate S3 for document storage
- [ ] Build VerificationProgress component
- [ ] Add tier badges to profiles
- [ ] Test tier progression works

---

## 2.2 Phone Verification

### 2.2.1 Twilio SMS Verification
```python
# apps/api/app/services/sms.py
from twilio.rest import Client
from app.config import get_settings
import random

settings = get_settings()
twilio_client = Client(settings.twilio_account_sid, settings.twilio_auth_token)

async def send_verification_code(phone: str) -> str:
    """Send 6-digit verification code via SMS"""
    code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    message = twilio_client.messages.create(
        body=f"Your BookACleaner verification code is: {code}",
        from_=settings.twilio_phone_number,
        to=phone
    )
    
    return code

# apps/api/app/api/v1/verification.py (continued)

@router.post("/phone/send")
async def send_phone_verification(
    data: PhoneVerificationRequest,
    user = Depends(get_current_user),
    db = Depends(get_db),
    redis = Depends(get_redis)
):
    # Generate and send code
    code = await send_verification_code(data.phone)
    
    # Store code in Redis with 10 min expiry
    await redis.setex(
        f"phone_verification:{user.id}",
        600,  # 10 minutes
        f"{data.phone}:{code}"
    )
    
    return {"message": "Verification code sent"}

@router.post("/phone/verify")
async def verify_phone(
    data: PhoneCodeRequest,
    user = Depends(get_current_user),
    db = Depends(get_db),
    redis = Depends(get_redis)
):
    # Get stored code
    stored = await redis.get(f"phone_verification:{user.id}")
    if not stored:
        raise HTTPException(400, "No verification in progress")
    
    phone, code = stored.split(':')
    
    if data.code != code:
        raise HTTPException(400, "Invalid code")
    
    # Update user
    await db.user.update(
        where={"id": user.id},
        data={"phone": phone, "phoneVerified": datetime.utcnow()}
    )
    
    # Create verification record
    await db.verification.create(
        data={
            "userId": user.id,
            "type": "PHONE",
            "status": "VERIFIED",
            "verifiedAt": datetime.utcnow()
        }
    )
    
    # Clean up Redis
    await redis.delete(f"phone_verification:{user.id}")
    
    return {"message": "Phone verified successfully"}
```

Steps for Section 2.2:
- [ ] Set up Twilio account
- [ ] Create SMS service
- [ ] Implement send verification endpoint
- [ ] Store code in Redis
- [ ] Implement verify endpoint
- [ ] Create phone verification UI
- [ ] Test full SMS flow

---

## 2.3 Certification Verification (AI-Powered)

### 2.3.1 Document OCR Service
```python
# apps/api/app/services/ocr.py
from google.cloud import documentai_v1 as documentai
from app.config import get_settings
import re
from datetime import datetime

settings = get_settings()

async def extract_certificate_data(document_url: str) -> dict:
    """Extract data from certification document using Google Document AI"""
    
    client = documentai.DocumentProcessorServiceClient()
    
    # Download document
    document_content = await download_file(document_url)
    
    # Process with Document AI
    request = documentai.ProcessRequest(
        name=settings.document_ai_processor,
        raw_document=documentai.RawDocument(
            content=document_content,
            mime_type="application/pdf"
        )
    )
    
    result = client.process_document(request=request)
    document = result.document
    
    # Extract fields
    extracted = {
        "cert_number": None,
        "name": None,
        "issued_date": None,
        "expiry_date": None,
        "issuer": None,
        "cert_type": None,
    }
    
    # Parse entities
    for entity in document.entities:
        if entity.type_ == "certification_number":
            extracted["cert_number"] = entity.mention_text
        elif entity.type_ == "person_name":
            extracted["name"] = entity.mention_text
        elif entity.type_ == "date":
            # Try to determine if issued or expiry
            text = entity.mention_text
            try:
                date = parse_date(text)
                if "expir" in entity.page_anchor.page_refs[0].layout_text.lower():
                    extracted["expiry_date"] = date
                else:
                    extracted["issued_date"] = date
            except:
                pass
    
    # Detect cert type from text
    full_text = document.text.lower()
    if "iicrc" in full_text:
        extracted["issuer"] = "IICRC"
        if "wrt" in full_text or "water restoration" in full_text:
            extracted["cert_type"] = "IICRC_WRT"
        elif "fsrt" in full_text or "fire smoke" in full_text:
            extracted["cert_type"] = "IICRC_FSRT"
    elif "epa" in full_text:
        extracted["issuer"] = "EPA"
        if "rrp" in full_text or "renovation" in full_text:
            extracted["cert_type"] = "EPA_RRP"
    elif "osha" in full_text:
        extracted["issuer"] = "OSHA"
        if "30" in full_text:
            extracted["cert_type"] = "OSHA_30"
        elif "10" in full_text:
            extracted["cert_type"] = "OSHA_10"
    
    return extracted

async def verify_iicrc_certification(cert_number: str, name: str) -> dict:
    """Cross-reference with IICRC database"""
    # IICRC has a public verification API
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.iicrc.org/verify",  # Example URL
            params={"cert_number": cert_number}
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                "verified": True,
                "name_match": data.get("name", "").lower() == name.lower(),
                "active": data.get("status") == "active",
                "expiry_date": data.get("expiry_date"),
            }
    
    return {"verified": False}
```

### 2.3.2 Verification Worker
```python
# apps/api/app/workers/verification.py
from celery import Celery
from app.database import get_db_sync
from app.services.ocr import extract_certificate_data, verify_iicrc_certification

celery = Celery('bookacleaner')

@celery.task
def verify_document(verification_id: str):
    """Async task to verify uploaded document"""
    db = get_db_sync()
    
    verification = db.verification.find_unique(where={"id": verification_id})
    if not verification:
        return
    
    try:
        # Extract data from document
        extracted = extract_certificate_data(verification.documentUrl)
        
        # Update with extracted data
        db.verification.update(
            where={"id": verification_id},
            data={"extractedData": extracted}
        )
        
        # Verify with issuer database if applicable
        verified = False
        if extracted.get("cert_type", "").startswith("IICRC"):
            result = verify_iicrc_certification(
                extracted.get("cert_number"),
                extracted.get("name")
            )
            verified = result.get("verified") and result.get("name_match")
        
        # Update status
        if verified:
            db.verification.update(
                where={"id": verification_id},
                data={
                    "status": "VERIFIED",
                    "verifiedAt": datetime.utcnow(),
                    "expiresAt": extracted.get("expiry_date"),
                }
            )
            
            # Create certification record
            db.certification.create(
                data={
                    "cleanerId": verification.userId,  # Assuming cleaner profile
                    "type": extracted.get("cert_type"),
                    "name": extracted.get("name"),
                    "issuer": extracted.get("issuer"),
                    "certNumber": extracted.get("cert_number"),
                    "issuedDate": extracted.get("issued_date"),
                    "expiresAt": extracted.get("expiry_date"),
                    "documentUrl": verification.documentUrl,
                    "verified": True,
                    "verifiedAt": datetime.utcnow(),
                }
            )
        else:
            # Queue for manual review
            db.verification.update(
                where={"id": verification_id},
                data={"status": "IN_REVIEW"}
            )
            
    except Exception as e:
        db.verification.update(
            where={"id": verification_id},
            data={
                "status": "IN_REVIEW",
                "notes": f"Automated verification failed: {str(e)}"
            }
        )
```

Steps for Section 2.3:
- [ ] Set up Google Document AI
- [ ] Create OCR extraction service
- [ ] Implement field parsing
- [ ] Create IICRC verification integration
- [ ] Create EPA verification integration
- [ ] Set up Celery worker
- [ ] Create verification task
- [ ] Handle manual review queue
- [ ] Test with sample certificates

---

## GAP ANALYSIS CHECKPOINT: PHASE 2

Before proceeding to Phase 3, verify:

- [ ] Verification status API works
- [ ] Tier calculation is correct
- [ ] Document upload works
- [ ] Phone verification with SMS works
- [ ] Email verification works
- [ ] OCR extraction works on test docs
- [ ] Database cross-reference works
- [ ] Manual review queue works
- [ ] Verification badges display correctly
- [ ] Tier progression updates in real-time

---

*Continue to Phase 3-7 in next section...*
