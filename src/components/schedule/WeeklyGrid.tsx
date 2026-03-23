import { useState, useCallback } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8AM-10PM

const formatHour24 = (h: number) => `${h.toString().padStart(2, '0')}:00`;

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

      {/* Grid — days as columns (X), hours as rows (Y) */}
      <div
        className="card-premium rounded-2xl overflow-hidden select-none touch-none"
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Day headers row */}
        <div className="grid grid-cols-[40px_repeat(7,1fr)]">
          {/* Empty corner */}
          <div className="h-8 bg-muted/50 border-b border-r border-border" />
          {/* Day labels */}
          {DAYS.map((day) => (
            <div key={day} className="h-8 flex items-center justify-center bg-muted/30 border-b border-border">
              <span className="text-[9px] font-black text-muted-foreground uppercase">{day}</span>
            </div>
          ))}
        </div>

        {/* Hour rows */}
        <div className="max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--muted-foreground) / 0.3) transparent' }}>
          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-[40px_repeat(7,1fr)]">
              {/* Hour label */}
              <div className="h-9 flex items-center justify-center bg-muted/30 border-b border-r border-border">
                <span className="text-[8px] font-bold text-muted-foreground">{formatHour24(hour)}</span>
              </div>
              {/* Day cells for this hour */}
              {DAYS.map((_, dayIdx) => {
                const daySet = template[dayIdx] || new Set();
                const isSelected = daySet.has(hour);
                const isPrevSelected = daySet.has(hour - 1);
                const isNextSelected = daySet.has(hour + 1);

                return (
                  <div
                    key={dayIdx}
                    onPointerDown={() => handlePointerDown(dayIdx, hour)}
                    onPointerEnter={() => handlePointerEnter(dayIdx, hour)}
                    className={`h-9 border-b border-r border-border/40 transition-colors duration-100 cursor-pointer ${
                      isSelected
                        ? `bg-primary/80 ${!isPrevSelected ? 'rounded-t-md' : ''} ${!isNextSelected ? 'rounded-b-md' : ''}`
                        : 'hover:bg-accent/60'
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>
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
