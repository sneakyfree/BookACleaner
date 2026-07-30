'use client'

import { useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Globe } from 'lucide-react'

/**
 * Hidden until the translations actually exist.
 *
 * Spanish is currently ~26 translated keys against 200+ hardcoded English
 * strings, and only one file calls useTranslations. So switching to Spanish
 * gave you a translated homepage nav and hero, an English <title>, and then a
 * fully English page the moment you clicked "Precios". A control that visibly
 * half-works is worse than one that isn't offered yet — it teaches the user
 * the product is unreliable on their very first interaction.
 *
 * The i18n plumbing is left entirely intact: next-intl, both message files and
 * this component all stay. Set NEXT_PUBLIC_ENABLE_I18N=true to bring the
 * control back the day the strings are done — no code change required.
 *
 * Note this does NOT make the app statically renderable. src/i18n.ts still
 * reads the locale cookie, which keeps every route dynamic. That is fine and
 * deliberate: measured TTFB on the public pages is 15-21ms against Google's
 * 800ms "good" threshold, so there is nothing to win by changing it.
 */
const I18N_ENABLED = process.env.NEXT_PUBLIC_ENABLE_I18N === 'true'

export function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const pathname = usePathname()

  if (!I18N_ENABLED) return null

  const switchLocale = (newLocale: string) => {
    startTransition(() => {
      // Set cookie
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`
      // Refresh the page to apply new locale
      router.refresh()
    })
  }

  // Get current locale from cookie
  const getCurrentLocale = () => {
    if (typeof window !== 'undefined') {
      const match = document.cookie.match(/NEXT_LOCALE=(\w+)/)
      return match ? match[1] : 'en'
    }
    return 'en'
  }

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-white/60" />
      <select
        onChange={(e) => switchLocale(e.target.value)}
        defaultValue={typeof window !== 'undefined' ? getCurrentLocale() : 'en'}
        disabled={isPending}
        className="cursor-pointer appearance-none border-none bg-transparent pr-6 text-sm text-white/80 outline-none hover:text-white"
        style={{ backgroundImage: 'none' }}
      >
        <option value="en" className="bg-slate-800 text-white">
          🇺🇸 English
        </option>
        <option value="es" className="bg-slate-800 text-white">
          🇪🇸 Español
        </option>
      </select>
    </div>
  )
}
