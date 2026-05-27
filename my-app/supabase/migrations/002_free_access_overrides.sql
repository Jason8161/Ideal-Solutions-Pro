-- Ideal Solutions Pro — admin-granted free subscription overrides
-- Apply after 001_subscription_trial.sql when Supabase is configured.

-- ---------------------------------------------------------------------------
-- Admins (grant/edit overrides; users cannot self-promote)
-- ---------------------------------------------------------------------------
create table if not exists public.app_subscription_admins (
  user_id text primary key,
  email text,
  created_at timestamptz not null default now()
);

comment on table public.app_subscription_admins is
  'Users allowed to grant or edit free_access_overrides. Seed rows via SQL or dashboard.';

-- ---------------------------------------------------------------------------
-- Free access overrides (one active row per user; upsert on grant)
-- ---------------------------------------------------------------------------
create table if not exists public.free_access_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  email text,
  username text,
  free_access_enabled boolean not null default true,
  free_access_tier text not null,
  free_access_start_date timestamptz not null default now(),
  free_access_expiration_date timestamptz,
  free_access_reason text,
  granted_by_admin_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint free_access_overrides_tier_check check (
    free_access_tier in (
      'side_hustle',
      'boss_man',
      'super_boss',
      'super_boss_man',
      'enterprise_boss',
      'enterprise_boss_man'
    )
  )
);

create unique index if not exists free_access_overrides_user_id_key
  on public.free_access_overrides (user_id);

create index if not exists free_access_overrides_email_idx
  on public.free_access_overrides (lower(email));

create index if not exists free_access_overrides_username_idx
  on public.free_access_overrides (lower(username));

comment on table public.free_access_overrides is
  'Admin-granted complimentary tier. RevenueCat paid entitlements take precedence in the app.';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_subscription_admin(p_user_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_subscription_admins a
    where a.user_id = p_user_id
  );
$$;

create or replace function public.free_access_override_is_active(
  p_enabled boolean,
  p_expiration timestamptz
)
returns boolean
language sql
immutable
as $$
  select coalesce(p_enabled, false)
    and (p_expiration is null or p_expiration > now());
$$;

-- Read active override for a user (callable with anon key; only exposes non-secret grant metadata).
create or replace function public.get_active_free_access_override(p_user_id text)
returns table (
  user_id text,
  email text,
  username text,
  free_access_enabled boolean,
  free_access_tier text,
  free_access_start_date timestamptz,
  free_access_expiration_date timestamptz,
  free_access_reason text,
  granted_by_admin_user_id text,
  is_active boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.user_id,
    o.email,
    o.username,
    o.free_access_enabled,
    o.free_access_tier,
    o.free_access_start_date,
    o.free_access_expiration_date,
    o.free_access_reason,
    o.granted_by_admin_user_id,
    public.free_access_override_is_active(o.free_access_enabled, o.free_access_expiration_date) as is_active
  from public.free_access_overrides o
  where o.user_id = p_user_id
  limit 1;
$$;

-- Admin search: email, username, or user_id (partial match).
create or replace function public.search_free_access_overrides(
  p_admin_user_id text,
  p_query text,
  p_limit int default 25
)
returns setof public.free_access_overrides
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q text := lower(trim(coalesce(p_query, '')));
begin
  if not public.is_subscription_admin(p_admin_user_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if q = '' then
    return query
      select * from public.free_access_overrides o
      order by o.updated_at desc
      limit greatest(1, least(coalesce(p_limit, 25), 100));
  end if;

  return query
    select * from public.free_access_overrides o
    where lower(o.user_id) like '%' || q || '%'
       or lower(coalesce(o.email, '')) like '%' || q || '%'
       or lower(coalesce(o.username, '')) like '%' || q || '%'
    order by o.updated_at desc
    limit greatest(1, least(coalesce(p_limit, 25), 100));
end;
$$;

-- Admin upsert grant.
create or replace function public.upsert_free_access_override(
  p_admin_user_id text,
  p_user_id text,
  p_email text,
  p_username text,
  p_free_access_enabled boolean,
  p_free_access_tier text,
  p_free_access_start_date timestamptz,
  p_free_access_expiration_date timestamptz,
  p_free_access_reason text
)
returns public.free_access_overrides
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.free_access_overrides;
begin
  if not public.is_subscription_admin(p_admin_user_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if trim(coalesce(p_user_id, '')) = '' then
    raise exception 'user_id_required';
  end if;

  insert into public.free_access_overrides (
    user_id,
    email,
    username,
    free_access_enabled,
    free_access_tier,
    free_access_start_date,
    free_access_expiration_date,
    free_access_reason,
    granted_by_admin_user_id,
    updated_at
  )
  values (
    trim(p_user_id),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_username, '')), ''),
    coalesce(p_free_access_enabled, true),
    trim(p_free_access_tier),
    coalesce(p_free_access_start_date, now()),
    p_free_access_expiration_date,
    nullif(trim(coalesce(p_free_access_reason, '')), ''),
    p_admin_user_id,
    now()
  )
  on conflict (user_id) do update set
    email = excluded.email,
    username = excluded.username,
    free_access_enabled = excluded.free_access_enabled,
    free_access_tier = excluded.free_access_tier,
    free_access_start_date = excluded.free_access_start_date,
    free_access_expiration_date = excluded.free_access_expiration_date,
    free_access_reason = excluded.free_access_reason,
    granted_by_admin_user_id = excluded.granted_by_admin_user_id,
    updated_at = now()
  returning * into row;

  return row;
