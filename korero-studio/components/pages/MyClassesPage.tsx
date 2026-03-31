'use client';

import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { Music, ArrowRight, BookOpen, Hourglass, CalendarCheck, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SongGroup } from '@/types';
import FormationCard from '@/components/classes/FormationCard';
import ScheduledClassCard from '@/components/classes/ScheduledClassCard';

function isFormed(g: SongGroup): boolean {
  return g.status === 'confirmed' || g.interestCount >= g.maxMembers;
}

function userIsInGroup(g: SongGroup, studentId: string): boolean {
  if ((g.members ?? []).includes(studentId)) return true;
  return (g.enrollments ?? []).some((e) => e.studentId === studentId);
}

export default function MyClassesPage() {
  const { bookings, groups, sessions, student, authSessionReady, dataLoading, authUser, refreshApp } = useApp();
  const router = useRouter();

  if (!authSessionReady || dataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 pb-28">
        <Loader2 className="w-10 h-10 text-primary animate-spin" aria-hidden />
        <p className="text-sm text-muted-foreground">Loading your classes…</p>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pb-28">
        <Button onClick={() => router.push('/login')} className="rounded-2xl font-bold gradient-purple text-primary-foreground">
          Sign in
        </Button>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 pb-28">
        <p className="text-sm text-muted-foreground text-center max-w-sm">We couldn&apos;t load your profile. Try again.</p>
        <Button
          variant="outline"
          className="rounded-2xl"
          onClick={() => {
            void refreshApp();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  const paidBookings = bookings.filter((b) => b.paymentStatus === 'paid' && b.studentId === student.id);

  const joined = groups.filter((g) => userIsInGroup(g, student.id) && g.creatorId !== student.id);
  const joinedPending = joined.filter((g) => !isFormed(g));
  const joinedFormed = joined.filter((g) => isFormed(g));

  const created = groups.filter((g) => g.creatorId === student.id);
  const createdPending = created.filter((g) => !isFormed(g));
  const createdFormed = created.filter((g) => isFormed(g));

  const bookingForGroup = (groupId: string) => paidBookings.find((b) => b.groupId === groupId);

  const hasAny =
    joinedPending.length > 0 ||
    joinedFormed.length > 0 ||
    createdPending.length > 0 ||
    createdFormed.length > 0;

  return (
    <div className="min-h-screen pb-28 md:pb-10">
      <div className="gradient-purple-subtle px-6 pt-7 pb-6 md:pt-10 md:pb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="content-max">
          <h1 className="text-2xl md:text-3xl font-black mb-1 text-foreground tracking-tight flex items-center gap-2">
            My Classes <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl">
            Classes you&apos;re filling, scheduled studio sessions, and song classes you lead.
          </p>
        </motion.div>
      </div>

      <div className="px-5 pt-5 content-max space-y-12 md:space-y-14">
        {!hasAny && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 card-premium border-dashed"
          >
            <Music className="w-12 h-12 text-primary mx-auto mb-4 opacity-80" />
            <p className="font-black text-lg text-foreground mb-2">No classes yet</p>
            <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
              Join a song class or create one — listings still forming show progress here; scheduled classes show studio
              time & room once assigned.
            </p>
            <Button
              onClick={() => router.push('/browse')}
              className="rounded-2xl font-bold gradient-purple text-primary-foreground btn-press h-12 px-8"
            >
              Browse classes <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}

        {joinedPending.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Hourglass className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-lg font-black text-foreground">Waiting to form (joined)</h2>
                <p className="text-xs text-muted-foreground">
                  These classes need more members or aligned availability.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
              {joinedPending.map((g) => (
                <FormationCard key={g.id} group={g} studentId={student.id} variant="joined" />
              ))}
            </div>
          </section>
        )}

        {joinedFormed.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-lg font-black text-foreground">Scheduled classes (joined)</h2>
                <p className="text-xs text-muted-foreground">
                  Time and room are set by the studio or admin — students do not pick the room.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {joinedFormed.map((g) => (
                <ScheduledClassCard
                  key={g.id}
                  group={g}
                  sessions={sessions}
                  booking={bookingForGroup(g.id)}
                />
              ))}
            </div>
          </section>
        )}

        {(createdPending.length > 0 || createdFormed.length > 0) && (
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-lg font-black text-foreground">Song classes you created</h2>
                <p className="text-xs text-muted-foreground">
                  While forming, keep your availability updated; after scheduling, your class slot and room appear below.
                </p>
              </div>
            </div>

            {createdPending.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">Still forming</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {createdPending.map((g) => (
                    <FormationCard key={g.id} group={g} studentId={student.id} variant="created" />
                  ))}
                </div>
              </div>
            )}

            {createdFormed.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">Scheduled</h3>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {createdFormed.map((g) => (
                    <ScheduledClassCard
                      key={g.id}
                      group={g}
                      sessions={sessions}
                      booking={bookingForGroup(g.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
