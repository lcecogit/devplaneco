import { createClient } from "@/lib/supabase/server";
import { ClientRedirect } from "@/components/ClientRedirect";

// Landing spot after any customer auth flow (password login/signup today,
// OAuth/magic-link later). Unlike the partner flow, there's no separate
// "step 2" form to collect extra info — a customer profile needs nothing
// beyond the account itself — so this page creates the customers row
// directly (idempotent upsert, safe if it already exists) instead of
// redirecting to one. `next` carries the visitor back to wherever they
// were before auth (e.g. an in-progress /quote).
export default async function CustomerPostAuthPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ClientRedirect to="/customer/login" />;
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!customer) {
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: user.id, role: "customer", email: user.email }, { onConflict: "id" });

    if (!profileError) {
      await supabase
        .from("customers")
        .upsert({ profile_id: user.id }, { onConflict: "profile_id" });
    }
  }

  const next = searchParams.next;
  const destination = next && next.startsWith("/") ? next : "/customer/dashboard";

  return <ClientRedirect to={destination} />;
}
