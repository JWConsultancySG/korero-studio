'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import DateTimeOverlapView from '@/components/groups/DateTimeOverlapView';
import { Plus, Users, Music, Search, Sparkles, TrendingUp, Zap, Lock, CircleDot, ArrowRight } from 'lucide-react';

// iTunes Search has no CORS for browsers and can redirect to musics:// — use same-origin API route.
const fetchArtwork = async (songTitle: string, artist: string): Promise<string | null> => {
  try {
    const q = `${songTitle} ${artist}`.trim();
    const res = await fetch(`/api/itunes/search?q=${encodeURIComponent(q)}&limit=1`);
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: Array<{ artworkUrl100?: string }> };
    const raw = data.results?.[0]?.artworkUrl100;
    if (typeof raw !== "string") return null;
    return raw.replace("100x100", "200x200");
  } catch {
    return null;
  }
};

export default function GroupsPage() {
  const { groups, student, joinGroup, requestInstructorForGroup, chooseStudioForGroup, studios } = useApp();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [artworkMap, setArtworkMap] = useState<Record<string, string>>({});
  const artworkAttemptedRef = useRef<Set<string>>(new Set());
  const [joinTarget, setJoinTarget] = useState<(typeof groups)[number] | null>(null);
  const [selectedJoinSlot, setSelectedJoinSlot] = useState<string | null>(null);
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  // Fetch artwork for groups without images (sequential + small delay to avoid iTunes rate limits)
  useEffect(() => {
    let cancelled = false;
    const pending = groups.filter(
      g => !g.imageUrl && !artworkAttemptedRef.current.has(g.id),
    );
    if (pending.length === 0) return;

    (async () => {
      for (const group of pending) {
        if (cancelled) return;
        artworkAttemptedRef.current.add(group.id);
        const url = await fetchArtwork(group.songTitle, group.artist);
        if (cancelled) return;
        if (url) {
          setArtworkMap(prev => ({ ...prev, [group.id]: url }));
        }
        await new Promise(r => setTimeout(r, 250));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [groups]);

  const isInstructor = student?.appRole === 'instructor';

  const handleJoin = async (groupId: string) => {
    if (!student) { router.push('/register'); return; }
    const group = groups.find((g) => g.id === groupId);
    const alreadyJoined = Boolean(group?.members?.includes(student.id));
    if (alreadyJoined) {
      router.push(`/browse/${groupId}`);
      return;
    }
    if (isInstructor) {
      if (!group) return;
      setSelectedStudioId(group.studioSelection?.studioId ?? studios[0]?.id ?? null);
      setJoinTarget(group);
      return;
    }
    if (!group) return;
    const slotOptions = group.slotLabels?.length ? group.slotLabels : ['Member'];
    const enrollments = group.enrollments ?? [];
    const firstOpen = slotOptions.find((slot) => !enrollments.some((e) => e.slotLabel === slot));
    setSelectedJoinSlot(firstOpen ?? slotOptions[0] ?? null);
    setJoinTarget(group);
  };

  const handleConfirmJoin = async () => {
    if (!joinTarget || !student || joining) return;
    const modalInstructorAssignment = joinTarget.instructorAssignment;
    const modalIsMyInstructorAssignment = Boolean(
      isInstructor && student && modalInstructorAssignment?.instructorId === student.id,
    );
    setJoining(true);
    try {
      if (isInstructor) {
        if (modalIsMyInstructorAssignment) {
          setJoinTarget(null);
          router.push(`/browse/${joinTarget.id}`);
          return;
        }
        if (selectedStudioId) {
          await chooseStudioForGroup(joinTarget.id, selectedStudioId);
        }
        await requestInstructorForGroup(joinTarget.id);
      } else {
        await joinGroup(joinTarget.id, selectedJoinSlot ?? 'Member');
      }
      setJoinTarget(null);
      router.push(`/browse/${joinTarget.id}`);
    } finally {
      setJoining(false);
    }
  };

  const joinableGroups = groups.filter((g) => {
    if (g.awaitingSongValidation) return false;
    if (isInstructor) return g.status === 'forming';
    return g.status === 'forming' && g.interestCount < g.maxMembers;
  });
  const fullGroups = groups.filter((g) => {
    if (isInstructor) return g.status === 'confirmed';
    return g.status === 'confirmed' || g.interestCount >= g.maxMembers;
  });

  const filteredJoinable = search
    ? joinableGroups.filter(g => g.songTitle.toLowerCase().includes(search.toLowerCase()) || g.artist.toLowerCase().includes(search.toLowerCase()))
    : joinableGroups;

  const filteredFull = search
    ? fullGroups.filter(g => g.songTitle.toLowerCase().includes(search.toLowerCase()) || g.artist.toLowerCase().includes(search.toLowerCase()))
    : fullGroups;

  const getBadge = (group: typeof groups[0]) => {
    const fillPercent = (group.interestCount / group.maxMembers) * 100;
    const spotsLeft = group.maxMembers - group.interestCount;

    if (fillPercent >= 80) return { text: `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left!`, icon: Zap, className: 'bg-primary/15 text-primary font-black animate-pulse' };
    if (fillPercent >= 50) return { text: 'Filling fast', icon: TrendingUp, className: 'bg-accent text-accent-foreground' };
    return { text: 'Open', icon: CircleDot, className: 'bg-muted text-muted-foreground' };
  };

  const getArtwork = (group: typeof groups[0]) => group.imageUrl || artworkMap[group.id] || null;

  const openRequestSong = () => {
    if (!student) {
      router.push('/register');
      return;
    }
    router.push('/browse/new');
  };

  const hasAnyGroups = joinableGroups.length + fullGroups.length > 0;
  const noListingsMatch =
    filteredJoinable.length === 0 && filteredFull.length === 0;
  const searchActive = search.trim().length > 0;
  const searchNoMatchesWithOtherGroups =
    searchActive && noListingsMatch && hasAnyGroups;
  const searchNoMatchesEmptyStudio =
    searchActive && noListingsMatch && !hasAnyGroups;

  return (
    <div className="min-h-screen pb-28 md:pb-10">
      {/* Header */}
      <div className="gradient-purple-subtle px-6 pt-7 pb-6 md:pt-10 md:pb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="content-max">
          <h1 className="text-2xl md:text-3xl font-black mb-1 text-foreground tracking-tight flex items-center gap-2">
            Find Your Song <Music className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl">
            Claim your spot before it&apos;s gone — or start a new group if your song isn&apos;t listed yet.
          </p>

          <div className="flex items-center gap-2.5 mt-5 flex-wrap">
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card border border-border text-xs font-bold text-foreground min-h-[36px]">
              <TrendingUp className="w-3 h-3 text-primary" />
              {joinableGroups.length} open
            </div>
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card border border-border text-xs font-bold text-foreground min-h-[36px]">
              <Zap className="w-3 h-3 text-primary" />
              {joinableGroups.filter(g => (g.interestCount / g.maxMembers) >= 0.8).length} almost full
            </div>
          </div>

          <div className="relative mt-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search songs or artists..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-11 h-12 rounded-2xl bg-card border-border text-sm"
            />
          </div>
          <div className="mt-5 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] to-accent/40 p-4 md:p-5 flex flex-col tablet:flex-row tablet:items-center tablet:justify-between gap-4">
            <div className="flex gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl gradient-purple flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-black text-sm text-foreground">Looking for a different song?</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  If it&apos;s not in the list below, tap Request a Song to add it and start a new group.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={openRequestSong}
              className="shrink-0 w-full tablet:w-auto h-11 rounded-2xl font-black text-sm gradient-purple text-primary-foreground btn-press px-6"
            >
              <Music className="w-4 h-4 mr-2" />
              Request a Song
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Groups Forming Now */}
      <div className="px-5 pt-5 content-max">
        {filteredJoinable.length > 0 && (
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Groups Forming Now
            </p>
            <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3 md:gap-4">
              <AnimatePresence>
                {filteredJoinable
                  .sort((a, b) => (b.interestCount / b.maxMembers) - (a.interestCount / a.maxMembers))
                  .map((group, i) => {
                    const fillPercent = (group.interestCount / group.maxMembers) * 100;
                    const isAlmostFull = fillPercent >= 80;
                    const isHot = fillPercent >= 50;
                    const badge = getBadge(group);
                    const BadgeIcon = badge.icon;
                    const spotsLeft = group.maxMembers - group.interestCount;
                    const artwork = getArtwork(group);
                    const alreadyJoined = Boolean(student && group.members.includes(student.id));
                    const instructorAssignment = group.instructorAssignment;
                    const myInstructorAssignment = Boolean(student && instructorAssignment?.instructorId === student.id);
                    const instructorTakenByOther =
                      Boolean(instructorAssignment?.status === 'confirmed' && instructorAssignment.instructorId !== student?.id);

                    return (
                      <motion.div
                        key={group.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: i * 0.04 }}
                        className={`card-premium p-4 relative overflow-hidden group ${
                          isAlmostFull ? 'border-primary/40 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.25)]' : ''
                        }`}
                      >
                        {isAlmostFull && (
                          <div className="absolute top-0 left-0 right-0 h-1 gradient-purple" />
                        )}

                        <div className="flex items-start gap-3.5">
                          {/* Artwork */}
                          <div className="relative flex-shrink-0">
                            {artwork ? (
                              <div className={`relative ${isAlmostFull ? 'pulse-ring' : ''}`}>
                                <img
                                  src={artwork}
                                  alt={group.songTitle}
                                  className="w-16 h-16 rounded-2xl object-cover"
                                />
                                {isAlmostFull && (
                                  <div className="absolute inset-0 rounded-2xl ring-2 ring-primary/40 animate-pulse" />
                                )}
                              </div>
                            ) : (
                              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center gradient-purple ${isAlmostFull ? 'pulse-ring glow-purple' : ''}`}>
                                <Music className="w-6 h-6 text-primary-foreground" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-black text-base text-foreground truncate leading-tight">{group.songTitle}</p>
                              {isAlmostFull && <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0 animate-pulse" />}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2.5">{group.artist}</p>

                            <div className="mb-2">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-[11px] font-bold text-muted-foreground">
                                    {group.interestCount} / {group.maxMembers}
                                  </span>
                                </div>
                                <Badge className={`text-[10px] px-2 py-0 h-5 font-bold border-0 ${badge.className}`}>
                                  <BadgeIcon className="w-2.5 h-2.5 mr-1" />
                                  {badge.text}
                                </Badge>
                              </div>
                              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${fillPercent}%` }}
                                  transition={{ delay: 0.3 + i * 0.05, duration: 0.6, ease: 'easeOut' }}
                                  className={`h-full rounded-full ${
                                    isAlmostFull ? 'gradient-purple glow-purple' : isHot ? 'gradient-purple' : 'bg-primary/40'
                                  }`}
                                />
                              </div>
                            </div>

                            {isAlmostFull && (
                              <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0.7, 1, 0.7] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="text-[11px] font-black text-primary flex items-center gap-1"
                              >
                                🔥 Last {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} — grab it now!
                              </motion.p>
                            )}
                          </div>
                        </div>

                        <motion.div className="mt-3 space-y-2">
                          <Link
                            href={`/browse/${group.id}`}
                            className="block text-center text-xs font-bold text-primary py-1.5 hover:underline"
                          >
                            View group status & class availability →
                          </Link>
                          {alreadyJoined ? (
                            <Button
                              disabled
                              className="w-full rounded-2xl font-black text-sm h-11 bg-muted text-muted-foreground cursor-not-allowed"
                            >
                              Joined
                            </Button>
                          ) : isInstructor ? (
                            <Button
                              onClick={() => handleJoin(group.id)}
                              disabled={instructorTakenByOther}
                              className={`w-full rounded-2xl font-black text-sm btn-press h-11 relative overflow-hidden gradient-purple text-primary-foreground ${
                                isAlmostFull ? 'shadow-[0_4px_15px_-3px_hsl(var(--primary)/0.4)]' : ''
                              }`}
                            >
                              <span className="relative z-10 flex items-center gap-2">
                                {instructorTakenByOther
                                  ? 'Instructor slot filled'
                                  : myInstructorAssignment
                                  ? 'View instructor setup'
                                  : 'Join as Instructor'}
                              </span>
                              {!instructorTakenByOther && <div className="absolute inset-0 shimmer" />}
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleJoin(group.id)}
                              className={`w-full rounded-2xl font-black text-sm btn-press h-11 relative overflow-hidden gradient-purple text-primary-foreground ${
                                isAlmostFull ? 'shadow-[0_4px_15px_-3px_hsl(var(--primary)/0.4)]' : ''
                              }`}
                            >
                              <span className="relative z-10 flex items-center gap-2">
                                {isAlmostFull ? (
                                  <>Grab Last Spot <Zap className="w-4 h-4" /></>
                                ) : (
                                  <>Join This Group <Sparkles className="w-4 h-4" /></>
                                )}
                              </span>
                              {isAlmostFull && <div className="absolute inset-0 shimmer" />}
                            </Button>
                          )}
                        </motion.div>

                        {/* Next class note for full groups */}
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {noListingsMatch && (
          <div className="text-center py-12 md:py-16 max-w-md mx-auto">
            {searchNoMatchesWithOtherGroups ? (
              <>
                <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-black text-foreground text-base mb-1">No groups match &ldquo;{search.trim()}&rdquo;</p>
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                  That song might not have a group yet. Request it and be the first to start one.
                </p>
                <Button
                  type="button"
                  onClick={openRequestSong}
                  className="rounded-2xl font-black h-12 px-8 gradient-purple text-primary-foreground btn-press"
                >
                  <Music className="w-4 h-4 mr-2" />
                  Request a Song
                </Button>
              </>
            ) : searchNoMatchesEmptyStudio ? (
              <>
                <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-black text-foreground text-base mb-1">No groups match &ldquo;{search.trim()}&rdquo;</p>
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                  Nothing here yet — use Request a Song to add this track and start a new group.
                </p>
                <Button
                  type="button"
                  onClick={openRequestSong}
                  className="rounded-2xl font-black h-12 px-8 gradient-purple text-primary-foreground btn-press"
                >
                  <Music className="w-4 h-4 mr-2" />
                  Request a Song
                </Button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-3xl gradient-purple/15 flex items-center justify-center mx-auto mb-4">
                  <Music className="w-8 h-8 text-primary" />
                </div>
                <p className="font-black text-foreground text-base mb-1">No song groups yet</p>
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                  Be the first — request a song to create a group others can join.
                </p>
                <Button
                  type="button"
                  onClick={openRequestSong}
                  className="rounded-2xl font-black h-12 px-8 gradient-purple text-primary-foreground btn-press"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Request a Song
                </Button>
              </>
            )}
          </div>
        )}

        {/* Full / Confirmed Groups */}
        {filteredFull.length > 0 && (
          <div className="mt-10">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground mb-4">Full — Join for Next Class</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 md:gap-4">
              {filteredFull.map((group, i) => {
                const artwork = getArtwork(group);
                const alreadyJoined = Boolean(student && group.members.includes(student.id));
                const instructorAssignment = group.instructorAssignment;
                const myInstructorAssignment = Boolean(student && instructorAssignment?.instructorId === student.id);
                const instructorTakenByOther =
                  Boolean(instructorAssignment?.status === 'confirmed' && instructorAssignment.instructorId !== student?.id);
                return (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="card-premium p-4"
                  >
                    <div className="flex items-center gap-3.5">
                      {artwork ? (
                        <img src={artwork} alt={group.songTitle} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 opacity-60" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                          <Music className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{group.songTitle}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{group.artist}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="text-[10px] px-2.5 py-0.5 h-5 font-bold bg-muted text-muted-foreground border-0 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> FULL
                        </Badge>
                      </div>
                    </div>
                    {alreadyJoined ? (
                      <Button
                        disabled
                        variant="outline"
                        className="w-full mt-3 rounded-2xl font-bold text-xs h-9 border-border text-muted-foreground cursor-not-allowed"
                      >
                        Joined
                      </Button>
                    ) : isInstructor ? (
                      <Button
                        onClick={() => handleJoin(group.id)}
                        disabled={instructorTakenByOther}
                        variant="outline"
                        className="w-full mt-3 rounded-2xl font-bold text-xs h-9 border-primary/20 text-primary hover:bg-primary/5"
                      >
                        {instructorTakenByOther
                          ? "Instructor slot filled"
                          : myInstructorAssignment
                          ? "View instructor setup"
                          : "Join as Instructor"}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleJoin(group.id)}
                        variant="outline"
                        className="w-full mt-3 rounded-2xl font-bold text-xs h-9 border-primary/20 text-primary hover:bg-primary/5"
                      >
                        Join Waitlist for Next Class <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        onClick={openRequestSong}
        aria-label="Request a Song — create a new song group"
        title="Request a Song"
        className="fixed bottom-24 right-5 md:bottom-8 md:right-8 w-14 h-14 rounded-2xl gradient-purple-deep glow-purple-intense flex items-center justify-center shadow-2xl z-40"
      >
        <Plus className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      {joinTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center">
          <div className="w-full md:max-w-3xl bg-background border border-border rounded-t-3xl md:rounded-3xl p-5 md:p-6 max-h-[88vh] overflow-y-auto">
            {(() => {
              const modalInstructorAssignment = joinTarget.instructorAssignment;
              const modalIsMyInstructorAssignment = Boolean(
                isInstructor && student && modalInstructorAssignment?.instructorId === student.id,
              );
              const modalInstructorTakenByOther = Boolean(
                isInstructor &&
                modalInstructorAssignment?.status === 'confirmed' &&
                modalInstructorAssignment.instructorId !== student?.id,
              );
              const modalCanSubmitInstructorJoin = !modalIsMyInstructorAssignment && !modalInstructorTakenByOther;

              return (
                <>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg md:text-xl font-black text-foreground">
                  {isInstructor ? "Instructor setup" : "Confirm your join"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isInstructor
                    ? "Review class overlap and confirm your studio before requesting the instructor slot."
                    : "View overlap first, then pick your position before joining this class."}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl"
                onClick={() => setJoinTarget(null)}
                disabled={joining}
              >
                Close
              </Button>
            </div>

            {isInstructor && modalIsMyInstructorAssignment && (
              <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/10 p-3">
                <p className="text-sm font-bold text-foreground">
                  You already requested this instructor slot ({modalInstructorAssignment?.status ?? "pending"}).
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Next step: admin confirms assignment in Admin panel. You can still review schedule details now.
                </p>
              </div>
            )}

            {isInstructor && modalInstructorTakenByOther && (
              <div className="mb-4 rounded-2xl border border-border bg-muted/40 p-3">
                <p className="text-sm font-bold text-foreground">Instructor slot is already confirmed for this class.</p>
              </div>
            )}

            <div className="rounded-2xl border border-border p-4 mb-5">
              <p className="text-sm font-black text-foreground">{joinTarget.songTitle}</p>
              <p className="text-xs text-muted-foreground">{joinTarget.artist}</p>
            </div>

            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground mb-2">
                Class availability
              </p>
              <DateTimeOverlapView enrollments={joinTarget.enrollments ?? []} />
            </div>

            {isInstructor ? (
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground mb-2">
                  Confirm studio
                </p>
                {studios.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No studios configured yet. Ask admin to add one.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {studios.map((studio) => {
                      const selected = selectedStudioId === studio.id;
                      return (
                        <button
                          key={studio.id}
                          type="button"
                          onClick={() => setSelectedStudioId(studio.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                            selected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-card text-foreground border-border hover:border-primary/40'
                          }`}
                        >
                          {studio.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground mb-2">
                  Choose your position
                </p>
                <div className="flex flex-wrap gap-2">
                  {(joinTarget.slotLabels?.length ? joinTarget.slotLabels : ['Member']).map((slot) => {
                    const taken = (joinTarget.enrollments ?? []).some((e) => e.slotLabel === slot);
                    const isSelected = selectedJoinSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={taken}
                        onClick={() => setSelectedJoinSlot(slot)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                          taken
                            ? 'bg-muted text-muted-foreground border-border opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card text-foreground border-border hover:border-primary/40'
                        }`}
                      >
                        {slot} {taken ? '· taken' : '· open'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-2xl"
                onClick={() => setJoinTarget(null)}
                disabled={joining}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-2xl gradient-purple text-primary-foreground font-black"
                onClick={handleConfirmJoin}
                disabled={
                  joining ||
                  (!isInstructor && !selectedJoinSlot) ||
                  (isInstructor && !modalCanSubmitInstructorJoin) ||
                  (isInstructor && studios.length > 0 && !selectedStudioId)
                }
              >
                {joining
                  ? 'Joining...'
                  : isInstructor
                  ? modalIsMyInstructorAssignment
                    ? 'Already requested'
                    : modalInstructorTakenByOther
                    ? 'Instructor slot filled'
                    : 'Confirm instructor join'
                  : 'Join class'}
              </Button>
            </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
