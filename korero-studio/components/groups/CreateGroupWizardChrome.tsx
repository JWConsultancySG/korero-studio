"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type StepInfo = {
  id: number;
  label: string;
  caption: string;
};

/** Default copy for the create-group flow (5 steps). */
export const WIZARD_STEPS: readonly StepInfo[] = [
  { id: 1, label: "Song", caption: "Search and pick the track" },
  { id: 2, label: "Members", caption: "Name everyone in the line-up" },
  { id: 3, label: "Your slot", caption: "Which part are you?" },
  { id: 4, label: "Studio", caption: "Choose location and schedule fit" },
  { id: 5, label: "Credits", caption: "Class format & payment" },
] as const;

type ChromeProps = {
  steps: readonly StepInfo[];
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
};

/** Mobile: segmented bar + current step label (compact, no oversized UI). */
export function MobileStepRail({ steps, currentStep }: ChromeProps) {
  return (
    <div className="space-y-2 md:hidden">
      <div
        className="flex h-2 gap-1 rounded-full bg-muted p-0.5"
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={steps.length}
      >
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-full flex-1 rounded-full transition-colors duration-300",
              currentStep > i ? "bg-primary" : "bg-transparent",
            )}
          />
        ))}
      </div>
      <p className="text-center text-[11px] font-bold leading-tight text-muted-foreground">
        <span className="text-foreground">{steps[currentStep - 1]?.label}</span>
        <span className="text-muted-foreground/70"> · </span>
        <span className="tabular-nums">
          {currentStep}/{steps.length}
        </span>
      </p>
    </div>
  );
}

/** Tablet: responsive step grid with numbered states. */
export function TabletHorizontalStepper({
  steps,
  currentStep,
  onStepClick,
}: ChromeProps) {
  return (
    <nav
      className="hidden md:grid lg:hidden gap-2 w-full max-w-2xl mx-auto"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      aria-label="Steps"
    >
      {steps.map((s) => {
        const done = currentStep > s.id;
        const active = currentStep === s.id;
        const clickable = done && onStepClick;
        return (
          <button
            key={s.id}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onStepClick?.(s.id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-center transition-colors border border-transparent",
              active && "border-primary/25 bg-primary/5 shadow-sm",
              clickable && "hover:bg-muted/80 cursor-pointer",
              !clickable && !active && "opacity-80",
            )}
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black border-2",
                done && "border-primary bg-primary text-primary-foreground",
                active && !done && "border-primary bg-background text-primary",
                !active && !done && "border-border bg-muted/40 text-muted-foreground",
              )}
            >
              {done ? <Check className="w-4 h-4" strokeWidth={3} /> : s.id}
            </span>
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wide leading-tight line-clamp-2",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/** Desktop: vertical timeline + captions (sidebar pattern). */
export function DesktopStepSidebar({
  steps,
  currentStep,
  onStepClick,
}: ChromeProps) {
  return (
    <nav className="hidden lg:flex flex-col w-full max-w-[260px] shrink-0" aria-label="Steps">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 px-1">
        New song group
      </p>
      <ol className="space-y-0">
        {steps.map((s, i) => {
          const done = currentStep > s.id;
          const active = currentStep === s.id;
          const clickable = Boolean(done && onStepClick);
          const segmentDone = done;
          return (
            <li key={s.id} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0 w-8">
                <button
                  type="button"
                  disabled={!clickable && !active}
                  onClick={() => clickable && onStepClick?.(s.id)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-black border-2 transition-all bg-background",
                    done && "border-primary bg-primary text-primary-foreground",
                    active && !done && "border-primary text-primary shadow-md",
                    !active && !done && "border-border text-muted-foreground",
                    clickable && "hover:ring-2 hover:ring-primary/20 cursor-pointer",
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : s.id}
                </button>
                {i < steps.length - 1 && (
                  <span
                    className={cn(
                      "w-px min-h-[40px] grow mt-1",
                      segmentDone ? "bg-primary/30" : "bg-border",
                    )}
                    aria-hidden
                  />
                )}
              </div>
              <div className={cn("min-w-0 flex-1", i < steps.length - 1 ? "pb-6" : "")}>
                <p
                  className={cn(
                    "text-sm font-black leading-snug",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{s.caption}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
