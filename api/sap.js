// /api/sap — SAP S/4HANA Integration
// Supports: S/4HANA Cloud (OData v4), S/4HANA On-Premise (OData v2), and IDoc export
// POST /api/sap?action=test         — test connection
// POST /api/sap?action=export       — export approved claims as FI documents
// POST /api/sap?action=cost_centers — fetch SAP cost centers/GL accounts
// GET  /api/sap?action=config       — get current SAP config (masked)

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'https://xpensr.in').split(',').map(s => s.trim());

function setCORS(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-company-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Vary', 'Origin');
}

// Map XpensR expense category to SAP GL Account (customer can override in Policy)
const DEFAULT_GL_ACCOUNTS = {
  'Travel':                '0040002000',   // Travel expenses
  'Meals':                 '0040003000',   // Meal/entertainment expenses
  'Accommodation':         '0040004000',   // Hotel/accommodation
  'Local Conveyance':      '0040005000',   // Local transport
  'Office Supplies':       '0040006000',   // Office expenses
  'Client Entertainment':  '0040007000',   // Entertainment
  'Software':              '0040008000',   // Software/licenses
  'Training':              '0040009000',   // Training
  'Miscellaneous':         '0040010000',   // Other expenses
};

// Map to SAP cost object type
function buildFILineItems(claims, employees, trips, glAccounts = {}) {
  const items = [];
  let lineNum = 1;

  for (const claim of claims) {
    const emp = employees.find(e => e.id === claim.empId);
    const trip = trips.find(t => t.id === claim.tripId);
    const gl = glAccounts[claim.category] || DEFAULT_GL_ACCOUNTS[claim.category] || '0040010000';
    const costCenter = emp?.costCenter || trip?.projectCode || '';
    const wbsElement = trip?.projectCode || '';
    const text = `${claim.category}: ${claim.desc}`.slice(0, 50);
    const vendor = claim.vendor?.slice(0, 35) || '';
    const amtStr = Math.abs(claim.amount).toFixed(2);

    // Debit line — expense account
    items.push({
      LineNum: String(lineNum++).padStart(6, '0'),
      PostingKey: '40',              // Debit
      Account: gl,
      Amount: amtStr,
      Currency: 'INR',
      CostCenter: costCenter.slice(0, 10),
      WBSElement: wbsElement.slice(0, 24),
      Text: text,
      Assignment: claim.id?.slice(-16) || '',
      TaxCode: claim.gstAmount > 0 ? 'V5' : '',  // V5 = Input GST 18%
    });

    // Credit line — employee vendor account (AP)
    items.push({
      LineNum: String(lineNum++).padStart(6, '0'),
      PostingKey: '31',              // Credit vendor
      Account: emp?.sapVendorId || emp?.employeeId || '',
      Amount: amtStr,
      Currency: 'INR',
      Text: `Reimburse: ${emp?.name || ''} — ${text}`.slice(0, 50),
      Assignment: claim.id?.slice(-16) || '',
      Reference: claim.id?.slice(-16) || '',
    });
  }
  return items;
}

// Build SAP IDoc (EDI format — works with both cloud and on-premise)
function buildIDoc(claims, employees, trips, companyCode, glAccounts) {
  const docDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const lines = buildFILineItems(claims, employees, trips, glAccounts);
  const totalAmt = claims.reduce((s, c) => s + c.amount, 0).toFixed(2);

  let idoc = `EDI_DC40\n`;
  idoc += `DOCNUM  ${Date.now()}\n`;
  idoc += `IDOCTYP FIDCCP02\n`;
  idoc += `MESTYP  FIDCC2\n`;
  idoc += `E1FIKPF\n`;
  idoc += `  BUKRS ${(companyCode || '1000').padEnd(4)}\n`;
  idoc += `  BLDAT ${docDate}\n`;
  idoc += `  BUDAT ${docDate}\n`;
  idoc += `  BLART KR\n`;  // Vendor invoice document type
  idoc += `  WAERS INR\n`;
  idoc += `  BKTXT XpensR Expense Import\n`;
  idoc += `  XBLNR XPENSR-${Date.now().toString().slice(-8)}\n`;

  for (const item of lines) {
    idoc += `E1FICOBL\n`;
    idoc += `  BUZEI ${item.LineNum}\n`;
    idoc += `  BSCHL ${item.PostingKey}\n`;
    idoc += `  HKONT ${item.Account.padEnd(10)}\n`;
    idoc += `  WRBTR ${item.Amount}\n`;
    idoc += `  WAERS INR\n`;
    if (item.CostCenter) idoc += `  KOSTL ${item.CostCenter.padEnd(10)}\n`;
    if (item.WBSElement) idoc += `  PROJK ${item.WBSElement.padEnd(24)}\n`;
    if (item.Text) idoc += `  SGTXT ${item.Text.slice(0, 50)}\n`;
    if (item.Assignment) idoc += `  ZUONR ${item.Assignment.padEnd(18)}\n`;
    if (item.TaxCode) idoc += `  MWSKZ ${item.TaxCode}\n`;
  }

  return idoc;
}

