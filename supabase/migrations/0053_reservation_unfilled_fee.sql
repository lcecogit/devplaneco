-- Reservation unfilled-fee: real AnyVan pays a partner a fee when it can't
-- fill a reservation the partner held open. This is money owed TO the
-- partner, the opposite direction of deallocation_charges (money the
-- partner owes, with the dispute workflow built this same session) — kept
-- in its own table rather than overloading that one, since "uphold this
-- charge" / "waive this charge" framing doesn't make sense for money
-- flowing the other way.
--
-- FEE AMOUNT: flat £50 per unfilled reservation. No published AnyVan rate
-- exists to research against (unlike the payout commission %, where real
-- numbers were found) — asked the project owner for a number before
-- building this, got no response, proceeded with the recommended flat
-- default rather than blocking. Easy to change: one literal below.
create table reservation_compensations (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references reservations (id) on delete cascade,
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  amount numeric not null,
  created_at timestamptz not null default now()
);

create index reservation_compensations_transport_partner_id_idx
  on reservation_compensations (transport_partner_id);

alter table reservation_compensations enable row level security;

-- System-generated only (the cron function below, SECURITY DEFINER,
-- bypasses RLS entirely) — same shape as partner_notifications: partner
-- can read their own, nobody gets a write policy at all.
create policy reservation_compensations_select on reservation_compensations
  for select using (transport_partner_id = app_private.current_partner_id() or is_admin());

-- Unfilled means the reservation's date has passed without ever becoming
-- fully_booked — 'pending' (never even invited to a job) or
-- 'partially_matched' (invited, but the invitation was declined/expired
-- and nothing else came along before the date passed) both count.
-- 'accepted' is an unused enum value from the original Phase 2 spec — no
-- code ever sets it, so it's deliberately not handled here either.
create or replace function public.expire_unfilled_reservations()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation record;
begin
  for v_reservation in
    select id, transport_partner_id
    from reservations
    where status in ('pending', 'partially_matched')
      and date < current_date
    for update skip locked
  loop
    update reservations set status = 'expired' where id = v_reservation.id;

    insert into reservation_compensations (reservation_id, transport_partner_id, amount)
    values (v_reservation.id, v_reservation.transport_partner_id, 50.00)
    on conflict (reservation_id) do nothing;

    insert into partner_notifications (transport_partner_id, title, body)
    values (
      v_reservation.transport_partner_id,
      'Reservation went unfilled',
      'We couldn''t fill your reservation in time — you''re owed £50.00 for holding that availability. Check Reservations for details.'
    );
  end loop;
end;
$$;

revoke execute on function public.expire_unfilled_reservations() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire-unfilled-reservations') then
    perform cron.unschedule('expire-unfilled-reservations');
  end if;
end;
$$;

select cron.schedule(
  'expire-unfilled-reservations',
  '*/5 * * * *',
  $$select public.expire_unfilled_reservations();$$
);
