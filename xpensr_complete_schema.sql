-- ═══════════════════════════════════════════════════════════════════════════════
--  XpensR by RB — Complete Supabase Schema
--  Run in: Supabase Dashboard → SQL Editor → New Query
--  Order matters — run top to bottom in one go.
--  Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE / ON CONFLICT.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── PART 0: Extensions ────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: CORE TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── companies ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.companies (
  id           TEXT PRIMARY KEY,                    -- slug e.g. "rbshah"
  name         TEXT NOT NULL,
  industry     TEXT DEFAULT 'General',
  plan         TEXT DEFAULT 'Starter',              -- Starter | Growth | Scale | Enterprise
  max_users    INTEGER DEFAULT 5,
  status       TEXT DEFAULT 'Active',               -- Active | Suspended
  created_on   DATE DEFAULT CURRENT_DATE,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── super_admins ──────────────────────────────────────────────────────────────
-- One row per XpensR platform super-admin (not company admin)
CREATE TABLE IF NOT EXISTS public.super_admins (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id            TEXT PRIMARY KEY,
  company_id    TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  auth_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  email         TEXT,
  mobile        TEXT,
  username      TEXT,
  password_hash TEXT,                               -- bcrypt hash; never plaintext
  role          TEXT NOT NULL DEFAULT 'employee',  -- admin|manager|finance|hr|cfo|employee
  dept          TEXT,
  grade         INTEGER DEFAULT 0,
  grade_label   TEXT,
  group_id      TEXT,
  reporting_to  TEXT,
  balance       NUMERIC(12,2) DEFAULT 0,
  reimbursable  NUMERIC(12,2) DEFAULT 0,
  delegate_to   TEXT,
  delegate_until DATE,
  is_suspended  BOOLEAN DEFAULT FALSE,
  auth_type     TEXT DEFAULT 'custom',
  notify_email  BOOLEAN DEFAULT TRUE,
  notify_wa     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_company ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_auth    ON public.users(auth_user_id);

-- ── employee_groups ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_groups (
  id         TEXT PRIMARY KEY,
  company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  dept       TEXT,
  manager_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── user_group_memberships ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_group_memberships (
  user_id    TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  group_id   TEXT REFERENCES public.employee_groups(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, group_id)
);

-- ── policy ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.policy (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id               TEXT UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  auto_approve_limit       NUMERIC(12,2) DEFAULT 0,
  auto_approve_mins        INTEGER DEFAULT 10,
  dual_approve_above       NUMERIC(12,2) DEFAULT 0,
  receipt_mandatory_above  NUMERIC(12,2) DEFAULT 0,
  weekend_requires_approval BOOLEAN DEFAULT FALSE,
  reimbursement_mode       BOOLEAN DEFAULT FALSE,
  grade_based              BOOLEAN DEFAULT FALSE,
  city_tiers_enabled       BOOLEAN DEFAULT FALSE,
  approval_hierarchy       JSONB DEFAULT '[]',
  grade_entitlements       JSONB DEFAULT '[]',
  city_tiers               JSONB DEFAULT '{}',
  city_classification      JSONB DEFAULT '{}',
  monthly_dept_budgets     JSONB DEFAULT '{}',
  department_budgets       JSONB DEFAULT '{}',
  category_limits          JSONB DEFAULT '{}',
  departments              JSONB DEFAULT '[]',
  categories               JSONB DEFAULT '[]',
  vendor_whitelist         JSONB DEFAULT '[]',
  vendor_blacklist         JSONB DEFAULT '[]',
  trip_purposes            JSONB DEFAULT '[]',
  escalation_timer_hrs     INTEGER DEFAULT 24,
  notice_domestic_days     INTEGER DEFAULT 1,
  notice_overseas_days     INTEGER DEFAULT 3,
  conveyance_rate_per_km   NUMERIC(6,2) DEFAULT 4,
  transport_classes        JSONB DEFAULT '{}',
  primary_color            TEXT DEFAULT '#7ED957',
  whatsapp_enabled         BOOLEAN DEFAULT FALSE,
  email_enabled            BOOLEAN DEFAULT TRUE,
  multi_level_approval     BOOLEAN DEFAULT FALSE,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ── trips ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trips (
  id               TEXT PRIMARY KEY,
  company_id       TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  type             TEXT DEFAULT 'trip',
  trip_mode        TEXT DEFAULT 'balance',        -- balance | reimbursement
  status           TEXT DEFAULT 'pending_approval',
  start_date       DATE,
  end_date         DATE,
  budget           NUMERIC(12,2) DEFAULT 0,
  spent            NUMERIC(12,2) DEFAULT 0,
  topups_total     NUMERIC(12,2) DEFAULT 0,
  currency         TEXT DEFAULT 'INR',
  purpose          TEXT,
  customer_name    TEXT,
  accompanying     TEXT,
  domestic_overseas TEXT DEFAULT 'domestic',
  advance_amount   NUMERIC(12,2) DEFAULT 0,
  project_code     TEXT,
  employee_budgets JSONB DEFAULT '{}',
  category_limits  JSONB DEFAULT '{}',
  settled_at       TIMESTAMPTZ,
  settled_by       TEXT,
  created_by       TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  approved_by      TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trips_company ON public.trips(company_id);

-- ── trip_assignments ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_assignments (
  trip_id    TEXT REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id    TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  PRIMARY KEY (trip_id, user_id)
);

-- ── trip_legs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_legs (
  id           TEXT PRIMARY KEY,
  trip_id      TEXT REFERENCES public.trips(id) ON DELETE CASCADE,
  company_id   TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  from_city    TEXT,
  to_city      TEXT,
  city_tier    TEXT DEFAULT 'D',
  depart_at    DATE,
  arrive_at    DATE,
  mode         TEXT DEFAULT 'Air',
  hotel_limit  NUMERIC(10,2) DEFAULT 0,
  diem_rate    NUMERIC(10,2) DEFAULT 0,
  sort_order   INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_trip_legs_trip ON public.trip_legs(trip_id);

-- ── claims ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.claims (
  id               TEXT PRIMARY KEY,
  company_id       TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  trip_id          TEXT REFERENCES public.trips(id) ON DELETE CASCADE,
  emp_id           TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  date             DATE,
  category         TEXT,
  description      TEXT,
  vendor           TEXT,
  amount           NUMERIC(12,2) NOT NULL,
  orig_amount      NUMERIC(12,2),
  orig_currency    TEXT DEFAULT 'INR',
  status           TEXT DEFAULT 'Pending',
  auto_approved    BOOLEAN DEFAULT FALSE,
  remarks          TEXT,
  flagged          BOOLEAN DEFAULT FALSE,
  anomaly          BOOLEAN DEFAULT FALSE,
  anomaly_reasons  JSONB DEFAULT '[]',
  manual_edits     JSONB DEFAULT '{}',
  budget_breached  BOOLEAN DEFAULT FALSE,
  weekend_flag     BOOLEAN DEFAULT FALSE,
  leg_id           TEXT REFERENCES public.trip_legs(id) ON DELETE SET NULL,
  city             TEXT,
  city_tier        TEXT DEFAULT 'D',
  gst_amount       NUMERIC(10,2) DEFAULT 0,
  gst_itc          BOOLEAN,
  notes            TEXT,
  project_code     TEXT,
  transport_class  TEXT,
  receipts         JSONB DEFAULT '[]',
  comments         JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_claims_company ON public.claims(company_id);
CREATE INDEX IF NOT EXISTS idx_claims_trip    ON public.claims(trip_id);
CREATE INDEX IF NOT EXISTS idx_claims_emp     ON public.claims(emp_id);
CREATE INDEX IF NOT EXISTS idx_claims_status  ON public.claims(company_id, status);

-- ── receipts ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.receipts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id     TEXT REFERENCES public.claims(id) ON DELETE CASCADE,
  company_id   TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name    TEXT,
  mime_type    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── topups ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.topups (
  id          TEXT PRIMARY KEY,
  company_id  TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  emp_id      TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  trip_id     TEXT REFERENCES public.trips(id) ON DELETE SET NULL,
  amount      NUMERIC(12,2) NOT NULL,
  reason      TEXT,
  status      TEXT DEFAULT 'Pending',            -- Pending | Approved | Rejected
  date        DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_topups_company ON public.topups(company_id);

-- ── edit_requests ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.edit_requests (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  claim_id   TEXT REFERENCES public.claims(id) ON DELETE CASCADE,
  emp_id     TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  reason     TEXT,
  status     TEXT DEFAULT 'Pending',             -- Pending | Approved | Rejected
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── aret_requests ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.aret_requests (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  trip_id      TEXT REFERENCES public.trips(id) ON DELETE CASCADE,
  emp_id       TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  category     TEXT,
  eligible     NUMERIC(12,2) DEFAULT 0,
  expected     NUMERIC(12,2) DEFAULT 0,
  reason       TEXT,
  status       TEXT DEFAULT 'Pending',
  hr_signed_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── budget_enhancements ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budget_enhancements (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id      TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_by    TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  dept            TEXT NOT NULL,
  period          TEXT NOT NULL,                 -- 'monthly' | 'annual'
  current_limit   NUMERIC(12,2) DEFAULT 0,
  requested_limit NUMERIC(12,2) NOT NULL,
  reason          TEXT,
  status          TEXT DEFAULT 'Pending',
  approved_by     TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── audit_log ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  action     TEXT NOT NULL,
  claim_id   TEXT,
  by_name    TEXT,
  by_id      TEXT,
  remarks    TEXT,
  at         TEXT,                               -- formatted timestamp string
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_company ON public.audit_log(company_id, created_at DESC);

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         TEXT PRIMARY KEY,
  company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id    TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  type       TEXT DEFAULT 'info',               -- info | success | error | warn
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON public.notifications(user_id, read, created_at DESC);

-- ── diem_computations ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.diem_computations (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id      TEXT REFERENCES public.trips(id) ON DELETE CASCADE,
  emp_id       TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  company_id   TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  entitlement  NUMERIC(12,2) DEFAULT 0,
  claimed      NUMERIC(12,2) DEFAULT 0,
  approved     NUMERIC(12,2) DEFAULT 0,
  effective    NUMERIC(12,2) DEFAULT 0,
  flat_balance NUMERIC(12,2) DEFAULT 0,
  computed_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: AI TOKEN SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── ai_tokens: one row per company ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_tokens (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  balance       INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  used_total    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  plan_label    TEXT DEFAULT 'Pay-as-you-go',
  last_topup_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);

-- ── ai_token_packs: purchase history ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_token_packs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pack_name    TEXT NOT NULL,
  tokens_added INTEGER NOT NULL CHECK (tokens_added > 0),
  amount_inr   INTEGER NOT NULL DEFAULT 0,
  added_by     TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_token_packs_company ON public.ai_token_packs(company_id, created_at DESC);

-- ── ai_usage_log: per-call audit ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tokens_used    INTEGER NOT NULL CHECK (tokens_used > 0),
  input_tokens   INTEGER NOT NULL DEFAULT 0,
  output_tokens  INTEGER NOT NULL DEFAULT 0,
  model          TEXT NOT NULL,
  feature        TEXT NOT NULL DEFAULT 'unknown', -- 'ocr' | 'chat'
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_company ON public.ai_usage_log(company_id, created_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── authenticate_user: validates custom login ─────────────────────────────────
-- Called by /api/auth serverless function (anon key)
CREATE OR REPLACE FUNCTION public.authenticate_user(p_login TEXT, p_password TEXT)
RETURNS JSONB AS $$
DECLARE
  u           public.users%ROWTYPE;
  co          public.companies%ROWTYPE;
BEGIN
  -- Find user by username, email, or mobile
  SELECT * INTO u FROM public.users
  WHERE company_id IS NOT NULL
    AND is_suspended = FALSE
    AND (
      LOWER(username) = LOWER(TRIM(p_login)) OR
      LOWER(email)    = LOWER(TRIM(p_login)) OR
      mobile          = TRIM(p_login)
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid username or password.');
  END IF;

  -- Validate password (supports both plaintext legacy and bcrypt)
  -- Production: all passwords should be bcrypt hashed
  IF u.password_hash IS NULL OR (
    u.password_hash != p_password AND
    u.password_hash != crypt(p_password, u.password_hash)
  ) THEN
    RETURN jsonb_build_object('error', 'Invalid username or password.');
  END IF;

  -- Get company
  SELECT * INTO co FROM public.companies WHERE id = u.company_id;
  IF co.status = 'Suspended' THEN
    RETURN jsonb_build_object('error', 'Your company account has been suspended. Contact support.');
  END IF;

  -- Return safe user + company payload (never return password_hash)
  RETURN jsonb_build_object(
    'id',         u.id,
    'name',       u.name,
    'email',      u.email,
    'role',       u.role,
    'dept',       u.dept,
    'grade',      u.grade,
    'grade_label',u.grade_label,
    'company_id', u.company_id,
    'companyId',  u.company_id,
    'balance',    u.balance,
    'reimbursable',u.reimbursable,
    'company',    jsonb_build_object(
                    'id',     co.id,
                    'name',   co.name,
                    'plan',   co.plan,
                    'status', co.status
                  )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── deduct_ai_tokens: atomic balance deduction ────────────────────────────────
CREATE OR REPLACE FUNCTION public.deduct_ai_tokens(p_company_id TEXT, p_tokens INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.ai_tokens
  SET
    balance    = GREATEST(0, balance - p_tokens),
    used_total = used_total + p_tokens,
    updated_at = NOW()
  WHERE company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── add_ai_tokens: sell a pack (called by super admin) ───────────────────────
CREATE OR REPLACE FUNCTION public.add_ai_tokens(
  p_company_id  TEXT,
  p_tokens      INTEGER,
  p_pack_name   TEXT  DEFAULT 'Manual Topup',
  p_amount_inr  INTEGER DEFAULT 0,
  p_added_by    TEXT  DEFAULT NULL,
  p_note        TEXT  DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  INSERT INTO public.ai_tokens (company_id, balance, used_total, is_active, plan_label, last_topup_at)
  VALUES (p_company_id, p_tokens, 0, TRUE, p_pack_name, NOW())
  ON CONFLICT (company_id) DO UPDATE SET
    balance       = public.ai_tokens.balance + p_tokens,
    is_active     = TRUE,
    plan_label    = p_pack_name,
    last_topup_at = NOW(),
    updated_at    = NOW()
  RETURNING balance INTO new_balance;

  INSERT INTO public.ai_token_packs (company_id, pack_name, tokens_added, amount_inr, added_by, note)
  VALUES (p_company_id, p_pack_name, p_tokens, p_amount_inr, p_added_by, p_note);

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── create_employee: creates user + optional auth account ────────────────────
CREATE OR REPLACE FUNCTION public.create_employee(
  p_company_id TEXT,
  p_username   TEXT,
  p_password   TEXT,
  p_name       TEXT,
  p_role       TEXT   DEFAULT 'employee',
  p_dept       TEXT   DEFAULT NULL,
  p_email      TEXT   DEFAULT NULL,
  p_mobile     TEXT   DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  new_id TEXT;
BEGIN
  new_id := 'emp_' || REPLACE(gen_random_uuid()::TEXT, '-', '');

  INSERT INTO public.users (id, company_id, username, password_hash, name, role, dept, email, mobile)
  VALUES (
    new_id,
    p_company_id,
    LOWER(TRIM(p_username)),
    crypt(p_password, gen_salt('bf', 10)),  -- bcrypt hash
    p_name,
    p_role,
    p_dept,
    p_email,
    p_mobile
  );

  RETURN jsonb_build_object('id', new_id, 'username', p_username);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── update_password: change a user's password ────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_user_password(p_user_id TEXT, p_new_password TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET password_hash = crypt(p_new_password, gen_salt('bf', 10)),
      updated_at    = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4: ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Strategy:
--   • All AI token tables: NO direct client access (all via service-role serverless)
--   • User data: accessible within same company; admins see all
--   • Super admins: can read everything via their own policy
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.companies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admins        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_groups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_legs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topups              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edit_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aret_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_enhancements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diem_computations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tokens           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_token_packs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log        ENABLE ROW LEVEL SECURITY;

-- Helper: get the current user's company_id from the users table
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS TEXT AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()::TEXT
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get the current user's role
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid()::TEXT
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: is the current session a super admin?
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Drop all old policies before recreating (safe re-run)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT schemaname, tablename, policyname
           FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ── super_admins ──────────────────────────────────────────────────────────────
CREATE POLICY "SA: read own row"
  ON public.super_admins FOR SELECT
  USING (id = auth.uid());

-- ── companies ─────────────────────────────────────────────────────────────────
CREATE POLICY "Users see own company"
  ON public.companies FOR SELECT
  USING (id = public.my_company_id() OR public.is_super_admin());

CREATE POLICY "SA manages companies"
  ON public.companies FOR ALL
  USING (public.is_super_admin());

-- ── users ─────────────────────────────────────────────────────────────────────
-- Every authenticated user can read their own profile (needed for login)
CREATE POLICY "Users: read own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid()::TEXT);

-- Company members see each other
CREATE POLICY "Users: see same company"
  ON public.users FOR SELECT
  USING (company_id = public.my_company_id());

-- Super admins see all
CREATE POLICY "SA: all users"
  ON public.users FOR ALL
  USING (public.is_super_admin());

-- Admins/managers can insert users in their company
CREATE POLICY "Admin/Manager: insert users"
  ON public.users FOR INSERT
  WITH CHECK (
    company_id = public.my_company_id() AND
    public.my_role() IN ('admin', 'manager', 'hr')
  );

-- Users update their own profile; admins/HR can update company users
CREATE POLICY "Users: update own"
  ON public.users FOR UPDATE
  USING (
    id = auth.uid()::TEXT OR
    (company_id = public.my_company_id() AND public.my_role() IN ('admin', 'hr'))
  );

-- Only admin can delete users
CREATE POLICY "Admin: delete users"
  ON public.users FOR DELETE
  USING (company_id = public.my_company_id() AND public.my_role() = 'admin');

-- ── policy ────────────────────────────────────────────────────────────────────
CREATE POLICY "Company: read own policy"
  ON public.policy FOR SELECT
  USING (company_id = public.my_company_id() OR public.is_super_admin());

CREATE POLICY "Admin: manage policy"
  ON public.policy FOR ALL
  USING (company_id = public.my_company_id() AND public.my_role() = 'admin');

-- ── trips ─────────────────────────────────────────────────────────────────────
CREATE POLICY "Company: read trips"
  ON public.trips FOR SELECT
  USING (company_id = public.my_company_id() OR public.is_super_admin());

CREATE POLICY "Company: manage trips"
  ON public.trips FOR ALL
  USING (company_id = public.my_company_id());

-- ── trip_assignments / legs ───────────────────────────────────────────────────
CREATE POLICY "Company: trip_assignments"
  ON public.trip_assignments FOR ALL
  USING (company_id = public.my_company_id() OR public.is_super_admin());

CREATE POLICY "Company: trip_legs"
  ON public.trip_legs FOR ALL
  USING (company_id = public.my_company_id() OR public.is_super_admin());

-- ── claims ────────────────────────────────────────────────────────────────────
CREATE POLICY "Company: read claims"
  ON public.claims FOR SELECT
  USING (company_id = public.my_company_id() OR public.is_super_admin());

CREATE POLICY "Company: manage claims"
  ON public.claims FOR ALL
  USING (company_id = public.my_company_id());

-- ── receipts ──────────────────────────────────────────────────────────────────
CREATE POLICY "Company: receipts"
  ON public.receipts FOR ALL
  USING (company_id = public.my_company_id() OR public.is_super_admin());

-- ── topups ────────────────────────────────────────────────────────────────────
CREATE POLICY "Company: topups"
  ON public.topups FOR ALL
  USING (company_id = public.my_company_id() OR public.is_super_admin());

-- ── edit_requests ─────────────────────────────────────────────────────────────
CREATE POLICY "Company: edit_requests"
  ON public.edit_requests FOR ALL
  USING (company_id = public.my_company_id() OR public.is_super_admin());

-- ── aret_requests ─────────────────────────────────────────────────────────────
CREATE POLICY "Company: aret_requests"
  ON public.aret_requests FOR ALL
  USING (company_id = public.my_company_id() OR public.is_super_admin());

-- ── budget_enhancements ───────────────────────────────────────────────────────
CREATE POLICY "Company: budget_enhancements"
  ON public.budget_enhancements FOR ALL
  USING (company_id = public.my_company_id() OR public.is_super_admin());

-- ── audit_log ─────────────────────────────────────────────────────────────────
CREATE POLICY "Company: audit_log"
  ON public.audit_log FOR ALL
  USING (company_id = public.my_company_id() OR public.is_super_admin());

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE POLICY "Users: own notifications"
  ON public.notifications FOR SELECT
  USING (
    (company_id = public.my_company_id() AND public.my_role() IN ('admin','manager')) OR
    user_id = auth.uid()::TEXT OR
    public.is_super_admin()
  );

CREATE POLICY "Company: manage notifications"
  ON public.notifications FOR ALL
  USING (company_id = public.my_company_id() OR public.is_super_admin());

-- ── employee_groups / memberships ─────────────────────────────────────────────
CREATE POLICY "Company: employee_groups"
  ON public.employee_groups FOR ALL
  USING (company_id = public.my_company_id() OR public.is_super_admin());

CREATE POLICY "Company: user_group_memberships"
  ON public.user_group_memberships FOR ALL
  USING (company_id = public.my_company_id() OR public.is_super_admin());

-- ── diem_computations ─────────────────────────────────────────────────────────
CREATE POLICY "Company: diem_computations"
  ON public.diem_computations FOR ALL
  USING (company_id = public.my_company_id() OR public.is_super_admin());

-- ── AI TOKENS — STRICT ACCESS CONTROL ────────────────────────────────────────
-- Only admin and cfo roles can see ai_tokens balance
-- All writes go through service-role serverless functions (not direct client)
-- No one below admin/cfo level can ever see token data

CREATE POLICY "Admin+CFO: read ai_tokens"
  ON public.ai_tokens FOR SELECT
  USING (
    company_id = public.my_company_id() AND
    public.my_role() IN ('admin', 'cfo')
    OR public.is_super_admin()
  );

-- No direct client writes to ai_tokens — all via service role in serverless
-- (service role bypasses RLS entirely)

CREATE POLICY "Admin+CFO: read ai_token_packs"
  ON public.ai_token_packs FOR SELECT
  USING (
    company_id = public.my_company_id() AND
    public.my_role() IN ('admin', 'cfo')
    OR public.is_super_admin()
  );

CREATE POLICY "Admin+CFO: read ai_usage_log"
  ON public.ai_usage_log FOR SELECT
  USING (
    company_id = public.my_company_id() AND
    public.my_role() IN ('admin', 'cfo')
    OR public.is_super_admin()
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 5: STORAGE BUCKETS (run separately if needed)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Run in Supabase Dashboard → Storage → New Bucket:
--   Name: receipts
--   Public: NO (private)
--   File size limit: 10MB
--   Allowed types: image/jpeg, image/png, image/webp, application/pdf
--
-- Then create storage policy:
-- INSERT INTO storage.policies (name, bucket_id, operation, definition)
-- VALUES (
--   'Authenticated users can upload receipts',
--   'receipts', 'INSERT',
--   '(auth.role() = ''authenticated'')'
-- );


-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 6: SEED SUPER ADMIN
-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: Sign up via Supabase Auth (Dashboard → Auth → Users → Invite user)
-- STEP 2: Replace the email below with your super admin email, then run:

-- INSERT INTO public.super_admins (id)
-- SELECT id FROM auth.users
-- WHERE email = 'your-superadmin@yourdomain.com'
-- ON CONFLICT DO NOTHING;

-- ── Verify setup ──────────────────────────────────────────────────────────────
SELECT
  au.email,
  au.id            AS auth_id,
  sa.id            AS sa_row,
  u.id             AS users_row,
  u.role,
  u.company_id
FROM auth.users au
LEFT JOIN public.super_admins sa ON sa.id = au.id
LEFT JOIN public.users u ON u.auth_user_id = au.id
ORDER BY au.created_at DESC
LIMIT 20;
