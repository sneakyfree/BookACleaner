import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export const locales = ['en', 'es'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

/**
 * Locale resolution.
 *
 * Gated on NEXT_PUBLIC_ENABLE_I18N (default off) so the flag governs BEHAVIOUR,
 * not just whether the switcher is visible. Hiding the control while still
 * honouring the cookie would leave anyone who had already switched stranded in
 * a half-translated app with no way back — Spanish nav and hero on the
 * homepage, English everywhere else, and no button to undo it.
 *
 * Spanish is currently ~26 keys against 200+ hardcoded English strings. Set the
 * flag to true once the translations are done; nothing else needs to change.
 */
const I18N_ENABLED = process.env.NEXT_PUBLIC_ENABLE_I18N === 'true'

export default getRequestConfig(async () => {
  let locale: Locale = defaultLocale

  if (I18N_ENABLED) {
    const cookieStore = await cookies()
    const requested = cookieStore.get('NEXT_LOCALE')?.value
    // Only accept a locale we actually ship messages for — an arbitrary cookie
    // value would otherwise reach the dynamic import below.
    if (requested && (locales as readonly string[]).includes(requested)) {
      locale = requested as Locale
    }
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
