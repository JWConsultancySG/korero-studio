import { Suspense } from "react";
import ProfilePage from "@/components/pages/ProfilePage";
import { Loader2 } from "lucide-react";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ProfilePage />
    </Suspense>
  );
}
