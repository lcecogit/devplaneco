-- Job-scoped messaging between a customer and their matched transport
-- partner, matching AnyVan's "Inbox" concept (confirmed via their live
-- partner dashboard screenshots). Scoped to jobs that already have a
-- job_assignments row — i.e. messaging opens once a job is matched, the
-- same privacy boundary this project already uses for full-address access
-- (see migration 0020's jobs_select). Out of scope for this pass: AnyVan's
-- admin-broadcast inbox and canned "Default messages" template library —
-- neither has an equivalent trigger in this project yet, so building them
-- now would be speculative.

create table messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  sender_profile_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_job_id_created_at_idx on messages (job_id, created_at);

alter table messages enable row level security;

-- Same "customer who owns the job, or the partner assigned to it" shape as
-- job_assignments_select — is_admin() included for future support tooling,
-- not used by anything yet.
create policy messages_select on messages
  for select using (
    is_admin()
    or exists (select 1 from jobs j where j.id = messages.job_id and j.customer_id = app_private.current_customer_id())
    or exists (
      select 1 from job_assignments ja
      where ja.job_id = messages.job_id and ja.transport_partner_id = app_private.current_partner_id()
    )
  );

create policy messages_insert on messages
  for insert with check (
    sender_profile_id = auth.uid()
    and (
      exists (select 1 from jobs j where j.id = messages.job_id and j.customer_id = app_private.current_customer_id())
      or exists (
        select 1 from job_assignments ja
        where ja.job_id = messages.job_id and ja.transport_partner_id = app_private.current_partner_id()
      )
    )
  );

-- Messages are immutable once sent (same evidence-integrity pattern as
-- photos/status_logs — see migration 0007) — only admin can touch them
-- after the fact. read_at is set via mark_messages_read() below instead of
-- a general UPDATE grant, so a participant can never mark their own sent
-- messages "read" or tamper with someone else's message body.
create policy messages_update on messages
  for update using (is_admin()) with check (is_admin());

create policy messages_delete on messages
  for delete using (is_admin());

-- Marks every unread message in a job's thread that wasn't sent by the
-- caller as read. SECURITY DEFINER so it can write read_at without a
-- general UPDATE policy; validates the caller is actually a participant in
-- the job before touching anything.
create or replace function public.mark_messages_read(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid := app_private.current_customer_id();
  v_partner_id uuid := app_private.current_partner_id();
  v_is_participant boolean;
begin
  if v_customer_id is not null then
    select exists (select 1 from jobs j where j.id = p_job_id and j.customer_id = v_customer_id)
    into v_is_participant;
  elsif v_partner_id is not null then
    select exists (
      select 1 from job_assignments ja
      where ja.job_id = p_job_id and ja.transport_partner_id = v_partner_id
    )
    into v_is_participant;
  else
    v_is_participant := false;
  end if;

  if not v_is_participant then
    return;
  end if;

  update messages
  set read_at = now()
  where job_id = p_job_id
    and read_at is null
    and sender_profile_id <> auth.uid();
end;
$$;

-- Per-job thread summary for the caller's own Messages inbox — customer or
-- partner, branched on which role the caller resolves to (never both).
-- SECURITY DEFINER so it can join transport_partners/profiles for a display
-- name without needing a broader read policy on those tables than already
-- exists.
create or replace function public.my_message_threads()
returns table (
  job_id uuid,
  job_title text,
  category text,
  counterpart_name text,
  last_message_body text,
  last_message_at timestamptz,
  unread_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid := app_private.current_customer_id();
  v_partner_id uuid := app_private.current_partner_id();
begin
  if v_customer_id is not null then
    return query
    select
      j.id,
      j.title,
      j.category,
      tp.business_name,
      lm.body,
      lm.created_at,
      (
        select count(*) from messages m2
        where m2.job_id = j.id and m2.read_at is null and m2.sender_profile_id <> auth.uid()
      )
    from jobs j
    join job_assignments ja on ja.job_id = j.id
    join transport_partners tp on tp.id = ja.transport_partner_id
    left join lateral (
      select m.body, m.created_at from messages m where m.job_id = j.id order by m.created_at desc limit 1
    ) lm on true
    where j.customer_id = v_customer_id
    order by coalesce(lm.created_at, j.listed_at) desc;
  elsif v_partner_id is not null then
    return query
    select
      j.id,
      j.title,
      j.category,
      coalesce(p.full_name, 'Customer'),
      lm.body,
      lm.created_at,
      (
        select count(*) from messages m2
        where m2.job_id = j.id and m2.read_at is null and m2.sender_profile_id <> auth.uid()
      )
    from jobs j
    join job_assignments ja on ja.job_id = j.id
    join customers c on c.id = j.customer_id
    join profiles p on p.id = c.profile_id
    left join lateral (
      select m.body, m.created_at from messages m where m.job_id = j.id order by m.created_at desc limit 1
    ) lm on true
    where ja.transport_partner_id = v_partner_id
    order by coalesce(lm.created_at, j.listed_at) desc;
  end if;
end;
$$;

-- This project grants EXECUTE on new functions to anon/PUBLIC by default at
-- creation time (see migrations 0021/0022/0026-0029's notes) — revoke both
-- explicitly up front this time instead of discovering it via the advisor.
revoke execute on function public.mark_messages_read(uuid) from public;
revoke execute on function public.mark_messages_read(uuid) from anon;
grant execute on function public.mark_messages_read(uuid) to authenticated;

revoke execute on function public.my_message_threads() from public;
revoke execute on function public.my_message_threads() from anon;
grant execute on function public.my_message_threads() to authenticated;
