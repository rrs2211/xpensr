-- ═══════════════════════════════════════════════════════════════════════════════
-- XpensR AI Token System — Supabase SQL Migration
-- Run in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. ai_tokens: one row per company ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_tokens (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  balance       INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  used_total    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  plan_label    TEXT DEFAULT 'Pay-as-you-go',
  last_topup_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);

-- ── 2. ai_token_packs: purchase history ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_token_packs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pack_name    TEXT NOT NULL,          -- e.g. "Starter Pack 50K", "Growth Pack 200K"
  tokens_added INTEGER NOT NULL,
  amount_inr   INTEGER NOT NULL,       -- price paid in INR (paise → rupees on display)
  added_by     TEXT,                   -- super admin user id
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. ai_usage_log: per-call audit trail ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tokens_used    INTEGER NOT NULL,
  input_tokens   INTEGER NOT NULL DEFAULT 0,
  output_tokens  INTEGER NOT NULL DEFAULT 0,
  model          TEXT NOT NULL,
  feature        TEXT NOT NULL DEFAULT 'unknown',  -- 'ocr' | 'chat'
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast per-company queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_company ON public.ai_usage_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_token_packs_company ON public.ai_token_packs(company_id, created_at DESC);

-- ── 4. Atomic deduct function — prevents race conditions ──────────────────────
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

-- ── 5. Add tokens function (called by super admin when selling a pack) ─────────
CREATE OR REPLACE FUNCTION public.add_ai_tokens(
  p_company_id  TEXT,
  p_tokens      INTEGER,
  p_pack_name   TEXT DEFAULT 'Manual Topup',
  p_amount_inr  INTEGER DEFAULT 0,
  p_added_by    TEXT DEFAULT NULL,
  p_note        TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  -- Upsert ai_tokens row
  INSERT INTO public.ai_tokens (company_id, balance, used_total, is_active, plan_label, last_topup_at)
  VALUES (p_company_id, p_tokens, 0, true, p_pack_name, NOW())
  ON CONFLICT (company_id) DO UPDATE SET
    balance       = ai_tokens.balance + p_tokens,
    is_active     = true,
    plan_label    = p_pack_name,
    last_topup_at = NOW(),
    updated_at    = NOW()
  RETURNING balance INTO new_balance;

  -- Log the purchase
  INSERT INTO public.ai_token_packs (company_id, pack_name, tokens_added, amount_inr, added_by, note)
  VALUES (p_company_id, p_pack_name, p_tokens, p_amount_inr, p_added_by, p_note);

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 6. RLS policies ────────────────────────────────────────────────────────────
-- ai_tokens: service role only (reads happen server-side via SUPABASE_SERVICE_ROLE_KEY)
ALTER TABLE public.ai_tokens     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_token_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log  ENABLE ROW LEVEL SECURITY;

-- No direct client access — all reads/writes go through serverless functions with service role
-- The only exception: company admin can read their own ai_tokens row (for balance display)
CREATE POLICY "Company can read own ai_tokens"
  ON public.ai_tokens FOR SELECT
  USING (true);  -- frontend filters by company_id; full RLS requires JWT company claim

-- ═══════════════════════════════════════════════════════════════════════════════
-- PACK PRICING REFERENCE (for super admin)
-- ─────────────────────────────────────────────────────────────────────────────
-- Pack Name             Tokens    Price (₹)   Cost per 1K tokens
-- Starter Pack          50,000    ₹199        ₹3.98 / 1K
-- Growth Pack           200,000   ₹599        ₹3.00 / 1K
-- Pro Pack              500,000   ₹1,199      ₹2.40 / 1K
-- Enterprise Pack     2,000,000   ₹3,999      ₹2.00 / 1K
-- Custom (negotiated)   any       any         negotiated
--
-- Your cost (Anthropic Claude Haiku):
--   Input:  $0.80 / 1M tokens ≈ ₹0.067 / 1K tokens
--   Output: $4.00 / 1M tokens ≈ ₹0.33 / 1K tokens
--   Blended ~₹0.20 / 1K tokens (assuming 70/30 input/output split)
--
-- Gross margin: ~85-95% (₹2-4 per 1K tokens billed vs ₹0.20 cost)
-- ═══════════════════════════════════════════════════════════════════════════════
