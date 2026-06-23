// /api/ocr — Two-stage OCR pipeline
// Stage 1: Google Cloud Vision API — raw text extraction (fast, cheap, handles Hindi/stamps)
// Stage 2: Claude claude-haiku — structure the raw text into JSON fields
// Falls back to Claude-only if no Google Vision key set
//
// COST CONTROL:
// - Only DOCUMENT_TEXT_DETECTION is called (1 feature/image) — logo detection removed,
//   since each additional feature is a SEPARATE billable unit and halves your free quota.
// - Google Vision free tier: first 1,000 units/month per feature, forever (not a trial credit).
// - A monthly usage counter (via Supabase) blocks Vision calls once VISION_MONTHLY_CAP is hit,
//   falling back to Claude-direct automatically — so a runaway loop can never bill you.

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'https://xpensr.in').split(',').map(s => s.trim());
const GOOGLE_VISION_KEY = process.env.GOOGLE_VISION_API_KEY || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY || '';
// Hard safety cap — stay comfortably under the 1,000/month free tier even across multiple
// company workspaces sharing one Google Cloud project. Override via Vercel env if needed.
const VISION_MONTHLY_CAP = parseInt(process.env.VISION_MONTHLY_CAP || '900', 10);

const SUPABASE_URL         = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function setCORS(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-company-id, x-api-key');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Vary', 'Origin');
}

// ── Usage counter (Supabase-backed, falls back to in-memory if not configured) ──────────────
// Table: ocr_usage (month TEXT PRIMARY KEY, vision_calls INT DEFAULT 0)
let memCounter = { month: '', count: 0 };

function currentMonthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function getAndIncrementVisionUsage() {
  const month = currentMonthKey();

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    // No DB configured — use in-memory counter (resets on cold start, less reliable but safe-ish)
    if (memCounter.month !== month) memCounter = { month, count: 0 };
    memCounter.count += 1;
    return memCounter.count;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Atomic-ish increment: read, then upsert. Fine for this volume — not a high-concurrency counter.
    const { data: existing } = await supabase
      .from('ocr_usage').select('vision_calls').eq('month', month).single();

    const newCount = (existing?.vision_calls || 0) + 1;
    await supabase.from('ocr_usage').upsert({ month, vision_calls: newCount });
    return newCount;
  } catch (e) {
    // If the table doesn't exist yet, don't block OCR — just track in memory this session
    if (memCounter.month !== month) memCounter = { month, count: 0 };
    memCounter.count += 1;
    return memCounter.count;
  }
}

// Stage 1: Google Vision — extract raw text from image
// Single feature only (DOCUMENT_TEXT_DETECTION) to preserve the full 1,000/month free quota
async function extractTextGoogleVision(base64Data, mimeType) {
  const isImage = mimeType.startsWith('image/');
  if (!isImage) throw new Error('Vision API (this integration) only supports images, not PDF');

  const requestBody = {
    requests: [{
      image: { content: base64Data },
      features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],  // single feature = single billable unit
      imageContext: { languageHints: ['en', 'hi'] },
    }],
  };

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Google Vision ${res.status}: ${err?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const response = data.responses?.[0];
  if (!response) throw new Error('Empty Vision API response');

  const fullText = response.fullTextAnnotation?.text || response.textAnnotations?.[0]?.description || '';
  return { fullText, confidence: response.fullTextAnnotation ? 'high' : 'medium' };
}

