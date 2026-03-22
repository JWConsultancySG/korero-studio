import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Clock, Trash2,
  Check, Music, AlertCircle, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, isSameDay, startOfDay, isToday, isBefore } from 'date-fns';
import type { AvailabilitySlot } from '@/types';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8am to 10pm start
const formatHour = (h: number) => {
  if (h === 0 || h === 24) return '12 AM';
  if (h === 12) return '12 PM';
  if (h > 12) return `${h - 12} PM`;
  return `${h} AM`;
};

export default function AvailabilityPage() {
  const { student, availability, addAvailability, removeAvailability, groups, sessions, bookings } = useApp();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [adding, setAdding] = useState(false);
  const [startHour, setStartHour] = useState(16);
  const [endHour, setEndHour] = useState(18);
  const [weekOffset, setWeekOffset] = useState(0);

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pb-28">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <CalendarDays className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-black text-foreground mb-2">Set Your Availability</h2>
          <p className="text-sm text-muted-foreground mb-6">Sign in to manage your schedule</p>
          <Button onClick={() => navigate('/login')} className="rounded-2xl font-bold gradient-purple text-primary-foreground btn-press h-12 px-8">
            Sign In <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      </div>
    );
  }

  // Generate 30 days starting from today
  const today = startOfDay(new Date());
  const allDays = Array.from({ length: 30 }, (_, i) => addDays(today, i));

  // Show 7 days at a time
  const visibleDays = allDays.slice(weekOffset * 7, weekOffset * 7 + 7);
  const maxWeekOffset = Math.floor(29 / 7);

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const slotsForDate = availability.filter(s => s.date === dateKey);

  // Get confirmed classes for selected date
  const confirmedSlotsForDate = slotsForDate.filter(s => s.isConfirmedClass);
  const freeSlotsForDate = slotsForDate.filter(s => !s.isConfirmedClass);

  const handleAdd = () => {
    if (endHour <= startHour) {
      toast.error('End time must be after start time');
      return;
    }

    // Check overlap with existing slots
    const hasOverlap = slotsForDate.some(s =>
      (startHour < s.endHour && endHour > s.startHour)
    );
    if (hasOverlap) {
      toast.error('This overlaps with an existing slot');
      return;
    }

    addAvailability({
      date: dateKey,
      startHour,
      endHour,
    });
    setAdding(false);
    toast.success('Availability added');
  };

  const handleRemove = (slot: AvailabilitySlot) => {
    if (slot.isConfirmedClass) {
      toast.error("Can't remove confirmed class slots");
      return;
    }
    removeAvailability(slot.date, slot.startHour, slot.endHour);
    toast.success('Slot removed');
  };

  // Count total availability slots
  const totalSlots = availability.filter(s => !s.isConfirmedClass).length;
  const totalConfirmed = availability.filter(s => s.isConfirmedClass).length;

  // Check if a date has slots
  const dateHasSlots = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    return availability.some(s => s.date === key && !s.isConfirmedClass);
  };
  const dateHasConfirmed = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    return availability.some(s => s.date === key && s.isConfirmedClass);
  };

  // Timeline visualization for selected date (8am-11pm)
  const timelineHours = Array.from({ length: 16 }, (_, i) => i + 8); // 8-23

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="gradient-purple-subtle px-6 pt-7 pb-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
          <h1 className="text-2xl font-black mb-1 text-foreground tracking-tight flex items-center gap-2">
            My Schedule <CalendarDays className="w-5 h-5 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Set when you're free for the next 30 days
          </p>
          <div className="flex items-center gap-2.5 mt-4">
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card border border-border text-xs font-bold text-foreground min-h-[36px]">
              <Clock className="w-3 h-3 text-primary" />
              {totalSlots} free slot{totalSlots !== 1 ? 's' : ''}
            </div>
            {totalConfirmed > 0 && (
              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card border border-border text-xs font-bold text-foreground min-h-[36px]">
                <Music className="w-3 h-3 text-primary" />
                {totalConfirmed} class{totalConfirmed !== 1 ? 'es' : ''}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="px-5 pt-4 max-w-md mx-auto">
        {/* Week navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
            disabled={weekOffset === 0}
            className="p-2 rounded-xl btn-press disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            {format(visibleDays[0], 'MMM d')} — {format(visibleDays[visibleDays.length - 1], 'MMM d')}
          </p>
          <button
            onClick={() => setWeekOffset(Math.min(maxWeekOffset, weekOffset + 1))}
            disabled={weekOffset >= maxWeekOffset}
            className="p-2 rounded-xl btn-press disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Day selector */}
        <div className="grid grid-cols-7 gap-1.5 mb-6">
          {visibleDays.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            const hasSlots = dateHasSlots(day);
            const hasConfirmed = dateHasConfirmed(day);
            const isPast = isBefore(day, today) && !isToday(day);

            return (
              <motion.button
                key={day.toISOString()}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => !isPast && setSelectedDate(day)}
                disabled={isPast}
                className={`flex flex-col items-center py-2.5 px-1 rounded-2xl transition-all btn-press min-h-[72px] ${
                  isSelected
                    ? 'gradient-purple glow-purple'
                    : isPast
                    ? 'opacity-30'
                    : 'bg-card border border-border hover:border-primary/30'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {format(day, 'EEE')}
                </span>
                <span className={`text-lg font-black ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </span>
                <div className="flex gap-0.5 mt-1">
                  {hasSlots && (
                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />
                  )}
                  {hasConfirmed && (
                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary-foreground/60' : 'bg-success'}`} />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Selected day detail */}
        <AnimatePresence mode="wait">
          <motion.div
            key={dateKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-black text-foreground text-lg">
                  {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')}
                </p>
                <p className="text-xs text-muted-foreground">{format(selectedDate, 'MMMM d, yyyy')}</p>
              </div>
              <Button
                onClick={() => setAdding(true)}
                size="sm"
                className="rounded-2xl gradient-purple text-primary-foreground font-bold btn-press h-10 px-4"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Time
              </Button>
            </div>

            {/* Timeline view */}
            <div className="card-premium p-4 mb-4">
              <div className="relative">
                {timelineHours.map((hour, i) => {
                  // Find slots that cover this hour
                  const freeSlot = freeSlotsForDate.find(s => hour >= s.startHour && hour < s.endHour);
                  const confirmedSlot = confirmedSlotsForDate.find(s => hour >= s.startHour && hour < s.endHour);
                  const isStart = freeSlot?.startHour === hour || confirmedSlot?.startHour === hour;

                  return (
                    <div key={hour} className="flex items-stretch min-h-[32px]">
                      <div className="w-14 flex-shrink-0 text-[10px] font-bold text-muted-foreground pt-0.5">
                        {hour % 2 === 0 ? formatHour(hour) : ''}
                      </div>
                      <div className="flex-1 border-t border-border/50 relative">
                        {confirmedSlot && isStart && (
                          <div
                            className="absolute inset-x-0 z-10 bg-primary/10 border border-primary/30 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5"
                            style={{ height: `${(confirmedSlot.endHour - confirmedSlot.startHour) * 32}px` }}
                          >
                            <Music className="w-3 h-3 text-primary flex-shrink-0" />
                            <span className="text-[11px] font-bold text-primary truncate">
                              {groups.find(g => g.id === confirmedSlot.confirmedGroupId)?.songTitle || 'Class'}
                            </span>
                          </div>
                        )}
                        {freeSlot && isStart && !confirmedSlot && (
                          <div
                            className="absolute inset-x-0 z-10 bg-accent border border-border rounded-xl px-2.5 py-1.5 flex items-center justify-between"
                            style={{ height: `${(freeSlot.endHour - freeSlot.startHour) * 32}px` }}
                          >
                            <span className="text-[11px] font-bold text-foreground">
                              {formatHour(freeSlot.startHour)} — {formatHour(freeSlot.endHour)}
                            </span>
                            <button
                              onClick={() => handleRemove(freeSlot)}
                              className="p-1 rounded-lg hover:bg-destructive/10 btn-press"
                            >
                              <Trash2 className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Empty state */}
            {slotsForDate.length === 0 && !adding && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-bold text-muted-foreground mb-1">No availability set</p>
                <p className="text-xs text-muted-foreground">Tap "Add Time" to mark when you're free</p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Add time modal */}
        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40"
              onClick={() => setAdding(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md bg-card rounded-t-3xl border-t border-border max-h-[85vh] flex flex-col"
              >
                <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4 mt-3 flex-shrink-0" />
                <div className="flex-shrink-0 px-6">
                  <h3 className="text-lg font-black text-foreground mb-1">Add Free Time</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {format(selectedDate, 'EEEE, MMMM d')}
                  </p>
                </div>

                <div className="space-y-5 overflow-y-auto px-6 pb-10 flex-1">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 block">From</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {HOURS.map(h => (
                        <button
                          key={`s-${h}`}
                          onClick={() => {
                            setStartHour(h);
                            if (endHour <= h) setEndHour(h + 1);
                          }}
                          className={`py-2.5 rounded-xl text-xs font-bold transition-all btn-press ${
                            startHour === h
                              ? 'gradient-purple text-primary-foreground glow-purple'
                              : 'bg-muted text-foreground hover:bg-accent'
                          }`}
                        >
                          {formatHour(h)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 block">To</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {HOURS.filter(h => h > startHour).concat([23]).map(h => (
                        <button
                          key={`e-${h}`}
                          onClick={() => setEndHour(h)}
                          className={`py-2.5 rounded-xl text-xs font-bold transition-all btn-press ${
                            endHour === h
                              ? 'gradient-purple text-primary-foreground glow-purple'
                              : 'bg-muted text-foreground hover:bg-accent'
                          }`}
                        >
                          {formatHour(h)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="card-premium p-4 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-black text-sm text-foreground">
                        {formatHour(startHour)} — {formatHour(endHour)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{endHour - startHour} hour{endHour - startHour !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleAdd}
                    className="w-full h-14 rounded-2xl font-black text-base gradient-purple text-primary-foreground btn-press"
                  >
                    <span className="flex items-center gap-2">Confirm <Check className="w-4 h-4" /></span>
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-premium p-4 mt-4 flex items-start gap-3"
        >
          <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-foreground mb-0.5">How it works</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Set your free times once — it applies to all song groups you join.
              When a class is confirmed, that time is automatically blocked here.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
