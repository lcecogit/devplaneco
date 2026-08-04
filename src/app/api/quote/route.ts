import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  loadQuote,
  parseStops,
  QuoteRequestError,
  writeStops,
} from "@/lib/quote/server";

// POST /api/quote — create a quote at the end of step 1.
//
// Deliberately callable by an anonymous visitor: the whole point of this flow
// is that you get a full price before you ever make an account. The created
// quote's UUID is the capability token for reading and updating it later.
// Signed-in customers get the row stamped with their customer_id so it also
// shows up under RLS in their dashboard.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const stops = parseStops(body.stops);

    const categoryHint =
      typeof body.categoryHint === "string" ? body.categoryHint.slice(0, 60) : null;

    // Attach to the visitor's customer record if they happen to be signed in.
    // Not required, and never a reason to reject the request.
    let customerId: string | null = null;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();
      customerId = customer?.id ?? null;
    }

    const admin = createAdminClient();
    const { data: created, error } = await admin
      .from("quotes")
      .insert({ customer_id: customerId, category_hint: categoryHint })
      .select("id")
      .single();

    if (error || !created) {
      return NextResponse.json(
        { error: error?.message ?? "Couldn't start a quote." },
        { status: 500 }
      );
    }

    const route = await writeStops(created.id, stops);
    await admin
      .from("quotes")
      .update({
        distance_miles: route.distanceMiles,
        duration_minutes: route.durationMinutes,
      })
      .eq("id", created.id);

    return NextResponse.json({ quote: await loadQuote(created.id) }, { status: 201 });
  } catch (error) {
    if (error instanceof QuoteRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Couldn't start a quote." }, { status: 500 });
  }
}
