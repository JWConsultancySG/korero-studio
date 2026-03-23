'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Mail, Sparkles, Check, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();

  const isValid = email.trim().includes('@');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/auth/update-password`,
        },
      );
      if (resetError) throw resetError;
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-purple-subtle">
      <div className="px-6 pt-5 pb-2">
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="flex items-center gap-2 text-muted-foreground text-sm font-medium btn-press min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-6 pt-4 pb-28 md:pb-16 content-narrow"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <h1 className="text-3xl font-black mb-2 text-foreground tracking-tight leading-tight">
            {success ? 'Check your email' : 'Reset password'}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {success
              ? 'We sent a link to reset your password if this email is registered.'
              : 'Enter your email and we’ll send you a reset link.'}
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-muted border border-border flex items-start gap-3"
          >
            <AlertCircle className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
            <p className="text-sm font-medium text-foreground">{error}</p>
          </motion.div>
        )}

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-2xl bg-card border border-border flex flex-col items-center text-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl gradient-purple flex items-center justify-center">
              <Check className="w-7 h-7 text-primary-foreground" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Open the email on this device and follow the link to choose a new password.
            </p>
            <Button
              asChild
              size="lg"
              className="w-full h-14 rounded-2xl gradient-purple text-primary-foreground font-black"
            >
              <Link href="/login">Back to sign in</Link>
            </Button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <Label htmlFor="email" className="font-bold text-sm flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-primary" />
                Email Address
              </Label>
              <div
                className={`relative rounded-2xl transition-shadow duration-300 ${
                  focusedField === 'email' ? 'glow-purple' : ''
                }`}
              >
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. sarah@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="h-14 rounded-2xl text-base border-2 border-border focus:border-primary transition-colors bg-card px-4"
                  required
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="pt-3"
            >
              <Button
                type="submit"
                disabled={!isValid || loading}
                size="lg"
                className="w-full text-lg font-black h-14 rounded-2xl gradient-purple text-primary-foreground glow-purple btn-press relative overflow-hidden group disabled:opacity-40 disabled:glow-none"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? 'Sending…' : 'Send reset link'}
                  <Sparkles className="w-5 h-5" />
                </span>
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-6 leading-relaxed">
                Remember your password?{' '}
                <Link href="/login" className="text-primary font-bold hover:underline">
                  Sign in
                </Link>
              </p>
            </motion.div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
