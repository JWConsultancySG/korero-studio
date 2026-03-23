'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Mail, Sparkles } from 'lucide-react';

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen gradient-purple-subtle flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col items-center justify-center px-6 pb-28 md:pb-16 content-narrow w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="w-20 h-20 rounded-3xl gradient-purple flex items-center justify-center mb-8 glow-purple"
        >
          <Mail className="w-10 h-10 text-primary-foreground" />
        </motion.div>
        <h1 className="text-3xl font-black mb-3 text-foreground tracking-tight leading-tight">
          You&apos;re almost there
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-10">
          We sent you a confirmation email. Open it and tap the link to activate your account, then come back and sign in.
        </p>
        <Button
          asChild
          size="lg"
          className="w-full max-w-xs h-14 rounded-2xl gradient-purple text-primary-foreground font-black text-lg glow-purple btn-press"
        >
          <Link href="/login" className="inline-flex items-center justify-center gap-2">
            Go to sign in
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