// Call SAP OData API (S/4HANA Cloud or On-Premise)
async function callSAPOData(sapConfig, path, method = 'GET', body = null) {
  const { baseUrl, username, password, client } = sapConfig;
  if (!baseUrl) throw new Error('SAP base URL not configured');

  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'sap-client': client || '100',
  };

  // For POST/PATCH, get CSRF token first
  if (method !== 'GET') {
    const csrfResp = await fetch(`${baseUrl}/sap/opu/odata/sap/API_JOURNALENTRYITEMBASIC_SRV/`, {
      headers: { ...headers, 'X-CSRF-Token': 'Fetch' },
    });
    const csrfToken = csrfResp.headers.get('x-csrf-token') || '';
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  }

  const resp = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => resp.status);
    throw new Error(`SAP ${resp.status}: ${err.slice(0, 200)}`);
  }

  return resp.json().catch(() => ({ status: resp.status }));
}

// Post FI document via SAP Journal Entry API
async function postJournalEntry(sapConfig, claim, employee, trip, glAccounts) {
  const docDate = claim.date?.replace(/-/g, '') || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const gl = glAccounts?.[claim.category] || DEFAULT_GL_ACCOUNTS[claim.category] || '0040010000';
  const costCenter = employee?.costCenter || trip?.projectCode || sapConfig.defaultCostCenter || '';
  const companyCode = sapConfig.companyCode || '1000';

  // SAP S/4HANA Cloud OData Journal Entry
  const payload = {
    CompanyCode: companyCode,
    DocumentDate: docDate,
    PostingDate: docDate,
    DocumentType: 'SA',  // General document
    DocumentHeaderText: `XpensR: ${claim.category} - ${employee?.name || ''}`.slice(0, 25),
    to_AccountingDocumentItem: {
      results: [
        {
          AccountingDocumentItemType: '1',
          GLAccount: gl,
          DocumentItemText: claim.desc?.slice(0, 50) || '',
          AmountInTransactionCurrency: String(claim.amount.toFixed(2)),
          TransactionCurrency: 'INR',
          CostCenter: costCenter,
          DebitCreditCode: 'S',  // Debit
        },
        {
          AccountingDocumentItemType: '1',
          GLAccount: sapConfig.employeeExpenseAccount || '0021000000',
          DocumentItemText: `Reimb: ${employee?.name || ''}`.slice(0, 50),
          AmountInTransactionCurrency: String(claim.amount.toFixed(2)),
          TransactionCurrency: 'INR',
          DebitCreditCode: 'H',  // Credit
        },
      ],
    },
  };

  return callSAPOData(
    sapConfig,
    '/sap/opu/odata/sap/API_JOURNALENTRYITEMBASIC_SRV/A_JournalEntry',
    'POST',
    payload
  );
}

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

