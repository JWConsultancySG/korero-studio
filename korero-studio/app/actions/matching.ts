"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyStudentsLessonPaymentDue } from "@/app/actions/notifications";
import { computeMultiPartyIntersection, isGoldenForClassType } from "@/lib/matching-engine";
import { creditsForClass, isClassType, sgdForCredits, CLASS_LABELS, SGD_PER_CREDIT } from "@/lib/credits";
import type { AvailabilitySlot, ClassType, MatchedHourSlot } from "@/types";
import type Stripe from "stripe";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as null };
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

async function fetchFreeSlotsByStudentIds(supabase: SupabaseClient, ids: string[]) {
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
  const admin = createAdminClient();
  const studentSlots = await fetchFreeSlotsByStudentIds(admin, studentIds);
  const union = studentSlots.flat();
  const { data: studioRows } = await admin.from("studio_availability_slots").select("*").eq("studio_id", studioId);
  const studioSlots: AvailabilitySlot[] = (studioRows ?? []).map((row) => ({
    date: row.date as string,
    startHour: row.start_hour as number,
    endHour: row.end_hour as number,
    isConfirmedClass: Boolean((row as { is_confirmed_class?: boolean }).is_confirmed_class),
  }));
  const overlapHours = computeMultiPartyIntersection([union, studioSlots]).length;
  return { ok: true as const, overlapHours, warning: overlapHours < 2 };
}

export async function recomputeGroupMatchingState(groupId: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false as const, reason: "unauthorized" };

  const admin = createAdminClient();

  const [{ data: group }, { data: enrollments }, { data: studioSelection }, { data: assignments }] = await Promise.all([
    supabase
      .from("classes")
      .select("id,class_type_at_creation,max_members,matching_state,finalized_slot_blocks")
      .eq("id", groupId)
      .maybeSingle(),
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

  // Do not clobber states set after golden (instructor picked slots, or fully locked).
  const ms = group.matching_state as string | null | undefined;
  if (ms === "instructor_confirmed" || ms === "fixed") {
    const slots = Array.isArray(group.finalized_slot_blocks)
      ? (group.finalized_slot_blocks as MatchedHourSlot[])
      : [];
    return {
      ok: true as const,
      matchingState: ms as "instructor_confirmed" | "fixed",
      slots,
    };
  }
  const classType = (group.class_type_at_creation ?? undefined) as ClassType | undefined;
  const enrollmentRows = enrollments ?? [];
  const studentIds = enrollmentRows.map((e) => e.student_id as string);
  /** Service role so every enrolled student’s rows are visible; user-scoped client only returns own rows (RLS). */
  const liveSlotsPerStudent = await fetchFreeSlotsByStudentIds(admin, studentIds);
  const studentSlots = enrollmentRows.map((e, i) => {
    const live = liveSlotsPerStudent[i] ?? [];
    if (live.length > 0) return live;
    return Array.isArray(e.availability_slots) ? (e.availability_slots as AvailabilitySlot[]) : [];
  });
  const studentCount = studentSlots.length;
  const maxMembers = Number(group.max_members ?? 0);
  const isClassFull = maxMembers > 0 && studentCount >= maxMembers;
  const confirmedInstructorId = assignments?.[0]?.instructor_id as string | undefined;
  if (!studioSelection?.studio_id || studentSlots.length === 0) {
    await supabase
      .from("classes")
      .update({ matching_state: "matching", finalized_slot_blocks: [], golden_at: null })
      .eq("id", groupId);
    return { ok: true as const, matchingState: "matching", slots: [] as { date: string; hour: number }[] };
  }

  const [{ data: instructorRows }, { data: instructorStudentRows }, { data: studioRows }] = await Promise.all([
    confirmedInstructorId && isClassFull
      ? admin.from("instructor_availability_slots").select("*").eq("instructor_id", confirmedInstructorId)
      : Promise.resolve({ data: [] }),
    confirmedInstructorId && isClassFull
      ? admin
          .from("student_availability_slots")
          .select("date,start_hour,end_hour,is_confirmed_class,confirmed_class_id")
          .eq("student_id", confirmedInstructorId)
      : Promise.resolve({ data: [] }),
    admin.from("studio_availability_slots").select("*").eq("studio_id", studioSelection.studio_id as string),
  ]);
  const instructorDirectSlots: AvailabilitySlot[] = (instructorRows ?? []).map((row) => ({
    date: row.date as string,
    startHour: row.start_hour as number,
    endHour: row.end_hour as number,
    isConfirmedClass: Boolean((row as { is_confirmed_class?: boolean }).is_confirmed_class),
  }));
  const instructorFallbackSlots: AvailabilitySlot[] = (instructorStudentRows ?? [])
    .filter((row) => !Boolean(row.is_confirmed_class))
    .map((row) => ({
      date: row.date as string,
      startHour: row.start_hour as number,
      endHour: row.end_hour as number,
    }));
  // Prefer instructor_availability_slots; if that table only has locked/confirmed blocks, use My Schedule fallback.
  const instructorDirectFree = instructorDirectSlots.filter((s) => !s.isConfirmedClass);
  const instructorSlots =
    instructorDirectFree.length > 0 ? instructorDirectSlots : instructorFallbackSlots;
  const studioSlots: AvailabilitySlot[] = (studioRows ?? []).map((row) => ({
    date: row.date as string,
    startHour: row.start_hour as number,
    endHour: row.end_hour as number,
    isConfirmedClass: Boolean((row as { is_confirmed_class?: boolean }).is_confirmed_class),
  }));
  const participants: AvailabilitySlot[][] = [...studentSlots, studioSlots];
  if (confirmedInstructorId && isClassFull) participants.push(instructorSlots);
  const matchedSlots = computeMultiPartyIntersection(participants);
  const golden = isGoldenForClassType(classType, matchedSlots);
  await supabase
    .from("classes")
    .update({
      matching_state: golden ? "golden" : "matching",
      golden_at: golden ? new Date().toISOString() : null,
      finalized_slot_blocks: matchedSlots,
    })
    .eq("id", groupId);
  return { ok: true as const, matchingState: golden ? "golden" : "matching", slots: matchedSlots };
}

export async function recomputeMatchingForCurrentUserEnrollments() {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false as const, reason: "unauthorized" };
  const { data: enrollments } = await supabase
    .from("class_enrollments")
    .select("class_id")
    .eq("student_id", user.id);
  const classIds = Array.from(new Set((enrollments ?? []).map((e) => e.class_id as string))).filter(Boolean);
  for (const classId of classIds) {
    await recomputeGroupMatchingState(classId);
  }
  return { ok: true as const, count: classIds.length };
}

