'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarDays, Clock,
  Music, ArrowRight, Info, X, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { addDays, format, getDay } from 'date-fns';
import type { AvailabilitySlot } from '@/types';
import ScheduleTimetable from '@/components/schedule/ScheduleTimetable';
import type { WeeklyTemplate } from '@/components/schedule/WeeklyGrid';
import { cn } from '@/lib/utils';
import { hoursToBlocks, slotsToHoursForDate } from '@/lib/availability-blocks';

export default function AvailabilityPage() {
  const {
    student,
    availability,
    setAvailabilityBatch,
    groups,
  } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const fromSignup = searchParams.get('fromSignup') === 'true';
  const onboardingExit = fromSignup || Boolean(returnTo);
  const [showTutorial, setShowTutorial] = useState(true);
  const [weeklyTemplate, setWeeklyTemplate] = useState<WeeklyTemplate>({});
  const [draftAvailability, setDraftAvailability] = useState<AvailabilitySlot[]>(availability);

  useEffect(() => {
    setDraftAvailability(availability);
  }, [availability]);

  const freeSlotsSignature = (slots: AvailabilitySlot[]) =>
    slots
      .filter((s) => !s.isConfirmedClass)
      .map((s) => `${s.date}|${s.startHour}|${s.endHour}`)
      .sort()
      .join('||');

  const hasUnsavedChanges = useMemo(
    () => freeSlotsSignature(draftAvailability) !== freeSlotsSignature(availability),
    [draftAvailability, availability],
  );

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pb-28 md:pb-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <CalendarDays className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-black text-foreground mb-2">Set Your Availability</h2>
          <p className="text-sm text-muted-foreground mb-6">Sign in to manage your schedule</p>
          <Button onClick={() => router.push('/login')} className="rounded-2xl font-bold gradient-purple text-primary-foreground btn-press h-12 px-8">
            Sign In <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      </div>
    );
  }

  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const jsToGridDay = (jsDay: number) => jsDay === 0 ? 6 : jsDay - 1;

  const applyRecurring = (range: 'this' | 'next' | 'next4' | 'next8', selectedWeekMonday: Date) => {
    const weekCount = range === 'this' ? 1 : range === 'next' ? 1 : range === 'next4' ? 4 : 8;
    const firstWeekMonday = range === 'this' ? selectedWeekMonday : addDays(selectedWeekMonday, 7);
    const slots: AvailabilitySlot[] = [];
    const targetDateKeys = new Set<string>();
    const existingConfirmed = draftAvailability.filter((s) => s.isConfirmedClass);

    Array.from({ length: weekCount * 7 }, (_, i) => addDays(firstWeekMonday, i)).forEach(day => {
      const gridDay = jsToGridDay(getDay(day));
      const hours = weeklyTemplate[gridDay];
      if (!hours || hours.size === 0) return;

      const key = format(day, 'yyyy-MM-dd');
      targetDateKeys.add(key);
      const confirmedHours = new Set<number>();
      for (const s of existingConfirmed) {
        if (s.date !== key) continue;
        for (let h = s.startHour; h < s.endHour; h++) confirmedHours.add(h);
      }

      const filteredHours = Array.from(hours).filter((h) => !confirmedHours.has(h)).sort((a, b) => a - b);
      if (filteredHours.length === 0) return;

      let blockStart = filteredHours[0];
      let blockEnd = filteredHours[0] + 1;
      for (let i = 1; i <= filteredHours.length; i++) {
        if (i < filteredHours.length && filteredHours[i] === blockEnd) {
          blockEnd = filteredHours[i] + 1;
        } else {
          slots.push({ date: key, startHour: blockStart, endHour: blockEnd });
          if (i < filteredHours.length) {
            blockStart = filteredHours[i];
            blockEnd = filteredHours[i] + 1;
          }
        }
      }
    });

    setDraftAvailability(prev => {
      const confirmed = prev.filter((s) => s.isConfirmedClass);
      const untouchedFree = prev.filter((s) => !s.isConfirmedClass && !targetDateKeys.has(s.date));
      return [...confirmed, ...untouchedFree, ...slots];
    });
    toast.success('Recurring pattern updated in draft. Press Save changes when you are ready.');
  };

  const toggleDraftFreeHour = (dateKey: string, hour: number) => {
    setDraftAvailability((prev) => {
      const current = slotsToHoursForDate(prev, dateKey);
      const next = new Set(current);
      if (next.has(hour)) next.delete(hour);
      else next.add(hour);
      const confirmedHours = new Set<number>();
      for (const s of prev) {
        if (!s.isConfirmedClass || s.date !== dateKey) continue;
        for (let h = s.startHour; h < s.endHour; h++) confirmedHours.add(h);
      }
      for (const h of confirmedHours) next.delete(h);
      const blocks = hoursToBlocks(next);
      const confirmed = prev.filter((s) => s.isConfirmedClass);
      const rest = prev.filter((s) => !s.isConfirmedClass && s.date !== dateKey);
      const nextSlots: AvailabilitySlot[] = blocks.map((b) => ({
        date: dateKey,
        startHour: b.startHour,
        endHour: b.endHour,
      }));
      return [...confirmed, ...rest, ...nextSlots];
    });
  };

  const clearDraftAvailability = () => {
    setDraftAvailability((prev) =>
      prev.filter((s) => s.isConfirmedClass || s.date < todayKey),
    );
    toast.success('Future draft availability cleared');
  };

  const saveChanges = () => {
    const freeSlots = draftAvailability.filter((s) => !s.isConfirmedClass);
    setAvailabilityBatch(freeSlots);
    toast.success('Schedule changes saved');
  };

  const freeSlotCount = draftAvailability.filter((s) => !s.isConfirmedClass).length;
  const canProceedOnboarding = freeSlotCount > 0;

  const navigateAfterSchedule = () => {
    if (hasUnsavedChanges) {
      toast.error('Save changes first so your latest schedule is stored.');
      return;
    }
    if (!canProceedOnboarding) {
      toast.error('Add at least one free hour so we can match you with classes.');
      return;
    }
    if (returnTo && returnTo.startsWith('/')) {
      toast.success("You're set — taking you back…", { duration: 2000 });
      setTimeout(() => router.push(returnTo), 400);
      return;
    }
    if (fromSignup) {
      toast.success("Schedule saved — let's find your song.", { duration: 2000 });
      setTimeout(() => router.push('/browse'), 400);
    }
  };

  const totalSlots = freeSlotCount;
  const totalConfirmed = draftAvailability.filter(s => s.isConfirmedClass).length;
  const daysWithSlots = new Set(draftAvailability.filter(s => !s.isConfirmedClass).map(s => s.date)).size;
  return (
    <div
      className={cn(
        'min-h-screen md:pb-10',
        onboardingExit ? 'pb-48 md:pb-40' : 'pb-28',
      )}
    >
      <div className="gradient-purple-subtle">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="content-max pt-5 pb-3 md:pt-10 md:pb-8"
        >
          <h1 className="text-xl md:text-3xl font-black mb-1 text-foreground tracking-tight flex items-center gap-2">
            My Schedule <CalendarDays className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
          </h1>
          <p className="text-xs md:text-base text-muted-foreground leading-relaxed max-w-3xl">
            {fromSignup ? (
              <>
                <span className="font-bold text-foreground">Almost there — </span>
                mark at least one free hour so we can match you into song classes. Edit any week directly, then
                save when you are done.
              </>
            ) : (
              <>
                Paint when you&apos;re <span className="font-semibold text-foreground">free for rehearsals</span> (not busy
                elsewhere). Each class you&apos;re in compares everyone&apos;s grid to show common slots —
                so honest blocks here make that view trustworthy. Changes stay in draft until you press{" "}
                <span className="font-semibold text-foreground">Save changes</span>. Final studio room &amp; time still come from
                Korero admin.
              </>
            )}
          </p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-[11px] md:text-xs font-bold text-foreground min-h-[32px] md:min-h-[36px]">
              <Clock className="w-3 h-3 text-primary" />
              {totalSlots} free slot{totalSlots !== 1 ? 's' : ''} across {daysWithSlots} day{daysWithSlots !== 1 ? 's' : ''}
            </div>
            {totalConfirmed > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-[11px] md:text-xs font-bold text-foreground min-h-[32px] md:min-h-[36px]">
                <Music className="w-3 h-3 text-primary" />
                {totalConfirmed} class{totalConfirmed !== 1 ? 'es' : ''} (studio)
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="px-5 pt-4 content-max space-y-6">
        <AnimatePresence>
          {showTutorial && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="card-premium p-4 border-primary/20 relative">
                <button
                  onClick={() => setShowTutorial(false)}
                  className="absolute top-3 right-3 p-1 rounded-lg hover:bg-muted btn-press"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl gradient-purple flex items-center justify-center flex-shrink-0">
                    <Info className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="pr-6">
                    <p className="text-xs font-black text-foreground mb-1.5">How to use this page</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Drag across the grid to add or remove free hours. Use the date picker to jump to any week.
                      Press{' '}
                      <span className="font-bold text-foreground">Save changes</span> to sync everything to your schedule.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ScheduleTimetable
          weeklyTemplate={weeklyTemplate}
          onTemplateChange={setWeeklyTemplate}
          onApplyRecurring={applyRecurring}
          onClearAllAvailability={clearDraftAvailability}
          availability={draftAvailability}
          toggleFreeHour={toggleDraftFreeHour}
          today={today}
          groups={groups}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 card-premium p-4">
          <p className="text-xs text-muted-foreground">
            {hasUnsavedChanges
              ? 'Draft changes are ready. Press Save changes to update your schedule.'
              : 'All changes are saved.'}
          </p>
          {hasUnsavedChanges && (
            <Button
              type="button"
              onClick={saveChanges}
              className="rounded-2xl gradient-purple text-primary-foreground font-bold btn-press h-11 px-5"
            >
              <Save className="w-4 h-4 mr-1.5" />
              Save changes
            </Button>
          )}
        </div>
      </div>

      {onboardingExit && (
        <div className="fixed left-0 right-0 z-[45] border-t border-border bg-background/95 backdrop-blur-md shadow-[0_-8px_30px_rgba(0,0,0,0.08)] bottom-20 md:bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="content-max px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground">
                {returnTo ? 'Finish your availability' : 'Finish onboarding'}
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                {canProceedOnboarding
                  ? returnTo
                    ? 'Continue to return to what you were doing.'
                    : 'Continue to browse and join song classes.'
                  : 'Paint or apply at least one free hour (not studio class blocks) before continuing.'}
              </p>
            </div>
            <Button
              type="button"
              disabled={!canProceedOnboarding || hasUnsavedChanges}
              onClick={navigateAfterSchedule}
              className="rounded-2xl font-black gradient-purple text-primary-foreground btn-press h-12 px-8 shrink-0 w-full sm:w-auto disabled:opacity-50"
            >
              {returnTo ? 'Continue' : 'Continue to song classes'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
