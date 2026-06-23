// /api/auth — XpensR Auth Bridge
// Validates custom credentials against Supabase, issues a JWT session

import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'https://xpensr.in').split(',').map(s => s.trim());

function setCORS(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

const SUPA_URL     = process.env.VITE_SUPABASE_URL;
const SUPA_ANON    = process.env.VITE_SUPABASE_ANON_KEY;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY; // server-side ONLY — never in browser

// Simple in-memory rate limiter: max 10 attempts per IP per 60s
const attempts = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const key = ip || 'unknown';
  const entry = attempts.get(key) || { count: 0, resetAt: now + 60000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60000; }
  entry.count++;
  attempts.set(key, entry);
  return entry.count <= 10;
}

export default async function handler(req, res) {
  setCORS(req, res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  // Rate limiting
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress;
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many login attempts. Try again in a minute.' });
  }

  const { login, password } = req.body || {};

  // Validate input lengths — prevent oversized payloads
  if (!login || !password || String(login).length > 200 || String(password).length > 200) {
    return res.status(400).json({ error: 'Invalid credentials.' });
  }

  if (!SUPA_URL || !SUPA_ANON || !SUPA_SERVICE) {
    return res.status(500).json({ error: 'Server not configured.' });
  }

  // Validate credentials via RPC (uses anon key — safe)
  const anonClient = createClient(SUPA_URL, SUPA_ANON);
  const { data: userData, error: rpcErr } = await anonClient.rpc('authenticate_user', {
    p_login: String(login).trim(),
    p_password: String(password),
  });

  if (rpcErr || !userData || userData.error) {
    // Generic error — don't reveal whether user exists
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Create Supabase Auth session for this user (service role — server-side only)
  const serviceClient = createClient(SUPA_URL, SUPA_SERVICE, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    const syntheticEmail = `xpensr_${userData.id}@xpensr.internal`;
    const syntheticPassword = `xpensr_${userData.id}_${SUPA_SERVICE.slice(-8)}`;

    let { data: signInData, error: signInErr } = await serviceClient.auth.signInWithPassword({
      email: syntheticEmail,
      password: syntheticPassword,
    });

    if (signInErr || !signInData?.session) {
      // Create auth user if not exists
      const { data: newUser, error: createErr } = await serviceClient.auth.admin.createUser({
        email: syntheticEmail,
        password: syntheticPassword,
        email_confirm: true,
        user_metadata: { xpensr_user_id: userData.id, company_id: userData.company_id },
      });

      if (createErr) {
        // Fallback: return user data without JWT
        return res.status(200).json({ ...userData, jwt_mode: false });
      }

      const { data: retryData } = await serviceClient.auth.signInWithPassword({
        email: syntheticEmail,
        password: syntheticPassword,
      });
      signInData = retryData;
    }

    const supabaseSession = signInData?.session;

    if (supabaseSession?.user?.id && supabaseSession.user.id !== userData.id) {
      await serviceClient.from('users')
        .update({ auth_user_id: supabaseSession.user.id })
        .eq('id', userData.id);
    }

    return res.status(200).json({
      ...userData,
      jwt_mode: true,
      access_token: supabaseSession?.access_token,
      refresh_token: supabaseSession?.refresh_token,
      expires_at: supabaseSession?.expires_at,
    });
  } catch (e) {
    return res.status(200).json({ ...userData, jwt_mode: false });
  }
}