export default async function handler(req, res) {
  setCORS(req, res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { action } = req.query || {};
  const companyId = req.headers['x-company-id'] || '';

  // ── GET: config status ────────────────────────────────────────────────────
  if (req.method === 'GET' && action === 'config') {
    const baseUrl = process.env.SAP_BASE_URL || '';
    const username = process.env.SAP_USERNAME || '';
    return res.status(200).json({
      configured: !!(baseUrl && username),
      baseUrl: baseUrl ? baseUrl.replace(/https?:\/\//, '').split('/')[0] : null,
      username: username ? username.slice(0, 3) + '***' : null,
      companyCode: process.env.SAP_COMPANY_CODE || '1000',
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sapConfig = {
    baseUrl:               process.env.SAP_BASE_URL || '',
    username:              process.env.SAP_USERNAME || '',
    password:              process.env.SAP_PASSWORD || '',
    client:                process.env.SAP_CLIENT || '100',
    companyCode:           process.env.SAP_COMPANY_CODE || '1000',
    defaultCostCenter:     process.env.SAP_DEFAULT_COST_CENTER || '',
    employeeExpenseAccount:process.env.SAP_EMPLOYEE_EXPENSE_GL || '0021000000',
    glAccounts:            (() => { try { return JSON.parse(process.env.SAP_GL_ACCOUNTS || '{}'); } catch { return {}; } })(),
  };

  // ── POST action=test ──────────────────────────────────────────────────────
  if (action === 'test') {
    if (!sapConfig.baseUrl) return res.status(400).json({ error: 'SAP_BASE_URL not set in Vercel environment variables' });
    try {
      await callSAPOData(sapConfig, '/sap/opu/odata/sap/API_JOURNALENTRYITEMBASIC_SRV/?$top=1');
      return res.status(200).json({ success: true, message: 'SAP connection successful' });
    } catch (e) {
      return res.status(500).json({ error: e.message, hint: 'Check SAP_BASE_URL, SAP_USERNAME, SAP_PASSWORD, SAP_CLIENT in Vercel env vars' });
    }
  }

  // ── POST action=export ────────────────────────────────────────────────────
  if (action === 'export') {
    const { claims, employees, trips, exportFormat = 'idoc' } = req.body || {};
    if (!claims?.length) return res.status(400).json({ error: 'No claims to export' });

    const approvedClaims = claims.filter(c => c.status === 'Approved' || c.status === 'Auto-Approved');
    if (!approvedClaims.length) return res.status(400).json({ error: 'No approved claims to export' });

    // IDoc format — works without SAP connection, can be uploaded via SM58/WE19
    if (exportFormat === 'idoc') {
      const idocText = buildIDoc(approvedClaims, employees, trips, sapConfig.companyCode, sapConfig.glAccounts);
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="XPENSR_${Date.now()}.IDoc"`);
      return res.status(200).send(idocText);
    }

    // Direct SAP API posting
    if (exportFormat === 'api') {
      if (!sapConfig.baseUrl) return res.status(400).json({ error: 'SAP not configured. Use IDoc export instead, or add SAP credentials to Vercel.' });
      const results = [];
      for (const claim of approvedClaims) {
        const emp  = employees.find(e => e.id === claim.empId);
        const trip = trips.find(t => t.id === claim.tripId);
        try {
          const doc = await postJournalEntry(sapConfig, claim, emp, trip, sapConfig.glAccounts);
          results.push({ claimId: claim.id, status: 'posted', docNumber: doc?.d?.AccountingDocument });
        } catch (e) {
          results.push({ claimId: claim.id, status: 'failed', error: e.message });
        }
      }
      return res.status(200).json({ results, posted: results.filter(r => r.status === 'posted').length, failed: results.filter(r => r.status === 'failed').length });
    }

    return res.status(400).json({ error: 'Invalid exportFormat. Use "idoc" or "api"' });
  }

  // ── POST action=cost_centers ──────────────────────────────────────────────
  if (action === 'cost_centers') {
    if (!sapConfig.baseUrl) return res.status(400).json({ error: 'SAP not configured' });
    try {
      const data = await callSAPOData(sapConfig, '/sap/opu/odata/sap/ODATA_SAP_COSTCENTER_SRV/A_CostCenter?$top=100&$format=json');
      const centers = (data?.d?.results || []).map(cc => ({
        id: cc.CostCenter,
        name: cc.CostCenterName,
        companyCode: cc.CompanyCode,
      }));
      return res.status(200).json({ costCenters: centers });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: `Unknown action: ${action}` });
}
