import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Landing spot after any partner auth flow (password login, OAuth callback,
// magic-link callback). Decides where the user actually belongs: mid-signup
// (no transport_partners row yet — e.g. dropped off after Google/magic-link
// auth before finishing business info) goes back to step 2, everyone else
// goes to the dashboard.
export default async function PartnerPostAuthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/partner/login");
  }

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!partner) {
    redirect("/partner/signup/business");
  }

  redirect("/partner/dashboard");
}
