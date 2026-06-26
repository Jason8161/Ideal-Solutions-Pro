-- Add tracking disclaimer acceptance timestamp (policy v1.1.0)

alter table if exists public.user_legal_acceptance
  add column if not exists accepted_tracking_disclaimer_at timestamptz;