export async function recomputeMatchingForStudio(studioId: string) {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false as const, reason: "unauthorized" };
  const { data: linked } = await supabase
    .from("class_studio_selection")
    .select("class_id")
    .eq("studio_id", studioId);
  const classIds = Array.from(new Set((linked ?? []).map((r) => r.class_id as string))).filter(Boolean);
  for (const classId of classIds) {
    await recomputeGroupMatchingState(classId);
  }
  return { ok: true as const, count: classIds.length };
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

function slotKey(s: MatchedHourSlot) {
  return `${s.date}|${s.hour}`;
}

export async function selectLessonSlots(classId: string, selectedSlots: MatchedHourSlot[]) {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false as const, reason: "unauthorized" };

  const admin = createAdminClient();

  const [{ data: group }, { data: assignment }, { data: confirmedInstructorRow }, { data: enrollments }] =
    await Promise.all([
      supabase
        .from("classes")
        .select("id,matching_state,finalized_slot_blocks,required_match_hours,class_type_at_creation,song_title,artist")
        .eq("id", classId)
        .maybeSingle(),
      supabase
        .from("class_instructor_assignments")
        .select("instructor_id,status")
        .eq("class_id", classId)
        .eq("status", "confirmed")
        .eq("instructor_id", user.id)
        .maybeSingle(),
      supabase
        .from("class_instructor_assignments")
        .select("instructor_id")
        .eq("class_id", classId)
        .eq("status", "confirmed")
        .maybeSingle(),
      supabase.from("class_enrollments").select("student_id").eq("class_id", classId),
    ]);

  if (!group) return { ok: false as const, reason: "not_found" };

  const me = await supabase.from("profiles").select("app_role").eq("id", user.id).maybeSingle();
  const isInstructor = assignment?.status === "confirmed";
  const isAdminUser = me.data?.app_role === "admin";
  if (!isInstructor && !isAdminUser) {
    return { ok: false as const, reason: "forbidden" };
  }

  if (group.matching_state !== "golden") {
    return { ok: false as const, reason: "not_golden" };
  }

  const requiredHours = Number(group.required_match_hours ?? 0);
  if (selectedSlots.length !== requiredHours) {
    return { ok: false as const, reason: "wrong_count", expected: requiredHours };
  }

  const finalized = Array.isArray(group.finalized_slot_blocks)
    ? (group.finalized_slot_blocks as MatchedHourSlot[])
    : [];
  const finalizedKeys = new Set(finalized.map(slotKey));
  const allSubset = selectedSlots.every((s) => finalizedKeys.has(slotKey(s)));
  if (!allSubset) {
    return { ok: false as const, reason: "invalid_slots" };
  }

  const studentIds = (enrollments ?? []).map((e) => e.student_id as string);
  const payments: Record<string, "pending" | "paid"> = {};
  for (const id of studentIds) payments[id] = "pending";

  const { error } = await admin
    .from("classes")
    .update({
      matching_state: "instructor_confirmed",
      selected_lesson_slots: selectedSlots,
      student_payments: payments,
    })
    .eq("id", classId);

  if (error) return { ok: false as const, reason: "db", message: error.message };

  const instructorUserId = confirmedInstructorRow?.instructor_id as string | undefined;
  const notifyIds = studentIds.filter((id) => id !== instructorUserId);
  const notifyResult = await notifyStudentsLessonPaymentDue({
    classId,
    songTitle: (group.song_title as string) ?? "",
    artist: (group.artist as string) ?? "",
    studentIds: notifyIds,
  });
  if (!notifyResult.ok) {
    console.error("[korero] selectLessonSlots: student notify failed", notifyResult.reason);
  }

  return {
    ok: true as const,
    studentsNotified: notifyResult.ok ? notifyResult.inserted : 0,
    notifyFailed: !notifyResult.ok,
  };
}

