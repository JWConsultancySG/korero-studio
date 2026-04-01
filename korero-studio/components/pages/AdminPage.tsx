"use client";

import { Suspense, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/context/AppContext";
import type { ReviewClassRequestPayload } from "@/context/AppContext";
import { useRouter, useSearchParams } from "next/navigation";
import type { AdminTabId } from "@/lib/nav";
import { parseAdminTab } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Music,
  CheckCircle,
  XCircle,
  ArrowLeft,
  AlertTriangle,
  LogOut,
  TrendingUp,
  Sparkles,
  Zap,
  ExternalLink,
  Loader2,
  Mail,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { CLASS_LABELS } from "@/lib/credits";
import type { SongGroup } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClassRequestReviewForm } from "@/components/admin/ClassRequestReviewForm";
import AdminAvailabilityMatcher from "@/components/admin/AdminAvailabilityMatcher";
import AdminSongLibraryPanel from "@/components/admin/AdminSongLibraryPanel";
import AdminClassListingsPanel from "@/components/admin/AdminClassListingsPanel";
import AdminWhatsAppPanel from "@/components/admin/AdminWhatsAppPanel";
import { AdminTutorialCallout } from "@/components/admin/AdminTutorialCallout";
import AdminUserManagementPanel from "@/components/admin/AdminUserManagementPanel";
import AdminStudiosPanel from "@/components/admin/AdminStudiosPanel";
import { KoreroLogo } from "@/components/KoreroLogo";

function AdminDataLoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 pb-28 md:pb-10 gradient-purple-subtle">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col items-center gap-5 text-center max-w-sm"
      >
        <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center ring-1 ring-border overflow-hidden">
          <KoreroLogo imgClassName="w-full h-full object-cover opacity-40" />
          <Loader2 className="absolute w-8 h-8 animate-spin text-primary" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-black text-foreground">Loading admin console…</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Syncing your account and studio data. This screen stays up until the database load finishes.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

const ADMIN_SECTIONS: Record<
  AdminTabId,
  { title: string; subtitle: string }
> = {
  overview: { title: "Dashboard", subtitle: "Overview, alerts, and quick actions" },
  users: { title: "Users", subtitle: "Assign student, instructor, or admin roles" },
  classes: {
    title: "Class listings",
    subtitle: "Full class detail, members, sessions — edit or remove listings as needed",
  },
  library: { title: "Song library", subtitle: "Validated songs — formation & roles reused for new class listings" },
  rooms: { title: "Studio rooms", subtitle: "Manage studios and publish room availability" },
  matcher: {
    title: "Availability matcher",
    subtitle: "Heatmap, ranked slots, and per-member availability for each class",
  },
};

