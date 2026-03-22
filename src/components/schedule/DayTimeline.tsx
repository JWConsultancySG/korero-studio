import { motion } from 'framer-motion';
import { Clock, Music, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AvailabilitySlot, SongGroup } from '@/types';

const formatHour = (h: number) => {
  if (h === 0 || h === 24) return '12 AM';
  if (h === 12) return '12 PM';
  if (h > 12) return `${h - 12} PM`;
  return `${h} AM`;
};

const TIMELINE_HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8-23

interface DayTimelineProps {
  freeSlots: AvailabilitySlot[];
  confirmedSlots: AvailabilitySlot[];
  groups: SongGroup[];
  onRemoveSlot: (slot: AvailabilitySlot) => void;
  onAddTime: () => void;
  isEmpty: boolean;
}

export default function DayTimeline({ freeSlots, confirmedSlots, groups, onRemoveSlot, onAddTime, isEmpty }: DayTimelineProps) {
  return (
    <div className="card-premium p-4">
      <div className="relative">
        {TIMELINE_HOURS.map((hour) => {
          const freeSlot = freeSlots.find(s => hour >= s.startHour && hour < s.endHour);
          const confirmedSlot = confirmedSlots.find(s => hour >= s.startHour && hour < s.endHour);
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
                      onClick={() => onRemoveSlot(freeSlot)}
                      className="p-1.5 rounded-lg hover:bg-muted btn-press min-h-[28px] min-w-[28px] flex items-center justify-center"
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

      {isEmpty && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6">
          <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs font-bold text-muted-foreground mb-1">No availability for this day</p>
          <p className="text-[11px] text-muted-foreground mb-3">Add a specific time or apply your weekly pattern</p>
          <Button
            onClick={onAddTime}
            size="sm"
            variant="outline"
            className="rounded-xl font-bold btn-press h-9 text-xs border-primary/30 text-primary hover:bg-primary/5"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Time
          </Button>
        </motion.div>
      )}
    </div>
  );
}
