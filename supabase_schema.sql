-- ═══════════════════════════════════════════════════════════════════════════
--  HisaabHub by RB — Supabase Database Schema
--  Run this entire file in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── COMPANIES ────────────────────────────────────────────────────────────────
create table public.companies (
  id            text primary key,                        -- e.g. "rbshah"
  name          text not null,
  industry      text not null default 'General',
  plan          text not null default 'Starter' check (plan in ('Starter','Pro','Enterprise')),
  max_users     integer not null default 5,
  status        text not null default 'Active' check (status in ('Active','Suspended')),
  created_on    date not null default current_date,
  primary_color text not null default '#7ED957'
);

-- ─── USERS ────────────────────────────────────────────────────────────────────
-- We use Supabase Auth for authentication (email+password, Google OAuth).
-- This table stores the app profile — linked to auth.users via id.
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  company_id    text not null references public.companies(id) on delete cascade,
  name          text not null,
  email         text not null unique,
  role          text not null default 'employee' check (role in ('manager','employee','auditor','approver','finance')),
  avatar        text not null default 'XX',
  dept          text not null default 'Operations',
  balance       numeric(12,2) not null default 0,
  reimbursable  numeric(12,2) not null default 0,
  delegate_to   uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- Super admin is a special auth user — no company_id needed.
-- We identify SA by checking a separate table:
create table public.super_admins (
  id            uuid primary key references auth.users(id) on delete cascade
);

-- ─── TRIPS ────────────────────────────────────────────────────────────────────
create table public.trips (
  id            text primary key,                        -- e.g. "TRP-001"
  company_id    text not null references public.companies(id) on delete cascade,
  name          text not null,
  type          text not null default 'trip' check (type in ('trip','period')),
  start_date    date not null,
  end_date      date not null,
  status        text not null default 'active' check (status in ('active','closed')),
  budget        numeric(14,2) not null default 0,
  spent         numeric(14,2) not null default 0,
  created_at    timestamptz not null default now()
);

