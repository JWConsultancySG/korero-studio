import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const { registerStudent } = useApp();

  const isValid = name.trim() && whatsapp.trim() && email.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    registerStudent({ name, whatsapp, email });
    navigate('/groups');
  };

  return (
    <div className="min-h-screen px-6 pt-4 pb-28 gradient-purple-subtle">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm mx-auto"
      >
        <h1 className="text-3xl font-black mb-2 text-foreground">Join Korero 💜</h1>
        <p className="text-muted-foreground mb-8">Quick sign up — takes 10 seconds</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-bold">Name</Label>
            <Input
              id="name"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-12 rounded-xl text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="font-bold">WhatsApp</Label>
            <Input
              id="whatsapp"
              placeholder="+65 9123 4567"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              className="h-12 rounded-xl text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="font-bold">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-12 rounded-xl text-base"
            />
          </div>

          <Button
            type="submit"
            disabled={!isValid}
            size="lg"
            className="w-full text-lg font-bold h-14 rounded-2xl gradient-purple text-primary-foreground glow-purple active:scale-95 transition-transform mt-4"
          >
            Let's go 🔥
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
