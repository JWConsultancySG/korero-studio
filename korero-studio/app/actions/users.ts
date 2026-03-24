"use server";

import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types";

export type UpdateUserAppRoleResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" | "forbidden" | "invalid" | "db"; message?: string };

export async function updateUserAppRole(targetUserId: string, role: AppRole): Promise<UpdateUserAppRoleResult> {
  const allowed: AppRole[] = ["student", "instructor", "admin"];
  if (!allowed.includes(role)) {
    return { ok: false, error: "invalid" };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { ok: false, error: "unauthorized" };
  }

  const { data: me, error: meErr } = await supabase.from("profiles").select("app_role").eq("id", user.id).maybeSingle();
  if (meErr || me?.app_role !== "admin") {
    return { ok: false, error: "forbidden" };
  }

  const { error } = await supabase.from("profiles").update({ app_role: role }).eq("id", targetUserId);
  if (error) {
    return { ok: false, error: "db", message: error.message };
  }

  return { ok: true };
}
