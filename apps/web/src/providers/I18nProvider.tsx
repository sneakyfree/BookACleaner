'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

/**
 * Internationalization (i18n) Provider
 * Simple translation system with locale detection
 */

type Locale = 'en' | 'es'

interface Translations {
    [key: string]: string | Translations
}

// English translations
const en: Translations = {
    common: {
        loading: 'Loading...',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        close: 'Close',
        confirm: 'Confirm',
        back: 'Back',
        next: 'Next',
        submit: 'Submit',
        search: 'Search',
        filter: 'Filter',
        sort: 'Sort',
        view: 'View',
        download: 'Download',
        upload: 'Upload',
        retry: 'Retry',
        refresh: 'Refresh',
        yes: 'Yes',
        no: 'No',
        or: 'or',
        and: 'and',
    },
    auth: {
        login: 'Log In',
        logout: 'Log Out',
        register: 'Sign Up',
        email: 'Email',
        password: 'Password',
        forgotPassword: 'Forgot Password?',
        resetPassword: 'Reset Password',
        rememberMe: 'Remember me',
        dontHaveAccount: "Don't have an account?",
        alreadyHaveAccount: 'Already have an account?',
    },
    nav: {
        home: 'Home',
        dashboard: 'Dashboard',
        bookings: 'Bookings',
        messages: 'Messages',
        profile: 'Profile',
        settings: 'Settings',
        help: 'Help',
        cleaners: 'Cleaners',
        properties: 'Properties',
        jobs: 'Jobs',
        payments: 'Payments',
        reviews: 'Reviews',
    },
    booking: {
        title: 'Book a Cleaning',
        selectProperty: 'Select Property',
        selectService: 'Select Service',
        selectDate: 'Select Date & Time',
        selectCleaner: 'Select Cleaner',
        review: 'Review & Confirm',
        confirmation: 'Booking Confirmed',
        standard: 'Standard Cleaning',
        deep: 'Deep Cleaning',
        moveIn: 'Move In/Out',
        turnover: 'Turnover',
        custom: 'Custom',
        whyThisPrice: 'Why this price?',
        priceBreakdown: 'Price Breakdown',
        basePrice: 'Base Price',
        total: 'Total',
        estimatedTime: 'Estimated Time',
    },
    jobs: {
        pending: 'Pending',
        confirmed: 'Confirmed',
        inProgress: 'In Progress',
        completed: 'Completed',
        cancelled: 'Cancelled',
        noJobs: 'No jobs found',
        viewDetails: 'View Details',
        acceptJob: 'Accept Job',
        declineJob: 'Decline Job',
        startJob: 'Start Job',
        completeJob: 'Complete Job',
    },
    cleaner: {
        verification: 'Verification',
        tier1: 'Tier 1 - Basic',
        tier2: 'Tier 2 - Verified',
        tier3: 'Tier 3 - Certified Pro',
        tier4: 'Tier 4 - Elite',
        tier5: 'Tier 5 - Master',
        rating: 'Rating',
        reviews: 'Reviews',
        jobsCompleted: 'Jobs Completed',
        responseTime: 'Response Time',
        availability: 'Availability',
    },
    errors: {
        generic: 'Something went wrong. Please try again.',
        notFound: 'Page not found',
        unauthorized: 'You are not authorized to view this page',
        networkError: 'Network error. Check your connection.',
        validationError: 'Please check your input and try again.',
        offline: 'You are currently offline',
    },
    success: {
        saved: 'Changes saved successfully',
        deleted: 'Successfully deleted',
        sent: 'Message sent',
        booked: 'Booking confirmed',
        updated: 'Updated successfully',
    },
    time: {
        today: 'Today',
        tomorrow: 'Tomorrow',
        yesterday: 'Yesterday',
        thisWeek: 'This Week',
        lastWeek: 'Last Week',
        thisMonth: 'This Month',
        hours: 'hours',
        minutes: 'minutes',
        ago: 'ago',
    },
}

