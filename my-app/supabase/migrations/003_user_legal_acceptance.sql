-- Legal acceptance timestamps for Ideal Solutions Pro (Supabase)
-- Apply when EXPO_PUBLIC_SUPABASE_URL is configured.

create table if not exists public.user_legal_acceptance (
  user_id text primary key,
  accepted_privacy_policy_at timestamptz,
  accepted_terms_at timestamptz,
  accepted_ai_disclaimer_at timestamptz,
  accepted_gps_consent_at timestamptz,
  accepted_data_deletion_policy_at timestamptz,
  accepted_eula_at timestamptz,
  policy_version text,
  app_version text,
  updated_at timestamptz not null default now()
);

-- TODO: enable RLS policies per auth.uid()
