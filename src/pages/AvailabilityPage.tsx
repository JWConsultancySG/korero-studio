import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Clock,
  Music, AlertCircle, ArrowRight, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, isSameDay, startOfDay, isToday, isBefore, getDay } from 'date-fns';
import type { AvailabilitySlot } from '@/types';
import WeeklyGrid, { type WeeklyTemplate } from '@/components/schedule/WeeklyGrid';
import DayTimeline from '@/components/schedule/DayTimeline';
import AddTimeSheet from '@/components/schedule/AddTimeSheet';

export default function AvailabilityPage() {
  const { student, availability, addAvailability, removeAvailability, setAvailabilityBatch, clearAllAvailability, groups } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [adding, setAdding] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<'template' | 'calendar'>('template');

  // Weekly template state: dayIndex (0=Mon, 6=Sun) -> Set of hours
  const [weeklyTemplate, setWeeklyTemplate] = useState<WeeklyTemplate>({});

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

  const today = startOfDay(new Date());
  const allDays = Array.from({ length: 30 }, (_, i) => addDays(today, i));
  const visibleDays = allDays.slice(weekOffset * 7, weekOffset * 7 + 7);
  const maxWeekOffset = Math.floor(29 / 7);

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const slotsForDate = availability.filter(s => s.date === dateKey);
  const confirmedSlotsForDate = slotsForDate.filter(s => s.isConfirmedClass);
  const freeSlotsForDate = slotsForDate.filter(s => !s.isConfirmedClass);

  // Convert JS getDay (0=Sun) to our grid (0=Mon)
  const jsToGridDay = (jsDay: number) => jsDay === 0 ? 6 : jsDay - 1;

  const applyTemplate = () => {
    const slots: AvailabilitySlot[] = [];

    allDays.forEach(day => {
      const gridDay = jsToGridDay(getDay(day));
      const hours = weeklyTemplate[gridDay];
      if (!hours || hours.size === 0) return;

      const key = format(day, 'yyyy-MM-dd');
      // Check for confirmed classes on this date
      const confirmedOnDate = availability.filter(s => s.date === key && s.isConfirmedClass);

      // Group contiguous hours into slots
      const sortedHours = Array.from(hours).sort((a, b) => a - b);
      let blockStart = sortedHours[0];
      let blockEnd = sortedHours[0] + 1;

      for (let i = 1; i <= sortedHours.length; i++) {
        if (i < sortedHours.length && sortedHours[i] === blockEnd) {
          blockEnd = sortedHours[i] + 1;
        } else {
          // Check if this block overlaps with any confirmed class
          const overlapsConfirmed = confirmedOnDate.some(c =>
            blockStart < c.endHour && blockEnd > c.startHour
          );
          if (!overlapsConfirmed) {
            slots.push({ date: key, startHour: blockStart, endHour: blockEnd });
          }
          if (i < sortedHours.length) {
            blockStart = sortedHours[i];
            blockEnd = sortedHours[i] + 1;
          }
        }
      }
    });

    setAvailabilityBatch(slots);
    if (returnTo) {
      toast.success('Schedule set! 🎉 Taking you back to join your group…');
      setTimeout(() => navigate(returnTo), 1500);
    } else {
      toast.success(`Applied to ${allDays.length} days`);
      setActiveTab('calendar');
    }
  };

  const handleAddTime = (startHour: number, endHour: number) => {
    const hasOverlap = slotsForDate.some(s =>
      (startHour < s.endHour && endHour > s.startHour)
    );
    if (hasOverlap) {
      toast.error('This overlaps with an existing slot');
      return;
    }
    addAvailability({ date: dateKey, startHour, endHour });
    setAdding(false);
    toast.success('Time added');
  };

  const handleRemoveSlot = (slot: AvailabilitySlot) => {
    if (slot.isConfirmedClass) {
      toast.error("Can't remove confirmed classes");
      return;
    }
    removeAvailability(slot.date, slot.startHour, slot.endHour);
    toast.success('Slot removed');
  };

  const totalSlots = availability.filter(s => !s.isConfirmedClass).length;
  const totalConfirmed = availability.filter(s => s.isConfirmedClass).length;
  const hasExistingSlots = totalSlots > 0;

  const dateHasSlots = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    return availability.some(s => s.date === key && !s.isConfirmedClass);
  };
  const dateHasConfirmed = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    return availability.some(s => s.date === key && s.isConfirmedClass);
  };

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
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-muted rounded-2xl mb-5">
          <button
            onClick={() => setActiveTab('template')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all btn-press ${
              activeTab === 'template'
                ? 'gradient-purple text-primary-foreground glow-purple'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-3 h-3 inline mr-1" />
            Weekly Pattern
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all btn-press ${
              activeTab === 'calendar'
                ? 'gradient-purple text-primary-foreground glow-purple'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarDays className="w-3 h-3 inline mr-1" />
            30-Day View
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'template' ? (
            <motion.div
              key="template"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <WeeklyGrid
                template={weeklyTemplate}
                onChange={setWeeklyTemplate}
                onApply={applyTemplate}
                onClear={() => {
                  setWeeklyTemplate({});
                  clearAllAvailability();
                  toast.success('All cleared');
                }}
                hasExistingSlots={hasExistingSlots}
              />

              {/* How it works tip */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card-premium p-4 mt-5 flex items-start gap-3"
              >
                <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-foreground mb-0.5">How it works</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Set your typical weekly schedule here, then tap "Apply" to fill all 30 days.
                    Switch to "30-Day View" to adjust specific dates.
                    Confirmed classes are automatically protected.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
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
              <div className="grid grid-cols-7 gap-1.5 mb-5">
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
                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary-foreground/60' : 'bg-primary/40'}`} />
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
                  <div className="flex items-center justify-between mb-3">
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

                  <DayTimeline
                    freeSlots={freeSlotsForDate}
                    confirmedSlots={confirmedSlotsForDate}
                    groups={groups}
                    onRemoveSlot={handleRemoveSlot}
                    onAddTime={() => setAdding(true)}
                    isEmpty={slotsForDate.length === 0}
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add time bottom sheet */}
        <AnimatePresence>
          {adding && (
            <AddTimeSheet
              dateLabel={format(selectedDate, 'EEEE, MMMM d')}
              onAdd={handleAddTime}
              onClose={() => setAdding(false)}
              existingSlots={slotsForDate}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
