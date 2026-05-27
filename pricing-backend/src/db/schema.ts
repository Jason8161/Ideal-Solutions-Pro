/**
 * Single migration blob so `npm run build` does not require copying .sql files.
 *
 * Data model: `supplier` on products/pricing is the store catalog key — one catalog per
 * retailer (homedepot, lowes, graybar, rexel, grainger, etc.). Rows from weekly CSV drops
 * in `catalogs/<store>.csv` upsert into the same tables keyed by (supplier, sku).
 */
export const INIT_SQL = `
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier TEXT NOT NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  category TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier, sku)
);

CREATE TABLE IF NOT EXISTS pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  supplier TEXT NOT NULL,
  price NUMERIC(14, 4) NOT NULL,
  unit TEXT DEFAULT '',
  availability TEXT DEFAULT '',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id)
);

CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products (supplier);
CREATE INDEX IF NOT EXISTS idx_pricing_last_updated ON pricing (last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_supplier_price ON pricing (supplier, price);

CREATE TABLE IF NOT EXISTS pricing_refresh_state (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_run_started_at TIMESTAMPTZ,
  last_run_finished_at TIMESTAMPTZ,
  last_run_provider TEXT,
  last_run_rows INTEGER DEFAULT 0,
  last_error TEXT
);

INSERT INTO pricing_refresh_state (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE pricing_refresh_state ADD COLUMN IF NOT EXISTS last_weekly_run_started_at TIMESTAMPTZ;
ALTER TABLE pricing_refresh_state ADD COLUMN IF NOT EXISTS last_weekly_run_finished_at TIMESTAMPTZ;
ALTER TABLE pricing_refresh_state ADD COLUMN IF NOT EXISTS last_weekly_run_rows INTEGER DEFAULT 0;
ALTER TABLE pricing_refresh_state ADD COLUMN IF NOT EXISTS last_weekly_supplier_counts JSONB DEFAULT '{}'::jsonb;
`;

/** Boss / Employee workspace (companies, invites, messages, assignments). */
export const WORKSPACE_SQL = `
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  boss_device_id TEXT,
  boss_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_boss_device ON companies (boss_device_id);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb
);

INSERT INTO roles (id, label, permissions) VALUES
  ('boss', 'Boss / Contractor (legacy id)', '{"all": true}'::jsonb),
  ('contractor', 'Contractor / Owner', '{"all": true}'::jsonb),
  ('admin', 'Company admin', '{"all": true}'::jsonb),
  ('employee', 'Field employee', '{"assigned_jobs": true, "schedule": true, "messages": true, "time_clock": true, "job_photos": true, "tasks": true, "material_requests": true, "daily_notes": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles (id),
  display_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  auth_token TEXT NOT NULL UNIQUE,
  device_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_company ON users (company_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_token ON users (auth_token);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  local_employee_id TEXT DEFAULT '',
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_company ON employees (company_id);
CREATE INDEX IF NOT EXISTS idx_employees_local ON employees (company_id, local_employee_id);

CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  invited_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  employee_id UUID REFERENCES employees (id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  redeemed_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_company ON invites (company_id);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  local_job_id TEXT DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  customer_name TEXT DEFAULT '',
  address TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs (company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_company_local ON jobs (company_id, local_job_id) WHERE local_job_id <> '';

CREATE TABLE IF NOT EXISTS job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_job_assignments_employee ON job_assignments (employee_id);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL,
  channel_id TEXT NOT NULL DEFAULT '',
  sender_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages (company_id, channel_type, channel_id, created_at DESC);

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees (id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs (id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_clock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs (id) ON DELETE SET NULL,
  clock_in_at TIMESTAMPTZ NOT NULL,
  clock_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs (id) ON DELETE SET NULL,
  employee_id UUID REFERENCES employees (id) ON DELETE SET NULL,
  url TEXT DEFAULT '',
  caption TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  data JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS clock_verification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  local_event_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  local_employee_id TEXT NOT NULL DEFAULT '',
  local_job_id TEXT DEFAULT '',
  device_timestamp TIMESTAMPTZ NOT NULL,
  server_received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_id TEXT DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT DEFAULT '',
  accuracy DOUBLE PRECISION,
  jobsite_verification JSONB DEFAULT '{}'::jsonb,
  shift_duration_ms BIGINT,
  notes TEXT DEFAULT '',
  job_completion_status TEXT DEFAULT '',
  time_entry_id TEXT DEFAULT '',
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, local_event_id)
);

CREATE INDEX IF NOT EXISTS idx_clock_verification_company ON clock_verification_events (company_id, device_timestamp DESC);

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, expo_push_token)
);
`;
