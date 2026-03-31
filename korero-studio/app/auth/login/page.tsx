import { redirect } from "next/navigation";
import LoginPage from "@/components/pages/LoginPage";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect("/browse");
  }

  return <LoginPage />;
}