-- Trip assignments (many-to-many: trips ↔ users)
create table public.trip_assignments (
  trip_id       text not null references public.trips(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  primary key (trip_id, user_id)
);

-- ─── CLAIMS ───────────────────────────────────────────────────────────────────
create table public.claims (
  id              text primary key,                      -- e.g. "EXP-001"
  company_id      text not null references public.companies(id) on delete cascade,
  trip_id         text references public.trips(id) on delete set null,
  emp_id          uuid not null references public.users(id) on delete cascade,
  date            date not null,
  category        text not null,
  description     text not null,
  vendor          text not null default '',
  amount          numeric(12,2) not null,
  orig_amount     numeric(12,2) not null,
  orig_currency   text not null default 'INR',
  status          text not null default 'Pending' check (status in ('Pending','Approved','Rejected','Auto-Approved')),
  auto_approved   boolean not null default false,
  remarks         text not null default '',
  flagged         boolean not null default false,        -- category % exceeded
  anomaly         boolean not null default false,        -- AI flagged
  anomaly_reasons text[] not null default '{}',
  weekend_flag    boolean not null default false,
  notes           text not null default '',              -- invoice #, GSTIN etc.
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── RECEIPTS ─────────────────────────────────────────────────────────────────
-- Receipt files stored in Supabase Storage bucket "receipts".
-- This table stores metadata; actual file at storage_path.
create table public.receipts (
  id            uuid primary key default uuid_generate_v4(),
  claim_id      text not null references public.claims(id) on delete cascade,
  company_id    text not null references public.companies(id) on delete cascade,
  file_name     text not null,
  storage_path  text not null,                           -- e.g. "rbshah/EXP-001/receipt_1.jpg"
  mime_type     text not null default 'image/jpeg',
  created_at    timestamptz not null default now()
);

-- ─── CLAIM COMMENTS ───────────────────────────────────────────────────────────
create table public.claim_comments (
  id            uuid primary key default uuid_generate_v4(),
  claim_id      text not null references public.claims(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  user_name     text not null,                           -- denormalised for speed
  text          text not null,
  created_at    timestamptz not null default now()
);

-- ─── TOP-UPS ──────────────────────────────────────────────────────────────────
create table public.topups (
  id            text primary key,                        -- e.g. "TUP-001"
  company_id    text not null references public.companies(id) on delete cascade,
  emp_id        uuid not null references public.users(id) on delete cascade,
  amount        numeric(12,2) not null,
  reason        text not null default '',
  status        text not null default 'Pending' check (status in ('Pending','Approved','Rejected')),
  date          date not null default current_date,
  created_at    timestamptz not null default now()
);

-- ─── AUDIT LOG ────────────────────────────────────────────────────────────────
create table public.audit_log (
  id            uuid primary key default uuid_generate_v4(),
  company_id    text not null references public.companies(id) on delete cascade,
  action        text not null,                           -- 'Approved','Rejected','Auto-Approved'
  claim_id      text references public.claims(id) on delete set null,
  by_user_id    uuid references public.users(id) on delete set null,
  by_name       text not null,
  remarks       text not null default '',
  created_at    timestamptz not null default now()
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
create table public.notifications (
  id            uuid primary key default uuid_generate_v4(),
  company_id    text not null references public.companies(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  text          text not null,
  type          text not null default 'info' check (type in ('info','success','error','warn')),
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ─── POLICY ───────────────────────────────────────────────────────────────────
-- One row per company. JSONB for flexible nested structures (approval levels etc.)
create table public.policy (
  company_id              text primary key references public.companies(id) on delete cascade,
  auto_approve_limit      numeric(12,2) not null default 5000,
  reimbursement_mode      boolean not null default false,
  receipt_mandatory_above numeric(12,2) not null default 1000,
  weekend_requires_approval boolean not null default true,
  multi_level_approval    boolean not null default false,
  approval_levels         jsonb not null default '[{"upTo":10000,"role":"manager"},{"upTo":50000,"role":"manager"},{"upTo":999999,"role":"manager"}]',
  vendor_whitelist        text[] not null default '{}',
  vendor_blacklist        text[] not null default '{}',
  department_budgets      jsonb not null default '{}',
  category_pct            jsonb not null default '{}',
  scheduled_reports       jsonb not null default '{"enabled":false,"frequency":"weekly","email":""}',
  updated_at              timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
--  INDEXES — for common query patterns
-- ═══════════════════════════════════════════════════════════════════════════
create index idx_claims_company      on public.claims(company_id);
create index idx_claims_emp          on public.claims(emp_id);
create index idx_claims_trip         on public.claims(trip_id);
create index idx_claims_status       on public.claims(status);
create index idx_claims_date         on public.claims(date);
create index idx_users_company       on public.users(company_id);
create index idx_users_email         on public.users(email);
create index idx_trips_company       on public.trips(company_id);
create index idx_receipts_claim      on public.receipts(claim_id);
create index idx_audit_company       on public.audit_log(company_id);
create index idx_notifs_user         on public.notifications(user_id, read);
create index idx_topups_company      on public.topups(company_id);
create index idx_comments_claim      on public.claim_comments(claim_id);

-- ═══════════════════════════════════════════════════════════════════════════
--  UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_claims_updated_at
  before update on public.claims
  for each row execute function public.set_updated_at();

create trigger trg_policy_updated_at
  before update on public.policy
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS) — Multi-tenant isolation
--  Every user can only see/touch data belonging to their company.
-- ═══════════════════════════════════════════════════════════════════════════

-- Helper function: get current user's company_id
create or replace function public.my_company_id()
returns text language sql stable security definer as $$
  select company_id::text from public.users where id = auth.uid();
$$;

-- Helper function: get current user's role
create or replace function public.my_role()
returns text language sql stable security definer as $$
  select role from public.users where id = auth.uid();
$$;

-- Helper function: is current user a super admin?
create or replace function public.is_super_admin()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.super_admins where id = auth.uid());
$$;

-- Enable RLS on all tables
alter table public.companies         enable row level security;
alter table public.users             enable row level security;
alter table public.super_admins      enable row level security;
alter table public.trips             enable row level security;
alter table public.trip_assignments  enable row level security;
alter table public.claims            enable row level security;
alter table public.receipts          enable row level security;
alter table public.claim_comments    enable row level security;
alter table public.topups            enable row level security;
alter table public.audit_log         enable row level security;
alter table public.notifications     enable row level security;
alter table public.policy            enable row level security;

-- ─── COMPANIES policies ───────────────────────────────────────────────────────
create policy "Super admin sees all companies"
  on public.companies for select using (public.is_super_admin());

create policy "Super admin manages companies"
  on public.companies for all using (public.is_super_admin());

create policy "Users see own company"
  on public.companies for select
  using (id = public.my_company_id());

-- ─── USERS policies ───────────────────────────────────────────────────────────
create policy "Super admin sees all users"
  on public.users for all using (public.is_super_admin());

create policy "Users in same company can see each other"
  on public.users for select
  using (company_id = public.my_company_id());

create policy "Users can update their own profile"
  on public.users for update
  using (id = auth.uid());

create policy "Manager can insert/update users in company"
  on public.users for insert
  with check (company_id = public.my_company_id()
    and public.my_role() in ('manager'));

create policy "Manager can update users in company"
  on public.users for update
  using (company_id = public.my_company_id()
    and public.my_role() in ('manager'));

create policy "Manager can delete users in company"
  on public.users for delete
  using (company_id = public.my_company_id()
    and public.my_role() in ('manager'));

-- ─── TRIPS policies ───────────────────────────────────────────────────────────
create policy "Company members see company trips"
  on public.trips for select using (company_id = public.my_company_id());

create policy "Manager/finance can manage trips"
  on public.trips for all
  using (company_id = public.my_company_id()
    and public.my_role() in ('manager','finance'));

create policy "Employee can create trip"
  on public.trips for insert
  with check (company_id = public.my_company_id()
    and public.my_role() = 'employee');

-- ─── TRIP ASSIGNMENTS policies ────────────────────────────────────────────────
create policy "Company members see trip assignments"
  on public.trip_assignments for select
  using (exists (
    select 1 from public.trips t
    where t.id = trip_id and t.company_id = public.my_company_id()
  ));

create policy "Manager/finance can manage assignments"
  on public.trip_assignments for all
  using (public.my_role() in ('manager','finance','employee'));

-- ─── CLAIMS policies ─────────────────────────────────────────────────────────
create policy "Super admin sees all claims"
  on public.claims for all using (public.is_super_admin());

create policy "Employee sees own claims"
  on public.claims for select
  using (emp_id = auth.uid());

create policy "Employee can submit claim"
  on public.claims for insert
  with check (company_id = public.my_company_id()
    and emp_id = auth.uid());

create policy "Employee can update own pending claim"
  on public.claims for update
  using (emp_id = auth.uid() and status = 'Pending');

create policy "Manager/approver sees all company claims"
  on public.claims for select
  using (company_id = public.my_company_id()
    and public.my_role() in ('manager','approver','finance','auditor'));

create policy "Manager/approver can update claim status"
  on public.claims for update
  using (company_id = public.my_company_id()
    and public.my_role() in ('manager','approver'));

-- ─── RECEIPTS policies ────────────────────────────────────────────────────────
create policy "Employee sees own receipts"
  on public.receipts for select
  using (exists (
    select 1 from public.claims c where c.id = claim_id and c.emp_id = auth.uid()
  ));

create policy "Employee can upload receipt"
  on public.receipts for insert
  with check (company_id = public.my_company_id());

create policy "Manager/auditor sees company receipts"
  on public.receipts for select
  using (company_id = public.my_company_id()
    and public.my_role() in ('manager','approver','finance','auditor'));

create policy "Employee can delete own receipt on pending claim"
  on public.receipts for delete
  using (company_id = public.my_company_id()
    and exists (select 1 from public.claims c where c.id = claim_id and c.emp_id = auth.uid() and c.status = 'Pending'));

-- ─── CLAIM COMMENTS policies ─────────────────────────────────────────────────
create policy "Company members see claim comments"
  on public.claim_comments for select
  using (exists (
    select 1 from public.claims c where c.id = claim_id and c.company_id = public.my_company_id()
  ));

create policy "Authenticated company member can comment"
  on public.claim_comments for insert
  with check (user_id = auth.uid()
    and exists (
      select 1 from public.claims c where c.id = claim_id and c.company_id = public.my_company_id()
    ));

-- ─── TOPUPS policies ─────────────────────────────────────────────────────────
create policy "Employee sees own topups"
  on public.topups for select using (emp_id = auth.uid());

create policy "Employee can request topup"
  on public.topups for insert
  with check (company_id = public.my_company_id() and emp_id = auth.uid());

create policy "Manager sees all company topups"
  on public.topups for select
  using (company_id = public.my_company_id()
    and public.my_role() in ('manager','approver','finance'));

create policy "Manager can update topup status"
  on public.topups for update
  using (company_id = public.my_company_id()
    and public.my_role() in ('manager','approver'));

-- ─── AUDIT LOG policies ───────────────────────────────────────────────────────
create policy "Super admin sees all audit logs"
  on public.audit_log for all using (public.is_super_admin());

create policy "Manager/auditor sees company audit log"
  on public.audit_log for select
  using (company_id = public.my_company_id()
    and public.my_role() in ('manager','auditor','finance'));

create policy "System can insert audit log"
  on public.audit_log for insert
  with check (company_id = public.my_company_id());

-- ─── NOTIFICATIONS policies ───────────────────────────────────────────────────
create policy "Users see own notifications"
  on public.notifications for select using (user_id = auth.uid());

create policy "System can insert notifications"
  on public.notifications for insert
  with check (company_id = public.my_company_id());

create policy "Users can mark own notifications read"
  on public.notifications for update using (user_id = auth.uid());

-- ─── POLICY table policies ────────────────────────────────────────────────────
create policy "Company members see policy"
  on public.policy for select using (company_id = public.my_company_id());

create policy "Manager can update policy"
  on public.policy for all
  using (company_id = public.my_company_id()
    and public.my_role() in ('manager'));

create policy "Super admin manages all policies"
  on public.policy for all using (public.is_super_admin());

-- ═══════════════════════════════════════════════════════════════════════════
--  STORAGE BUCKET for receipts
--  Run in Supabase Dashboard → Storage → Create Bucket
-- ═══════════════════════════════════════════════════════════════════════════
-- Create a private bucket named "receipts" (public=false)
-- Storage RLS: users can only access files under their company_id prefix
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict do nothing;

create policy "Users can upload to own company folder"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = public.my_company_id()
  );

create policy "Users can read own company receipts"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = public.my_company_id()
  );

create policy "Users can delete own receipts"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = public.my_company_id()
  );

-- ═══════════════════════════════════════════════════════════════════════════
--  SEED: Super Admin user
--  After running this schema, create a Supabase Auth user for super admin:
--  Email: admin@hisaabhub.in / Password: superadmin@123
--  Then run:
--    insert into public.super_admins (id) values ('<auth_user_id>');
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
--  REALTIME — enable for live updates
-- ═══════════════════════════════════════════════════════════════════════════
alter publication supabase_realtime add table public.claims;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.topups;
alter publication supabase_realtime add table public.audit_log;

