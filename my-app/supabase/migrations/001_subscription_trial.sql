-- Ideal Solutions Pro — trial + subscription state (Supabase)
-- Apply when EXPO_PUBLIC_SUPABASE_URL is configured.

create table if not exists public.trial_records (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  device_id text not null,
  email text,
  apple_id text,
  google_id text,
  interest_tier text not null,
  trial_start_date timestamptz not null default now(),
  trial_used boolean not null default false,
  ai_requests_used int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists trial_records_user_id_key on public.trial_records (user_id);
create unique index if not exists trial_records_device_id_key on public.trial_records (device_id);

create table if not exists public.user_subscription_state (
  user_id text primary key,
  active_tier text,
  revenue_cat_app_user_id text,
  monthly_ai_used int not null default 0,
  monthly_ai_reset_at timestamptz,
  ai_addon_credits int not null default 0,
  updated_at timestamptz not null default now()
);

-- TODO: enable RLS policies per auth.uid()
-- TODO: RPC check_trial_eligibility(p_user_id, p_device_id, p_email, p_apple_id, p_google_id)
