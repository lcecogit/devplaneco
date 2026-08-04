-- Second half of the fix from migration 0050. Migration 0048's payout
-- trigger (jobs_set_payout_amount_trigger) is BEFORE INSERT; reservation
-- matching (jobs_match_reservation_trigger) is AFTER INSERT — confirmed in
-- 0050's investigation. These are different trigger phases entirely, not
-- just alphabetically ordered within the same one, so the payout trigger
-- never sees a reservation match at all. A job whose original
-- allocation_method was 'auction' (forced category, or price over
-- threshold) correctly skips payout at insert time, expecting a winning
-- bid to set it later — but if that same job then gets matched to a
-- reservation, it never goes to auction, so payout_amount would stay null
-- forever. Same class of bug 0048 already fixed for the express_interest
-- journey trigger; this is the reservation-matching equivalent, missed at
-- the time because the wrong trigger-timing assumption meant it looked
-- already covered.
create or replace function app_private.match_job_to_reservation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation reservations;
begin
  if new.matching_status <> 'listed' then
    return null;
  end if;

  select r.* into v_reservation
  from reservations r
  where r.status = 'pending'
    and r.date = new.collection_window_start::date
    and (
      r.start_postcode is null
      or app_private.postcode_area(r.start_postcode) = app_private.postcode_area(new.collection_postcode)
    )
    and (
      r.end_postcode is null
      or app_private.postcode_area(r.end_postcode) = app_private.postcode_area(new.delivery_postcode)
    )
    and (r.team_size is null or new.crew_size is null or new.crew_size <= r.team_size)
    and (r.van_space_m3 is null or new.total_volume_m3 is null or new.total_volume_m3 <= r.van_space_m3)
    and (r.min_price is null or new.customer_price is null or new.customer_price >= r.min_price)
    and (r.max_price is null or new.customer_price is null or new.customer_price <= r.max_price)
  order by r.created_at asc
  limit 1
  for update skip locked;

  if v_reservation.id is null then
    return null;
  end if;

  insert into job_invitations (job_id, transport_partner_id, reservation_id, status, expires_at)
  values (new.id, v_reservation.transport_partner_id, v_reservation.id, 'pending', now() + interval '2 hours');

  update reservations set status = 'partially_matched' where id = v_reservation.id;

  update jobs
  set allocation_method = 'reservation',
      bidding_closes_at = null,
      payout_amount = coalesce(payout_amount, round(customer_price * 0.75, 2))
  where id = new.id;

  insert into partner_notifications (transport_partner_id, title, body)
  values (
    v_reservation.transport_partner_id,
    'Job matched to your reservation',
    coalesce(new.title, 'A job') || ' matches your reservation for ' ||
      to_char(new.collection_window_start, 'DD Mon YYYY') || '. Check Invitations to accept.'
  );

  return null;
end;
$$;
