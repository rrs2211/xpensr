// ═══════════════════════════════════════════════════════════════════════════
//  HisaabHub — Supabase Data Layer
//  File: src/supabase.js
//  Install: npm install @supabase/supabase-js
//  Set in .env: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
// ═══════════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,       // keeps user logged in across refreshes
    autoRefreshToken: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export const auth = {
  /** Sign in with email + password */
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  /** Sign in with Google OAuth (redirect flow) */
  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  },

  /** Sign out */
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /** Get current session */
  getSession: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  /** Change password */
  updatePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  /** Listen for auth state changes */
  onAuthChange: (callback) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
  },
};

// ─── HELPER: camelCase ↔ snake_case ──────────────────────────────────────────
// Supabase returns snake_case; our app uses camelCase.
// These mappers translate between them.

const mapUser = (r) => r ? ({
  id: r.id,
  cid: r.company_id,
  companyId: r.company_id,
  name: r.name,
  email: r.email,
  role: r.role,
  avatar: r.avatar,
  dept: r.dept,
  balance: parseFloat(r.balance) || 0,
  reimbursable: parseFloat(r.reimbursable) || 0,
  delegateTo: r.delegate_to || null,
}) : null;

const mapTrip = (r) => r ? ({
  id: r.id,
  companyId: r.company_id,
  name: r.name,
  type: r.type,
  startDate: r.start_date,
  endDate: r.end_date,
  status: r.status,
  budget: parseFloat(r.budget) || 0,
  spent: parseFloat(r.spent) || 0,
  assignedTo: (r.trip_assignments || []).map(a => a.user_id),
}) : null;

const mapClaim = (r) => r ? ({
  id: r.id,
  companyId: r.company_id,
  tripId: r.trip_id,
  empId: r.emp_id,
  date: r.date,
  category: r.category,
  desc: r.description,
  vendor: r.vendor,
  amount: parseFloat(r.amount) || 0,
  origAmount: parseFloat(r.orig_amount) || 0,
  origCur: r.orig_currency,
  status: r.status,
  autoApproved: r.auto_approved,
  remarks: r.remarks,
  flagged: r.flagged,
  anomaly: r.anomaly,
  anomalyReasons: r.anomaly_reasons || [],
  weekendFlag: r.weekend_flag,
  notes: r.notes,
  receipts: (r.receipts || []).map(rc => ({
    id: rc.id,
    name: rc.file_name,
    storagePath: rc.storage_path,
    type: rc.mime_type,
    // url will be filled by getReceiptUrl()
    url: null,
  })),
  comments: (r.claim_comments || []).map(c => ({
    id: c.id,
    userId: c.user_id,
    name: c.user_name,
    text: c.text,
    time: new Date(c.created_at).toLocaleString(),
  })),
  createdAt: r.created_at,
}) : null;

const mapPolicy = (r) => r ? ({
  autoApproveLimit: parseFloat(r.auto_approve_limit),
  reimbursementMode: r.reimbursement_mode,
  receiptMandatoryAbove: parseFloat(r.receipt_mandatory_above),
  weekendRequiresApproval: r.weekend_requires_approval,
  multiLevelApproval: r.multi_level_approval,
  approvalLevels: r.approval_levels,
  vendorWhitelist: r.vendor_whitelist || [],
  vendorBlacklist: r.vendor_blacklist || [],
  departmentBudgets: r.department_budgets || {},
  categoryPct: r.category_pct || {},
  scheduledReports: r.scheduled_reports || {},
}) : null;

const mapNotification = (r) => r ? ({
  id: r.id,
  userId: r.user_id,
  text: r.text,
  type: r.type,
  read: r.read,
  time: new Date(r.created_at).toLocaleString(),
}) : null;

const mapAuditLog = (r) => r ? ({
  id: r.id,
  action: r.action,
  claimId: r.claim_id,
  by: r.by_user_id,
  byName: r.by_name,
  at: new Date(r.created_at).toLocaleString(),
  remarks: r.remarks,
}) : null;

