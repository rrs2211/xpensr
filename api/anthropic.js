// Vercel Serverless — AI proxy with BYOK (Bring Your Own Key) support
//
// Priority:
//   1. Company has their own API key stored in company_ai_keys → use it (free for XpensR)
//   2. Company has XpensR AI token balance → deduct tokens and use XpensR key
//   3. Neither → 403 with helpful message

import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'https://xpensr.in').split(',').map(s => s.trim());

function setCORS(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, anthropic-version, x-company-id');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Vary', 'Origin');
}

// Rate limit: 60 req/company/minute
const rateMap = new Map();
function checkRate(companyId) {
  const now = Date.now();
  const e = rateMap.get(companyId) || { count: 0, reset: now + 60000 };
  if (now > e.reset) { e.count = 0; e.reset = now + 60000; }
  e.count++; rateMap.set(companyId, e);
  return e.count <= 60;
}

// Provider → API call
async function callProvider(provider, apiKey, model, messages, system, maxTokens) {
  if (provider === 'openai') {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: system
          ? [{ role: 'system', content: system }, ...messages]
          : messages,
        max_tokens: maxTokens || 1000,
      }),
    });
    const data = await r.json();
    // Normalise to Anthropic response shape
    const text = data.choices?.[0]?.message?.content || '';
    return {
      status: r.status,
      data: {
        content: [{ type: 'text', text }],
        usage: {
          input_tokens: data.usage?.prompt_tokens || 0,
          output_tokens: data.usage?.completion_tokens || 0,
        },
      },
    };
  }

  if (provider === 'gemini') {
    const geminiModel = model || 'gemini-1.5-flash';
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
          })),
          ...(system && { systemInstruction: { parts: [{ text: system }] } }),
          generationConfig: { maxOutputTokens: maxTokens || 1000 },
        }),
      }
    );
    const data = await r.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      status: r.status,
      data: {
        content: [{ type: 'text', text }],
        usage: {
          input_tokens: data.usageMetadata?.promptTokenCount || 0,
          output_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        },
      },
    };
  }

  // Default: Anthropic/Claude
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-haiku-4-5-20251001',
      messages,
      system,
      max_tokens: maxTokens || 1000,
    }),
  });
  const data = await r.json();
  return { status: r.status, data };
}

export default async function handler(req, res) {
  setCORS(req, res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const companyId = req.headers['x-company-id'] || '';
  if (!companyId) return res.status(400).json({ error: { message: 'Missing company ID.' } });

  if (!checkRate(companyId)) return res.status(429).json({ error: { message: 'Too many requests. Wait a minute.' } });

  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > 1_000_000) return res.status(413).json({ error: { message: 'Request too large.' } });

  const { model, messages, system, max_tokens, _feature } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0)
    return res.status(400).json({ error: { message: 'Invalid request.' } });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !supabaseService)
    return res.status(500).json({ error: { message: 'Server not configured.' } });

  const db = createClient(supabaseUrl, supabaseService, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // ── Step 1: Check for company's own API key (BYOK) ──────────────────────────
  const { data: byokRow } = await db
    .from('company_ai_keys')
    .select('provider, api_key, model, is_active')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .maybeSingle();

  if (byokRow?.api_key) {
    // Company has their own key — use it directly, no token deduction
    try {
      const { status, data } = await callProvider(
        byokRow.provider || 'claude',
        byokRow.api_key,
        model || byokRow.model,
        messages, system,
        Math.min(max_tokens || 1000, 4000)
      );

      // Log usage for company's own reference (no billing)
      if (status === 200 && data?.usage) {
        const tokensUsed = (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0);
        if (tokensUsed > 0) {
          await db.from('ai_usage_log').insert({
            company_id: companyId,
            tokens_used: tokensUsed,
            input_tokens: data.usage.input_tokens || 0,
            output_tokens: data.usage.output_tokens || 0,
            model: model || byokRow.model || byokRow.provider,
            feature: _feature || 'unknown',
            created_at: new Date().toISOString(),
          });
        }
        data._byok = true;         // tells frontend "company's own key was used"
        data._provider = byokRow.provider;
      }
      return res.status(status).json(data);
    } catch {
      return res.status(500).json({ error: { message: 'AI service temporarily unavailable.' } });
    }
  }

  // ── Step 2: Fall back to XpensR token balance ────────────────────────────────
  if (process.env.VITE_AI_ENABLED !== 'true') {
    return res.status(403).json({
      error: { message: 'AI features not enabled. Add your own API key in Settings → AI Configuration, or contact XpensR support to purchase a token pack.' },
      code: 'NO_AI_ACCESS'
    });
  }

  const xpensrKey = process.env.ANTHROPIC_KEY || '';
  if (!xpensrKey) return res.status(500).json({ error: { message: 'AI service not configured.' } });

  const { data: tokenRow } = await db
    .from('ai_tokens')
    .select('balance, is_active, plan_label')
    .eq('company_id', companyId)
    .single();

  if (!tokenRow || tokenRow.balance <= 0) {
    return res.status(402).json({
      error: { message: 'No AI tokens remaining. Add your own API key in Settings → AI Configuration, or purchase more tokens from your XpensR account manager.' },
      code: 'TOKENS_EXHAUSTED',
      balance: tokenRow?.balance || 0
    });
  }

  try {
    const { status, data } = await callProvider('claude', xpensrKey, model, messages, system, Math.min(max_tokens || 1000, 1500));
    if (status === 200 && data?.usage) {
      const tokensUsed = (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0);
      if (tokensUsed > 0) {
        await db.rpc('deduct_ai_tokens', { p_company_id: companyId, p_tokens: tokensUsed });
        await db.from('ai_usage_log').insert({
          company_id: companyId,
          tokens_used: tokensUsed,
          input_tokens: data.usage.input_tokens || 0,
          output_tokens: data.usage.output_tokens || 0,
          model: model || 'claude-haiku-4-5-20251001',
          feature: _feature || 'unknown',
          created_at: new Date().toISOString(),
        });
        data._tokenBalance = Math.max(0, tokenRow.balance - tokensUsed);
        data._byok = false;
      }
    }
    return res.status(status).json(data);
  } catch {
    return res.status(500).json({ error: { message: 'AI service temporarily unavailable.' } });
  }
}