/** Called from Stripe webhook / verify-session after Checkout for lesson confirmation. */
export async function fulfillLessonConfirmFromStripeSession(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.payment_status !== "paid") return;

  const meta = session.metadata ?? {};
  if (meta.fulfillment_kind !== "lesson_confirm") return;

  const profileId = meta.profile_id;
  const classId = meta.class_id;
  const creditsStr = meta.credits;
  if (typeof profileId !== "string" || typeof classId !== "string" || typeof creditsStr !== "string") {
    console.error("[korero] fulfill lesson_confirm: missing metadata", session.id);
    return;
  }

  const cost = parseInt(creditsStr, 10);
  if (!Number.isFinite(cost) || cost < 1) {
    console.error("[korero] fulfill lesson_confirm: bad credits", session.id);
    return;
  }

  const amountTotal = session.amount_total;
  const expectedCents = Math.round(cost * SGD_PER_CREDIT * 100);
  if (amountTotal == null || amountTotal !== expectedCents) {
    console.error("[korero] fulfill lesson_confirm: amount mismatch", session.id, amountTotal, expectedCents);
    return;
  }

  const { data: existingLedger } = await admin
    .from("credit_transactions")
    .select("id")
    .eq("payment_ref", session.id)
    .maybeSingle();
  if (existingLedger) return;

  const { data: group } = await admin
    .from("classes")
    .select("id,matching_state,student_payments,class_type_at_creation,song_title")
    .eq("id", classId)
    .maybeSingle();

  if (!group || group.matching_state !== "instructor_confirmed") {
    console.error("[korero] fulfill lesson_confirm: class not ready", classId);
    return;
  }

  const payments = (group.student_payments ?? {}) as Record<string, "pending" | "paid">;
  if (!(profileId in payments)) {
    console.error("[korero] fulfill lesson_confirm: not enrolled", classId, profileId);
    return;
  }

  const payStatus = payments[profileId];
  if (payStatus !== "pending" && payStatus !== "paid") {
    console.error("[korero] fulfill lesson_confirm: unexpected payment status", classId, profileId, payStatus);
    return;
  }

  const classType = group.class_type_at_creation;
  if (!isClassType(classType) || creditsForClass(classType) !== cost) {
    console.error("[korero] fulfill lesson_confirm: class type / cost mismatch", classId);
    return;
  }

  const songTitle = (group.song_title as string)?.trim() || "Class";

  if (payStatus === "pending") {
    payments[profileId] = "paid";
    const allPaid = Object.values(payments).every((v) => v === "paid");

    await admin.from("classes").update({ student_payments: payments }).eq("id", classId);

    if (allPaid) {
      await lockClassSlots(classId);
    }
  }

  const { error: insErr } = await admin.from("credit_transactions").insert({
    profile_id: profileId,
    kind: "lesson_confirm",
    credits_delta: 0,
    sgd_delta: sgdForCredits(cost),
    label: `Lesson confirmation (Stripe) · ${CLASS_LABELS[classType]} · "${songTitle}"`,
    class_id: classId,
    class_type: classType,
    payment_ref: session.id,
  });

  if (insErr) {
    if (insErr.code === "23505") return;
    console.error("[korero] fulfill lesson_confirm: ledger insert", insErr);
  }
}

