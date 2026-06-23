-- ════════════════════════════════════════════════════════════════════════
-- LANDING PAGE CONTENT TABLE
-- Stores all editable landing page sections as JSON.
-- One row per "slot" (hero, announcement, features, stats, pricing, footer_note).
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.landing_content (
  slot        TEXT PRIMARY KEY,   -- e.g. 'hero', 'announcement', 'features', 'stats', 'pricing_note', 'footer_note'
  content     JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active   BOOLEAN DEFAULT true,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  updated_by  TEXT DEFAULT 'admin'
);

-- RLS: allow public read (landing page is public), only service role can write
ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read" ON public.landing_content;
CREATE POLICY "public_read" ON public.landing_content
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "service_write" ON public.landing_content;
CREATE POLICY "service_write" ON public.landing_content
  FOR ALL USING (true) WITH CHECK (true);

-- Grant read to anon and authenticated
GRANT SELECT ON public.landing_content TO anon;
GRANT SELECT ON public.landing_content TO authenticated;
GRANT ALL ON public.landing_content TO service_role;

-- Seed default content (mirrors what's hardcoded in the app today)
INSERT INTO public.landing_content (slot, content) VALUES

('hero', '{
  "badge": "🚀 Now in Beta — Limited Access",
  "headline1": "Expense Management",
  "headline2": "Built for Growing Teams",
  "tagline": "Scan. Send. Settled.",
  "subtext": "AI-powered claim submission, smart approval workflows, real-time balances and settlement tracking — all in one beautifully simple app.",
  "cta_primary": "Get Started Free →",
  "cta_secondary": "Request Demo"
}'::jsonb),

('announcement', '{
  "enabled": false,
  "type": "promo",
  "text": "",
  "badge": "",
  "bg": "#fef9c3",
  "color": "#854d0e"
}'::jsonb),

('stats', '[
  {"stat": "AI OCR", "desc": "Invoice scanning"},
  {"stat": "24hr", "desc": "Edit windows"},
  {"stat": "4 Roles", "desc": "Admin, Manager, Finance, Employee"},
  {"stat": "Real-time", "desc": "Balances & settlements"}
]'::jsonb),

('features', '[
  {"icon": "📤", "title": "Smart Submission", "desc": "AI-powered OCR, camera scan, multi-invoice, auto-draft save"},
  {"icon": "✓", "title": "Approval Workflows", "desc": "Multi-level, dual approval, admin override, delegation"},
  {"icon": "📒", "title": "Trip Ledger", "desc": "Employee-wise fund flow, balances, and settlement tracking"},
  {"icon": "📊", "title": "Analytics & Reports", "desc": "CSV, Tally, GSTR, Zoho exports, settlement PDFs"},
  {"icon": "⚖️", "title": "Balance Management", "desc": "Wallet top-ups, recovery tracking, net positions"},
  {"icon": "🔒", "title": "Secure & Compliant", "desc": "Role-based access, anomaly detection, full audit log"}
]'::jsonb),

('pricing_note', '{
  "enabled": false,
  "text": "",
  "discount_badge": "",
  "valid_till": "",
  "highlight_color": "#7ED957"
}'::jsonb),

('footer_note', '{
  "text": "© 2026 RB Finsol Private Limited. Built with ♥ in Rajkot.",
  "sub": "XpensR is a product of RB Finsol Private Limited. All rights reserved."
}'::jsonb)

ON CONFLICT (slot) DO NOTHING;

-- Verify
SELECT slot, is_active, updated_at FROM public.landing_content ORDER BY slot;
