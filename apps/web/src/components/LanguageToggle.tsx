'use client'

import { useLanguage } from '@/lib/i18n/context'
import { Globe } from 'lucide-react'

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all duration-200 text-sm font-medium"
      aria-label={language === 'en' ? 'Cambiar a Español' : 'Switch to English'}
    >
      <Globe className="w-4 h-4" />
      <span className="hidden sm:inline">{language === 'en' ? 'ES' : 'EN'}</span>
      <span className="sm:hidden">{language === 'en' ? '🇪🇸' : '🇺🇸'}</span>
    </button>
  )
}
