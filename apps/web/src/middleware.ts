import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token
        const path = req.nextUrl.pathname

        // Role-based routing
        if (path.startsWith('/cleaner') && token?.role !== 'CLEANER') {
            return NextResponse.redirect(new URL('/dashboard', req.url))
        }

        if (path.startsWith('/client') && token?.role !== 'CLIENT') {
            return NextResponse.redirect(new URL('/dashboard', req.url))
        }

        if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
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
