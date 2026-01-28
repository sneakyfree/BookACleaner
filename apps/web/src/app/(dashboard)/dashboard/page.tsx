'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === 'loading') return

        // Redirect based on role (case-insensitive comparison)
        const role = session?.user?.role?.toLowerCase()
        if (role === 'cleaner') {
            router.replace('/cleaner')
        } else if (role === 'admin') {
            router.replace('/admin')
        } else {
            // Default to client dashboard
            router.replace('/client')
        }
    }, [session, status, router])

    return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
    )
}
