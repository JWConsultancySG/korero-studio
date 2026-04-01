"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { addDays, format, startOfDay, startOfWeek } from "date-fns";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AvailabilitySlot, SongGroup } from "@/types";
import { slotsToHoursForDate, confirmedHoursForDate } from "@/lib/availability-blocks";
import { cn } from "@/lib/utils";
import { ScheduleGridFrame } from "@/components/schedule/ScheduleGridFrame";
import type { WeekColumn } from "@/components/schedule/schedule-week";
import type { WeeklyTemplate } from "@/components/schedule/WeeklyGrid";
import { useIsMobile } from "@/hooks/use-mobile";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  weeklyTemplate: WeeklyTemplate;
  onTemplateChange: (t: WeeklyTemplate) => void;
  onApplyRecurring: (range: "this" | "next" | "next4" | "next8", weekMonday: Date) => void;
  onClearAllAvailability: () => void;
  availability: AvailabilitySlot[];
  toggleFreeHour: (dateKey: string, hour: number) => void;
  today: Date;
  groups?: SongGroup[];
};

export default function ScheduleTimetable({
  weeklyTemplate,
  onTemplateChange,
  onApplyRecurring,
  onClearAllAvailability,
  availability,
  toggleFreeHour,
  today,
  groups,
}: Props) {
  const isMobile = useIsMobile();
  const today0 = startOfDay(today);
  const [weekMonday, setWeekMonday] = useState<Date>(startOfWeek(today0, { weekStartsOn: 1 }));
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<Date>(weekMonday);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringRangeDrawerOpen, setRecurringRangeDrawerOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    if (!weekPickerOpen) return;
    setPickerMonth(weekMonday);
  }, [weekPickerOpen, weekMonday]);

  // Safety: clear any stale global pointer lock from modal layering.
  useEffect(() => {
    if (recurringOpen || recurringRangeDrawerOpen || resetConfirmOpen || weekPickerOpen) return;
    document.body.style.pointerEvents = "";
  }, [recurringOpen, recurringRangeDrawerOpen, resetConfirmOpen, weekPickerOpen]);

  const weekColumns = useMemo<WeekColumn[]>(
    () =>
      [0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
        const d = addDays(weekMonday, dayIdx);
        const d0 = startOfDay(d);
        return {
          date: d0,
          dateKey: format(d0, "yyyy-MM-dd"),
          inWindow: d0.getTime() >= today0.getTime(),
          label: format(d0, "d"),
          isToday: d0.getTime() === today0.getTime(),
        };
      }),
    [weekMonday, today0],
  );

  const [dragWeek, setDragWeek] = useState(false);
  const [weekDragMode, setWeekDragMode] = useState<"add" | "remove">("add");
  const [dragPattern, setDragPattern] = useState(false);
  const [patternDragMode, setPatternDragMode] = useState<"add" | "remove">("add");

  const togglePatternCell = useCallback(
    (dayIdx: number, hour: number) => {
      const nextTemplate = { ...weeklyTemplate };
      const set = new Set(nextTemplate[dayIdx] || []);
      if (set.has(hour)) set.delete(hour);
      else set.add(hour);
      nextTemplate[dayIdx] = set;
      onTemplateChange(nextTemplate);
    },
    [weeklyTemplate, onTemplateChange],
  );

  const onPatternPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, dayIdx: number, hour: number) => {
      if (e.pointerType === "touch") e.preventDefault();
      const daySet = weeklyTemplate[dayIdx] || new Set();
      setPatternDragMode(daySet.has(hour) ? "remove" : "add");
      setDragPattern(true);
      togglePatternCell(dayIdx, hour);
    },
    [weeklyTemplate, togglePatternCell],
  );

  const onPatternPointerEnter = useCallback(
    (dayIdx: number, hour: number) => {
      if (!dragPattern) return;
      const daySet = weeklyTemplate[dayIdx] || new Set();
      const selected = daySet.has(hour);
      if ((patternDragMode === "add" && !selected) || (patternDragMode === "remove" && selected)) {
        togglePatternCell(dayIdx, hour);
      }
    },
    [dragPattern, patternDragMode, weeklyTemplate, togglePatternCell],
  );

  const onWeekPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, dateKey: string | null, hour: number) => {
      // Prevent mobile browser gestures (scroll/pull-to-refresh) while painting slots.
      if (e.pointerType === "touch") e.preventDefault();
      if (!dateKey) return;
      const current = slotsToHoursForDate(availability, dateKey);
      const has = current.has(hour);
      setWeekDragMode(has ? "remove" : "add");
      setDragWeek(true);
      toggleFreeHour(dateKey, hour);
    },
    [availability, toggleFreeHour],
  );

  const onWeekPointerEnter = useCallback(
    (dateKey: string | null, hour: number) => {
      if (!dragWeek || !dateKey) return;
      const current = slotsToHoursForDate(availability, dateKey);
      const selected = current.has(hour);
      if ((weekDragMode === "add" && !selected) || (weekDragMode === "remove" && selected)) {
        toggleFreeHour(dateKey, hour);
      }
    },
    [dragWeek, weekDragMode, availability, toggleFreeHour],
  );

  const endDrag = useCallback(() => {
    setDragWeek(false);
    setDragPattern(false);
  }, []);
  const selectedWeekStart = startOfDay(weekMonday);
  const selectedWeekEnd = startOfDay(addDays(weekMonday, 6));
  const patternTotal = Object.values(weeklyTemplate).reduce((sum, set) => sum + (set?.size ?? 0), 0);
  const recurringRanges: Array<{ key: "this" | "next" | "next4" | "next8"; label: string }> = [
    { key: "this", label: "Update for this week" },
    { key: "next", label: "Update for next week" },
    { key: "next4", label: "Update for next 4 weeks" },
    { key: "next8", label: "Update for next 8 weeks" },
  ];
  const applyRecurringToRange = useCallback(
    (range: "this" | "next" | "next4" | "next8") => {
      onApplyRecurring(range, weekMonday);
      setRecurringRangeDrawerOpen(false);
      // Defer closing popup to next frame to avoid nested overlay lock.
      requestAnimationFrame(() => {
        setRecurringOpen(false);
      });
    },
    [onApplyRecurring, weekMonday],
  );

  const renderWeekCell = useCallback(
    (dayIdx: number, hour: number, col: (typeof weekColumns)[0] | undefined) => {
      const disabled = !col?.inWindow;
      const dateKey = col?.dateKey ?? "";
      const current = slotsToHoursForDate(availability, dateKey);
      const confirmed = confirmedHoursForDate(availability, dateKey);
      const isSelected = !disabled && current.has(hour);
      const isConfirmed = !disabled && confirmed.has(hour);
      const isPrevSelected = !disabled && current.has(hour - 1);
      const isNextSelected = !disabled && current.has(hour + 1);
      const isPrevConfirmed = !disabled && confirmed.has(hour - 1);
      const isNextConfirmed = !disabled && confirmed.has(hour + 1);

      if (isConfirmed) {
        const groupId = confirmed.get(hour);
        const group = groupId && groups ? groups.find((g) => g.id === groupId) : undefined;
        const isStart = !isPrevConfirmed;
        return (
          <div
            className={cn(
              "min-h-0 h-full border-r border-border/40 bg-primary/20 relative cursor-default",
              isStart && "rounded-t-sm",
              !isNextConfirmed && "rounded-b-sm",
            )}
            title={group ? `${group.songTitle} — ${group.artist}` : "Confirmed lesson"}
          >
            {isStart && group && (
              <span className="absolute inset-x-0.5 top-0 text-[6px] font-black text-primary leading-tight truncate pointer-events-none">
                {group.songTitle}
              </span>
            )}
          </div>
        );
      }

      return (
        <div
          onPointerDown={(e) => onWeekPointerDown(e, disabled ? null : dateKey, hour)}
          onPointerEnter={() => onWeekPointerEnter(disabled ? null : dateKey, hour)}
          className={cn(
            "min-h-0 h-full border-r border-border/40 transition-colors duration-75 touch-none",
            disabled ? "bg-muted/40 cursor-not-allowed" : "cursor-pointer",
            !disabled && isSelected
              ? `bg-primary/80 ${!isPrevSelected ? "rounded-t-sm" : ""} ${!isNextSelected ? "rounded-b-sm" : ""}`
              : !disabled && "hover:bg-accent/60",
          )}
        />
      );
    },
    [availability, groups, onWeekPointerDown, onWeekPointerEnter],
  );
  const renderPatternCell = useCallback(
    (dayIdx: number, hour: number) => {
      const daySet = weeklyTemplate[dayIdx] || new Set();
      const isSelected = daySet.has(hour);
      const isPrevSelected = daySet.has(hour - 1);
      const isNextSelected = daySet.has(hour + 1);
      return (
        <div
          onPointerDown={(e) => onPatternPointerDown(e, dayIdx, hour)}
          onPointerEnter={() => onPatternPointerEnter(dayIdx, hour)}
          className={cn(
            "min-h-0 h-full border-r border-border/40 transition-colors duration-75 cursor-pointer touch-none",
            isSelected
              ? `bg-primary/80 ${!isPrevSelected ? "rounded-t-sm" : ""} ${!isNextSelected ? "rounded-b-sm" : ""}`
              : "hover:bg-accent/60",
          )}
        />
      );
    },
    [weeklyTemplate, onPatternPointerDown, onPatternPointerEnter],
  );

  const weekControls = (
    <div className="flex w-full sm:w-auto items-center gap-2 justify-center sm:justify-end">
      <button
        type="button"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background/80 hover:bg-muted btn-press"
        onClick={() => setWeekMonday((d) => addDays(d, -7))}
        aria-label="Previous week"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {isMobile ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setWeekPickerOpen(true)}
          className="relative flex-1 min-w-0 sm:flex-none rounded-xl font-bold h-9 px-8 sm:min-w-[9.75rem] text-[11px] justify-center"
        >
          <span className="truncate text-center">
            {format(weekMonday, "MMM d")} - {format(addDays(weekMonday, 6), "MMM d, yyyy")}
          </span>
          <ChevronDown className="absolute right-2.5 w-3.5 h-3.5" />
        </Button>
      ) : (
        <Popover open={weekPickerOpen} onOpenChange={setWeekPickerOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="rounded-xl font-bold h-9 px-2.5 min-w-[10.5rem] text-xs">
              {format(weekMonday, "MMM d")} - {format(addDays(weekMonday, 6), "MMM d, yyyy")}
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              fixedWeeks
              month={pickerMonth}
              onMonthChange={setPickerMonth}
              selected={undefined}
              modifiers={{
                selectedWeek: (date) => {
                  const d = startOfDay(date);
                  return d >= selectedWeekStart && d <= selectedWeekEnd;
                },
              }}
              modifiersClassNames={{
                selectedWeek: "bg-primary text-primary-foreground hover:bg-primary/90",
              }}
              classNames={{
                day_today: "ring-2 ring-primary rounded-md",
              }}
              onSelect={(date) => {
                if (!date) return;
                setWeekMonday(startOfWeek(startOfDay(date), { weekStartsOn: 1 }));
                setWeekPickerOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      )}
      <button
        type="button"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background/80 hover:bg-muted btn-press"
        onClick={() => setWeekMonday((d) => addDays(d, 7))}
        aria-label="Next week"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  const recurringEditorGrid = (
    <ScheduleGridFrame
      mode="pattern"
      setMode={() => undefined}
      weekIndex={0}
      setWeekIndex={() => undefined}
      weekMondays={[]}
      weekMonday={weekMonday}
      weekColumns={weekColumns}
      hintPattern="Paint your usual free hours (Mon-Sun)."
      hintWeek=""
      onGridPointerEnd={endDrag}
      renderPatternCell={renderPatternCell}
      renderWeekCell={renderWeekCell}
      showModeTabs={false}
      patternFooter={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              {patternTotal > 0 ? (
                <>
                  <span className="font-black text-foreground">{patternTotal}</span> hour{patternTotal !== 1 ? "s" : ""} per week
                </>
              ) : (
                "Paint the grid to set your typical availability."
              )}
            </p>
          </div>
          {isMobile ? (
            <Button
              type="button"
              onClick={() => setRecurringRangeDrawerOpen(true)}
              disabled={patternTotal === 0}
              className="rounded-2xl gradient-purple text-primary-foreground font-bold btn-press h-11 px-5 disabled:opacity-40"
            >
              Update
              <ChevronDown className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  disabled={patternTotal === 0}
                  className="rounded-2xl gradient-purple text-primary-foreground font-bold btn-press h-11 px-5 disabled:opacity-40"
                >
                  Update
                  <ChevronDown className="w-4 h-4 ml-1.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {recurringRanges.map((option) => (
                  <DropdownMenuItem key={option.key} onClick={() => applyRecurringToRange(option.key)}>
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      }
    />
  );

  return (
    <>
    <ScheduleGridFrame
      mode="week"
      setMode={() => undefined}
      weekIndex={0}
      setWeekIndex={() => undefined}
      weekMondays={[]}
      weekMonday={weekMonday}
      weekColumns={weekColumns}
      hintPattern=""
      hintWeek="Drag to add or remove free hours for this week. Use arrows or the date picker to switch weeks. Confirmed studio class times are blocked."
      onGridPointerEnd={endDrag}
      renderPatternCell={renderPatternCell}
      renderWeekCell={renderWeekCell}
      showModeTabs={false}
      weekControls={weekControls}
      patternFooter={
        <div className="flex items-center gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={() => setRecurringOpen(true)}
            className="rounded-2xl font-bold h-9 px-3 text-[11px] sm:text-xs"
          >
            <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
            Edit recurring week
          </Button>
          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="ml-auto flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground btn-press px-2 py-1 rounded-lg"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      }
    />
    <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset future availability?</AlertDialogTitle>
          <AlertDialogDescription>
            This clears your free-hour selections from today onward. Past dates and confirmed studio class slots are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onClearAllAvailability}
          >
            Yes, reset
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    {isMobile ? (
      <Drawer open={recurringOpen} onOpenChange={setRecurringOpen}>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader>
            <DrawerTitle>Recurring week</DrawerTitle>
            <DrawerDescription>Set your usual weekly pattern, then choose how many upcoming weeks to apply.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">{recurringEditorGrid}</div>
        </DrawerContent>
      </Drawer>
    ) : (
      <Dialog open={recurringOpen} onOpenChange={setRecurringOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recurring week</DialogTitle>
            <DialogDescription>Set your usual weekly pattern, then choose how many upcoming weeks to apply.</DialogDescription>
          </DialogHeader>
          {recurringEditorGrid}
        </DialogContent>
      </Dialog>
    )}
    <Drawer open={recurringRangeDrawerOpen} onOpenChange={setRecurringRangeDrawerOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Update recurring schedule</DrawerTitle>
          <DrawerDescription>Apply your recurring pattern to one or more upcoming weeks.</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-3 space-y-2">
          {recurringRanges.map((option) => (
            <Button
              key={option.key}
              type="button"
              variant="outline"
              className="w-full justify-start rounded-xl"
              onClick={() => applyRecurringToRange(option.key)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <DrawerFooter>
          <Button type="button" variant="ghost" onClick={() => setRecurringRangeDrawerOpen(false)}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
    <Drawer open={isMobile && weekPickerOpen} onOpenChange={setWeekPickerOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Pick week</DrawerTitle>
          <DrawerDescription>Select any date and we will open that full week (Mon-Sun).</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4 flex justify-center">
          <Calendar
            mode="single"
            fixedWeeks
            month={pickerMonth}
            onMonthChange={setPickerMonth}
            className="mx-auto"
            selected={undefined}
            modifiers={{
              selectedWeek: (date) => {
                const d = startOfDay(date);
                return d >= selectedWeekStart && d <= selectedWeekEnd;
              },
            }}
            modifiersClassNames={{
              selectedWeek: "bg-primary text-primary-foreground hover:bg-primary/90",
            }}
            classNames={{
              day_today: "ring-2 ring-primary rounded-md",
            }}
            onSelect={(date) => {
              if (!date) return;
              setWeekMonday(startOfWeek(startOfDay(date), { weekStartsOn: 1 }));
              setWeekPickerOpen(false);
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
    </>
  );
}
