'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, useState } from 'react';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppProvider } from '@/context/AppContext';
import BottomNav from '@/components/BottomNav';
import { AppShell } from '@/components/AppShell';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <AppShell>
            {children}
          </AppShell>
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
          <Toaster />
          <Sonner />
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
