# CRM staff accounts

Seven accounts on the live CRM project (`knbsosxsfvqslpimiznl`, "EcoGreem
Movers Hub", eu-west-2), one per `brand_role`, so every permission level can be
inspected against the real RLS policies.

**Passwords are deliberately not in this file.** These are accounts on a live
database reachable from the internet, not throwaway test identities — they were
delivered in the session that created them. Rotate them in Supabase →
Authentication before the CRM holds any real customer record, and delete the
ones you do not need.

| Login (`@ecogreenmovers.co.uk`) | brand_role | Department | Sees |
|---|---|---|---|
| `owner`    | admin    | admin     | Everything, across all six brands. Platform admin. |
| `manager`  | manager  | admin     | EcoGreen only: all modules except brand administration. |
| `accounts` | accounts | accounts  | EcoGreen: invoices and payments write, pipeline read. |
| `ops`      | ops      | transport | EcoGreen: jobs, calendar, fleet, assignments. |
| `sales`    | sales    | sales     | EcoGreen: leads, quotes, customers. No jobs. |
| `crew`     | crew     | movers    | Only jobs they are assigned to, and no prices. |
| `viewer`   | readonly | support   | Read-only. No writes anywhere. |

All are granted on **EcoGreen Movers** only, except `owner`: `has_brand_access`
treats the `admin` role as not brand-scoped, so the owner reaches all six.

## Verified ladder

Measured by calling the real helpers with each account's JWT claim set:

| account | readonly | sales | ops | accounts | manager | admin | other brands |
|---|---|---|---|---|---|---|---|
| owner    | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| manager  | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| accounts | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| ops      | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| sales    | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| crew     | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| viewer   | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

Crew and readonly look identical at brand level by design: crew are separated
by assignment (`private.is_assigned_to_job`), not by brand rank, and crew rank
clears `vehicles_read` where readonly does not.

## Creating more

Do **not** insert into `auth.users` by hand for real staff — use Supabase →
Authentication → Add user, then link the staff row:

```sql
insert into staff (auth_user_id, full_name, email, department)
values ((select id from auth.users where email = 'them@ecogreenmovers.co.uk'),
        'Their Name', 'them@ecogreenmovers.co.uk', 'sales');

insert into staff_brand_access (staff_id, brand_id, role)
select s.id, b.id, 'sales'
from staff s, brands b
where s.email = 'them@ecogreenmovers.co.uk' and b.slug = 'ecogreen-movers';
```

The `staff_brand_access` guard trigger requires an existing platform admin, so
run the second statement while signed in as `owner`, or disable the trigger for
the duration as `SETUP.md` shows.
