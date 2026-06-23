// /api/storage — BYOS (Bring Your Own Storage) proxy
//
// Supported providers:
//   - Supabase Storage (default — company's own Supabase project)
//   - AWS S3
//   - Cloudflare R2 (S3-compatible)
//   - Backblaze B2 (S3-compatible)
//   - Google Cloud Storage
//
// The company's storage credentials are stored in company_storage_config.
// This function generates presigned upload/download URLs server-side.
// The browser uploads DIRECTLY to their storage — XpensR never receives the file.

import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'https://xpensr.in').split(',').map(s => s.trim());

function setCORS(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-company-id');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
  res.setHeader('Vary', 'Origin');
}

function getDb() {
  return createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Generate presigned S3/R2/B2 upload URL using AWS Signature V4
async function getS3PresignedUrl(config, key, mimeType, action = 'upload') {
  const { endpoint, bucket, accessKeyId, secretAccessKey, region = 'auto' } = config;

  // Dynamic import of AWS SDK (available in Node.js 20)
  // Since we can't install packages in serverless, use the Web Crypto API for signing
  const host = endpoint
    ? new URL(endpoint).host
    : `${bucket}.s3.${region}.amazonaws.com`;

  const service = 's3';
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const expiresIn = 3600; // 1 hour

  const url = endpoint
    ? `${endpoint}/${bucket}/${key}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  // Build query params for presigned URL
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  });

  // Sign with HMAC-SHA256
  const encoder = new TextEncoder();
  const sign = async (key, msg) => {
    const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', k, encoder.encode(msg));
    return new Uint8Array(sig);
  };

  const toHex = buf => Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');

  const canonicalRequest = [
    action === 'upload' ? 'PUT' : 'GET',
    `/${key}`,
    queryParams.toString(),
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest));
  const hashedRequest = toHex(new Uint8Array(hashBuffer));

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hashedRequest,
  ].join('\n');

  const kDate    = await sign(encoder.encode(`AWS4${secretAccessKey}`), dateStamp);
  const kRegion  = await sign(kDate, region);
  const kService = await sign(kRegion, service);
  const kSigning = await sign(kService, 'aws4_request');
  const signature = toHex(await sign(kSigning, stringToSign));

  return `${url}?${queryParams}&X-Amz-Signature=${signature}`;
}

export default async function handler(req, res) {
  setCORS(req, res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const companyId = req.headers['x-company-id'] || '';
  if (!companyId) return res.status(400).json({ error: 'Missing company ID.' });

  const db = getDb();

  // Load company storage config
  const { data: storageConfig } = await db
    .from('company_storage_config')
    .select('provider, bucket, endpoint, access_key_id, secret_access_key, region, public_base_url')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .maybeSingle();

  // ── GET /api/storage?action=status ────────────────────────────────────────
  if (req.method === 'GET') {
    if (!storageConfig) {
      return res.status(200).json({
        hasConfig: false,
        message: 'Using XpensR default storage (Supabase). Configure your own storage below.'
      });
    }
    return res.status(200).json({
      hasConfig: true,
      provider: storageConfig.provider,
      bucket: storageConfig.bucket,
      endpoint: storageConfig.endpoint,
      // Never return access keys
    });
  }

  // ── POST /api/storage?action=upload-url ────────────────────────────────────
  // Returns a presigned URL — browser uploads directly to their storage
  if (req.method === 'POST' && req.url?.includes('upload-url')) {
    const { key, mimeType } = req.body || {};
    if (!key || !mimeType) return res.status(400).json({ error: 'key and mimeType required.' });

    if (!storageConfig) {
      // Fall back to XpensR Supabase storage
      const xpensrDb = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data } = await xpensrDb.storage.from('receipts')
        .createSignedUploadUrl(`${companyId}/${key}`);
      if (!data?.signedUrl) return res.status(500).json({ error: 'Failed to generate upload URL.' });
      return res.status(200).json({ uploadUrl: data.signedUrl, storagePath: `${companyId}/${key}`, provider: 'xpensr_supabase' });
    }

    try {
      const storagePath = `${companyId}/${key}`;
      let uploadUrl;

      if (['s3', 'r2', 'b2'].includes(storageConfig.provider)) {
        uploadUrl = await getS3PresignedUrl({
          endpoint: storageConfig.endpoint,
          bucket: storageConfig.bucket,
          accessKeyId: storageConfig.access_key_id,
          secretAccessKey: storageConfig.secret_access_key,
          region: storageConfig.region || 'auto',
        }, storagePath, mimeType, 'upload');
      } else if (storageConfig.provider === 'supabase') {
        // Company's own Supabase project
        const coDb = createClient(storageConfig.endpoint, storageConfig.access_key_id,
          { auth: { autoRefreshToken: false, persistSession: false } });
        const { data } = await coDb.storage.from(storageConfig.bucket)
          .createSignedUploadUrl(storagePath);
        uploadUrl = data?.signedUrl;
      }

      if (!uploadUrl) return res.status(500).json({ error: 'Failed to generate upload URL.' });

      return res.status(200).json({
        uploadUrl,
        storagePath,
        provider: storageConfig.provider,
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── POST /api/storage?action=view-url ─────────────────────────────────────
  // Returns a presigned download/view URL
  if (req.method === 'POST' && req.url?.includes('view-url')) {
    const { storagePath, provider: storedProvider } = req.body || {};
    if (!storagePath) return res.status(400).json({ error: 'storagePath required.' });

    if (!storageConfig || storedProvider === 'xpensr_supabase') {
      const xpensrDb = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data } = await xpensrDb.storage.from('receipts').createSignedUrl(storagePath, 3600);
      return res.status(200).json({ viewUrl: data?.signedUrl || '' });
    }

    try {
      let viewUrl;
      if (['s3', 'r2', 'b2'].includes(storageConfig.provider)) {
        viewUrl = await getS3PresignedUrl({
          endpoint: storageConfig.endpoint,
          bucket: storageConfig.bucket,
          accessKeyId: storageConfig.access_key_id,
          secretAccessKey: storageConfig.secret_access_key,
          region: storageConfig.region || 'auto',
        }, storagePath, '', 'download');
      } else if (storageConfig.provider === 'supabase') {
        const coDb = createClient(storageConfig.endpoint, storageConfig.access_key_id,
          { auth: { autoRefreshToken: false, persistSession: false } });
        const { data } = await coDb.storage.from(storageConfig.bucket)
          .createSignedUrl(storagePath, 3600);
        viewUrl = data?.signedUrl;
      } else if (storageConfig.public_base_url) {
        viewUrl = `${storageConfig.public_base_url}/${storagePath}`;
      }
      return res.status(200).json({ viewUrl: viewUrl || '' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── POST /api/storage?action=configure ────────────────────────────────────
  // Save company storage config — credentials stored server-side only
  if (req.method === 'POST' && req.url?.includes('configure')) {
    const { provider, bucket, endpoint, accessKeyId, secretAccessKey, region, publicBaseUrl } = req.body || {};
    if (!provider || !bucket) return res.status(400).json({ error: 'provider and bucket are required.' });
    if (!['s3', 'r2', 'b2', 'supabase', 'gcs'].includes(provider))
      return res.status(400).json({ error: 'Invalid storage provider.' });

    const { error } = await db.from('company_storage_config').upsert({
      company_id: companyId,
      provider,
      bucket,
      endpoint: endpoint || null,
      access_key_id: accessKeyId || null,
      secret_access_key: secretAccessKey || null,  // encrypted at rest by Supabase
      region: region || 'auto',
      public_base_url: publicBaseUrl || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, message: `✓ Storage configured with ${provider}. New receipts will upload to your ${bucket} bucket.` });
  }

  // ── DELETE: remove storage config ─────────────────────────────────────────
  if (req.method === 'DELETE') {
    await db.from('company_storage_config').delete().eq('company_id', companyId);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
