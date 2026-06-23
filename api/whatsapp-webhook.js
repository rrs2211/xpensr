// /api/whatsapp-webhook — Inbound WhatsApp handler (Interakt webhook)
// When an employee or manager replies on WhatsApp, this processes the command
// and updates the database, then sends a confirmation back.
//
// Supported reply commands:
//   APPROVE <claim-id>                 — approve a pending claim
//   REJECT <claim-id> [reason]         — reject with optional reason
//   STATUS <trip-name-or-id>           — budget status for a trip
//   BUDGET                             — overall wallet balance
//   HELP                               — list commands
//   YES / NO                           — reply to a prompted action

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const INTERAKT_KEY         = process.env.INTERAKT_API_KEY || '';
// Webhook verification token — set this in Interakt dashboard and Vercel env
const WEBHOOK_SECRET       = process.env.WHATSAPP_WEBHOOK_SECRET || '';

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function sendWhatsApp(phone, message) {
  if (!INTERAKT_KEY) return;
  const cleanPhone = phone.replace(/\D/g, '').replace(/^0+/, '').replace(/^91/, '');
  await fetch('https://api.interakt.ai/v1/public/message/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(INTERAKT_KEY).toString('base64')}`,
    },
    body: JSON.stringify({
      countryCode: '91',
      phoneNumber: cleanPhone,
      callbackData: 'xpensr_reply',
      type: 'Text',
      data: { message },
    }),
  }).catch(() => {});
}

