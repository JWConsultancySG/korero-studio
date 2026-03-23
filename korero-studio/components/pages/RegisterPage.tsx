'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Sparkles, User, Phone, Mail, Lock, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+65', country: 'SG' },
  { code: '+60', country: 'MY' },
  { code: '+62', country: 'ID' },
  { code: '+63', country: 'PH' },
  { code: '+66', country: 'TH' },
  { code: '+84', country: 'VN' },
  { code: '+91', country: 'IN' },
  { code: '+86', country: 'CN' },
  { code: '+82', country: 'KR' },
  { code: '+81', country: 'JP' },
  { code: '+1', country: 'US' },
  { code: '+44', country: 'UK' },
  { code: '+61', country: 'AU' },
];

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+65');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { syncStudentFromAuth } = useApp();

  const whatsapp = `${countryCode} ${phone}`.trim();
  const isValid = name.trim() && phone.trim().length >= 7 && email.trim().includes('@') && password.trim().length >= 6;
  const filledCount = [name, phone, email, password].filter(v => v.trim()).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const emailNorm = email.trim().toLowerCase();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: emailNorm,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent('/preferences')}`,
          data: {
            full_name: name.trim(),
            whatsapp,
          },
        },
      });
      if (signUpError) throw signUpError;

      if (data.session && data.user) {
        syncStudentFromAuth({
          id: data.user.id,
          name: name.trim(),
          whatsapp,
          email: emailNorm,
        });
        router.push('/preferences');
      } else {
        router.push('/auth/sign-up-success');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      if (/already registered|already been registered|User already exists/i.test(message)) {
        setError('An account with this email already exists. Try signing in instead.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-purple-subtle">
      <div className="px-6 pt-5 pb-2">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground text-sm font-medium btn-press min-h-[44px]">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-6 pt-4 pb-28 md:pb-16 content-narrow"
      >
        <div className="flex items-center gap-2 mb-8">
          {[0, 1, 2, 3].map(i => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i < filledCount ? 'w-8 gradient-purple' : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-3xl font-black mb-2 text-foreground tracking-tight leading-tight">
            Create your account
          </h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            Join song groups, book classes and track your progress
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
          {/* Full Name */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <Label htmlFor="name" className="font-bold text-sm flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-primary" />
              Full Name
            </Label>
            <div className={`relative rounded-2xl transition-shadow duration-300 ${
              focusedField === 'name' ? 'glow-purple' : ''
            }`}>
              <Input
                id="name"
                type="text"
                placeholder="e.g. Sarah Tan"
                value={name}
                onChange={e => setName(e.target.value)}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                className="h-14 rounded-2xl text-base border-2 border-border focus:border-primary transition-colors bg-card px-4"
              />
              {name.trim() && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-success flex items-center justify-center">
                  <Check className="w-3 h-3 text-success-foreground" />
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Email */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="space-y-2"
          >
            <Label htmlFor="email" className="font-bold text-sm flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-primary" />
              Email Address
            </Label>
            <div className={`relative rounded-2xl transition-shadow duration-300 ${
              focusedField === 'email' ? 'glow-purple' : ''
            }`}>
              <Input
                id="email"
                type="email"
                placeholder="e.g. sarah@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className="h-14 rounded-2xl text-base border-2 border-border focus:border-primary transition-colors bg-card px-4"
              />
              {email.trim() && email.includes('@') && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-success flex items-center justify-center">
                  <Check className="w-3 h-3 text-success-foreground" />
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* WhatsApp with Country Code */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.46 }}
            className="space-y-2"
          >
            <Label htmlFor="phone" className="font-bold text-sm flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-primary" />
              WhatsApp Number
            </Label>
            <div className={`relative rounded-2xl transition-shadow duration-300 flex gap-2 ${
              focusedField === 'phone' ? 'glow-purple' : ''
            }`}>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="h-14 w-[100px] rounded-2xl text-base border-2 border-border bg-card px-3 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map(cc => (
                    <SelectItem key={cc.code} value={cc.code}>
                      {cc.country} {cc.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9123 4567"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                  className="h-14 rounded-2xl text-base border-2 border-border focus:border-primary transition-colors bg-card px-4"
                />
                {phone.trim().length >= 7 && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-success flex items-center justify-center">
                    <Check className="w-3 h-3 text-success-foreground" />
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Password */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.54 }}
            className="space-y-2"
          >
            <Label htmlFor="password" className="font-bold text-sm flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-primary" />
              Password
            </Label>
            <div className={`relative rounded-2xl transition-shadow duration-300 ${
              focusedField === 'password' ? 'glow-purple' : ''
            }`}>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className="h-14 rounded-2xl text-base border-2 border-border focus:border-primary transition-colors bg-card px-4 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && password.length < 6 && (
              <p className="text-xs text-destructive font-medium">Must be at least 6 characters</p>
            )}
          </motion.div>

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="pt-3"
          >
            <Button
              type="submit"
              disabled={!isValid || loading}
              size="lg"
              className="w-full text-lg font-black h-14 rounded-2xl gradient-purple text-primary-foreground glow-purple btn-press relative overflow-hidden group disabled:opacity-40 disabled:glow-none"
            >
              <span className="relative z-10 flex items-center gap-2">
                {loading ? 'Creating account...' : 'Create Account'}
                <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              </span>
              {isValid && !loading && <div className="absolute inset-0 shimmer" />}
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-6 leading-relaxed">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-bold hover:underline">
                Sign In
              </Link>
            </p>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
