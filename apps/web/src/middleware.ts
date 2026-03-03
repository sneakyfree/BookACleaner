import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token
        const path = req.nextUrl.pathname
        // Normalize role to lowercase for case-insensitive comparison
        // Backend stores lowercase ('client'), NextAuth may use uppercase ('CLIENT')
        const role = (token?.role as string || '').toLowerCase()

        // Role-based routing
        if (path.startsWith('/cleaner') && role !== 'cleaner') {
            return NextResponse.redirect(new URL('/dashboard', req.url))
        }

        if (path.startsWith('/client') && role !== 'client') {
            return NextResponse.redirect(new URL('/dashboard', req.url))
        }

        if (path.startsWith('/admin') && role !== 'admin') {
            return NextResponse.redirect(new URL('/dashboard', req.url))
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
        '/messages/:path*',
        '/jobs/:path*',
    ],
}
