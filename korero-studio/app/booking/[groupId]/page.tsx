import BookingFlow from "@/components/pages/BookingFlow";

export default async function Page({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <BookingFlow groupId={groupId} />;
}
