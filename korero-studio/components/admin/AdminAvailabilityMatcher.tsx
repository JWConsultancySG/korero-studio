"use client";

import { useMemo, useState, useEffect, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Calendar,
  Check,
  ChevronRight,
  HelpCircle,
  Layers,
  Sparkles,
  Target,
  Users,
  XCircle,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { SongGroup } from "@/types";
import {
  countFullConsensusCells,
  formatOverlapHourLabel,
  maxOverlapCount,
  rankOverlapSlots,
  SCHEDULE_GRID_HOURS,
  splitMembersAtCell,
  expandSlotsToDateHourKeys,
} from "@/lib/schedule-overlap";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { AdminTutorialCallout } from "@/components/admin/AdminTutorialCallout";

function countFreeHourBlocks(e: { availabilitySlots: import("@/types").AvailabilitySlot[] }): number {
  return expandSlotsToDateHourKeys(e.availabilitySlots).size;
}

export default function AdminAvailabilityMatcher() {
  const { groups } = useApp();
  const [groupId, setGroupId] = useState<string>("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<{ dateKey: string; dateLabel: string; hour: number; count: number } | null>(null);

  const groupsWithMembers = useMemo(
    () => groups.filter((g) => (g.enrollments?.length ?? 0) > 0),
    [groups],
  );

  useEffect(() => {
    if (!groupId && groupsWithMembers.length > 0) {
      setGroupId(groupsWithMembers[0].id);
    }
  }, [groupId, groupsWithMembers]);

  const selected = useMemo(
    () => groups.find((g) => g.id === groupId) ?? null,
    [groups, groupId],
  );

  const enrollments = selected?.enrollments ?? [];
  const members = useMemo(
    () => enrollments.map((e) => ({ studentId: e.studentId, slots: e.availabilitySlots })),
    [enrollments],
  );

  const peak = useMemo(() => (members.length ? maxOverlapCount(members, SCHEDULE_GRID_HOURS) : 0), [members]);
  const consensusCells = useMemo(
    () => (members.length ? countFullConsensusCells(members, SCHEDULE_GRID_HOURS) : 0),
    [members],
  );
  const ranked = useMemo(
    () => (members.length ? rankOverlapSlots(members, SCHEDULE_GRID_HOURS, 30) : []),
    [members],
  );

  const membersWithSchedule = useMemo(
    () => enrollments.filter((e) => countFreeHourBlocks(e) > 0).length,
    [enrollments],
  );

  const handleCellClick = (d: { dateKey: string; dateLabel: string; hour: number; count: number }) => {
    setDetail(d);
    setDetailOpen(true);
  };

  const split = useMemo(() => {
    if (!detail || !enrollments.length) return { free: [] as typeof enrollments, notFree: [] as typeof enrollments };
    return splitMembersAtCell(enrollments, detail.dateKey, detail.hour);
  }, [detail, enrollments]);

  if (groups.length === 0) {
    return <EmptyNoGroups />;
  }

  if (groupsWithMembers.length === 0) {
    return <EmptyNoEnrollments />;
  }

  return (
    <div className="space-y-6">
      <IntroCard />

      <AdminTutorialCallout title="Using the matcher effectively">
        <p>
          Pick a class with enrolled members. <strong>Top slots</strong> ranks the best date-time windows;{" "}
          <strong>Per member</strong> explains who still needs to open hours in My Schedule.
        </p>
        <p>
          Tap a ranked slot to see <strong>who is free vs not</strong> for that date and hour — ideal before you
          propose times in chat or assign rooms.
        </p>
      </AdminTutorialCallout>

      <div className="rounded-2xl border border-border/80 bg-card/50 p-4 md:p-5 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <LabelRow icon={Target} label="Class" />
            <p className="text-xs text-muted-foreground max-w-xl">
              Compare all members&apos; date-time availability snapshots (next 30 days).
            </p>
          </div>
          <div className="w-full md:w-[min(100%,320px)]">
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger className="h-12 rounded-2xl border-2 font-bold">
                <SelectValue placeholder="Choose class" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {groupsWithMembers.map((g) => (
                  <SelectItem key={g.id} value={g.id} className="rounded-xl font-medium py-3">
                    <span className="font-black">{g.songTitle}</span>
                    <span className="text-muted-foreground"> · {g.artist}</span>
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      {g.enrollments?.length ?? 0} members
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selected && (
          <GroupMetaChips group={selected} enrollmentsCount={enrollments.length} membersWithSchedule={membersWithSchedule} />
        )}
      </div>

      {selected && enrollments.length > 0 && (
        <>
          <StatsRow
            memberCount={enrollments.length}
            membersWithSchedule={membersWithSchedule}
            peak={peak}
            consensusCells={consensusCells}
            maxMembers={selected.maxMembers}
          />

          <Tabs defaultValue="rankings" className="w-full space-y-4">
            <TabsList className="grid w-full grid-cols-2 h-12 rounded-2xl bg-muted p-1">
              <TabsTrigger
                value="rankings"
                className="rounded-xl text-xs font-black data-[state=active]:gradient-purple data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
              >
                Top slots
              </TabsTrigger>
              <TabsTrigger
                value="members"
                className="rounded-xl text-xs font-black data-[state=active]:gradient-purple data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
              >
                Per member
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rankings" className="mt-0 outline-none">
              <RankedSlotsList
                ranked={ranked}
                totalMembers={enrollments.length}
                peak={peak}
                onPickSlot={(dateKey, dateLabel, hour, count) => handleCellClick({ dateKey, dateLabel, hour, count })}
              />
            </TabsContent>

            <TabsContent value="members" className="mt-0 outline-none">
              <PerMemberAccordion enrollments={enrollments} peak={peak} totalMembers={enrollments.length} />
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md rounded-3xl border-2 p-0 gap-0 overflow-hidden sm:max-w-lg">
          <div className="gradient-purple-subtle px-5 pt-5 pb-3">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary shrink-0" />
                Slot detail
              </DialogTitle>
              {detail && (
                <DialogDescription className="text-sm text-muted-foreground">
                  {detail.dateLabel} · {formatOverlapHourLabel(detail.hour)}
                  <span className="text-foreground font-bold"> · {detail.count}</span> / {enrollments.length} free
                </DialogDescription>
              )}
            </DialogHeader>
          </div>
          <ScrollArea className="max-h-[min(60vh,420px)] px-5 py-4">
            <div className="space-y-4 pr-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" /> Free this hour ({split.free.length})
                </p>
                {split.free.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nobody marked this hour yet.</p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {split.free.map((e) => (
                      <li key={e.studentId}>
                        <Badge className="rounded-lg font-bold bg-emerald-600/20 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-600/30 border border-emerald-500/30">
                          {e.studentName}
                          <span className="opacity-70 font-normal ml-1">· {e.slotLabel}</span>
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5" /> Not free ({split.notFree.length})
                </p>
                {split.notFree.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Everyone is free — best possible class availability.</p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {split.notFree.map((e) => (
                      <li key={e.studentId}>
                        <Badge variant="outline" className="rounded-lg font-bold border-amber-500/40 text-foreground">
                          {e.studentName}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </ScrollArea>
          <div className="border-t border-border bg-muted/30 px-5 py-3 flex justify-end">
            <Button variant="outline" className="rounded-2xl font-bold" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LabelRow({ icon: Icon, label }: { icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 text-primary">
      <Icon className="h-4 w-4" />
      <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
    </div>
  );
}

function IntroCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-muted/40 p-5 md:p-6"
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
      <div className="relative flex flex-col gap-3 md:flex-row md:items-start md:gap-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl gradient-purple text-primary-foreground glow-purple">
          <Layers className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-lg md:text-xl font-black text-foreground tracking-tight">Availability matcher</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            See where <span className="font-bold text-foreground">the most members are available</span> at the same date +
            hour, then shortlist rehearsal or class times before you assign studio rooms. Data comes from each
            member&apos;s saved schedule (free hours only — studio blocks are excluded).
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary" className="rounded-lg font-bold gap-1">
              <Sparkles className="h-3 w-3" /> Admin tool
            </Badge>
            <Badge variant="outline" className="rounded-lg font-bold border-primary/30">
              Same grid as class detail page
            </Badge>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function GroupMetaChips({
  group,
  enrollmentsCount,
  membersWithSchedule,
}: {
  group: SongGroup;
  enrollmentsCount: number;
  membersWithSchedule: number;
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <Badge variant="secondary" className="rounded-full px-3 py-1 font-bold text-xs">
        {group.status === "confirmed" ? "Confirmed" : group.status === "forming" ? "Forming" : "Pending"}
      </Badge>
      <Badge variant="outline" className="rounded-full px-3 py-1 font-bold text-xs">
        Max {group.maxMembers} · {enrollmentsCount} enrolled
      </Badge>
      <Badge
        variant="outline"
        className={cn(
          "rounded-full px-3 py-1 font-bold text-xs",
          membersWithSchedule < enrollmentsCount && "border-amber-500/50 text-amber-900 dark:text-amber-100",
        )}
      >
        {membersWithSchedule}/{enrollmentsCount} shared schedule in app
      </Badge>
    </div>
  );
}

function StatsRow({
  memberCount,
  membersWithSchedule,
  peak,
  consensusCells,
  maxMembers,
}: {
  memberCount: number;
  membersWithSchedule: number;
  peak: number;
  consensusCells: number;
  maxMembers: number;
}) {
  const peakPct = memberCount > 0 && peak > 0 ? Math.round((peak / memberCount) * 100) : 0;
  const cards = [
    {
      label: "Members in matcher",
      value: String(memberCount),
      sub: `of ${maxMembers} max formation`,
      icon: Users,
      tone: "text-primary",
    },
    {
      label: "Schedule coverage",
      value: `${membersWithSchedule}/${memberCount}`,
      sub: "with free hours saved",
      icon: Calendar,
      tone: "text-emerald-700 dark:text-emerald-400",
    },
    {
      label: "Peak class availability",
      value: `${peak}`,
      sub: memberCount > 0 ? `${peakPct}% of roster at best hour` : "—",
      icon: BarChart3,
      tone: "text-primary",
    },
    {
      label: "Common slots",
      value: String(consensusCells),
      sub: memberCount > 0 ? `slots where all ${memberCount} align` : "—",
      icon: Target,
      tone: "text-violet-700 dark:text-violet-300",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="card-premium p-4 rounded-2xl border border-border/80"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground leading-tight">{c.label}</p>
            <c.icon className={cn("h-4 w-4 shrink-0 opacity-80", c.tone)} />
          </div>
          <p className="text-2xl font-black text-foreground tabular-nums">{c.value}</p>
          <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{c.sub}</p>
        </motion.div>
      ))}
    </div>
  );
}

function RankedSlotsList({
  ranked,
  totalMembers,
  peak,
  onPickSlot,
}: {
  ranked: ReturnType<typeof rankOverlapSlots>;
  totalMembers: number;
  peak: number;
  onPickSlot: (dateKey: string, dateLabel: string, hour: number, count: number) => void;
}) {
  if (ranked.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
        <p className="font-bold text-foreground">No shared class availability yet</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Ask members to add availability in My Schedule, or widen their free blocks so common windows appear.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Ranked by <span className="font-bold text-foreground">how many members</span> can attend at once. Use the
        progress bar as a quick read of strength vs your full roster.
      </p>
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {ranked.slice(0, 20).map((slot, i) => {
            const pct = totalMembers > 0 ? Math.round((slot.count / totalMembers) * 100) : 0;
            const isTop = i === 0 && slot.count === peak;
            return (
              <motion.li
                key={`${slot.dateKey}-${slot.hour}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.4) }}
                className={cn(
                  "rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3",
                  isTop ? "border-primary/40 bg-primary/5 shadow-sm" : "border-border bg-card/80",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black",
                    isTop ? "gradient-purple text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                    <span className="font-black text-foreground">{slot.dateLabel}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-bold text-primary">{slot.timeLabel}</span>
                    {isTop && (
                      <Badge className="rounded-lg bg-amber-500/20 text-amber-950 dark:text-amber-100 border-amber-500/30 font-black text-[10px]">
                        Best pick
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                      <span>Availability strength</span>
                      <span>
                        {slot.count}/{totalMembers} ({pct}%)
                      </span>
                    </div>
                    <Progress value={pct} className="h-2 rounded-full" />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold shrink-0"
                  onClick={() => onPickSlot(slot.dateKey, slot.dateLabel, slot.hour, slot.count)}
                >
                  View detail
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}

function PerMemberAccordion({
  enrollments,
  peak,
  totalMembers,
}: {
  enrollments: import("@/types").GroupMemberEnrollment[];
  peak: number;
  totalMembers: number;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        See how much each person has shared, and whether their free hours line up with the{" "}
        <span className="font-bold text-foreground">peak class availability ({peak}</span>/{totalMembers}).
      </p>
      <Accordion type="single" collapsible className="w-full rounded-2xl border border-border divide-y divide-border overflow-hidden bg-card/50">
        {enrollments.map((e) => {
          const blocks = countFreeHourBlocks(e);
          const hasData = blocks > 0;
          return (
            <AccordionItem key={e.studentId} value={e.studentId} className="border-0 px-4">
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="flex flex-1 items-center justify-between gap-3 text-left pr-2">
                  <div className="min-w-0">
                    <p className="font-black text-foreground truncate">{e.studentName}</p>
                    <p className="text-xs text-muted-foreground">Slot: {e.slotLabel}</p>
                  </div>
                  <Badge
                    variant={hasData ? "secondary" : "outline"}
                    className={cn("shrink-0 font-bold", !hasData && "border-amber-500/40 text-amber-900 dark:text-amber-100")}
                  >
                    {hasData ? `${blocks} hours saved` : "No hours yet"}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-sm text-muted-foreground leading-relaxed">
                {hasData ? (
                  <>
                    This member has painted <span className="font-bold text-foreground">{blocks}</span> distinct hour
                    blocks across their week (recurring + specific weeks). Compare the heatmap to see if those hours fall
                    into hot cells where others are also free.
                  </>
                ) : (
                  <>
                    No free hours recorded from My Schedule yet — they may still be onboarding. Nudge them to complete
                    Schedule so class availability can appear.
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function EmptyNoGroups() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-10 text-center max-w-lg mx-auto">
      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
      <p className="font-black text-lg text-foreground mb-2">No classes in the system</p>
      <p className="text-sm text-muted-foreground mb-6">Create or approve listings under Classes first.</p>
      <Button asChild className="rounded-2xl font-black gradient-purple text-primary-foreground">
        <Link href="/admin?tab=classes">Go to Classes</Link>
      </Button>
    </div>
  );
}

function EmptyNoEnrollments() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-10 text-center max-w-lg mx-auto">
      <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
      <p className="font-black text-lg text-foreground mb-2">No members to match yet</p>
      <p className="text-sm text-muted-foreground mb-6">
        Students need to join a class so their availability snapshots appear here.
      </p>
      <Button asChild variant="outline" className="rounded-2xl font-bold border-2">
        <Link href="/browse">Browse classes</Link>
      </Button>
    </div>
  );
}