export async function confirmStudentPayment(classId: string) {
  const { user } = await requireUser();
  if (!user) return { ok: false as const, reason: "unauthorized" as const };

  const admin = createAdminClient();

  const { data: group } = await admin
    .from("classes")
    .select("id,matching_state,student_payments,class_type_at_creation,song_title")
    .eq("id", classId)
    .maybeSingle();

  if (!group) return { ok: false as const, reason: "not_found" as const };
  if (group.matching_state !== "instructor_confirmed") {
    return { ok: false as const, reason: "not_instructor_confirmed" as const };
  }

  const classType = group.class_type_at_creation;
  if (!isClassType(classType)) {
    return { ok: false as const, reason: "bad_class_type" as const };
  }

  const cost = creditsForClass(classType);
  const payments = (group.student_payments ?? {}) as Record<string, "pending" | "paid">;
  if (!(user.id in payments)) {
    return { ok: false as const, reason: "not_enrolled" as const };
  }
  if (payments[user.id] === "paid") {
    return {
      ok: true as const,
      alreadyPaid: true,
      allPaid: Object.values(payments).every((v) => v === "paid"),
    };
  }

  const { data: profile } = await admin.from("profiles").select("credits").eq("id", user.id).single();
  const balance = (profile?.credits as number) ?? 0;

  if (balance < cost) {
    return {
      ok: false as const,
      reason: "needs_payment" as const,
      costCredits: cost,
      balance,
      classId,
    };
  }

  const songTitle = (group.song_title as string)?.trim() || "Class";
  const newBalance = balance - cost;
  await admin.from("profiles").update({ credits: newBalance }).eq("id", user.id);

  await admin.from("credit_transactions").insert({
    profile_id: user.id,
    kind: "lesson_confirm",
    credits_delta: -cost,
    label: `Lesson confirmation · ${CLASS_LABELS[classType]} · "${songTitle}" (${cost} credits)`,
    class_id: classId,
    class_type: classType,
    payment_ref: null,
  });

  payments[user.id] = "paid";
  const allPaid = Object.values(payments).every((v) => v === "paid");

  await admin.from("classes").update({ student_payments: payments }).eq("id", classId);

  if (allPaid) {
    await lockClassSlots(classId);
  }

  return { ok: true as const, alreadyPaid: false, allPaid };
}

