// Vercel Serverless Function — WhatsApp via Interakt
// POST /api/whatsapp  { phone, templateName, params }

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'https://xpensr.in').split(',').map(s => s.trim());

function setCORS(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

// Allowlist of valid template names — prevents arbitrary template injection
const VALID_TEMPLATES = [
  'xpensr_claim_approved',
  'xpensr_claim_rejected',
  'xpensr_trip_summary',
  'xpensr_topup_approved',
  'xpensr_topup_rejected',
  'xpensr_budget_alert',
];

export default async function handler(req, res) {
  setCORS(req, res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  // Reject oversized payloads (max 1MB for API calls)
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > 1_000_000) {
    return res.status(413).json({ error: 'Request too large.' });
  }

  const key = process.env.INTERAKT_API_KEY;
  if (!key) { res.status(500).json({ error: 'WhatsApp service not configured.' }); return; }

  const { phone, templateName, params = [], countryCode = '91' } = req.body || {};
  if (!phone || !templateName) { res.status(400).json({ error: 'Missing phone or templateName.' }); return; }

  // Validate template name against allowlist
  if (!VALID_TEMPLATES.includes(templateName)) {
    res.status(400).json({ error: 'Unknown template.' });
    return;
  }

  // Sanitize phone — digits only, strip country code prefix if present
  const cleanPhone = phone.replace(/\D/g, '').replace(/^0+/, '').replace(/^91/, '');
  if (cleanPhone.length < 10) { res.status(400).json({ error: 'Invalid phone number.' }); return; }

  // Sanitize params — strings only, max 200 chars each, max 10 params
  const safeParams = (Array.isArray(params) ? params : []).slice(0, 10).map(p => String(p).slice(0, 200));

  try {
    const r = await fetch('https://api.interakt.ai/v1/public/message/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(key).toString('base64')}`,
      },
      body: JSON.stringify({
        countryCode,
        phoneNumber: cleanPhone,
        callbackData: 'xpensr_notification',
        type: 'Template',
        template: {
          name: templateName,
          languageCode: 'en',
          bodyValues: safeParams,
        },
      }),
    });
    const data = await r.json();
    res.status(r.status).json({ ok: r.ok });
  } catch (e) {
    res.status(500).json({ error: 'WhatsApp delivery failed.' });
  }
}