end;
$$;

grant execute on function public.get_active_free_access_override(text) to anon, authenticated;
grant execute on function public.search_free_access_overrides(text, text, int) to anon, authenticated;
grant execute on function public.upsert_free_access_override(
  text, text, text, text, boolean, text, timestamptz, timestamptz, text
) to anon, authenticated;
grant execute on function public.is_subscription_admin(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.app_subscription_admins enable row level security;
alter table public.free_access_overrides enable row level security;

-- Admins: full access when JWT sub / user_id matches app_subscription_admins.
-- Users: SELECT own row only (when Supabase Auth sub matches user_id text).
create policy free_access_overrides_select_own
  on public.free_access_overrides
  for select
  to authenticated
  using (
    user_id = coalesce(auth.jwt() ->> 'sub', auth.jwt() ->> 'user_id', '')
  );

create policy free_access_overrides_admin_all
  on public.free_access_overrides
  for all
  to authenticated
  using (
    exists (
      select 1 from public.app_subscription_admins a
      where a.user_id = coalesce(auth.jwt() ->> 'sub', auth.jwt() ->> 'user_id', '')
    )
  )
  with check (
    exists (
      select 1 from public.app_subscription_admins a
      where a.user_id = coalesce(auth.jwt() ->> 'sub', auth.jwt() ->> 'user_id', '')
    )
  );

-- Direct table writes from clients are blocked for non-admins; app uses SECURITY DEFINER RPCs.
create policy free_access_overrides_deny_insert_non_admin
  on public.free_access_overrides
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.app_subscription_admins a
      where a.user_id = coalesce(auth.jwt() ->> 'sub', auth.jwt() ->> 'user_id', '')
    )
  );

create policy free_access_overrides_deny_update_non_admin
  on public.free_access_overrides
  for update
  to authenticated
  using (
    exists (
      select 1 from public.app_subscription_admins a
      where a.user_id = coalesce(auth.jwt() ->> 'sub', auth.jwt() ->> 'user_id', '')
    )
  );

create policy app_subscription_admins_select
  on public.app_subscription_admins
  for select
  to authenticated
  using (true);

-- Example seed (replace with your owner account user_id + email):
-- insert into public.app_subscription_admins (user_id, email)
-- values ('local_xxx', 'owner@idealsolutionspro.com')
-- on conflict (user_id) do nothing;