const mapTopup = (r) => r ? ({
  id: r.id,
  empId: r.emp_id,
  amount: parseFloat(r.amount),
  reason: r.reason,
  date: r.date,
  status: r.status,
}) : null;

// ─── COMPANY DATA ─────────────────────────────────────────────────────────────

export const db = {
  // ── Load full company data (replaces DB[cid]) ────────────────────────────
  loadCompany: async (companyId) => {
    const [
      { data: meta },
      { data: users },
      { data: trips },
      { data: claims },
      { data: topups },
      { data: auditLog },
      { data: notifications },
      { data: policy },
    ] = await Promise.all([
      supabase.from('companies').select('*').eq('id', companyId).single(),
      supabase.from('users').select('*').eq('company_id', companyId),
      supabase.from('trips').select('*, trip_assignments(user_id)').eq('company_id', companyId),
      supabase.from('claims').select('*, receipts(*), claim_comments(*)').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('topups').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('audit_log').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(500),
      supabase.from('notifications').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(200),
      supabase.from('policy').select('*').eq('company_id', companyId).single(),
    ]);

    return {
      meta: meta ? {
        id: meta.id, name: meta.name, industry: meta.industry,
        plan: meta.plan, maxUsers: meta.max_users, status: meta.status,
        createdOn: meta.created_on,
      } : null,
      users:         (users || []).map(mapUser),
      trips:         (trips || []).map(mapTrip),
      claims:        (claims || []).map(mapClaim),
      topups:        (topups || []).map(mapTopup),
      auditLog:      (auditLog || []).map(mapAuditLog),
      notifications: (notifications || []).map(mapNotification),
      policy:        mapPolicy(policy),
    };
  },

  // ── Current user profile ─────────────────────────────────────────────────
  getMyProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
    return mapUser(data);
  },

  isSuperAdmin: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from('super_admins').select('id').eq('id', user.id).maybeSingle();
    return !!data;
  },

  // ── CLAIMS ───────────────────────────────────────────────────────────────
  submitClaim: async (claim, companyId) => {
    const { receipts, comments, ...claimData } = claim;
    const { data, error } = await supabase.from('claims').insert({
      id:               claimData.id,
      company_id:       companyId,
      trip_id:          claimData.tripId,
      emp_id:           claimData.empId,
      date:             claimData.date,
      category:         claimData.category,
      description:      claimData.desc,
      vendor:           claimData.vendor || '',
      amount:           claimData.amount,
      orig_amount:      claimData.origAmount,
      orig_currency:    claimData.origCur || 'INR',
      status:           claimData.status,
      auto_approved:    claimData.autoApproved,
      remarks:          claimData.remarks || '',
      flagged:          claimData.flagged,
      anomaly:          claimData.anomaly,
      anomaly_reasons:  claimData.anomalyReasons || [],
      weekend_flag:     claimData.weekendFlag,
      notes:            claimData.notes || '',
    }).select().single();
    if (error) throw error;
    return mapClaim(data);
  },

  updateClaimStatus: async (claimId, status, remarks) => {
    const { error } = await supabase.from('claims')
      .update({ status, remarks: remarks || status })
      .eq('id', claimId);
    if (error) throw error;
  },

  // ── RECEIPTS (Supabase Storage) ───────────────────────────────────────────
  uploadReceipt: async (claimId, companyId, file) => {
    const ext = file.type.includes('pdf') ? 'pdf' : 'jpg';
    const path = `${companyId}/${claimId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    const { error: dbError } = await supabase.from('receipts').insert({
      claim_id:     claimId,
      company_id:   companyId,
      file_name:    file.name || `receipt.${ext}`,
      storage_path: path,
      mime_type:    file.type,
    });
    if (dbError) throw dbError;
    return path;
  },

  getReceiptUrl: async (storagePath) => {
    const { data } = await supabase.storage
      .from('receipts')
      .createSignedUrl(storagePath, 3600); // 1 hour
    return data?.signedUrl || null;
  },

  // ── For base64 receipts (from OCR/camera capture) ─────────────────────────
  uploadReceiptBase64: async (claimId, companyId, b64, mimeType, fileName) => {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });
    const file = new File([blob], fileName || `receipt_${Date.now()}.jpg`, { type: mimeType });
    return db.uploadReceipt(claimId, companyId, file);
  },

  // ── COMMENTS ─────────────────────────────────────────────────────────────
  addComment: async (claimId, userId, userName, text) => {
    const { data, error } = await supabase.from('claim_comments').insert({
      claim_id: claimId, user_id: userId, user_name: userName, text,
    }).select().single();
    if (error) throw error;
    return { id: data.id, userId: data.user_id, name: data.user_name, text: data.text, time: new Date(data.created_at).toLocaleString() };
  },

  // ── USERS ─────────────────────────────────────────────────────────────────
  addEmployee: async (companyId, userData, password) => {
    // 1. Create auth user via Supabase Admin API (requires service_role key — do this server-side)
    // For now, use signUp which sends a confirmation email
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: userData.email,
      password,
      options: { data: { name: userData.name } },
    });
    if (authErr) throw authErr;

    // 2. Insert profile row
    const { data, error } = await supabase.from('users').insert({
      id:         authData.user.id,
      company_id: companyId,
      name:       userData.name,
      email:      userData.email,
      role:       userData.role || 'employee',
      avatar:     userData.avatar || userData.name.slice(0,2).toUpperCase(),
      dept:       userData.dept || 'Operations',
      balance:    userData.balance || 0,
    }).select().single();
    if (error) throw error;
    return mapUser(data);
  },

  updateUser: async (userId, patch) => {
    const dbPatch = {};
    if (patch.balance     !== undefined) dbPatch.balance      = patch.balance;
    if (patch.reimbursable!== undefined) dbPatch.reimbursable = patch.reimbursable;
    if (patch.delegateTo  !== undefined) dbPatch.delegate_to  = patch.delegateTo;
    if (patch.name        !== undefined) dbPatch.name         = patch.name;
    if (patch.dept        !== undefined) dbPatch.dept         = patch.dept;
    const { error } = await supabase.from('users').update(dbPatch).eq('id', userId);
    if (error) throw error;
  },

  // ── TRIPS ─────────────────────────────────────────────────────────────────
  createTrip: async (trip, companyId, assignedUserIds) => {
    const { data, error } = await supabase.from('trips').insert({
      id:         trip.id,
      company_id: companyId,
      name:       trip.name,
      type:       trip.type,
      start_date: trip.startDate,
      end_date:   trip.endDate,
      status:     trip.status,
      budget:     trip.budget,
      spent:      0,
    }).select().single();
    if (error) throw error;

    if (assignedUserIds?.length) {
      const assignments = assignedUserIds.map(uid => ({ trip_id: trip.id, user_id: uid }));
      await supabase.from('trip_assignments').insert(assignments);
    }
    return mapTrip(data);
  },

  updateTripStatus: async (tripId, status) => {
    const { error } = await supabase.from('trips').update({ status }).eq('id', tripId);
    if (error) throw error;
  },

  updateTripSpent: async (tripId, spentDelta) => {
    // Use RPC to atomically increment spent
    const { error } = await supabase.rpc('increment_trip_spent', {
      trip_id: tripId, delta: spentDelta,
    });
    if (error) {
      // Fallback: read-then-write
      const { data: trip } = await supabase.from('trips').select('spent').eq('id', tripId).single();
      await supabase.from('trips').update({ spent: (trip?.spent || 0) + spentDelta }).eq('id', tripId);
    }
  },

  // ── TOPUPS ────────────────────────────────────────────────────────────────
  createTopup: async (topup, companyId) => {
    const { data, error } = await supabase.from('topups').insert({
      id: topup.id, company_id: companyId,
      emp_id: topup.empId, amount: topup.amount,
      reason: topup.reason, date: topup.date, status: 'Pending',
    }).select().single();
    if (error) throw error;
    return mapTopup(data);
  },

  updateTopupStatus: async (topupId, status) => {
    const { error } = await supabase.from('topups').update({ status }).eq('id', topupId);
    if (error) throw error;
  },

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  pushNotification: async (companyId, userId, text, type = 'info') => {
    const { error } = await supabase.from('notifications').insert({
      company_id: companyId, user_id: userId, text, type, read: false,
    });
    if (error) console.warn('Notification insert failed:', error);
  },

  markNotificationsRead: async (companyId, userId) => {
    await supabase.from('notifications')
      .update({ read: true })
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .eq('read', false);
  },

  // ── AUDIT LOG ─────────────────────────────────────────────────────────────
  addAuditLog: async (companyId, action, claimId, byUserId, byName, remarks = '') => {
    const { error } = await supabase.from('audit_log').insert({
      company_id: companyId, action, claim_id: claimId,
      by_user_id: byUserId, by_name: byName, remarks,
    });
    if (error) console.warn('Audit log insert failed:', error);
  },

  // ── POLICY ────────────────────────────────────────────────────────────────
  updatePolicy: async (companyId, policy) => {
    const { error } = await supabase.from('policy').upsert({
      company_id:               companyId,
      auto_approve_limit:       policy.autoApproveLimit,
      reimbursement_mode:       policy.reimbursementMode,
      receipt_mandatory_above:  policy.receiptMandatoryAbove,
      weekend_requires_approval:policy.weekendRequiresApproval,
      multi_level_approval:     policy.multiLevelApproval,
      approval_levels:          policy.approvalLevels,
      vendor_whitelist:         policy.vendorWhitelist,
      vendor_blacklist:         policy.vendorBlacklist,
      department_budgets:       policy.departmentBudgets,
      category_pct:             policy.categoryPct,
      scheduled_reports:        policy.scheduledReports,
    });
    if (error) throw error;
  },

  // ── COMPANIES (Super Admin) ────────────────────────────────────────────────
  createCompany: async (meta, adminUser, adminPassword) => {
    // 1. Insert company
    const { error: coErr } = await supabase.from('companies').insert({
      id: meta.id, name: meta.name, industry: meta.industry,
      plan: meta.plan, max_users: meta.maxUsers, status: 'Active',
    });
    if (coErr) throw coErr;

    // 2. Insert default policy
    await supabase.from('policy').insert({ company_id: meta.id });

    // 3. Create admin auth + profile (see note above about server-side)
    return db.addEmployee(meta.id, adminUser, adminPassword);
  },

  loadAllCompanies: async () => {
    const { data, error } = await supabase.from('companies').select('*');
    if (error) throw error;
    return data.map(c => ({
      id: c.id, name: c.name, industry: c.industry, plan: c.plan,
      maxUsers: c.max_users, status: c.status, createdOn: c.created_on,
    }));
  },

  updateCompanyStatus: async (companyId, status) => {
    await supabase.from('companies').update({ status }).eq('id', companyId);
  },

  updateCompanyMaxUsers: async (companyId, maxUsers) => {
    await supabase.from('companies').update({ max_users: maxUsers }).eq('id', companyId);
  },

  // ── REALTIME subscriptions ────────────────────────────────────────────────
  subscribeToCompany: (companyId, onClaims, onNotifications) => {
    const channel = supabase.channel(`company:${companyId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'claims',
        filter: `company_id=eq.${companyId}`,
      }, payload => onClaims(payload))
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `company_id=eq.${companyId}`,
      }, payload => onNotifications(payload.new))
      .subscribe();
    return channel;
  },

  unsubscribe: (channel) => supabase.removeChannel(channel),
};

// ─── RPC: increment_trip_spent (run in Supabase SQL editor) ──────────────────
// create or replace function public.increment_trip_spent(trip_id text, delta numeric)
// returns void language plpgsql as $$
// begin
//   update public.trips set spent = spent + delta where id = trip_id;
// end; $$;
