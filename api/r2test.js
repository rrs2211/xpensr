// /api/r2test — Full diagnostic for R2 upload chain
// Open xpensr.in/api/r2test in browser to see exactly what's failing

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const log = [];
  const ok  = (msg, data={}) => log.push({ status:'✅', msg, ...data });
  const fail = (msg, data={}) => log.push({ status:'❌', msg, ...data });
  const warn = (msg, data={}) => log.push({ status:'⚠️', msg, ...data });

  // ── 1. Check env vars ──────────────────────────────────────────────────────
  const accountId = process.env.R2_ACCOUNT_ID        || '';
  const accessKey = process.env.R2_ACCESS_KEY_ID     || '';
  const secretKey = process.env.R2_SECRET_ACCESS_KEY || '';
  const bucket    = process.env.R2_BUCKET_NAME       || '';
  const pubUrl    = process.env.VITE_R2_PUBLIC_URL   || '';

  if (accountId) ok('R2_ACCOUNT_ID set', { value: accountId.slice(0,8)+'...' });
  else fail('R2_ACCOUNT_ID missing from Vercel env vars');

  if (accessKey) ok('R2_ACCESS_KEY_ID set', { value: accessKey.slice(0,6)+'...' });
  else fail('R2_ACCESS_KEY_ID missing');

  if (secretKey) ok('R2_SECRET_ACCESS_KEY set', { value: '(hidden)' });
  else fail('R2_SECRET_ACCESS_KEY missing');

  if (bucket) ok('R2_BUCKET_NAME set', { value: bucket });
  else fail('R2_BUCKET_NAME missing');

  if (pubUrl) ok('VITE_R2_PUBLIC_URL set', { value: pubUrl });
  else warn('VITE_R2_PUBLIC_URL not set — receipts will not display (required for viewing)');

  if (!accountId || !accessKey || !secretKey || !bucket) {
    return res.status(200).json({ log, summary: 'STOP: Fix missing env vars first, then redeploy.' });
  }

  // ── 2. Generate presigned PUT URL ──────────────────────────────────────────
  let putUrl = null;
  const testKey = `_test/${Date.now()}.txt`;
  try {
    const host       = `${accountId}.r2.cloudflarestorage.com`;
    const objectPath = `/${bucket}/${testKey}`;
    const region     = 'auto';
    const service    = 's3';
    const now        = new Date();
    const dateStr    = now.toISOString().slice(0,10).replace(/-/g,'');
    const dtStr      = now.toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
    const credScope  = `${dateStr}/${region}/${service}/aws4_request`;
    const credential = `${accessKey}/${credScope}`;

    const qp = new URLSearchParams([
      ['X-Amz-Algorithm','AWS4-HMAC-SHA256'],
      ['X-Amz-Credential', credential],
      ['X-Amz-Date', dtStr],
      ['X-Amz-Expires','3600'],
      ['X-Amz-SignedHeaders','host'],
    ]);

    const enc = new TextEncoder();
    const sign = async (k,m) => {
      const ck = await crypto.subtle.importKey('raw',k,{name:'HMAC',hash:'SHA-256'},false,['sign']);
      return new Uint8Array(await crypto.subtle.sign('HMAC',ck,enc.encode(m)));
    };
    const hex = b => Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('');
    const sha = async s => hex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))));

    const canonical = [
      'PUT', objectPath, qp.toString(),
      `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD',
    ].join('\n');

    const sts = ['AWS4-HMAC-SHA256', dtStr, credScope, await sha(canonical)].join('\n');

    const kDate = await sign(enc.encode(`AWS4${secretKey}`), dateStr);
    const kReg  = await sign(kDate, region);
    const kSvc  = await sign(kReg, service);
    const kSign = await sign(kSvc, 'aws4_request');
    const signature = hex(await sign(kSign, sts));

    putUrl = `https://${host}${objectPath}?${qp}&X-Amz-Signature=${signature}`;
    ok('Presigned PUT URL generated', { url: putUrl.slice(0,80)+'...' });
  } catch(e) {
    fail('Failed to generate presigned URL', { error: e.message });
    return res.status(200).json({ log, summary: 'Signature generation failed. Check credentials.' });
  }

  // ── 3. Actually PUT a tiny test file to R2 ─────────────────────────────────
  try {
    const testBody = `XpensR R2 test at ${new Date().toISOString()}`;
    const putResp = await fetch(putUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: testBody,
    });

    if (putResp.ok) {
      ok(`Test file uploaded to R2 successfully`, {
        key: testKey,
        status: putResp.status,
        bucket,
      });
    } else {
      const body = await putResp.text().catch(() => '(no body)');
      fail(`R2 PUT rejected`, {
        httpStatus: putResp.status,
        statusText: putResp.statusText,
        r2Response: body.slice(0, 500),
        diagnosis: putResp.status === 403
          ? 'ACCESS DENIED — API token does not have write permission on this bucket, or credentials are wrong'
          : putResp.status === 400
          ? 'BAD REQUEST — bucket name or account ID is wrong'
          : putResp.status === 404
          ? 'NOT FOUND — bucket does not exist or wrong account ID'
          : 'Check R2 response body above'
      });
    }
  } catch(e) {
    fail('Network error reaching R2', {
      error: e.message,
      diagnosis: 'Vercel cannot reach Cloudflare R2 — check if R2 endpoint is correct'
    });
  }

  // ── 4. Summary ─────────────────────────────────────────────────────────────
  const failures = log.filter(l => l.status === '❌');
  const summary = failures.length === 0
    ? '✅ R2 is fully working from server side. If browser uploads still fail, CORS is not set on the bucket.'
    : `❌ ${failures.length} issue(s) found — see details above.`;

  return res.status(200).json({ log, summary,
    nextStep: failures.length === 0
      ? 'Set CORS on bucket: Cloudflare → R2 → rajooengineers → Settings → CORS Policy'
      : 'Fix the ❌ items above first'
  });
}
