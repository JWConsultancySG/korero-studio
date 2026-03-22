import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8AM-10PM

const formatHourShort = (h: number) => {
  if (h === 12) return '12P';
  if (h > 12) return `${h - 12}P`;
  return `${h}A`;
};

export type WeeklyTemplate = Record<number, Set<number>>; // dayIndex -> Set of hours

interface WeeklyGridProps {
  template: WeeklyTemplate;
  onChange: (template: WeeklyTemplate) => void;
  onApply: () => void;
  onClear: () => void;
  hasExistingSlots: boolean;
}

export default function WeeklyGrid({ template, onChange, onApply, onClear, hasExistingSlots }: WeeklyGridProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'add' | 'remove'>('add');
  const scrollRef = useRef<HTMLDivElement>(null);

  const toggleCell = useCallback((dayIdx: number, hour: number) => {
    const newTemplate = { ...template };
    const daySet = new Set(newTemplate[dayIdx] || []);
    if (daySet.has(hour)) {
      daySet.delete(hour);
    } else {
      daySet.add(hour);
    }
    newTemplate[dayIdx] = daySet;
    onChange(newTemplate);
  }, [template, onChange]);

  const handlePointerDown = useCallback((dayIdx: number, hour: number) => {
    const daySet = template[dayIdx] || new Set();
    const mode = daySet.has(hour) ? 'remove' : 'add';
    setDragMode(mode);
    setIsDragging(true);
    toggleCell(dayIdx, hour);
  }, [template, toggleCell]);

  const handlePointerEnter = useCallback((dayIdx: number, hour: number) => {
    if (!isDragging) return;
    const daySet = template[dayIdx] || new Set();
    const isSelected = daySet.has(hour);
    if ((dragMode === 'add' && !isSelected) || (dragMode === 'remove' && isSelected)) {
      toggleCell(dayIdx, hour);
    }
  }, [isDragging, dragMode, template, toggleCell]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const totalSelected = Object.values(template).reduce((sum, set) => sum + set.size, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-foreground">Set Your Typical Week</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Tap or drag to mark your free hours</p>
        </div>
        {totalSelected > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground btn-press px-2 py-1 rounded-lg"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      {/* Grid */}
      <div
        className="card-premium rounded-2xl overflow-hidden select-none touch-none"
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Hour headers - scrollable */}
        <div className="flex">
          <div className="w-11 flex-shrink-0 bg-muted/50 border-b border-border" />
          <div ref={scrollRef} className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex min-w-[600px]">
              {HOURS.map(h => (
                <div key={h} className="flex-1 text-center py-2 text-[9px] font-bold text-muted-foreground border-b border-border bg-muted/30">
                  {formatHourShort(h)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Day rows */}
        {DAYS.map((day, dayIdx) => {
          const daySet = template[dayIdx] || new Set();
          return (
            <div key={day} className="flex">
              <div className="w-11 flex-shrink-0 flex items-center justify-center py-1 bg-muted/30 border-b border-border">
                <span className="text-[10px] font-black text-muted-foreground uppercase">{day}</span>
              </div>
              <div className="flex-1 overflow-x-auto scrollbar-hide" 
                onScroll={(e) => {
                  // Sync scroll with header
                  if (scrollRef.current) {
                    scrollRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
                  }
                }}
              >
                <div className="flex min-w-[600px]">
                  {HOURS.map(h => {
                    const isSelected = daySet.has(h);
                    const isPrevSelected = daySet.has(h - 1);
                    const isNextSelected = daySet.has(h + 1);

                    return (
                      <div
                        key={h}
                        onPointerDown={() => handlePointerDown(dayIdx, h)}
                        onPointerEnter={() => handlePointerEnter(dayIdx, h)}
                        className={`flex-1 h-10 border-b border-r border-border/40 transition-colors duration-100 cursor-pointer ${
                          isSelected
                            ? `bg-primary/80 ${!isPrevSelected ? 'rounded-l-md' : ''} ${!isNextSelected ? 'rounded-r-md' : ''}`
                            : 'hover:bg-accent/60'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats + Apply */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          {totalSelected > 0 ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-black text-foreground">{totalSelected}</span> hour{totalSelected !== 1 ? 's' : ''} per week selected
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Tap the grid above to get started</p>
          )}
        </div>
        <Button
          onClick={onApply}
          disabled={totalSelected === 0}
          className="rounded-2xl gradient-purple text-primary-foreground font-bold btn-press h-11 px-5 disabled:opacity-40"
        >
          <Check className="w-4 h-4 mr-1.5" />
          {hasExistingSlots ? 'Update 30 Days' : 'Apply to 30 Days'}
        </Button>
      </div>
    </div>
  );
}
