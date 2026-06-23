# HisaabHub — Supabase Backend Integration Guide
## From localStorage → Production Database in One Afternoon

---

## What You're Getting

| Before (localStorage) | After (Supabase) |
|------------------------|------------------|
| Data on one browser only | Data on any device, any browser |
| Lost on cache clear | Persistent forever |
| No real auth | Supabase Auth (email + Google OAuth) |
| Plaintext passwords in JS | Hashed by Supabase Auth (bcrypt) |
| base64 receipts in RAM | Files in Supabase Storage (S3-backed) |
| No multi-user sync | Real-time updates across all sessions |
| Single-tenant in JS | RLS-enforced multi-tenant isolation |

---

## Step 1: Create Supabase Project (10 minutes)

1. Go to https://supabase.com → New Project
2. Name: `hisaabhub`
3. Database password: save this securely
4. Region: **ap-south-1 (Mumbai)** ← closest to your users
5. Plan: **Free** (works for pilot; upgrade to Pro $25/month when >500MB data)

---

## Step 2: Run the Database Schema (5 minutes)

1. In Supabase Dashboard → **SQL Editor** → New Query
2. Paste the entire contents of `supabase_schema.sql`
3. Click **Run**
4. You should see "Success. No rows returned."

This creates all tables, indexes, RLS policies, and the receipts storage bucket.

---

## Step 3: Enable Google OAuth (optional, 10 minutes)

1. Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Enable it
3. Go to [Google Cloud Console](https://console.cloud.google.com)
4. Create OAuth credentials (Web application)
5. Authorised redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
6. Paste Client ID and Secret into Supabase

---

## Step 4: Create the Super Admin (5 minutes)

1. Supabase Dashboard → **Authentication** → **Users** → **Add User**
2. Email: `admin@hisaabhub.in`
3. Password: (set a strong password — change from the demo one!)
4. Copy the UUID of the created user
5. In SQL Editor, run:
   ```sql
   insert into public.super_admins (id) values ('<paste-uuid-here>');
   ```

---

## Step 5: Install Supabase in Your App (5 minutes)

```bash
npm install @supabase/supabase-js
```

Create `.env` in your project root:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Both values are in Supabase Dashboard → **Settings** → **API**.

Copy `supabase_client.js` to `src/supabase.js`.

---

## Step 6: Migrate the Frontend (The Main Work)

The frontend currently uses in-memory React state. You need to replace:

### 6a. Authentication

**Current (fake):**
```js
// In Login component
const attempt = (em, pw) => {
  // searches in-memory DB object
  const u = DB[cid].users.find(u => u.email === em);
  if (u.password === pw) onLogin(u, meta);
};
```

**New (Supabase):**
```js
import { auth, db } from './supabase';

const attempt = async (em, pw) => {
  setBusy(true);
  try {
    await auth.signIn(em, pw);
    // Auth state change listener in Root will pick this up automatically
  } catch (err) {
    setErr(err.message);
  } finally {
    setBusy(false);
  }
};
```

### 6b. Root Component

**Current:**
```js
const [DB, setDB] = useState(() => loadDB() || DB0);
const [session, setSession] = useState(() => loadSession());
```

**New:**
```js
const [session, setSession] = useState(null);
const [companyData, setCompanyData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  // Check existing session on mount
  auth.getSession().then(async (sess) => {
    if (sess?.user) {
      const isSA = await db.isSuperAdmin();
      if (isSA) {
        setSession({ role: 'superadmin', user: { id: sess.user.id, name: 'Super Admin', email: sess.user.email } });
      } else {
        const profile = await db.getMyProfile();
        const coData = await db.loadCompany(profile.companyId);
        setSession({ role: profile.role, user: profile, meta: coData.meta });
        setCompanyData(coData);
      }
    }
    setLoading(false);
  });

  // Listen for auth changes (login/logout/OAuth callback)
  const sub = auth.onAuthChange(async (event, sess) => {
    if (event === 'SIGNED_IN' && sess?.user) {
      const isSA = await db.isSuperAdmin();
      if (isSA) {
        setSession({ role: 'superadmin', user: { id: sess.user.id, name: 'Super Admin', email: sess.user.email } });
      } else {
        const profile = await db.getMyProfile();
        const coData = await db.loadCompany(profile.companyId);
        setSession({ role: profile.role, user: profile, meta: coData.meta });
        setCompanyData(coData);
      }
      setLoading(false);
    }
    if (event === 'SIGNED_OUT') {
      setSession(null);
      setCompanyData(null);
      setLoading(false);
    }
  });
  return () => sub.unsubscribe();
}, []);
```

### 6c. Claim Submission

**Current:**
```js
setClaims(p => [claim, ...p]);
```

**New:**
```js
// 1. Submit claim to DB
const savedClaim = await db.submitClaim(claim, cid);

// 2. Upload receipts to Storage
for (const receipt of form.receipts) {
  if (receipt.b64) {
    await db.uploadReceiptBase64(savedClaim.id, cid, receipt.b64, receipt.type, receipt.name);
  }
}

// 3. Refresh local state
const updated = await db.loadCompany(cid);
setCompanyData(updated);
```

### 6d. Approval Decision

**Current:**
```js
setClaims(p => p.map(c => c.id === claimId ? {...c, status: decision} : c));
```

**New:**
```js
await db.updateClaimStatus(claimId, decision, remarks);
await db.addAuditLog(cid, decision, claimId, user.id, user.name, remarks);
await db.pushNotification(cid, claim.empId, `Your claim ${claimId} was ${decision.toLowerCase()}`);
// Then refresh:
const updated = await db.loadCompany(cid);
setCompanyData(updated);
```

### 6e. Real-time Updates

Add this in CompanyApp to get live updates without polling:
```js
useEffect(() => {
  const channel = db.subscribeToCompany(
    cid,
    (payload) => {
      // Claim changed — refresh claims
      db.loadCompany(cid).then(setCompanyData);
    },
    (newNotif) => {
      // New notification for this user
      if (newNotif.user_id === user.id) {
        toast(newNotif.text, newNotif.type);
      }
    }
  );
  return () => db.unsubscribe(channel);
}, [cid]);
```

---

## Step 7: Protect the Anthropic API Key

**Current problem:** The OCR fetch in SubmitTab goes directly from the browser to `api.anthropic.com` with your API key visible in Network tab.

**Fix:** Create a simple proxy endpoint. Since you're on Netlify:

Create `netlify/functions/ocr.js`:
```js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  const body = JSON.parse(event.body);
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
};
```

Set `ANTHROPIC_API_KEY` in Netlify environment variables (not in your code).

In the frontend, change the OCR fetch URL from:
```js
fetch('https://api.anthropic.com/v1/messages', ...)
```
to:
```js
fetch('/.netlify/functions/ocr', ...)
```

---

## Step 8: Send Real Emails

Use Supabase Edge Functions (serverless) to send emails via Resend (free 3,000/month):

1. `npm install -g supabase`
2. `supabase functions new send-email`
3. Write the function, deploy, call it from your app instead of `emailAlert()`

Or just use Resend's REST API directly from a Netlify function (same pattern as OCR above).

---

## Environment Variables Summary

```
# .env (local)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Netlify environment variables (Dashboard → Site Settings → Env Vars)
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...        (if using Resend for email)
```

**Never put ANTHROPIC_API_KEY in .env or frontend code.**

---

## Data Migration: Moving from localStorage to Supabase

Once Supabase is set up, to migrate any existing localStorage data:

```js
// Run once in browser console on the old app
const data = JSON.parse(localStorage.getItem('hisaabhub_v5_db'));
console.log(JSON.stringify(data, null, 2));
// Copy this JSON, then import it company by company via the SA UI
// or write a migration script using the supabase_client.js functions
```

---

## Cost Estimate

| Scale | Supabase Plan | Monthly Cost |
|-------|--------------|--------------|
| Up to 500 MB data, 50K MAUs | Free | ₹0 |
| 500 MB–8 GB, unlimited MAUs | Pro | ₹2,100/month |
| 8 GB+, SLAs, PITR backup | Team | ₹17,000/month |

For your first 20–30 client companies, the **Free tier is sufficient**.
Upgrade to Pro when you hit ₹50K MRR.

---

## Summary Checklist

- [ ] Create Supabase project (Mumbai region)
- [ ] Run `supabase_schema.sql` in SQL Editor
- [ ] Create super admin auth user, insert into `super_admins` table
- [ ] Enable Google OAuth (optional)
- [ ] Add `.env` with Supabase URL and anon key
- [ ] Install `@supabase/supabase-js`
- [ ] Copy `supabase_client.js` to `src/supabase.js`
- [ ] Replace Login auth with `auth.signIn()`
- [ ] Replace Root session with auth listener
- [ ] Replace `setClaims` with `db.submitClaim()`
- [ ] Replace `handleDecision` with `db.updateClaimStatus()`
- [ ] Add real-time subscription in CompanyApp
- [ ] Create Netlify function to proxy Anthropic API calls
- [ ] Set `ANTHROPIC_API_KEY` in Netlify env vars (remove from frontend)
- [ ] Test with 2 browsers simultaneously — verify real-time sync
- [ ] Delete seed passwords from DB0 constant before deploying

---

## Timeline Estimate

| Task | Time |
|------|------|
| Supabase setup + schema | 30 min |
| Auth integration | 2 hours |
| Claim/approval mutations | 3 hours |
| Receipt file upload | 2 hours |
| Real-time subscription | 1 hour |
| Netlify OCR proxy | 30 min |
| Testing + bug fixes | 3 hours |
| **Total** | **~12 hours** |

One focused developer can ship this in 1.5 working days.
