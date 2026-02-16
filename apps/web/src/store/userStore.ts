/**
 * User Store — P3a
 * Manages user session, role, and profile state
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserProfile {
    id: string
    email: string
    name: string
    role: 'client' | 'cleaner' | 'admin'
    avatar?: string
    phone?: string
    verificationTier?: number
}

interface UserState {
    user: UserProfile | null
    token: string | null
    isAuthenticated: boolean
    setUser: (user: UserProfile, token: string) => void
    updateProfile: (partial: Partial<UserProfile>) => void
    logout: () => void
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            setUser: (user, token) =>
                set({ user, token, isAuthenticated: true }),

            updateProfile: (partial) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...partial } : null,
                })),

            logout: () =>
                set({ user: null, token: null, isAuthenticated: false }),
        }),
        { name: 'bookacleaner-user' }
    )
)
