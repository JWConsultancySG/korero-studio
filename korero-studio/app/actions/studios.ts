"use server";

import { createClient } from "@/lib/supabase/server";
import { recomputeMatchingForStudio } from "@/app/actions/matching";
import type { AvailabilitySlot, Studio } from "@/types";

type AdminGuardResult =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; error: "unauthorized" | "forbidden" };

async function requireAdmin(): Promise<AdminGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const { data: me } = await supabase.from("profiles").select("app_role").eq("id", user.id).maybeSingle();
  if (me?.app_role !== "admin") return { ok: false, error: "forbidden" };
  return { ok: true, supabase };
}

export async function addStudio(input: {
  name: string;
  location?: string;
  address?: string;
  timezone?: string;
  capacity?: number;
  notes?: string;
}): Promise<{ ok: true; studio: Studio } | { ok: false; error: string; message?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = guard.supabase;

  const name = input.name.trim();
  if (!name) return { ok: false, error: "invalid", message: "Studio name is required." };

  const payload = {
    name,
    location: (input.location ?? "").trim(),
    address: (input.address ?? "").trim(),
    timezone: (input.timezone ?? "Asia/Singapore").trim() || "Asia/Singapore",
    capacity: Math.max(1, Number(input.capacity ?? 10) || 10),
    notes: (input.notes ?? "").trim(),
    is_active: true,
  };

  const { data, error } = await supabase.from("studios").insert(payload).select("*").single();
  if (error || !data) return { ok: false, error: "db", message: error?.message };

  return {
    ok: true,
    studio: {
      id: data.id as string,
      name: data.name as string,
      isActive: Boolean(data.is_active),
      location: (data.location as string) ?? "",
      address: (data.address as string) ?? "",
      timezone: (data.timezone as string) ?? "Asia/Singapore",
      capacity: (data.capacity as number) ?? 1,
      notes: (data.notes as string) ?? "",
    },
  };
}

export async function updateStudio(
  studioId: string,
  patch: {
    name?: string;
    location?: string;
    address?: string;
    timezone?: string;
    capacity?: number;
    notes?: string;
    isActive?: boolean;
  },
): Promise<{ ok: true; studio: Studio } | { ok: false; error: string; message?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = guard.supabase;

  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) return { ok: false, error: "invalid", message: "Studio name cannot be empty." };
    row.name = name;
  }
  if (patch.location !== undefined) row.location = patch.location.trim();
  if (patch.address !== undefined) row.address = patch.address.trim();
  if (patch.timezone !== undefined) row.timezone = patch.timezone.trim() || "Asia/Singapore";
  if (patch.capacity !== undefined) row.capacity = Math.max(1, Number(patch.capacity) || 1);
  if (patch.notes !== undefined) row.notes = patch.notes.trim();
  if (patch.isActive !== undefined) row.is_active = patch.isActive;

  if (Object.keys(row).length === 0) return { ok: false, error: "invalid", message: "No fields to update." };

  const { data, error } = await supabase.from("studios").update(row).eq("id", studioId).select("*").single();
  if (error || !data) return { ok: false, error: "db", message: error?.message };

  return {
    ok: true,
    studio: {
      id: data.id as string,
      name: data.name as string,
      isActive: Boolean(data.is_active),
      location: (data.location as string) ?? "",
      address: (data.address as string) ?? "",
      timezone: (data.timezone as string) ?? "Asia/Singapore",
      capacity: (data.capacity as number) ?? 1,
      notes: (data.notes as string) ?? "",
    },
  };
}

export async function deleteStudio(
  studioId: string,
): Promise<{ ok: true } | { ok: false; error: string; message?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = guard.supabase;

  const { error } = await supabase.from("studios").delete().eq("id", studioId);
  if (error) {
    // FK RESTRICT from class_studio_selection means in-use studios cannot be deleted.
    const inUse = error.code === "23503";
    return {
      ok: false,
      error: inUse ? "in_use" : "db",
      message: inUse
        ? "Cannot delete this studio because one or more classes are currently linked to it."
        : error.message,
    };
  }
  return { ok: true };
}

export async function fetchStudioAvailability(
  studioId: string,
): Promise<{ ok: true; slots: AvailabilitySlot[] } | { ok: false; error: string; message?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = guard.supabase;

  const { data, error } = await supabase
    .from("studio_availability_slots")
    .select("date,start_hour,end_hour")
    .eq("studio_id", studioId)
    .order("date", { ascending: true })
    .order("start_hour", { ascending: true });
  if (error) return { ok: false, error: "db", message: error.message };

  const slots: AvailabilitySlot[] = (data ?? []).map((row) => ({
    date: row.date as string,
    startHour: row.start_hour as number,
    endHour: row.end_hour as number,
  }));

  return { ok: true, slots };
}

export async function saveStudioAvailability(
  studioId: string,
  slots: AvailabilitySlot[],
): Promise<{ ok: true; count: number } | { ok: false; error: string; message?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = guard.supabase;

  const normalized = slots
    .filter((s) => !s.isConfirmedClass)
    .map((s) => ({
      studio_id: studioId,
      date: s.date,
      start_hour: s.startHour,
      end_hour: s.endHour,
    }))
    .filter((s) => Number.isInteger(s.start_hour) && Number.isInteger(s.end_hour) && s.end_hour > s.start_hour);

  const { error: delErr } = await supabase.from("studio_availability_slots").delete().eq("studio_id", studioId);
  if (delErr) return { ok: false, error: "db", message: delErr.message };

  if (normalized.length > 0) {
    const { error: insErr } = await supabase.from("studio_availability_slots").insert(normalized);
    if (insErr) return { ok: false, error: "db", message: insErr.message };
  }

  await recomputeMatchingForStudio(studioId);

  return { ok: true, count: normalized.length };
}
