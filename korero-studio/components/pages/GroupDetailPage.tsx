"use client";

import { useMemo, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/context/AppContext";
import DateTimeOverlapView from "@/components/groups/DateTimeOverlapView";
import { CLASS_LABELS } from "@/lib/credits";
import { ArrowLeft, Music, Users, Sparkles, CalendarDays, AlertCircle, CheckCircle2, MapPin } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = typeof params.groupId === "string" ? params.groupId : "";
  const router = useRouter();
  const {
    groups,
    student,
    studios,
    requestInstructorForGroup,
    submitGroupFinalAcceptance,
    finalizeGroupLesson,
    recomputeGroupMatching,
  } = useApp();
  const [artwork, setArtwork] = useState<string | null>(null);

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);

  useEffect(() => {
    if (!group?.imageUrl && group) {
      fetchArtwork(group.songTitle, group.artist).then(setArtwork);
    } else if (group?.imageUrl) {
      setArtwork(group.imageUrl);
    }
  }, [group]);

  useEffect(() => {
    if (!groupId) return;
    if (!groups.some((g) => g.id === groupId)) {
      router.replace("/browse");
    }
  }, [groupId, groups, router]);

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <p className="text-muted-foreground text-sm text-center">This group doesn&apos;t exist or was removed.</p>
      </div>
    );
  }

  const fill = group.maxMembers > 0 ? (group.interestCount / group.maxMembers) * 100 : 0;
  const enrollments = group.enrollments ?? [];
  const isCreator = student?.id === group.creatorId;
  const selectedStudio = studios.find((s) => s.id === group.studioSelection?.studioId);
  const matchedSlots = group.finalizedSlotBlocks ?? [];

  return (
    <div className="min-h-screen pb-28 md:pb-10 bg-background">
      <div className="gradient-purple-subtle px-5 pt-4 pb-8 md:pt-8 md:pb-10 lg:pb-12">
        <div className="content-max">
          <button
            type="button"
            onClick={() => router.push("/browse")}
            className="flex items-center gap-2 text-muted-foreground text-sm md:text-base font-bold btn-press mb-6 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to browse
          </button>

          <div className="flex flex-col md:flex-row gap-6 md:gap-10 lg:gap-12 items-start">
            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-3xl overflow-hidden bg-muted shrink-0 shadow-lg ring-2 ring-primary/10 mx-auto md:mx-0">
              {artwork ? (
                <img src={artwork} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center gradient-purple">
                  <Music className="w-10 h-10 text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-center md:text-left w-full">
              <div className="flex flex-wrap items-center gap-2 mb-2 justify-center md:justify-start">
                <Badge variant="secondary" className="font-black text-[10px] uppercase tracking-wide">
                  {group.status === "forming" ? "Forming" : group.status}
                </Badge>
                {group.classTypeAtCreation && (
                  <Badge className="gradient-purple text-primary-foreground font-bold text-[10px]">
                    {CLASS_LABELS[group.classTypeAtCreation]}
                  </Badge>
                )}
                {isCreator && (
                  <Badge variant="outline" className="text-[10px] font-black border-primary/30">
                    You started this
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-foreground leading-tight">{group.songTitle}</h1>
              <p className="text-muted-foreground font-bold mt-1 md:text-lg">{group.artist}</p>

              <div className="mt-6 space-y-2 max-w-xl md:max-w-none mx-auto md:mx-0">
                <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Formation
                  </span>
                  <span className="text-foreground tabular-nums">
                    {group.interestCount} / {group.maxMembers} members
                  </span>
                </div>
                <Progress value={fill} className="h-3 bg-muted" />
                <p className="text-[11px] text-muted-foreground">
                  {Math.round(fill)}% full — invite friends or share the group link when you have one.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6 md:pt-8 lg:pt-10 content-max space-y-10 md:space-y-12">
        {group.awaitingSongValidation && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-foreground">Waiting for song validation</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Korero is setting up the official song profile (formation & roles). You&apos;ll be notified when this
                listing goes live for others to join.
              </p>
            </div>
          </div>
        )}
        <div className="grid gap-10 md:gap-12 lg:grid-cols-2 lg:gap-14 lg:items-start">
        {group.slotLabels && group.slotLabels.length > 0 && (
          <section className="min-w-0">
            <h2 className="text-xs md:text-sm font-black uppercase tracking-[0.15em] text-muted-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
              Member slots
            </h2>
            <div className="flex flex-wrap gap-2 md:gap-2.5">
              {group.slotLabels.map((slot) => {
                const taken = enrollments.some((e) => e.slotLabel === slot);
                const isMe = enrollments.some((e) => e.slotLabel === slot && e.studentId === student?.id);
                return (
                  <Badge
                    key={slot}
                    variant={taken ? "default" : "secondary"}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                      isMe ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                    }`}
                  >
                    {slot}
                    {isMe && " (you)"}
                    {!taken && " · open"}
                  </Badge>
                );
              })}
            </div>
          </section>
        )}

        <section
          className={cn(
            "min-w-0 lg:min-h-0",
            (!group.slotLabels || group.slotLabels.length === 0) && "lg:col-span-2",
          )}
        >
          <h2 className="text-lg md:text-xl font-black text-foreground mb-1 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
            Class availability
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-5 leading-relaxed max-w-prose">
            Date-time class availability only. Switch dates and view only slots where everyone in this group is free at the same
            time. Need to open more options? Update your availability in{" "}
            <Link href="/schedule" className="font-bold text-primary underline-offset-2 hover:underline">
              Schedule
            </Link>
            .
          </p>
          <DateTimeOverlapView enrollments={enrollments} />
          {matchedSlots.length > 0 && (
            <div className="mt-5 rounded-2xl border border-border p-4 bg-card/50">
              <p className="text-xs font-black uppercase tracking-wider text-primary mb-2">Matched 1-hour slots</p>
              <div className="flex flex-wrap gap-2">
                {matchedSlots.slice(0, 16).map((slot) => (
                  <Badge key={`${slot.date}-${slot.hour}`} variant="outline">
                    {slot.date} · {slot.hour}:00-{slot.hour + 1}:00
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </section>
        </div>

        <div className="rounded-2xl md:rounded-3xl border border-border/80 bg-muted/30 p-5 md:p-6 max-w-4xl lg:max-w-none mx-auto">
          <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed">
            <span className="font-black text-foreground">Studio time & room</span> are scheduled by the studio admin when your
            group is ready — students do not book the studio here. Use{" "}
            <Link href="/schedule" className="font-bold text-primary underline-offset-2 hover:underline">
              My Schedule
            </Link>{" "}
            so everyone can align class availability.
          </p>
        </div>
        <div className="rounded-2xl border border-border p-5 space-y-3">
          <p className="font-black text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Matching lifecycle
          </p>
          <p className="text-sm text-muted-foreground">
            State: <span className="font-bold text-foreground">{group.matchingState ?? "forming"}</span>
            {group.requiredMatchHours ? ` · Golden target: ${group.requiredMatchHours}h on distinct days` : ""}
          </p>
          {selectedStudio && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              Studio: <span className="font-bold text-foreground">{selectedStudio.name}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void requestInstructorForGroup(group.id)}
              className="rounded-xl border px-3 py-2 text-xs font-bold"
            >
              Instructor: request join
            </button>
            <button
              type="button"
              onClick={() => void recomputeGroupMatching(group.id)}
              className="rounded-xl border px-3 py-2 text-xs font-bold"
            >
              Recompute matching
            </button>
            <button
              type="button"
              onClick={() => void submitGroupFinalAcceptance(group.id)}
              className="rounded-xl border px-3 py-2 text-xs font-bold"
            >
              Accept final lesson
            </button>
            <button
              type="button"
              onClick={() => void finalizeGroupLesson(group.id)}
              className="rounded-xl border border-primary bg-primary text-primary-foreground px-3 py-2 text-xs font-bold"
            >
              Finalize & fix lesson
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
