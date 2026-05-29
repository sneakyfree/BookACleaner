'use client';

import { useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    startTransition(() => {
      // Set cookie
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
      // Refresh the page to apply new locale
      router.refresh();
    });
  };

  // Get current locale from cookie
  const getCurrentLocale = () => {
    if (typeof window !== 'undefined') {
      const match = document.cookie.match(/NEXT_LOCALE=(\w+)/);
      return match ? match[1] : 'en';
    }
    return 'en';
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-white/60" />
      <select
        onChange={(e) => switchLocale(e.target.value)}
        defaultValue={typeof window !== 'undefined' ? getCurrentLocale() : 'en'}
        disabled={isPending}
        className="bg-transparent text-white/80 hover:text-white text-sm border-none outline-none cursor-pointer appearance-none pr-6"
        style={{ backgroundImage: 'none' }}
      >
        <option value="en" className="bg-slate-800 text-white">🇺🇸 English</option>
        <option value="es" className="bg-slate-800 text-white">🇪🇸 Español</option>
      </select>
    </div>
  );
}
