-- ════════════════════════════════════════════════════════════════════════
-- TRIAL / SELF-SERVE SIGNUP MIGRATION  v2
-- Run this in Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════════════

-- 1. Add trial/payment tracking columns to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  ADD COLUMN IF NOT EXISTS signup_source TEXT DEFAULT 'manual';

-- Backfill all existing companies as paid so nobody currently live gets locked out
UPDATE public.companies
SET is_paid = true
WHERE is_paid IS NOT true;

-- 2. Index for fast trial-expiry checks
CREATE INDEX IF NOT EXISTS idx_companies_trial_ends_at
  ON public.companies(trial_ends_at) WHERE is_paid = false;

-- 3. Drop and recreate signup_company cleanly
DROP FUNCTION IF EXISTS public.signup_company(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.signup_company(
  p_company_name   TEXT,
  p_admin_name     TEXT,
  p_admin_email    TEXT,
  p_admin_password TEXT,
  p_industry       TEXT DEFAULT 'General'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id   TEXT;
  v_username     TEXT;
  v_slug_base    TEXT;
  v_recent_count INT;
  v_user_result  JSONB;
  v_user_text    TEXT;
BEGIN
  -- Input validation
  IF p_company_name IS NULL OR length(trim(p_company_name)) < 2 THEN
    RETURN jsonb_build_object('error', 'Company name must be at least 2 characters');
  END IF;
  IF p_admin_email IS NULL OR p_admin_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('error', 'Please enter a valid email address');
  END IF;
  IF p_admin_password IS NULL OR length(p_admin_password) < 6 THEN
    RETURN jsonb_build_object('error', 'Password must be at least 6 characters');
  END IF;
  IF p_admin_name IS NULL OR length(trim(p_admin_name)) < 2 THEN
    RETURN jsonb_build_object('error', 'Please enter your name');
  END IF;

  -- Rate limit: max 10 self-signups per hour globally
  SELECT count(*) INTO v_recent_count
  FROM public.companies
  WHERE signup_source = 'self_signup'
    AND created_on > now() - INTERVAL '1 hour';
  IF v_recent_count >= 10 THEN
    RETURN jsonb_build_object('error', 'Too many signups right now. Please try again shortly or contact us directly.');
  END IF;

  -- Reject duplicate email (platform-wide uniqueness)
  IF EXISTS (
    SELECT 1 FROM public.users WHERE lower(email) = lower(trim(p_admin_email))
  ) THEN
    RETURN jsonb_build_object('error', 'An account with this email already exists. Try signing in instead.');
  END IF;

  -- Build unique company ID
  v_slug_base := lower(regexp_replace(p_company_name, '[^a-zA-Z0-9]', '', 'g'));
  v_slug_base := left(v_slug_base, 10);
  IF v_slug_base = '' THEN v_slug_base := 'co'; END IF;
  v_company_id := v_slug_base || lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  -- Build username from admin name
  v_username := lower(regexp_replace(trim(p_admin_name), '\s+', '.', 'g'));

  -- Create company row with trial period
  INSERT INTO public.companies (
    id, name, industry, plan, max_users, status,
    signup_source, trial_started_at, trial_ends_at, is_paid, created_on
  ) VALUES (
    v_company_id, trim(p_company_name), COALESCE(nullif(trim(p_industry),''), 'General'),
    'Starter', 5, 'Active',
    'self_signup', now(), now() + INTERVAL '7 days', false, now()
  );

  -- Create default policy row
  INSERT INTO public.policy (company_id) VALUES (v_company_id);

  -- Create admin user — call create_manager_account and capture result as text first,
  -- then cast to JSONB so we handle both JSON and non-JSON return types safely
  BEGIN
    SELECT public.create_manager_account(
      p_company_id := v_company_id,
      p_name       := trim(p_admin_name),
      p_email      := lower(trim(p_admin_email)),
      p_username   := v_username,
      p_password   := p_admin_password,
      p_mobile     := NULL,
      p_avatar     := upper(left(trim(p_admin_name), 2)),
      p_role       := 'admin'
    )::text INTO v_user_text;

    -- Try to parse result as JSONB to check for errors
    BEGIN
      v_user_result := v_user_text::jsonb;
      IF v_user_result ? 'error' THEN
        -- User creation reported an error — roll back company and policy
        DELETE FROM public.policy WHERE company_id = v_company_id;
        DELETE FROM public.companies WHERE id = v_company_id;
        RETURN v_user_result;
      END IF;
    EXCEPTION WHEN others THEN
      -- create_manager_account returned non-JSON (e.g. plain text success) — that's fine
      NULL;
    END;

  EXCEPTION WHEN others THEN
    -- create_manager_account threw an exception — clean up and surface the error
    DELETE FROM public.policy WHERE company_id = v_company_id;
    DELETE FROM public.companies WHERE id = v_company_id;
    RETURN jsonb_build_object('error', 'Failed to create admin account: ' || SQLERRM);
  END;

  RETURN jsonb_build_object(
    'success',      true,
    'company_id',   v_company_id,
    'company_name', trim(p_company_name),
    'username',     v_username,
    'trial_ends_at',(now() + INTERVAL '7 days')::text
  );
END;
$$;

-- Allow public (anonymous) callers — this is the self-serve signup endpoint
GRANT EXECUTE ON FUNCTION public.signup_company(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.signup_company(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- Verify
-- ════════════════════════════════════════════════════════════════════════
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'companies'
  AND column_name IN ('is_paid','trial_started_at','trial_ends_at','signup_source')
ORDER BY column_name;

SELECT proname, prorettype::regtype AS returns
FROM pg_proc WHERE proname = 'signup_company';
