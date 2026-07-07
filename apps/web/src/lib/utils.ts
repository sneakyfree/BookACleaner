import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount)
}

export function formatDate(date: Date | string): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(date))
}

export function parseLocalDate(dateStr: string): Date {
    // Parse a 'YYYY-MM-DD' (or ISO) string as a LOCAL calendar date so the day
    // never shifts by a timezone offset (avoids the classic UTC off-by-one).
    if (!dateStr) return new Date(NaN)
    const datePart = String(dateStr).split('T')[0]
    const [y, m, d] = datePart.split('-').map(Number)
    return new Date(y, (m || 1) - 1, d || 1)
}

export function toLocalDateISO(date: Date): string {
    // Format a Date as 'YYYY-MM-DD' using LOCAL calendar fields (not UTC).
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

export function formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

export function truncate(str: string, length: number): string {
    if (str.length <= length) return str
    return str.slice(0, length) + '...'
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}


// Coerce any thrown API error into a safe display STRING. FastAPI 422s return
// detail as an array of {loc,msg,type} objects; rendering that object as a React
// child throws "Objects are not valid as a React child" (#31) and white-screens
// the page. Always run error state through this before setError().
export function errText(err: any, fallback = 'Something went wrong'): string {
    const d = err?.detail ?? err?.message ?? err
    if (typeof d === 'string') return d
    if (Array.isArray(d)) {
        const msgs = d.map((x: any) => (typeof x === 'string' ? x : x?.msg)).filter(Boolean)
        if (msgs.length) return msgs.join('; ')
    }
    if (d && typeof d === 'object' && typeof d.msg === 'string') return d.msg
    return fallback
}
