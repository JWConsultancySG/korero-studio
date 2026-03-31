import { Suspense } from "react";
import { StripeReturnClient } from "./stripe-return-client";

export default function StripeReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <StripeReturnClient />
    </Suspense>
  );
}
