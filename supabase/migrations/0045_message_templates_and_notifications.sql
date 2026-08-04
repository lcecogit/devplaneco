-- Messages extras, from AnyVan's real system: a "Default messages" canned-
-- reply library, and an "Admin messages" inbox for system notices. Not
-- built as two categorised template lists ("Default messages" vs "Bid
-- messages") the way AnyVan's screenshots showed, since this project's
-- Messages system doesn't have a separate pre-match "bid messages" channel
-- the way AnyVan does (messaging here only opens once a job is matched —
-- see migration 0034) — one unified template library covers the same real
-- value (quick canned replies) without inventing a second messaging
-- channel this pass didn't ask for.
create table message_templates (
  id uuid primary key default gen_random_uuid(),
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  name text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index message_templates_transport_partner_id_idx on message_templates (transport_partner_id);

create trigger set_updated_at before update on message_templates
  for each row execute function set_updated_at();

alter table message_templates enable row level security;

create policy message_templates_select on message_templates
  for select using (transport_partner_id = app_private.current_partner_id() or is_admin());

create policy message_templates_insert on message_templates
  for insert with check (transport_partner_id = app_private.current_partner_id());

create policy message_templates_update on message_templates
  for update using (transport_partner_id = app_private.current_partner_id())
  with check (transport_partner_id = app_private.current_partner_id());

create policy message_templates_delete on message_templates
  for delete using (transport_partner_id = app_private.current_partner_id());

-- One-way system/admin notices into a partner's inbox — AnyVan's "Admin
-- messages" tab. No partner insert/update/delete: this is written by the
-- system (via SECURITY DEFINER functions, bypassing RLS the same way every
-- other trigger in this project does) or by an admin directly.
create table partner_notifications (
  id uuid primary key default gen_random_uuid(),
  transport_partner_id uuid not null references transport_partners (id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index partner_notifications_transport_partner_id_idx on partner_notifications (transport_partner_id);

alter table partner_notifications enable row level security;

create policy partner_notifications_select on partner_notifications
  for select using (transport_partner_id = app_private.current_partner_id() or is_admin());

create policy partner_notifications_insert on partner_notifications
  for insert with check (is_admin());

create policy partner_notifications_update on partner_notifications
  for update using (transport_partner_id = app_private.current_partner_id())
  with check (transport_partner_id = app_private.current_partner_id());

-- Marks a partner's own notifications read — same "no general UPDATE grant,
-- do it through a narrow function" shape as mark_messages_read (migration
-- 0034), even though here the update policy above already scopes writes to
-- the owner; kept as an RPC for a single atomic "mark all" action instead
-- of the client looping row-by-row updates.
create or replace function public.mark_notifications_read()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update partner_notifications
  set read_at = now()
  where transport_partner_id = app_private.current_partner_id() and read_at is null;
$$;

revoke execute on function public.mark_notifications_read() from public;
revoke execute on function public.mark_notifications_read() from anon;
grant execute on function public.mark_notifications_read() to authenticated;

-- Real trigger wired up as a working example, not just a shell inbox with
-- nothing ever writing to it: close_expired_auctions() (migration 0025)
-- now tells the winning partner they won. Everything else about that
-- function is unchanged — this only adds one insert on the winning branch.
-- Other real events (reservation invitation, express-interest selection,
-- vehicle approval/rejection) are equally valid candidates but out of
-- scope for this pass — see the phase summary for what's deferred.
create or replace function public.close_expired_auctions()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job_id uuid;
  v_winner bids;
  v_job_title text;
begin
  for v_job_id in
    select id from jobs
    where allocation_method = 'auction'
      and matching_status = 'listed'
      and bidding_closes_at is not null
      and bidding_closes_at <= now()
    for update of jobs skip locked
  loop
    select * into v_winner
    from bids
    where job_id = v_job_id and status = 'pending'
    order by amount asc, submitted_at asc
    limit 1;

    if v_winner.id is null then
      update jobs set bidding_closes_at = null where id = v_job_id;
      continue;
    end if;

    update bids set status = 'won' where id = v_winner.id;

    update bids
    set status = 'lost'
    where job_id = v_job_id and id <> v_winner.id and status = 'pending';

    update jobs
    set matching_status = 'matched',
        status = 'assigned',
        payout_amount = v_winner.amount
    where id = v_job_id;

    insert into job_assignments (job_id, transport_partner_id, vehicle_id, driver_id)
    values (v_job_id, v_winner.transport_partner_id, v_winner.vehicle_id, null);

    select title into v_job_title from jobs where id = v_job_id;
    insert into partner_notifications (transport_partner_id, title, body)
    values (
      v_winner.transport_partner_id,
      'You won an auction',
      coalesce(v_job_title, 'A job') || ' — your bid of £' || v_winner.amount || ' won. Check My Work for details.'
    );
  end loop;
end;
$$;

revoke execute on function public.close_expired_auctions() from public, anon, authenticated;
