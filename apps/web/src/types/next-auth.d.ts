import 'next-auth'

declare module 'next-auth' {
    interface Session {
        user: {
            id: string
            email: string
            name?: string
            image?: string
            role: 'CLIENT' | 'CLEANER' | 'ADMIN'
        }
        accessToken: string
    }

    interface User {
        id: string
        email: string
        role: 'CLIENT' | 'CLEANER' | 'ADMIN'
        accessToken: string
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string
        role: 'CLIENT' | 'CLEANER' | 'ADMIN'
        accessToken: string
    }
}