// Stage 2: Claude — structure raw text into expense fields
async function structureWithClaude(rawText, byokKey) {
  const apiKey = byokKey || ANTHROPIC_KEY;
  if (!apiKey) throw new Error('No AI key available for structuring');

  const prompt = `You are an Indian expense invoice parser. Given the raw OCR text below, extract the expense fields.

RAW OCR TEXT:
${rawText}

Return ONLY a single valid JSON object with these exact keys:
- vendor: business name (string)
- date: expense date in YYYY-MM-DD format (string, "" if unclear)
- amount: total amount in detected currency as number
- currency: ISO currency code (usually "INR")
- origAmount: original amount before any conversion (same as amount if INR)
- description: 5-8 word expense description (string)
- category: exactly one of: Travel|Meals|Accommodation|Local Conveyance|Office Supplies|Client Entertainment|Software|Training|Miscellaneous
- invoice_number: invoice/bill number (string, "" if absent)
- gst_number: GSTIN of vendor if present (string, "" if absent)
- hsn_code: HSN/SAC code if visible (string, "" if absent)
- place_of_supply: state/city of supply if mentioned (string, "" if absent)
- gst_amount: GST amount if separately mentioned as number (0 if not)
- line_items: array of max 5 item descriptions (string[])
- confidence: "high" if all key fields extracted, "medium" if some missing, "low" if very unclear

ONLY output valid JSON. No markdown, no explanation.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Claude ${res.status}: ${err?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const raw = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const clean = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
  if (s < 0 || e < 0) throw new Error('No JSON in Claude response');
  return JSON.parse(clean.slice(s, e + 1));
}

// Direct Claude OCR (fallback when no Google Vision key, or PDF, or monthly cap reached)
async function claudeDirectOCR(base64Data, mimeType, byokKey) {
  const apiKey = byokKey || ANTHROPIC_KEY;
  if (!apiKey) throw new Error('No AI key configured. Please add an API key in Policy → AI Settings.');

  const isImg = mimeType.startsWith('image/');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: `You are an invoice OCR assistant for Indian business expenses. Extract data from the receipt/invoice. Return ONLY a single valid JSON object with keys: vendor, date(YYYY-MM-DD), amount(number), currency(ISO), origAmount(number), description(5-8 words), category(Travel|Meals|Accommodation|Local Conveyance|Office Supplies|Client Entertainment|Software|Training|Miscellaneous), invoice_number, gst_number, hsn_code, place_of_supply, gst_amount(number), line_items(string[]), confidence(high|medium|low)`,
      messages: [{
        role: 'user',
        content: isImg
          ? [{ type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } }, { type: 'text', text: 'Extract all expense data. ONLY JSON.' }]
          : [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } }, { type: 'text', text: 'Extract all expense data. ONLY JSON.' }],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Claude ${res.status}: ${err?.error?.message || 'OCR failed'}`);
  }

  const data = await res.json();
  const raw = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const clean = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
  if (s < 0 || e < 0) throw new Error('No JSON in response');
  return JSON.parse(clean.slice(s, e + 1));
}

export const config = { api: { bodyParser: { sizeLimit: '15mb' } } };

export default async function handler(req, res) {
  setCORS(req, res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { dataBase64, mimeType, byokKey } = req.body || {};
  if (!dataBase64 || !mimeType) return res.status(400).json({ error: 'dataBase64 and mimeType required' });

  const stages = [];
  let result = null;

  try {
    // ── Stage 1: Google Vision (if key set, image only, and under monthly cap) ───────────────
    const visionEligible = GOOGLE_VISION_KEY && mimeType.startsWith('image/');

    if (visionEligible) {
      const usageThisMonth = await getAndIncrementVisionUsage();

      if (usageThisMonth > VISION_MONTHLY_CAP) {
        stages.push(`vision_cap_reached:${usageThisMonth}/${VISION_MONTHLY_CAP}`);
        // Hard stop — do NOT call Vision API, fall through to Claude-direct (paid tier never touched)
      } else {
        try {
          stages.push(`google_vision:${usageThisMonth}/${VISION_MONTHLY_CAP}`);
          const { fullText, confidence } = await extractTextGoogleVision(dataBase64, mimeType);
          if (fullText.length > 20) {
            stages.push('claude_structuring');
            result = await structureWithClaude(fullText, byokKey);
            result._pipeline = 'vision+claude';
            result._rawTextLength = fullText.length;
            result._visionUsageThisMonth = usageThisMonth;
          } else {
            stages.push('vision_empty_fallback');
          }
        } catch (visionErr) {
          stages.push(`vision_failed:${visionErr.message.slice(0, 50)}`);
        }
      }
    }

    // ── Fallback: Claude direct OCR (always free of Google cost) ─────────────────────────────
    if (!result) {
      stages.push('claude_direct');
      result = await claudeDirectOCR(dataBase64, mimeType, byokKey);
      result._pipeline = 'claude_direct';
    }

    result._stages = stages;
    return res.status(200).json({ success: true, data: result });

  } catch (err) {
    return res.status(500).json({
      error: err.message,
      stages,
      hint: !GOOGLE_VISION_KEY && !ANTHROPIC_KEY && !byokKey
        ? 'No OCR service configured. Add GOOGLE_VISION_API_KEY or an AI key in Policy settings.'
        : undefined,
    });
  }
}
