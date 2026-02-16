'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

/**
 * Theme Provider for Dark Mode Support
 * Manages theme state with system preference detection
 */

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
    theme: Theme
    resolvedTheme: 'light' | 'dark'
    setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}

interface ThemeProviderProps {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    storageKey = 'bookacleaner-theme',
}: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(defaultTheme)
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark')

    // Initialize from storage
    useEffect(() => {
        const stored = localStorage.getItem(storageKey) as Theme | null
        if (stored) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setThemeState(stored)
        }
    }, [storageKey])

    // Resolve system theme
    useEffect(() => {
        const updateResolvedTheme = () => {
            if (theme === 'system') {
                const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                setResolvedTheme(systemDark ? 'dark' : 'light')
            } else {
                setResolvedTheme(theme)
            }
        }

        updateResolvedTheme()

        // Listen for system changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = () => updateResolvedTheme()
        mediaQuery.addEventListener('change', handler)

        return () => mediaQuery.removeEventListener('change', handler)
    }, [theme])

    // Apply theme class to document
    useEffect(() => {
        const root = document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(resolvedTheme)
    }, [resolvedTheme])

    const setTheme = (newTheme: Theme) => {
        localStorage.setItem(storageKey, newTheme)
        setThemeState(newTheme)
    }

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

// ============================================
// Theme Toggle Component
// ============================================

import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
    className?: string
    variant?: 'button' | 'dropdown'
}

export function ThemeToggle({ className, variant = 'button' }: ThemeToggleProps) {
    const { theme, setTheme, resolvedTheme } = useTheme()

    if (variant === 'button') {
        return (
            <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className={cn(
                    'p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors',
                    className
                )}
                aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
                {resolvedTheme === 'dark' ? (
                    <Sun className="w-5 h-5 text-amber-400" />
                ) : (
                    <Moon className="w-5 h-5 text-slate-600" />
                )}
            </button>
        )
    }

    return (
        <div className={cn('flex gap-1 p-1 rounded-lg bg-white/5', className)}>
            {[
                { value: 'light' as const, icon: Sun, label: 'Light' },
                { value: 'dark' as const, icon: Moon, label: 'Dark' },
                { value: 'system' as const, icon: Monitor, label: 'System' },
            ].map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                        theme === value
                            ? 'bg-brand-500 text-white'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                    )}
                    aria-label={`${label} theme`}
                >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                </button>
            ))}
        </div>
    )
}
