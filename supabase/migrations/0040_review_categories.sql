-- Customer Reviews: AnyVan's real system (confirmed via their live
-- screenshots) breaks a review into four categories — Punctuality,
-- Communication, Care of Goods, Presentation — with an overall average
-- shown alongside. This project's `ratings` table only ever had one
-- `rating` number. Adding the four category columns rather than replacing
-- `rating` outright: `rating` stays the overall figure everything else
-- already reads (Insights' average_rating, built last turn, reads this
-- column directly) — a trigger below keeps it in sync with the four
-- category scores instead of requiring every caller to compute it.
alter table ratings add column punctuality_rating numeric check (punctuality_rating >= 1 and punctuality_rating <= 5);
alter table ratings add column communication_rating numeric check (communication_rating >= 1 and communication_rating <= 5);
alter table ratings add column care_of_goods_rating numeric check (care_of_goods_rating >= 1 and care_of_goods_rating <= 5);
alter table ratings add column presentation_rating numeric check (presentation_rating >= 1 and presentation_rating <= 5);

-- Overall = average of whichever category scores are actually present.
-- Deliberately doesn't touch `rating` when none of the four are set, so a
-- hypothetical old-style single-score insert (nothing currently does this,
-- but the column is still NOT NULL) keeps working unchanged.
create or replace function app_private.compute_overall_rating()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_sum numeric := 0;
  v_count int := 0;
begin
  if new.punctuality_rating is not null then v_sum := v_sum + new.punctuality_rating; v_count := v_count + 1; end if;
  if new.communication_rating is not null then v_sum := v_sum + new.communication_rating; v_count := v_count + 1; end if;
  if new.care_of_goods_rating is not null then v_sum := v_sum + new.care_of_goods_rating; v_count := v_count + 1; end if;
  if new.presentation_rating is not null then v_sum := v_sum + new.presentation_rating; v_count := v_count + 1; end if;

  if v_count > 0 then
    new.rating := round(v_sum / v_count, 2);
  end if;

  return new;
end;
$$;

create trigger ratings_compute_overall
  before insert or update on ratings
  for each row execute function app_private.compute_overall_rating();

-- Real gap found while building the write path, fixed at the RLS layer
-- (not just the UI) — same principle migration 0020 established: the
-- original ratings_insert only checked `customer_id = current_customer_id()`,
-- never that job_id actually belongs to that customer or that
-- transport_partner_id is genuinely who the job was assigned to. A
-- customer could otherwise insert a rating row pointing at an arbitrary
-- job/partner pair (blocked from duplicating one specific job by the
-- existing unique constraint on ratings.job_id, but not from targeting the
-- wrong job/partner in the first place).
drop policy ratings_insert on ratings;

create policy ratings_insert on ratings
  for insert with check (
    is_admin()
    or (
      customer_id = app_private.current_customer_id()
      and exists (
        select 1 from jobs j
        where j.id = ratings.job_id and j.customer_id = app_private.current_customer_id()
      )
      and exists (
        select 1 from job_assignments ja
        where ja.job_id = ratings.job_id and ja.transport_partner_id = ratings.transport_partner_id
      )
    )
  );

-- Partner-facing review list, address-free-equivalent shape (category +
-- areas aren't sensitive here, but the customer's exact identity is kept to
-- a first name via profiles — same reasoning as my_message_threads: a
-- partner has no RLS path to another user's profiles row directly).
create or replace function public.partner_reviews()
returns table (
  rating_id uuid,
  job_id uuid,
  category text,
  customer_name text,
  punctuality_rating numeric,
  communication_rating numeric,
  care_of_goods_rating numeric,
  presentation_rating numeric,
  overall_rating numeric,
  comment text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_partner_id uuid;
begin
  v_partner_id := app_private.current_partner_id();
  if v_partner_id is null then
    return;
  end if;

  return query
  select
    r.id,
    r.job_id,
    j.category,
    coalesce(p.full_name, 'A customer'),
    r.punctuality_rating,
    r.communication_rating,
    r.care_of_goods_rating,
    r.presentation_rating,
    r.rating,
    r.comment,
    r.created_at
  from ratings r
  join jobs j on j.id = r.job_id
  join customers c on c.id = r.customer_id
  join profiles p on p.id = c.profile_id
  where r.transport_partner_id = v_partner_id
  order by r.created_at desc;
end;
$$;

revoke execute on function public.partner_reviews() from public;
revoke execute on function public.partner_reviews() from anon;
grant execute on function public.partner_reviews() to authenticated;
