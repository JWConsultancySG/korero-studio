"use client";

import { Suspense, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/context/AppContext";
import type { ValidateSongPayload } from "@/context/AppContext";
import { useRouter, useSearchParams } from "next/navigation";
import type { AdminTabId } from "@/lib/nav";
import { parseAdminTab } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import { isAdminUser } from "@/lib/admin-auth";
import {
  Users,
  Music,
  CheckCircle,
  XCircle,
  ArrowLeft,
  AlertTriangle,
  LogOut,
  TrendingUp,
  Shield,
  Sparkles,
  Zap,
  ClipboardCheck,
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
import { SongValidationForm } from "@/components/admin/SongValidationForm";
import AdminAvailabilityMatcher from "@/components/admin/AdminAvailabilityMatcher";
import AdminSongLibraryPanel from "@/components/admin/AdminSongLibraryPanel";
import AdminClassListingsPanel from "@/components/admin/AdminClassListingsPanel";
import AdminWhatsAppPanel from "@/components/admin/AdminWhatsAppPanel";
import { AdminTutorialCallout } from "@/components/admin/AdminTutorialCallout";
import StudioRoomsTimetable from "@/components/schedule/StudioRoomsTimetable";

const ADMIN_SECTIONS: Record<
  AdminTabId,
  { title: string; subtitle: string }
> = {
  overview: { title: "Dashboard", subtitle: "Overview, alerts, and quick actions" },
  classes: {
    title: "Class listings",
    subtitle: "Full class detail, members, sessions — edit or remove listings as needed",
  },
  library: { title: "Song library", subtitle: "Validated songs — formation & roles reused for new groups" },
  validate: { title: "Song validation", subtitle: "Complete iTunes profile and activate listings" },
  rooms: { title: "Studio rooms", subtitle: "Farrer Park & Orchard — timetable and assignments" },
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
    logoutAdmin,
    syncStudentFromAuth,
    groups,
    pendingGroups,
    bookings,
    adminAlerts,
    validateSong,
    dismissAdminAlert,
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
  const [validatingGroup, setValidatingGroup] = useState<SongGroup | null>(null);

  const pendingValidationGroups = useMemo(
    () => groups.filter((g) => g.awaitingSongValidation),
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

  if (!isAdmin) {
    if (authUser) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6 pb-28 md:pb-10 gradient-purple-subtle">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md text-center"
          >
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-black text-foreground mb-2">Not an admin account</h1>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              You&apos;re signed in as <span className="font-mono text-xs">{authUser.email}</span>, which isn&apos;t the
              shared studio admin. Sign out and use the admin account, or open{" "}
              <Link href="/groups" className="text-primary font-bold underline underline-offset-4">
                Groups
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
            className="w-16 h-16 rounded-2xl gradient-purple-deep flex items-center justify-center mx-auto mb-6 glow-purple"
          >
            <Shield className="w-7 h-7 text-primary-foreground" />
          </motion.div>

          <h1 className="text-2xl font-black mb-1.5 text-foreground text-center">Admin sign in</h1>
          <p className="text-sm text-muted-foreground mb-2 text-center">Use the shared Supabase admin account</p>
          <p className="text-[11px] text-muted-foreground text-center mb-6 leading-relaxed">
            Create a user in Supabase (Authentication → Users) and set{" "}
            <span className="font-mono text-[10px]">NEXT_PUBLIC_ADMIN_EMAIL</span> in{" "}
            <span className="font-mono text-[10px]">.env.local</span> to that user&apos;s email, or set{" "}
            <span className="font-mono text-[10px]">app_metadata.korero_admin: true</span> on the user.
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
                if (!isAdminUser(user)) {
                  await supabase.auth.signOut();
                  toast.error("This account is not configured as studio admin");
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
    (g) => g.status === "forming" && g.interestCount >= g.maxMembers - 1 && !g.awaitingSongValidation,
  );
  const totalInterest = groups.reduce((sum, g) => sum + g.interestCount, 0);

  const section = ADMIN_SECTIONS[tab];

  const handleValidateSubmit = (payload: ValidateSongPayload) => {
    validateSong(payload);
    toast.success(`Song validated — "${payload.songTitle}" is live for students.`);
    setValidatingGroup(null);
  };

  const openValidation = (g: SongGroup) => setValidatingGroup(g);

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
              <Link href="/groups/new?asAdmin=1">
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
                <strong>Classes</strong>, <strong>Song library</strong>, <strong>Validation</strong>,{" "}
                <strong>Rooms</strong>, and <strong>Matcher</strong>. Everything here is the local demo state unless you
                connect a backend.
              </p>
              <p>
                Typical flow: validate new songs under <strong>Validation</strong>, keep the <strong>Song library</strong>{" "}
                accurate, then use <strong>Classes</strong> and <strong>Matcher</strong> to coordinate members before
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

            {(adminAlerts.length > 0 || pendingValidationGroups.length > 0) && (
              <div className="card-premium p-4 border-l-4 border-l-amber-500">
                <p className="font-black text-sm text-foreground mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Song validation needed
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  {pendingValidationGroups.length} group listing(s) waiting for song profile. Open the Validation tab.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-xl font-bold"
                  onClick={() => goToTab("validate")}
                >
                  Open validation
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

        {tab === "classes" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <AdminClassListingsPanel onValidateSong={openValidation} />
          </motion.div>
        )}

        {tab === "library" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <AdminSongLibraryPanel />
          </motion.div>
        )}

        {tab === "validate" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <AdminTutorialCallout title="Song validation workflow">
              <p>
                When someone lists a <strong>new song</strong>, the class stays hidden until you complete the profile
                here. iTunes artwork and title come from their draft; you add formation size, role names, difficulty, and
                allowed class formats.
              </p>
              <p>
                Saving writes to the <strong>Song library</strong> and turns on the public listing for every group with
                that song key.
              </p>
            </AdminTutorialCallout>
            <p className="text-sm text-muted-foreground">
              iTunes title and artwork come from the student listing. Add formation, roles, difficulty, class types, and
              notes — then save to go live.
            </p>

            {adminAlerts.map((a) => (
              <div
                key={a.id}
                className="card-premium p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-l-4 border-l-amber-500"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-foreground">{a.message}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">{a.songKey}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="rounded-xl font-bold"
                    onClick={() => {
                      const g = groups.find((x) => x.id === a.groupId);
                      if (g) openValidation(g);
                    }}
                  >
                    Validate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => dismissAdminAlert(a.id)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-primary mb-3">Pending listings</p>
              {pendingValidationGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-2xl">
                  No groups waiting for song validation.
                </p>
              ) : (
                <div className="space-y-2">
                  {pendingValidationGroups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => openValidation(g)}
                      className="w-full card-premium p-4 flex items-center gap-4 text-left btn-press hover:bg-muted/50"
                    >
                      {g.imageUrl ? (
                        <img src={g.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-muted shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm truncate">{g.songTitle}</p>
                        <p className="text-xs text-muted-foreground">{g.artist}</p>
                        <Badge variant="outline" className="mt-2 text-[10px]">
                          Awaiting validation
                        </Badge>
                      </div>
                      <ClipboardCheck className="w-5 h-5 text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {tab === "rooms" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Same timetable as <span className="font-bold text-foreground">My Schedule</span> — choose a studio below, then use the legend and grid to assign or clear slots.
            </p>
            <StudioRoomsTimetable />
          </motion.div>
        )}

        {tab === "matcher" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <AdminAvailabilityMatcher />
          </motion.div>
        )}
      </div>

      <Dialog open={validatingGroup !== null} onOpenChange={(o) => !o && setValidatingGroup(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Validate song</DialogTitle>
          </DialogHeader>
          {validatingGroup && (
            <SongValidationForm
              group={validatingGroup}
              onSubmit={handleValidateSubmit}
              onCancel={() => setValidatingGroup(null)}
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
