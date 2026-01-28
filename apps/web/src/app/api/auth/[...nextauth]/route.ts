import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
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

                try {
                    // Call backend API to verify credentials
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    })

                    if (!res.ok) {
                        throw new Error('Invalid credentials')
                    }

                    const data = await res.json()

                    return {
                        id: data.user.id,
                        email: data.user.email,
                        role: data.user.role,
                        accessToken: data.access_token,
                    }
                } catch (error) {
                    throw new Error('Invalid credentials')
                }
            },
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id
                token.role = user.role
                token.accessToken = user.accessToken
            }
            if (account?.provider === 'google') {
                // Handle Google OAuth user creation/login via backend
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/oauth/google`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: token.email,
                            name: token.name,
                            image: token.picture,
                        }),
                    })
                    if (res.ok) {
                        const data = await res.json()
                        token.id = data.user.id
                        token.role = data.user.role
                        token.accessToken = data.access_token
                    }
                } catch (error) {
                    console.error('OAuth error:', error)
                }
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
                session.user.role = token.role as "CLIENT" | "CLEANER" | "ADMIN"
                session.accessToken = token.accessToken as string
            }
            return session
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
})

export { handler as GET, handler as POST }
