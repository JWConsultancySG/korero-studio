import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Music, Clock, Star, Sparkles, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function MyClassesPage() {
  const { bookings, groups } = useApp();
  const navigate = useNavigate();
  const paidBookings = bookings.filter(b => b.paymentStatus === 'paid');

  return (
    <div className="min-h-screen pb-28">
      <div className="gradient-purple-subtle px-5 pt-6 pb-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
          <h1 className="text-2xl font-black mb-0.5 text-foreground tracking-tight">My Classes 📚</h1>
          <p className="text-sm text-muted-foreground">Your booked sessions</p>
          {paidBookings.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-bold text-foreground w-fit">
              <Sparkles className="w-3 h-3 text-primary" />
              {paidBookings.length} {paidBookings.length === 1 ? 'class' : 'classes'} booked
            </div>
          )}
        </motion.div>
      </div>

      <div className="px-4 pt-4 max-w-md mx-auto">
        {paidBookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 rounded-3xl bg-accent flex items-center justify-center mx-auto mb-5">
              <Music className="w-8 h-8 text-primary" />
            </div>
            <p className="font-black text-lg text-foreground mb-1.5">No classes yet</p>
            <p className="text-sm text-muted-foreground mb-6">Join a song group to get started!</p>
            <Button
              onClick={() => navigate('/groups')}
              className="rounded-2xl font-bold gradient-purple text-primary-foreground btn-press h-12 px-8"
            >
              Browse Groups <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {paidBookings.map((booking, i) => {
              const group = groups.find(g => g.id === booking.groupId);
              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="card-premium p-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 gradient-purple" />
                  <div className="flex items-start gap-3.5">
                    <div className="w-13 h-13 rounded-2xl gradient-purple flex items-center justify-center flex-shrink-0">
                      <Music className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[15px] text-foreground truncate">{group?.songTitle || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{group?.artist}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          <Star className="w-3 h-3 text-primary" /> {booking.role}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-primary" /> {booking.timeSlot.day} {booking.timeSlot.time}
                        </span>
                      </div>
                    </div>
                    <Badge className="gradient-purple text-primary-foreground text-[10px] font-black">Paid ✅</Badge>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
