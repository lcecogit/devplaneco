import { createClient } from "@/lib/supabase/server";
import { ClientRedirect } from "@/components/ClientRedirect";

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
    return <ClientRedirect to="/partner/login" />;
  }

  const { data: partner } = await supabase
    .from("transport_partners")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!partner) {
    return <ClientRedirect to="/partner/signup/business" />;
  }

  return <ClientRedirect to="/partner/dashboard" />;
}
