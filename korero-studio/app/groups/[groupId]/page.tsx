import { redirect } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  redirect(`/browse/${groupId}`);
}
