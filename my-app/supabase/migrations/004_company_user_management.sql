-- Ideal Solutions Pro ΓÇö company accounts, multi-role members, invites, audit trail
-- Mirrors pricing-backend/src/db/schema.ts (COMPANY_USER_SQL)

insert into public.roles (id, label, permissions) values
  ('owner', 'Owner', '{"all": true, "subscription": true, "user_management": true}'::jsonb),
  ('superintendent', 'Superintendent', '{"assigned_jobs": true, "verify_phases": true, "phase_approvals": true, "inspection_notes": true, "job_photos": true}'::jsonb),
  ('check_guy', 'Check Guy', '{"draw_notifications": true, "draw_approvals": true, "approval_history": true, "verify_phases": true}'::jsonb)
on conflict (id) do update set
  label = excluded.label,
  permissions = excluded.permissions;

-- Note: Supabase project may use separate auth.users; link app user_id (text) from pricing-backend.

create table if not exists public.company_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  owner_user_id text not null,
  subscription_tier text not null default 'side_hustle',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_accounts_owner on public.company_accounts (owner_user_id);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_accounts (id) on delete cascade,
  user_id text not null,
  role_id text not null,
  status text not null default 'active',
  invited_by_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index if not exists idx_company_members_company on public.company_members (company_id);
create index if not exists idx_company_members_user on public.company_members (user_id);

create table if not exists public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_accounts (id) on delete cascade,
  email text not null default '',
  role_id text not null,
  code text not null unique,
  invited_by_user_id text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by_user_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_company_invites_company on public.company_invites (company_id);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_accounts (id) on delete cascade,
  user_id text,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_events_company on public.audit_events (company_id, created_at desc);

-- TODO: RLS policies scoped by company_id + auth.uid() when Supabase Auth replaces pricing-backend tokens
