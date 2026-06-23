-- ═══════════════════════════════════════════════════════════════════════════
--  HisaabHub — Fix RLS policies that are blocking login
--  Run this ENTIRE script in Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Step 1: Fix super_admins RLS ─────────────────────────────────────────
-- The current policy only allows SA to read, but SA is determined BY reading this table.
-- Allow authenticated users to check if their own ID is in super_admins.

DROP POLICY IF EXISTS "Super admin sees all companies" ON public.super_admins;
DROP POLICY IF EXISTS "Super admin manages companies" ON public.super_admins;

-- Replace with: any authenticated user can check if THEY are a super admin
CREATE POLICY "Users can check own super_admin status"
  ON public.super_admins FOR SELECT
  USING (id = auth.uid());

-- ── Step 2: Fix users table RLS ───────────────────────────────────────────
-- Users must be able to read their OWN profile row on login
-- (current policy requires my_company_id() which requires a profile row to exist — chicken and egg)

DROP POLICY IF EXISTS "Users in same company can see each other" ON public.users;
DROP POLICY IF EXISTS "Super admin sees all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Manager can insert/update users in company" ON public.users;
DROP POLICY IF EXISTS "Manager can update users in company" ON public.users;
DROP POLICY IF EXISTS "Manager can delete users in company" ON public.users;

-- Recreate clean policies
-- Any authenticated user can read their own row (needed for login resolution)
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid());

-- Company members can see each other (for dropdowns, etc.)
CREATE POLICY "Company members see each other"
  ON public.users FOR SELECT
  USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Super admins see all
CREATE POLICY "Super admins see all users"
  ON public.users FOR ALL
  USING (EXISTS (SELECT 1 FROM public.super_admins WHERE id = auth.uid()));

-- Users can update their own profile
CREATE POLICY "Users update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

-- Managers can insert new users in their company
CREATE POLICY "Managers insert users"
  ON public.users FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'manager'
  );

-- Managers can update users in their company
CREATE POLICY "Managers update users"
  ON public.users FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'manager'
  );

-- Managers can delete users in their company
CREATE POLICY "Managers delete users"
  ON public.users FOR DELETE
  USING (
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'manager'
  );

-- ── Step 3: Make sure your super admin row exists ─────────────────────────
-- Find your admin user's UUID first:
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10;

-- Then run this (replace the UUID with yours from the query above):
-- INSERT INTO public.super_admins (id)
-- SELECT id FROM auth.users WHERE email = 'admin@hisaabhub.in'
-- ON CONFLICT DO NOTHING;

-- Or just run this directly (auto-looks up the email):
INSERT INTO public.super_admins (id)
SELECT id FROM auth.users WHERE email = 'rushabh@rbshah.co.in'
ON CONFLICT DO NOTHING;

-- ── Step 4: Verify ────────────────────────────────────────────────────────
SELECT 
  au.email,
  au.id as auth_id,
  sa.id as sa_row,
  u.id as users_row,
  u.role
FROM auth.users au
LEFT JOIN public.super_admins sa ON sa.id = au.id
LEFT JOIN public.users u ON u.id = au.id
ORDER BY au.created_at DESC
LIMIT 20;

-- Expected result for super admin:
--   email = admin@hisaabhub.in
--   auth_id = some-uuid
--   sa_row = same-uuid   ← must not be NULL
--   users_row = NULL     ← SA has no company, so no users row is correct

-- Expected result for a company admin (e.g. rushabh@rbshah.in):
--   sa_row = NULL
--   users_row = their-uuid
--   role = manager
