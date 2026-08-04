import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  hourToTimeString,
  loadQuote,
  parseCrewSize,
  parseDate,
  parseEmail,
  parseItems,
  parseStops,
  parseWindow,
  QuoteRequestError,
  repriceQuote,
  writeItems,
  writeStops,
  type QuoteUpdate,
} from "@/lib/quote/server";

// GET /api/quote/[id] — read a quote back. The UUID is the capability token
// (see the RLS note in migration 0030), so anyone with the link can read it;
// that's what makes "come back to your quote" work without an account.
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json({ quote: await loadQuote(params.id) });
  } catch (error) {
    if (error instanceof QuoteRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Couldn't load that quote." }, { status: 500 });
  }
}

// PATCH /api/quote/[id] — save any subset of the flow's state.
//
// Every field is validated and the price is always recalculated server-side
// from the stored stops and items afterwards. A client can't post a price.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Confirms the quote exists (and the id is well-formed) before writing.
    const existing = await loadQuote(params.id);
    const body = (await request.json()) as Record<string, unknown>;
    const admin = createAdminClient();

    if (body.stops !== undefined) {
      await writeStops(existing.id, parseStops(body.stops));
    }

    if (body.items !== undefined) {
      await writeItems(existing.id, parseItems(body.items));
    }

    const updates: QuoteUpdate = {};

    if (body.crewSize !== undefined) {
      updates.crew_size = parseCrewSize(body.crewSize);
    }

    if (body.selectedDate !== undefined) {
      updates.selected_date = parseDate(body.selectedDate);
    }

    if (body.collectionWindow !== undefined) {
      const window = parseWindow(body.collectionWindow);
      updates.collection_window_start = window ? hourToTimeString(window.startHour) : null;
      updates.collection_window_end = window ? hourToTimeString(window.endHour) : null;
    }

    if (body.deliveryWindow !== undefined) {
      const window = parseWindow(body.deliveryWindow);
      updates.delivery_window_start = window ? hourToTimeString(window.startHour) : null;
      updates.delivery_window_end = window ? hourToTimeString(window.endHour) : null;
    }

    if (body.helperIncluded !== undefined) {
      updates.helper_included = body.helperIncluded === true;
    }

    if (body.email !== undefined) {
      updates.email = parseEmail(body.email);
    }

    // Marketing consent is only ever set from an explicit, unticked-by-default
    // checkbox shown alongside the email field. It is deliberately separate
    // from the transactional "email me this quote" action.
    if (body.marketingOptIn !== undefined) {
      updates.marketing_opt_in = body.marketingOptIn === true;
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await admin.from("quotes").update(updates).eq("id", existing.id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    await repriceQuote(existing.id);

    return NextResponse.json({ quote: await loadQuote(existing.id) });
  } catch (error) {
    if (error instanceof QuoteRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Couldn't save that quote." }, { status: 500 });
  }
}
