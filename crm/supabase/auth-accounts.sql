-- ==========================================================================
--  Staff accounts — create, repair and verify
--
--  PREFER THE DASHBOARD. Supabase → Authentication → Add user creates a row
--  GoTrue itself is happy with, then you only run section 3 to link the staff
--  record. Use section 1 only when you need accounts in bulk.
--
--  THE TRAP: auth.users.confirmation_token, recovery_token, email_change and
--  email_change_token_new have NO DEFAULT and are nullable. GoTrue reads them
--  into non-nullable Go strings, so a NULL makes /auth/v1/token fail with
--  "converting NULL to string is unsupported" — a 500 on every sign-in, for
--  every account, with nothing in the UI explaining it. Supabase's own signup
--  path writes '' into all of them. A manual INSERT must do the same.
-- ==========================================================================

-- ---------------------------------------------------------------------------
-- 1. Create an account
-- ---------------------------------------------------------------------------
do $$
declare
  v_email    text := 'someone@ecogreenmovers.co.uk';
  v_password text := 'replace-me';
  v_name     text := 'Their Name';
  v_uid      uuid := gen_random_uuid();
begin
  if exists (select 1 from auth.users where email = v_email) then
    raise notice 'skipping: % already exists', v_email;
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
    -- Every one of these must be '', never NULL. See the note above.
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token,
    reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    v_email, extensions.crypt(v_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', v_name), false, false,
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    v_uid::text, v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', v_email,
                       'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  );

  raise notice 'created %', v_email;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Repair — safe to run any time, fixes accounts made without the '' columns
-- ---------------------------------------------------------------------------
update auth.users
   set confirmation_token         = coalesce(confirmation_token, ''),
       recovery_token             = coalesce(recovery_token, ''),
       email_change               = coalesce(email_change, ''),
       email_change_token_new     = coalesce(email_change_token_new, ''),
       email_change_token_current = coalesce(email_change_token_current, ''),
       phone_change               = coalesce(phone_change, ''),
       phone_change_token         = coalesce(phone_change_token, ''),
       reauthentication_token     = coalesce(reauthentication_token, '')
 where confirmation_token is null or recovery_token is null
    or email_change is null or email_change_token_new is null
    or email_change_token_current is null or phone_change is null
    or phone_change_token is null or reauthentication_token is null;

-- ---------------------------------------------------------------------------
-- 3. Link the auth user to a staff record and grant brand access
-- ---------------------------------------------------------------------------
-- insert into staff (auth_user_id, full_name, email, department)
-- values ((select id from auth.users where email = 'someone@ecogreenmovers.co.uk'),
--         'Their Name', 'someone@ecogreenmovers.co.uk', 'sales');
--
-- The guard trigger requires an existing platform admin, so either run this as
-- one, or disable it for the duration when creating the very first account.
-- alter table staff_brand_access disable trigger staff_brand_access_guard;
-- insert into staff_brand_access (staff_id, brand_id, role)
-- select s.id, b.id, 'sales'
-- from staff s, brands b
-- where s.email = 'someone@ecogreenmovers.co.uk' and b.slug = 'ecogreen-movers';
-- alter table staff_brand_access enable trigger staff_brand_access_guard;

-- ---------------------------------------------------------------------------
-- 4. Verify — every column that must be right for GoTrue to sign someone in
-- ---------------------------------------------------------------------------
select u.email,
       left(u.encrypted_password, 4) = '$2a$'                as bcrypt_ok,
       u.email_confirmed_at is not null                      as confirmed,
       u.aud = 'authenticated' and u.role = 'authenticated'  as aud_role_ok,
       (u.confirmation_token = '' and u.recovery_token = '' and u.email_change = ''
        and u.email_change_token_new = '' and u.email_change_token_current = ''
        and u.phone_change = '' and u.phone_change_token = ''
        and u.reauthentication_token = '')                   as tokens_ok,
       exists (select 1 from auth.identities i
                where i.user_id = u.id and i.provider = 'email')
                                                             as identity_ok,
       exists (select 1 from staff s where s.auth_user_id = u.id)
                                                             as staff_row,
       (select a.role::text from staff s
          join staff_brand_access a on a.staff_id = s.id
         where s.auth_user_id = u.id)                        as brand_role
from auth.users u
order by u.email;
