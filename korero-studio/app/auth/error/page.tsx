import { Suspense } from "react";
import AuthErrorPage from "@/components/pages/AuthErrorPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen gradient-purple-subtle animate-pulse" />
      }
    >
      <AuthErrorPage />
    </Suspense>
  );
}
