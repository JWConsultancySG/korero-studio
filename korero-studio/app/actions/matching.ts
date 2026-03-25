"use server";

import { createClient } from "@/lib/supabase/server";
import { computeMultiPartyIntersection, isGoldenForClassType } from "@/lib/matching-engine";
import type { AvailabilitySlot, ClassType } from "@/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as const };
  return { supabase, user };
}

export async function requestInstructorAssignment(groupId: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false as const, reason: "unauthorized" };
  const { data: me } = await supabase.from("profiles").select("app_role").eq("id", user.id).maybeSingle();
  if (me?.app_role !== "instructor" && me?.app_role !== "admin") {
    return { ok: false as const, reason: "forbidden" };
  }
  const { error } = await supabase.from("class_instructor_assignments").upsert(
    {
      class_id: groupId,
      instructor_id: user.id,
      status: "pending",
    },
    { onConflict: "class_id,instructor_id" },
  );
  if (error) return { ok: false as const, reason: "db", message: error.message };
  return { ok: true as const };
}

export async function confirmInstructorAssignment(groupId: string, assignmentId: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false as const, reason: "unauthorized" };
  const { data: me } = await supabase.from("profiles").select("app_role").eq("id", user.id).maybeSingle();
  if (me?.app_role !== "admin") return { ok: false as const, reason: "forbidden" };
  await supabase
    .from("class_instructor_assignments")
    .update({ status: "rejected", decided_at: new Date().toISOString(), decided_by: user.id })
    .eq("class_id", groupId)
    .neq("id", assignmentId);
  const { error } = await supabase
    .from("class_instructor_assignments")
    .update({ status: "confirmed", decided_at: new Date().toISOString(), decided_by: user.id })
    .eq("id", assignmentId)
    .eq("class_id", groupId);
  if (error) return { ok: false as const, reason: "db", message: error.message };
  return { ok: true as const };
}

export async function selectGroupStudio(groupId: string, studioId: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false as const, reason: "unauthorized" };
  const { error } = await supabase.from("class_studio_selection").upsert(
    {
      class_id: groupId,
      studio_id: studioId,
      selected_by: user.id,
      selected_at: new Date().toISOString(),
    },
    { onConflict: "class_id" },
  );
  if (error) return { ok: false as const, reason: "db", message: error.message };
  return { ok: true as const };
}

async function fetchFreeSlotsByStudentIds(supabase: Awaited<ReturnType<typeof createClient>>, ids: string[]) {
  if (ids.length === 0) return [] as AvailabilitySlot[][];
  const { data } = await supabase.from("student_availability_slots").select("*").in("student_id", ids);
  const byStudent = new Map<string, AvailabilitySlot[]>();
  for (const id of ids) byStudent.set(id, []);
  for (const row of data ?? []) {
    const arr = byStudent.get(row.student_id as string);
    if (!arr) continue;
    arr.push({
      date: row.date as string,
      startHour: row.start_hour as number,
      endHour: row.end_hour as number,
      isConfirmedClass: row.is_confirmed_class as boolean,
      confirmedGroupId: (row.confirmed_class_id as string | null) ?? undefined,
    });
  }
  return ids.map((id) => byStudent.get(id) ?? []);
}

export async function precheckGroupStudioOverlap(groupId: string, studioId: string) {
  const { supabase } = await requireUser();
  const { data: enrollmentRows } = await supabase.from("class_enrollments").select("student_id").eq("class_id", groupId);
  const studentIds = (enrollmentRows ?? []).map((r) => r.student_id as string);
  const studentSlots = await fetchFreeSlotsByStudentIds(supabase, studentIds);
  const union = studentSlots.flat();
  const { data: studioRows } = await supabase
    .from("studio_availability_slots")
    .select("*")
    .eq("studio_id", studioId);
  const studioSlots: AvailabilitySlot[] = (studioRows ?? []).map((row) => ({
    date: row.date as string,
    startHour: row.start_hour as number,
    endHour: row.end_hour as number,
  }));
  const overlapHours = computeMultiPartyIntersection([union, studioSlots]).length;
  return { ok: true as const, overlapHours, warning: overlapHours < 2 };
}