export async function lockClassSlots(classId: string) {
  const admin = createAdminClient();

  const [{ data: group }, { data: studioSel }, { data: enrollments }, { data: assignment }] =
    await Promise.all([
      admin
        .from("classes")
        .select("id,selected_lesson_slots,class_type_at_creation")
        .eq("id", classId)
        .maybeSingle(),
      admin
        .from("class_studio_selection")
        .select("studio_id")
        .eq("class_id", classId)
        .maybeSingle(),
      admin.from("class_enrollments").select("student_id").eq("class_id", classId),
      admin
        .from("class_instructor_assignments")
        .select("instructor_id")
        .eq("class_id", classId)
        .eq("status", "confirmed")
        .maybeSingle(),
    ]);

  if (!group) return { ok: false as const, reason: "not_found" };
  const slots = Array.isArray(group.selected_lesson_slots)
    ? (group.selected_lesson_slots as MatchedHourSlot[])
    : [];
  if (slots.length === 0) return { ok: false as const, reason: "no_slots" };

  const studioId = studioSel?.studio_id as string | undefined;
  const instructorId = assignment?.instructor_id as string | undefined;
  const studentIds = (enrollments ?? []).map((e) => e.student_id as string);
  const now = new Date().toISOString();

  const sessionRows = slots.map((s) => {
    const startAt = `${s.date}T${String(s.hour).padStart(2, "0")}:00:00`;
    const endHour = s.hour + 1;
    const endAt = `${s.date}T${String(endHour).padStart(2, "0")}:00:00`;
    return {
      class_id: classId,
      room: "Farrer Park" as const,
      start_at: startAt,
      end_at: endAt,
      confirmed: true,
      studio_id: studioId ?? null,
    };
  });
  await admin.from("class_sessions").insert(sessionRows);

  for (const studentId of studentIds) {
    for (const s of slots) {
      await admin.from("student_availability_slots").insert({
        student_id: studentId,
        date: s.date,
        start_hour: s.hour,
        end_hour: s.hour + 1,
        is_confirmed_class: true,
        confirmed_class_id: classId,
      });
    }
  }

  // Instructors manage "My Schedule" in student_availability_slots; matching also falls back to that
  // when instructor_availability_slots is empty. Mirror student locks so the UI shows confirmed hours.
  if (instructorId && !studentIds.includes(instructorId)) {
    for (const s of slots) {
      await admin.from("student_availability_slots").insert({
        student_id: instructorId,
        date: s.date,
        start_hour: s.hour,
        end_hour: s.hour + 1,
        is_confirmed_class: true,
        confirmed_class_id: classId,
      });
    }
  }

  // Rows are [start_hour, end_hour) ranges; match any block that contains this hour (not only start_hour === hour).

  if (instructorId) {
    for (const s of slots) {
      await admin
        .from("instructor_availability_slots")
        .update({
          is_confirmed_class: true,
          confirmed_class_id: classId,
        })
        .eq("instructor_id", instructorId)
        .eq("date", s.date)
        .lte("start_hour", s.hour)
        .gt("end_hour", s.hour);
    }
  }

  if (studioId) {
    for (const s of slots) {
      await admin
        .from("studio_availability_slots")
        .update({
          is_confirmed_class: true,
          confirmed_class_id: classId,
        })
        .eq("studio_id", studioId)
        .eq("date", s.date)
        .lte("start_hour", s.hour)
        .gt("end_hour", s.hour);
    }
  }

  await admin
    .from("classes")
    .update({
      matching_state: "fixed",
      fixed_at: now,
      final_payment_status: "paid",
    })
    .eq("id", classId);

  return { ok: true as const };
}

export async function cancelClass(classId: string, reason: string) {
  const { user } = await requireUser();
  if (!user) return { ok: false as const, reason: "unauthorized" };

  const admin = createAdminClient();

  const { data: me } = await admin.from("profiles").select("app_role").eq("id", user.id).maybeSingle();
  if (me?.app_role !== "admin") return { ok: false as const, reason: "forbidden" };

  const { data: group } = await admin
    .from("classes")
    .select("id,matching_state,credits_charged,class_type_at_creation")
    .eq("id", classId)
    .maybeSingle();
  if (!group) return { ok: false as const, reason: "not_found" };

  await admin.from("class_sessions").delete().eq("class_id", classId);

  await admin
    .from("student_availability_slots")
    .update({ is_confirmed_class: false, confirmed_class_id: null })
    .eq("confirmed_class_id", classId);

  await admin
    .from("instructor_availability_slots")
    .update({ is_confirmed_class: false, confirmed_class_id: null })
    .eq("confirmed_class_id", classId);

  await admin
    .from("studio_availability_slots")
    .update({ is_confirmed_class: false, confirmed_class_id: null })
    .eq("confirmed_class_id", classId);

  const { data: enrollments } = await admin
    .from("class_enrollments")
    .select("student_id")
    .eq("class_id", classId);

  const creditsToRefund = Number(group.credits_charged ?? 0);
  if (creditsToRefund > 0 && enrollments) {
    for (const e of enrollments) {
      const sid = e.student_id as string;
      const { data: profile } = await admin
        .from("profiles")
        .select("credits")
        .eq("id", sid)
        .single();
      const currentCredits = (profile?.credits as number) ?? 0;
      await admin
        .from("profiles")
        .update({ credits: currentCredits + creditsToRefund })
        .eq("id", sid);
      await admin.from("credit_transactions").insert({
        profile_id: sid,
        kind: "adjustment",
        credits_delta: creditsToRefund,
        label: `Refund: class cancelled — ${reason}`,
        class_id: classId,
        class_type: group.class_type_at_creation,
      });
    }
  }

  const now = new Date().toISOString();
  await admin
    .from("classes")
    .update({
      matching_state: "matching",
      fixed_at: null,
      final_payment_status: "pending",
      selected_lesson_slots: [],
      student_payments: {},
      cancelled_at: now,
      cancellation_reason: reason,
    })
    .eq("id", classId);

  return { ok: true as const };
}
