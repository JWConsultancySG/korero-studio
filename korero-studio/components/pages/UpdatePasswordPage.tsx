'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Lock, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isValid =
    password.trim().length >= 6 &&
    password === repeatPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      router.push('/browse');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update password');
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
            New password
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Choose a strong password for your Korero account.
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <Label htmlFor="new-password" className="font-bold text-sm flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-primary" />
              New password
            </Label>
            <div
              className={`relative rounded-2xl transition-shadow duration-300 ${
                focusedField === 'password' ? 'glow-purple' : ''
              }`}
            >
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className="h-14 rounded-2xl text-base border-2 border-border focus:border-primary transition-colors bg-card px-4 pr-12"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="space-y-2"
          >
            <Label htmlFor="repeat-password" className="font-bold text-sm flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-primary" />
              Confirm password
            </Label>
            <div
              className={`relative rounded-2xl transition-shadow duration-300 ${
                focusedField === 'repeat' ? 'glow-purple' : ''
              }`}
            >
              <Input
                id="repeat-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Repeat your password"
                value={repeatPassword}
                onChange={e => setRepeatPassword(e.target.value)}
                onFocus={() => setFocusedField('repeat')}
                onBlur={() => setFocusedField(null)}
                className="h-14 rounded-2xl text-base border-2 border-border focus:border-primary transition-colors bg-card px-4"
                required
              />
            </div>
            {repeatPassword && password !== repeatPassword && (
              <p className="text-xs text-destructive font-medium">Passwords must match</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.46 }}
            className="pt-3"
          >
            <Button
              type="submit"
              disabled={!isValid || loading}
              size="lg"
              className="w-full text-lg font-black h-14 rounded-2xl gradient-purple text-primary-foreground glow-purple btn-press relative overflow-hidden group disabled:opacity-40 disabled:glow-none"
            >
              <span className="relative z-10 flex items-center gap-2">
                {loading ? 'Saving…' : 'Save password'}
                <Sparkles className="w-5 h-5" />
              </span>
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-6 leading-relaxed">
              <Link href="/login" className="text-primary font-bold hover:underline">
                Back to sign in
              </Link>
            </p>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
