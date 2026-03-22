import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginStudent } = useApp();

  const isValid = email.trim().includes('@') && password.trim().length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 800));

    const success = loginStudent(email, password);
    setLoading(false);

    if (success) {
      navigate('/groups');
    } else {
      setError('Incorrect email or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen gradient-purple-subtle">
      <div className="px-6 pt-5 pb-2">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground text-sm font-medium btn-press min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-6 pt-4 pb-28 max-w-sm mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <h1 className="text-3xl font-black mb-2 text-foreground tracking-tight leading-tight">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Sign in to your Korero account
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-muted border border-border"
          >
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
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
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
                placeholder="Enter your password"
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
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  >
                    <LogIn className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                {loading ? 'Signing in...' : 'Sign In'}
              </span>
              {isValid && !loading && <div className="absolute inset-0 shimmer" />}
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-6 leading-relaxed">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-bold hover:underline">
                Sign Up
              </Link>
            </p>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