function AdminDashboardInner() {
  const {
    isAdmin,
    authSessionReady,
    authUser,
    dataLoading,
    logoutAdmin,
    syncStudentFromAuth,
    groups,
    pendingGroups,
    bookings,
    adminAlerts,
    approveClassRequest,
  } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseAdminTab(searchParams);
  const goToTab = useCallback(
    (next: AdminTabId) => {
      router.replace(`/admin?tab=${next}`, { scroll: false });
    },
    [router],
  );
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminSigningIn, setAdminSigningIn] = useState(false);
  const [reviewingGroup, setReviewingGroup] = useState<SongGroup | null>(null);

  const pendingReviewGroups = useMemo(
    () => groups.filter((g) => g.awaitingAdminReview),
    [groups],
  );

  if (!authSessionReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="w-9 h-9 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading session…</p>
      </div>
    );
  }

  /** Avoid “Not an admin” flash: auth clears isAdmin before Korero data (and real app_role) is loaded. */
  if (authUser && dataLoading) {
    return <AdminDataLoadingScreen />;
  }

  if (!isAdmin) {
    if (authUser) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6 pb-28 md:pb-10 gradient-purple-subtle">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md text-center"
          >
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl ring-1 ring-border overflow-hidden">
              <KoreroLogo imgClassName="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl font-black text-foreground mb-2">Not an admin account</h1>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              You&apos;re signed in as <span className="font-mono text-xs">{authUser.email}</span>, which isn&apos;t the
              shared studio admin. Sign out and use the admin account, or open{" "}
              <Link href="/browse" className="text-primary font-bold underline underline-offset-4">
                Browse
              </Link>{" "}
              as a student.
            </p>
            <Button onClick={() => logoutAdmin()} className="rounded-2xl font-bold gradient-purple text-primary-foreground">
              Sign out
            </Button>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center px-6 pb-28 md:pb-10 gradient-purple-subtle">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xs md:max-w-md"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium mb-8 btn-press"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-16 h-16 rounded-2xl mx-auto mb-6 ring-1 ring-border overflow-hidden"
          >
            <KoreroLogo imgClassName="w-full h-full object-cover" />
          </motion.div>

          <h1 className="text-2xl font-black mb-1.5 text-foreground text-center">Admin sign in</h1>
          <p className="text-sm text-muted-foreground mb-6 text-center leading-relaxed">
            Sign in with the studio admin account. Need access? Ask whoever runs Korero for your studio.
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const email = adminEmail.trim().toLowerCase();
              if (!email || adminPassword.length < 6) {
                toast.error("Enter email and password (min 6 characters)");
                return;
              }
              setAdminSigningIn(true);
              try {
                const supabase = createClient();
                const { data, error } = await supabase.auth.signInWithPassword({
                  email,
                  password: adminPassword,
                });
                if (error) throw error;
                const user = data.user;
                if (!user) {
                  toast.error("Could not sign in");
                  return;
                }
                const { data: prof } = await supabase.from("profiles").select("app_role").eq("id", user.id).maybeSingle();
                if (prof?.app_role !== "admin") {
                  await supabase.auth.signOut();
                  toast.error("This account doesn’t have admin access.");
                  return;
                }
                const meta = user.user_metadata as Record<string, unknown> | undefined;
                const nameFromMeta =
                  typeof meta?.full_name === "string" ? meta.full_name : (user.email?.split("@")[0] ?? "Admin");
                const whatsapp = typeof meta?.whatsapp === "string" ? meta.whatsapp : "";
                syncStudentFromAuth({
                  id: user.id,
                  name: nameFromMeta,
                  whatsapp,
                  email: user.email ?? email,
                  appRole: "admin",
                });
                router.replace("/admin?tab=overview");
                toast.success("Welcome back");
                setAdminPassword("");
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Sign in failed");
              } finally {
                setAdminSigningIn(false);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-xs font-bold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email
              </Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="studio@yourdomain.com"
                className="h-12 rounded-2xl border-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-xs font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Password
              </Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 rounded-2xl border-2"
              />
            </div>
            <Button
              type="submit"
              disabled={adminSigningIn}
              className="w-full h-13 rounded-2xl font-black gradient-purple text-primary-foreground btn-press"
            >
              {adminSigningIn ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in <ArrowLeft className="w-4 h-4 rotate-180" />
                </span>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground pt-2">
              Student login:{" "}
              <Link href="/login" className="text-primary font-bold underline underline-offset-4">
                /login
              </Link>
            </p>
          </form>
        </motion.div>
      </div>
    );
  }

  const totalStudents = bookings.length;
  const confirmedGroups = groups.filter((g) => g.status === "confirmed").length;
  const nearThreshold = groups.filter(
    (g) => g.status === "forming" && g.interestCount >= g.maxMembers - 1 && !g.awaitingAdminReview,
  );
  const totalInterest = groups.reduce((sum, g) => sum + g.interestCount, 0);

  const section = ADMIN_SECTIONS[tab];

  const handleReviewSubmit = async (payload: ReviewClassRequestPayload) => {
    await approveClassRequest(payload);
    toast.success(`Class request approved — "${payload.songTitle}" is now live for students.`);
    setReviewingGroup(null);
  };

  const openReview = (g: SongGroup) => setReviewingGroup(g);

  return (
    <div className="min-h-screen pb-28 md:pb-10">
      <div className="gradient-purple-subtle px-5 pt-5 pb-4 md:px-8 md:pt-8 md:pb-6">
        <div className="content-max flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Admin console</p>
            <h1 className="text-xl md:text-2xl font-black text-foreground leading-tight">{section.title}</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">{section.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-xl font-bold">
              <Link href="/browse/new?asAdmin=1">
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> New class
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={logoutAdmin} className="btn-press text-muted-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 content-max pt-2 md:pt-4">
        {tab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <AdminTutorialCallout title="Welcome to the admin console" defaultOpen>
              <p>
                Use the sidebar (or bottom nav on mobile) to move between <strong>Dashboard</strong>,{" "}
                <strong>Classes</strong>, <strong>Song library</strong>, <strong>Rooms</strong>, and{" "}
                <strong>Matcher</strong>. Everything here is the local demo state unless you connect a backend.
              </p>
              <p>
                Typical flow: validate new songs from <strong>Classes</strong>, keep the{" "}
                <strong>Song library</strong> accurate, then use <strong>Matcher</strong> to coordinate members before
                locking times in <strong>Rooms</strong>.
              </p>
            </AdminTutorialCallout>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4">
              {[
                { label: "Total listings", value: groups.length, icon: Music, color: "text-primary" },
                { label: "Confirmed", value: confirmedGroups, icon: CheckCircle, color: "text-emerald-600" },
                { label: "Bookings", value: totalStudents, icon: Users, color: "text-primary" },
                { label: "Total interest", value: totalInterest, icon: TrendingUp, color: "text-primary" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="card-premium p-4"
                >
                  <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                  <p className="text-3xl font-black text-foreground">{stat.value}</p>
                  <p className="text-[11px] font-bold text-muted-foreground mt-0.5">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {(adminAlerts.length > 0 || pendingReviewGroups.length > 0) && (
              <div className="card-premium p-4 border-l-4 border-l-amber-500">
                <p className="font-black text-sm text-foreground mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Class request review needed
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  {pendingReviewGroups.length} class listing(s) waiting for admin review. Open Classes to approve.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-xl font-bold"
                  onClick={() => goToTab("classes")}
                >
                  Open classes
                </Button>
              </div>
            )}

            {pendingGroups.length > 0 && (
              <div className="card-premium p-4 border-l-4 border-l-primary">
                <p className="font-black text-sm text-foreground mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {pendingGroups.length} legacy pending approval
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-xl font-bold mt-2"
                  onClick={() => goToTab("classes")}
                >
                  Open class listings
                </Button>
              </div>
            )}

            {nearThreshold.length > 0 && (
              <div className="card-premium p-4 border-l-4 border-l-destructive">
                <p className="font-black text-sm text-foreground mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" /> Almost full
                </p>
                {nearThreshold.map((g) => (
                  <p key={g.id} className="text-xs text-muted-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3 text-primary" /> {g.songTitle} — {g.interestCount}/{g.maxMembers} members
                  </p>
                ))}
              </div>
            )}

            <AdminWhatsAppPanel />
          </motion.div>
        )}

        {tab === "users" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <AdminUserManagementPanel />
          </motion.div>
        )}

        {tab === "classes" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <AdminClassListingsPanel onReviewClassRequest={openReview} />
          </motion.div>
        )}

        {tab === "library" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <AdminSongLibraryPanel />
          </motion.div>
        )}

        {tab === "rooms" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <AdminStudiosPanel />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Edit and publish room availability here. Matching uses shared availability across members, instructor, and studio.
            </p>
          </motion.div>
        )}

        {tab === "matcher" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <AdminAvailabilityMatcher />
          </motion.div>
        )}
      </div>

      <Dialog open={reviewingGroup !== null} onOpenChange={(o) => !o && setReviewingGroup(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Review class request</DialogTitle>
          </DialogHeader>
          {reviewingGroup && (
            <ClassRequestReviewForm
              group={reviewingGroup}
              onSubmit={handleReviewSubmit}
              onCancel={() => setReviewingGroup(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
          <Loader2 className="w-9 h-9 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <AdminDashboardInner />
    </Suspense>
  );
}
