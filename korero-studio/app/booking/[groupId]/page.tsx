import { Suspense } from "react";
import BookingFlow from "@/components/pages/BookingFlow";
import { Loader2 } from "lucide-react";

export default async function Page({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <BookingFlow groupId={groupId} />
    </Suspense>
  );
}
