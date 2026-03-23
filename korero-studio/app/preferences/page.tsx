import { Suspense } from "react";
import PreferencesPage from "@/components/pages/PreferencesPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background" />
      }
    >
      <PreferencesPage />
    </Suspense>
  );
}
