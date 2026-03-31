"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SongGroup } from "@/types";
import { getMajorityOverlapSuggestion } from "@/lib/schedule-overlap";
import { CLASS_LABELS } from "@/lib/credits";
import { Users, ArrowRight, Lightbulb } from "lucide-react";

type Props = {
  group: SongGroup;
  studentId: string;
  variant?: "joined" | "created";
};

export default function FormationCard({ group, studentId, variant = "joined" }: Props) {
  const enrollments = group.enrollments ?? [];
  const fill = group.maxMembers > 0 ? (group.interestCount / group.maxMembers) * 100 : 0;

  const suggestion = useMemo(
    () => getMajorityOverlapSuggestion(enrollments, studentId),
    [enrollments, studentId],
  );

  return (
    <div className="card-premium p-4 md:p-5 space-y-4 border border-border/80">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-black text-foreground truncate">{group.songTitle}</p>
          <p className="text-xs text-muted-foreground font-medium">{group.artist}</p>
          {group.classTypeAtCreation && (
            <Badge variant="secondary" className="mt-2 text-[10px] font-bold">
              {CLASS_LABELS[group.classTypeAtCreation]}
            </Badge>
          )}
        </div>
        <Badge variant="outline" className="text-[10px] font-black uppercase shrink-0">
          Forming
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Formation
          </span>
          <span className="text-foreground tabular-nums">
            {group.interestCount} / {group.maxMembers}
          </span>
        </div>
        <Progress value={fill} className="h-2.5 bg-muted" />
        <p className="text-[11px] text-muted-foreground">
          {group.interestCount === group.maxMembers
            ? "Full — waiting for confirmation."
            : `${Math.round(fill)}% toward a full class — invite others or align schedules.`}
        </p>
      </div>

      {suggestion && !suggestion.studentFree && (
        <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 space-y-2">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-black text-foreground">Best overlap so far (not everyone yet)</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Most members are free around <span className="font-bold text-foreground">{suggestion.label}</span>{" "}
                ({suggestion.count}/{suggestion.memberTotal} free). The class page only shows times when{" "}
                <span className="font-semibold text-foreground">everyone</span> overlaps; adding this window in{" "}
                <span className="font-semibold text-foreground">My Schedule</span> moves you closer to a full match.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="rounded-xl font-bold w-full sm:w-auto gradient-purple text-primary-foreground">
            <Link href="/schedule">
              Review my schedule <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      )}

      {suggestion?.studentFree && (
        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
          You&apos;re already free at the class&apos;s strongest availability window ({suggestion.label}). Nice — that helps
          formation.
        </p>
      )}

      <Button asChild variant="outline" className="w-full rounded-2xl font-bold">
        <Link href={`/browse/${group.id}`}>
          {variant === "created" ? "Manage class" : "Class details"}{" "}
          <ArrowRight className="w-4 h-4 ml-1 inline" />
        </Link>
      </Button>
    </div>
  );
}