// Spanish translations
const es: Translations = {
    common: {
        loading: 'Cargando...',
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        edit: 'Editar',
        close: 'Cerrar',
        confirm: 'Confirmar',
        back: 'Atrás',
        next: 'Siguiente',
        submit: 'Enviar',
        search: 'Buscar',
        filter: 'Filtrar',
        sort: 'Ordenar',
        view: 'Ver',
        download: 'Descargar',
        upload: 'Subir',
        retry: 'Reintentar',
        refresh: 'Actualizar',
        yes: 'Sí',
        no: 'No',
        or: 'o',
        and: 'y',
    },
    auth: {
        login: 'Iniciar Sesión',
        logout: 'Cerrar Sesión',
        register: 'Registrarse',
        email: 'Correo Electrónico',
        password: 'Contraseña',
        forgotPassword: '¿Olvidaste tu contraseña?',
        resetPassword: 'Restablecer Contraseña',
        rememberMe: 'Recordarme',
        dontHaveAccount: '¿No tienes una cuenta?',
        alreadyHaveAccount: '¿Ya tienes una cuenta?',
    },
    nav: {
        home: 'Inicio',
        dashboard: 'Panel',
        bookings: 'Reservas',
        messages: 'Mensajes',
        profile: 'Perfil',
        settings: 'Configuración',
        help: 'Ayuda',
        cleaners: 'Limpiadores',
        properties: 'Propiedades',
        jobs: 'Trabajos',
        payments: 'Pagos',
        reviews: 'Reseñas',
    },
    booking: {
        title: 'Reservar Limpieza',
        selectProperty: 'Seleccionar Propiedad',
        selectService: 'Seleccionar Servicio',
        selectDate: 'Seleccionar Fecha y Hora',
        selectCleaner: 'Seleccionar Limpiador',
        review: 'Revisar y Confirmar',
        confirmation: 'Reserva Confirmada',
        standard: 'Limpieza Estándar',
        deep: 'Limpieza Profunda',
        moveIn: 'Mudanza',
        turnover: 'Turnover',
        custom: 'Personalizado',
        whyThisPrice: '¿Por qué este precio?',
        priceBreakdown: 'Desglose de Precio',
        basePrice: 'Precio Base',
        total: 'Total',
        estimatedTime: 'Tiempo Estimado',
    },
    jobs: {
        pending: 'Pendiente',
        confirmed: 'Confirmado',
        inProgress: 'En Progreso',
        completed: 'Completado',
        cancelled: 'Cancelado',
        noJobs: 'No se encontraron trabajos',
        viewDetails: 'Ver Detalles',
        acceptJob: 'Aceptar Trabajo',
        declineJob: 'Rechazar Trabajo',
        startJob: 'Iniciar Trabajo',
        completeJob: 'Completar Trabajo',
    },
    cleaner: {
        verification: 'Verificación',
        tier1: 'Nivel 1 - Básico',
        tier2: 'Nivel 2 - Verificado',
        tier3: 'Nivel 3 - Profesional Certificado',
        tier4: 'Nivel 4 - Élite',
        tier5: 'Nivel 5 - Maestro',
        rating: 'Calificación',
        reviews: 'Reseñas',
        jobsCompleted: 'Trabajos Completados',
        responseTime: 'Tiempo de Respuesta',
        availability: 'Disponibilidad',
    },
    errors: {
        generic: 'Algo salió mal. Por favor intenta de nuevo.',
        notFound: 'Página no encontrada',
        unauthorized: 'No estás autorizado para ver esta página',
        networkError: 'Error de red. Verifica tu conexión.',
        validationError: 'Por favor verifica tu entrada e intenta de nuevo.',
        offline: 'Actualmente estás sin conexión',
    },
    success: {
        saved: 'Cambios guardados exitosamente',
        deleted: 'Eliminado exitosamente',
        sent: 'Mensaje enviado',
        booked: 'Reserva confirmada',
        updated: 'Actualizado exitosamente',
    },
    time: {
        today: 'Hoy',
        tomorrow: 'Mañana',
        yesterday: 'Ayer',
        thisWeek: 'Esta Semana',
        lastWeek: 'Semana Pasada',
        thisMonth: 'Este Mes',
        hours: 'horas',
        minutes: 'minutos',
        ago: 'hace',
    },
}

