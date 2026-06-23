// /api/r2upload — Server-side upload to Cloudflare R2
// Browser sends base64 file to Vercel → Vercel uploads to R2
// No CORS issues since Vercel→R2 is server-to-server

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'https://xpensr.in').split(',').map(s => s.trim());

function setCORS(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-company-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Vary', 'Origin');
}

function cfg() {
  return {
    accountId : process.env.R2_ACCOUNT_ID        || '',
    accessKey : process.env.R2_ACCESS_KEY_ID     || '',
    secretKey : process.env.R2_SECRET_ACCESS_KEY || '',
    bucket    : process.env.R2_BUCKET_NAME       || '',
    pubUrl    : process.env.VITE_R2_PUBLIC_URL   || '',
  };
}

async function uploadToR2(key, mimeType, bodyBytes) {
  const { accountId, accessKey, secretKey, bucket } = cfg();

  const host       = `${accountId}.r2.cloudflarestorage.com`;
  const objectPath = `/${bucket}/${key}`;
  const region     = 'auto';
  const service    = 's3';

  const now     = new Date();
  const dateStr = now.toISOString().slice(0,10).replace(/-/g,'');
  const dtStr   = now.toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
  const credScope  = `${dateStr}/${region}/${service}/aws4_request`;

  const enc  = new TextEncoder();
  const sign = async (k,m) => {
    const ck = await crypto.subtle.importKey('raw',k,{name:'HMAC',hash:'SHA-256'},false,['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC',ck,enc.encode(m)));
  };
  const hex  = b => Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('');
  const sha  = async s => hex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))));
  const shaB = async b => hex(new Uint8Array(await crypto.subtle.digest('SHA-256',b)));

  // For actual upload we sign with the real content hash
  const contentHash = await shaB(bodyBytes);

  const headers = {
    'Content-Type'        : mimeType,
    'Content-Length'      : String(bodyBytes.length),
    'Host'                : host,
    'X-Amz-Content-Sha256': contentHash,
    'X-Amz-Date'          : dtStr,
  };

  const signedHeaderNames = ['content-length','content-type','host','x-amz-content-sha256','x-amz-date'];
  const canonicalHeaders  = signedHeaderNames.map(h => `${h}:${headers[Object.keys(headers).find(k=>k.toLowerCase()===h)]}\n`).join('');
  const signedHeadersStr  = signedHeaderNames.join(';');

  const canonical = [
    'PUT',
    objectPath,
    '',   // no query string for direct upload
    canonicalHeaders,
    signedHeadersStr,
    contentHash,
  ].join('\n');

  const stringToSign = ['AWS4-HMAC-SHA256', dtStr, credScope, await sha(canonical)].join('\n');

  const kDate = await sign(enc.encode(`AWS4${secretKey}`), dateStr);
  const kReg  = await sign(kDate, region);
  const kSvc  = await sign(kReg, service);
  const kSign = await sign(kSvc, 'aws4_request');
  const signature = hex(await sign(kSign, stringToSign));

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;

  const resp = await fetch(`https://${host}${objectPath}`, {
    method: 'PUT',
    headers: {
      'Content-Type'        : mimeType,
      'Content-Length'      : String(bodyBytes.length),
      'Host'                : host,
      'X-Amz-Content-Sha256': contentHash,
      'X-Amz-Date'          : dtStr,
      'Authorization'       : authHeader,
    },
    body: bodyBytes,
    duplex: 'half',
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => `status ${resp.status}`);
    const code = txt.match(/<Code>(.*?)<\/Code>/)?.[1];
    const msg  = txt.match(/<Message>(.*?)<\/Message>/)?.[1];
    const detail = code ? `${code}${msg?': '+msg:''}` : txt.slice(0,300);
    throw new Error(`R2 ${resp.status} — ${detail}`);
  }

  return true;
}

export const config = { api: { bodyParser: { sizeLimit: '15mb' } } };

