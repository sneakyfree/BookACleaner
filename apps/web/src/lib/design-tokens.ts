/**
 * Design Tokens — P1
 * Centralized design token definitions as CSS custom properties.
 * Import into globals.css for consistent theming across the app.
 */

export const designTokens = {
    colors: {
        brand: {
            50: '#ecfdf5',
            100: '#d1fae5',
            200: '#a7f3d0',
            300: '#6ee7b7',
            400: '#34d399',
            500: '#10b981',
            600: '#059669',
            700: '#047857',
            800: '#065f46',
            900: '#064e3b',
        },
        accent: {
            amber: '#f59e0b',
            amberLight: '#fbbf24',
            purple: '#8b5cf6',
            purpleLight: '#a78bfa',
        },
        surface: {
            base: '#0f172a',         // slate-900
            elevated: '#1e293b',     // slate-800
            overlay: 'rgba(255, 255, 255, 0.05)',
            overlayHover: 'rgba(255, 255, 255, 0.08)',
            border: 'rgba(255, 255, 255, 0.10)',
        },
        text: {
            primary: '#ffffff',
            secondary: 'rgba(255, 255, 255, 0.70)',
            muted: 'rgba(255, 255, 255, 0.40)',
        },
    },
    spacing: {
        xs: '0.25rem',   // 4px
        sm: '0.5rem',    // 8px
        md: '0.75rem',   // 12px
        lg: '1rem',      // 16px
        xl: '1.5rem',    // 24px
        '2xl': '2rem',   // 32px
        '3xl': '3rem',   // 48px
    },
    radius: {
        sm: '0.375rem',  // 6px
        md: '0.5rem',    // 8px
        lg: '0.75rem',   // 12px
        xl: '1rem',      // 16px
        full: '9999px',
    },
    shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
        md: '0 4px 6px rgba(0, 0, 0, 0.25)',
        lg: '0 10px 15px rgba(0, 0, 0, 0.3)',
        xl: '0 20px 25px rgba(0, 0, 0, 0.35)',
        glow: '0 0 15px rgba(16, 185, 129, 0.3)',
        glowLg: '0 0 30px rgba(16, 185, 129, 0.4)',
    },
    typography: {
        fontFamily: {
            sans: "'Inter', system-ui, -apple-system, sans-serif",
            display: "'Outfit', 'Inter', sans-serif",
            mono: "'JetBrains Mono', 'Fira Code', monospace",
        },
        fontSize: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
            '4xl': '2.25rem',
        },
    },
    animations: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        slideUp: 'slideUp 0.3s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s linear infinite',
    },
} as const

/**
 * Generate CSS custom properties string for injection into :root
 */
export function generateCSSVariables(): string {
    const vars: string[] = []

    // Colors
    Object.entries(designTokens.colors.brand).forEach(([key, val]) => {
        vars.push(`--brand-${key}: ${val};`)
    })
    Object.entries(designTokens.colors.accent).forEach(([key, val]) => {
        vars.push(`--accent-${key}: ${val};`)
    })
    Object.entries(designTokens.colors.surface).forEach(([key, val]) => {
        vars.push(`--surface-${key}: ${val};`)
    })

    // Spacing
    Object.entries(designTokens.spacing).forEach(([key, val]) => {
        vars.push(`--spacing-${key}: ${val};`)
    })

    // Radius
    Object.entries(designTokens.radius).forEach(([key, val]) => {
        vars.push(`--radius-${key}: ${val};`)
    })

    return vars.join('\n  ')
}

export type DesignTokens = typeof designTokens
