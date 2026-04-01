"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDays, format, getDay } from "date-fns";
import { fetchStudioAvailability, saveStudioAvailability } from "@/app/actions/studios";
import { hoursToBlocks } from "@/lib/availability-blocks";
import type { AvailabilitySlot } from "@/types";
import { toast } from "sonner";
import ScheduleTimetable from "@/components/schedule/ScheduleTimetable";
import type { WeeklyTemplate } from "@/components/schedule/WeeklyGrid";

export default function AdminStudiosPanel() {
  const { studios, addStudio, updateStudio, deleteStudio } = useApp();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [editingStudioId, setEditingStudioId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [selectedStudioId, setSelectedStudioId] = useState<string>("");
  const [draftAvailability, setDraftAvailability] = useState<AvailabilitySlot[]>([]);
  const [weeklyTemplate, setWeeklyTemplate] = useState<WeeklyTemplate>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [savingSlots, setSavingSlots] = useState(false);
  const [addingStudio, setAddingStudio] = useState(false);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    if (!selectedStudioId && studios.length > 0) {
      setSelectedStudioId(studios[0].id);
    }
  }, [selectedStudioId, studios]);

  useEffect(() => {
    if (!selectedStudioId) return;
    if (!studios.some((s) => s.id === selectedStudioId)) {
      setSelectedStudioId(studios[0]?.id ?? "");
    }
  }, [selectedStudioId, studios]);

  useEffect(() => {
    if (!selectedStudioId) return;
    let cancelled = false;
    setLoadingSlots(true);
    void fetchStudioAvailability(selectedStudioId)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          toast.error(res.message ?? "Could not load studio availability.");
          return;
        }
        setDraftAvailability(res.slots);
        setWeeklyTemplate({});
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedStudioId]);

  const toggleFreeHour = (dateKey: string, hour: number) => {
    setDraftAvailability((prev) => {
      const hours = new Set<number>();
      for (const s of prev) {
        if (s.date !== dateKey) continue;
        for (let h = s.startHour; h < s.endHour; h++) hours.add(h);
      }
      if (hours.has(hour)) hours.delete(hour);
      else hours.add(hour);
      const blocks = hoursToBlocks(hours);
      const rest = prev.filter((s) => s.date !== dateKey);
      const nextSlots: AvailabilitySlot[] = blocks.map((b) => ({ date: dateKey, startHour: b.startHour, endHour: b.endHour }));
      return [...rest, ...nextSlots];
    });
  };

  const onSaveSlots = async () => {
    if (!selectedStudioId || savingSlots) return;
    setSavingSlots(true);
    try {
      const res = await saveStudioAvailability(selectedStudioId, draftAvailability);
      if (!res.ok) {
        toast.error(res.message ?? "Could not save studio availability.");
        return;
      }
      toast.success(`Saved ${res.count} availability block${res.count === 1 ? "" : "s"} for this studio.`);
    } finally {
      setSavingSlots(false);
    }
  };

  const onAddStudio = async () => {
    if (!name.trim() || addingStudio) return;
    setAddingStudio(true);
    try {
      const res = await addStudio({
        name: name.trim(),
        location: location.trim(),
        address: address.trim(),
      });
      if (!res.ok) {
        toast.error(res.message ?? "Could not add studio.");
        return;
      }
      toast.success("Studio added.");
      setName("");
      setLocation("");
      setAddress("");
    } finally {
      setAddingStudio(false);
    }
  };

  const startEditStudio = (studioId: string) => {
    const studio = studios.find((s) => s.id === studioId);
    if (!studio) return;
    setEditingStudioId(studioId);
    setEditName(studio.name);
    setEditLocation(studio.location);
    setEditAddress(studio.address);
  };

  const onSaveStudioMeta = async () => {
    if (!editingStudioId) return;
    const res = await updateStudio(editingStudioId, {
      name: editName.trim(),
      location: editLocation.trim(),
      address: editAddress.trim(),
    });
    if (!res.ok) {
      toast.error(res.message ?? "Could not update studio.");
      return;
    }
    toast.success("Studio updated.");
    setEditingStudioId(null);
  };

  const onDeleteStudio = async (studioId: string) => {
    const studio = studios.find((s) => s.id === studioId);
    if (!studio) return;
    const ok = window.confirm(`Delete studio "${studio.name}"? This cannot be undone.`);
    if (!ok) return;
    const res = await deleteStudio(studioId);
    if (!res.ok) {
      toast.error(res.message ?? "Could not delete studio.");
      return;
    }
    toast.success("Studio deleted.");
  };

  const applyRecurring = (range: "this" | "next" | "next4" | "next8", selectedWeekMonday: Date) => {
    const weekCount = range === "this" ? 1 : range === "next" ? 1 : range === "next4" ? 4 : 8;
    const firstWeekMonday = range === "this" ? selectedWeekMonday : addDays(selectedWeekMonday, 7);
    const slots: AvailabilitySlot[] = [];
    const targetDateKeys = new Set<string>();
    const jsToGridDay = (jsDay: number) => (jsDay === 0 ? 6 : jsDay - 1);

    Array.from({ length: weekCount * 7 }, (_, i) => addDays(firstWeekMonday, i)).forEach((day) => {
      const gridDay = jsToGridDay(getDay(day));
      const hours = weeklyTemplate[gridDay];
      if (!hours || hours.size === 0) return;
      const key = format(day, "yyyy-MM-dd");
      targetDateKeys.add(key);
      const sorted = Array.from(hours).sort((a, b) => a - b);
      let blockStart = sorted[0];
      let blockEnd = sorted[0] + 1;
      for (let i = 1; i <= sorted.length; i++) {
        if (i < sorted.length && sorted[i] === blockEnd) {
          blockEnd = sorted[i] + 1;
        } else {
          slots.push({ date: key, startHour: blockStart, endHour: blockEnd });
          if (i < sorted.length) {
            blockStart = sorted[i];
            blockEnd = sorted[i] + 1;
          }
        }
      }
    });

    setDraftAvailability((prev) => {
      const untouched = prev.filter((s) => !targetDateKeys.has(s.date));
      return [...untouched, ...slots];
    });
    toast.success("Recurring pattern updated in draft. Press Save studio availability when you are ready.");
  };

  const clearDraftAvailability = () => {
    const todayKey = format(today, "yyyy-MM-dd");
    setDraftAvailability((prev) => prev.filter((s) => s.date < todayKey));
    toast.success("Future draft availability cleared");
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border p-4 bg-card/50">
      <p className="text-sm font-black text-foreground">Studios</p>
      <div className="grid gap-3 md:grid-cols-2">
        {studios.map((studio) => (
          <div key={studio.id} className="rounded-xl border border-border p-3">
            {editingStudioId === studio.id ? (
              <div className="space-y-2">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Studio name" />
                <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Location" />
                <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Address" />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => void onSaveStudioMeta()} disabled={!editName.trim()}>
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditingStudioId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="font-bold">{studio.name}</p>
                <p className="text-xs text-muted-foreground">{studio.location}</p>
                <p className="text-xs text-muted-foreground">{studio.address}</p>
                <div className="mt-2 flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => startEditStudio(studio.id)}>
                    Edit
                  </Button>
                  <Button type="button" size="sm" variant="destructive" onClick={() => void onDeleteStudio(studio.id)}>
                    Delete
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Studio name" />
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)" />
        <Button type="button" variant="outline" disabled={!name.trim() || addingStudio} onClick={() => void onAddStudio()}>
          {addingStudio ? "Adding..." : "Add studio"}
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-background/60 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-black text-foreground">Studio availability (editable)</p>
          <p className="text-xs text-muted-foreground">Uses the same weekly + recurring editor as student/instructor schedule.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {studios.map((studio) => (
            <button
              key={studio.id}
              type="button"
              onClick={() => setSelectedStudioId(studio.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                selectedStudioId === studio.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-primary/40"
              }`}
            >
              {studio.name}
            </button>
          ))}
        </div>

        {selectedStudioId ? (
          <>
            <ScheduleTimetable
              weeklyTemplate={weeklyTemplate}
              onTemplateChange={setWeeklyTemplate}
              onApplyRecurring={applyRecurring}
              onClearAllAvailability={clearDraftAvailability}
              availability={draftAvailability}
              toggleFreeHour={toggleFreeHour}
              today={today}
            />

            <div className="flex items-center justify-end">
              <Button
                type="button"
                className="rounded-xl font-bold"
                disabled={savingSlots || loadingSlots}
                onClick={() => void onSaveSlots()}
              >
                {savingSlots ? "Saving..." : "Save studio availability"}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Add a studio first to edit availability.</p>
        )}
      </div>
    </div>
  );
}
