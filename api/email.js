// Vercel Serverless Function — Email via Resend
// POST /api/email  { to, subject, html }

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'https://xpensr.in').split(',').map(s => s.trim());

function setCORS(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

export default async function handler(req, res) {
  setCORS(req, res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  // Reject oversized payloads (max 1MB for API calls)
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > 1_000_000) {
    return res.status(413).json({ error: 'Request too large.' });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) { res.status(500).json({ error: 'Email service not configured.' }); return; }

  const { to, subject, html, from } = req.body || {};
  if (!to || !subject || !html) { res.status(400).json({ error: 'Missing required fields.' }); return; }

  // Validate recipient — must be a real email, not internal synthetic addresses
  const toAddr = Array.isArray(to) ? to[0] : to;
  if (!toAddr || toAddr.includes('@claimx.internal') || toAddr.includes('@demo.local')) {
    res.status(400).json({ error: 'Invalid recipient.' });
    return;
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        from: from || 'XpensR by RB <noreply@xpensr.in>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });
    const data = await r.json();
    res.status(r.status).json({ ok: r.ok });
  } catch (e) {
    res.status(500).json({ error: 'Email delivery failed.' });
  }
}
