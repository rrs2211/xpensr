// /api/aikey — Secure company API key management
// The browser NEVER receives the actual key — only masked confirmation.
// All key reads/writes go through this serverless function using service role.

import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'https://xpensr.in').split(',').map(s => s.trim());

function setCORS(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-company-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Vary', 'Origin');
}

function getDb() {
  return createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Mask API key — show only first 6 and last 4 chars
function maskKey(key) {
  if (!key || key.length < 12) return '••••••••••••';
  return key.slice(0, 6) + '••••••••••••' + key.slice(-4);
}

// Validate that a key works by making a minimal test call
async function validateKey(provider, apiKey) {
  try {
    if (provider === 'openai') {
      const r = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return r.status === 200;
    }
    if (provider === 'gemini') {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      return r.status === 200;
    }
    // Claude — minimal message call
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    // 200 = valid, 401 = bad key, 400 = key ok but bad request params (still valid key)
    return r.status === 200 || r.status === 400;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  setCORS(req, res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const companyId = req.headers['x-company-id'] || '';
  if (!companyId) return res.status(400).json({ error: 'Missing company ID.' });

  const db = getDb();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return res.status(500).json({ error: 'Server not configured.' });

  // ── GET: return key STATUS only (never the actual key) ────────────────────
  if (req.method === 'GET') {
    const { data } = await db
      .from('company_ai_keys')
      .select('provider, model, is_active, created_at, ai_enabled')
      // Intentionally NOT selecting api_key
      .eq('company_id', companyId)
      .maybeSingle();

    if (!data) return res.status(200).json({ hasKey: false });

    return res.status(200).json({
      hasKey: true,
      provider: data.provider,
      model: data.model,
      isActive: data.is_active,
      aiEnabled: data.ai_enabled || false,
      addedOn: data.created_at,
      maskedKey: '••••••' + '••••••••••••' + '••••', // never reveal real key
    });
  }

  // ── POST: save a new key (validate first, then store) ─────────────────────
  if (req.method === 'POST') {
    const { provider, apiKey, model, aiEnabled, _toggleOnly } = req.body || {};

    // Toggle-only: just update aiEnabled flag without re-entering the key
    if (_toggleOnly) {
      await db.from('company_ai_keys')
        .update({ ai_enabled: aiEnabled, updated_at: new Date().toISOString() })
        .eq('company_id', companyId);
      return res.status(200).json({ success: true, aiEnabled });
    }

    if (!provider || !apiKey)
      return res.status(400).json({ error: 'provider and apiKey are required.' });
    if (!['claude', 'openai', 'gemini'].includes(provider))
      return res.status(400).json({ error: 'Invalid provider.' });
    if (apiKey.length < 10 || apiKey.length > 500)
      return res.status(400).json({ error: 'API key length invalid.' });

    // Validate the key actually works before saving
    const isValid = await validateKey(provider, apiKey);
    if (!isValid) {
      return res.status(422).json({
        error: `API key validation failed. Please check the key is correct and has API access enabled on the ${provider} dashboard.`
      });
    }

    const defaultModels = {
      claude: 'claude-haiku-4-5-20251001',
      openai: 'gpt-4o-mini',
      gemini: 'gemini-1.5-flash',
    };

    const { error } = await db.from('company_ai_keys').upsert({
      company_id: companyId,
      provider,
      api_key: apiKey,       // stored server-side only, never returned
      model: model || defaultModels[provider],
      is_active: true,
      ai_enabled: aiEnabled !== false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' });

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      success: true,
      maskedKey: maskKey(apiKey),
      provider,
      model: model || defaultModels[provider],
      aiEnabled: aiEnabled !== false,
      message: `✓ ${provider} API key validated and saved. AI features are now active.`
    });
  }

  // ── DELETE: remove the key ─────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    await db.from('company_ai_keys').delete().eq('company_id', companyId);
    return res.status(200).json({ success: true, message: 'API key removed.' });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
