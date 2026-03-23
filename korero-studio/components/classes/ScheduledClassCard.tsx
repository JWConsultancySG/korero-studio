"use client";

import Link from "next/link";
import type { SongGroup, ClassSession, Booking } from "@/types";
import { Badge } from "@/components/ui/badge";
import { CLASS_LABELS } from "@/lib/credits";
import { Music, Clock, Building2, Mic2 } from "lucide-react";

type Props = {
  group: SongGroup;
  sessions: ClassSession[];
  booking?: Booking;
};

export default function ScheduledClassCard({ group, sessions, booking }: Props) {
  const groupSessions = sessions.filter((s) => s.groupId === group.id);

  return (
    <div className="card-premium p-4 md:p-5 space-y-4 border border-primary/20">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-black text-foreground truncate">{group.songTitle}</p>
          <p className="text-xs text-muted-foreground font-medium">{group.artist}</p>
        </div>
        <Badge className="gradient-purple text-primary-foreground text-[10px] font-black">Scheduled</Badge>
      </div>

      {group.classTypeAtCreation && (
        <p className="text-xs text-muted-foreground">
          Format: <span className="font-bold text-foreground">{CLASS_LABELS[group.classTypeAtCreation]}</span>
        </p>
      )}

      {booking && (
        <div className="flex items-center gap-2 text-xs font-bold text-foreground bg-muted/50 rounded-xl px-3 py-2">
          <Mic2 className="w-4 h-4 text-primary shrink-0" />
          Your role: {booking.role}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          Studio & time (assigned by Korero)
        </p>
        {groupSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Room and time will appear here once the studio assigns your slot.
          </p>
        ) : (
          <ul className="space-y-2">
            {groupSessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-accent/40 px-3 py-2.5 text-sm"
              >
                <Music className="w-4 h-4 text-primary shrink-0" />
                <span className="font-black text-foreground">{s.room}</span>
                <span className="text-muted-foreground">·</span>
                <span className="flex items-center gap-1 font-bold text-foreground">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  {s.day} {s.time}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        href={`/groups/${group.id}`}
        className="text-xs font-bold text-primary underline-offset-2 hover:underline inline-block"
      >
        View group
      </Link>
    </div>
  );
}
