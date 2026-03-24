"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { updateUserAppRole } from "@/app/actions/users";
import type { AppRole } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminTutorialCallout } from "@/components/admin/AdminTutorialCallout";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  app_role: AppRole;
};

const ROLE_LABELS: Record<AppRole, string> = {
  student: "Student",
  instructor: "Instructor",
  admin: "Admin",
};

export default function AdminUserManagementPanel() {
  const { student, refreshApp } = useApp();
  const router = useRouter();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, app_role")
      .order("email", { ascending: true });
    if (error) {
      toast.error(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as ProfileRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRoleChange = async (targetId: string, role: AppRole) => {
    const prev = rows.find((r) => r.id === targetId)?.app_role;
    const result = await updateUserAppRole(targetId, role);
    if (!result.ok) {
      toast.error(
        result.error === "forbidden"
          ? "You don’t have permission to change roles."
          : result.message ?? "Could not update role.",
      );
      return;
    }
    toast.success("Role updated.");
    setRows((r) => r.map((row) => (row.id === targetId ? { ...row, app_role: role } : row)));

    if (targetId === student?.id && prev === "admin" && role !== "admin") {
      await refreshApp();
      router.push("/groups");
      return;
    }
    if (targetId === student?.id) {
      await refreshApp();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading users…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminTutorialCallout title="User roles">
        <p>
          Each account has one role: <strong>Student</strong>, <strong>Instructor</strong>, or <strong>Admin</strong>.
          Only <strong>Admin</strong> can open this console and manage catalog, classes, and rooms.
        </p>
        <p>
          Your first admin must be set in the Supabase SQL editor:{" "}
          <code className="text-xs bg-muted px-1 rounded">
            UPDATE profiles SET app_role = &apos;admin&apos; WHERE email = &apos;…&apos;;
          </code>
        </p>
      </AdminTutorialCallout>

      <div className="rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left font-black p-3">Email</th>
              <th className="text-left font-black p-3 hidden sm:table-cell">Name</th>
              <th className="text-left font-black p-3 w-[140px]">Role</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-0">
                <td className="p-3 font-mono text-xs break-all">{row.email || "—"}</td>
                <td className="p-3 hidden sm:table-cell">{row.full_name || "—"}</td>
                <td className="p-3">
                  <Select
                    value={row.app_role}
                    onValueChange={(v) => void onRoleChange(row.id, v as AppRole)}
                  >
                    <SelectTrigger className="h-9 rounded-xl text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABELS) as AppRole[]).map((key) => (
                        <SelectItem key={key} value={key}>
                          {ROLE_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
