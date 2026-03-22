import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Clock, Check, X } from 'lucide-react';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8am-10pm

const formatHour = (h: number) => {
  if (h === 0 || h === 24) return '12 AM';
  if (h === 12) return '12 PM';
  if (h > 12) return `${h - 12} PM`;
  return `${h} AM`;
};

interface AddTimeSheetProps {
  dateLabel: string;
  onAdd: (startHour: number, endHour: number) => void;
  onClose: () => void;
  existingSlots: Array<{ startHour: number; endHour: number }>;
}

export default function AddTimeSheet({ dateLabel, onAdd, onClose, existingSlots }: AddTimeSheetProps) {
  const [startHour, setStartHour] = useState(16);
  const [endHour, setEndHour] = useState(18);

  const isOccupied = (h: number) => existingSlots.some(s => h >= s.startHour && h < s.endHour);

  const handleAdd = () => {
    if (endHour > startHour) {
      onAdd(startHour, endHour);
    }
  };

  const endOptions = HOURS.filter(h => h > startHour).concat([23]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/40" />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md bg-card rounded-t-3xl border-t border-border flex flex-col"
        style={{ maxHeight: '85svh' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-2 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-3 flex-shrink-0">
          <div>
            <h3 className="text-base font-black text-foreground">Add Free Time</h3>
            <p className="text-[11px] text-muted-foreground">{dateLabel}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted btn-press">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pb-[max(5rem,calc(env(safe-area-inset-bottom)+4rem))]">
          <div className="space-y-4">
            {/* Start time */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">From</label>
              <div className="grid grid-cols-5 gap-1.5">
                {HOURS.map(h => {
                  const occupied = isOccupied(h);
                  return (
                    <button
                      key={`s-${h}`}
                      disabled={occupied}
                      onClick={() => {
                        setStartHour(h);
                        if (endHour <= h) setEndHour(h + 1);
                      }}
                      className={`py-2 rounded-xl text-[11px] font-bold transition-all btn-press ${
                        occupied
                          ? 'bg-muted/50 text-muted-foreground/40 cursor-not-allowed'
                          : startHour === h
                          ? 'gradient-purple text-primary-foreground glow-purple'
                          : 'bg-muted text-foreground hover:bg-accent'
                      }`}
                    >
                      {formatHour(h)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* End time */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">To</label>
              <div className="grid grid-cols-5 gap-1.5">
                {endOptions.map(h => (
                  <button
                    key={`e-${h}`}
                    onClick={() => setEndHour(h)}
                    className={`py-2 rounded-xl text-[11px] font-bold transition-all btn-press ${
                      endHour === h
                        ? 'gradient-purple text-primary-foreground glow-purple'
                        : 'bg-muted text-foreground hover:bg-accent'
                    }`}
                  >
                    {formatHour(h)}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="card-premium p-3 flex items-center gap-3">
              <Clock className="w-4 h-4 text-primary" />
              <div>
                <p className="font-black text-sm text-foreground">
                  {formatHour(startHour)} — {formatHour(endHour)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {endHour - startHour} hour{endHour - startHour !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Confirm */}
            <Button
              onClick={handleAdd}
              disabled={endHour <= startHour}
              className="w-full h-12 rounded-2xl font-black text-sm gradient-purple text-primary-foreground btn-press disabled:opacity-40"
            >
              <span className="flex items-center gap-2">Confirm <Check className="w-4 h-4" /></span>
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