export default async function handler(req, res) {
  setCORS(req, res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // GET: diagnostic
  if (req.method === 'GET') {
    const { action, key } = req.query || {};

    // Signed GET URL for viewing
    if (action === 'view' && key) {
      const { accountId, accessKey, secretKey, bucket, pubUrl } = cfg();
      // If public URL is set, just return that directly
      if (pubUrl) {
        return res.status(200).json({ viewUrl: `${pubUrl.replace(/\/$/,'')}/${decodeURIComponent(key)}` });
      }
      // Otherwise generate presigned GET
      try {
        const host       = `${accountId}.r2.cloudflarestorage.com`;
        const objectPath = `/${bucket}/${decodeURIComponent(key)}`;
        const region='auto', service='s3';
        const now=new Date();
        const dateStr=now.toISOString().slice(0,10).replace(/-/g,'');
        const dtStr=now.toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
        const credScope=`${dateStr}/${region}/${service}/aws4_request`;
        const credential=`${accessKey}/${credScope}`;
        const qp=new URLSearchParams([['X-Amz-Algorithm','AWS4-HMAC-SHA256'],['X-Amz-Credential',credential],['X-Amz-Date',dtStr],['X-Amz-Expires','3600'],['X-Amz-SignedHeaders','host']]);
        const enc=new TextEncoder();
        const sign=async(k,m)=>{const ck=await crypto.subtle.importKey('raw',k,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',ck,enc.encode(m)));};
        const hex=b=>Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('');
        const sha=async s=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))));
        const canonical=['GET',objectPath,qp.toString(),`host:${host}\n`,'host','UNSIGNED-PAYLOAD'].join('\n');
        const sts=['AWS4-HMAC-SHA256',dtStr,credScope,await sha(canonical)].join('\n');
        const kDate=await sign(enc.encode(`AWS4${secretKey}`),dateStr);
        const kReg=await sign(kDate,region);const kSvc=await sign(kReg,service);const kSign=await sign(kSvc,'aws4_request');
        const sig=hex(await sign(kSign,sts));
        return res.status(200).json({ viewUrl:`https://${host}${objectPath}?${qp}&X-Amz-Signature=${sig}` });
      } catch(e){ return res.status(500).json({error:e.message}); }
    }

    // Status check
    const { accountId, accessKey, secretKey, bucket, pubUrl } = cfg();
    const missing=[];
    if(!accountId)missing.push('R2_ACCOUNT_ID');
    if(!accessKey)missing.push('R2_ACCESS_KEY_ID');
    if(!secretKey)missing.push('R2_SECRET_ACCESS_KEY');
    if(!bucket)missing.push('R2_BUCKET_NAME');
    return res.status(200).json({
      configured: missing.length===0, missing,
      bucket: bucket||null, publicUrl: pubUrl||null,
      hint: missing.length>0?`Add to Vercel env: ${missing.join(', ')}`:'R2 configured.',
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const cid = req.headers['x-company-id'] || '';
  if (!cid) return res.status(400).json({ error: 'Missing x-company-id header.' });

  const { key, mimeType, dataBase64 } = req.body || {};
  if (!key || !mimeType || !dataBase64)
    return res.status(400).json({ error: 'key, mimeType and dataBase64 required.' });

  const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
  if (!allowed.includes(mimeType))
    return res.status(400).json({ error: 'File type not allowed.' });

  const { accountId, accessKey, secretKey, bucket } = cfg();
  if (!accountId || !accessKey || !secretKey || !bucket)
    return res.status(500).json({ error: 'R2 not configured on server.' });

  try {
    // Safely decode base64 — atob is available in Node 18+ / Vercel Edge
    let bytes;
    try {
      const binary = Buffer.from(dataBase64, 'base64');
      bytes = new Uint8Array(binary.buffer, binary.byteOffset, binary.byteLength);
    } catch (decodeErr) {
      return res.status(400).json({ error: `Base64 decode failed: ${decodeErr.message}` });
    }

    if (bytes.length === 0) {
      return res.status(400).json({ error: 'File is empty — nothing to upload.' });
    }
    if (bytes.length > 12_000_000) {
      return res.status(413).json({ error: `File too large: ${(bytes.length/1024/1024).toFixed(1)}MB. Max 10MB.` });
    }

    await uploadToR2(key, mimeType, bytes);

    const { pubUrl } = cfg();
    const viewUrl = pubUrl ? `${pubUrl.replace(/\/$/,'')}/${key}` : null;

    return res.status(200).json({ success: true, storagePath: key, viewUrl });
  } catch (e) {
    // Return the full error including any R2 XML response
    return res.status(500).json({ error: e.message });
  }
}