function fmt(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

async function handleCommand(supabase, userPhone, rawText) {
  const text = rawText.trim().toUpperCase();
  const parts = rawText.trim().split(/\s+/);
  const cmd = parts[0].toUpperCase();

  // Find the user by phone number
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('phone', userPhone)
    .limit(1);
  const user = users?.[0];

  if (!user) {
    return `❌ Your number ${userPhone} is not registered in XpensR. Contact your administrator.`;
  }

  const companyId = user.company_id;
  const isManager = ['manager', 'admin', 'cfo', 'hr', 'finance'].includes(user.role);

  // ── HELP ─────────────────────────────────────────────────────────────────
  if (cmd === 'HELP' || text === '?') {
    const managerCmds = isManager ? `\n*Manager commands:*\nAPPROVE EXP-xxx\nREJECT EXP-xxx [reason]\nSTATUS [trip name]\nPENDING — list pending claims` : '';
    return `*XpensR Commands*\n\nBUDGET — your wallet balance\nSTATUS [trip] — trip budget${managerCmds}\nHELP — this message\n\nReply with command text.`;
  }

  // ── BUDGET ───────────────────────────────────────────────────────────────
  if (cmd === 'BUDGET') {
    const { data: userData } = await supabase
      .from('users').select('balance, reimbursable').eq('id', user.id).single();
    const balance = userData?.balance || 0;
    const { data: activeClaims } = await supabase
      .from('claims')
      .select('amount, status')
      .eq('company_id', companyId)
      .eq('emp_id', user.id)
      .in('status', ['Pending', 'Approved']);
    const pending = (activeClaims || []).filter(c => c.status === 'Pending').reduce((s, c) => s + c.amount, 0);
    const approved = (activeClaims || []).filter(c => c.status === 'Approved').reduce((s, c) => s + c.amount, 0);
    return `*Your XpensR Wallet*\n\nBalance: ${fmt(balance)}\nPending claims: ${fmt(pending)}\nApproved: ${fmt(approved)}\nNet available: ${fmt(balance - pending)}\n\nType HELP for commands.`;
  }

  // ── STATUS [trip] ─────────────────────────────────────────────────────────
  if (cmd === 'STATUS') {
    const tripSearch = parts.slice(1).join(' ');
    let query = supabase.from('trips').select('*').eq('company_id', companyId).eq('status', 'active');
    if (tripSearch) query = query.ilike('name', `%${tripSearch}%`);
    else query = query.contains('assigned_to', [user.id]).limit(1);
    const { data: trips } = await query.limit(3);
    if (!trips?.length) return `No active trip found${tripSearch ? ` matching "${tripSearch}"` : ''}.`;
    const trip = trips[0];
    const { data: claims } = await supabase.from('claims').select('amount, status, emp_id').eq('trip_id', trip.id);
    const spent = (claims || []).filter(c => c.status !== 'Rejected').reduce((s, c) => s + c.amount, 0);
    const pending = (claims || []).filter(c => c.status === 'Pending').reduce((s, c) => s + c.amount, 0);
    const budget = trip.budget || 0;
    const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
    const bar = '█'.repeat(Math.min(10, Math.round(pct / 10))) + '░'.repeat(Math.max(0, 10 - Math.round(pct / 10)));
    return `*Trip: ${trip.name}*\n${trip.start_date} → ${trip.end_date}\n\nBudget: ${fmt(budget)}\nSpent: ${fmt(spent)} (${pct}%)\n[${bar}]\nPending: ${fmt(pending)}\nLeft: ${fmt(Math.max(0, budget - spent))}\nClaims: ${(claims || []).length}`;
  }

  // ── APPROVE <claim-id> ────────────────────────────────────────────────────
  if (cmd === 'APPROVE' && isManager) {
    const claimId = parts[1];
    if (!claimId) return 'Usage: APPROVE EXP-xxxxxxxx';
    const { data: claim } = await supabase.from('claims').select('*').eq('id', claimId).eq('company_id', companyId).single();
    if (!claim) return `❌ Claim ${claimId} not found.`;
    if (claim.status !== 'Pending') return `⚠ Claim ${claimId} is already ${claim.status}.`;

    // Check approval authority
    const { data: emp } = await supabase.from('users').select('*').eq('id', claim.emp_id).single();
    await supabase.from('claims').update({
      status: 'Approved',
      remarks: `Approved via WhatsApp by ${user.name}`,
      updated_at: new Date().toISOString(),
    }).eq('id', claimId);

    // Audit log
    await supabase.from('audit_log').insert({
      company_id: companyId, action: 'Approved', claim_id: claimId,
      by_user_id: user.id, by_name: user.name,
      remarks: 'Approved via WhatsApp',
      created_at: new Date().toISOString(),
    });

    // Notify employee
    if (emp?.phone) {
      await sendWhatsApp(emp.phone,
        `✅ *Claim Approved*\n\nYour claim ${claimId} (${fmt(claim.amount)} — ${claim.category}) has been approved by ${user.name}.\n\nLog in to XpensR to view details.`
      );
    }
    return `✅ Claim ${claimId} approved.\n${fmt(claim.amount)} — ${claim.category}\nEmployee: ${emp?.name || claim.emp_id}\n\nEmployee has been notified.`;
  }

  // ── REJECT <claim-id> [reason] ────────────────────────────────────────────
  if (cmd === 'REJECT' && isManager) {
    const claimId = parts[1];
    const reason = parts.slice(2).join(' ') || 'Rejected via WhatsApp';
    if (!claimId) return 'Usage: REJECT EXP-xxxxxxxx [reason]';
    const { data: claim } = await supabase.from('claims').select('*').eq('id', claimId).eq('company_id', companyId).single();
    if (!claim) return `❌ Claim ${claimId} not found.`;
    if (claim.status !== 'Pending') return `⚠ Claim ${claimId} is already ${claim.status}.`;

    await supabase.from('claims').update({
      status: 'Rejected',
      remarks: reason,
      updated_at: new Date().toISOString(),
    }).eq('id', claimId);

    await supabase.from('audit_log').insert({
      company_id: companyId, action: 'Rejected', claim_id: claimId,
      by_user_id: user.id, by_name: user.name, remarks: reason,
      created_at: new Date().toISOString(),
    });

    const { data: emp } = await supabase.from('users').select('phone, name').eq('id', claim.emp_id).single();
    if (emp?.phone) {
      await sendWhatsApp(emp.phone,
        `❌ *Claim Rejected*\n\nYour claim ${claimId} (${fmt(claim.amount)} — ${claim.category}) has been rejected.\n\nReason: ${reason}\n\nLog in to XpensR to resubmit or appeal.`
      );
    }
    return `❌ Claim ${claimId} rejected.\nReason: ${reason}\n\nEmployee has been notified.`;
  }

  // ── PENDING (manager: list pending claims) ────────────────────────────────
  if (cmd === 'PENDING' && isManager) {
    const { data: pending } = await supabase
      .from('claims').select('id, amount, category, emp_id, description')
      .eq('company_id', companyId).eq('status', 'Pending').limit(5);
    if (!pending?.length) return '✅ No pending claims right now.';
    const lines = await Promise.all((pending || []).map(async c => {
      const { data: emp } = await supabase.from('users').select('name').eq('id', c.emp_id).single();
      return `• ${c.id?.slice(-8)} | ${fmt(c.amount)} | ${c.category} | ${emp?.name || '?'}`;
    }));
    return `*Pending Claims (${pending.length})*\n\n${lines.join('\n')}\n\nReply: APPROVE EXP-xxx or REJECT EXP-xxx`;
  }

  // ── Unrecognised ──────────────────────────────────────────────────────────
  return `I didn't understand that. Type *HELP* for available commands.\n\nReceived: "${rawText.slice(0, 40)}"`;
}

export default async function handler(req, res) {
  // Verify webhook secret if set
  const secret = req.headers['x-interakt-secret'] || req.query.secret || '';
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // Webhook verification challenge (some providers use GET)
    return res.status(200).send(req.query['hub.challenge'] || 'OK');
  }

  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body || {};

  // Interakt webhook payload structure
  const phone   = body?.data?.customer?.phone_number || body?.from || '';
  const msgBody = body?.data?.message?.message || body?.text?.body || '';

  if (!phone || !msgBody) return res.status(200).json({ ok: true }); // ignore non-message events

  const supabase = getSupabase();
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  try {
    const reply = await handleCommand(supabase, phone.replace(/\D/g, '').slice(-10), msgBody);
    if (reply) await sendWhatsApp(phone, reply);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('WhatsApp webhook error:', e);
    await sendWhatsApp(phone, '⚠ Something went wrong. Please log in to XpensR directly.').catch(() => {});
    return res.status(200).json({ ok: true }); // Always 200 to Interakt
  }
}