export async function recomputeGroupMatchingState(groupId: string) {
  const { supabase } = await requireUser();
  const [{ data: group }, { data: enrollments }, { data: studioSelection }, { data: assignments }] = await Promise.all([
    supabase.from("classes").select("id,class_type_at_creation").eq("id", groupId).maybeSingle(),
    supabase.from("class_enrollments").select("student_id,availability_slots").eq("class_id", groupId),
    supabase.from("class_studio_selection").select("studio_id").eq("class_id", groupId).maybeSingle(),
    supabase
      .from("class_instructor_assignments")
      .select("instructor_id,status")
      .eq("class_id", groupId)
      .eq("status", "confirmed")
      .limit(1),
  ]);

  if (!group) return { ok: false as const, reason: "not_found" };
  const classType = (group.class_type_at_creation ?? undefined) as ClassType | undefined;
  const studentSlots = (enrollments ?? []).map((e) =>
    Array.isArray(e.availability_slots) ? (e.availability_slots as AvailabilitySlot[]) : [],
  );
  const confirmedInstructorId = assignments?.[0]?.instructor_id as string | undefined;
  if (!studioSelection?.studio_id || !confirmedInstructorId || studentSlots.length === 0) {
    await supabase
      .from("classes")
      .update({ matching_state: "matching", finalized_slot_blocks: "[]", golden_at: null })
      .eq("id", groupId);
    return { ok: true as const, matchingState: "matching", slots: [] as { date: string; hour: number }[] };
  }

  const [{ data: instructorRows }, { data: studioRows }] = await Promise.all([
    supabase.from("instructor_availability_slots").select("*").eq("instructor_id", confirmedInstructorId),
    supabase.from("studio_availability_slots").select("*").eq("studio_id", studioSelection.studio_id as string),
  ]);
  const instructorSlots: AvailabilitySlot[] = (instructorRows ?? []).map((row) => ({
    date: row.date as string,
    startHour: row.start_hour as number,
    endHour: row.end_hour as number,
  }));
  const studioSlots: AvailabilitySlot[] = (studioRows ?? []).map((row) => ({
    date: row.date as string,
    startHour: row.start_hour as number,
    endHour: row.end_hour as number,
  }));
  const matchedSlots = computeMultiPartyIntersection([...studentSlots, instructorSlots, studioSlots]);
  const golden = isGoldenForClassType(classType, matchedSlots);
  await supabase
    .from("classes")
    .update({
      matching_state: golden ? "golden" : "matching",
      golden_at: golden ? new Date().toISOString() : null,
      finalized_slot_blocks: JSON.stringify(matchedSlots),
    })
    .eq("id", groupId);
  return { ok: true as const, matchingState: golden ? "golden" : "matching", slots: matchedSlots };
}

export async function submitFinalAcceptance(groupId: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false as const, reason: "unauthorized" };
  const { data: me } = await supabase.from("profiles").select("app_role").eq("id", user.id).maybeSingle();
  const { data: group } = await supabase
    .from("classes")
    .select("accepted_by_students,accepted_by_instructor")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return { ok: false as const, reason: "not_found" };
  if (me?.app_role === "instructor") {
    await supabase.from("classes").update({ accepted_by_instructor: true }).eq("id", groupId);
  } else {
    const accepted = Array.isArray(group.accepted_by_students) ? (group.accepted_by_students as string[]) : [];
    const next = Array.from(new Set([...accepted, user.id]));
    await supabase.from("classes").update({ accepted_by_students: JSON.stringify(next) }).eq("id", groupId);
  }
  return { ok: true as const };
}

export async function finalizeGroupClass(groupId: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false as const, reason: "unauthorized" };
  const { data: me } = await supabase.from("profiles").select("app_role").eq("id", user.id).maybeSingle();
  if (me?.app_role !== "admin") return { ok: false as const, reason: "forbidden" };
  const { error } = await supabase
    .from("classes")
    .update({ matching_state: "fixed", fixed_at: new Date().toISOString(), final_payment_status: "paid" })
    .eq("id", groupId);
  if (error) return { ok: false as const, reason: "db", message: error.message };
  return { ok: true as const };
}
