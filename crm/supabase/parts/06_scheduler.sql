-- ==========================================================================
--  EcoGreen Group CRM — PART 6 — SCHEDULER (optional, run last)
--
--  Drives /api/cron/tick every 5 minutes from inside Postgres.
--
--  WHY THIS EXISTS: Vercel's free Hobby tier runs cron jobs once per DAY.
--  The chase sequences need a tick every few minutes to be useful, so on the
--  free tier the schedule lives here instead — pg_cron and pg_net are both
--  included in Supabase's free plan. On a paid Vercel plan you can delete
--  this and restore the 5-minute schedule in vercel.json instead; running
--  both is harmless (the outbox is idempotent) but pointless.
--
--  BEFORE RUNNING: replace the two placeholders below. The secret is stored
--  in Vault rather than inlined in the job definition, because pg_cron job
--  definitions are readable by anyone who can read cron.job.
-- ==========================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

do $precheck$
begin
    if to_regclass('public.outbox') is null then
      raise exception 'Run PARTS 1-5 first — table "outbox" does not exist.'
        using errcode = 'undefined_table';
    end if;
end
$precheck$;

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- Store the deployment URL and cron secret in Vault, not in the job body.
-- Replace both values, then run. Re-running updates them.
-- ---------------------------------------------------------------------------
do $vault$
declare
  v_url    text := 'https://REPLACE-ME.vercel.app';  -- your deployed app
  v_secret text := 'REPLACE-ME';                     -- must equal CRON_SECRET
begin
  if v_url like '%REPLACE-ME%' or v_secret = 'REPLACE-ME' then
    raise exception
      'Edit the two placeholders at the top of PART 6 before running it.';
  end if;

  perform vault.create_secret(v_url,    'crm_app_url',    'CRM deployment base URL');
exception
  when unique_violation then
    perform vault.update_secret(
      (select id from vault.secrets where name = 'crm_app_url'), v_url);
end
$vault$;

do $vault2$
declare
  v_secret text := 'REPLACE-ME';
begin
  perform vault.create_secret(v_secret, 'crm_cron_secret', 'Bearer token for /api/cron/tick');
exception
  when unique_violation then
    perform vault.update_secret(
      (select id from vault.secrets where name = 'crm_cron_secret'), v_secret);
end
$vault2$;

-- ---------------------------------------------------------------------------
-- The tick. Fire-and-forget: pg_net queues the request and returns
-- immediately, so a slow or down deployment never blocks the scheduler.
-- ---------------------------------------------------------------------------
create or replace function private.tick_sequences()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'crm_app_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'crm_cron_secret';

  if v_url is null or v_secret is null then
    raise warning 'tick_sequences: vault secrets missing, skipping';
    return;
  end if;

  perform net.http_post(
    url     := v_url || '/api/cron/tick',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || v_secret),
    body    := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;

revoke all on function private.tick_sequences() from public, anon, authenticated;

-- Unschedule first so re-running does not stack duplicate jobs.
do $sched$
begin
  perform cron.unschedule('crm-tick');
exception when others then null;
end
$sched$;

select cron.schedule('crm-tick', '*/5 * * * *', $$select private.tick_sequences()$$);

-- Check it afterwards with:
--   select jobname, schedule, active from cron.job where jobname = 'crm-tick';
--   select status, start_time, return_message
--     from cron.job_run_details where jobname = 'crm-tick'
--     order by start_time desc limit 5;
