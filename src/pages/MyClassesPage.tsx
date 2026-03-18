import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Music, Clock, Star, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function MyClassesPage() {
  const { bookings, groups } = useApp();
  const navigate = useNavigate();
  const paidBookings = bookings.filter(b => b.paymentStatus === 'paid');

  return (
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black mb-1 text-foreground">My Classes 📚</h1>
        <p className="text-sm text-muted-foreground mb-6">Your booked sessions</p>

        {paidBookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
              <Music className="w-7 h-7 text-primary" />
            </div>
            <p className="font-bold text-foreground mb-2">No classes yet</p>
            <p className="text-sm text-muted-foreground mb-6">Join a song group to get started!</p>
            <button
              onClick={() => navigate('/groups')}
              className="text-primary font-bold text-sm"
            >
              Browse Groups →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {paidBookings.map((booking, i) => {
              const group = groups.find(g => g.id === booking.groupId);
              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-2xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl gradient-purple flex items-center justify-center flex-shrink-0">
                      <Music className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-foreground">{group?.songTitle || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{group?.artist}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="w-3 h-3" /> {booking.role}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" /> {booking.timeSlot.day} {booking.timeSlot.time}
                        </span>
                      </div>
                    </div>
                    <Badge className="gradient-purple text-primary-foreground text-[10px]">Paid</Badge>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