const translations: Record<Locale, Translations> = { en, es }

interface I18nContextType {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: (key: string, params?: Record<string, string>) => string
    formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string
    formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string
    formatCurrency: (amount: number, currency?: string) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

export function useI18n() {
    const context = useContext(I18nContext)
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider')
    }
    return context
}

interface I18nProviderProps {
    children: React.ReactNode
    defaultLocale?: Locale
}

export function I18nProvider({ children, defaultLocale = 'en' }: I18nProviderProps) {
    const [locale, setLocaleState] = useState<Locale>(defaultLocale)

    // Initialize from browser/storage
    React.useEffect(() => {
        const stored = localStorage.getItem('bookacleaner-locale') as Locale | null
        if (stored && translations[stored]) {
            setLocaleState(stored)
        } else {
            // Detect browser locale
            const browserLocale = navigator.language.split('-')[0] as Locale
            if (translations[browserLocale]) {
                setLocaleState(browserLocale)
            }
        }
    }, [])

    const setLocale = useCallback((newLocale: Locale) => {
        localStorage.setItem('bookacleaner-locale', newLocale)
        setLocaleState(newLocale)
    }, [])

    // Translation function
    const t = useCallback(
        (key: string, params?: Record<string, string>) => {
            const keys = key.split('.')
            let value: string | Translations = translations[locale]

            for (const k of keys) {
                if (typeof value === 'object' && value[k]) {
                    value = value[k]
                } else {
                    // Fallback to English
                    value = translations['en']
                    for (const k2 of keys) {
                        if (typeof value === 'object' && value[k2]) {
                            value = value[k2]
                        } else {
                            return key // Return key if not found
                        }
                    }
                }
            }

            let result = typeof value === 'string' ? value : key

            // Replace params
            if (params) {
                Object.entries(params).forEach(([param, replacement]) => {
                    result = result.replace(new RegExp(`{{${param}}}`, 'g'), replacement)
                })
            }

            return result
        },
        [locale]
    )

    const formatDate = useCallback(
        (date: Date, options?: Intl.DateTimeFormatOptions) => {
            return new Intl.DateTimeFormat(locale, options).format(date)
        },
        [locale]
    )

    const formatNumber = useCallback(
        (num: number, options?: Intl.NumberFormatOptions) => {
            return new Intl.NumberFormat(locale, options).format(num)
        },
        [locale]
    )

    const formatCurrency = useCallback(
        (amount: number, currency = 'USD') => {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency,
            }).format(amount)
        },
        [locale]
    )

    return (
        <I18nContext.Provider
            value={{ locale, setLocale, t, formatDate, formatNumber, formatCurrency }}
        >
            {children}
        </I18nContext.Provider>
    )
}

// ============================================
// Language Selector Component
// ============================================

import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LanguageSelectorProps {
    className?: string
}

const localeNames: Record<Locale, string> = {
    en: 'English',
    es: 'Español',
}

export function LanguageSelector({ className }: LanguageSelectorProps) {
    const { locale, setLocale } = useI18n()

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <Globe className="w-4 h-4 text-white/40" />
            <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                className="bg-transparent border border-white/20 rounded-md px-2 py-1 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
                {Object.entries(localeNames).map(([code, name]) => (
                    <option key={code} value={code} className="bg-slate-800 text-white">
                        {name}
                    </option>
                ))}
            </select>
        </div>
    )
}
