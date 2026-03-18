import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ArrowLeft, Sparkles, User, Phone, Mail } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const navigate = useNavigate();
  const { registerStudent } = useApp();

  const isValid = name.trim() && whatsapp.trim() && email.trim();
  const filledCount = [name, whatsapp, email].filter(v => v.trim()).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    registerStudent({ name, whatsapp, email });
    navigate('/groups');
  };

  return (
    <div className="min-h-screen gradient-purple-subtle">
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium btn-press">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-6 pt-4 pb-28 max-w-sm mx-auto"
      >
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-6">
          {[0, 1, 2].map(i => (
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
          <h1 className="text-3xl font-black mb-1.5 text-foreground tracking-tight">
            Join the crew 💜
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            Quick sign up — takes 10 seconds, no cap
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {[
            { id: 'name', label: 'Name', icon: User, value: name, setter: setName, placeholder: 'Your name', type: 'text' },
            { id: 'whatsapp', label: 'WhatsApp', icon: Phone, value: whatsapp, setter: setWhatsapp, placeholder: '+65 9123 4567', type: 'tel' },
            { id: 'email', label: 'Email', icon: Mail, value: email, setter: setEmail, placeholder: 'you@email.com', type: 'email' },
          ].map((field, i) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="space-y-2"
            >
              <Label htmlFor={field.id} className="font-bold text-sm flex items-center gap-1.5">
                <field.icon className="w-3.5 h-3.5 text-primary" />
                {field.label}
              </Label>
              <div className={`relative rounded-2xl transition-shadow duration-300 ${
                focusedField === field.id ? 'glow-purple' : ''
              }`}>
                <Input
                  id={field.id}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={field.value}
                  onChange={e => field.setter(e.target.value)}
                  onFocus={() => setFocusedField(field.id)}
                  onBlur={() => setFocusedField(null)}
                  className="h-13 rounded-2xl text-base border-2 border-border focus:border-primary transition-colors bg-card px-4"
                />
                {field.value.trim() && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-success flex items-center justify-center"
                  >
                    <span className="text-success-foreground text-xs">✓</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="pt-3"
          >
            <Button
              type="submit"
              disabled={!isValid}
              size="lg"
              className="w-full text-lg font-black h-14 rounded-2xl gradient-purple text-primary-foreground glow-purple btn-press relative overflow-hidden group disabled:opacity-40 disabled:glow-none"
            >
              <span className="relative z-10 flex items-center gap-2">
                Let's go
                <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              </span>
              {isValid && <div className="absolute inset-0 shimmer" />}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground mt-3">
              No spam, ever. We only use WhatsApp for class updates.
            </p>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
