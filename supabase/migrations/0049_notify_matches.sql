-- Closes a real gap surfaced while auditing how partners actually get
-- leads: Alerts, Route Matcher, and Reservation matching all already
-- compute real matches server-side, but none of them ever told the
-- partner — only close_expired_auctions() (migration 0045) writes to
-- partner_notifications. The matching logic already works and is already
-- tested; this only adds the missing notification insert to each.

-- ---------------------------------------------------------------------------
-- Reservation matching (migration 0035): extend the existing BEFORE INSERT
-- matcher to also notify the matched partner. Runs in the same trigger, so
-- no new trigger/ordering concern — just one more insert once a match is
-- found.
-- ---------------------------------------------------------------------------
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
    return new;
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
    return new;
  end if;

  insert into job_invitations (job_id, transport_partner_id, reservation_id, status, expires_at)
  values (new.id, v_reservation.transport_partner_id, v_reservation.id, 'pending', now() + interval '2 hours');

  update reservations set status = 'partially_matched' where id = v_reservation.id;

  insert into partner_notifications (transport_partner_id, title, body)
  values (
    v_reservation.transport_partner_id,
    'Job matched to your reservation',
    coalesce(new.title, 'A job') || ' matches your reservation for ' ||
      to_char(new.collection_window_start, 'DD Mon YYYY') || '. Check Invitations to accept.'
  );

  new.allocation_method := 'reservation';
  new.bidding_closes_at := null;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Route Matcher (migration 0042): both directions of matching (new job vs
-- existing routes, new route vs existing jobs) now notify whoever's route
-- just gained a fresh recommendation. Restructured each INSERT into a CTE
-- so only genuinely NEW recommendations (not `on conflict` no-ops) trigger
-- a notification.
-- ---------------------------------------------------------------------------
create or replace function app_private.recommend_job_for_routes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.matching_status <> 'listed' then
    return null;
  end if;

  with matched as (
    insert into job_recommendations (route_id, job_id, status)
    select r.id, new.id, 'sent'
    from routes r
    where r.date = new.collection_window_start::date
      and (
        r.job_categories is null
        or coalesce(array_length(r.job_categories, 1), 0) = 0
        or new.category = any(r.job_categories)
      )
      and (
        (
          r.direction in ('outbound', 'both')
          and app_private.postcode_area(r.start_postcode) = app_private.postcode_area(new.collection_postcode)
          and app_private.postcode_area(r.end_postcode) = app_private.postcode_area(new.delivery_postcode)
        )
        or (
          r.direction in ('return', 'both')
          and app_private.postcode_area(r.end_postcode) = app_private.postcode_area(new.collection_postcode)
          and app_private.postcode_area(r.start_postcode) = app_private.postcode_area(new.delivery_postcode)
        )
      )
      and (r.team_size is null or new.crew_size is null or new.crew_size <= r.team_size)
    on conflict (route_id, job_id) do nothing
    returning route_id
  )
  insert into partner_notifications (transport_partner_id, title, body)
  select r.transport_partner_id, 'New job matches your route',
    coalesce(new.title, 'A job') || ' matches a route you added. Check Routes for details.'
  from matched m
  join routes r on r.id = m.route_id;

  return null;
end;
$$;

create or replace function app_private.recommend_routes_for_existing_jobs()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  with matched as (
    insert into job_recommendations (route_id, job_id, status)
    select new.id, j.id, 'sent'
    from jobs j
    where j.matching_status = 'listed'
      and j.collection_window_start::date = new.date
      and (
        new.job_categories is null
        or coalesce(array_length(new.job_categories, 1), 0) = 0
        or j.category = any(new.job_categories)
      )
      and (
        (
          new.direction in ('outbound', 'both')
          and app_private.postcode_area(new.start_postcode) = app_private.postcode_area(j.collection_postcode)
          and app_private.postcode_area(new.end_postcode) = app_private.postcode_area(j.delivery_postcode)
        )
        or (
          new.direction in ('return', 'both')
          and app_private.postcode_area(new.end_postcode) = app_private.postcode_area(j.collection_postcode)
          and app_private.postcode_area(new.start_postcode) = app_private.postcode_area(j.delivery_postcode)
        )
      )
      and (new.team_size is null or j.crew_size is null or j.crew_size <= new.team_size)
    on conflict (route_id, job_id) do nothing
    returning job_id
  )
  insert into partner_notifications (transport_partner_id, title, body)
  select new.transport_partner_id, 'New job matches your route',
    coalesce(j.title, 'A job') || ' matches your new route. Check Routes for details.'
  from matched m
  join jobs j on j.id = m.job_id;

  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Alerts (migration 0038): alert_matches() was pull-only (a plain read
-- called only when a partner loads the Alerts page). New AFTER INSERT
-- trigger mirrors that function's exact WHERE logic, but evaluated once per
-- new job against every saved search, instead of once per partner against
-- every job. A partner with two searches that both match gets two
-- notifications — each names its own search, both true and worth knowing.
-- ---------------------------------------------------------------------------
create or replace function app_private.notify_alert_matches()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.matching_status <> 'listed' or new.allocation_method not in ('click_claim', 'auction') then
    return null;
  end if;

  insert into partner_notifications (transport_partner_id, title, body)
  select s.transport_partner_id, 'New job matches your alert',
    coalesce(new.title, 'A job') || ' matches your saved search "' || s.name || '". Check Alerts for details.'
  from saved_searches s
  where exists (
    select 1 from vehicles v
    where v.transport_partner_id = s.transport_partner_id
      and v.approval_status = 'approved'
      and (new.category is distinct from 'motorbike-transport' or v.can_transport_motorbikes)
  )
  and (
    not (s.filters ? 'categories')
    or jsonb_array_length(s.filters -> 'categories') = 0
    or s.filters -> 'categories' ? new.category
  )
  and (
    not (s.filters ? 'postcodeArea')
    or s.filters ->> 'postcodeArea' = ''
    or app_private.postcode_area(new.collection_postcode) = upper(s.filters ->> 'postcodeArea')
    or app_private.postcode_area(new.delivery_postcode) = upper(s.filters ->> 'postcodeArea')
  )
  and (
    not (s.filters ? 'minPrice') or new.customer_price is null
    or new.customer_price >= (s.filters ->> 'minPrice')::numeric
  )
  and (
    not (s.filters ? 'maxPrice') or new.customer_price is null
    or new.customer_price <= (s.filters ->> 'maxPrice')::numeric
  );

  return null;
end;
$$;

create trigger jobs_notify_alert_matches_trigger
  after insert on jobs
  for each row execute function app_private.notify_alert_matches();
