-- Employee RBAC — RLS scaffold for Supabase when auth replaces pricing-backend tokens.
-- Apply after 004_company_user_management.sql. Policies are permissive until Supabase Auth is wired.

-- Employees read only company members in their company (no cross-company).
alter table public.company_members enable row level security;

create policy company_members_employee_read_self
  on public.company_members
  for select
  using (
    auth.uid()::text = user_id
    or exists (
      select 1
      from public.company_members boss
      where boss.user_id = auth.uid()::text
        and boss.company_id = company_members.company_id
        and boss.role_id in ('owner', 'admin')
    )
  );

-- Employees cannot change roles or invite users.
create policy company_members_boss_manage
  on public.company_members
  for all
  using (
    exists (
      select 1
      from public.company_members boss
      where boss.user_id = auth.uid()::text
        and boss.company_id = company_members.company_id
        and boss.role_id in ('owner', 'admin')
    )
  );

alter table public.company_invites enable row level security;

create policy company_invites_boss_only
  on public.company_invites
  for all
  using (
    exists (
      select 1
      from public.company_members boss
      where boss.user_id = auth.uid()::text
        and boss.company_id = company_invites.company_id
        and boss.role_id in ('owner', 'admin')
    )
  );

-- Audit: employees read-only within company; bosses full access.
alter table public.audit_events enable row level security;

create policy audit_events_company_read
  on public.audit_events
  for select
  using (
    exists (
      select 1
      from public.company_members m
      where m.user_id = auth.uid()::text
        and m.company_id = audit_events.company_id
    )
  );

create policy audit_events_boss_write
  on public.audit_events
  for insert
  with check (
    exists (
      select 1
      from public.company_members boss
      where boss.user_id = auth.uid()::text
        and boss.company_id = audit_events.company_id
        and boss.role_id in ('owner', 'admin')
    )
  );

-- TODO: clock_events / job_assignments tables when synced to Supabase — employee SELECT own rows only.
