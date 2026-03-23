'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertCircle, Sparkles } from 'lucide-react';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const message = searchParams.get('error');

  return (
    <div className="min-h-screen gradient-purple-subtle flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col items-center justify-center px-6 pb-28 md:pb-16 content-narrow w-full text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-8">
          <AlertCircle className="w-8 h-8 text-foreground" />
        </div>
        <h1 className="text-3xl font-black mb-3 text-foreground tracking-tight leading-tight">
          Something went wrong
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-2">
          We couldn&apos;t complete that sign-in step. Try again from the email link or sign in manually.
        </p>
        {message && (
          <p className="text-xs font-mono text-destructive/90 break-all mb-6 px-2">
            {message}
          </p>
        )}
        <Button
          asChild
          size="lg"
          className="w-full max-w-xs h-14 rounded-2xl gradient-purple text-primary-foreground font-black text-lg glow-purple btn-press"
        >
          <Link href="/login" className="inline-flex items-center justify-center gap-2">
            Try sign in
            <Sparkles className="w-5 h-5" />
          </Link>
        </Button>
        <Link
          href="/"
          className="mt-8 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to home
        </Link>
      </motion.div>
    </div>
  );
}
