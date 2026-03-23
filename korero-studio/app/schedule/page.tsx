import { Suspense } from "react";
import AvailabilityPage from "@/components/pages/AvailabilityPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background" />
      }
    >
      <AvailabilityPage />
    </Suspense>
  );
}
