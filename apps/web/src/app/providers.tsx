'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'
import { useState } from 'react'
import { useApiTokenSync } from '@/lib/auth/api-client'
import { PageViewTracker } from '@/components/PageViewTracker'

/**
 * Inner component that uses hooks requiring SessionProvider context.
 */
function AppInner({ children }: { children: React.ReactNode }) {
  // Sync NextAuth session token → global ApiClient
  useApiTokenSync()
  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppInner>{children}</AppInner>
          <PageViewTracker />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </SessionProvider>
  )
}
