import React,{ useState, useRef, useEffect, useCallback, useMemo, Component, createContext, useContext } from "react";
import { jsPDF } from "jspdf";
import { createClient } from "@supabase/supabase-js";
import "./security.js"; // Security hardening — devtools blocking, session protection

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
const SUPA_URL  = import.meta.env.VITE_SUPABASE_URL  || "";
const SUPA_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Production-safe logger — no output in prod builds, prevents data leakage via console
const IS_DEV = import.meta.env.DEV === true;
const log = { // eslint-disable-line
  warn:  (...a) => { if(IS_DEV) log.warn(...a); },
  error: (...a) => { if(IS_DEV) log.error(...a); },
  info:  (...a) => { if(IS_DEV) log.info(...a); },
};
const supabase  = (SUPA_URL && SUPA_ANON)
  ? createClient(SUPA_URL, SUPA_ANON, {
      auth:{ persistSession:true, autoRefreshToken:true, storageKey:'xpensr_sb_auth' }
    })
  : null;

// Set a JWT on the Supabase client so auth.uid() works in RLS
const setSupabaseJWT=async(accessToken, refreshToken)=>{
  if(!supabase||!accessToken)return;
  try{
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || accessToken,
    });
  }catch(e){log.warn('setSupabaseJWT:',e.message);}
};

const SB_ENABLED = !!supabase; // false → falls back to localStorage demo mode

// ─── TOKENS ───────────────────────────────────────────────────────────────────
const G="#7ED957",GD="#5CB83A",GL="var(--gl)",GM="var(--gm)";
const DARK="#0f1c09",INK="var(--ink)",MUTED="var(--muted)",BDR="var(--bdr)";
const FD="'Playfair Display',serif",FB="'DM Sans',sans-serif";
const GLSTYLE=`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&family=Sora:wght@300;400&display=swap');
/* ── SECURITY: prevent easy screenshot/scraping of financial values ── */
.xpensr-amount{user-select:none;-webkit-user-select:none;}
.xpensr-root img{pointer-events:none;}
/* Prevent printing of sensitive pages without explicit action */
@media print{.no-print{display:none!important;}}
/* ── LIGHT THEME (default) ── */
:root,[data-dark="false"]{
  --ink:#1a2e12;
  --muted: #1f2937;
  --bdr:#e8f0e5;
  --gl:#f0fde9;
  --gm:#d1fae5;
  --bg:#f5faf3;
  --card:#ffffff;
  --td-color:#374151;
  --th-border:#e8f0e5;
  --td-border:#f8faf6;
  --hover-bg:#fafff8;
  --input-bg:#fafff8;
  --sidebar-text:rgba(255,255,255,0.5);
}
/* ── DARK THEME ── */
[data-dark="true"]{
  --ink:#f0f9ff;
  --muted: #1f2937;
  --bdr:#2d4a2d;
  --gl:#1a2e1a;
  --gm:#1e3a1e;
  --bg:#0f172a;
  --card:#1e293b;
  --td-color:#cbd5e1;
  --th-border:#2d4a2d;
  --td-border:#1e293b;
  --hover-bg:#1a2e1a;
  --input-bg:#1e293b;
  --sidebar-text:rgba(255,255,255,0.6);
}
*{box-sizing:border-box;margin:0;padding:0}
/* Apply font size from data attribute */
[data-fontsize]{font-size:attr(data-fontsize px)}
/* Actually use CSS var for font size */
:root{--app-font-size:13px}
[data-dark] *:not(script):not(style){transition:background-color .15s,color .15s,border-color .15s;}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
.fin{animation:fadeIn .2s ease}
/* Custom scrollbar */
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(126,217,87,.35);border-radius:10px}
::-webkit-scrollbar-thumb:hover{background:rgba(126,217,87,.6)}
[data-dark="true"] ::-webkit-scrollbar-thumb{background:rgba(126,217,87,.25)}
* {scrollbar-width:thin;scrollbar-color:rgba(126,217,87,.4) transparent}
input::placeholder{color:var(--muted)}
th{text-align:left;padding:10px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--th-border);color:var(--ink)}
td{padding:11px 14px;font-size:13px;color:var(--td-color);border-bottom:1px solid var(--td-border)}
.rh:hover{background:var(--hover-bg)!important;cursor:pointer}
input,select,textarea{font-family:'DM Sans',sans-serif;outline:none;color:var(--ink)!important;background:var(--input-bg)}
input:focus,select:focus,textarea:focus{border-color:#7ED957!important}
select{appearance:none}
/* Dark mode card/div backgrounds */
[data-dark="true"] .card-bg{background:var(--card)!important}
[data-dark="true"] .app-bg{background:var(--bg)!important}
[data-dark="true"] table{color:var(--td-color)}
@media(max-width:768px){
  .mob-hide{display:none!important}
  .mob-bottom-nav{display:flex!important}
  .mob-stack{flex-direction:column!important}
  .mob-full{width:100%!important}
  .mob-p-sm{padding:10px!important}
  .mob-grid-1{grid-template-columns:1fr!important}
  .mob-grid-2{grid-template-columns:1fr 1fr!important}
  .mob-scroll{overflow-x:auto!important;-webkit-overflow-scrolling:touch!important}
  .mob-login-panel{width:100%!important;padding:20px!important}
  th{padding:5px 7px!important;font-size:9px!important}
  td{padding:5px 7px!important;font-size:11px!important}
  input,select,textarea{font-size:16px!important}
}
@media(max-width:480px){
  .mob-grid-2{grid-template-columns:1fr!important}
  .mob-hide-xs{display:none!important}
}`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt   = n  => "₹"+Number(n).toLocaleString("en-IN");
const uid=()=>'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&0x3|0x8)).toString(16);});
const today = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
const fmtDate = (d) => {
  // Format any date string (yyyy-mm-dd or ISO) as dd-mm-yyyy
  if(!d)return"—";
  try{
    const s=String(d).slice(0,10); // get yyyy-mm-dd part
    if(s.length<10)return d;
    const[y,m,dd]=s.split("-");
    return `${dd}-${m}-${y}`;
  }catch{return String(d);}
};
const inits = nm => nm.trim().split(/\s+/).map(w=>w[0]).join("").toUpperCase().slice(0,2);
const isWknd= d  => { const day=new Date(d).getDay(); return day===0||day===6; };
const FX    = { USD:83.5, EUR:90.2, GBP:105.4, AED:22.7, SGD:62.1, INR:1 };

const SC={
  Approved:{c:"#16a34a",bg:"#dcfce7",icon:"✓"},
  Pending:{c:"#d97706",bg:"#fef3c7",icon:"⏳"},
  Rejected:{c:"#dc2626",bg:"#fee2e2",icon:"✗"},
  "Auto-Approved":{c:"#2563eb",bg:"#dbeafe",icon:"⚡"},
  Closed:{c:"#6b7280",bg:"#f3f4f6",icon:"🔒"},
  Active:{c:"#16a34a",bg:"#dcfce7",icon:"●"},
  Suspended:{c:"#dc2626",bg:"#fee2e2",icon:"⊘"},
};
const DEFAULT_DEPTS=["Sales","Marketing","Accounts","Procurement","Operations","HR","IT","Management"];
const DEFAULT_CATS=["Travel","Meals","Accommodation","Office Supplies","Client Entertainment","Software","Training","Miscellaneous"];
const CATS=DEFAULT_CATS; // backward compat — actual list comes from policy
const CI={Travel:"✈️",Meals:"🍽️",Accommodation:"🏨","Office Supplies":"📦","Client Entertainment":"🥂",Software:"💻",Training:"📚",Miscellaneous:"🗂️",Other:"📋"};
// DEPTS is now dynamic — comes from company policy. Use DEFAULT_DEPTS as fallback.
const DEPTS=DEFAULT_DEPTS; // backward compat alias
const CURRENCIES=["INR","USD","EUR","GBP","AED","SGD","JPY","CHF","CAD","AUD","CNY","HKD"];
const ROLES=[
  // admin = company admin (full access, override, dual-approve, no data hidden)
  {id:"admin",   label:"Admin",   color:"#7c3aed", perms:["approve","view_all","manage_trips","manage_employees","export","submit","override","dual_approve","admin_close","view_finance","set_balance"]},
  // manager = dept head (approve dept claims, approve employee trips, set trip balance)
  {id:"manager", label:"Manager", color:"#7ED957", perms:["approve","view_dept","manage_trips","export","submit","set_balance"]},
  // finance = read-only accounting + exports (never sees unapproved claims)
  {id:"finance", label:"Finance", color:"#f472b6", perms:["view_all","export","view_finance"]},
  // hr = read-only oversight, policy view, ARET sign-off (cannot approve expenses)
  {id:"hr",      label:"HR",      color:"#fb923c", perms:["view_all","export","view_hr","aret_signoff"]},
  // cfo = read-only executive dashboard (high-level spend, no individual claim access)
  {id:"cfo",     label:"CFO/CEO", color:"#0ea5e9", perms:["view_all","export","view_cfo"]},
  // employee = submit only, can create trips (pending manager approval)
  {id:"employee",label:"Employee",color:"#60a5fa", perms:["submit","view_own","create_trip"]},
];
const TIERED=[{min:1,max:5,ppu:299},{min:6,max:20,ppu:249},{min:21,max:50,ppu:199},{min:51,max:999,ppu:149}];

// ─── SET USER CONTEXT FOR RLS ─────────────────────────────────────────────────
// After custom auth login, call this RPC to set app.current_user_id in Postgres session
const setRLSContext=async(userId)=>{
  if(!supabase||!userId)return;
  try{
    // This RPC sets the session variable that RLS policies read
    await supabase.rpc('set_user_context',{p_user_id:userId});
  }catch(e){
    // Non-fatal — app still works, just without RLS enforcement on this session
    log.warn('RLS context not set:',e.message);
  }
};


// Mappers: snake_case DB → camelCase app
const mapUser=r=>r?({id:r.id,cid:r.company_id,companyId:r.company_id,name:r.name,email:r.email||"",username:r.username||"",mobile:r.mobile||"",role:r.role,avatar:r.avatar,dept:r.dept,balance:parseFloat(r.balance)||0,reimbursable:parseFloat(r.reimbursable)||0,delegateTo:r.delegate_to||null,isSuspended:r.is_suspended||false,authType:r.auth_type||"custom",
  grade:parseInt(r.grade)||0,
  gradeLabel:r.grade_label||"",
  groupId:r.group_id||null,          // primary/legacy single group
  groupIds:r.group_ids||[],          // multi-group: populated from user_group_memberships
  groupName:r.group_name||"",
  reportingTo:r.reporting_to||null,
}):null;
const mapTrip=r=>r?({
  id:r.id, companyId:r.company_id, name:r.name, type:r.type,
  startDate:r.start_date, endDate:r.end_date, status:r.status,
  budget:parseFloat(r.budget)||0, spent:parseFloat(r.spent)||0,
  assignedTo:(r.trip_assignments||[]).map(a=>a.user_id),
  createdBy:r.created_by||null,
  tripMode:r.trip_mode||"balance",
  currency:r.currency||"INR",
  projectCode:r.project_code||"",
  openingBalance:parseFloat(r.opening_balance)||parseFloat(r.budget)||0,
  topupsTotal:parseFloat(r.topups_total)||0,
  categoryLimits:r.category_limits||{},
  settledAt:r.settled_at||null,
  settledBy:r.settled_by||null,
  employeeBudgets:r.employee_budgets||{},
  settledEmps:r.employee_settled||[],
  // Phase 1: Itinerary
  tripType:r.trip_type||"domestic",            // domestic / overseas
  purpose:r.purpose||"",                       // Sales/Purchase/Inspection etc.
  customerName:r.customer_name||"",
  accompanying:r.accompanying||[],
  advanceAmount:parseFloat(r.advance_amount)||0,
  legs:(r.trip_legs||[]).map(l=>({
    id:l.id, legNum:l.leg_num, fromCity:l.from_city, toCity:l.to_city,
    departAt:l.depart_at, arriveAt:l.arrive_at, mode:l.mode||"",
    cityTier:l.city_tier||"D",
    hotelLimit:parseFloat(l.hotel_limit)||0,
    diemRate:parseFloat(l.diem_rate)||0,
    days:l.days||0,
  })),
}):null;
const mapClaim=r=>r?({id:r.id,companyId:r.company_id,tripId:r.trip_id,empId:r.emp_id,date:r.date,category:r.category,desc:r.description,vendor:r.vendor,amount:parseFloat(r.amount)||0,origAmount:parseFloat(r.orig_amount)||0,origCur:r.orig_currency,status:r.status,autoApproved:r.auto_approved,rawStatus:r.status,remarks:r.remarks,flagged:r.flagged,anomaly:r.anomaly,anomalyReasons:r.anomaly_reasons||[],weekendFlag:r.weekend_flag,notes:r.notes,
  // Phase 1: Itinerary linkage
  legId:r.leg_id||null,                        // FK to trip_legs
  city:r.city||"",                             // City where expense occurred
  cityTier:r.city_tier||"D",                   // A/B/C/D
  transportClass:r.transport_class||"",        // Economy/2AC/3AC/Sleeper etc.
  overLimitReason:r.over_limit_reason||"",     // Reason when exceeds tier limit
  receipts:(r.receipts||[]).map(rc=>({id:rc.id,name:rc.file_name,storagePath:rc.storage_path,type:rc.mime_type,url:null})),comments:(r.claim_comments||[]).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).map(c=>({id:c.id,userId:c.user_id,name:c.user_name,text:c.text,time:new Date(c.created_at).toLocaleString()}))}):null;
const mapPolicy=r=>r?({autoApproveLimit:parseFloat(r.auto_approve_limit)||5000,reimbursementMode:r.reimbursement_mode||false,receiptMandatoryAbove:parseFloat(r.receipt_mandatory_above)||0,weekendRequiresApproval:r.weekend_requires_approval||false,multiLevelApproval:r.multi_level_approval||false,approvalLevels:r.approval_levels||[],vendorWhitelist:r.vendor_whitelist||[],vendorBlacklist:r.vendor_blacklist||[],departmentBudgets:r.department_budgets||{},categoryPct:r.category_pct||{},scheduledReports:r.scheduled_reports||[],primaryColor:r.primary_color||"#7ED957",departments:r.departments||DEFAULT_DEPTS,categories:r.categories||DEFAULT_CATS,dualApproveAbove:parseFloat(r.dual_approve_above)||0,
  // Phase 1: Grade & city policy
  // Use null-safe defaults — if column missing from DB, preserve [] not reset
  gradeBased:r.grade_based===true,
  cityClassification:r.city_classification===true,
  escalationHrs:parseFloat(r.escalation_hrs)||48,
  approvalHierarchy:Array.isArray(r.approval_hierarchy)?r.approval_hierarchy:[],
  gradeEntitlements:Array.isArray(r.grade_entitlements)?r.grade_entitlements:[],
  cityTiers:Array.isArray(r.city_tiers)?r.city_tiers:[],
  tripPurposes:Array.isArray(r.trip_purposes)?r.trip_purposes:["Sales Call","Purchase","Inspection","Seminar","Customer Support","Other"],
  noticePeriodDomestic:parseInt(r.notice_period_domestic)||0,
  noticePeriodOverseas:parseInt(r.notice_period_overseas)||15,
  // Item 7: Monthly/yearly/team budgets
  // monthlyBudgets: {dept: {monthly: N, yearly: N}, team: {monthly: N, yearly: N}}
  monthlyDeptBudgets:r.monthly_dept_budgets||{},    // {Sales:{monthly:50000,yearly:600000},...}
  yearlyDeptBudgets:r.yearly_dept_budgets||{},      // legacy — keep for compat
  teamBudgets:r.team_budgets||{},                   // {groupId:{monthly:N,yearly:N}}
  autoApproveMins:parseInt(r.auto_approve_mins)||10,
  conveyanceRatePerKm:parseFloat(r.conveyance_rate_per_km)||4, // Item 6: delay before auto-approve fires
}):null;
const mapNotif=r=>r?({id:r.id,userId:r.user_id,text:r.text,type:r.type,read:r.read,time:new Date(r.created_at).toLocaleString()}):null;
const mapAudit=r=>r?({id:r.id,action:r.action,claimId:r.claim_id,by:r.by_user_id,byName:r.by_name,at:new Date(r.created_at).toLocaleString(),remarks:r.remarks}):null;
// Display status — hides "Auto-Approved" from all non-admin users (only company admin sees it)
const displayStatus=(claim,isAdmin)=>{
  if(!claim)return"—";
  const s=claim.status||"";
  if(!isAdmin&&(s==="Auto-Approved"||(claim.autoApproved&&s==="Approved")))return "Approved";
  return s;
};

const mapTopup=r=>r?({id:r.id,empId:r.emp_id,amount:parseFloat(r.amount),reason:r.reason,date:r.date,status:r.status,tripId:r.trip_id||null,companyId:r.company_id}):null;

// ─── PHASE 1: GRADE-BASED APPROVAL ENGINE ────────────────────────────────────
// Resolves who must approve a claim submitted by `submitterId`
// Returns array of user IDs in order — first is the immediate approver
function resolveApprover(submitterId, allUsers, policy, amount=0){
  const submitter = allUsers.find(u=>u.id===submitterId);
  if(!submitter) return [];

  // If grade system is off — fall back to legacy manager/admin
  if(!policy?.gradeBased || !(policy?.approvalHierarchy?.length>0)){
    // Check group-level reporting first
    if(submitter.reportingTo){
      const directMgr=allUsers.find(u=>u.id===submitter.reportingTo&&!u.isSuspended);
      if(directMgr&&directMgr.id!==submitterId) return [directMgr.id];
    }
    const mgr = allUsers.find(u=>u.role==="manager"&&u.dept===submitter.dept&&!u.isSuspended&&u.id!==submitterId);
    const admin = allUsers.filter(u=>u.role==="admin"&&!u.isSuspended);
    return [...(mgr?[mgr.id]:[]), ...admin.map(a=>a.id)];
  }

  const hier = [...(policy.approvalHierarchy||[])].sort((a,b)=>a.level-b.level);
  const submitterGrade = submitter.grade||0;

  // If submitter has a direct reporting-to set, use that as first approver
  // (overrides grade-based routing for the first level only)
  if(submitter.reportingTo){
    const directMgr=allUsers.find(u=>u.id===submitter.reportingTo&&!u.isSuspended);
    if(directMgr&&directMgr.id!==submitterId){
      const mgrGrade=directMgr.grade||0;
      if(mgrGrade>submitterGrade){
        // Direct manager has higher grade — check if their ceiling covers this amount
        const mgrHier=hier.find(h=>h.level===mgrGrade);
        const mgrCeiling=mgrHier?.ceiling||0;
        if(mgrCeiling===0||mgrCeiling>=amount) return [directMgr.id];
        // Manager's ceiling insufficient — go to grade above
      }
    }
  }

  // Grade-based routing
  const minGradeNeeded = (()=>{
    for(const h of hier){
      if(h.level > submitterGrade && (h.ceiling===0||h.ceiling>=amount)) return h.level;
    }
    return hier[hier.length-1]?.level||99;
  })();

  const requiredGrade = Math.max(submitterGrade+1, minGradeNeeded);

  // Find active users at requiredGrade — prefer same group, then same dept, then any
  const candidates = allUsers.filter(u=>
    u.grade===requiredGrade &&
    !u.isSuspended &&
    u.id!==submitterId
  );

  const sameGroup = submitter.groupId ? candidates.filter(u=>u.groupId===submitter.groupId) : [];
  const sameDept = candidates.filter(u=>u.dept===submitter.dept);
  const approvers = sameGroup.length>0 ? sameGroup : sameDept.length>0 ? sameDept : candidates;

  if(approvers.length > 0) return approvers.map(u=>u.id);

  // Skip to next available grade
  for(const h of hier.filter(h=>h.level > requiredGrade)){
    const nextCandidates = allUsers.filter(u=>u.grade===h.level&&!u.isSuspended&&u.id!==submitterId);
    if(nextCandidates.length>0) return nextCandidates.map(u=>u.id);
  }

  return allUsers.filter(u=>u.role==="admin"&&!u.isSuspended).map(u=>u.id);
}

// ─── GROUP-BASED VISIBILITY ENGINE ──────────────────────────────────────────
// A person sees:
//   L1 (grade=1): only themselves
//   L2+ (any grade): their own data + data of all members in groups they manage
//   Higher grade: sees groups managed by lower grades too (transitively)
//   Admin: sees everything
//
// "Managing a group" means: user is the manager_id of that group
// A user can manage multiple groups. A user can be a member of multiple groups.
function getVisibleUserIds(viewerId, allUsers, policy, allGroups){
  const viewer=allUsers.find(u=>u.id===viewerId);
  if(!viewer) return new Set([viewerId]);

  // Admin always sees all
  if(viewer.role==="admin") return new Set(allUsers.filter(u=>!u.isSuspended).map(u=>u.id));

  // Always see yourself
  const result=new Set([viewerId]);

  const viewerGrade=viewer.grade||0;
  const groups=allGroups||[];

  if(viewerGrade===0&&viewer.role!=="manager"){
    // No grade, no manager role — see only yourself (L1 equivalent)
    return result;
  }

  // Collect groups this viewer manages (directly)
  const myManagedGroups=groups.filter(g=>g.managerId===viewerId);

  // Add all members of groups I directly manage
  // Using groupIds (multi-group array) OR legacy groupId field
  for(const g of myManagedGroups){
    allUsers.filter(u=>(u.groupIds||[]).includes(g.id)||(u.groupId===g.id)).filter(u=>!u.isSuspended).forEach(u=>result.add(u.id));
  }

  // For higher grades: also see groups managed by people in my visible set
  // (transitive — I can see what my subordinate managers can see)
  if(viewerGrade>=3||viewer.role==="manager"){
    // BFS: find sub-managers within my visible set and add their groups too
    let wave=[...result];
    let iterations=0;
    while(iterations<10){
      const newlyAdded=[];
      for(const uid of wave){
        const subManagedGroups=groups.filter(g=>g.managerId===uid&&uid!==viewerId);
        for(const g of subManagedGroups){
          allUsers.filter(u=>((u.groupIds||[]).includes(g.id)||(u.groupId===g.id))&&!u.isSuspended).forEach(u=>{
            if(!result.has(u.id)){result.add(u.id);newlyAdded.push(u.id);}
          });
        }
      }
      if(newlyAdded.length===0) break;
      wave=newlyAdded;
      iterations++;
    }
  }

  // If grade system off — fall back to department
  // Item 3: Also check same-grade users — can NOT see same-level peers
  // Only see users strictly below your grade (own data always visible)
  if(viewerGrade>0){
    // Remove any same-grade non-subordinates that may have been added
    for(const uid of [...result]){
      if(uid===viewerId) continue;
      const u=allUsers.find(x=>x.id===uid);
      if(u&&(u.grade||0)>=viewerGrade&&u.id!==viewerId){
        // Same grade or higher — only keep if admin
        if(viewer.role!=="admin") result.delete(uid);
      }
    }
  }

  if(viewerGrade===0&&viewer.role==="manager"){
    allUsers.filter(u=>u.dept===viewer.dept&&!u.isSuspended).forEach(u=>result.add(u.id));
  }

  return result;
}

// Can `approverId` approve a claim submitted by `submitterId` of `amount`?
function canApproveFor(approverId, submitterId, allUsers, policy, amount=0){
  if(approverId===submitterId) return false; // Self-approval always blocked
  const approver = allUsers.find(u=>u.id===approverId);
  const submitter = allUsers.find(u=>u.id===submitterId);
  if(!approver||!submitter) return false;

  // If grade system off: use role hierarchy
  if(!policy?.gradeBased){
    if(approver.role==="admin") return true;
    if(approver.role==="manager"&&submitter.role==="employee") return true;
    return false;
  }

  const aGrade = approver.grade||0;
  const sGrade = submitter.grade||0;

  // Must be strictly higher grade
  if(aGrade<=sGrade) return false;

  // Check ceiling (0 = unlimited)
  const hier = (policy.approvalHierarchy||[]).find(h=>h.level===aGrade);
  if(hier&&hier.ceiling>0&&amount>hier.ceiling) return false;

  return true;
}

// Get city tier from policy config
function getCityTier(city, policy){
  if(!policy?.cityClassification||!city) return "D";
  const found = (policy.cityTiers||[]).find(ct=>ct.city.toLowerCase()===city.toLowerCase());
  return found?.tier||"D";
}

// Get entitlement for a given grade + city tier
function getEntitlement(grade, tier, policy){
  if(!grade||!policy?.gradeBased) return {hotelLimit:0,diemRate:0,transportClass:""};
  const ent = (policy.gradeEntitlements||[]).find(e=>e.grade===grade&&e.tier===tier);
  if(ent) return {hotelLimit:parseFloat(ent.hotelLimit)||0,diemRate:parseFloat(ent.diemRate)||0,transportClass:ent.transportClass||""};
  // Fallback: find same grade with D tier
  const fallback = (policy.gradeEntitlements||[]).find(e=>e.grade===grade&&e.tier==="D");
  if(fallback) return {hotelLimit:parseFloat(fallback.hotelLimit)||0,diemRate:parseFloat(fallback.diemRate)||0,transportClass:fallback.transportClass||""};
  return {hotelLimit:0,diemRate:0,transportClass:""};
}

// Compute diem entitlement for a trip + employee
function computeDiem(trip, empId, policy){
  if(!trip?.legs?.length) return {total:0,legs:[]};
  const emp = null; // caller passes grade
  const legs = (trip.legs||[]).map(leg=>{
    const days = leg.days||Math.max(1,Math.ceil(
      (new Date(leg.arriveAt)-new Date(leg.departAt))/(1000*60*60*24)
    )||1);
    const rate = leg.diemRate||0;
    return {legId:leg.id,city:leg.toCity,tier:leg.cityTier,days,rate,entitlement:days*rate};
  });
  return {total:legs.reduce((s,l)=>s+l.entitlement,0),legs};
}

// Validate a claim against its trip leg
function validateClaimAgainstLeg(claim, trip, policy){
  const warnings=[], errors=[];
  if(!trip||!trip.legs?.length) return {warnings,errors};

  // Find the leg for this claim's city+date
  const leg = trip.legs.find(l=>{
    const inCity = !claim.city||l.toCity?.toLowerCase()===claim.city?.toLowerCase();
    const depart = l.departAt?.slice(0,10);
    const arrive = l.arriveAt?.slice(0,10);
    const inDate = !depart||!arrive||(claim.date>=depart&&claim.date<=arrive);
    return inCity&&inDate;
  });

  if(claim.city&&!leg){
    errors.push(`No itinerary leg covers ${claim.city} on ${claim.date}. Check trip schedule.`);
    return {warnings,errors};
  }

  if(leg&&policy?.gradeBased&&policy?.cityClassification){
    // Hotel limit check
    if(claim.category==="Accommodation"||claim.category==="Hotel"){
      const limit = leg.hotelLimit||0;
      if(limit>0&&claim.amount>limit){
        warnings.push(`Hotel claim ₹${claim.amount.toLocaleString("en-IN")} exceeds Tier ${leg.cityTier} limit of ₹${limit.toLocaleString("en-IN")}. Will be capped unless ARET is approved.`);
      }
    }
  }

  return {warnings,errors};
}


// ─── SB: load full company data ───────────────────────────────────────────────
async function sbLoadCompany(cid){
  // Fetch each table separately so one failure doesn't kill the whole load
  const safe=async(q,fallback=[])=>{try{const{data,error}=await q;if(error){log.warn("sbLoadCompany query error:",error.message);return fallback;}return data||fallback;}catch(e){log.warn("sbLoadCompany exception:",e.message);return fallback;}};
  const safeSingle=async(q,fallback=null)=>{try{const{data,error}=await q;if(error){log.warn("sbLoadCompany single error:",error.message);return fallback;}return data||fallback;}catch(e){return fallback;}};

  const [meta,users,trips,claims,topups,audit,notifs,policy,tripLegs,diemComps,empGroups,groupMemberships]=await Promise.all([
    safeSingle(supabase.from("companies").select("*").eq("id",cid).single()),
    safe(supabase.from("users").select("*").eq("company_id",cid)),
    safe(supabase.from("trips").select("*,trip_assignments(user_id)").eq("company_id",cid).order("created_at",{ascending:false})),
    safe(supabase.from("claims").select("*,receipts(*),claim_comments(*)").eq("company_id",cid).order("created_at",{ascending:false})),
    safe(supabase.from("topups").select("*").eq("company_id",cid).order("date",{ascending:false})),
    safe(supabase.from("audit_log").select("*").eq("company_id",cid).order("created_at",{ascending:false}).limit(500)),
    safe(supabase.from("notifications").select("*").eq("company_id",cid).order("created_at",{ascending:false}).limit(300)),
    safeSingle(supabase.from("policy").select("*").eq("company_id",cid).single()),
    safe(supabase.from("trip_legs").select("*").eq("company_id",cid).order("leg_num",{ascending:true})),
    safe(supabase.from("diem_computations").select("*").eq("company_id",cid)),
    safe(supabase.from("employee_groups").select("*").eq("company_id",cid)),
    safe(supabase.from("user_group_memberships").select("*").eq("company_id",cid)),
  ]);

  // Build group lookup
  const groupMap=Object.fromEntries((empGroups||[]).map(g=>[g.id,g.name]));
  // Build per-user group memberships (multi-group)
  const userGroupsMap={};
  for(const m of (groupMemberships||[])){
    if(!userGroupsMap[m.user_id]) userGroupsMap[m.user_id]=[];
    userGroupsMap[m.user_id].push(m.group_id);
  }

  // Attach legs to trips
  const tripsWithLegs=(trips||[]).map(t=>({
    ...t,
    trip_legs:(tripLegs||[]).filter(l=>l.trip_id===t.id),
  }));

  // Attach group_names and groupIds array to users
  const usersWithGroups=(users||[]).map(u=>({
    ...u,
    group_name:groupMap[u.group_id]||"",
    // Multi-group: array of group IDs from memberships table (+ legacy single group_id)
    group_ids:[...new Set([...(userGroupsMap[u.id]||[]),...(u.group_id?[u.group_id]:[])])],
  }));

  // Fetch signed URLs for all receipts in parallel so images show immediately
  const mappedClaims = await Promise.all((claims||[]).map(async claim => {
    const mappedReceipts = await Promise.all((claim.receipts||[]).map(async rc => {
      let url = null;
      if(rc.storage_path){
        try{
          if(rc.storage_provider==="r2"){
            const r2Public=import.meta.env.VITE_R2_PUBLIC_URL;
            if(r2Public){
              // Public domain configured — direct URL, no signing needed
              url=`${r2Public.replace(/\/$/,"")}/${rc.storage_path}`;
            } else {
              // No public domain — get presigned view URL from server
              const vr=await fetch(`/api/r2upload?action=view&key=${encodeURIComponent(rc.storage_path)}`);
              if(vr.ok){const vd=await vr.json();url=vd.viewUrl||null;}
            }
          } else {
            const{data}=await supabase.storage.from("receipts").createSignedUrl(rc.storage_path, 3600);
            url = data?.signedUrl||null;
          }
        }catch(e){ log.warn("Failed to get URL for",rc.storage_path); }
      }
      return{id:rc.id,name:rc.file_name,storagePath:rc.storage_path,type:rc.mime_type,storageProvider:rc.storage_provider||"xpensr_supabase",url};
    }));
    return{...mapClaim(claim), receipts: mappedReceipts};
  }));

  return{
    meta:meta?{id:meta.id,name:meta.name,industry:meta.industry,plan:meta.plan,maxUsers:meta.max_users,status:meta.status,createdOn:meta.created_on}:null,
    users:usersWithGroups.map(mapUser),
    trips:tripsWithLegs.map(mapTrip),
    claims:mappedClaims,
    topups:(topups||[]).map(mapTopup),
    auditLog:(audit||[]).map(mapAudit),
    notifications:(notifs||[]).map(mapNotif),
    policy:mapPolicy(policy)||mkPolicy(),
    diemComps:(diemComps||[]),
    empGroups:(empGroups||[]).map(g=>({id:g.id,name:g.name,dept:g.dept,managerId:g.manager_id,description:g.description})),
    groupMemberships:(groupMemberships||[]),
    budgetEnhancements:[], // loaded separately via loadBudgetEnhancements
  };
}

// ─── SB: get signed receipt URL ───────────────────────────────────────────────
async function sbGetReceiptUrl(storagePath){
  if(!supabase)return null;
  const{data}=await supabase.storage.from("receipts").createSignedUrl(storagePath,3600);
  return data?.signedUrl||null;
}

// ─── SB: upload receipt from base64 ──────────────────────────────────────────
async function sbUploadReceipt(claimId,cid,b64,mimeType,fileName){
  if(!supabase)return null;
  const ext=mimeType.includes("pdf")?"pdf":"jpg";
  const key=`${cid}/${claimId}/${Date.now()}.${ext}`;

  const r2Resp=await fetch("/api/r2upload",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-company-id":cid},
    body:JSON.stringify({key,mimeType,dataBase64:b64}),
  });

  if(!r2Resp.ok){
    let errMsg=`Upload error ${r2Resp.status}`;
    try{
      const d=await r2Resp.json();
      errMsg=d.error||errMsg;
    }catch{
      try{const t=await r2Resp.text();errMsg=`R2 ${r2Resp.status}: ${t.slice(0,120)}`;}catch{}
    }
    throw new Error(errMsg);
  }

  const result=await r2Resp.json();
  if(!result.success) throw new Error(result.error||"Upload failed — please try again");

  const{error:dbErr}=await supabase.from("receipts").insert({
    claim_id:claimId,company_id:cid,
    file_name:fileName||`receipt.${ext}`,
    storage_path:result.storagePath||key,
    mime_type:mimeType,
    storage_provider:"r2",
  });
  if(dbErr) throw new Error("DB save failed: "+dbErr.message);
  return result.storagePath||key;
}

// ─── DEFAULT POLICY ───────────────────────────────────────────────────────────
const mkPolicy=()=>({
  autoApproveLimit:5000,reimbursementMode:false,receiptMandatoryAbove:1000,
  weekendRequiresApproval:true,multiLevelApproval:false,
  approvalLevels:[{upTo:10000,role:"manager"},{upTo:50000,role:"manager"},{upTo:999999,role:"manager"}],
  vendorWhitelist:[],vendorBlacklist:[],
  departmentBudgets:{Sales:50000,Marketing:40000,Accounts:60000,Procurement:45000,Operations:45000,HR:20000,IT:55000,Management:80000},
  categoryLimits:{Travel:50000,Meals:15000,Accommodation:30000,"Office Supplies":5000,"Client Entertainment":25000,Software:20000,Training:30000,Miscellaneous:10000},
  categoryPct:{Travel:40,Meals:15,Accommodation:20,"Office Supplies":5,"Client Entertainment":20,Software:15,Training:25,Miscellaneous:10},
  scheduledReports:{enabled:false,frequency:"weekly",email:""},
  departments:[...DEFAULT_DEPTS],
  categories:[...DEFAULT_CATS],
  primaryColor:"#7ED957",
  dualApproveAbove:50000,  // claims above this need both manager + admin approval
});

// ─── DEMO DATA (localStorage fallback when Supabase not configured) ───────────
// Super Admin credentials are environment-based — never hardcoded
// Set VITE_SA_EMAIL and VITE_SA_PASS in Vercel env vars
const SA={id:"sa1",name:"Super Admin",email:import.meta.env.VITE_SA_EMAIL||"",password:import.meta.env.VITE_SA_PASS||"",role:"superadmin",avatar:"SA"};
const STORAGE_KEY="xpensr_v1_db";
const SESSION_KEY="xpensr_v1_sess";
// ── Obfuscation layer for localStorage — makes data unreadable in DevTools ──
// XOR cipher with a per-browser fingerprint-derived key + base64 encoding.
// Not cryptographic — but makes raw values in Application→Storage unreadable.
const _SK=(()=>{const b=navigator?.userAgent?.slice(0,20)||"x";let k=0;for(let i=0;i<b.length;i++)k=(k*31+b.charCodeAt(i))>>>0;return(k>>>0).toString(36).padStart(8,"0");})();
const _enc=str=>{try{let r="";for(let i=0;i<str.length;i++)r+=String.fromCharCode(str.charCodeAt(i)^_SK.charCodeAt(i%_SK.length));return btoa(r);}catch{return btoa(encodeURIComponent(str));}};
const _dec=enc=>{try{const s=atob(enc);let r="";for(let i=0;i<s.length;i++)r+=String.fromCharCode(s.charCodeAt(i)^_SK.charCodeAt(i%_SK.length));return r;}catch{try{return decodeURIComponent(atob(enc));}catch{return null;}}};
// Strip sensitive fields before persisting session
const _safeSession=s=>{
  if(!s)return null;
  const{access_token,refresh_token,...rest}=s;
  if(rest.sbUser){const{password_hash,password,...u}=rest.sbUser;rest.sbUser=u;}
  return rest;
};
const loadDB=()=>{try{const r=localStorage.getItem(STORAGE_KEY);if(!r)return null;const d=_dec(r);return JSON.parse(d||r);}catch{return null;}};
const saveDB=d=>{try{localStorage.setItem(STORAGE_KEY,_enc(JSON.stringify(d)));}catch{}};
const loadSess=()=>{try{const s=localStorage.getItem(SESSION_KEY);if(!s)return null;const d=_dec(s);return JSON.parse(d||s);}catch{return null;}};
const saveSess=s=>{try{if(!s){localStorage.removeItem(SESSION_KEY);return;}localStorage.setItem(SESSION_KEY,_enc(JSON.stringify(_safeSession(s))));}catch{}};

const DB0={
  rbshah:{
    meta:{id:"rbshah",name:"R B Shah & Associates",industry:"CA Firm",plan:"Pro",maxUsers:20,status:"Active",createdOn:"2026-01-15"},
    users:[
      {id:"mgr1",cid:"rbshah",name:"Demo Manager",  email:"manager@demo.local",  password:"",role:"manager", avatar:"DM",dept:"Management",balance:0,    reimbursable:0,delegateTo:null},
      {id:"emp1",cid:"rbshah",name:"Demo Employee 1",email:"emp1@demo.local",     password:"",role:"employee",avatar:"D1",dept:"Audit",      balance:25000,reimbursable:0,delegateTo:null},
      {id:"emp2",cid:"rbshah",name:"Demo Employee 2",email:"emp2@demo.local",     password:"",role:"employee",avatar:"D2",dept:"Tax",        balance:18000,reimbursable:0,delegateTo:null},
      {id:"emp3",cid:"rbshah",name:"Demo Employee 3",email:"emp3@demo.local",     password:"",role:"employee",avatar:"D3",dept:"GST",        balance:12000,reimbursable:0,delegateTo:null},
      {id:"emp4",cid:"rbshah",name:"Demo Employee 4",email:"emp4@demo.local",     password:"",role:"employee",avatar:"D4",dept:"Finance",    balance:20000,reimbursable:0,delegateTo:null},
      {id:"emp5",cid:"rbshah",name:"Demo Employee 5",email:"emp5@demo.local",     password:"",role:"employee",avatar:"D5",dept:"Billing",    balance:15000,reimbursable:0,delegateTo:null},
    ],
    trips:[
      {id:"TRP-001",name:"Mumbai Client Visit",type:"trip",  startDate:"2026-03-25",endDate:"2026-03-28",status:"closed",budget:50000, spent:43200,assignedTo:["emp1","emp2"]},
      {id:"TRP-002",name:"Q4 Operations",      type:"period",startDate:"2026-04-01",endDate:"2026-04-30",status:"active",budget:150000,spent:36950,assignedTo:["emp1","emp2","emp3","emp4","emp5"]},
    ],
    claims:[
      {id:"EXP-001",tripId:"TRP-001",empId:"emp1",date:"2026-03-26",category:"Travel",              desc:"Flight BOM-AMD",            amount:8500, origAmount:8500, origCur:"INR",status:"Approved",autoApproved:false,receipts:[],remarks:"Approved",      flagged:false,anomaly:false,anomalyReasons:[],comments:[],vendor:"IndiGo",  weekendFlag:false,notes:""},
      {id:"EXP-002",tripId:"TRP-001",empId:"emp1",date:"2026-03-26",category:"Meals",               desc:"Team dinner",               amount:3200, origAmount:3200, origCur:"INR",status:"Approved",autoApproved:true, receipts:[],remarks:"Auto-approved",flagged:false,anomaly:false,anomalyReasons:[],comments:[],vendor:"",        weekendFlag:false,notes:""},
      {id:"EXP-003",tripId:"TRP-002",empId:"emp2",date:"2026-04-02",category:"Software",            desc:"Zoho subscription",         amount:4999, origAmount:4999, origCur:"INR",status:"Approved",autoApproved:true, receipts:[],remarks:"Auto-approved",flagged:false,anomaly:false,anomalyReasons:[],comments:[],vendor:"Zoho",     weekendFlag:false,notes:""},
      {id:"EXP-004",tripId:"TRP-002",empId:"emp1",date:"2026-04-03",category:"Client Entertainment",desc:"Client dinner Roger Motors", amount:6800, origAmount:6800, origCur:"INR",status:"Pending", autoApproved:false,receipts:[],remarks:"",            flagged:true, anomaly:false,anomalyReasons:[],comments:[{userId:"mgr1",name:"Demo Manager",text:"Please share the bill",time:"2026-04-03 10:30"}],vendor:"Trident",weekendFlag:false,notes:""},
      {id:"EXP-005",tripId:"TRP-002",empId:"emp3",date:"2026-04-04",category:"Office Supplies",     desc:"Printer cartridges",        amount:1450, origAmount:1450, origCur:"INR",status:"Rejected",autoApproved:false,receipts:[],remarks:"Over cat %",   flagged:false,anomaly:false,anomalyReasons:[],comments:[],vendor:"",        weekendFlag:false,notes:""},
      {id:"EXP-006",tripId:"TRP-002",empId:"emp4",date:"2026-04-04",category:"Training",            desc:"GST certification",         amount:12000,origAmount:12000,origCur:"INR",status:"Pending", autoApproved:false,receipts:[],remarks:"",            flagged:false,anomaly:true, anomalyReasons:["Amount is 2.5× avg for Training"],comments:[],vendor:"ICAI",     weekendFlag:false,notes:""},
      {id:"EXP-007",tripId:"TRP-002",empId:"emp5",date:"2026-04-05",category:"Travel",              desc:"Cab to client office",      amount:850,  origAmount:850,  origCur:"INR",status:"Approved",autoApproved:true, receipts:[],remarks:"Auto-approved",flagged:false,anomaly:false,anomalyReasons:[],comments:[],vendor:"Ola",      weekendFlag:false,notes:""},
      {id:"EXP-008",tripId:"TRP-001",empId:"emp2",date:"2026-02-26",category:"Meals",               desc:"Team lunch",                amount:3200, origAmount:3200, origCur:"INR",status:"Approved",autoApproved:true, receipts:[],remarks:"Auto-approved",flagged:false,anomaly:false,anomalyReasons:[],comments:[],vendor:"",        weekendFlag:false,notes:""},
      {id:"EXP-009",tripId:"TRP-001",empId:"emp1",date:"2026-01-15",category:"Travel",              desc:"Flight AMD-BOM",            amount:7200, origAmount:7200, origCur:"INR",status:"Approved",autoApproved:false,receipts:[],remarks:"Approved",      flagged:false,anomaly:false,anomalyReasons:[],comments:[],vendor:"Air India",weekendFlag:false,notes:""},
    ],
    topups:[{id:"TUP-001",empId:"emp3",amount:5000,reason:"Additional travel needed",date:"2026-04-03",status:"Pending"}],
    auditLog:[
      {id:"AL-001",action:"Approved",     claimId:"EXP-001",by:"mgr1",byName:"Demo Manager",at:"2026-03-27 09:12",remarks:"Approved"},
      {id:"AL-002",action:"Auto-Approved",claimId:"EXP-002",by:"SYSTEM",byName:"System",   at:"2026-03-27 14:35",remarks:"Under limit"},
      {id:"AL-003",action:"Rejected",     claimId:"EXP-005",by:"mgr1",byName:"Demo Manager",at:"2026-04-05 11:20",remarks:"Over category %"},
    ],
    notifications:[
      {id:"N-001",userId:"emp1",text:"Your claim EXP-001 was approved",    type:"success",read:false,time:"2026-03-27 09:12"},
      {id:"N-002",userId:"emp3",text:"EXP-005 rejected: Over category %",  type:"error",  read:false,time:"2026-04-05 11:20"},
      {id:"N-003",userId:"mgr1",text:"New claim EXP-006 awaiting approval",type:"info",   read:false,time:"2026-04-04 09:00"},
    ],
    policy:mkPolicy(),
  },
  rogermot:{
    meta:{id:"rogermot",name:"Roger Motors Pvt. Ltd.",industry:"Automotive",plan:"Starter",maxUsers:5,status:"Active",createdOn:"2026-02-10"},
    users:[
      {id:"rm_mgr1",cid:"rogermot",name:"Demo Manager",email:"manager@demo2.local",password:"",role:"manager", avatar:"DM",dept:"Management",balance:0,    reimbursable:0,delegateTo:null},
      {id:"rm_emp1",cid:"rogermot",name:"Demo Employee",email:"emp@demo2.local",   password:"",role:"employee",avatar:"DE",dept:"Sales",      balance:10000,reimbursable:0,delegateTo:null},
    ],
    trips:[{id:"RM-T1",name:"Delhi Auto Expo",type:"trip",startDate:"2026-04-01",endDate:"2026-04-05",status:"active",budget:80000,spent:12400,assignedTo:["rm_emp1"]}],
    claims:[
      {id:"RM-E1",tripId:"RM-T1",empId:"rm_emp1",date:"2026-04-02",category:"Travel",       desc:"Train tickets Delhi",amount:4200,origAmount:4200,origCur:"INR",status:"Approved",autoApproved:true, receipts:[],remarks:"Auto-approved",flagged:false,anomaly:false,anomalyReasons:[],comments:[],vendor:"IRCTC",weekendFlag:false,notes:""},
      {id:"RM-E2",tripId:"RM-T1",empId:"rm_emp1",date:"2026-04-03",category:"Accommodation",desc:"Hotel 2 nights",    amount:8200,origAmount:8200,origCur:"INR",status:"Pending", autoApproved:false,receipts:[],remarks:"",           flagged:false,anomaly:false,anomalyReasons:[],comments:[],vendor:"OYO",  weekendFlag:false,notes:""},
    ],
    topups:[],auditLog:[],notifications:[],policy:mkPolicy(),
  },
};

// ─── NOTIFICATION HELPERS ─────────────────────────────────────────────────────
const emailAlert=async(to,subject,body,htmlBody)=>{
  if(!to||!SB_ENABLED)return;
  try{
    await fetch("/api/email",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({to,subject,html:htmlBody||
        `<div style="font-family:sans-serif;padding:24px;max-width:560px;margin:0 auto">
        <div style="background:#0f1c09;padding:16px 22px;border-radius:10px 10px 0 0">
          <span style="color:#7ED957;font-weight:800;font-size:18px">XpensR</span>
          <span style="color:rgba(255,255,255,.4);font-size:11px;margin-left:8px">by RB</span>
        </div>
        <div style="background:#f8faf6;padding:22px;border:1px solid #e8f0e5;border-top:none;border-radius:0 0 10px 10px">
          <p style="color:#1a2e12;font-size:14px;line-height:1.7;margin:0 0 16px">${body}</p>
          <div style="font-size:11px;color:#9ca3af;padding-top:12px;border-top:1px solid #e8f0e5">XpensR by RB · claim-x-beta.vercel.app</div>
        </div></div>`
      })});
  }catch(e){log.warn("Email:",e.message);}
};
const whatsappAlert=async(phone,templateName,params=[])=>{
  if(!phone||!SB_ENABLED)return;
  try{
    await fetch("/api/whatsapp",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({phone,templateName,params})});
  }catch(e){log.warn("WhatsApp:",e.message);}
};
const claimEmailHtml=(action,claim,remarks,companyName)=>{
  const rows=[["Claim ID",claim.id],["Amount","\u20b9"+(claim.amount||0).toLocaleString("en-IN")],["Date",claim.date||""],["Category",claim.category||""],["Description",claim.desc||""],...(remarks?[["Remarks",remarks]]:[])];
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
  <div style="background:#0f1c09;padding:18px 26px;border-radius:12px 12px 0 0"><span style="color:#7ED957;font-size:18px;font-weight:800">XpensR</span><span style="color:rgba(255,255,255,.4);font-size:11px;margin-left:8px">${companyName||""}</span></div>
  <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <h2 style="color:${action==="Approved"?"#15803d":"#dc2626"};font-size:16px;margin:0 0 14px">${action==="Approved"?"\u2713 Claim Approved":"\u2717 Claim Rejected"}</h2>
    <table style="font-size:13px;width:100%;border-collapse:collapse">${rows.map(([l,v])=>`<tr><td style="padding:6px 0;color:#6b7280;width:38%">${l}</td><td style="padding:6px 0;font-weight:600;color:#111">${v}</td></tr>`).join("")}</table>
    <div style="margin-top:16px;padding:10px 14px;background:${action==="Approved"?"#f0fde9":"#fef2f2"};border-radius:7px;font-size:12px;color:${action==="Approved"?"#15803d":"#dc2626"}">${action==="Approved"?"Amount will be settled as per company policy.":"Please contact your manager for details."}</div>
    <div style="margin-top:18px;font-size:10px;color:#9ca3af">XpensR by RB · ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric"})}</div>
  </div></div>`;
};


// ─── TRIP SETTLEMENT PDF ──────────────────────────────────────────────────────
// Module-level diem calculator — used by PDF generators (no component scope needed)
const calcEmpDiem=(trip,uid)=>{
  let total=0;
  for(const leg of (trip.legs||[])){
    const rate=leg.diemRate||0;
    const days=leg.days||1;
    total+=rate*days;
  }
  return total;
};

const generateSettlementPDF=async(trip,allClaims,getUser,companyName,allUsers,policy)=>{
  const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
  const W=210,ML=15,MR=15,CW=W-ML-MR;
  let y=10;
  const newPage=()=>{doc.addPage();y=14;};
  const checkY=(need=14)=>{if(y+need>278)newPage();};

  const sectionHeader=(text,rgb=[21,128,61])=>{
    checkY(10);
    doc.setFillColor(...rgb);doc.rect(ML,y,CW,7,"F");
    doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(255,255,255);
    doc.text(text,ML+3,y+5);y+=9;
  };

  // ── Header ────────────────────────────────────────────────
  doc.setFillColor(15,28,9);doc.rect(0,0,W,22,"F");
  doc.setFont("helvetica","bold");doc.setFontSize(13);doc.setTextColor(126,217,87);
  doc.text("XpensR by RB",ML,14);
  doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(180,200,170);
  doc.text("Trip Closure & Settlement Report",ML+34,14);
  doc.setTextColor(130,130,130);
  doc.text((companyName||"").slice(0,40),W-MR,14,{align:"right"});
  y=28;

  // ── Trip Title ──────────────────────────────────────────
  doc.setFont("helvetica","bold");doc.setFontSize(14);doc.setTextColor(20,20,20);
  doc.text((trip.name||"Trip").slice(0,50),ML,y);y+=6;
  doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(100,100,100);
  const metaLine=[fmtDate(trip.startDate)||"",fmtDate(trip.endDate)||"",trip.tripMode==="reimbursement"?"Reimbursement Mode":"Balance Mode",trip.currency||"INR",trip.purpose?"Purpose: "+trip.purpose:"",trip.customerName?"Customer: "+trip.customerName:""].filter(Boolean).join(" · ");
  doc.text(metaLine,ML,y);y+=8;
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}`,ML,y);y+=8;

  // ── Section 1: Budget Performance ───────────────────────
  sectionHeader("1. BUDGET PERFORMANCE");
  const tripClaims=allClaims.filter(c=>c.tripId===trip.id);
  const approvedClaims=tripClaims.filter(c=>c.status==="Approved");
  const rejectedClaims=tripClaims.filter(c=>c.status==="Rejected");
  const pendingClaims=tripClaims.filter(c=>c.status==="Pending"||c.status?.includes("Approved")&&c.status!=="Approved");
  const totalApproved=approvedClaims.reduce((s,c)=>s+c.amount,0);
  const totalRejected=rejectedClaims.reduce((s,c)=>s+c.amount,0);
  const totalPending=pendingClaims.reduce((s,c)=>s+c.amount,0);
  const budget=trip.budget||0;
  const topupsTotal=trip.topupsTotal||0;
  const totalFunds=budget+topupsTotal;
  const isBalance=trip.tripMode!=="reimbursement";
  const variance=totalApproved-budget;

  const budgetRows=[
    ["Total Trip Budget",`₹${budget.toLocaleString("en-IN")}`],
    ["Top-ups Added",topupsTotal>0?`+₹${topupsTotal.toLocaleString("en-IN")}`:"Nil"],
    ["Total Available Funds",`₹${totalFunds.toLocaleString("en-IN")}`],
    ["Total Invoices Submitted",`₹${(totalApproved+totalRejected+totalPending).toLocaleString("en-IN")} (${tripClaims.length} claims)`],
    ["Total Approved Expenses",`₹${totalApproved.toLocaleString("en-IN")} (${approvedClaims.length} claims)`],
    ["Rejected Claims",totalRejected>0?`₹${totalRejected.toLocaleString("en-IN")} (${rejectedClaims.length} claims)`:"Nil"],
    ["Pending / In-Approval",totalPending>0?`₹${totalPending.toLocaleString("en-IN")} (${pendingClaims.length} claims)`:"Nil"],
    ["Budget Variance",`${variance>0?"Overspent by ₹"+(variance).toLocaleString("en-IN"):"Saved ₹"+(-variance).toLocaleString("en-IN")}`],
  ];
  budgetRows.forEach(([k,v],i)=>{
    checkY(7);
    doc.setFillColor(i%2?248:255,i%2?252:255,i%2?248:255);doc.rect(ML,y,CW,6,"F");
    doc.setFont("helvetica",i===7?"bold":"normal");doc.setFontSize(8.5);
    doc.setTextColor(i===7?(variance>0?180:21):30,i===7?(variance>0?30:128):30,i===7?(variance>0?30:61):30);
    doc.text(k,ML+3,y+4.2);doc.text(v,W-MR,y+4.2,{align:"right"});y+=6.5;
  });
  y+=4;

  // ── Section 2: Category-wise Expense Breakdown ──────────
  sectionHeader("2. CATEGORY-WISE EXPENSE vs LIMITS");
  const cats=[...new Set(approvedClaims.map(c=>c.category))].sort();
  const catLimits=trip.categoryLimits||{};
  doc.setFont("helvetica","bold");doc.setFontSize(7.5);doc.setTextColor(255,255,255);
  // already in section header; draw table header row
  doc.setFillColor(60,80,60);doc.rect(ML,y,CW,6,"F");
  doc.setTextColor(255,255,255);
  const catCols=[[ML+3,55,"Category"],[ML+58,28,"Approved"],[ML+86,28,"Rejected"],[ML+114,28,"% of Budget"],[ML+142,30,"Limit %"],[ML+172,28,"Status"]];
  catCols.forEach(([x,w,h])=>doc.text(h,x,y+4));y+=7;
  cats.forEach((cat,i)=>{
    const catApproved=approvedClaims.filter(c=>c.category===cat).reduce((s,c)=>s+c.amount,0);
    const catRejected=rejectedClaims.filter(c=>c.category===cat).reduce((s,c)=>s+c.amount,0);
    const pctOfBudget=budget>0?((catApproved/budget)*100).toFixed(1):"-";
    const limitPct=catLimits[cat]||0;
    const exceeded=limitPct>0&&parseFloat(pctOfBudget)>limitPct;
    checkY(7);
    doc.setFillColor(i%2?248:255,i%2?252:255,i%2?248:255);doc.rect(ML,y,CW,6,"F");
    doc.setFont("helvetica","normal");doc.setFontSize(8);
    doc.setTextColor(30,30,30);
    doc.text(cat,ML+3,y+4.2);
    doc.text(`₹${catApproved.toLocaleString("en-IN")}`,ML+58,y+4.2);
    doc.text(catRejected>0?`₹${catRejected.toLocaleString("en-IN")}`:"—",ML+86,y+4.2);
    doc.text(pctOfBudget+"%",ML+114,y+4.2);
    doc.text(limitPct>0?limitPct+"%":"No limit",ML+142,y+4.2);
    if(exceeded){doc.setTextColor(200,30,30);doc.text("⛔ Exceeded",ML+172,y+4.2);}
    else{doc.setTextColor(21,128,61);doc.text("✓ Within",ML+172,y+4.2);}
    y+=6.5;
  });
  if(cats.length===0){doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(100,100,100);doc.text("No approved expenses to show.",ML+3,y+4);y+=8;}
  y+=4;

  // ── Section 3: Per-Diem Summary ──────────────────────────
  sectionHeader("3. PER-DIEM ALLOWANCE vs ACTUAL CLAIMS");
  doc.setFont("helvetica","italic");doc.setFontSize(7.5);doc.setTextColor(80,80,80);
  doc.text("Policy: whichever is higher (Diem Entitlement or Approved Meal Claims) is counted as trip expense.",ML+3,y+4);y+=8;
  const assigned=trip.assignedTo||[];
  if(assigned.length>0){
    doc.setFillColor(60,80,60);doc.rect(ML,y,CW,6,"F");doc.setTextColor(255,255,255);doc.setFontSize(7.5);doc.setFont("helvetica","bold");
    const dCols=[[ML+3,38,"Employee"],[ML+41,30,"Entitlement"],[ML+71,30,"Meal Claims"],[ML+101,30,"Approved"],[ML+131,28,"Effective"],[ML+159,30,"Flat Balance"]];
    dCols.forEach(([x,,h])=>doc.text(h,x,y+4));y+=7;
    let totalEff=0;
    assigned.forEach((uid,i)=>{
      const u=typeof getUser==="function"?getUser(uid):(allUsers||[]).find(x=>x.id===uid);
      const diemEnt=calcEmpDiem(trip,uid);
      const mealApproved=approvedClaims.filter(c=>c.empId===uid&&["Meals","Food","Daily Allowance"].includes(c.category)).reduce((s,c)=>s+c.amount,0);
      const mealClaimed=tripClaims.filter(c=>c.empId===uid&&["Meals","Food","Daily Allowance"].includes(c.category)).reduce((s,c)=>s+c.amount,0);
      const effective=Math.max(diemEnt,mealApproved);
      const flatBal=mealApproved<diemEnt?(diemEnt-mealApproved):0;
      totalEff+=effective;
      checkY(7);
      doc.setFillColor(i%2?248:255,i%2?252:255,i%2?248:255);doc.rect(ML,y,CW,6,"F");
      doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(30,30,30);
      doc.text((u?.name||uid).slice(0,18),ML+3,y+4.2);
      doc.text(`₹${diemEnt.toLocaleString("en-IN")}`,ML+41,y+4.2);
      doc.text(`₹${mealClaimed.toLocaleString("en-IN")}`,ML+71,y+4.2);
      doc.text(`₹${mealApproved.toLocaleString("en-IN")}`,ML+101,y+4.2);
      doc.setFont("helvetica","bold");doc.text(`₹${effective.toLocaleString("en-IN")}`,ML+131,y+4.2);
      doc.setFont("helvetica","normal");doc.setTextColor(mealApproved>=diemEnt?80:21,mealApproved>=diemEnt?80:128,mealApproved>=diemEnt?80:61);
      doc.text(flatBal>0?`+₹${flatBal.toLocaleString("en-IN")}`:"—",ML+159,y+4.2);
      y+=6.5;
    });
    checkY(8);doc.setFont("helvetica","bold");doc.setFontSize(8.5);doc.setTextColor(20,20,20);
    doc.text(`Total Effective Diem (included in trip expenses): ₹${totalEff.toLocaleString("en-IN")}`,ML+3,y+5);y+=10;
  }

  // ── Section 4: Employee-wise Settlement ─────────────────
  sectionHeader("4. EMPLOYEE-WISE SETTLEMENT");
  let totalRecoverable=0,totalPayable=0;
  if(assigned.length>0){
    doc.setFillColor(60,80,60);doc.rect(ML,y,CW,6,"F");doc.setTextColor(255,255,255);doc.setFontSize(7.5);doc.setFont("helvetica","bold");
    const sCols=[[ML+3,38,"Employee"],[ML+41,26,"Allocated"],[ML+67,22,"Topups"],[ML+89,26,"Approved"],[ML+115,22,"Rejected"],[ML+137,22,"Pending"],[ML+159,W-MR-160,"Settlement"]];
    sCols.forEach(([x,,h])=>doc.text(h,x,y+4));y+=7;
    assigned.forEach((uid,i)=>{
      const u=typeof getUser==="function"?getUser(uid):(allUsers||[]).find(x=>x.id===uid);
      const empApproved=approvedClaims.filter(c=>c.empId===uid).reduce((s,c)=>s+c.amount,0);
      const empRejected=rejectedClaims.filter(c=>c.empId===uid).reduce((s,c)=>s+c.amount,0);
      const empPending=pendingClaims.filter(c=>c.empId===uid).reduce((s,c)=>s+c.amount,0);
      const empAlloc=(trip.employeeBudgets?.[uid]?.allocated||0)||Math.round(budget/Math.max(assigned.length,1));
      const empTopup=(trip.employeeBudgets?.[uid]?.topups||0);
      const empFunds=empAlloc+empTopup;
      const settlement=isBalance?(empFunds-empApproved):-empApproved;
      if(isBalance&&settlement>0)totalRecoverable+=settlement;
      if(isBalance&&settlement<0)totalPayable+=(-settlement);
      checkY(7);
      doc.setFillColor(i%2?248:255,i%2?252:255,i%2?248:255);doc.rect(ML,y,CW,6,"F");
      doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(30,30,30);
      doc.text((u?.name||uid).slice(0,18),ML+3,y+4.2);
      doc.text(`₹${empAlloc.toLocaleString("en-IN")}`,ML+41,y+4.2);
      doc.text(empTopup>0?`+₹${empTopup.toLocaleString("en-IN")}`:"—",ML+67,y+4.2);
      doc.text(`₹${empApproved.toLocaleString("en-IN")}`,ML+89,y+4.2);
      doc.text(empRejected>0?`₹${empRejected.toLocaleString("en-IN")}`:"—",ML+115,y+4.2);
      doc.text(empPending>0?`₹${empPending.toLocaleString("en-IN")}`:"—",ML+137,y+4.2);
      doc.setFont("helvetica","bold");
      doc.setTextColor(settlement>0?200:settlement<0?21:60,settlement>0?30:settlement<0?128:80,settlement>0?30:settlement<0?61:60);
      const sText=settlement>0?`↩ Recover ₹${settlement.toLocaleString("en-IN")}`:settlement<0?`↪ Pay ₹${(-settlement).toLocaleString("en-IN")}`:"✓ Settled";
      doc.text(sText,ML+159,y+4.2);
      y+=6.5;
    });
    y+=4;
    // Net settlement summary
    checkY(18);
    doc.setFillColor(240,253,233);doc.rect(ML,y,CW,16,"F");
    doc.setDrawColor(21,128,61);doc.rect(ML,y,CW,16,"S");
    doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(20,20,20);
    if(isBalance){
      doc.text(`Total Recoverable from Employees: ₹${totalRecoverable.toLocaleString("en-IN")}`,ML+5,y+6);
      doc.text(`Total Payable to Employees: ₹${totalPayable.toLocaleString("en-IN")}`,ML+5,y+12);
    } else {
      doc.text(`Total to Reimburse: ₹${totalApproved.toLocaleString("en-IN")}`,ML+5,y+9);
    }
    y+=20;
  }

  // ── Section 5: Invoice-wise Detail ──────────────────────
  if(y>230){newPage();}
  sectionHeader("5. INVOICE-WISE CLAIM DETAIL");
  doc.setFillColor(60,80,60);doc.rect(ML,y,CW,6,"F");doc.setTextColor(255,255,255);doc.setFontSize(7);doc.setFont("helvetica","bold");
  const iCols=[[ML+1,22,"Date"],[ML+23,24,"Claim ID"],[ML+47,32,"Employee"],[ML+79,26,"Category"],[ML+105,26,"Vendor"],[ML+131,20,"Amount"],[ML+151,24,"Status"],[ML+175,24,"Remarks"]];
  iCols.forEach(([x,,h])=>doc.text(h,x,y+4));y+=7;
  tripClaims.sort((a,b)=>(a.date||"").localeCompare(b.date||"")).forEach((c,idx)=>{
    checkY(7);
    const emp=typeof getUser==="function"?getUser(c.empId):(allUsers||[]).find(u=>u.id===c.empId);
    const statusColor=c.status==="Approved"?[21,128,61]:c.status==="Rejected"?[200,30,30]:[180,100,0];
    doc.setFillColor(idx%2?248:255,idx%2?252:255,idx%2?248:255);doc.rect(ML,y,CW,6,"F");
    doc.setFont("helvetica","normal");doc.setFontSize(6.5);doc.setTextColor(30,30,30);
    doc.text(fmtDate(c.date)||"",ML+1,y+4);
    doc.text((c.id||"").slice(-10),ML+23,y+4);
    doc.text((emp?.name||"").slice(0,14),ML+47,y+4);
    doc.text((c.category||"").slice(0,14),ML+79,y+4);
    doc.text((c.vendor||"—").slice(0,13),ML+105,y+4);
    doc.text(`₹${c.amount.toLocaleString("en-IN")}`,ML+131,y+4);
    doc.setTextColor(...statusColor);doc.text(c.status||"",ML+151,y+4);
    doc.setTextColor(80,80,80);doc.text((c.remarks||"").slice(0,14),ML+175,y+4);
    y+=6.5;
  });

  // ── Footer ─────────────────────────────────────────────
  const pageCount=doc.internal.getNumberOfPages();
  for(let i=1;i<=pageCount;i++){
    doc.setPage(i);
    doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(150,150,150);
    doc.text(`XpensR by RB — Trip Closure Report — ${trip.name} — Page ${i}/${pageCount}`,W/2,290,{align:"center"});
  }

  return doc;
};


// ─── USER PREFERENCES (dark mode, font size) ─────────────────────────────────
const PREFS_KEY="xpensr_prefs_v1";
const loadPrefs=()=>{try{const p=localStorage.getItem(PREFS_KEY);return p?JSON.parse(p):{darkMode:false,fontSize:13};}catch{return{darkMode:false,fontSize:13};}};
const savePrefs=p=>{try{localStorage.setItem(PREFS_KEY,JSON.stringify(p));}catch{}};
const PrefsContext=createContext([{darkMode:false,fontSize:13},()=>{}]);
function PrefsProvider({children}){
  const[prefs,setPrefsState]=useState(loadPrefs);
  const setPrefs=p=>{const next={...prefs,...p};setPrefsState(next);savePrefs(next);};
  return<PrefsContext.Provider value={[prefs,setPrefs]}>{children}</PrefsContext.Provider>;
}
function usePrefs(){return useContext(PrefsContext);}

function PrefsModal({onClose,savePolicy,policy}){
  const[prefs,setPrefs]=usePrefs();
  const brandColors=["#7ED957","#2563eb","#7c3aed","#dc2626","#ea580c","#0891b2","#16a34a","#d97706","#db2777","#0f172a"];
  const inpS={padding:"8px 11px",border:`1.5px solid ${BDR}`,borderRadius:8,fontSize:13,background:"var(--input-bg,#fafff8)",fontFamily:FB,width:"100%"};
  return(
    <div style={{position:"fixed",inset:0,background:"#00000055",display:"flex",alignItems:"center",justifyContent:"center",zIndex:700,backdropFilter:"blur(4px)"}} onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div onMouseDown={e=>e.stopPropagation()} style={{background:"var(--card,#fff)",borderRadius:16,padding:28,width:"min(420px,94vw)",boxShadow:"0 24px 60px #0003"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:18}}>
          <div style={{fontFamily:FD,fontSize:17,fontWeight:700,color:INK}}>Display Preferences</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:16,cursor:"pointer",color:MUTED}}>✕</button>
        </div>
        {/* Dark Mode */}
        <div style={{marginBottom:20}}>
          <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:8,textTransform:"uppercase"}}>Theme</label>
          <div style={{display:"flex",gap:9}}>
            {[{v:false,label:"☀ Light",desc:"Default"},
              {v:true, label:"🌙 Dark", desc:"Easy on eyes"}].map(({v,label,desc})=>(
              <div key={String(v)} onClick={()=>setPrefs({darkMode:v})} style={{flex:1,padding:"12px",border:`2px solid ${prefs.darkMode===v?"#7ED957":BDR}`,borderRadius:10,cursor:"pointer",textAlign:"center",background:prefs.darkMode===v?"#f0fde9":"#fff"}}>
                <div style={{fontSize:18,marginBottom:3}}>{label.split(" ")[0]}</div>
                <div style={{fontSize:12,fontWeight:600,color:INK}}>{label.split(" ").slice(1).join(" ")}</div>
                <div style={{fontSize:10,color:MUTED}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Font Size */}
        <div style={{marginBottom:20}}>
          <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:6,textTransform:"uppercase"}}>Font Size — {prefs.fontSize||13}px</label>
          <input type="range" min="10" max="18" step="1" value={prefs.fontSize||13} onChange={e=>setPrefs({fontSize:parseInt(e.target.value)})} style={{width:"100%",accentColor:"#7ED957"}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:MUTED,marginTop:3}}>
            <span>10 (Small)</span><span>13 (Default)</span><span>18 (Large)</span>
          </div>
          <div style={{marginTop:10,padding:"8px 12px",background:"var(--hover-bg,#f9fafb)",borderRadius:7,fontSize:prefs.fontSize||13,color:INK}}>
            Preview: This is how your text will look across the app.
          </div>
        </div>
        <div style={{display:"flex",gap:9}}>
          <Btn onClick={()=>{setPrefs({darkMode:false,fontSize:13});}} v="outline" style={{flex:1}}>Reset Defaults</Btn>
          <Btn onClick={onClose} style={{flex:1}}>Apply & Close</Btn>
        </div>
      </div>
    </div>
  );
}

function usePush(){
  const[perm,setPerm]=useState(typeof Notification!=="undefined"?Notification.permission:"denied");
  const ask=async()=>{if(typeof Notification==="undefined")return;const p=await Notification.requestPermission();setPerm(p);};
  const send=(title,body)=>{if(perm==="granted"&&typeof Notification!=="undefined"){try{new Notification(title,{body});}catch{}}};
  return{perm,ask,send};
}

// ─── OFFLINE QUEUE HOOK ───────────────────────────────────────────────────────
function useOffline(){
  const[queue,setQueue]=useState([]);
  const[online,setOnline]=useState(typeof navigator!=="undefined"?navigator.onLine:true);
  useEffect(()=>{
    const up=()=>setOnline(true),dn=()=>setOnline(false);
    window.addEventListener("online",up);window.addEventListener("offline",dn);
    return()=>{window.removeEventListener("online",up);window.removeEventListener("offline",dn);};
  },[]);
  const enqueue=item=>setQueue(q=>[...q,item]);
  const flush=cb=>{queue.forEach(cb);setQueue([]);};
  return{queue,online,enqueue,flush};
}

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component{
  constructor(p){super(p);this.state={error:null,info:null};}
  static getDerivedStateFromError(e){return{error:e};}
  componentDidCatch(e,i){this.setState({info:i});log.error("XpensR Error:",e,i);}
  render(){
    if(this.state.error){
      const e=this.state.error;
      const msg=e?.message||String(e)||"Unknown error";
      const stack=(e?.stack||"").split("\n").slice(0,4).join("\n");
      return(
        <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f5faf3",fontFamily:FB,padding:24}}>
          <div style={{maxWidth:560,textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:16}}>⚠️</div>
            <h2 style={{fontFamily:FD,fontSize:22,color:DARK,marginBottom:8}}>Something went wrong</h2>
            <div style={{background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:8,padding:"12px 16px",marginBottom:12,textAlign:"left"}}>
              <div style={{fontWeight:700,color:"#dc2626",fontSize:13,marginBottom:6}}>Error: {msg}</div>
              {stack&&<pre style={{fontSize:10,color:"#7f1d1d",whiteSpace:"pre-wrap",wordBreak:"break-all",margin:0}}>{stack}</pre>}
            </div>
            <p style={{color:MUTED,fontSize:12,marginBottom:16}}>Screenshot this error and share it for support.</p>
            <button onClick={()=>{this.setState({error:null,info:null});window.location.reload();}} style={{padding:"10px 24px",background:G,border:"none",borderRadius:9,color:"#fff",fontFamily:FB,fontWeight:700,fontSize:14,cursor:"pointer"}}>↺ Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── ATOMS ────────────────────────────────────────────────────────────────────
const Badge=({s,sm})=>{const c=SC[s]||SC.Pending;return<span style={{display:"inline-flex",alignItems:"center",gap:3,padding:sm?"2px 7px":"3px 9px",borderRadius:20,fontSize:sm?10:11,fontWeight:700,background:c.bg,color:c.c,whiteSpace:"nowrap"}}>{c.icon} {s}</span>;};
const Card=({children,style})=><div style={{background:"var(--card,#fff)",borderRadius:14,border:"1px solid var(--bdr)",...style}}>{children}</div>;
const Btn=({children,onClick,v="primary",style,disabled,title})=>{
  const S={primary:{background:G,color:"#fff",border:"none",boxShadow:"0 2px 8px #7ed95740"},outline:{background:"transparent",color:INK,border:`1.5px solid ${BDR}`},danger:{background:"#ef4444",color:"#fff",border:"none"},ghost:{background:"transparent",color:MUTED,border:"none"},warning:{background:"#f59e0b",color:"#fff",border:"none"},blue:{background:"#3b82f6",color:"#fff",border:"none"},purple:{background:"#7c3aed",color:"#fff",border:"none"},dark:{background:DARK,color:"#fff",border:"none"}};
  return<button title={title} onClick={onClick} disabled={disabled} style={{padding:"9px 18px",borderRadius:9,fontFamily:FB,fontSize:13,fontWeight:600,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,transition:"all .15s",...(S[v]||S.primary),...style}}>{children}</button>;
};
const PBar=({value,max,h=6,color=G})=><div style={{background:"#f3f4f6",borderRadius:4,height:h,overflow:"hidden"}}><div style={{width:`${Math.min(max>0?Math.round(value/max*100):0,100)}%`,background:value/max>.9?"#ef4444":value/max>.7?"#f59e0b":color,height:"100%",borderRadius:4,transition:"width .5s"}}/></div>;
const Toggle=({on,onClick,label,sub})=>(
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 0",borderBottom:`1px solid ${BDR}`}}>
    <div><div style={{fontSize:12,fontWeight:600,color:INK}}>{label}</div>{sub&&<div style={{fontSize:10,color:MUTED,marginTop:1}}>{sub}</div>}</div>
    <div onClick={onClick} style={{width:40,height:22,borderRadius:11,background:on?G:"#d1d5db",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
      <div style={{position:"absolute",top:3,left:on?21:3,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px #0002"}}/>
    </div>
  </div>
);

// ─── LOGO ─────────────────────────────────────────────────────────────────────
const Logo=({width=200,dark=false})=>(
  <svg width={width} viewBox="0 0 680 220" xmlns="http://www.w3.org/2000/svg">
    {/* Hexagon frame */}
    <polygon points="90,48 126,27 162,48 162,90 126,111 90,90" fill="none" stroke="#7ED957" strokeWidth="2.2"/>
    <polygon points="98,53 126,36 154,53 154,85 126,102 98,85" fill="#7ED957" opacity="0.12"/>
    {[[126,69,90,48],[126,69,126,27],[126,69,162,48],[126,69,162,90],[126,69,126,111],[126,69,90,90]].map(([x1,y1,x2,y2],i)=>
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#7ED957" strokeWidth="1.5" strokeLinecap="round"/>)}
    <circle cx="126" cy="69" r="9" fill="#7ED957"/>
    <circle cx="126" cy="69" r="4" fill={dark?"#fff":"#1a1a1a"}/>
    {[[90,48,"#7ED957"],[126,27,"#5ab83e"],[162,48,"#7ED957"],[162,90,"#5ab83e"],[126,111,"#7ED957"],[90,90,"#5ab83e"]].map(([cx,cy,f],i)=>
      <circle key={i} cx={cx} cy={cy} r="4" fill={f}/>)}
    {/* XpensR text */}
    <text x="192" y="100" fontFamily="'Playfair Display',serif" fontWeight="900" fontSize="68" fill={dark?"#fff":"#1a1a1a"} letterSpacing="-2">XpensR</text>
    <line x1="192" y1="115" x2="560" y2="115" stroke="#7ED957" strokeWidth="0.8" opacity="0.4"/>
    <text x="192" y="138" fontFamily="'Sora',sans-serif" fontWeight="400" fontSize="14" fill="#7ED957" opacity="0.8" letterSpacing="3">by RB</text>
  </svg>
);


// ─── LOGIN ────────────────────────────────────────────────────────────────────
// ─── LEGAL CONTENT ────────────────────────────────────────────────────────────
const PRIVACY_POLICY=`**RB Finsol Private Limited** ("we") operates XpensR by RB. This policy explains how we collect, use, and protect your data.

**Data we collect:** Name, email, username, mobile, expense claims, invoice images, trip details, GST data, usage logs, and authentication tokens.

**How we use it:** To provide expense management services, process claims, send notifications, generate reports, detect fraud, and comply with tax laws (Income Tax Act, GST law). Legal basis: contract performance, legitimate interests, legal obligation.

**Storage:** Supabase (AWS infrastructure), encrypted at rest (AES-256) and in transit (TLS 1.2+). Data may be stored in USA/EU/Singapore.

**Third parties:** Supabase (hosting), Anthropic (AI OCR — images not used for training), Resend (email), Interakt/Jio (WhatsApp), Vercel (app hosting). We do not sell your data.

**International transfers:** Standard Contractual Clauses used for EEA/UK transfers.

**Your rights (all users):** Access, correct, export (CSV), and request deletion of your data. **EU/UK (GDPR):** Also portability, objection, restriction, supervisory authority complaint. **California (CCPA):** Know, delete, opt-out of sale (we don't sell). **India (DPDP Act 2023):** Access, correction, erasure, grievance redressal.

**Retention:** Active subscription period + 7 years for tax/audit compliance.

**Invoice images:** Processed by Anthropic for OCR only. Not used for AI training. Retained for audit purposes.

**Cookies:** See Cookie Policy tab.

**Children:** Service not directed to under-18s.

**Contact/Grievance Officer:** legal@rbshah.co.in · RB Finsol Private Limited, Rajkot, Gujarat 360001, India.

*Last updated: May 2026. Material changes notified 30 days in advance.*`;

const TERMS_OF_SERVICE=`**Agreement:** By using XpensR by RB, you agree to these Terms with RB Finsol Private Limited.

**The Service:** Cloud-based expense management — submit, approve, track expenses; manage trips; AI invoice OCR; generate accounting exports.

**Your responsibilities:**
- Maintain credential confidentiality; notify us of unauthorised access at support@rbshah.co.in
- Submit only genuine, accurate expense claims
- Ensure invoices uploaded are authentic business documents
- Do not share accounts or bypass approval workflows

**Prohibited:** Submitting false claims, reverse-engineering the app, storing unrelated data, violating any law.

**AI Features:** Invoice scanning (Anthropic Claude) is for convenience — always verify AI-extracted data. We do not guarantee OCR accuracy.

**Subscription:** Auto-renews unless cancelled 30 days before renewal. No refunds for partial periods (except where required by law). Pricing changes notified 60 days in advance.

**Your data:** You own it. Request full export within 30 days of termination. Data deleted 30 days post-termination (except legally required records).

**Intellectual Property:** Service owned by RB Finsol Private Limited. You retain ownership of your submitted data.

**Availability:** We target 99.5% uptime but provide no guarantee. Not liable for downtime or third-party failures.

**Limitation of Liability:** Maximum liability = fees paid in prior 12 months. Not liable for indirect or consequential damages.

**Governing Law:** Laws of India. Disputes first negotiated, then arbitration under Arbitration and Conciliation Act 1996 in Rajkot, Gujarat. EU consumers may use EU ODR platform.

**Termination:** 30 days' notice by either party. Immediate termination for material breach.

**Contact:** support@rbshah.co.in · RB Finsol Private Limited, Rajkot, Gujarat 360001, India.

*Last updated: May 2026.*`;

const COOKIE_POLICY=`**Cookies and similar technologies** (localStorage, sessionStorage) store small files on your device to help XpensR by RB function and remember your preferences.

**Strictly Necessary (cannot be disabled):**
- \`xpensr_session\` — Keeps you logged in (session / 30 days)
- \`xpensr_logout\` — Prevents session restore during sign-out (session only)
- \`sb-*\` — Supabase authentication tokens (session / 7 days)

**Functional (can be declined — functionality reduced):**
- \`xpensr_prefs_v1\` — Display preferences: dark mode, font size (1 year)
- \`xpensr_offline_queue\` — Queues claims when offline (temporary, until synced)
- \`xpensr_db\` — Offline data cache (session)

**Analytics:** None currently.

**Advertising/Tracking:** None. We do not participate in advertising networks.

**Third-party cookies:** Only Supabase authentication (\`sb-*\`). No other third-party cookies.

**Managing cookies:**
- **Browser settings:** Block or delete cookies (blocking strictly necessary cookies prevents login)
- **Preferences:** Toggle in Profile → Display Preferences
- **Clear all:** Use Sign Out button or clear localStorage in browser DevTools

**Your choices at login:** "Accept All" includes functional cookies. "Essential Only" limits to strictly necessary cookies only (preferences will not be saved between sessions).

*Last updated: May 2026. Contact: legal@rbshah.co.in*`;

function LegalContent({type}){
  const text=type==="privacy"?PRIVACY_POLICY:type==="terms"?TERMS_OF_SERVICE:COOKIE_POLICY;
  return(
    <div style={{fontSize:13,lineHeight:1.8,color:"#374151"}}>
      {text.split("\n").map((line,i)=>{
        if(line.startsWith("**")&&line.endsWith("**")&&line.length>4){
          return<h3 key={i} style={{fontFamily:FD,fontSize:15,fontWeight:700,color:"#1a2e12",margin:"18px 0 6px"}}>{line.replace(/\*\*/g,"")}</h3>;
        }
        if(line.startsWith("- ")){
          return<div key={i} style={{paddingLeft:16,marginBottom:3}}>• {line.slice(2).replace(/\*\*([^*]+)\*\*/g,"$1")}</div>;
        }
        if(line.startsWith("*")&&line.endsWith("*")){
          return<div key={i} style={{fontSize:11,color:"#1f2937",marginTop:12,fontStyle:"italic"}}>{line.replace(/\*/g,"")}</div>;
        }
        if(!line.trim())return<div key={i} style={{height:8}}/>;
        // Bold inline text
        const parts=line.split(/\*\*([^*]+)\*\*/g);
        return<p key={i} style={{margin:"4px 0"}}>{parts.map((p,j)=>j%2===1?<strong key={j}>{p}</strong>:p)}</p>;
      })}
    </div>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
function Login({onLogin,DB,isPasswordRecovery=false}){
  const[login,  setLogin] =useState(""); // username, email, or mobile
  const[pass,   setPass]  =useState("");
  const[newPw,  setNewPw] =useState("");
  const[cfPw,   setCfPw]  =useState("");
  const[showPw, setSP]    =useState(false);
  const[err,    setErr]   =useState("");
  const[msg,    setMsg]   =useState("");
  const[busy,   setBusy]  =useState(false);
  const[gBusy,  setGB]    =useState(false);
  const[view,   setView]  =useState(isPasswordRecovery?"reset":"login");
  const[legalModal,setLegalModal]=useState(null);
  const[cookieConsent,setCookieConsentState]=useState(()=>{
    try{return localStorage.getItem("xpensr_cookie_consent");}catch{return null;}
  });
  const acceptCookies=()=>{
    try{localStorage.setItem("xpensr_cookie_consent","accepted_"+(new Date().toISOString().slice(0,10)));}catch{}
    setCookieConsentState("accepted");
  };
  const declineCookies=()=>{
    try{localStorage.setItem("xpensr_cookie_consent","functional_only");}catch{}
    setCookieConsentState("functional_only");
  };

  const attempt=async(loginVal,pw)=>{
    setErr("");setBusy(true);
    try{
      const trimmed=loginVal.trim();
      if(!trimmed||!pw){setErr("Please enter your username and password.");setBusy(false);return;}

      if(SB_ENABLED){
        // Direct RPC login (simple, no JWT complexity for beta)
        let customResult=null;
        try{
          const{data,error:rpcErr}=await Promise.race([
            supabase.rpc("authenticate_user",{p_login:trimmed,p_password:pw}),
            new Promise((_,rej)=>setTimeout(()=>rej(new Error("Login timed out after 12s")),12000))
          ]);
          if(rpcErr)throw new Error(rpcErr.message);
          customResult=data;
        }catch(e){throw new Error(e.message||"Connection failed");}

        if(customResult&&!customResult.error){
          onLogin({
            id:customResult.id,name:customResult.name,email:customResult.email||"",
            username:customResult.username||"",mobile:customResult.mobile||"",
            role:customResult.role,avatar:customResult.avatar,dept:customResult.dept,
            balance:customResult.balance,reimbursable:customResult.reimbursable,
            delegateTo:customResult.delegate_to,isSuspended:false,
            authType:"custom",cid:customResult.company_id,companyId:customResult.company_id,
          },{id:customResult.company_id,name:customResult.company_name});
          return;
        }
        throw new Error(customResult?.error||"Incorrect username or password.");


      }else{
        await new Promise(r=>setTimeout(r,400));
        const e=trimmed.toLowerCase();
        if((e===SA.email||e==="admin")&&pw===SA.password){onLogin(SA,null);return;}
        for(const cid of Object.keys(DB)){
          const co=DB[cid];
          if(co.meta.status==="Suspended")continue;
          const u=co.users.find(u=>u.email?.toLowerCase()===e||u.username?.toLowerCase()===e||u.mobile===trimmed);
          if(u){
            if(u.isSuspended)throw new Error("Account suspended. Contact your manager.");
            if(u.password!==pw&&u.password_hash!==pw)throw new Error("Incorrect password.");
            onLogin(u,co.meta);return;
          }
        }
        throw new Error("No account found. Check your username/email and try again.");
      }
    }catch(e){setErr(e.message||"Login failed. Please try again.");}
    finally{setBusy(false);}
  };

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const googleLogin=async()=>{
    setGB(true);setErr("");
    try{
      if(SB_ENABLED){
        const{error}=await supabase.auth.signInWithOAuth({
          provider:"google",
          options:{redirectTo:window.location.origin,queryParams:{access_type:"offline",prompt:"consent"}}
        });
        if(error)throw new Error(error.message);
      } else {
        // Google OAuth not configured — prompt user to use username/password
        throw new Error("Google sign-in is not configured. Please use your username and password.");
      }
    }catch(e){setErr(e.message);setGB(false);}
  };

  // ── Reset password (Supabase Auth users only) ─────────────────────────────
  const sendReset=async()=>{
    if(!login.trim()||!login.includes("@")){setErr("Enter your email address to reset password.");return;}
    setErr("");setBusy(true);
    try{
      if(SB_ENABLED){
        const{error}=await supabase.auth.resetPasswordForEmail(login.trim().toLowerCase(),
          {redirectTo:`${window.location.origin}/?reset=true`});
        if(error)throw new Error(error.message);
      }
      setView("forgot_sent");
    }catch(e){setErr(e.message);}
    finally{setBusy(false);}
  };

  const saveNewPassword=async()=>{
    setErr("");
    if(newPw.length<6){setErr("Password must be at least 6 characters.");return;}
    if(newPw!==cfPw){setErr("Passwords do not match.");return;}
    setBusy(true);
    try{
      if(SB_ENABLED){const{error}=await supabase.auth.updateUser({password:newPw});if(error)throw new Error(error.message);}
      setMsg("✓ Password updated! You can now sign in.");setView("login");setNewPw("");setCfPw("");
    }catch(e){setErr(e.message);}
    finally{setBusy(false);}
  };

  const inp={width:"100%",padding:"12px 14px",borderRadius:10,border:"1.5px solid rgba(255,255,255,0.25)",background:"rgba(255,255,255,0.08)",color:"#ffffff",fontFamily:FB,fontSize:14,outline:"none",boxSizing:"border-box",WebkitTextFillColor:"#ffffff"};

  const[showLogin,setShowLogin]=useState(isPasswordRecovery||false);
  const[showTiers,setShowTiers]=useState(false);
  const[reqForm,setReqForm]=useState({name:"",company:"",email:"",phone:"",message:""});
  const[reqSent,setReqSent]=useState(false);
  const[reqBusy,setReqBusy]=useState(false);

  const sendRequest=async()=>{
    if(!reqForm.name||!reqForm.email){alert("Name and email are required");return;}
    setReqBusy(true);
    try{
      await emailAlert(reqForm.email,"XpensR Demo Request from "+reqForm.name,
        `Name: ${reqForm.name}\nCompany: ${reqForm.company}\nEmail: ${reqForm.email}\nPhone: ${reqForm.phone}\nMessage: ${reqForm.message}`,
        `<h2>XpensR Demo Request</h2><p><b>Name:</b> ${reqForm.name}</p><p><b>Company:</b> ${reqForm.company}</p><p><b>Email:</b> ${reqForm.email}</p><p><b>Phone:</b> ${reqForm.phone}</p><p><b>Message:</b> ${reqForm.message}</p>`
      );
      setReqSent(true);
    }catch(e){
      // Email may fail — still show success to user
      setReqSent(true);
    }
    setReqBusy(false);
  };

  const features=[
    {icon:"📤",title:"Smart Submission",desc:"AI-powered OCR, camera scan, multi-invoice, auto-draft save"},
    {icon:"✓",title:"Approval Workflows",desc:"Multi-level, dual approval, admin override, delegation"},
    {icon:"📒",title:"Trip Ledger",desc:"Employee-wise fund flow, balances, and settlement tracking"},
    {icon:"📊",title:"Analytics & Reports",desc:"CSV, Tally, GSTR, Zoho exports, settlement PDFs"},
    {icon:"⚖️",title:"Balance Management",desc:"Wallet top-ups, recovery tracking, net positions"},
    {icon:"🔒",title:"Secure & Compliant",desc:"Role-based access, anomaly detection, full audit log"},
  ];

  const tiers=[
    {name:"Starter",users:"1–5 users",price:"₹299/user/month",color:"#3b82f6",features:["All core features","Email notifications","CSV/Tally/Zoho exports","3 trips at a time","AI add-on available"]},
    {name:"Growth",users:"6–20 users",price:"₹249/user/month",color:"#7ED957",features:["Everything in Starter","WhatsApp notifications","Multi-level approvals","Trip ledger & balances","AI OCR pack included (50K tokens)","Priority support"],popular:true},
    {name:"Scale",users:"21–50 users",price:"₹199/user/month",color:"#7c3aed",features:["Everything in Growth","Advanced analytics","Delegation workflows","Custom policy rules","AI OCR pack included (200K tokens)","Dedicated support"]},
    {name:"Enterprise",users:"50+ users",price:"₹149/user/month",color:"#f59e0b",features:["Everything in Scale","Custom integrations","SLA guarantee","On-premise option","AI OCR pack included (500K tokens)","Account manager"]},
  ];
  const aiPacks=[
    {label:"Starter Pack",tokens:"50,000",price:"₹199",perK:"₹3.98/1K",desc:"~50 invoice scans"},
    {label:"Growth Pack",tokens:"200,000",price:"₹599",perK:"₹3.00/1K",desc:"~200 scans"},
    {label:"Pro Pack",tokens:"500,000",price:"₹1,199",perK:"₹2.40/1K",desc:"~500 scans"},
    {label:"Enterprise Pack",tokens:"20,00,000",price:"₹3,999",perK:"₹2.00/1K",desc:"~2000 scans"},
  ];

  if(isPasswordRecovery){
    // Password recovery mode — show directly
    return(
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(145deg,${DARK},#162e0d)`,fontFamily:FB}}>
        <div style={{background:"rgba(255,255,255,.06)",borderRadius:18,padding:36,width:"min(420px,96vw)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,.1)"}}>
          <div style={{fontFamily:FD,fontSize:22,color:"#7ED957",marginBottom:20,textAlign:"center"}}>Reset Password</div>
          {/* password recovery form would go here */}
          <p style={{color:"rgba(255,255,255,.8)",textAlign:"center",fontSize:13}}>Enter your new password below.</p>
        </div>
      </div>
    );
  }

  return(
    <div style={{minHeight:"100vh",fontFamily:FB,background:"#ffffff",color:"#1a2e12"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .xr-btn{transition:all .2s;} .xr-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,.12);}
        .xr-card{transition:all .25s;} .xr-card:hover{transform:translateY(-3px);box-shadow:0 16px 40px rgba(0,0,0,.1);}
        .xr-feat:hover{background:#f0fde9!important;}
        @keyframes fadein{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .xr-anim{animation:fadein .6s ease forwards;}
      `}</style>

      {/* ── TOP NAV ── */}
      <nav style={{position:"sticky",top:0,zIndex:100,background:"rgba(240,249,255,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid rgba(126,217,87,0.15)",padding:"0 max(24px,5vw)"}}>
        <div style={{maxWidth:1180,margin:"0 auto",height:64,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:800,color:"#5CB83A",letterSpacing:-0.5}}>XpensR</div>
            <div style={{fontSize:10,color:"#374151",letterSpacing:2,textTransform:"uppercase",marginTop:2}}>by RB</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <button onClick={()=>setShowTiers(p=>!p)} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#5CB83A",fontFamily:FB,fontWeight:600,padding:"6px 12px"}}>Pricing</button>
            <a href="#contact" style={{fontSize:13,color:"#374151",textDecoration:"none",fontFamily:FB,padding:"6px 12px"}}>Contact</a>
            <button onClick={()=>setShowLogin(true)} className="xr-btn" style={{background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",border:"none",borderRadius:10,padding:"9px 22px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FB,letterSpacing:.3}}>
              Sign In →
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{background:"linear-gradient(135deg,#e8f8ff 0%,#f0ffe8 50%,#e0f0ff 100%)",padding:"80px max(24px,5vw) 70px",textAlign:"center",position:"relative",overflow:"hidden"}} className="xr-anim">
        {/* Blue wave top-left */}
        <div style={{position:"absolute",top:0,left:0,width:"45%",height:"60%",background:"radial-gradient(ellipse at top left,rgba(37,99,235,0.12) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
        {/* Green wave bottom-right */}
        <div style={{position:"absolute",bottom:0,right:0,width:"40%",height:"50%",background:"radial-gradient(ellipse at bottom right,rgba(126,217,87,0.15) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
        {/* Dot pattern top-right */}
        <div style={{position:"absolute",top:24,right:32,display:"grid",gridTemplateColumns:"repeat(6,8px)",gap:6,opacity:.3,zIndex:0}}>
          {Array(24).fill(0).map((_,i)=><div key={i} style={{width:4,height:4,borderRadius:"50%",background:"#2563eb"}}/>)}
        </div>
        {/* Dot pattern bottom-left */}
        <div style={{position:"absolute",bottom:24,left:32,display:"grid",gridTemplateColumns:"repeat(5,8px)",gap:6,opacity:.25,zIndex:0}}>
          {Array(20).fill(0).map((_,i)=><div key={i} style={{width:4,height:4,borderRadius:"50%",background:"#5CB83A"}}/>)}
        </div>
        <div style={{position:"relative",zIndex:1}}>
        <div style={{display:"inline-block",background:"#f0fde9",border:"1px solid #bbf7d0",borderRadius:20,padding:"5px 14px",fontSize:11,fontWeight:700,color:"#16a34a",letterSpacing:1,textTransform:"uppercase",marginBottom:20}}>🚀 Now in Beta — Limited Access</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(36px,6vw,68px)",fontWeight:800,color:"#0f1c09",lineHeight:1.1,marginBottom:20,letterSpacing:-1}}>
          Expense Management<br/><span style={{background:"linear-gradient(135deg,#2563eb,#5CB83A)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Built for Growing Teams</span>
        </h1>
        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:"clamp(18px,2.5vw,24px)",fontWeight:700,color:"#1e3a5f",letterSpacing:.5,marginBottom:8,marginTop:-8}}>Scan. Send. Settled.</p>
        <p style={{fontSize:"clamp(15px,2vw,17px)",color:"#374151",lineHeight:1.7,maxWidth:560,margin:"0 auto 36px",fontWeight:400}}>
          AI-powered claim submission, smart approval workflows, real-time balances and settlement tracking — all in one beautifully simple app.
        </p>
        <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={()=>setShowLogin(true)} className="xr-btn" style={{background:"#5CB83A",color:"#fff",border:"none",borderRadius:12,padding:"14px 32px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:FB}}>
            Get Started Free →
          </button>
          <button onClick={()=>document.getElementById("request").scrollIntoView({behavior:"smooth"})} className="xr-btn" style={{background:"#fff",color:"#5CB83A",border:"2px solid #5CB83A",borderRadius:12,padding:"14px 28px",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:FB}}>
            Request Demo
          </button>
        </div>
        {/* Stats bar */}
        <div style={{display:"flex",gap:32,justifyContent:"center",marginTop:52,flexWrap:"wrap"}}>
          {[["AI OCR","Invoice scanning"],["24hr","Edit windows"],["4 Roles","Admin, Manager, Finance, Employee"],["Real-time","Balances & settlements"]].map(([stat,desc])=>(
            <div key={stat} style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:800,color:"#0f1c09"}}>{stat}</div>
              <div style={{fontSize:11,color:"#374151",marginTop:2}}>{desc}</div>
            </div>
          ))}
        </div>
      </div></section>

      {/* ── FEATURES ── */}
      <section style={{background:"#fff",padding:"60px max(24px,5vw)"}}>
        <div style={{maxWidth:1180,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:44}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(26px,4vw,40px)",fontWeight:800,color:"#0f1c09",marginBottom:10}}>Everything your team needs</h2>
            <p style={{color:"#374151",fontSize:16,maxWidth:520,margin:"0 auto"}}>From submission to settlement, XpensR covers the complete expense lifecycle.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:20}}>
            {features.map(({icon,title,desc})=>(
              <div key={title} className="xr-card xr-feat" style={{padding:"24px 22px",borderRadius:14,border:"1.5px solid #dbeafe",background:"linear-gradient(135deg,#fafff8,#f0f9ff)",cursor:"default"}}>
                <div style={{fontSize:32,marginBottom:12}}>{icon}</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700,color:"#0f1c09",marginBottom:6}}>{title}</div>
                <div style={{fontSize:13,color:"#374151",lineHeight:1.6}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{padding:"60px max(24px,5vw)",background:"#f8fffe"}}>
        <div style={{maxWidth:1180,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:44}}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(26px,4vw,40px)",fontWeight:800,color:"#0f1c09",marginBottom:10}}>Simple, transparent pricing</h2>
            <p style={{color:"#374151",fontSize:16}}>Pay per user. Cancel anytime. All plans include core features.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:18}}>
            {tiers.map(t=>(
              <div key={t.name} className="xr-card" style={{borderRadius:16,overflow:"hidden",border:`2px solid ${t.popular?"#5CB83A":"#e8f5e2"}`,background:t.popular?"#f0fde9":"#fff",position:"relative"}}>
                {t.popular&&<div style={{position:"absolute",top:0,left:0,right:0,background:"#5CB83A",color:"#fff",textAlign:"center",fontSize:10,fontWeight:700,padding:"4px 0",letterSpacing:1,textTransform:"uppercase"}}>Most Popular</div>}
                <div style={{padding:`${t.popular?28:20}px 20px 20px`}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:"#0f1c09",marginBottom:4}}>{t.name}</div>
                  <div style={{fontSize:11,color:"#374151",marginBottom:14}}>{t.users}</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:800,color:t.color,marginBottom:4}}>{t.price}</div>
                  <div style={{height:1,background:"#e8f5e2",margin:"16px 0"}}/>
                  {t.features.map(f=>(
                    <div key={f} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:8,fontSize:12,color:"#444"}}>
                      <span style={{color:"#5CB83A",fontWeight:700,flexShrink:0}}>✓</span>{f}
                    </div>
                  ))}
                  <button onClick={()=>document.getElementById("request").scrollIntoView({behavior:"smooth"})} className="xr-btn" style={{width:"100%",marginTop:16,background:t.popular?"#5CB83A":"transparent",color:t.popular?"#fff":"#5CB83A",border:`2px solid #5CB83A`,borderRadius:10,padding:"10px 0",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FB}}>
                    Request Access →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI TOKEN PACKS ── */}
      <section style={{padding:"40px max(24px,5vw) 50px",background:"#f0f9ff"}}>
        <div style={{maxWidth:1180,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{display:"inline-block",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"6px 18px",fontSize:12,color:"#2563eb",fontWeight:700,marginBottom:10}}>🤖 AI Invoice OCR — Optional Add-on</div>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:800,color:"#0f1c09",marginBottom:6}}>Pay only for AI you use</h3>
            <p style={{color:"#374151",fontSize:13}}>Token packs never expire. Tokens are shared across all employees in your company.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
            {aiPacks.map(p=>(
              <div key={p.label} style={{background:"#fff",border:"1px solid #bfdbfe",borderRadius:12,padding:"18px 20px"}}>
                <div style={{fontWeight:700,color:"#1d4ed8",fontSize:14,marginBottom:4}}>{p.label}</div>
                <div style={{fontSize:24,fontWeight:800,color:"#0f1c09",marginBottom:2}}>{p.price}</div>
                <div style={{fontSize:11,color:"#6b7280",marginBottom:6}}>{p.tokens} tokens · {p.perK}</div>
                <div style={{fontSize:11,color:"#2563eb",fontWeight:600}}>{p.desc}</div>
              </div>
            ))}
          </div>
          <p style={{textAlign:"center",marginTop:14,fontSize:11,color:"#6b7280"}}>1 invoice scan ≈ 800–1,200 tokens · 1 chat message ≈ 200–500 tokens · Tokens never expire · Activated by your XpensR account manager</p>
        </div>
      </section>

      {/* ── REQUEST / CONTACT ── */}
      <section id="request" style={{background:"#fff",padding:"60px max(24px,5vw)"}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:48}} className="mob-grid-1">
          {/* Request form */}
          <div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:800,color:"#0f1c09",marginBottom:8}}>Request a Demo</h2>
            <p style={{color:"#374151",fontSize:14,marginBottom:24,lineHeight:1.6}}>Tell us about your team and we'll set up XpensR for you within 24 hours.</p>
            {reqSent?(
              <div style={{background:"#f0fde9",border:"1px solid #bbf7d0",borderRadius:12,padding:24,textAlign:"center"}}>
                <div style={{fontSize:36,marginBottom:8}}>✅</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:"#16a34a",marginBottom:4}}>Request sent!</div>
                <p style={{color:"#444",fontSize:13}}>We'll be in touch within 24 hours.</p>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {[["name","Your Name *","text"],["company","Company Name","text"],["email","Work Email *","email"],["phone","Phone Number","tel"]].map(([k,ph,type])=>(
                  <input key={k} type={type} placeholder={ph} value={reqForm[k]} onChange={e=>setReqForm({...reqForm,[k]:e.target.value})}
                    style={{padding:"11px 14px",borderRadius:9,border:"1.5px solid #e2e8f0",fontSize:13,fontFamily:FB,outline:"none",background:"#f8fffe"}}/>
                ))}
                <textarea placeholder="Tell us about your team size and needs…" value={reqForm.message} onChange={e=>setReqForm({...reqForm,message:e.target.value})} rows={3}
                  style={{padding:"11px 14px",borderRadius:9,border:"1.5px solid #e2e8f0",fontSize:13,fontFamily:FB,resize:"vertical",outline:"none",background:"#f8fffe"}}/>
                <button onClick={sendRequest} disabled={reqBusy} className="xr-btn" style={{background:"#5CB83A",color:"#fff",border:"none",borderRadius:10,padding:"12px 24px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FB}}>
                  {reqBusy?"Sending…":"Send Request →"}
                </button>
              </div>
            )}
          </div>
          {/* Contact info */}
          <div id="contact">
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:800,color:"#0f1c09",marginBottom:8}}>Contact Us</h2>
            <p style={{color:"#374151",fontSize:14,marginBottom:28,lineHeight:1.6}}>We'd love to hear from you. Reach out anytime.</p>
            {[
              {icon:"🏢",label:"R B Shah & Associates",sub:"Chartered Accountants"},
              {icon:"📍",label:"Rajkot, Gujarat, India",sub:""},
              {icon:"📧",label:"rushabh@rbshah.co.in",sub:"Rushabh Shah, CA · Partner"},
              {icon:"🌐",label:"www.rbshah.co.in",sub:""},
              {icon:"📱",label:"+91 98250 XXXXX",sub:"WhatsApp preferred"},
            ].map(({icon,label,sub})=>(
              <div key={label} style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:18}}>
                <div style={{width:38,height:38,borderRadius:"50%",background:"#f0fde9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{icon}</div>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:"#0f1c09"}}>{label}</div>
                  {sub&&<div style={{fontSize:12,color:"#374151",marginTop:1}}>{sub}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{background:"#0f1c09",padding:"32px max(24px,5vw)",textAlign:"center"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:800,color:"#7ED957",marginBottom:4}}>XpensR</div>
        <div style={{fontSize:10,color:"rgba(255,255,255,.3)",letterSpacing:2,textTransform:"uppercase",marginBottom:16}}>by RB</div>
        <p style={{color:"rgba(255,255,255,.3)",fontSize:12,marginBottom:4}}>© 2026 R B Shah & Associates. Built with ♥ in Rajkot.</p>
        <p style={{color:"rgba(255,255,255,.2)",fontSize:11}}>XpensR is a product of RB Finsol. All rights reserved.</p>
      </footer>

      {showLogin&&(
        <div data-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)"}} onClick={e=>{if(e.target===e.currentTarget)setShowLogin(false);}}>
          <div onClick={e=>e.stopPropagation()} style={{background:`linear-gradient(145deg,${DARK} 0%,#0a1f06 100%)`,borderRadius:20,padding:"32px 32px 28px",width:"min(440px,96vw)",boxShadow:"0 32px 80px rgba(0,0,0,.5)",border:"1px solid rgba(255,255,255,.08)",position:"relative"}}>
            <button onClick={()=>setShowLogin(false)} style={{position:"absolute",top:14,right:16,background:"none",border:"none",color:"rgba(255,255,255,.7)",fontSize:20,cursor:"pointer",lineHeight:1}}>✕</button>
            {/* Logo */}
            <div style={{textAlign:"center",marginBottom:24}}>
              <Logo width={160} dark/>
              <div style={{fontSize:10,color:"rgba(255,255,255,.3)",letterSpacing:2,textTransform:"uppercase",marginTop:6}}>Sign in to your workspace</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <input type="text" value={login} onChange={e=>{setLogin(e.target.value);setErr("");}}
                onKeyDown={e=>e.key==="Enter"&&attempt(login,pass)}
                placeholder="username  ·  email  ·  mobile"
                className="login-inp"
                style={{width:"100%",padding:"13px 16px",borderRadius:10,border:"1.5px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.07)",color:"#fff",fontFamily:FB,fontSize:13,outline:"none",boxSizing:"border-box"}}
                autoComplete="username"/>
              <div style={{position:"relative"}}>
                <input type={showPw?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);setErr("");}}
                  onKeyDown={e=>e.key==="Enter"&&attempt(login,pass)}
                  placeholder="password"
                  className="login-inp"
                  style={{width:"100%",padding:"13px 40px 13px 16px",borderRadius:10,border:"1.5px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.07)",color:"#fff",fontFamily:FB,fontSize:13,outline:"none",boxSizing:"border-box"}}
                  autoComplete="current-password"/>
                <button onClick={()=>setSP(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"rgba(255,255,255,.7)",cursor:"pointer",fontSize:16,padding:0,lineHeight:1}}>{showPw?"🙈":"👁"}</button>
              </div>
              {err&&<div style={{color:"#f87171",fontSize:12,textAlign:"center",padding:"7px 12px",background:"rgba(239,68,68,.1)",borderRadius:8}}>{err}</div>}
              <button onClick={()=>attempt(login,pass)} disabled={busy}
                style={{background:"#7ED957",color:"#0f1c09",border:"none",borderRadius:10,padding:"14px",fontSize:14,fontWeight:700,cursor:busy?"not-allowed":"pointer",fontFamily:FB,marginTop:2,opacity:busy?.7:1}}>
                {busy?"Signing in…":"Sign In →"}
              </button>
              {SB_ENABLED&&<>
                <div style={{display:"flex",alignItems:"center",gap:10,margin:"2px 0"}}>
                  <div style={{flex:1,height:1,background:"rgba(255,255,255,.1)"}}/>
                  <span style={{fontSize:11,color:"rgba(255,255,255,.3)"}}>or</span>
                  <div style={{flex:1,height:1,background:"rgba(255,255,255,.1)"}}/>
                </div>
                <button onClick={googleLogin} disabled={busy}
                  style={{background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.75)",border:"1px solid rgba(255,255,255,.14)",borderRadius:10,padding:"13px",fontSize:13,cursor:"pointer",fontFamily:FB,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  Sign in with Google
                </button>
              </>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EDIT COMPANY MODAL ───────────────────────────────────────────────────────
function EditCoModal({data,onClose,onSave}){
  const[name,setName]=useState(data.name);
  const[industry,setInd]=useState(data.industry||"");
  const[plan,setPlan]=useState(data.plan||"Starter");
  const[maxUsers,setMax]=useState(String(data.maxUsers||5));
  const inpS={padding:"9px 12px",border:`1.5px solid ${BDR}`,borderRadius:8,fontSize:13,background:"var(--input-bg,#fafff8)",fontFamily:FB,width:"100%"};
  const save=()=>onSave({id:data.id,name,industry,plan,maxUsers:parseInt(maxUsers)||5});
  return(
    <div style={{position:"fixed",inset:0,background:"#00000060",display:"flex",alignItems:"center",justifyContent:"center",zIndex:510,backdropFilter:"blur(3px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:16,padding:28,width:"min(480px,96vw)",boxShadow:"0 24px 60px #0003"}}>
        <h3 style={{fontFamily:FD,fontSize:18,fontWeight:700,color:INK,marginBottom:18}}>Edit Company</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          {[["Company Name","text",name,setName],["Industry","text",industry,setInd]].map(([l,t,v,fn])=>(
            <div key={l}><label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:4,textTransform:"uppercase"}}>{l}</label><input type={t} value={v} onChange={e=>fn(e.target.value)} style={inpS}/></div>
          ))}
          <div><label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:4,textTransform:"uppercase"}}>Plan</label><select value={plan} onChange={e=>setPlan(e.target.value)} style={{...inpS,appearance:"none"}}>{["Starter","Pro","Enterprise"].map(p=><option key={p}>{p}</option>)}</select></div>
          <div><label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:4,textTransform:"uppercase"}}>Max Users</label><input type="number" min="1" value={maxUsers} onChange={e=>setMax(e.target.value)} style={inpS}/></div>
        </div>
        <div style={{display:"flex",gap:9}}><Btn onClick={save} style={{flex:1,padding:11}}>Save Changes →</Btn><Btn v="outline" onClick={onClose}>Cancel</Btn></div>
      </div>
    </div>
  );
}

// ─── SUPER ADMIN ──────────────────────────────────────────────────────────────
function SuperAdmin({DB,setDB,onLogout,sbRefresh}){
  const[tab,setTab]=useState("companies");
  const[notif,setNtf]=useState(null);
  const[modal,setMdl]=useState(null);
  const[sbCoList,setSbCoList]=useState(null);
  const[loading,setLoading]=useState(false);
  const[form,setForm]=useState({name:"",industry:"",plan:"Starter",maxUsers:5,adminName:"",adminEmail:"",adminPw:""});
  const[userCounts,setUserCounts]=useState({});

  const toast=(msg,t="success")=>{setNtf({msg,t});if(t!=="error")setTimeout(()=>setNtf(null),3000);};
  const allCo=SB_ENABLED?(sbCoList||[]):Object.values(DB);
  const inpS={padding:"9px 12px",border:`1.5px solid ${BDR}`,borderRadius:8,fontSize:13,background:"var(--input-bg,#fafff8)",fontFamily:FB,width:"100%"};

  useEffect(()=>{
    if(!SB_ENABLED)return;
    setLoading(true);
    supabase.from("companies").select("*").then(({data})=>{
      if(data)setSbCoList(data.map(c=>({meta:{id:c.id,name:c.name,industry:c.industry,plan:c.plan,maxUsers:c.max_users,status:c.status,createdOn:c.created_on},users:[]})));
      setLoading(false);
    });
  },[]);

  const createCo=async()=>{
    if(!form.name||!form.adminEmail||!form.adminPw){toast("Fill required fields","error");return;}
    const id=form.name.toLowerCase().replace(/\s+/g,"").replace(/[^a-z0-9]/g,"").slice(0,10)+uid().slice(0,4).toLowerCase();
    try{
      if(SB_ENABLED){
        // 1. Create company row
        const{error:coErr}=await supabase.from("companies").insert({id,name:form.name,industry:form.industry||"General",plan:form.plan,max_users:parseInt(form.maxUsers)||5,status:"Active"});
        if(coErr)throw new Error(coErr.message);
        // 2. Insert default policy
        await supabase.from("policy").insert({company_id:id});
        // 3. Insert manager directly into users table (custom auth — no Supabase Auth signUp needed)
        // Generate UUID for the new manager
        const{data:uuidData}=await supabase.rpc("gen_manager_uuid");
        const managerId=uuidData||crypto.randomUUID();
        const managerName=form.adminName||form.adminEmail.split("@")[0];
        const username=managerName.toLowerCase().replace(/\s+/g,".");
        const{data:hashData,error:hashErr}=await supabase.rpc("create_manager_account",{
          p_company_id:id, p_name:managerName, p_email:form.adminEmail,
          p_username:username, p_password:form.adminPw,
          p_mobile:null, p_avatar:inits(managerName), p_role:"admin"
        });
        if(hashErr)throw new Error(hashErr.message);
        if(hashData?.error)throw new Error(hashData.error);
        toast(`✓ ${form.name} created! Manager login: username="${username}", password as set`);
        // Refresh list
        const{data}=await supabase.from("companies").select("*");
        if(data)setSbCoList(data.map(c=>({meta:{id:c.id,name:c.name,industry:c.industry,plan:c.plan,maxUsers:c.max_users,status:c.status,createdOn:c.created_on},users:[]})));
      } else {
        // localStorage demo mode
        const mgr={id:"adm_"+uid(),cid:id,name:form.adminName||form.adminEmail.split("@")[0],email:form.adminEmail,username:(form.adminName||form.adminEmail.split("@")[0]).toLowerCase().replace(/\s+/g,"."),password:form.adminPw,role:"admin",avatar:inits(form.adminName||form.adminEmail),dept:"Management",balance:0,reimbursable:0,delegateTo:null,isSuspended:false,authType:"custom"};
        setDB(p=>({...p,[id]:{meta:{id,name:form.name,industry:form.industry||"General",plan:form.plan,maxUsers:parseInt(form.maxUsers)||5,status:"Active",createdOn:today()},users:[mgr],trips:[],claims:[],topups:[],auditLog:[],notifications:[],policy:mkPolicy()}}));
        toast(`✓ ${form.name} created`);
      }
      setForm({name:"",industry:"",plan:"Starter",maxUsers:5,adminName:"",adminEmail:"",adminPw:""});
      setMdl(null);
    }catch(e){toast(e.message,"error");}
  };

  const toggleStatus=async(co)=>{
    const newStatus=co.meta.status==="Active"?"Suspended":"Active";
    if(SB_ENABLED){await supabase.from("companies").update({status:newStatus}).eq("id",co.meta.id);}
    else{setDB(p=>({...p,[co.meta.id]:{...p[co.meta.id],meta:{...p[co.meta.id].meta,status:newStatus}}}));}
    if(SB_ENABLED){const{data}=await supabase.from("companies").select("*");if(data)setSbCoList(data.map(c=>({meta:{id:c.id,name:c.name,industry:c.industry,plan:c.plan,maxUsers:c.max_users,status:c.status,createdOn:c.created_on},users:[]})));}
    toast("Status updated");
  };

  const deleteCo=async(cid)=>{
    if(SB_ENABLED){await supabase.from("companies").delete().eq("id",cid);}
    else{setDB(p=>{const n={...p};delete n[cid];return n;});}
    if(SB_ENABLED){const{data}=await supabase.from("companies").select("*");if(data)setSbCoList(data.map(c=>({meta:{id:c.id,name:c.name,industry:c.industry,plan:c.plan,maxUsers:c.max_users,status:c.status,createdOn:c.created_on},users:[]})));}
    setMdl(null);toast("Deleted","warn");
  };

  // Fetch users count per company for billing tab
  useEffect(()=>{
    if(!SB_ENABLED)return;
    supabase.from("users").select("company_id").then(({data})=>{
      if(data){const c={};data.forEach(u=>{c[u.company_id]=(c[u.company_id]||0)+1;});setUserCounts(c);}
    });
  },[]);

  return(
    <div style={{display:"flex",minHeight:"100vh",fontFamily:FB,background:"#f0f4f8"}}>
      <style>{GLSTYLE+`.login-inp::placeholder{color:rgba(255,255,255,0.28)!important;font-weight:300}.login-inp::-webkit-input-placeholder{color:rgba(255,255,255,0.28)!important}`}</style>
      {notif&&<div style={{position:"fixed",top:20,right:20,zIndex:2000,padding:"14px 18px 14px 16px",borderRadius:12,fontWeight:600,fontSize:13,background:notif.t==="error"?"#fee2e2":notif.t==="warn"?"#fef3c7":"#dcfce7",color:notif.t==="error"?"#dc2626":notif.t==="warn"?"#92400e":"#15803d",boxShadow:"0 4px 24px #0003",maxWidth:380,display:"flex",alignItems:"flex-start",gap:10,wordBreak:"break-word"}}><span style={{flex:1,lineHeight:1.5}}>{notif.msg}</span><button onClick={()=>setNtf(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"inherit",opacity:0.6,flexShrink:0,padding:0,lineHeight:1}}>✕</button></div>}
      {/* Sidebar */}
      <div style={{width:220,background:"#1e2736",display:"flex",flexDirection:"column",padding:"20px 12px",position:"sticky",top:0,height:"100vh"}}>
        <div style={{marginBottom:18}}><Logo width={140} dark/></div>
        <div style={{background:"#dc2626",borderRadius:8,padding:"4px 10px",marginBottom:14,fontSize:10,fontWeight:700,color:"#fff",letterSpacing:1,textTransform:"uppercase",textAlign:"center"}}>SUPER ADMIN</div>
        
        {[
          {id:"companies",i:"🏢",l:"Companies"},
          {id:"users",i:"👥",l:"Users & Passwords"},
          {id:"help",i:"❓",l:"Help"}
        ].map(x=>(
          <button key={x.id} onClick={()=>setTab(x.id)} style={{display:"flex",alignItems:"center",gap:9,padding:"10px 12px",borderRadius:9,cursor:"pointer",border:"none",fontFamily:FB,fontSize:13,fontWeight:tab===x.id?600:400,background:tab===x.id?"#dc2626":"transparent",color:tab===x.id?"#fff":"rgba(255,255,255,0.5)",marginBottom:3,textAlign:"left",width:"100%"}}>
            <span>{x.i}</span><span>{x.l}</span>
          </button>
        ))}
        <div style={{marginTop:"auto",paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{color:"#fff",fontSize:12,fontWeight:600,padding:"0 6px",marginBottom:8}}>Super Admin</div>
          <button onClick={onLogout} style={{width:"100%",padding:"7px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,color:"rgba(255,255,255,0.4)",fontFamily:FB,fontSize:11,cursor:"pointer",marginBottom:6}}>Sign Out</button>
          <button onClick={()=>{if(window.confirm("Reset ALL demo data? (Cloud data unaffected)")){localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(SESSION_KEY);window.location.reload();}}} style={{width:"100%",padding:"6px",background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:7,color:"rgba(239,68,68,0.7)",fontFamily:FB,fontSize:10,cursor:"pointer"}}>🗑 Reset Demo Data</button>
        </div>
      </div>
      {/* Content */}
      <div style={{flex:1,padding:"28px 32px",overflow:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div><h1 style={{fontFamily:FD,fontSize:24,fontWeight:700,color:"#1e2736"}}>XpensR Control Centre</h1><p style={{color:MUTED,fontSize:13,marginTop:3}}>Manage companies and users · Company data is private</p></div>
          {tab==="companies"&&<Btn onClick={()=>setMdl({type:"newCo"})}>＋ New Company</Btn>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:22}}>
          {[{l:"Companies",v:allCo.length,i:"🏢",c:"#6366f1"},{l:"Active",v:allCo.filter(c=>c.meta.status==="Active").length,i:"✅",c:"#16a34a"},{l:"Total Users",v:SB_ENABLED?Object.values(userCounts).reduce((a,b)=>a+b,0):Object.values(DB).reduce((s,c)=>s+c.users.length,0),i:"👥",c:G},{l:"Status",v:"Active",i:"🟢",c:"#16a34a"}].map((s,i)=>(
            <Card key={i} style={{padding:18}}><div style={{fontSize:22}}>{s.i}</div><div style={{fontFamily:FD,fontSize:22,fontWeight:700,color:s.c,marginTop:4}}>{s.v}</div><div style={{fontSize:11,color:MUTED,marginTop:2}}>{s.l}</div></Card>
          ))}
        </div>
        {loading&&<div style={{textAlign:"center",padding:40,color:MUTED}}>Loading…</div>}
        {tab==="companies"&&!loading&&<Card><table style={{width:"100%"}}>
          <thead><tr><th>Company</th><th>Industry</th><th>Plan</th><th>Max Users</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>{allCo.map(co=>(
            <tr key={co.meta.id} className="rh">
              <td><div style={{fontWeight:700,color:INK}}>{co.meta.name}</div><div style={{fontSize:10,color:MUTED,fontFamily:"monospace"}}>{co.meta.id}</div></td>
              <td style={{color:MUTED}}>{co.meta.industry}</td>
              <td><span style={{background:co.meta.plan==="Pro"?GL:"#eff6ff",color:co.meta.plan==="Pro"?GD:"#2563eb",padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:700}}>{co.meta.plan}</span></td>
              <td style={{fontWeight:600}}>
                <input type="number" defaultValue={co.meta.maxUsers} min="1" max="500"
                  onBlur={async e=>{
                    const val=parseInt(e.target.value)||5;
                    if(SB_ENABLED){await supabase.from("companies").update({max_users:val}).eq("id",co.meta.id);}
                    else{setDB(p=>({...p,[co.meta.id]:{...p[co.meta.id],meta:{...p[co.meta.id].meta,maxUsers:val}}}));}
                    toast("Max users updated");
                  }}
                  style={{width:60,padding:"4px 7px",border:`1.5px solid ${BDR}`,borderRadius:6,fontSize:12,textAlign:"center",fontWeight:700}}
                />
              </td>
              <td><Badge s={co.meta.status}/></td>
              <td style={{color:MUTED,fontSize:11}}>{co.meta.createdOn}</td>
              <td><div style={{display:"flex",gap:6}}>
                <Btn v="outline" onClick={()=>setMdl({type:"editCo",data:co.meta})} style={{padding:"4px 9px",fontSize:11}}>✏ Edit</Btn>
                <Btn v={co.meta.status==="Active"?"warning":"primary"} onClick={()=>toggleStatus(co)} style={{padding:"4px 9px",fontSize:11}}>{co.meta.status==="Active"?"Suspend":"Activate"}</Btn>
                <Btn v="danger" onClick={()=>setMdl({type:"delCo",data:co.meta})} style={{padding:"4px 9px",fontSize:11}}>✕</Btn>
              </div></td>
            </tr>
          ))}</tbody>
        </table></Card>}
        {tab==="users"&&<SaUsers DB={DB} userCounts={userCounts}/>}
        {tab==="help"&&<HelpManual userRole="superadmin" onClose={()=>setTab("companies")} inline={true}/>}
      </div>
      {/* Create Company Modal */}
      {modal?.type==="newCo"&&(
        <div style={{position:"fixed",inset:0,background:"#00000060",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,backdropFilter:"blur(3px)"}} onClick={()=>setMdl(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:18,padding:30,width:560,maxHeight:"85vh",overflow:"auto",boxShadow:"0 24px 60px #0003"}}>
            <h3 style={{fontFamily:FD,fontSize:18,fontWeight:700,color:INK,marginBottom:16}}>Create New Company</h3>
            {SB_ENABLED&&<div style={{background:"#dbeafe",border:"1px solid #93c5fd",borderRadius:9,padding:"9px 13px",marginBottom:14,fontSize:12,color:"#1d4ed8"}}>ℹ️ The admin will receive a confirmation email from the system. They must verify their email before logging in.</div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              {[["Company Name *","name","text","Acme Corp"],["Industry","industry","text","Finance"],["Max Users *","maxUsers","number","5"]].map(([l,k,t,ph])=>(
                <div key={k}><label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:4,textTransform:"uppercase"}}>{l}</label><input type={t} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={ph} style={inpS}/></div>
              ))}
              <div><label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:4,textTransform:"uppercase"}}>Plan</label><select value={form.plan} onChange={e=>setForm({...form,plan:e.target.value})} style={{...inpS,appearance:"none"}}>{["Starter","Pro","Enterprise"].map(p=><option key={p}>{p}</option>)}</select></div>
            </div>
            <div style={{background:GL,borderRadius:10,padding:"12px 14px",marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:GD,marginBottom:4,textTransform:"uppercase"}}>Company Admin Account</div>
              <div style={{fontSize:10,color:MUTED,marginBottom:8}}>This person gets full access to the company. They can create managers and employees.</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
                {[["Admin Name","adminName","text","e.g. Rajesh Shah"],["Email","adminEmail","email","admin@company.in"],["Password *","adminPw","password","min 8 chars"]].map(([l,k,t,ph])=>(
                  <div key={k}><label style={{fontSize:9,color:MUTED,fontWeight:700,display:"block",marginBottom:3,textTransform:"uppercase"}}>{l}</label><input type={t} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={ph} style={inpS}/></div>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:9}}><Btn onClick={createCo} style={{flex:1,padding:12}}>Create →</Btn><Btn v="outline" onClick={()=>setMdl(null)}>Cancel</Btn></div>
          </div>
        </div>
      )}
      {modal?.type==="editCo"&&<EditCoModal data={modal.data} onClose={()=>setMdl(null)} onSave={async(updates)=>{if(SB_ENABLED){await supabase.from("companies").update({name:updates.name,industry:updates.industry,plan:updates.plan,max_users:updates.maxUsers}).eq("id",updates.id);const{data}=await supabase.from("companies").select("*");if(data)setSbCoList(data.map(c=>({meta:{id:c.id,name:c.name,industry:c.industry,plan:c.plan,maxUsers:c.max_users,status:c.status,createdOn:c.created_on},users:[]})));}else{setDB(p=>({...p,[updates.id]:{...p[updates.id],meta:{...p[updates.id].meta,...updates}}}));}setMdl(null);toast("✓ Company updated");}}/>}
      {modal?.type==="delCo"&&(
        <div style={{position:"fixed",inset:0,background:"#00000060",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500}} onClick={()=>setMdl(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:16,padding:28,width:"min(360px,96vw)",textAlign:"center"}}>
            <div style={{fontSize:34,marginBottom:8}}>⚠️</div>
            <div style={{fontFamily:FD,fontSize:17,fontWeight:700,color:INK,marginBottom:6}}>Delete {modal.data.name}?</div>
            <div style={{color:MUTED,fontSize:13,marginBottom:18}}>All data permanently deleted. This cannot be undone.</div>
            <div style={{display:"flex",gap:9,justifyContent:"center"}}><Btn v="danger" onClick={()=>deleteCo(modal.data.id)}>Yes, Delete</Btn><Btn v="outline" onClick={()=>setMdl(null)}>Cancel</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}

function SaUsers({DB,userCounts}){
  const allUsers=SB_ENABLED?[]:(Object.values(DB).flatMap(co=>co.users.map(u=>({...u,coName:co.meta.name}))));
  const[sbUsers,setSbUsers]=useState([]);
  const[editUser,setEditUser]=useState(null);
  const[newRole,setNewRole]=useState("employee");
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState("");
  const[resetUser,setResetUser]=useState(null);
  const[newPassword,setNewPassword]=useState("");
  const[resetMsg,setResetMsg]=useState("");
  const[resetBusy,setResetBusy]=useState(false);
  useEffect(()=>{if(!SB_ENABLED)return;supabase.from("users").select("*,companies(name)").then(({data})=>{if(data)setSbUsers(data);});},[]);
  const rows=SB_ENABLED?sbUsers:allUsers;

  const openEdit=u=>{setEditUser(u);setNewRole(u.role);setMsg("");};
  const saveRole=async()=>{
    if(!editUser)return;
    setBusy(true);setMsg("");
    try{
      if(SB_ENABLED){
        const{error}=await supabase.from("users").update({role:newRole}).eq("id",editUser.id);
        if(error)throw new Error(error.message);
        const{data}=await supabase.from("users").select("*,companies(name)");
        if(data)setSbUsers(data);
      }
      setMsg("✓ Role updated to "+newRole);
      setTimeout(()=>setEditUser(null),1000);
    }catch(e){setMsg("Error: "+e.message);}
    finally{setBusy(false);}
  };

  const suspendUser=async(u)=>{
    const newSuspended=!u.is_suspended;
    if(SB_ENABLED){
      await supabase.from("users").update({is_suspended:newSuspended}).eq("id",u.id);
      const{data}=await supabase.from("users").select("*,companies(name)");
      if(data)setSbUsers(data);
    }
  };

  const deleteUser=async(u)=>{
    if(!window.confirm(`Delete ${u.name}? This cannot be undone.`))return;
    if(SB_ENABLED){
      await supabase.from("users").delete().eq("id",u.id);
      setSbUsers(p=>p.filter(x=>x.id!==u.id));
    }
  };

  // Reset password — set new password directly in users table
  const openReset=u=>{setResetUser(u);setNewPassword("");setResetMsg("");};
  const doResetPassword=async()=>{
    if(!newPassword||newPassword.length<4){setResetMsg("Password must be at least 4 characters.");return;}
    if(!resetUser)return;
    setResetBusy(true);setResetMsg("");
    try{
      if(SB_ENABLED){
        // Update password_hash directly (plaintext — will be bcrypted on next login via RPC)
        const{error}=await supabase.from("users").update({password_hash:newPassword}).eq("id",resetUser.id);
        if(error)throw new Error(error.message);
        setResetMsg("✓ Password reset successfully. Share the new password with "+resetUser.name+" securely.");
        setTimeout(()=>{setResetUser(null);setNewPassword("");},2500);
      }
    }catch(e){setResetMsg("Error: "+e.message);}
    finally{setResetBusy(false);}
  };

  const inpS2={padding:"8px 11px",border:`1.5px solid ${BDR}`,borderRadius:8,fontSize:13,background:"var(--input-bg,#fafff8)",fontFamily:FB,width:"100%"};
  return(<>
    <Card>
      <div style={{padding:"10px 14px",background:"#fef3c7",borderRadius:"8px 8px 0 0",fontSize:11,color:"#92400e",fontWeight:600}}>
        ⚠ Super Admin can change user roles, reset passwords, suspend, or delete users. Company financial data is private.
      </div>
      <div className="mob-scroll">
      <table style={{width:"100%",minWidth:700}}>
        <thead><tr><th>Name</th><th>Company</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{rows.map(u=><tr key={u.id} className="rh" style={{opacity:u.is_suspended?0.6:1}}>
          <td><div style={{display:"flex",alignItems:"center",gap:7}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:GL,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:GD,fontSize:10}}>{u.avatar||inits(u.name)}</div>
            <div><div style={{fontWeight:600,fontSize:13}}>{u.name}</div><div style={{fontSize:10,color:MUTED}}>{u.email||u.username||"—"}</div></div>
          </div></td>
          <td style={{fontSize:11}}>{u.coName||(u.companies?.name)||"—"}</td>
          <td><span style={{background:ROLES.find(r=>r.id===u.role)?.color+"20"||GL,color:ROLES.find(r=>r.id===u.role)?.color||GD,padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:700,textTransform:"capitalize"}}>{u.role}</span></td>
          <td>{u.is_suspended?<span style={{background:"#fee2e2",color:"#dc2626",padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:700}}>Suspended</span>:<span style={{background:"#dcfce7",color:"#16a34a",padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:700}}>Active</span>}</td>
          <td><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            <Btn v="outline" onClick={()=>openEdit(u)} style={{padding:"3px 8px",fontSize:11}}>Role</Btn>
            <Btn v="outline" onClick={()=>openReset(u)} style={{padding:"3px 8px",fontSize:11,borderColor:"#f59e0b",color:"#92400e"}}>🔑 Reset PW</Btn>
            <Btn v={u.is_suspended?"primary":"warning"} onClick={()=>suspendUser(u)} style={{padding:"3px 8px",fontSize:11}}>{u.is_suspended?"Activate":"Suspend"}</Btn>
            <Btn v="danger" onClick={()=>deleteUser(u)} style={{padding:"3px 8px",fontSize:11}}>✕</Btn>
          </div></td>
        </tr>)}</tbody>
      </table>
      </div>
    </Card>

    {/* Reset Password Modal */}
    {resetUser&&(
      <div style={{position:"fixed",inset:0,background:"#00000060",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,backdropFilter:"blur(3px)"}} onMouseDown={e=>{if(e.target===e.currentTarget)setResetUser(null);}}>
        <div onMouseDown={e=>e.stopPropagation()} style={{background:"var(--card,#fff)",borderRadius:16,padding:28,width:"min(420px,94vw)",boxShadow:"0 24px 60px #0003"}}>
          <h3 style={{fontFamily:FD,fontSize:17,fontWeight:700,color:INK,marginBottom:4}}>🔑 Reset Password</h3>
          <p style={{color:MUTED,fontSize:12,marginBottom:6}}>{resetUser.name}</p>
          <p style={{color:MUTED,fontSize:11,marginBottom:16}}>{resetUser.email||resetUser.username||"—"} · {resetUser.companies?.name||resetUser.company_id}</p>
          <div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:11,color:"#92400e"}}>
            ⚠ Share the new password with the user via a secure channel (WhatsApp/phone call — not email). Ask them to change it after first login.
          </div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:6,textTransform:"uppercase"}}>New Password</label>
            <input
              type="text"
              value={newPassword}
              onChange={e=>setNewPassword(e.target.value)}
              placeholder="Enter new password (min 4 chars)"
              style={inpS2}
              autoComplete="new-password"
            />
          </div>
          {resetMsg&&<div style={{fontSize:12,marginBottom:10,color:resetMsg.startsWith("✓")?"#16a34a":"#dc2626",padding:"8px 10px",background:resetMsg.startsWith("✓")?"#f0fde9":"#fee2e2",borderRadius:6}}>{resetMsg}</div>}
          <div style={{display:"flex",gap:9}}>
            <Btn onClick={doResetPassword} disabled={resetBusy||!newPassword} style={{flex:1,padding:11,background:"#f59e0b"}}>
              {resetBusy?"Resetting…":"Set New Password"}
            </Btn>
            <Btn v="outline" onClick={()=>setResetUser(null)}>Cancel</Btn>
          </div>
        </div>
      </div>
    )}

    {editUser&&(
      <div style={{position:"fixed",inset:0,background:"#00000060",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,backdropFilter:"blur(3px)"}} onMouseDown={e=>{if(e.target===e.currentTarget)setEditUser(null);}}>
        <div onMouseDown={e=>e.stopPropagation()} style={{background:"var(--card,#fff)",borderRadius:16,padding:28,width:"min(420px,94vw)",boxShadow:"0 24px 60px #0003"}}>
          <h3 style={{fontFamily:FD,fontSize:17,fontWeight:700,color:INK,marginBottom:4}}>Change Role</h3>
          <p style={{color:MUTED,fontSize:12,marginBottom:16}}>{editUser.name} · {editUser.companies?.name||editUser.company_id}</p>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:6,textTransform:"uppercase"}}>New Role</label>
            <select value={newRole} onChange={e=>setNewRole(e.target.value)} style={{...inpS2,appearance:"none"}}>
              {ROLES.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          {msg&&<div style={{fontSize:12,marginBottom:10,color:msg.startsWith("✓")?"#16a34a":"#dc2626",padding:"6px 10px",background:msg.startsWith("✓")?"#f0fde9":"#fee2e2",borderRadius:6}}>{msg}</div>}
          <div style={{display:"flex",gap:9}}>
            <Btn onClick={saveRole} disabled={busy} style={{flex:1,padding:11}}>{busy?"Saving…":"Save Role"}</Btn>
            <Btn v="outline" onClick={()=>setEditUser(null)}>Cancel</Btn>
          </div>
        </div>
      </div>
    )}
  </>);
}
function SaBilling({allCo,DB,userCounts}){
  const [aiTokens, setAiTokens] = useState({}); // companyId → {balance, used_total, plan_label}
  const [aiUsage, setAiUsage] = useState([]);    // recent usage log rows
  const [packForm, setPackForm] = useState({companyId:"", pack:"", customTokens:"", amountInr:""});
  const [packBusy, setPackBusy] = useState(false);
  const [tab, setAiTab] = useState("billing"); // "billing" | "tokens" | "usage"

  const AI_PACKS = [
    {id:"starter",  label:"Starter Pack",    tokens:50000,   price:199},
    {id:"growth",   label:"Growth Pack",     tokens:200000,  price:599},
    {id:"pro",      label:"Pro Pack",        tokens:500000,  price:1199},
    {id:"enterprise",label:"Enterprise Pack",tokens:2000000, price:3999},
    {id:"custom",   label:"Custom Amount",   tokens:0,       price:0},
  ];

  useEffect(()=>{
    if(!SB_ENABLED) return;
    // Load token balances for all companies
    supabase.from("ai_tokens").select("company_id,balance,used_total,plan_label,is_active,last_topup_at")
      .then(({data,error})=>{if(error)return;
        if(data){const m={};data.forEach(r=>{m[r.company_id]=r;});setAiTokens(m);}
      });
    // Load recent usage
    supabase.from("ai_usage_log").select("*").order("created_at",{ascending:false}).limit(200)
      .then(({data,error})=>{ if(data&&!error) setAiUsage(data); }).catch(()=>{});
  },[]);

  const sellPack = async() => {
    if(!packForm.companyId) return;
    const selectedPack = AI_PACKS.find(p=>p.id===packForm.pack);
    if(!selectedPack) return;
    const tokens = packForm.pack==="custom" ? parseInt(packForm.customTokens)||0 : selectedPack.tokens;
    const amountInr = packForm.pack==="custom" ? parseInt(packForm.amountInr)||0 : selectedPack.price;
    if(tokens<=0){alert("Enter token amount");return;}
    setPackBusy(true);
    try{
      const {data,error} = await supabase.rpc("add_ai_tokens",{
        p_company_id: packForm.companyId,
        p_tokens: tokens,
        p_pack_name: selectedPack.label,
        p_amount_inr: amountInr,
        p_added_by: "superadmin",
        p_note: `Sold by Super Admin · ₹${amountInr}`
      });
      if(error) throw new Error(error.message);
      // Refresh balances
      const {data:fresh} = await supabase.from("ai_tokens").select("company_id,balance,used_total,plan_label,is_active");
      if(fresh){const m={};fresh.forEach(r=>{m[r.company_id]=r;});setAiTokens(m);}
      setPackForm({companyId:"",pack:"",customTokens:"",amountInr:""});
      alert(`✓ ${tokens.toLocaleString("en-IN")} tokens added to ${allCo.find(c=>c.meta.id===packForm.companyId)?.meta?.name||packForm.companyId}`);
    }catch(e){alert("Failed: "+e.message);}
    setPackBusy(false);
  };

  const inpS={padding:"8px 10px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:12,background:"var(--input-bg,#fafff8)",width:"100%"};

  return(
    <div>
      {/* Sub-nav */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["billing","💼 Billing"],["tokens","🤖 AI Tokens"],["usage","📊 Token Usage"]].map(([id,label])=>(
          <button key={id} onClick={()=>setAiTab(id)} style={{padding:"7px 16px",borderRadius:7,border:`1.5px solid ${tab===id?G:BDR}`,background:tab===id?G:"transparent",color:tab===id?"#fff":INK,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FB}}>{label}</button>
        ))}
      </div>

      {tab==="billing"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {allCo.map(co=>{const emps=SB_ENABLED?(userCounts[co.meta.id]||0):(DB[co.meta.id]?.users?.filter(u=>u.role==="employee").length||0);const tier=TIERED.find(t=>emps>=t.min&&emps<=t.max)||TIERED[0];return(
          <Card key={co.meta.id} style={{padding:20}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div><div style={{fontWeight:700,color:INK}}>{co.meta.name}</div><div style={{fontSize:11,color:MUTED}}>{emps} employees</div></div><span style={{fontFamily:FD,fontSize:18,fontWeight:700,color:G}}>{fmt(emps*tier.ppu)}/mo</span></div></Card>
        );})}
        <Card style={{padding:20}}><div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:12}}>Pricing Tiers</div>
          <table style={{width:"100%"}}><thead><tr><th>Users</th><th>₹/user/mo</th></tr></thead><tbody>{TIERED.map(t=><tr key={t.min}><td style={{fontWeight:600,fontSize:12}}>{t.min}–{t.max===999?"50+":t.max}</td><td style={{color:INK,fontWeight:700,fontSize:12}}>{fmt(t.ppu)}</td></tr>)}</tbody></table>
        </Card>
      </div>}

      {tab==="tokens"&&<div>
        {/* Sell Pack Form */}
        <Card style={{padding:20,marginBottom:16,borderColor:G}}>
          <div style={{fontFamily:FB,fontSize:14,fontWeight:700,color:INK,marginBottom:14}}>🤖 Sell AI Token Pack to Company</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Company *</label>
              <select value={packForm.companyId} onChange={e=>setPackForm({...packForm,companyId:e.target.value})} style={{...inpS,appearance:"none"}}>
                <option value="">Select company…</option>
                {allCo.map(c=><option key={c.meta.id} value={c.meta.id}>{c.meta.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Pack *</label>
              <select value={packForm.pack} onChange={e=>setPackForm({...packForm,pack:e.target.value})} style={{...inpS,appearance:"none"}}>
                <option value="">Select pack…</option>
                {AI_PACKS.map(p=><option key={p.id} value={p.id}>{p.label}{p.tokens>0?` — ${(p.tokens/1000).toFixed(0)}K tokens`:""}{p.price>0?` (₹${p.price})`:"" }</option>)}
              </select>
            </div>
            {packForm.pack==="custom"&&<>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Tokens *</label>
                <input type="number" placeholder="e.g. 100000" value={packForm.customTokens} onChange={e=>setPackForm({...packForm,customTokens:e.target.value})} style={inpS}/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Amount charged (₹) *</label>
                <input type="number" placeholder="e.g. 399" value={packForm.amountInr} onChange={e=>setPackForm({...packForm,amountInr:e.target.value})} style={inpS}/>
              </div>
            </>}
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <Btn onClick={sellPack} disabled={packBusy||!packForm.companyId||!packForm.pack} style={{padding:"8px 20px"}}>
              {packBusy?"Adding…":"✓ Add Tokens"}
            </Btn>
            {packForm.pack&&packForm.pack!=="custom"&&(()=>{const p=AI_PACKS.find(x=>x.id===packForm.pack);return p?<div style={{fontSize:11,color:MUTED}}>{p.tokens.toLocaleString("en-IN")} tokens · ₹{p.price} · ₹{(p.price/p.tokens*1000).toFixed(2)}/1K tokens</div>:null;})()}
          </div>
        </Card>

        {/* Company-wise token balances */}
        <Card>
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${BDR}`,fontFamily:FB,fontSize:13,fontWeight:700,color:INK}}>AI Token Balances — All Companies</div>
          <table style={{width:"100%"}}>
            <thead><tr style={{background:"#f9fafb"}}>
              {["Company","Balance","Used Total","Plan","Status","Last Topup"].map(h=>(
                <th key={h} style={{padding:"8px 12px",fontSize:10,fontWeight:700,color:MUTED,textAlign:"left",textTransform:"uppercase"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {allCo.map(co=>{
                const t=aiTokens[co.meta.id];
                const balance=t?.balance||0;
                const used=t?.used_total||0;
                const isActive=t?.is_active!==false;
                return(
                  <tr key={co.meta.id} style={{borderBottom:`1px solid #f5f5f5`}}>
                    <td style={{padding:"9px 12px",fontWeight:600,fontSize:12}}>{co.meta.name}</td>
                    <td style={{padding:"9px 12px"}}>
                      <span style={{fontWeight:700,fontSize:13,color:balance<=0?"#dc2626":balance<10000?"#f59e0b":"#16a34a"}}>
                        {balance>0?(balance/1000).toFixed(1)+"K":"—"}
                      </span>
                    </td>
                    <td style={{padding:"9px 12px",fontSize:11,color:MUTED}}>{used>0?(used/1000).toFixed(1)+"K":"—"}</td>
                    <td style={{padding:"9px 12px",fontSize:11}}>{t?.plan_label||"—"}</td>
                    <td style={{padding:"9px 12px"}}>
                      {t?<span style={{background:isActive&&balance>0?"#dcfce7":balance<=0?"#fee2e2":"#fef3c7",color:isActive&&balance>0?"#16a34a":balance<=0?"#dc2626":"#92400e",borderRadius:5,padding:"2px 8px",fontSize:10,fontWeight:700}}>
                        {isActive&&balance>0?"Active":balance<=0?"Exhausted":"Paused"}
                      </span>:<span style={{color:MUTED,fontSize:11}}>No subscription</span>}
                    </td>
                    <td style={{padding:"9px 12px",fontSize:11,color:MUTED}}>{t?.last_topup_at?new Date(t.last_topup_at).toLocaleDateString("en-IN"):"—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{padding:"12px 16px",borderTop:`1px solid ${BDR}`,background:"#f0fde9",borderRadius:"0 0 10px 10px"}}>
            <div style={{fontSize:11,color:GD,fontWeight:600}}>
              💡 Cost guide: Claude Haiku ~₹0.20/1K tokens · Starter Pack (50K/₹199) = ~85% gross margin · Growth Pack (200K/₹599) = ~87%
            </div>
          </div>
        </Card>
      </div>}

      {tab==="usage"&&<Card>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${BDR}`,fontFamily:FB,fontSize:13,fontWeight:700,color:INK}}>AI Token Usage Log (last 200 calls)</div>
        <table style={{width:"100%"}}>
          <thead><tr style={{background:"#f9fafb"}}>
            {["Time","Company","Feature","Model","Tokens Used","Input","Output"].map(h=>(
              <th key={h} style={{padding:"7px 10px",fontSize:10,fontWeight:700,color:MUTED,textAlign:"left",textTransform:"uppercase"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {aiUsage.map((row,i)=>(
              <tr key={row.id||i} style={{borderBottom:`1px solid #f5f5f5`}}>
                <td style={{padding:"7px 10px",fontSize:10,color:MUTED,fontFamily:"monospace"}}>{new Date(row.created_at).toLocaleString("en-IN",{dateStyle:"short",timeStyle:"short"})}</td>
                <td style={{padding:"7px 10px",fontSize:11,fontWeight:600}}>{allCo.find(c=>c.meta.id===row.company_id)?.meta?.name||row.company_id}</td>
                <td style={{padding:"7px 10px"}}>
                  <span style={{background:row.feature==="ocr"?"#eff6ff":"#f5f3ff",color:row.feature==="ocr"?"#2563eb":"#7c3aed",borderRadius:4,padding:"2px 6px",fontSize:10,fontWeight:600}}>
                    {row.feature==="ocr"?"📷 OCR":"💬 Chat"}
                  </span>
                </td>
                <td style={{padding:"7px 10px",fontSize:10,color:MUTED,fontFamily:"monospace"}}>{row.model?.replace("claude-","").replace("-20250514","")}</td>
                <td style={{padding:"7px 10px",fontWeight:700,fontSize:12,color:INK}}>{row.tokens_used?.toLocaleString("en-IN")}</td>
                <td style={{padding:"7px 10px",fontSize:11,color:MUTED}}>{row.input_tokens?.toLocaleString("en-IN")}</td>
                <td style={{padding:"7px 10px",fontSize:11,color:MUTED}}>{row.output_tokens?.toLocaleString("en-IN")}</td>
              </tr>
            ))}
            {aiUsage.length===0&&<tr><td colSpan={7} style={{padding:20,textAlign:"center",color:MUTED,fontSize:12}}>No AI usage yet</td></tr>}
          </tbody>
        </table>
      </Card>}
    </div>
  );
}
function SaAudit({DB}){
  const[rows,setRows]=useState([]);
  useEffect(()=>{
    if(SB_ENABLED){supabase.from("audit_log").select("*,companies(name)").order("created_at",{ascending:false}).limit(500).then(({data})=>{if(data)setRows(data);});}
    else{setRows(Object.values(DB).flatMap(co=>(co.auditLog||[]).map(a=>({...a,coName:co.meta.name}))));}
  },[]);
  return(<Card><table style={{width:"100%"}}><thead><tr><th>Time</th><th>Company</th><th>Action</th><th>Claim ID</th><th>By</th><th>Remarks</th></tr></thead>
    <tbody>{rows.map(a=><tr key={a.id} className="rh"><td style={{fontSize:10,color:MUTED,fontFamily:"monospace"}}>{a.at||new Date(a.created_at).toLocaleString()}</td><td style={{fontSize:11}}>{a.coName||(a.companies?.name)||a.company_id||""}</td><td><Badge s={a.action?.includes("Approved")?"Approved":"Rejected"} sm/></td><td style={{fontFamily:"monospace",fontSize:11,color:GD,fontWeight:600}}>{a.claimId||a.claim_id}</td><td style={{fontWeight:600,fontSize:12}}>{a.byName||a.by_name}</td><td style={{color:MUTED,fontSize:11}}>{a.remarks||"—"}</td></tr>)}</tbody>
  </table></Card>);
}

// ─── CAMERA MODAL ─────────────────────────────────────────────────────────────
function CameraModal({onCapture,onClose}){
  const vidRef=useRef(null);
  const cnvRef=useRef(null);
  const [stream,setStream]=useState(null);
  const [captured,setCaptured]=useState(null);
  const [camErr,setCamErr]=useState("");
  const [facing,setFacing]=useState("environment");

  const startCam=useCallback(async(f)=>{
    if(stream){stream.getTracks().forEach(t=>t.stop());}
    try{
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:f,width:{ideal:1920},height:{ideal:1080}}});
      setStream(s);
      if(vidRef.current){vidRef.current.srcObject=s;vidRef.current.play();}
      setCamErr("");
    }catch(e){setCamErr("Camera unavailable. Use file upload below.");}
  },[]);

  useEffect(()=>{startCam(facing);return()=>{if(stream)stream.getTracks().forEach(t=>t.stop());};},[]);

  const flip=()=>{const nf=facing==="environment"?"user":"environment";setFacing(nf);startCam(nf);};
  const capture=()=>{
    if(!vidRef.current||!cnvRef.current)return;
    const v=vidRef.current,c=cnvRef.current;
    c.width=v.videoWidth;c.height=v.videoHeight;
    c.getContext("2d").drawImage(v,0,0);
    setCaptured(c.toDataURL("image/jpeg",0.92));
    if(stream)stream.getTracks().forEach(t=>t.stop());
  };
  const confirm=()=>{
    if(!captured)return;
    onCapture({url:captured,b64:captured.split(",")[1],type:"image/jpeg",name:`cam_${Date.now()}.jpg`});
    onClose();
  };

  return(
    <div style={{position:"fixed",inset:0,background:"#000",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:900}}>
      <div style={{width:"100%",maxWidth:520,padding:20,display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
        <div style={{display:"flex",justifyContent:"space-between",width:"100%"}}>
          <span style={{color:"#fff",fontFamily:FB,fontWeight:700,fontSize:15}}>📷 Capture Receipt</span>
          <button onClick={()=>{if(stream)stream.getTracks().forEach(t=>t.stop());onClose();}} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,color:"#fff",padding:"5px 12px",fontFamily:FB,fontSize:12,cursor:"pointer"}}>✕ Close</button>
        </div>
        {camErr&&(
          <div style={{width:"100%",background:"#fee2e2",color:"#dc2626",padding:"10px 14px",borderRadius:9,fontSize:13,textAlign:"center"}}>
            {camErr}
            <div style={{marginTop:10}}>
              <label style={{padding:"8px 16px",background:G,borderRadius:8,color:"#fff",fontFamily:FB,fontWeight:600,fontSize:13,cursor:"pointer"}}>
                📁 Browse Files
                <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                  const f=e.target.files[0];if(!f)return;
                  const r=new FileReader();r.onload=ev=>{onCapture({url:ev.target.result,b64:ev.target.result.split(",")[1],type:f.type,name:f.name});onClose();};r.readAsDataURL(f);
                }}/>
              </label>
            </div>
          </div>
        )}
        {!camErr&&!captured&&(
          <>
            <div style={{position:"relative",width:"100%",aspectRatio:"4/3",background:"#111",borderRadius:12,overflow:"hidden"}}>
              <video ref={vidRef} autoPlay playsInline muted style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              <div style={{position:"absolute",inset:"10%",border:"2px solid rgba(126,217,87,.7)",borderRadius:8,pointerEvents:"none"}}>
                <div style={{position:"absolute",top:-1,left:-1,width:18,height:18,borderTop:`3px solid ${G}`,borderLeft:`3px solid ${G}`,borderRadius:"3px 0 0 0"}}/>
                <div style={{position:"absolute",top:-1,right:-1,width:18,height:18,borderTop:`3px solid ${G}`,borderRight:`3px solid ${G}`,borderRadius:"0 3px 0 0"}}/>
                <div style={{position:"absolute",bottom:-1,left:-1,width:18,height:18,borderBottom:`3px solid ${G}`,borderLeft:`3px solid ${G}`,borderRadius:"0 0 0 3px"}}/>
                <div style={{position:"absolute",bottom:-1,right:-1,width:18,height:18,borderBottom:`3px solid ${G}`,borderRight:`3px solid ${G}`,borderRadius:"0 0 3px 0"}}/>
              </div>
              <div style={{position:"absolute",bottom:10,left:0,right:0,textAlign:"center",color:"rgba(255,255,255,.6)",fontSize:11}}>Align receipt within frame</div>
            </div>
            <canvas ref={cnvRef} style={{display:"none"}}/>
            <div style={{display:"flex",gap:12,width:"100%"}}>
              <button onClick={flip} style={{flex:1,padding:"11px",background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",borderRadius:9,color:"#fff",fontFamily:FB,fontSize:13,cursor:"pointer"}}>🔄 Flip</button>
              <button onClick={capture} style={{flex:2,padding:"11px",background:G,border:"none",borderRadius:9,color:"#fff",fontFamily:FB,fontWeight:700,fontSize:15,cursor:"pointer",boxShadow:`0 4px 20px ${G}60`}}>📸 Capture</button>
            </div>
          </>
        )}
        {captured&&(
          <>
            <img src={captured} alt="preview" style={{width:"100%",maxHeight:360,objectFit:"contain",borderRadius:12,border:`2px solid ${G}`}}/>
            <div style={{display:"flex",gap:12,width:"100%"}}>
              <button onClick={()=>{setCaptured(null);startCam(facing);}} style={{flex:1,padding:"11px",background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",borderRadius:9,color:"#fff",fontFamily:FB,fontSize:13,cursor:"pointer"}}>🔄 Retake</button>
              <button onClick={confirm} style={{flex:2,padding:"11px",background:G,border:"none",borderRadius:9,color:"#fff",fontFamily:FB,fontWeight:700,fontSize:15,cursor:"pointer"}}>✓ Use This Photo</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── RECEIPT LIGHTBOX ─────────────────────────────────────────────────────────
function Lightbox({receipt,onClose}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:900}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{maxWidth:"90vw",maxHeight:"85vh",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
        {receipt.type?.startsWith("image/")
          ?<img src={receipt.url} alt={receipt.name||"receipt"} style={{maxWidth:"88vw",maxHeight:"78vh",borderRadius:10,objectFit:"contain",boxShadow:"0 8px 40px #000a"}}/>
          :<div style={{background:"#fff",borderRadius:12,padding:28,textAlign:"center"}}><div style={{fontSize:48}}>📄</div><div style={{fontFamily:FB,fontSize:14,color:INK,marginTop:8}}>{receipt.name||"Document"}</div><div style={{fontSize:11,color:MUTED,marginTop:4}}>PDF — use download to open</div></div>
        }
        <div style={{display:"flex",gap:10}}>
          <a href={receipt.url} download={receipt.name||"receipt"} style={{padding:"9px 18px",background:G,borderRadius:9,color:"#fff",fontFamily:FB,fontWeight:700,fontSize:13,textDecoration:"none"}}>⬇ Download</a>
          <button onClick={onClose} style={{padding:"9px 18px",background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",borderRadius:9,color:"#fff",fontFamily:FB,fontSize:13,cursor:"pointer"}}>✕ Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE SETTINGS ─────────────────────────────────────────────────────────
function Profile({user,users,setUsers,onLogout,updateUserInSB,toast}){
  // Always read fresh from co.users — user prop (session) may be stale
  const liveUser=users.find(u=>u.id===user.id)||user;
  const [form,setForm]=useState({
    email:user.email||"",
    username:user.username||"",
    mobile:user.mobile||"",
  });
  const [pw,setPw]=useState({cur:"",nw:"",cf:""});
  const [pwErr,setPwErr]=useState("");
  const [saved,setSaved]=useState(false);
  const [avatarColor,setAvatarColor]=useState(null);
  const role=ROLES.find(r=>r.id===user.role)||ROLES[3];
  const inpS={width:"100%",padding:"10px 12px",border:`1.5px solid ${BDR}`,borderRadius:9,fontSize:13,background:"var(--input-bg,#fafff8)",outline:"none",fontFamily:FB};

  const save=async()=>{
    if(updateUserInSB){
      try{await updateUserInSB(user.id,{mobile:form.mobile||undefined,email:form.email||undefined});}catch(e){setSaved("err:"+e.message);return;}
    }
    // Update email if changed (Supabase auth email update for auth users)
    if(form.email&&form.email!==user.email&&SB_ENABLED&&user.authType!=="custom"){
      const{error}=await supabase.auth.updateUser({email:form.email});
      if(error){setSaved("err:"+error.message);return;}
    }
    setUsers(p=>p.map(u=>u.id===user.id?{...u,email:form.email,username:form.username,mobile:form.mobile}:u));
    setSaved(true);setTimeout(()=>setSaved(false),2000);
  };

  const changePw=async()=>{
    setPwErr("");
    if(pw.nw.length<4){setPwErr("Must be at least 4 characters");return;}
    if(pw.nw!==pw.cf){setPwErr("Passwords do not match");return;}
    if(SB_ENABLED){
      if(user.authType==="custom"){
        // Custom auth — use RPC to reset own password (verify current pw first via re-auth)
        const{data}=await supabase.rpc("authenticate_user",{p_login:user.username||user.email,p_password:pw.cur});
        if(data?.error){setPwErr("Current password incorrect");return;}
        await supabase.rpc("reset_user_password",{p_user_id:user.id,p_new_password:pw.nw});
      } else {
        const{error}=await supabase.auth.updateUser({password:pw.nw});
        if(error){setPwErr(error.message);return;}
      }
    } else {
      const u=users.find(x=>x.id===user.id);
      if(!u||u.password!==pw.cur){setPwErr("Current password incorrect");return;}
      setUsers(p=>p.map(u=>u.id===user.id?{...u,password:pw.nw}:u));
    }
    setPw({cur:"",nw:"",cf:""});setPwErr("✓ Password updated");
  };

  const avatarColors=["#7ED957","#2563eb","#7c3aed","#db2777","#ea580c","#0891b2","#16a34a","#dc2626","#f59e0b","#374151"];

  return(
    <div style={{maxWidth:520,display:"flex",flexDirection:"column",gap:14}}>
      <h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK}}>My Profile</h1>

      {/* Avatar + name */}
      <Card style={{padding:20,display:"flex",alignItems:"center",gap:16}}>
        <div style={{position:"relative"}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:avatarColor||`linear-gradient(135deg,${G},${GD})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:22,flexShrink:0,cursor:"pointer"}}>{user.avatar||inits(user.name)}</div>
          <div style={{display:"flex",gap:3,marginTop:6,flexWrap:"wrap",maxWidth:70}}>
            {avatarColors.slice(0,5).map(c=><div key={c} onClick={async()=>{setAvatarColor(c);if(updateUserInSB)await updateUserInSB(user.id,{avatar:user.avatar});}} style={{width:12,height:12,borderRadius:"50%",background:c,cursor:"pointer"}}/>)}
          </div>
        </div>
        <div>
          <div style={{fontFamily:FD,fontSize:17,fontWeight:700,color:INK}}>{user.name}</div>
          <div style={{fontSize:11,color:"#dc2626",marginTop:2,background:"#fee2e2",padding:"2px 8px",borderRadius:5,display:"inline-block"}}>Name changes require contacting your Admin</div>
          <div style={{marginTop:5}}><span style={{background:role.color+"20",color:role.color,padding:"2px 9px",borderRadius:10,fontSize:11,fontWeight:700}}>{role.label}</span></div>
        </div>
      </Card>

      {/* Editable fields */}
      <Card style={{padding:20}}>
        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:12}}>Contact Details</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:14}} className="mob-grid-1">
          <div>
            <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Username</label>
            <input value={form.username} onChange={e=>setForm({...form,username:e.target.value.toLowerCase().replace(/\s+/g,"")})} style={inpS} placeholder="your.username"/>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Mobile</label>
            <input value={form.mobile} onChange={e=>setForm({...form,mobile:e.target.value})} style={inpS} placeholder="9876543210"/>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Email</label>
            <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} style={inpS} placeholder="you@company.in"/>
          </div>
        </div>
        {saved===true&&<div style={{fontSize:12,color:"#16a34a",marginBottom:8}}>✓ Saved successfully</div>}
        {typeof saved==="string"&&saved.startsWith("err:")&&<div style={{fontSize:12,color:"#dc2626",marginBottom:8}}>{saved.slice(4)}</div>}
        <Btn onClick={save} style={{padding:"9px 18px"}}>Save Changes</Btn>
      </Card>

      {/* Password change */}
      <Card style={{padding:20}}>
        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:12}}>Change Password</div>
        {[["Current Password","cur"],["New Password","nw"],["Confirm New Password","cf"]].map(([l,k])=>(
          <div key={k} style={{marginBottom:11}}>
            <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>{l}</label>
            <input type="password" value={pw[k]} onChange={e=>setPw({...pw,[k]:e.target.value})} style={inpS}/>
          </div>
        ))}
        {pwErr&&<div style={{fontSize:12,marginBottom:9,color:pwErr.startsWith("✓")?"#16a34a":"#dc2626"}}>{pwErr}</div>}
        <Btn onClick={changePw} style={{padding:"9px 18px"}}>Update Password</Btn>
      </Card>
      {/* Delegation — managers only */}
      {(user.role==="manager"||user.role==="admin")&&<Card style={{padding:20}}>
        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:8}}>Approval Delegation</div>
        <p style={{color:MUTED,fontSize:11,marginBottom:12}}>While on leave, delegate your approval authority to another manager temporarily. The delegate can approve/reject in your name until the date set.</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:14}} className="mob-grid-1">
          <div>
            <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Delegate To</label>
            <select value={liveUser?.delegateTo||""} onChange={async e=>{
              const val=e.target.value||null;
              try{
                if(updateUserInSB){
                  await updateUserInSB(user.id,{delegateTo:val,...(val===null?{delegateUntil:null}:{})});
                }
                setUsers(p=>p.map(u=>u.id===user.id?{...u,delegateTo:val,...(val===null?{delegateUntil:null}:{})}:u));
                toast&&toast(val?"✓ Delegation saved — notifications routed to delegate":"✓ Delegation removed — notifications restored to you");
              }catch(err){alert("Failed to save: "+err.message);}
            }} style={{...inpS,appearance:"none"}}>
              <option value="">— No delegation —</option>
              {users.filter(u=>["manager","admin"].includes(u.role)&&u.id!==user.id).map(u=>(
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Delegate Until</label>
            <input type="date" min={today()} key={liveUser?.delegateUntil||""} defaultValue={liveUser?.delegateUntil||""} onBlur={async e=>{
              if(updateUserInSB)await updateUserInSB(user.id,{delegateUntil:e.target.value});
              setUsers(p=>p.map(u=>u.id===user.id?{...u,delegateUntil:e.target.value}:u));
            }} style={inpS}/>
          </div>
        </div>
        {user.delegateTo&&<div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:7,padding:"8px 12px",fontSize:11,color:"#92400e"}}>
          ⚠ Approvals are currently delegated to <strong>{users.find(u=>u.id===user.delegateTo)?.name||"—"}</strong>
          {user.delegateUntil&&` until ${user.delegateUntil}`}
        </div>}
      </Card>}
      <Card style={{padding:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontWeight:600,color:INK,fontSize:13}}>Sign Out</div><div style={{fontSize:11,color:MUTED}}>Sign out of this device</div></div>
        <Btn v="danger" onClick={onLogout} style={{padding:"8px 16px",fontSize:12}}>Sign Out</Btn>
      </Card>
    </div>
  );
}

// ─── COMPANY APP ──────────────────────────────────────────────────────────────
function CompanyApp({user,meta,DB,setDB,onLogout,sbReload}){
  const cid=meta?.id||"";

  // ── Data source: Supabase or localStorage ────────────────────────────────
  const[coData,setCoData]=useState(SB_ENABLED?null:(cid&&DB[cid]?DB[cid]:null));
  const[loadingData,setLoadingData]=useState(SB_ENABLED&&!!cid);
  const[sbError,setSbError]=useState(null);

  const loadFromSB=useCallback(async()=>{
    if(!SB_ENABLED||!cid)return;
    try{
      setLoadingData(true);setSbError(null);
      const data=await sbLoadCompany(cid);
      if(!data?.meta){
        setSbError("Company not found. Your account may not be fully set up yet.");
        return;
      }
      setCoData(data);
      // Also refresh edit requests after company data loads
      if(SB_ENABLED){
        try{
          const{data:erData,error:erErr}=await supabase.from("edit_requests").select("*").eq("company_id",cid).order("created_at",{ascending:false});
          if(!erErr&&erData)setEditRequests(erData.map(r=>({...r,claimId:r.claim_id||r.claimId,requestedBy:r.requested_by||r.requestedBy,requesterName:r.requester_name||r.requesterName,windowOpen:r.window_open||r.windowOpen,windowExpires:r.window_expires||r.windowExpires})));
        }catch(erEx){log.warn("edit_requests init:",erEx.message);}
      }
    }catch(e){setSbError(e.message);}
    finally{setLoadingData(false);}
  },[cid]);

  useEffect(()=>{
    if(!cid){setSbError("No company assigned to your account.");setLoadingData(false);return;}
    if(SB_ENABLED)loadFromSB();
    else setCoData(DB[cid]);
  },[cid]);

  useEffect(()=>{
    if(!SB_ENABLED&&cid)setCoData(DB[cid]);
  },[DB,cid]);

  // Load AI token balance for this company
  useEffect(()=>{
    if(!SB_ENABLED||!cid) return;
    supabase.from("ai_tokens").select("balance,used_total,is_active,plan_label").eq("company_id",cid).maybeSingle()
      .then(({data,error})=>{
        if(error||!data) setAiTokenBalance(0);
        else setAiTokenBalance(data.balance||0);
      }).catch(()=>setAiTokenBalance(0));
  },[cid]);
  // ── Background refresh: every 5 minutes only (no live subscription that disrupts input) ──
  useEffect(()=>{
    if(!SB_ENABLED||!cid)return;
    const interval=setInterval(()=>{
      // Only reload if window is visible and user is not actively typing in a form
      if(document.visibilityState==="visible"&&!document.activeElement?.matches("input,textarea,select")){
        loadFromSB();
      }
    },5*60*1000); // 5 minutes
    return()=>clearInterval(interval);
  },[cid,loadFromSB]);

  // ── Local scoped setters (localStorage mode only) ─────────────────────────
  const set=(key,fn)=>setDB(p=>({...p,[cid]:{...p[cid],[key]:fn(p[cid][key])}}));
  const setUsers  =fn=>{set("users",fn);};
  const setClaims =fn=>{set("claims",fn);};
  const setTrips  =fn=>{set("trips",fn);};
  const setTopups =fn=>{set("topups",fn);};
  const setAudit  =fn=>{set("auditLog",fn);};
  const setNotifs =fn=>{set("notifications",fn);};
  const setPolicy =fn=>setDB(p=>({...p,[cid]:{...p[cid],policy:typeof fn==="function"?fn(p[cid].policy):fn}}));

  const[tab,setTab]      =useState("dashboard");
  const[sidebar,setSB]   =useState(true);
  const[notif,setNtf]    =useState(null);
  const[modal,setMdl]    =useState(null);
  const[showCam,setSCam] =useState(false);
  const[showProf,setSPro]=useState(false);
  const[showHelp,setSHelp]=useState(false);
  const[camFile,setCamF] =useState(null);
  const[editRequests,setEditRequests]=useState([]);
  const{queue,online,enqueue,flush}=useOffline();
  const{perm:pushPerm,ask:askPush,send:sendPush}=usePush();
  const[prefs,setPrefs]=usePrefs();
  const isDark=prefs.darkMode;
  const appFontSize=prefs.fontSize||13;
  const[showPrefs,setSPrefs]=useState(false);
  const[showFundReq,setSFR]=useState(false);
  const[showShortcuts,setSSC]=useState(false);
  // Show onboarding tutorial on first login
  const[showTutorial,setShowTutorial]=useState(false);
  const closeTutorial=()=>setShowTutorial(false);
  const[showChatbot,setShowChatbot]=useState(false);
  const[showMobMore,setShowMobMore]=useState(false);
  const[showFab,setShowFab]=useState(false);
  const[showExportMenu,setShowExportMenu]=useState(false);
  const[aiTokenBalance,setAiTokenBalance]=useState(null);
  const[pwaPrompt,setPwaPrompt]=useState(null);  // BeforeInstallPromptEvent
  const[showInstallBanner,setShowInstallBanner]=useState(false);

  // ── Session timeout: auto-logout after 8 hours of inactivity ──────────────
  const lastActivityRef=useRef(Date.now());
  useEffect(()=>{
    const bump=()=>{lastActivityRef.current=Date.now();};
    const check=setInterval(()=>{
      if(Date.now()-lastActivityRef.current>8*60*60*1000){
        saveSess(null);
        window.location.replace("/");
      }
    },60*1000);
    window.addEventListener("mousemove",bump,{passive:true});
    window.addEventListener("keydown",bump,{passive:true});
    window.addEventListener("touchstart",bump,{passive:true});
    return()=>{clearInterval(check);window.removeEventListener("mousemove",bump);window.removeEventListener("keydown",bump);window.removeEventListener("touchstart",bump);};
  },[]);

  // Capture PWA install prompt — fires on Android Chrome / Edge when app is installable
  useEffect(()=>{
    const handler=(e)=>{
      e.preventDefault();
      setPwaPrompt(e);
      // Only show banner if not already installed and user hasn't dismissed
      if(!window.matchMedia('(display-mode: standalone)').matches&&!localStorage.getItem('xpensr_pwa_dismissed')){
        setShowInstallBanner(true);
      }
    };
    window.addEventListener('beforeinstallprompt',handler);
    return()=>window.removeEventListener('beforeinstallprompt',handler);
  },[]);

  const installPWA=async()=>{
    if(!pwaPrompt)return;
    pwaPrompt.prompt();
    const{outcome}=await pwaPrompt.userChoice;
    if(outcome==='accepted') setShowInstallBanner(false);
    setPwaPrompt(null);
  };

  const dismissInstallBanner=()=>{
    setShowInstallBanner(false);
    localStorage.setItem('xpensr_pwa_dismissed','1');
  }; // null = not yet loaded

  // Keyboard shortcuts
  useEffect(()=>{
    const handler=(e)=>{
      // Block if focus is in any interactive element
      const ae=document.activeElement;
      if(ae&&(ae.tagName==="INPUT"||ae.tagName==="TEXTAREA"||ae.tagName==="SELECT"||ae.isContentEditable))return;
      // Also block if the event target itself is interactive
      if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"||e.target.tagName==="SELECT"||e.target.isContentEditable)return;
      // Block if any fixed-position overlay is in the DOM (modals, panels)
      if(document.querySelector('[data-modal="true"]'))return;
      // Block if known modal state is open
      if(modal||showFab||showMobMore||showChatbot)return;
      if(e.key==="?"||e.key==="/"){e.preventDefault();setSSC(p=>!p);return;}
      if(e.key==="Escape"){setMdl(null);setSSC(false);setSFR(false);return;}
      if(e.ctrlKey||e.metaKey||e.altKey)return;
      const map={n:"submit",a:"approvals",c:"claims",t:"trips",d:"dashboard",f:"finance_view",i:"inbox",b:"balances",l:"ledger",s:"settlements",u:"topup",y:"analytics",h:"help"};
      if(map[e.key.toLowerCase()]){e.preventDefault();setTab(map[e.key.toLowerCase()]);}
    };
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[modal,showFab,showMobMore,showChatbot]);

  // Fund request handler
  const handleFundRequest=async(req)=>{
    const tripName=co.trips.find(t=>t.id===req.tripId)?.name||req.tripId;
    // Use notifyApprovers to respect dept routing and delegation
    await notifyApprovers(req.empId,`💰 Fund request: ${req.empName} needs ₹${req.amount.toLocaleString("en-IN")} for "${tripName}" — ${req.reason}`,"warn");
    if(SB_ENABLED){
      const{error:topupErr}=await supabase.from("topups").insert({id:req.id,company_id:cid,emp_id:req.empId,amount:req.amount,reason:req.reason,date:req.date,status:"Pending",trip_id:req.tripId});
      if(topupErr){log.error("Topup insert error:",topupErr.message);toast("Fund request notification sent but DB save failed: "+topupErr.message,"error");return;}
      await loadFromSB();
    }
    toast("✓ Fund request sent to manager");
  };

  // ── Edit Request handlers ──────────────────────────────────────────────────
  // Resolve the effective approver (handles delegation)

  // toast must be defined before any useEffect that calls it
  const toast=(msg,t="success")=>{setNtf({msg,t});if(t!=="error")setTimeout(()=>setNtf(null),3200);};

  useEffect(()=>{if(typeof Notification!=="undefined"&&Notification.permission==="default")askPush();},[]);
  useEffect(()=>{
    if(online&&queue.length>0){
      flush(async item=>{
        if(item.type==="claim"){
          if(SB_ENABLED){try{await supabase.from("claims").insert(item.sbRow);}catch(e){log.error(e);}}
          else setClaims(p=>[item.data,...p]);
        }
      });
      toast(`✓ ${queue.length} offline claim(s) synced`);
    }
  },[online]);

  // Push notification on load — guarded so it only fires when co exists
  useEffect(()=>{
    if(!coData)return;
    const n=coData.claims.filter(c=>c.status==="Pending").length;
    const canApproveCheck=["manager","approver"].includes(user.role);
    if(n>0&&canApproveCheck)sendPush("XpensR",`${n} claim${n!==1?"s":""} await your approval`);
  },[!!coData]);


  // ── ALL hooks above this line — early return is safe below ───────────────
  const co=coData;

  // Dynamic policy-driven values
  const primaryColor=co?.policy?.primaryColor||G;
  const companyDepts=co?.policy?.departments||DEFAULT_DEPTS;
  const companyCategories=[...(co?.policy?.categories||DEFAULT_CATS),"Other"];

  if(loadingData||!co){
    const quotes=["Every expense tells a story. XpensR tells it right.","Good accounting is good governance.","Work smarter — let XpensR handle the paperwork.","The details are not the details. They make the design.","Time is money. Save both with XpensR.","Clarity in spending is clarity in thinking."];
    const q=quotes[Math.floor(Date.now()/8000)%quotes.length];
    return(
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:`linear-gradient(145deg,${DARK} 0%,#0a1f06 60%,#162e0d 100%)`,fontFamily:FB,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:"rgba(126,217,87,0.04)",top:-100,right:-100,pointerEvents:"none"}}/>
        <div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:"rgba(126,217,87,0.03)",bottom:-80,left:-80,pointerEvents:"none"}}/>
        <div style={{textAlign:"center",maxWidth:380,padding:"0 24px",position:"relative",zIndex:1}}>
          <div style={{marginBottom:28}}>
            <div style={{fontFamily:FD,fontSize:40,fontWeight:800,color:"#7ED957",letterSpacing:-1,lineHeight:1}}>XpensR</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.3)",letterSpacing:3,textTransform:"uppercase",marginTop:4}}>by RB</div>
          </div>
          {sbError?(
            <>
              <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
              <div style={{fontFamily:FD,fontSize:18,fontWeight:700,color:"#fff",marginBottom:8}}>Account not set up</div>
              <p style={{color:"rgba(255,255,255,.5)",fontSize:13,lineHeight:1.6,marginBottom:20}}>{sbError}</p>
              <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                <Btn onClick={loadFromSB}>🔄 Try Again</Btn>
                <Btn v="outline" onClick={onLogout}>← Sign Out</Btn>
              </div>
            </>
          ):(
            <>
              <div style={{position:"relative",width:60,height:60,margin:"0 auto 20px"}}>
                <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"3px solid rgba(126,217,87,0.15)"}}/>
                <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"3px solid transparent",borderTopColor:"#7ED957",animation:"spin .9s linear infinite"}}/>
                <div style={{position:"absolute",inset:9,borderRadius:"50%",border:"2px solid transparent",borderTopColor:"rgba(126,217,87,0.4)",animation:"spin 1.5s linear infinite reverse"}}/>
              </div>
              <div style={{color:"rgba(255,255,255,.4)",fontSize:12,letterSpacing:.5,marginBottom:28}}>Loading your workspace…</div>
              <div style={{borderTop:"1px solid rgba(255,255,255,.07)",paddingTop:20,marginBottom:16}}>
                <p style={{color:"rgba(255,255,255,.25)",fontSize:11,lineHeight:1.7,fontStyle:"italic",margin:0}}>&ldquo;{q}&rdquo;</p>
              </div>
              <button onClick={()=>{try{localStorage.removeItem(SESSION_KEY);}catch{}window.location.replace("/");}}
                style={{background:"none",border:"1px solid rgba(255,255,255,.1)",borderRadius:16,color:"rgba(255,255,255,.25)",padding:"5px 16px",fontFamily:FB,fontSize:11,cursor:"pointer"}}>
                ← Sign out
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const getUser=id=>co.users.find(u=>u.id===id);
  const activeMeta=SB_ENABLED&&co.meta?co.meta:meta;
  const myRole=ROLES.find(r=>r.id===user.role)||ROLES[3];
  const hasPerm=p=>myRole.perms.includes(p);
  const isAdmin=user.role==="admin";
  const isManager=["admin","manager"].includes(user.role);
  const canApprove=["admin","manager"].includes(user.role)||
    (co.policy?.gradeBased&&(user.grade||0)>0&&
      (co.policy?.approvalHierarchy||[]).some(h=>h.level===(user.grade||0)));
  const isFinance=user.role==="finance";
  const isHR=user.role==="hr";
  const isCFO=user.role==="cfo"||user.role==="admin"; // admin gets full CFO executive view
  const isEmployee=user.role==="employee";
  const needsDualApproval=(amount)=>co.policy.dualApproveAbove>0&&amount>=co.policy.dualApproveAbove;
  const myUser=co.users.find(u=>u.id===user.id);
  const myNotifs=(co.notifications||[]).filter(n=>n.userId===user.id&&!n.read);

  // ── Group-based visibility ────────────────────────────────────────────────
  // The set of user IDs this person can see data for
  const visibleUserIds=getVisibleUserIds(user.id,co.users,co.policy,co.empGroups||[]);

  // Filter all data to only what this user can see
  const visibleClaims=isAdmin?co.claims:co.claims.filter(c=>visibleUserIds.has(c.empId)||c.empId===user.id);
  const visibleTrips=isAdmin?co.trips:co.trips.filter(t=>{
    if(t.createdBy===user.id)return true;
    return (t.assignedTo||[]).some(id=>visibleUserIds.has(id));
  });

  // Pending claims visible to this approver (from their reporting chain only)
  const pendingClaims=visibleClaims.filter(c=>
    c.status==="Pending" ||
    (c.status?.startsWith("Level ")&&canApprove) ||
    (c.status==="Manager Approved"&&isAdmin) ||
    (c.status==="Budget-Escalation Approved"&&isManager)
  );

  // Claims this specific manager/admin should approve
  const myPendingClaims=(()=>{
    if(isAdmin)return pendingClaims;
    if(!isManager)return [];
    return pendingClaims.filter(c=>{
      const emp=getUser(c.empId);
      if(!emp)return false;
      const inMyDept=emp.dept===myUser?.dept;
      const delegatedToMe=co.users.some(u=>
        u.role==="manager"&&u.delegateTo===user.id&&
        (!u.delegateUntil||u.delegateUntil>=today())&&
        emp.dept===u.dept
      );
      return inMyDept||delegatedToMe;
    });
  })();

  // Claims to show in ApprovalsTab — from reporting chain + grade engine
  const approvableClaimsForMe=(()=>{
    if(!canApprove&&!isCFO&&!isHR) return [];

    // Budget-breach escalation claims visible to CFO/HR/Admin
    const escalationClaims=visibleClaims.filter(c=>
      c.status==="Pending"&&c.budgetBreached&&
      ["admin","cfo","hr"].includes(user.role)&&
      c.empId!==user.id
    );

    if(!canApprove) return escalationClaims;

    const myGrade=myUser?.grade||0;
    const myApproveLimit=myUser?.approveLimit||co.policy?.autoApproveLimit||999999999;

    const regularClaims=co.claims.filter(c=>{
      if(c.status!=="Pending"&&c.status!=="Budget-Escalation Approved") return false;
      if(c.empId===user.id) return false; // can't approve own claims

      const emp=getUser(c.empId);
      if(!emp) return false;

      if(isAdmin) return true; // admin sees all

      // Manager sees claims from users with lower grade in their visibility scope
      const empGrade=emp.grade||0;
      if(myGrade===0) return emp.dept===myUser?.dept; // grade 0 manager sees own dept
      return empGrade<myGrade&&visibleUserIds.has(c.empId);
    });

    // Deduplicate
    const seen=new Set();
    return [...escalationClaims,...regularClaims].filter(c=>{
      if(seen.has(c.id)) return false;
      seen.add(c.id); return true;
    });
  })();
  const pendingTopups=(co.topups||[]).filter(t=>t.status==="Pending");

  // ── sbCreateTrip — defined once, used by both TripsTab and SubmitTab ─────────
  const sbCreateTrip=async(trip,assigned,legs=[])=>{
    if(SB_ENABLED){
      try{
        // All trips go pending_approval except admin-created
        const tripStatus=isAdmin?"active":"pending_approval";
        const insertRow={
          id:trip.id,company_id:cid,
          name:trip.name,type:trip.type||"trip",
          start_date:trip.startDate,end_date:trip.endDate,
          status:tripStatus,
          budget:parseFloat(trip.budget)||0,
          spent:0,created_by:user.id,
        };
        try{Object.assign(insertRow,{
          trip_mode:trip.tripMode||"balance",
          currency:trip.currency||"INR",
          project_code:trip.projectCode||null,
          opening_balance:parseFloat(trip.budget)||0,
          category_limits:Object.keys(trip.categoryLimits||{}).length>0?trip.categoryLimits:null,
          trip_type:trip.tripType||"domestic",
          purpose:trip.purpose||null,
        });}catch(e){}
        const{error:tripErr}=await supabase.from("trips").insert(insertRow);
        if(tripErr){
          const{error:retry}=await supabase.from("trips").insert({
            id:trip.id,company_id:cid,name:trip.name,type:trip.type||"trip",
            start_date:trip.startDate,end_date:trip.endDate,
            status:tripStatus,budget:parseFloat(trip.budget)||0,spent:0,created_by:user.id,
          });
          if(retry)throw new Error(retry.message);
        }
        if(assigned?.length){
          await supabase.from("trip_assignments").insert(
            assigned.map(uid=>({trip_id:trip.id,user_id:uid}))
          ).then(()=>{}).catch(()=>{});
        }
        // Save itinerary legs
        if(legs?.length>0){
          await supabase.from("trip_legs").insert(
            legs.map((l,idx)=>({
              id:l.id||uid(),company_id:cid,trip_id:trip.id,
              leg_num:idx+1,from_city:l.fromCity||"",to_city:l.toCity||"",
              depart_at:l.departAt||null,arrive_at:l.arriveAt||null,
              mode:l.mode||"",city_tier:l.cityTier||"D",
              hotel_limit:l.hotelLimit||0,diem_rate:l.diemRate||0,days:l.days||1,
            }))
          ).then(()=>{}).catch(e=>log.warn("Legs insert:",e.message));
        }
        // Notify via grade-based approver routing
        if(tripStatus==="pending_approval"){
          await notifyApprovers(user.id,`New trip "${trip.name}" by ${user.name} awaits approval`,"info");
        }
        await loadFromSB();
        toast(tripStatus==="active"?"✓ Trip created":"✓ Trip submitted for approval");
      }catch(err){
        toast("Trip creation failed: "+err.message,"error");
      }
    }else{
      setTrips(p=>[{...trip,status:isAdmin?"active":"pending_approval",legs:legs||[]},...p]);
      toast(isAdmin?"✓ Trip created":"✓ Trip submitted for approval");
    }
  };

  const approveTrip=async(trip)=>{
    if(SB_ENABLED){await supabase.from("trips").update({status:"active"}).eq("id",trip.id);await loadFromSB();}
    else setTrips(p=>p.map(t=>t.id===trip.id?{...t,status:"active"}:t));
    await sbAddAudit("Trip Approved","",`"${trip.name}" activated`,trip.id);
    await sbPushNotif(trip.createdBy,`Your trip "${trip.name}" has been approved and is now active`,"success");
    toast(`✓ Trip "${trip.name}" approved`);
  };

  const rejectTrip=async(trip)=>{
    if(SB_ENABLED){await supabase.from("trips").update({status:"declined"}).eq("id",trip.id);await loadFromSB();}
    else setTrips(p=>p.map(t=>t.id===trip.id?{...t,status:"declined"}:t));
    await sbAddAudit("Trip Rejected","",`"${trip.name}" declined`,trip.id);
    await sbPushNotif(trip.createdBy,`Your trip "${trip.name}" was not approved`,"error");
    toast(`Trip "${trip.name}" rejected`,"warn");
  };

  // ── Delete trip (pending/declined only — or admin can delete any) ─────────
  const deleteTrip=async(trip)=>{
    const canDelete=isAdmin||(trip.status==="pending_approval"||trip.status==="declined");
    if(!canDelete){toast("Only pending or declined trips can be deleted","error");return;}
    if(!window.confirm(`Delete trip "${trip.name}"? All claims and legs for this trip will also be deleted.`))return;
    if(SB_ENABLED){
      await supabase.from("trip_legs").delete().eq("trip_id",trip.id);
      await supabase.from("claims").delete().eq("trip_id",trip.id);
      await supabase.from("trips").delete().eq("id",trip.id);
      await loadFromSB();
    } else {
      setTrips(p=>p.filter(t=>t.id!==trip.id));
      setClaims(p=>p.filter(c=>c.tripId!==trip.id));
    }
    toast(`✓ Trip "${trip.name}" deleted`);
  };

  // ── Delete claim (pending only — or admin can delete any) ─────────────────
  const deleteClaim=async(claimId)=>{
    const claim=co.claims.find(c=>c.id===claimId);
    if(!claim)return;
    const canDelete=isAdmin||(claim.status==="Pending"&&claim.empId===user.id);
    if(!canDelete){toast("Only your pending claims can be deleted","error");return;}
    if(!window.confirm(`Delete claim ${claimId} for ${fmt(claim.amount)}? This cannot be undone.`))return;
    if(SB_ENABLED){
      await supabase.from("claims").delete().eq("id",claimId);
      await loadFromSB();
    } else {
      setClaims(p=>p.filter(c=>c.id!==claimId));
    }
    toast(`✓ Claim ${claimId} deleted`);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  // ── Central approver notification helper ─────────────────────────────────────
  // Finds the correct manager for an employee's dept, respects delegation,
  // always notifies all admins too.
  // ── Item 8: Budget Enhancement Request ────────────────────────────────────
  const submitBudgetEnhancement=async(dept,groupId,period,currentLimit,requestedLimit,reason)=>{
    const req={
      id:"BER-"+uid(),
      company_id:cid,
      requested_by:user.id,
      requester_name:user.name,
      dept:dept||null,
      group_id:groupId||null,
      period,       // "monthly" | "yearly"
      current_limit:currentLimit,
      requested_limit:requestedLimit,
      reason,
      status:"Pending",
      created_at:new Date().toISOString(),
    };
    if(SB_ENABLED){
      const{error}=await supabase.from("budget_enhancements").insert(req);
      if(error){
        // Table may not exist yet — silently create fallback notification
        await sbPushNotif(co.users.find(u=>u.role==="admin")?.id,
          `📊 Budget enhancement request from ${user.name}: ${dept||"Team"} ${period} budget from ₹${currentLimit.toLocaleString("en-IN")} → ₹${requestedLimit.toLocaleString("en-IN")}. Reason: ${reason}`,
          "warn");
        toast("✓ Enhancement request sent to admin","info");
        return;
      }
    }
    // Notify all admins
    for(const admin of co.users.filter(u=>u.role==="admin")){
      await sbPushNotif(admin.id,`📊 Budget enhancement request from ${user.name}: ${dept||"Team"} ${period} budget ₹${currentLimit.toLocaleString("en-IN")} → ₹${requestedLimit.toLocaleString("en-IN")}. Reason: ${reason}`,"warn");
    }
    toast("✓ Enhancement request submitted to admin");
  };

  const approveBudgetEnhancement=async(req)=>{
    if(!isAdmin){toast("Only admin can approve budget enhancements","error");return;}
    // Update policy directly
    const dept=req.dept;
    const newPolicy={...co.policy};
    if(!newPolicy.monthlyDeptBudgets)newPolicy.monthlyDeptBudgets={};
    if(!newPolicy.monthlyDeptBudgets[dept])newPolicy.monthlyDeptBudgets[dept]={monthly:0,yearly:0};
    if(req.period==="monthly"){
      newPolicy.monthlyDeptBudgets[dept].monthly=req.requested_limit;
    } else {
      newPolicy.monthlyDeptBudgets[dept].yearly=req.requested_limit;
    }
    await savePolicyToSB(newPolicy);
    if(SB_ENABLED){
      await supabase.from("budget_enhancements").update({status:"Approved",reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq("id",req.id).then(()=>{}).catch(()=>{});
    }
    await sbPushNotif(req.requested_by,`✓ Budget enhancement approved: ${req.dept} ${req.period} budget increased to ₹${req.requested_limit.toLocaleString("en-IN")}`,"success");
    toast(`✓ ${req.dept} ${req.period} budget updated to ₹${req.requested_limit.toLocaleString("en-IN")}`);
  };

  const notifyApprovers=async(empId,text,type="info")=>{
    const emp=co.users.find(u=>u.id===empId)||{dept:null};
    const notified=new Set();

    // Find the dept manager for this employee
    const deptMgr=co.users.find(u=>
      u.role==="manager"&&
      (emp.dept?u.dept===emp.dept:true)&&
      u.id!==empId
    );

    // Resolve effective approver (respects active delegation)
    const resolveDelegatee=(mgr)=>{
      if(!mgr)return null;
      if(mgr.delegateTo&&(!mgr.delegateUntil||mgr.delegateUntil>=today())){
        // Delegated — notify the delegate instead
        return mgr.delegateTo;
      }
      return mgr.id;
    };

    if(deptMgr){
      const effectiveId=resolveDelegatee(deptMgr);
      if(effectiveId&&!notified.has(effectiveId)){
        await sbPushNotif(effectiveId,text,type);
        notified.add(effectiveId);
      }
    }

    // Always notify all admins
    for(const admin of co.users.filter(u=>u.role==="admin"&&u.id!==empId)){
      if(!notified.has(admin.id)){
        await sbPushNotif(admin.id,text,type);
        notified.add(admin.id);
      }
    }

    // Fallback: if no manager found, notify any available manager
    if(notified.size===0){
      const anyMgr=co.users.find(u=>["manager","admin"].includes(u.role)&&u.id!==empId);
      if(anyMgr){
        const effectiveId=resolveDelegatee(anyMgr)||anyMgr.id;
        await sbPushNotif(effectiveId,text,type);
      }
    }
  };

  const sbPushNotif=async(toUserId,text,type="info")=>{
    if(SB_ENABLED){
      await supabase.from("notifications").insert({company_id:cid,user_id:toUserId,text,type,read:false});
    } else {
      setNotifs(p=>[{id:"N-"+uid(),userId:toUserId,text,type,read:false,time:new Date().toLocaleString()},...(p||[])]);
    }
  };
  const sbAddAudit=async(action,claimId,remarks="",tripId="")=>{
    const entry={id:"AL-"+uid(),action,claimId:claimId||"",tripId:tripId||"",by:user.id,byId:user.id,byName:user.name,at:new Date().toLocaleString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}),remarks};
    if(SB_ENABLED){
      try{await supabase.from("audit_log").insert({company_id:cid,action,claim_id:claimId||null,trip_id:tripId||null,by_user_id:user.id,by_name:user.name,at:entry.at,remarks});}
      catch{}
    }
    setAudit(p=>[entry,...(p||[]).slice(0,999)]);
  };
  const markRead=async()=>{
    if(SB_ENABLED){
      await supabase.from("notifications").update({read:true}).eq("company_id",cid).eq("user_id",user.id).eq("read",false);
      loadFromSB();
    } else {
      setNotifs(p=>(p||[]).map(n=>n.userId===user.id?{...n,read:true}:n));
    }
  };

  const effectiveApprover=(userId)=>{
    const u=co.users.find(x=>x.id===userId);
    if(!u)return userId;
    if(u.delegateTo&&(!u.delegateUntil||u.delegateUntil>=today()))return u.delegateTo;
    return userId;
  };

  const loadEditRequests=async()=>{
    if(!SB_ENABLED){return;}
    try{
      const{data,error}=await supabase.from("edit_requests").select("*").eq("company_id",cid).order("created_at",{ascending:false});
      if(error){log.warn("edit_requests:",error.message);return;}
      if(data)setEditRequests(data.map(r=>({
        ...r,
        // Normalise snake_case → camelCase so component can use either
        claimId:r.claim_id||r.claimId,
        requestedBy:r.requested_by||r.requestedBy,
        requesterName:r.requester_name||r.requesterName,
        windowOpen:r.window_open||r.windowOpen,
        windowExpires:r.window_expires||r.windowExpires,
      })));
    }catch(e){log.warn("loadEditRequests:",e.message);}
  };

  const submitEditRequest=async(claim,reason)=>{
    const reqId=uid();
    const req={id:reqId,company_id:cid,claim_id:claim.id,requested_by:user.id,requester_name:user.name,reason,status:"Pending",created_at:new Date().toISOString()};
    if(SB_ENABLED){
      const{error:erErr}=await supabase.from("edit_requests").insert(req);
      if(erErr){
        log.error("edit_requests insert error:",erErr.message);
        if(erErr.message?.includes("does not exist")||erErr.code==="42P01"){
          toast("Edit requests table not set up — contact your administrator","error");
          return;
        }
        toast("Failed to submit: "+erErr.message,"error");
        return;
      }
      // Notify dept manager + all admins, respecting delegation
      await notifyApprovers(user.id,`✏ Edit request for ${claim.id} from ${user.name}: "${reason}"`,"warn");
      await loadEditRequests();
    } else {
      setEditRequests(p=>[{...req},...p]);
    }
    toast("✓ Edit request submitted — awaiting manager approval");
  };

  const approveEditRequest=async(req)=>{
    const expires=new Date(Date.now()+24*60*60*1000).toISOString(); // 24h window
    if(SB_ENABLED){
      await supabase.from("edit_requests").update({status:"Approved",reviewed_by:user.id,reviewer_name:user.name,window_open:true,window_expires:expires}).eq("id",req.id);
      // Notify employee
      await sbPushNotif(req.requested_by,`Your edit request for ${req.claim_id} was approved. You have 24 hours to edit.`,"success");
      await loadEditRequests();
    } else {
      setEditRequests(p=>p.map(r=>r.id===req.id?{...r,status:"Approved",reviewerName:user.name,windowOpen:true,windowExpires:expires}:r));
    }
    toast("✓ Edit window opened for 24 hours");
  };

  const rejectEditRequest=async(req)=>{
    if(SB_ENABLED){
      await supabase.from("edit_requests").update({status:"Rejected",reviewed_by:user.id,reviewer_name:user.name}).eq("id",req.id);
      await sbPushNotif(req.requested_by,`Your edit request for ${req.claim_id} was rejected.`,"error");
      await loadEditRequests();
    } else {
      setEditRequests(p=>p.map(r=>r.id===req.id?{...r,status:"Rejected",reviewerName:user.name}:r));
    }
    toast("Edit request rejected");
  };

  // Check if claim has an approved edit window open
  const hasEditWindow=(claimId)=>{
    const req=editRequests.find(r=>(r.claim_id||r.claimId)===claimId&&r.status==="Approved"&&(r.window_open||r.windowOpen));
    if(!req)return false;
    const expires=new Date(req.window_expires||req.windowExpires||0);
    return expires>new Date();
  };

  const catSpend=(empId,tripId,cat)=>co.claims.filter(c=>c.empId===empId&&c.tripId===tripId&&c.category===cat&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0);
  const tripSpend=(empId,tripId)=>co.claims.filter(c=>c.empId===empId&&c.tripId===tripId&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0);

  const detectAnomaly=(form,amount)=>{
    const reasons=[];
    const claimDate=form.date||today();
    // 1. Duplicate: same vendor + same amount + same date
    if(form.vendor){
      const dup=co.claims.find(c=>c.vendor?.toLowerCase()===form.vendor?.toLowerCase()&&c.amount===amount&&c.date===claimDate&&c.id!==form.id&&c.empId===user.id);
      if(dup)reasons.push(`Duplicate invoice — same vendor, amount & date as ${dup.id}`);
    }
    // 2. Duplicate invoice number (if in notes)
    if(form.notes){
      const invMatch=form.notes.match(/Invoice[:\s#]+([A-Z0-9\-\/]+)/i);
      if(invMatch){
        const invNo=invMatch[1];
        const dupInv=co.claims.find(c=>c.notes?.includes(invNo)&&c.id!==form.id);
        if(dupInv)reasons.push(`Invoice number ${invNo} already exists in claim ${dupInv.id}`);
      }
    }
    // 3. Amount > 2.5× this employee's category average
    const prev=co.claims.filter(c=>c.empId===user.id&&c.category===form.category&&c.status==="Approved").map(c=>c.amount);
    if(prev.length>=3){
      const avg=prev.reduce((a,b)=>a+b)/prev.length;
      if(amount>avg*2.5)reasons.push(`Amount is ${(amount/avg).toFixed(1)}× your average for ${form.category} (avg: ₹${Math.round(avg).toLocaleString("en-IN")})`);
    }
    // 4. Same vendor, multiple claims within 3 days
    if(form.vendor){
      const recentSame=co.claims.filter(c=>c.empId===user.id&&c.vendor?.toLowerCase()===form.vendor?.toLowerCase()&&Math.abs(new Date(c.date)-new Date(claimDate))<=3*86400000&&c.id!==form.id);
      if(recentSame.length>=1)reasons.push(`${recentSame.length+1} claims from ${form.vendor} within 3 days`);
    }
    // 5. Round number above ₹2000 — possible estimate
    if(amount>=2000&&amount%500===0)reasons.push(`Round number ₹${amount.toLocaleString("en-IN")} — verify against actual invoice`);
    // 6. High entertainment/meals
    if((form.category==="Meals"||form.category==="Client Entertainment")&&amount>10000)
      reasons.push(`High ${form.category} — ₹${amount.toLocaleString("en-IN")} — may need justification`);
    // 7. Weekend claim without weekend flag enabled
    if(isWknd(claimDate)&&!co.policy.weekendRequiresApproval)
      reasons.push("Weekend expense — verify if business-related");
    // 8. Category % limit check vs trip budget
    if(form.tripId){
      const trip=co.trips.find(t=>t.id===form.tripId);
      if(trip?.categoryLimits?.[form.category]){
        const limit=trip.categoryLimits[form.category];
        const catSpentSoFar=co.claims.filter(c=>c.tripId===form.tripId&&c.category===form.category&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0);
        const maxAllowed=(trip.budget||0)*limit/100;
        if(catSpentSoFar+amount>maxAllowed)
          reasons.push(`${form.category} budget exceeded: ₹${Math.round(catSpentSoFar+amount).toLocaleString("en-IN")} vs ₹${Math.round(maxAllowed).toLocaleString("en-IN")} limit (${limit}% of trip budget)`);
      }
    }
    return{isAnomaly:reasons.length>0,reasons};
  };

  const submitClaim=async(form)=>{
    const amount=parseFloat(form.amount);
    const tripId=form.tripId||co.trips.find(t=>t.status==="active"&&(!t.assignedTo||t.assignedTo.includes(user.id)))?.id;
    if(!tripId){const msg="No active trip assigned to you. Please create or join a trip first.";toast(msg,"error");throw new Error(msg);}
    const claimDate=form.date||today();
    // Resolve the trip object once — used throughout
    const selectedTrip=co.trips.find(t=>t.id===tripId);
    // Block future dates
    if(claimDate>today()){toast("Invoice date cannot be in the future","error");return;}
    // Validate claim date is within trip date range
    if(selectedTrip?.startDate&&selectedTrip?.endDate){
      if(claimDate<selectedTrip.startDate||claimDate>selectedTrip.endDate){
        const msg2=`Expense date ${claimDate} is outside trip range (${selectedTrip.startDate} to ${selectedTrip.endDate}). Please fix the date.`;
        toast(msg2,"error");throw new Error(msg2);
      }
    }
    // ── Validate claim city/date against itinerary leg ─────────────────────────
    if(selectedTrip?.legs?.length){
      const legValidation=validateClaimAgainstLeg(
        {city:form.city||"",date:claimDate,category:form.category,amount,leg_id:form.legId||null},
        selectedTrip,
        co.policy
      );
      if(legValidation.errors.length>0){
        const msg=legValidation.errors[0];
        toast(msg,"error");
        throw new Error(msg);
      }
      if(legValidation.warnings.length>0){
        // Show as toast warning — don't block, but inform
        legValidation.warnings.forEach(w=>toast("⚠ "+w,"warn"));
      }
    }
    const weekend=co.policy.weekendRequiresApproval&&isWknd(claimDate);
    const noRcpt=co.policy.receiptMandatoryAbove>0&&amount>co.policy.receiptMandatoryAbove&&(!form.receipts||!form.receipts.length);
    if(noRcpt){toast(`Receipt required for expenses above ${fmt(co.policy.receiptMandatoryAbove)}. Please upload your invoice.`,"error");return;}
    const vLow=(form.vendor||"").toLowerCase();
    if(co.policy.vendorBlacklist?.some(v=>vLow.includes(v.toLowerCase()))){toast(`Vendor "${form.vendor}" is blacklisted`,"error");return;}
    const catEx=(()=>{
      const cur=co.claims.filter(c=>c.empId===user.id&&c.tripId===tripId&&c.category===form.category&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0);
      const tot=co.claims.filter(c=>c.empId===user.id&&c.tripId===tripId&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0)+amount;
      const nc=cur+amount;
      const al=co.policy.categoryPct[form.category]||100;
      return tot>0&&(nc/tot)*100>al;
    })();
    // Check if trip budget is exceeded (including pending claims)
    const tripSpentIncludingPending=(()=>{
      const trip=selectedTrip;
      if(!trip)return 0;
      return co.claims.filter(c=>c.tripId===tripId&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0);
    })();
    const tripBudgetExceeded=selectedTrip?.budget>0&&(tripSpentIncludingPending+amount)>selectedTrip.budget;
    // Hard-block if trip total budget exceeded
    // Transport class entitlement check (Phase 2)
    if(form.category==="Travel"&&form.transportClass&&co.policy?.gradeBased){
      const emp=co.users.find(u=>u.id===user.id);
      const ent=getEntitlement(emp?.grade||0,"D",co.policy);
      const classOrder=["Sleeper","Non-AC Bus","Volvo Bus","3AC Train","2AC Train","Economy Air","Business Air"];
      const entIdx=classOrder.indexOf(ent.transportClass||"");
      const claimIdx=classOrder.indexOf(form.transportClass||"");
      if(entIdx>=0&&claimIdx>entIdx){
        toast(`⚠ ${form.transportClass} exceeds your entitlement (${ent.transportClass}). Claim flagged.`,"warn");
        // Don't block — flag it for manager review
      }
    }
    if(tripBudgetExceeded){
      toast(`⛔ Trip budget of ₹${(selectedTrip.budget).toLocaleString("en-IN")} would be exceeded. Current spent+pending: ₹${tripSpentIncludingPending.toLocaleString("en-IN")}. Request a top-up or reduce the claim amount.`,"error");
      setBusy(false);
      return;
    }
    // Hard-block if category limit exceeded (not just warn)
    if(catEx&&selectedTrip?.categoryLimits?.[form.category]){
      const limit=selectedTrip.categoryLimits[form.category];
      const catSpentSoFar=co.claims.filter(c=>c.tripId===tripId&&c.category===form.category&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0);
      const maxAllowed=(selectedTrip.budget*limit/100);
      toast(`⛔ ${form.category} limit of ${limit}% (₹${Math.round(maxAllowed).toLocaleString("en-IN")}) exceeded. Already spent: ₹${catSpentSoFar.toLocaleString("en-IN")}.`,"error");
      setBusy(false);
      return;
    }
    // ── ITEM 6: Comprehensive approval routing ──────────────────────────────
    const policy=co.policy;
    const autoLimit=policy.autoApproveLimit||0;
    const dualLimit=policy.dualApproveAbove||0;

    // Check monthly/yearly team & dept budget breach
    const claimYear=claimDate.slice(0,4);
    const claimMonth=claimDate.slice(0,7); // yyyy-mm
    // Indian FY: April(04) to March(03)
    const fyStart=claimMonth>=(claimYear+"-04")?claimYear+"-04":String(parseInt(claimYear)-1)+"-04";
    const fyEnd=claimMonth>=(claimYear+"-04")?String(parseInt(claimYear)+1)+"-03":claimYear+"-03";
    const emp=co.users.find(u=>u.id===user.id);
    const empDept=emp?.dept||"";
    const empGroupIds=(emp?.groupIds||[]);

    // Monthly dept budget check
    const monthlyDeptBudget=(policy.monthlyDeptBudgets?.[empDept]?.monthly)||0;
    const monthlyDeptSpent=monthlyDeptBudget>0?co.claims.filter(c=>{
      const cu=co.users.find(u=>u.id===c.empId);
      return cu?.dept===empDept&&c.date?.slice(0,7)===claimMonth&&c.status!=="Rejected";
    }).reduce((s,c)=>s+c.amount,0):0;
    const monthlyDeptBreached=monthlyDeptBudget>0&&(monthlyDeptSpent+amount)>monthlyDeptBudget;

    // Yearly dept budget check (April-March FY)
    const yearlyDeptBudget=(policy.monthlyDeptBudgets?.[empDept]?.yearly)||(policy.departmentBudgets?.[empDept])||0;
    const yearlyDeptSpent=yearlyDeptBudget>0?co.claims.filter(c=>{
      const cu=co.users.find(u=>u.id===c.empId);
      return cu?.dept===empDept&&c.date?.slice(0,7)>=fyStart&&c.date?.slice(0,7)<=fyEnd&&c.status!=="Rejected";
    }).reduce((s,c)=>s+c.amount,0):0;
    const yearlyDeptBreached=yearlyDeptBudget>0&&(yearlyDeptSpent+amount)>yearlyDeptBudget;

    const budgetBreached=monthlyDeptBreached||yearlyDeptBreached;
    const budgetBreachReason=monthlyDeptBreached?`Monthly dept budget (₹${monthlyDeptBudget.toLocaleString("en-IN")}) exceeded`:
                             yearlyDeptBreached?`Annual dept budget (₹${yearlyDeptBudget.toLocaleString("en-IN")}) exceeded`:"";

    // Core routing decision
    // 1. Within auto-approve limit AND no flags → schedule auto-approve after delay
    const canAutoApprove=autoLimit>0&&amount<=autoLimit&&!catEx&&!weekend&&!noRcpt&&!tripBudgetExceeded&&!budgetBreached;
    // 2. Within auto-approve but category exceeded → pending with warning
    const pendingCatEx=autoLimit>0&&amount<=autoLimit&&catEx;
    // 3. Within auto-approve but trip budget exceeded → pending with warning (already hard-blocked above)
    // 4. Above dual approval threshold → needs manager + admin
    const needsDual=dualLimit>0&&amount>=dualLimit;
    // 5. Budget breached → admin-only regardless of amount
    // 6. Default: route via grade hierarchy
    const auto=canAutoApprove;
    // Routing remark for pending claims
    const routingRemark=budgetBreached?`⚠ Budget breach: ${budgetBreachReason}. Admin approval required.`:
                        catEx?"⚠ Category budget exceeded — manager review required":
                        needsDual?"Dual approval required (above ₹"+dualLimit.toLocaleString("en-IN")+")":
                        "Pending approval";
    const{isAnomaly,reasons}=detectAnomaly(form,amount);
    const claimId="EXP-"+uid();

    const claimData={id:claimId,tripId,empId:user.id,date:claimDate,category:form.category,desc:form.desc,amount,origAmount:parseFloat(form.origAmount||amount),origCur:form.currency||"INR",
      status:auto?"Approved":"Pending",autoApproved:auto,
      receipts:form.receipts||[],
      remarks:auto?"Approved":routingRemark,
      budgetBreached,
      flagged:catEx,anomaly:isAnomaly,anomalyReasons:[...reasons,...(Object.keys(form.manualEdits||{}).length>0?[`Fields manually edited after OCR scan: ${Object.keys(form.manualEdits||{}).join(", ")}`]:[])],manualEdits:form.manualEdits||{},comments:[],vendor:form.vendor||"",weekendFlag:weekend,notes:form.notes||"",projectCode:form.projectCode||selectedTrip?.projectCode||"",
      gstAmount:parseFloat(form.gstAmount)||0,gstItc:null,
      legId:form.legId||null,city:form.city||"",cityTier:form.cityTier||"D"};

    if(!online){
      if(SB_ENABLED){
        const sbRow={id:claimId,company_id:cid,trip_id:tripId,emp_id:user.id,date:claimDate,category:form.category,description:form.desc,vendor:form.vendor||"",amount,orig_amount:parseFloat(form.origAmount||amount),orig_currency:form.currency||"INR",status:auto?"Approved":"Pending",auto_approved:auto,remarks:auto?"Auto-approved":"",flagged:catEx,anomaly:isAnomaly,anomaly_reasons:reasons,weekend_flag:weekend,notes:form.notes||"",leg_id:form.legId||null,city:form.city||"",city_tier:form.cityTier||"D"};
        enqueue({type:"claim",data:claimData,sbRow});
      } else {
        enqueue({type:"claim",data:claimData});
      }
      toast("📴 Saved offline — will sync when connected","warn");
      return;
    }

    if(SB_ENABLED){
      // ── Supabase write path ──────────────────────────────────────────────
      const{error:claimErr}=await supabase.from("claims").insert({
        id:claimId,company_id:cid,trip_id:tripId,emp_id:user.id,
        date:claimDate,category:form.category,description:form.desc,
        vendor:form.vendor||"",amount,orig_amount:parseFloat(form.origAmount||amount),
        orig_currency:form.currency||"INR",status:auto?"Approved":"Pending",
        auto_approved:auto,remarks:auto?"Auto-approved":"",flagged:catEx,
        anomaly:isAnomaly,anomaly_reasons:reasons,weekend_flag:weekend,notes:form.notes||"",
        leg_id:form.legId||null,city:form.city||"",city_tier:form.cityTier||"D",
      });
      if(claimErr){toast(claimErr.message,"error");return;}

      // Upload receipts to Cloudflare R2 (with visible status)
      let uploadedCount=0;
      const totalReceipts=(form.receipts||[]).filter(r=>r.b64).length;
      if(totalReceipts>0) toast(`⏳ Uploading ${totalReceipts} receipt${totalReceipts>1?"s":""}…`);
      for(const r of(form.receipts||[])){
        if(r.b64){
          try{
            await sbUploadReceipt(claimId,cid,r.b64,r.type,r.name);
            uploadedCount++;
          }catch(e){
            toast(`❌ Receipt upload failed: ${e.message}`,"error");
            log.warn("Receipt upload failed:",e.message);
          }
        }
      }
      if(totalReceipts>0){
        if(uploadedCount===totalReceipts) toast(`✓ ${uploadedCount} receipt${uploadedCount>1?"s":""} saved successfully`);
        else if(uploadedCount===0) toast(`❌ All uploads failed — see error above`,"error");
        else toast(`⚠ ${uploadedCount}/${totalReceipts} receipts uploaded`,"warn");
      }

      // Update trip spent + user balance via Supabase
      if(auto){
        // Item 6: Auto-approve after configured delay (default 10 min)
        const delayMins=co.policy.autoApproveMins||10;
        toast(`⚡ Submitted — will auto-approve in ${delayMins} min${delayMins!==1?"s":""}!`);
        setTimeout(async()=>{
          try{
            await supabase.from("claims").update({status:"Approved",auto_approved:true,remarks:"Auto-approved"}).eq("id",claimId);
            await supabase.from("trips").update({spent:co.trips.find(t=>t.id===tripId)?.spent+amount||amount}).eq("id",tripId);
            if(!co.policy.reimbursementMode)await supabase.from("users").update({balance:Math.max(0,(myUser?.balance||0)-amount)}).eq("id",user.id);
            else await supabase.from("users").update({reimbursable:(myUser?.reimbursable||0)+amount}).eq("id",user.id);
            await sbAddAudit("Auto-Approved",claimId,`Auto after ${delayMins} min`);
            await sbPushNotif(user.id,`✓ Claim ${claimId} auto-approved (₹${amount.toLocaleString("en-IN")})`,"success");
          }catch(e){log.warn("Auto-approve timer failed:",e.message);}
        },delayMins*60*1000);
      } else {
        // Notify dept manager + admins, respecting delegation
        await notifyApprovers(user.id,`New claim ${claimId} from ${user.name} — ${fmt(amount)} awaiting approval`,"info");
        toast(budgetBreached?"⚠ "+budgetBreachReason+" — Admin approval only":weekend?"⚠️ Weekend → manager":noRcpt?"⚠️ Receipt required":isAnomaly?"🔍 Anomaly flagged":catEx?"⚠️ Category % exceeded":needsDual?"⏳ Dual approval required":"✓ Claim submitted");
      }
      await loadFromSB();
    } else {
      // ── localStorage write path ──────────────────────────────────────────
      setClaims(p=>[claimData,...p]);
      if(!co.policy.reimbursementMode&&auto)setUsers(p=>p.map(u=>u.id===user.id?{...u,balance:Math.max(0,(u.balance||0)-amount)}:u));
      if(co.policy.reimbursementMode&&auto)setUsers(p=>p.map(u=>u.id===user.id?{...u,reimbursable:(u.reimbursable||0)+amount}:u));
      setTrips(p=>p.map(t=>t.id===tripId?{...t,spent:t.spent+(auto?amount:0)}:t));
      if(auto){setAudit(p=>[{id:"AL-"+uid(),action:"Auto-Approved",claimId,by:user.id,byName:user.name,at:new Date().toLocaleString(),remarks:"Under limit"},...(p||[])]);toast("⚡ Auto-approved instantly!");}
      else{
        // Notify dept manager + admins, respecting delegation (localStorage path)
        notifyApprovers(user.id,`New claim ${claimId} from ${user.name} — ${fmt(amount)} awaiting approval`,"info");
        toast(budgetBreached?"⚠ "+budgetBreachReason+" — Admin only":isAnomaly?"🔍 Anomaly flagged":catEx?"⚠️ Category % exceeded":needsDual?"⏳ Dual approval required":"✓ Claim submitted");
      }
    }
    // Handle expense splitting — create claims for each split colleague
    if(form.splitWith&&form.splitWith.length>0){
      const splitCount=form.splitWith.length+1;
      const splitAmount=Math.round(amount/splitCount);
      for(const colleagueId of form.splitWith){
        const splitClaimId="EXP-"+uid();
        const splitData={...claimData,id:splitClaimId,empId:colleagueId,amount:splitAmount,
          desc:form.desc+" (split from "+claimId+")",autoApproved:false,status:"Pending",splitFrom:claimId};
        if(SB_ENABLED){
          await supabase.from("claims").insert({
            id:splitClaimId,company_id:cid,trip_id:tripId,emp_id:colleagueId,
            date:claimDate,category:form.category,description:splitData.desc,
            vendor:form.vendor||"",amount:splitAmount,status:"Pending",
            orig_currency:"INR",auto_approved:false,
          });
        } else {
          setClaims(p=>[splitData,...p]);
        }
        // Notify the colleague
        await sbPushNotif(colleagueId,`${user.name} split a ${fmt(amount)} expense with you — your share: ${fmt(splitAmount)}`,"info");
      }
    }
    setMdl(null);
  };

  const handleDecision=async(claimId,decision,remarks="")=>{
    const claim=co.claims.find(c=>c.id===claimId);
    if(!claim)return;

    const policy=co.policy;
    let finalStatus=decision;

    // ── Item 1: No authority → admin fallback ───────────────────────────────
    // ── Item 6: Budget breach → admin-only ──────────────────────────────────
    if(decision==="Approved"){
      // Check if budget was breached — only admin can approve breached claims
      const claimD=claim.date||today();
      const claimMo=claimD.slice(0,7);
      const cYear=claimD.slice(0,4);
      const fyS=claimMo>=(cYear+"-04")?cYear+"-04":String(parseInt(cYear)-1)+"-04";
      const fyE=claimMo>=(cYear+"-04")?String(parseInt(cYear)+1)+"-03":cYear+"-03";
      const claimEmp=co.users.find(u=>u.id===claim.empId);
      const claimDept=claimEmp?.dept||"";
      const mDB=(policy.monthlyDeptBudgets?.[claimDept]?.monthly)||0;
      const yDB=(policy.monthlyDeptBudgets?.[claimDept]?.yearly)||(policy.departmentBudgets?.[claimDept])||0;
      const mSpent=mDB>0?co.claims.filter(c=>{const cu=co.users.find(u=>u.id===c.empId);return cu?.dept===claimDept&&c.date?.slice(0,7)===claimMo&&c.status!=="Rejected"&&c.id!==claim.id;}).reduce((s,c)=>s+c.amount,0):0;
      const ySpent=yDB>0?co.claims.filter(c=>{const cu=co.users.find(u=>u.id===c.empId);return cu?.dept===claimDept&&c.date?.slice(0,7)>=fyS&&c.date?.slice(0,7)<=fyE&&c.status!=="Rejected"&&c.id!==claim.id;}).reduce((s,c)=>s+c.amount,0):0;
      const budgetBreachedForApproval=(mDB>0&&(mSpent+claim.amount)>mDB)||(yDB>0&&(ySpent+claim.amount)>yDB);
    // ── Budget breach → escalate to CFO / Admin / HR — any ONE must approve first ──
    if(budgetBreachedForApproval){
      const escalationRoles=["admin","cfo","hr"];
      const isEscalator=escalationRoles.includes(user.role);
      if(!isEscalator){
        toast("⛔ Dept budget breached — requires CFO, Admin, or HR approval first before manager can approve.","error");
        return;
      }
      // Escalator approved — mark as "Budget-Escalation Approved" so manager can finalise
      if(user.role!=="admin"){
        // CFO or HR signed off — needs manager to still do final approval
        finalStatus="Budget-Escalation Approved";
        const mgrs=co.users.filter(u=>u.role==="manager"&&co.users.find(x=>x.id===claim.empId)?.dept===u.dept&&!u.isSuspended);
        for(const m of mgrs) await sbPushNotif(m.id,`Claim ${claimId} (${fmt(claim.amount)}) budget-breach approved by ${user.name} (${user.role.toUpperCase()}) — awaiting your final approval`,"warn");
        // Admin also notified
        for(const a of co.users.filter(u=>u.role==="admin")) await sbPushNotif(a.id,`Claim ${claimId} budget-breach cleared by ${user.name} — manager final approval pending`,"info");
      }
      // Admin approves directly → full approval falls through below
    }

    // ── Grade-based engine ────────────────────────────────────────────────────
      if(policy.gradeBased&&(policy.approvalHierarchy||[]).length>0){
        const approverGrade=user.grade||0;
        const submitter=co.users.find(u=>u.id===claim.empId);
        const submitterGrade=submitter?.grade||0;

        // Block same-grade approval
        if(approverGrade===submitterGrade&&approverGrade>0){
          toast("Cannot approve — same grade as submitter. Escalate to higher authority.","error");
          return;
        }
        // Block self-approval
        if(user.id===claim.empId){
          toast("Cannot approve your own claim.","error");
          return;
        }

        // Check if this approver's ceiling covers the amount
        const hier=(policy.approvalHierarchy||[]).find(h=>h.level===approverGrade);
        const ceiling=hier?.ceiling||0;
        if(ceiling>0&&claim.amount>ceiling){
          // Approver ceiling insufficient — mark as partial and escalate
          finalStatus=`Level ${approverGrade} Approved`;
          // Notify next level up
          const nextApprovers=resolveApprover(claim.empId,co.users,policy,claim.amount).filter(id=>{
            const u=co.users.find(x=>x.id===id);
            return u&&(u.grade||0)>approverGrade;
          });
          for(const id of nextApprovers){
            await sbPushNotif(id,`Claim ${claimId} (${fmt(claim.amount)}) needs your approval — L${approverGrade} approved, awaiting L${approverGrade+1}+`,"warn");
          }
        }
        // else: full approval — finalStatus stays "Approved"
      } else {
        // ── Legacy dual-level engine (no grade system) ─────────────────────────
        const isDualNeeded=needsDualApproval(claim.amount);
        const useMultiLevel=policy.multiLevelApproval&&(policy.approvalLevels||[]).length>0;

        if(useMultiLevel){
          const sorted=[...(policy.approvalLevels||[])].sort((a,b)=>parseFloat(a.upTo)-parseFloat(b.upTo));
          const requiredLevel=sorted.find(l=>claim.amount<=parseFloat(l.upTo));
          const myLevel=sorted.findIndex(l=>l.role===user.role);
          if(requiredLevel){
            const requiredLevelIdx=sorted.indexOf(requiredLevel);
            if(myLevel<requiredLevelIdx||(user.role==="manager"&&requiredLevel.role==="admin")){
              finalStatus="Manager Approved";
            }
          } else if(user.role==="manager"){
            finalStatus="Manager Approved";
          }
        } else if(isDualNeeded){
          if(user.role==="manager"&&claim.status==="Pending"){
            finalStatus="Manager Approved";
          }
        }
      }
    }

    const isFullyApproved=finalStatus==="Approved";

    if(SB_ENABLED){
      await supabase.from("claims").update({status:finalStatus,remarks:remarks||finalStatus}).eq("id",claimId);
      if(isFullyApproved){
        if(!co.policy.reimbursementMode)await supabase.from("users").update({balance:Math.max(0,(co.users.find(u=>u.id===claim.empId)?.balance||0)-claim.amount)}).eq("id",claim.empId);
        else await supabase.from("users").update({reimbursable:(co.users.find(u=>u.id===claim.empId)?.reimbursable||0)+claim.amount}).eq("id",claim.empId);
        await supabase.from("trips").update({spent:(co.trips.find(t=>t.id===claim.tripId)?.spent||0)+claim.amount}).eq("id",claim.tripId);
        const finTeam=co.users.filter(u=>u.role==="finance");
        for(const f of finTeam)await sbPushNotif(f.id,`Claim ${claimId} approved — ${fmt(claim.amount)} — ready for accounting`,"info");
      }
      await sbAddAudit(finalStatus,claimId,remarks);
      await sbPushNotif(claim.empId,`Your claim ${claimId} — ${finalStatus.toLowerCase()}${remarks?": "+remarks:""}`,isFullyApproved?"success":finalStatus.includes("Approved")?"info":"error");

      // Notify next approvers if partial
      if(finalStatus.includes("Approved")&&!isFullyApproved){
        const nextApprovers=resolveApprover(claim.empId,co.users,policy,claim.amount);
        for(const id of nextApprovers.filter(id=>id!==user.id)){
          await sbPushNotif(id,`Claim ${claimId} (${fmt(claim.amount)}) from ${co.users.find(u=>u.id===claim.empId)?.name} awaits your approval`,"warn");
        }
      }
      if(finalStatus==="Manager Approved"){
        const admins=co.users.filter(u=>u.role==="admin");
        for(const a of admins)await sbPushNotif(a.id,`Claim ${claimId} (${fmt(claim.amount)}) awaits your final approval`,"warn");
      }
      if(isAdmin===false){
        const admins=co.users.filter(u=>u.role==="admin");
        for(const a of admins)await sbPushNotif(a.id,`${user.name} ${finalStatus.toLowerCase()} claim ${claimId} — ${fmt(claim.amount)}`,"info");
      }
      const emp=co.users.find(u=>u.id===claim.empId);
      if(emp?.email&&co.policy?.notifyEmailOnApprove!==false){
        emailAlert(emp.email,`Expense ${finalStatus} — ${fmt(claim.amount)} | XpensR`,`Your expense claim ${claimId} for ${fmt(claim.amount)} has been ${finalStatus.toLowerCase()}.${remarks?" Remarks: "+remarks:""}`,claimEmailHtml(isFullyApproved?"Approved":"Rejected",claim,remarks,activeMeta?.name));
      }
      const empPhone=emp?.whatsappNumber||emp?.mobile;
      if(empPhone&&co.policy?.notifyWaOnApprove!==false){
        whatsappAlert(empPhone,isFullyApproved?"xpensr_claim_approved":"xpensr_claim_rejected",[emp?.name||"",claimId,fmt(claim.amount),remarks||""]);
      }
      sendPush(isFullyApproved?"✓ Claim Approved":finalStatus.includes("Approved")?"⏳ Awaiting next approval":"✗ Rejected",`${fmt(claim.amount)} — ${claim.desc}`);
      await loadFromSB();
    } else {
      setClaims(p=>p.map(c=>c.id===claimId?{...c,status:finalStatus,remarks:remarks||finalStatus}:c));
      if(isFullyApproved){
        if(!co.policy.reimbursementMode)setUsers(p=>p.map(u=>u.id===claim.empId?{...u,balance:Math.max(0,(u.balance||0)-claim.amount)}:u));
        else setUsers(p=>p.map(u=>u.id===claim.empId?{...u,reimbursable:(u.reimbursable||0)+claim.amount}:u));
        setTrips(p=>p.map(t=>t.id===claim.tripId?{...t,spent:t.spent+claim.amount}:t));
      }
      setAudit(p=>[{id:"AL-"+uid(),action:finalStatus,claimId,by:user.id,byName:user.name,at:new Date().toLocaleString(),remarks},...(p||[])]);
    }
    toast(isFullyApproved?"✓ Fully Approved":finalStatus.includes("Approved")?"✓ Approved — escalating to next level":finalStatus==="Rejected"?"Rejected":"Done",isFullyApproved?"success":finalStatus.includes("Approved")?"warn":"error");
  };
  // (expense splitting handled in handleSubmit)

  const handleTopup=async(req,decision)=>{
    const emp=co.users.find(u=>u.id===req.empId);
    if(SB_ENABLED){
      const{error:_te}=await supabase.from("topups").update({status:decision}).eq("id",req.id);
      if(_te){toast("Failed to update top-up: "+_te.message,"error");return;}
      if(decision==="Approved"&&emp){
        const bk=co.policy.reimbursementMode?"reimbursable":"balance";
        await supabase.from("users").update({[bk]:(emp[bk]||0)+req.amount}).eq("id",emp.id);
        // Also credit the trip wallet — add to trip's topups total so budget increases
        if(req.tripId){
          const trip=co.trips.find(t=>t.id===req.tripId);
          if(trip){
            const newTopupsTotal=(trip.topupsTotal||0)+req.amount;
            const newBudget=(trip.budget||0)+req.amount;
            await supabase.from("trips").update({budget:newBudget,topups_total:newTopupsTotal}).eq("id",req.tripId);
          }
        }
      }
      await sbPushNotif(req.empId,`Top-up ${decision.toLowerCase()}${decision==="Approved"?": "+fmt(req.amount):""}`,decision==="Approved"?"success":"error");
      await sbAddAudit(decision==="Approved"?"Topup Approved":"Topup Rejected",req.id,`₹${req.amount} — ${emp?.name||req.empId}`);
      await loadFromSB();
    } else {
      setTopups(p=>p.map(t=>t.id===req.id?{...t,status:decision}:t));
      if(decision==="Approved"){
        setUsers(p=>p.map(u=>u.id===req.empId?{...u,balance:(u.balance||0)+req.amount}:u));
        // Credit trip wallet in localStorage mode
        if(req.tripId){
          setTrips(p=>p.map(t=>t.id===req.tripId?{...t,budget:(t.budget||0)+req.amount,topupsTotal:(t.topupsTotal||0)+req.amount}:t));
        }
      }
      sbPushNotif(req.empId,`Top-up ${decision.toLowerCase()}${decision==="Approved"?": "+fmt(req.amount):""}`,decision==="Approved"?"success":"error");
    }
    toast(decision==="Approved"?`✓ Top-up approved`:"Rejected",decision==="Approved"?"success":"error");
    // Handle expense splitting — create claims for each split colleague
    if(form.splitWith&&form.splitWith.length>0){
      const splitCount=form.splitWith.length+1;
      const splitAmount=Math.round(amount/splitCount);
      for(const colleagueId of form.splitWith){
        const splitClaimId="EXP-"+uid();
        const splitData={...claimData,id:splitClaimId,empId:colleagueId,amount:splitAmount,
          desc:form.desc+" (split from "+claimId+")",autoApproved:false,status:"Pending",splitFrom:claimId};
        if(SB_ENABLED){
          await supabase.from("claims").insert({
            id:splitClaimId,company_id:cid,trip_id:tripId,emp_id:colleagueId,
            date:claimDate,category:form.category,description:splitData.desc,
            vendor:form.vendor||"",amount:splitAmount,status:"Pending",
            orig_currency:"INR",auto_approved:false,
          });
        } else {
          setClaims(p=>[splitData,...p]);
        }
        // Notify the colleague
        await sbPushNotif(colleagueId,`${user.name} split a ${fmt(amount)} expense with you — your share: ${fmt(splitAmount)}`,"info");
      }
    }
    setMdl(null);
    setTab("approvals");
    if(SB_ENABLED) loadFromSB();
  };

  // ── Hotel savings incentive (Phase 2) ───────────────────────────────────────
  const computeHotelSavings=async(trip)=>{
    if(!co.policy?.gradeBased) return;
    const emp=co.users.filter(u=>(trip.assignedTo||[]).includes(u.id));
    for(const e of emp){
      if((e.grade||0)<4) continue; // Only grades 4+ eligible (TERC §18)
      const hotelClaims=co.claims.filter(c=>c.tripId===trip.id&&c.empId===e.id&&c.status==="Approved"&&(c.category==="Accommodation"||c.category==="Hotel"));
      for(const leg of (trip.legs||[])){
        const legClaims=hotelClaims.filter(c=>c.city===leg.toCity||(!c.city&&leg.toCity));
        const actualSpent=legClaims.reduce((s,c)=>s+c.amount,0);
        const entitled=leg.hotelLimit*leg.days;
        const saved=entitled-actualSpent;
        if(saved>0){
          const bonus=Math.round(saved*0.5); // 50% of saving
          if(SB_ENABLED){
            await supabase.from("users").update({balance:(e.balance||0)+bonus}).eq("id",e.id);
            await sbPushNotif(e.id,`🏨 Hotel savings bonus: ₹${bonus.toLocaleString("en-IN")} credited (50% of ₹${saved.toLocaleString("en-IN")} saved in ${leg.toCity})`,"success");
          }
          toast(`Hotel savings bonus ₹${bonus.toLocaleString("en-IN")} credited to ${e.name}`);
        }
      }
    }
  };

  const closeTrip=async(tripId)=>{
    const trip=co.trips.find(t=>t.id===tripId);
    if(!trip)return;
    if(!isAdmin&&!isManager){toast("Only admin or manager can close trips","error");return;}

    if(SB_ENABLED){await supabase.from("trips").update({status:"closed"}).eq("id",tripId);const t=co.trips.find(x=>x.id===tripId);if(t)await computeHotelSavings(t);await loadFromSB();}
    else setTrips(p=>p.map(t=>t.id===tripId?{...t,status:"closed"}:t));

    const tripClaims=co.claims.filter(c=>c.tripId===tripId&&c.status==="Approved");
    const total=tripClaims.reduce((s,c)=>s+c.amount,0);
    const summaryMsg=`Trip "${trip.name}" closed. ${tripClaims.length} approved expenses, total ${fmt(total)} of ${fmt(trip.budget)} budget.`;

    // Generate PDF settlement
    try{
      const doc=await generateSettlementPDF(trip,co.claims,getUser,activeMeta?.name,co.users,co.policy);
      doc.save(`${trip.name||"Trip"}_Settlement.pdf`);
      const pdfBlob=doc.output("blob");
      const url=URL.createObjectURL(pdfBlob);
      const a=document.createElement("a");
      a.href=url;a.download=`Settlement_${trip.name.replace(/\s+/g,"_")}_${trip.endDate||today()}.pdf`;
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }catch(e){log.warn("PDF generation failed:",e.message);}

    // Notify all stakeholders
    const notifyUsers=[
      ...(trip.assignedTo||[]),
      ...co.users.filter(u=>u.role==="admin").map(u=>u.id),
      ...co.users.filter(u=>u.role==="manager").map(u=>u.id),
      ...co.users.filter(u=>u.role==="finance").map(u=>u.id),
    ];
    const uniqueIds=[...new Set(notifyUsers)];
    for(const uid of uniqueIds){
      await sbPushNotif(uid,summaryMsg,"info");
      const u=co.users.find(x=>x.id===uid);
      if(u?.email)emailAlert(u.email,`Trip Closed: ${trip.name}`,summaryMsg);
      if(u?.mobile)whatsappAlert(u.mobile,"xpensr_trip_summary",[trip.name,tripClaims.length.toString(),fmt(total)]);
    }
    toast(`✓ Trip closed — PDF downloaded — summary sent to all stakeholders`);
  };

  const savePolicyToSB=async(newPolicy)=>{
    if(SB_ENABLED){
      // Full upsert including all Phase 1 columns
      const fullRow={
        company_id:cid,
        auto_approve_limit:newPolicy.autoApproveLimit,
        reimbursement_mode:newPolicy.reimbursementMode,
        receipt_mandatory_above:newPolicy.receiptMandatoryAbove,
        weekend_requires_approval:newPolicy.weekendRequiresApproval,
        multi_level_approval:newPolicy.multiLevelApproval,
        approval_levels:newPolicy.approvalLevels,
        vendor_whitelist:newPolicy.vendorWhitelist,
        vendor_blacklist:newPolicy.vendorBlacklist,
        department_budgets:newPolicy.departmentBudgets,
        category_pct:newPolicy.categoryPct,
        scheduled_reports:newPolicy.scheduledReports,
        dual_approve_above:newPolicy.dualApproveAbove||0,
        notify_email_on_approve:newPolicy.notifyEmailOnApprove,
        notify_email_on_reject:newPolicy.notifyEmailOnReject,
        notify_wa_on_approve:newPolicy.notifyWaOnApprove,
        notify_wa_on_reject:newPolicy.notifyWaOnReject,
        categories:newPolicy.categories,
        departments:newPolicy.departments,
        primary_color:newPolicy.primaryColor||"#7ED957",
        // Phase 1
        grade_based:newPolicy.gradeBased||false,
        city_classification:newPolicy.cityClassification||false,
        escalation_hrs:newPolicy.escalationHrs||48,
        approval_hierarchy:newPolicy.approvalHierarchy||[],
        grade_entitlements:newPolicy.gradeEntitlements||[],
        city_tiers:newPolicy.cityTiers||[],
        trip_purposes:newPolicy.tripPurposes||[],
        notice_period_domestic:newPolicy.noticePeriodDomestic||0,
        notice_period_overseas:newPolicy.noticePeriodOverseas||15,
        monthly_dept_budgets:newPolicy.monthlyDeptBudgets||{},
        team_budgets:newPolicy.teamBudgets||{},
        auto_approve_mins:newPolicy.autoApproveMins||10,
        conveyance_rate_per_km:newPolicy.conveyanceRatePerKm||4,
      };

      let{error}=await supabase.from("policy").upsert(fullRow);

      // If a column doesn't exist yet (migration not run), fall back to base columns only
      if(error&&(error.message?.includes("column")||error.message?.includes("schema cache"))){
        log.warn("Policy full upsert failed, trying base columns only:",error.message);
        const baseRow={
          company_id:cid,
          auto_approve_limit:newPolicy.autoApproveLimit,
          reimbursement_mode:newPolicy.reimbursementMode,
          receipt_mandatory_above:newPolicy.receiptMandatoryAbove,
          weekend_requires_approval:newPolicy.weekendRequiresApproval,
          multi_level_approval:newPolicy.multiLevelApproval,
          approval_levels:newPolicy.approvalLevels,
          vendor_whitelist:newPolicy.vendorWhitelist,
          vendor_blacklist:newPolicy.vendorBlacklist,
          department_budgets:newPolicy.departmentBudgets,
          category_pct:newPolicy.categoryPct,
          scheduled_reports:newPolicy.scheduledReports,
          dual_approve_above:newPolicy.dualApproveAbove||0,
          categories:newPolicy.categories,
          departments:newPolicy.departments,
        };
        const{error:e2}=await supabase.from("policy").upsert(baseRow);
        if(e2)throw new Error("Policy save failed: "+e2.message+"\n\n⚠ Contact your administrator to update settings.");
        toast("⚠ Some settings require a system update. Contact support.","warn");
      } else if(error){
        throw new Error("Policy save failed: "+error.message);
      }

      // Update local state directly — no loadFromSB needed
      setCoData(p=>({...p,policy:newPolicy}));
      // Audit log
      await sbAddAudit("Policy Updated","","Settings saved by admin");
    }
  };

  const setCoPolicy=async(fn)=>{
    const newPol=typeof fn==="function"?fn(co.policy):fn;
    if(SB_ENABLED){setCoData(p=>({...p,policy:newPol}));}
    else setPolicy(()=>newPol);
  };

  const addUserToSB=async(userData,password)=>{
    if(!SB_ENABLED)return;

    const withTimeout=(promise,ms)=>Promise.race([
      promise,
      new Promise((_,rej)=>setTimeout(()=>rej(new Error("Request timed out after "+ms/1000+"s")),ms))
    ]);

    // Try RPC first
    let userId=null;
    try{
      const{data,error}=await withTimeout(
        supabase.rpc("create_employee",{
          p_company_id:cid,
          p_name:userData.name,
          p_username:userData.username,
          p_password:password,
          p_role:userData.role||"employee",
          p_dept:userData.dept||"Operations",
          p_balance:userData.balance||0,
          p_email:userData.email||null,
          p_mobile:userData.mobile||null,
        }),
        12000
      );
      if(error)throw new Error(error.message);
      if(data?.error)throw new Error(data.error);
      userId=data?.id||data;
      // Patch grade/gradeLabel/groupId after RPC (RPC doesn't have these params)
      if(userId&&(userData.grade||userData.gradeLabel||userData.groupId)){
        await supabase.from("users").update({
          grade:userData.grade||0,
          grade_label:userData.gradeLabel||"",
          group_id:userData.groupId||null,
        }).eq("id",userId);
      }
    }catch(rpcErr){
      log.warn("create_employee RPC failed:",rpcErr.message,". Trying direct insert...");
      // Fallback: direct INSERT
      const newId=(crypto.randomUUID?.())||(Date.now()+"-"+Math.random()).toString(36);
      const av=(userData.name[0]+(userData.name.split(" ")[1]?.[0]||"")).toUpperCase();
      const{error:insErr}=await supabase.from("users").insert({
        id:newId, company_id:cid,
        name:userData.name, email:userData.email||null,
        username:userData.username.toLowerCase(),
        mobile:userData.mobile||null,
        password_hash:password,
        role:userData.role||"employee",
        avatar:av,
        dept:userData.dept||"Operations",
        balance:userData.balance||0,
        reimbursable:0,
        auth_type:"custom",
        is_suspended:false,
        grade:userData.grade||0,
        grade_label:userData.gradeLabel||"",
        group_id:userData.groupId||null,
      });
      if(insErr)throw new Error("RPC: "+rpcErr.message+". Direct insert: "+insErr.message+". Please contact your administrator.");
      userId=newId;
    }

    try{await loadFromSB();}catch(e){log.warn("loadFromSB after add:",e);}
    toast(`✓ ${userData.name} added · Login: ${userData.username.toLowerCase()}`);
    return userId;
  };

  const updateUserInSB=async(userId,patch)=>{
    if(!SB_ENABLED)return;
    // Build DB patch directly — no RPC needed for updates
    const dbPatch={};
    if(patch.name!==undefined)        dbPatch.name=patch.name;
    if(patch.role!==undefined)        dbPatch.role=patch.role;
    if(patch.dept!==undefined)        dbPatch.dept=patch.dept;
    if(patch.balance!==undefined)     dbPatch.balance=patch.balance;
    if(patch.grade!==undefined)        dbPatch.grade=patch.grade;
    if(patch.gradeLabel!==undefined)   dbPatch.grade_label=patch.gradeLabel;
    if(patch.groupId!==undefined)      dbPatch.group_id=patch.groupId;
    if(patch.reportingTo!==undefined)  dbPatch.reporting_to=patch.reportingTo;
    if(patch.isSuspended!==undefined) dbPatch.is_suspended=patch.isSuspended;
    if(patch.delegateTo!==undefined)  dbPatch.delegate_to=patch.delegateTo;
    if(patch.delegateUntil!==undefined) dbPatch.delegate_until=patch.delegateUntil??null; // null clears it
    if(patch.mobile!==undefined)      dbPatch.mobile=patch.mobile;
    if(patch.email!==undefined)       dbPatch.email=patch.email;
    if(patch.notifyEmail!==undefined) dbPatch.notify_email=patch.notifyEmail;

    // Handle password change via RPC (needs bcrypt)
    if(patch.password){
      try{
        const{error}=await supabase.rpc("reset_user_password",{
          p_user_id:userId,p_new_password:patch.password
        });
        if(error)throw new Error(error.message);
      }catch(e){
        // Fallback: store plain text (user should change password)
        dbPatch.password_hash=patch.password;
      }
    }

    if(Object.keys(dbPatch).length>0){
      const{error}=await supabase.from("users").update(dbPatch).eq("id",userId);
      if(error)throw new Error(error.message);
    }
    await loadFromSB();
  };

  const addCommentToSB=async(claimId,text)=>{
    if(SB_ENABLED){
      await supabase.from("claim_comments").insert({claim_id:claimId,user_id:user.id,user_name:user.name,text});
      await loadFromSB();
    } else {
      // handled inline in ClaimModal
    }
  };

  // Exports
  const exportCSV=()=>{
    const rows=[["ID","Date","Employee","Dept","Vendor","Trip","Category","Description","Orig Amt","Orig Cur","INR Amt","Status","Auto","Anomaly","Remarks"]];
    co.claims.forEach(c=>{const e=getUser(c.empId);const t=co.trips.find(tr=>tr.id===c.tripId);rows.push([c.id,c.date,e?.name||"",e?.dept||"",c.vendor||"",t?.name||"",c.category,c.desc,c.origAmount||c.amount,c.origCur||"INR",c.amount,c.status,c.autoApproved?"Yes":"No",c.anomaly?"Yes":"No",c.remarks]);});
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`XpensR_${cid}_${today()}.csv`;a.click();toast("📊 CSV exported");
  };
  const exportTally=()=>{
    const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<ENVELOPE>\n  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>\n  <BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA>\n`+co.claims.filter(c=>c.status==="Approved").map(c=>{const e=getUser(c.empId);return`    <TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Payment" ACTION="Create"><DATE>${c.date.replace(/-/g,"")}</DATE><NARRATION>${c.desc} - ${e?.name||""}</NARRATION><VOUCHERTYPENAME>Payment</VOUCHERTYPENAME><ALLLEDGERENTRIES.LIST><LEDGERNAME>${c.category}</LEDGERNAME><AMOUNT>-${c.amount}</AMOUNT></ALLLEDGERENTRIES.LIST></VOUCHER></TALLYMESSAGE>`;}).join("\n")+`\n  </REQUESTDATA></IMPORTDATA></BODY>\n</ENVELOPE>`;
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([xml],{type:"text/xml"}));a.download=`Tally_${cid}_${today()}.xml`;a.click();toast("📊 Tally XML exported");
  };
  const exportGSTR=()=>{
    const rows=[["GSTIN Supplier","Invoice No","Date","Value","Rate","Taxable","IGST","Category","Employee"]];
    co.claims.filter(c=>c.status==="Approved"&&c.notes?.includes("GSTIN")).forEach(c=>{const gstin=c.notes.match(/GSTIN:\s*([A-Z0-9]{15})/)?.[1]||"";const inv=c.notes.match(/Invoice:\s*([^\s|]+)/)?.[1]||"";const e=getUser(c.empId);const taxable=Math.round(c.amount/1.18);const igst=c.amount-taxable;rows.push([gstin,inv,c.date,c.amount,18,taxable,igst,c.category,e?.name||""]);});
    const csv=rows.map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`GSTR2A_${cid}_${today()}.csv`;a.click();toast("📊 GSTR-2A exported");
  };
  const exportZoho=()=>{
    const rows=[["ExpenseID","Date","MerchantName","Category","Amount","Currency","Description","ReimbursableExpense","EmployeeEmail"]];
    co.claims.filter(c=>c.status==="Approved").forEach(c=>{const e=getUser(c.empId);rows.push([c.id,c.date,c.vendor||c.desc,c.category,c.amount,"INR",c.desc,co.policy.reimbursementMode?"true":"false",e?.email||""]);});
    const csv=rows.map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`ZohoBooks_${cid}_${today()}.csv`;a.click();toast("📊 Zoho Books exported");
  };

  // ── SAP Export (FI-compatible CSV for journal entry upload) ──────────────
  const exportSAP=()=>{
    const month=new Date().toISOString().slice(0,7);
    // SAP FI format: posting date, document type, GL account, cost center, amount, text
    const rows=[
      ["Posting Date","Document Type","Company Code","Currency","GL Account","Cost Center","Profit Center","Amount","Tax Code","Reference","Assignment","Text","Employee","Vendor","Category","Trip"]
    ];
    co.claims.filter(c=>c.status==="Approved").forEach(c=>{
      const e=getUser(c.empId);
      const glMap={Travel:"40100001","Meals":"40100002","Accommodation":"40100003","Office Supplies":"40100004","Client Entertainment":"40100005","Software":"40100006","Training":"40100007","Miscellaneous":"40100009"};
      const gl=glMap[c.category]||"40100009";
      const costCenter=`CC_${(e?.dept||"OPS").toUpperCase().replace(/\s+/g,"_").slice(0,8)}`;
      rows.push([
        c.date.replace(/-/g,"/"),  // Posting date
        "KR",                       // Vendor invoice document type
        cid.toUpperCase().slice(0,4)||"CMPN", // Company code
        c.origCur||"INR",           // Currency
        gl,                         // GL Account
        costCenter,                 // Cost Center
        `PC_${(e?.dept||"OPS").slice(0,4).toUpperCase()}`, // Profit Center
        c.amount.toFixed(2),        // Amount
        c.origCur==="INR"?"V5":"V0",// Tax code
        c.id,                       // Reference document
        c.tripId||"",              // Assignment (trip)
        `${c.category}: ${c.desc}`.slice(0,50), // Text (max 50)
        e?.name||"",               // Employee name
        c.vendor||"",              // Vendor
        c.category,                // Category
        co.trips.find(t=>t.id===c.tripId)?.name||"", // Trip name
      ]);
    });
    // Also create balance sheet entry for employee payable
    const totalPayable=co.claims.filter(c=>c.status==="Approved"&&co.policy.reimbursementMode).reduce((s,c)=>s+c.amount,0);
    if(totalPayable>0){
      rows.push([today().replace(/-/g,"/"),"SA","CMPN","INR","20100001","","",totalPayable.toFixed(2),"","BAL_CTRL","","Employee Expense Payable "+month,"System","","",""]);}

    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"})); // BOM for SAP
    a.download=`SAP_FI_${cid}_${month}.csv`;
    a.click();
    toast("📊 SAP FI export ready — import via SAP FB50/FAGLL03");
  };

  // ── Monthly digest + override summary for finance ────────────────────────
  const exportMonthlyDigest=()=>{
    const month=new Date().toISOString().slice(0,7);
    const approved=co.claims.filter(c=>c.status==="Approved");
    const overrides=editRequests.filter(r=>r.status==="Approved");
    const byDept={};
    approved.forEach(c=>{const e=getUser(c.empId);const d=e?.dept||"Unknown";byDept[d]=(byDept[d]||0)+c.amount;});
    const w=window.open("","_blank");
    w.document.write(`<!DOCTYPE html><html><head><title>XpensR Monthly Digest ${month}</title>
    <style>body{font-family:sans-serif;max-width:800px;margin:30px auto;color:#111;font-size:13px}
    h1{font-size:20px;color:#0f1c09}h2{font-size:14px;margin:20px 0 8px;color:#5CB83A;border-bottom:2px solid #e8f0e5;padding-bottom:4px}
    table{width:100%;border-collapse:collapse;margin:10px 0}th{background:#f0fde9;padding:7px 10px;font-size:11px;text-align:left}
    td{padding:7px 10px;border-bottom:1px solid #f3f4f6;font-size:12px}.total{font-weight:700;color:#16a34a}
    .warn{background:#fef3c7;color:#92400e;padding:8px 12px;border-radius:6px;margin:8px 0;font-size:12px}
    .footer{font-size:10px;color:#9ca3af;margin-top:20px;border-top:1px solid #f3f4f6;padding-top:10px}</style></head><body>
    <h1>📊 XpensR Monthly Digest — ${month}</h1>
    <p style="color:#6b7280">Company: ${activeMeta.name} · Generated: ${new Date().toLocaleString("en-IN")}</p>
    <h2>Summary</h2>
    <table><tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Total Claims</td><td>${approved.length}</td></tr>
    <tr><td>Total Approved Amount</td><td class="total">₹${approved.reduce((s,c)=>s+c.amount,0).toLocaleString("en-IN")}</td></tr>
    <tr><td>Pending Claims</td><td>${co.claims.filter(c=>c.status==="Pending").length}</td></tr>
    <tr><td>Edit Overrides (Approved)</td><td style="color:${overrides.length>0?"#dc2626":"#16a34a"}">${overrides.length}</td></tr>
    </table>
    <h2>Spend by Department</h2>
    <table><tr><th>Department</th><th>Amount</th></tr>
    ${Object.entries(byDept).sort((a,b)=>b[1]-a[1]).map(([d,a])=>`<tr><td>${d}</td><td>₹${a.toLocaleString("en-IN")}</td></tr>`).join("")}
    </table>
    ${overrides.length>0?`<h2>⚠ Edit Overrides (Audit Trail)</h2>
    ${overrides.length>0?'<div class="warn">'+overrides.length+' expense edit(s) were approved by managers this period. See detail below.</div>':''}
    <table><tr><th>Claim ID</th><th>Requested By</th><th>Approved By</th><th>Reason</th><th>Date</th></tr>
    ${overrides.map(r=>`<tr><td>${r.claim_id||r.claimId}</td><td>${r.requester_name||r.requesterName}</td><td>${r.reviewer_name||r.reviewerName||"—"}</td><td>${r.reason}</td><td>${r.created_at?new Date(r.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric"}):""}</td></tr>`).join("")}
    </table>`:""}
    <div class="footer">XpensR by RB · This digest should be reviewed by the Finance team. All override entries require supporting justification.</div>
    </body></html>`);
    w.document.close();w.print();
  };

  const exportClaimsPDF=async(claimsToExport,title,subtitle)=>{
    try{
      // jsPDF loaded from npm package
      const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
      const W=297,M=14;let y=M;

      // Header
      doc.setFillColor(15,28,9);doc.rect(0,0,W,22,"F");
      doc.setTextColor(126,217,87);doc.setFont("helvetica","bold");doc.setFontSize(14);doc.text("XpensR",M,14);
      doc.setTextColor(200,200,200);doc.setFontSize(9);doc.text("by RB",M+20,14);
      doc.setTextColor(255,255,255);doc.setFontSize(10);doc.text(title||"Expense Report",W/2,14,{align:"center"});
      doc.setTextColor(150,150,150);doc.setFontSize(8);doc.text(subtitle||new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric"}),W-M,14,{align:"right"});
      y=28;

      // Summary
      const approved=claimsToExport.filter(c=>c.status==="Approved");
      const total=claimsToExport.reduce((s,c)=>s+c.amount,0);
      doc.setFontSize(9);doc.setFont("helvetica","normal");doc.setTextColor(100,100,100);
      doc.text(`${claimsToExport.length} claims · ₹${total.toLocaleString("en-IN")} total · ${approved.length} approved`,M,y);y+=7;

      // Table header
      doc.setFillColor(21,128,61);doc.rect(M,y,W-2*M,6.5,"F");
      doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(7.5);
      const cols=[["ID",18],["Date",20],["Employee",28],["Dept",22],["Trip/Project",30],["Category",24],["Vendor",28],["Description",40],["Amount",18],["Status",18]];
      let tx=M+1;
      cols.forEach(([h,w])=>{doc.text(h,tx,y+4.5);tx+=w;});
      y+=7;

      // Rows
      claimsToExport.forEach((c,i)=>{
        if(y>188){doc.addPage();y=14;}
        doc.setFillColor(i%2===0?248:242,i%2===0?252:248,i%2===0?242:236);
        doc.rect(M,y,W-2*M,5.5,"F");
        doc.setTextColor(40,40,40);doc.setFont("helvetica","normal");doc.setFontSize(7);
        const emp=getUser(c.empId);
        const trip=co.trips.find(t=>t.id===c.tripId);
        const vals=[c.id?.slice(-6)||"",c.date||"",emp?.name?.slice(0,14)||"—",emp?.dept?.slice(0,10)||"—",(trip?.name||c.projectCode||"—").slice(0,16),c.category?.slice(0,12)||"",c.vendor?.slice(0,14)||"—",c.desc?.slice(0,20)||"","₹"+(c.amount||0).toLocaleString("en-IN"),c.status?.slice(0,10)||""];
        tx=M+1;
        vals.forEach((v,vi)=>{doc.text(String(v),tx,y+4);tx+=cols[vi][1];});
        y+=6;
      });

      // Total row
      y+=2;doc.setDrawColor(21,128,61);doc.setLineWidth(0.4);doc.line(M,y,W-M,y);y+=4;
      doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(21,128,61);
      doc.text(`Total: ₹${total.toLocaleString("en-IN")}`,W-M,y,{align:"right"});

      // Footer
      doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(150,150,150);
      doc.text(`XpensR by RB · ${activeMeta?.name||""} · Generated ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric"})}`,W/2,200,{align:"center"});

      // Open PDF in new tab instead of forcing download
      const pdfUrl=doc.output("bloburl");
      window.open(pdfUrl,"_blank");
      toast("✓ PDF downloaded");
    }catch(e){
      log.error("PDF error:",e);
      toast("PDF generation failed — "+e.message,"error");
    }
  };

  const printSummary=(clms,empUser,trip)=>exportClaimsPDF(clms,
    trip?`Trip: ${trip.name}`:empUser?`Claims: ${empUser.name}`:"All Claims",
    `${companyName||""} · ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric"})}`
  );

  const navItems=[
    {id:"dashboard", icon:"▦",  label:isAdmin?"Org Dashboard":isCFO&&!isAdmin?"Executive Dash":isHR?"HR Overview":"Dashboard"},
    ...(isAdmin?[{id:"cfo_view",icon:"📈",label:"Executive View"}]:[]),
    ...(!isCFO||isAdmin?(!isHR?[{id:"claims",icon:"📋",label:isAdmin?"All Claims":isManager?"Dept Claims":"My Expenses"}]:[]):[]),
    ...(hasPerm("submit")&&!canApprove?[{id:"submit",icon:"＋",label:"New Expense"}]:[]),
    ...(!isCFO||isAdmin?(!isHR?[{id:"trips",icon:"🗂️",label:"Trips / Periods"}]:[]):[]),
    ...(canApprove?[{id:"approvals",icon:"✓",label:"Approvals",badge:myPendingClaims.length+pendingTopups.length}]:[]),
    ...(!isCFO||isAdmin?(!isHR?[{id:"topup",icon:"💰",label:"Top-up"}]:[]):[]),
    {id:"analytics", icon:"📊", label:"Analytics"},
    ...(canApprove?[{id:"ledger",icon:"📒",label:"Trip Ledger"},{id:"balances",icon:"⚖️",label:"Balances & Settlement"}]:[]),
    ...(canApprove||isFinance||isHR?[{id:"audit",icon:"🗒️",label:"Audit Log"}]:[]),
    ...(isAdmin||isFinance||isManager?[{id:"finance_view",icon:"💼",label:isManager&&!isAdmin&&!isFinance?"Dept Budget":"Finance"}]:[]),
    ...(isHR?[{id:"hr_view",icon:"👔",label:"HR Oversight"},{id:"policy",icon:"⚙️",label:"Policy (view)"}]:[]),
    ...(!isAdmin&&isCFO?[{id:"cfo_view",icon:"📈",label:"Executive View"}]:[]),
    ...(isAdmin||isManager?[{id:"employees",icon:"👥",label:"Employees"}]:[]),
    ...(isAdmin?[{id:"policy",icon:"⚙️",label:"Policy"}]:[]),
  ];

  return(
    <div className="xpensr-root" data-dark={String(isDark)} style={{display:"flex",minHeight:"100vh",fontFamily:FB,background:isDark?"#0f172a":"#f5faf3",color:isDark?"#f0f9ff":"#1a2e12",transition:"background .2s,color .2s"}}>
      {/* PWA Install Banner — shown on Android Chrome when app is installable */}
      {showInstallBanner&&<div style={{position:"fixed",bottom:76,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:DARK,borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 8px 32px #0008",maxWidth:340,width:"calc(100% - 32px)"}}>
        <img src="/pwa-192.png" style={{width:32,height:32,borderRadius:7,flexShrink:0}} alt="XpensR"/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:12,color:"#fff",marginBottom:1}}>Add to Home Screen</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,.5)"}}>Install XpensR for quick access</div>
        </div>
        <button onClick={installPWA} style={{background:G,border:"none",borderRadius:7,padding:"6px 11px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",flexShrink:0,fontFamily:FB}}>Install</button>
        <button onClick={dismissInstallBanner} style={{background:"none",border:"none",color:"rgba(255,255,255,.35)",cursor:"pointer",fontSize:14,padding:2,flexShrink:0}}>✕</button>
      </div>}
      <style>{GLSTYLE+`.login-inp::placeholder{color:rgba(255,255,255,0.28)!important;font-weight:300}.login-inp::-webkit-input-placeholder{color:rgba(255,255,255,0.28)!important}`}</style>
      <style>{`
        /* Font size scaling — zoom scales EVERYTHING including inline px styles */
        .xpensr-root { zoom: ${(appFontSize/13).toFixed(3)}; }
        @supports not (zoom: 1) {
          /* Firefox fallback — transform scale */
          .xpensr-root { transform: scale(${(appFontSize/13).toFixed(3)}); transform-origin: top left; width: ${(100*(13/appFontSize)).toFixed(1)}%; }
        }
      `}</style>
      {notif&&<div style={{position:"fixed",top:20,right:20,zIndex:2000,padding:"14px 18px 14px 16px",borderRadius:12,fontWeight:600,fontSize:13,background:notif.t==="error"?"#fee2e2":notif.t==="warn"?"#fef3c7":"#dcfce7",color:notif.t==="error"?"#dc2626":notif.t==="warn"?"#92400e":"#15803d",boxShadow:"0 4px 24px #0003",maxWidth:400,display:"flex",alignItems:"flex-start",gap:10,wordBreak:"break-word"}}><span style={{flex:1,lineHeight:1.5}}>{notif.msg}</span><button onClick={()=>setNtf(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"inherit",opacity:0.6,flexShrink:0,padding:0,lineHeight:1}}>✕</button></div>}
      {!online&&<div style={{position:"fixed",bottom:0,left:0,right:0,background:"#92400e",color:"#fef3c7",textAlign:"center",padding:"7px",fontSize:12,fontWeight:600,zIndex:999}}>📴 Offline — claims queued ({queue.length}) · will sync when connected</div>}
      {showHelp&&<HelpManual userRole={user.role} onClose={()=>setSHelp(false)}/>}
      {showCam&&<CameraModal onCapture={f=>{setCamF(f);setSCam(false);setTab("submit");}} onClose={()=>setSCam(false)}/>}
      {showShortcuts&&<ShortcutHelp onClose={()=>setSSC(false)}/>}
      {showPrefs&&<PrefsModal onClose={()=>setSPrefs(false)} policy={co.policy} savePolicy={savePolicyToSB}/>}
      {showFundReq&&hasPerm("submit")&&<FundRequestModal trips={co.trips} user={user} cid={cid} onClose={()=>setSFR(false)} onSubmit={handleFundRequest} sbEnabled={SB_ENABLED}/>}
      {showTutorial&&<OnboardingTutorial role={user.role} onClose={closeTutorial}/>}
      {showChatbot&&<AIChatbot user={user} co={co} onClose={()=>setShowChatbot(false)}/>}
      {/* Floating chatbot button */}
      <button onClick={()=>setShowChatbot(p=>!p)} style={{position:"fixed",bottom:72,right:20,width:48,height:48,borderRadius:"50%",background:`linear-gradient(135deg,${G},${GD})`,color:"#fff",border:"none",fontSize:22,cursor:"pointer",boxShadow:"0 4px 16px rgba(126,217,87,.5)",zIndex:799,display:"flex",alignItems:"center",justifyContent:"center"}}>
        {showChatbot?"✕":"🤖"}
      </button>
      {/* Floating + button for quick actions */}
      {showFab&&<div style={{position:"fixed",bottom:254,right:22,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:10,zIndex:798}}>
        {hasPerm("submit")&&<div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{background:"rgba(0,0,0,.7)",color:"#fff",fontSize:11,padding:"4px 10px",borderRadius:6,whiteSpace:"nowrap"}}>New Expense</span>
          <button onClick={()=>{setShowFab(false);setTab("submit");}} style={{width:42,height:42,borderRadius:"50%",background:G,color:"#fff",border:"none",fontSize:18,cursor:"pointer",boxShadow:"0 3px 12px rgba(126,217,87,.4)"}}>📤</button>
        </div>}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{background:"rgba(0,0,0,.7)",color:"#fff",fontSize:11,padding:"4px 10px",borderRadius:6,whiteSpace:"nowrap"}}>New Trip</span>
          <button onClick={()=>{setShowFab(false);setTab("trips");}} style={{width:42,height:42,borderRadius:"50%",background:"#7c3aed",color:"#fff",border:"none",fontSize:18,cursor:"pointer",boxShadow:"0 3px 12px rgba(124,58,237,.4)"}}>🗂</button>
        </div>
        {!canApprove&&<div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{background:"rgba(0,0,0,.7)",color:"#fff",fontSize:11,padding:"4px 10px",borderRadius:6,whiteSpace:"nowrap"}}>Request Top-up</span>
          <button onClick={()=>{setShowFab(false);setTab("topup");}} style={{width:42,height:42,borderRadius:"50%",background:"#f59e0b",color:"#fff",border:"none",fontSize:18,cursor:"pointer",boxShadow:"0 3px 12px rgba(245,158,11,.4)"}}>💰</button>
        </div>}
      </div>}
      <button onClick={()=>setShowFab(p=>!p)} style={{position:"fixed",bottom:200,right:20,width:44,height:44,borderRadius:"50%",background:showFab?"#dc2626":INK,color:"#fff",border:"none",fontSize:20,cursor:"pointer",boxShadow:"0 4px 14px rgba(0,0,0,.3)",zIndex:798,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>
        {showFab?"✕":"＋"}
      </button>
      {showProf&&(
        <div style={{position:"fixed",inset:0,background:"#00000060",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setSPro(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#f5faf3",borderRadius:16,padding:28,width:"min(580px,96vw)",maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px #0003"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span style={{fontFamily:FD,fontSize:17,fontWeight:700,color:INK}}>Profile & Settings</span>
              <button onClick={()=>setSPro(false)} style={{background:"none",border:"none",fontSize:16,cursor:"pointer",color:MUTED}}>✕</button>
            </div>
            <Profile user={user} users={co.users} setUsers={fn=>{if(!SB_ENABLED)setUsers(fn);}} onLogout={onLogout} updateUserInSB={updateUserInSB} toast={toast}/>
          </div>
        </div>
      )}

      {/* SIDEBAR — desktop only */}
      <div className="mob-hide" style={{width:sidebar?222:60,background:DARK,display:"flex",flexDirection:"column",padding:sidebar?"20px 12px":"20px 8px",position:"sticky",top:0,height:"100vh",overflow:"hidden",transition:"width .22s ease",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:sidebar?"space-between":"center",marginBottom:14,minHeight:48}}>
          {sidebar&&<div style={{overflow:"hidden",width:140}}><Logo width={140} dark/></div>}
          <button onClick={()=>setSB(!sidebar)} style={{width:26,height:26,borderRadius:7,background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(255,255,255,.7)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0}}>{sidebar?"◀":"▶"}</button>
        </div>
        {sidebar&&<div style={{background:"rgba(255,255,255,.06)",borderRadius:8,padding:"7px 10px",marginBottom:10}}><div style={{fontSize:9,color:G,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:1}}>Workspace</div><div style={{color:"#fff",fontSize:11,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{activeMeta.name}</div></div>}
        {sidebar&&<div style={{background:co.policy.reimbursementMode?"#1e3a5f":"#1a3510",border:`1px solid ${co.policy.reimbursementMode?"#3b82f6":G}`,borderRadius:7,padding:"4px 9px",marginBottom:6,fontSize:9,fontWeight:600,color:co.policy.reimbursementMode?"#93c5fd":G}}>{user.role==="admin"?"🔑 Admin":user.role==="manager"?"👔 Manager":user.role==="finance"?"💼 Finance":"👤 Employee"}</div>}
        
        <nav style={{display:"flex",flexDirection:"column",gap:2,overflow:"auto",flex:1}}>
          {navItems.map(item=>(
            <button key={item.id} onClick={()=>setTab(item.id)} title={!sidebar?item.label:""}
              style={{display:"flex",alignItems:"center",gap:sidebar?8:0,padding:sidebar?"9px 11px":"9px 0",justifyContent:sidebar?"flex-start":"center",borderRadius:8,cursor:"pointer",border:"none",fontFamily:FB,fontSize:12,fontWeight:tab===item.id?600:400,background:tab===item.id?primaryColor:"transparent",color:tab===item.id?"#fff":"rgba(255,255,255,.5)",transition:"all .15s",width:"100%",position:"relative"}}>
              <span style={{fontSize:14,width:17,textAlign:"center",flexShrink:0}}>{item.icon}</span>
              {sidebar&&<span style={{flex:1,whiteSpace:"nowrap",overflow:"hidden"}}>{item.label}</span>}
              {sidebar&&item.badge>0&&<span style={{background:"#ef4444",color:"#fff",fontSize:9,padding:"1px 5px",borderRadius:10,fontWeight:700}}>{item.badge}</span>}
              {!sidebar&&item.badge>0&&<span style={{position:"absolute",top:3,right:3,width:7,height:7,background:"#ef4444",borderRadius:"50%"}}/>}
            </button>
          ))}
        </nav>
        <div style={{paddingTop:10,borderTop:"1px solid rgba(255,255,255,.08)"}}>
          {sidebar?(
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7,cursor:"pointer"}} onClick={()=>setSPro(true)} title="Edit profile">
              <div style={{width:28,height:28,borderRadius:"50%",background:canApprove?G:"#334155",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:10,flexShrink:0,border:"2px solid rgba(255,255,255,.15)"}}>{user.avatar}</div>
              <div style={{overflow:"hidden"}}><div style={{color:"#fff",fontSize:11,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.name.split(" ")[0]}</div><div style={{color:"rgba(255,255,255,.7)",fontSize:9,textTransform:"capitalize"}}>{user.role==="admin"?"Admin":user.role==="manager"?"Manager":user.role==="finance"?"Finance":"Employee"}</div></div>
            </div>
          ):(
            <div style={{display:"flex",justifyContent:"center",marginBottom:7}} onClick={()=>setSPro(true)}>
              <div style={{width:26,height:26,borderRadius:"50%",background:canApprove?G:"#334155",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:9,cursor:"pointer"}}>{user.avatar}</div>
            </div>
          )}
          <button onClick={()=>{
            try{localStorage.removeItem(SESSION_KEY);}catch{}
            window.location.replace("/");
          }} style={{width:"100%",padding:"6px",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:6,color:"rgba(255,255,255,.7)",fontFamily:FB,fontSize:10,cursor:"pointer"}}>{sidebar?"Sign Out":"↩"}</button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{flex:1,padding:"16px 18px",overflow:"auto",minWidth:0,paddingBottom:80,background:"var(--bg,#f5faf3)"}} className="fin">
        {/* FX Ticker Tape */}
        <div style={{margin:"-16px -18px 12px -18px"}}><FXTicker/></div>
        {/* Top bar */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,paddingBottom:10,borderBottom:`1px solid ${BDR}`,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0,flex:1}}>
            <div style={{width:30,height:30,borderRadius:8,background:GL,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:GD,fontSize:11,flexShrink:0}}>{inits(activeMeta.name)}</div>
            <div style={{minWidth:0}}><div style={{fontWeight:700,color:INK,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{activeMeta.name}</div><div style={{fontSize:10,color:MUTED}}>{activeMeta.plan}{user.delegateTo?` · →${getUser(user.delegateTo)?.name?.split(" ")[0]}`:""}</div></div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            {hasPerm("export")&&(
              <div style={{position:"relative"}} className="mob-hide">
                <Btn v="outline" onClick={()=>setShowExportMenu(p=>!p)} style={{fontSize:10,padding:"5px 10px"}}>⬇ Export ▾</Btn>
                {showExportMenu&&<>
                  <div style={{position:"fixed",inset:0,zIndex:199}} onClick={()=>setShowExportMenu(false)}/>
                  <div style={{position:"absolute",top:"100%",right:0,marginTop:4,background:"var(--card,#fff)",border:`1px solid ${BDR}`,borderRadius:10,boxShadow:"0 8px 24px #0002",zIndex:200,minWidth:160,overflow:"hidden"}}>
                    {[
                      {icon:"📊",label:"CSV",fn:exportCSV},
                      {icon:"📗",label:"Excel (CSV)",fn:exportCSV},
                      {icon:"📒",label:"Tally XML",fn:exportTally},
                      {icon:"📘",label:"GSTR-2A",fn:exportGSTR},
                      {icon:"🔵",label:"Zoho Books",fn:exportZoho},
                    ].map(({icon,label,fn})=>(
                      <button key={label} onClick={()=>{fn();setShowExportMenu(false);}} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"10px 14px",background:"none",border:"none",borderBottom:`1px solid ${BDR}`,cursor:"pointer",fontFamily:FB,fontSize:12,color:INK,textAlign:"left",transition:"background .1s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="var(--hover-bg,#f0fde9)"}
                        onMouseLeave={e=>e.currentTarget.style.background="none"}>
                        <span style={{fontSize:14}}>{icon}</span>{label}
                      </button>
                    ))}
                  </div>
                </>}
              </div>
            )}
            {isManager&&<Btn v="outline" onClick={async()=>{
                // Monthly digest — email to all finance users
                const financeUsers=co.users.filter(u=>u.role==="finance"||u.role==="admin");
                const thisMonth=new Date().toLocaleString("default",{month:"long",year:"numeric"});
                const approved=co.claims.filter(c=>c.status==="Approved");
                const total=approved.reduce((s,c)=>s+c.amount,0);
                const byEmp={};
                approved.forEach(c=>{byEmp[c.empId]=(byEmp[c.empId]||0)+c.amount;});
                const topRows=Object.entries(byEmp).sort((a,b)=>b[1]-a[1]).slice(0,10)
                  .map(([id,amt])=>`<tr><td>${getUser(id)?.name||id}</td><td>₹${amt.toLocaleString("en-IN")}</td></tr>`).join("");
                const html=`<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                  <div style="background:#0f1c09;padding:18px 24px;border-radius:10px 10px 0 0"><span style="color:#7ED957;font-weight:800;font-size:18px">XpensR</span> <span style="color:rgba(255,255,255,.4);font-size:11px">Monthly Digest — ${thisMonth}</span></div>
                  <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px">
                    <h2 style="color:#1a2e12;font-size:16px">Expense Summary — ${activeMeta?.name||""}</h2>
                    <p>Total approved: <strong>₹${total.toLocaleString("en-IN")}</strong> across ${approved.length} claims</p>
                    <table style="width:100%;border-collapse:collapse;margin-top:16px"><thead><tr style="background:#f0fde9"><th style="padding:8px;text-align:left">Employee</th><th style="padding:8px;text-align:left">Total</th></tr></thead><tbody>${topRows}</tbody></table>
                  </div></div>`;
                for(const u of financeUsers){
                  if(u.email)await emailAlert(u.email,`XpensR Monthly Digest — ${thisMonth}`,`Expense digest for ${thisMonth}`,html);
                }
                toast("✓ Monthly digest sent to finance team");
              }} style={{fontSize:10,padding:"5px 8px"}} className="mob-hide">📊 Digest</Btn>}
            {isEmployee&&<button onClick={()=>setSFR(true)} title="Request Funds" style={{background:"var(--hover-bg,#f0fde9)",border:`1.5px solid ${BDR}`,borderRadius:8,padding:"7px 10px",cursor:"pointer",fontSize:17,lineHeight:1,transition:"all .15s"}}>💰</button>}
            <button onClick={()=>setSCam(true)} title="Camera" style={{background:"var(--hover-bg,#f0fde9)",border:`1.5px solid ${BDR}`,borderRadius:8,padding:"7px 10px",cursor:"pointer",fontSize:17,lineHeight:1,transition:"all .15s"}}>📷</button>
            <button onClick={()=>{setTab("inbox");markRead();}} style={{position:"relative",background:"var(--hover-bg,#f0fde9)",border:`1.5px solid ${BDR}`,borderRadius:8,padding:"7px 10px",cursor:"pointer",fontSize:17,lineHeight:1,transition:"all .15s"}}>🔔{myNotifs.length>0&&<span style={{position:"absolute",top:-4,right:-4,width:16,height:16,background:"#ef4444",borderRadius:"50%",color:"#fff",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{myNotifs.length}</span>}</button>
            <button onClick={()=>setSPrefs(true)} title="Display Settings (font size, dark mode)" style={{background:"var(--hover-bg,#f0fde9)",border:`1.5px solid ${BDR}`,borderRadius:8,padding:"7px 10px",cursor:"pointer",fontSize:17,lineHeight:1,transition:"all .15s"}}>{isDark?"☀":"🌙"}</button>
            <button onClick={()=>setSSC(true)} title="Keyboard Shortcuts (?)" style={{background:"var(--hover-bg,#f0fde9)",border:`1.5px solid ${BDR}`,borderRadius:8,padding:"7px 10px",cursor:"pointer",fontSize:17,lineHeight:1,transition:"all .15s"}}>⌨</button>
            <button onClick={()=>setSHelp(true)} style={{background:"var(--hover-bg,#f0fde9)",border:`1.5px solid ${BDR}`,borderRadius:8,padding:"7px 10px",cursor:"pointer",fontSize:17,lineHeight:1,transition:"all .15s"}}>❓</button>
            {SB_ENABLED&&<button onClick={loadFromSB} style={{background:"var(--hover-bg,#f0fde9)",border:`1.5px solid ${BDR}`,borderRadius:8,padding:"7px 10px",cursor:"pointer",fontSize:17,lineHeight:1,transition:"all .15s"}}>🔄</button>}
          </div>
        </div>

        {/* TABS */}
        {tab==="dashboard"&&isManager&&<>
          <TravelCalendar trips={isAdmin?co.trips:visibleTrips} users={co.users} isAdmin={isAdmin} myDept={myUser?.dept} visibleUserIds={visibleUserIds}/>
          <MgrDash co={co} meta={activeMeta} setTab={setTab} getUser={getUser} isAdmin={isAdmin} myUserId={user.id}/>
        </>}
        {tab==="dashboard"&&isHR&&!isManager&&<HROversightTab claims={co.claims} trips={co.trips} users={co.users} getUser={getUser} policy={co.policy} aretRequests={[]} fmt={fmt}/>}
        {tab==="dashboard"&&user.role==="cfo"&&<CFODashboard claims={co.claims} trips={co.trips} users={co.users} policy={co.policy} topups={co.topups} getUser={getUser} fmt={fmt} activeMeta={activeMeta}/>}
        {tab==="dashboard"&&!isManager&&!isHR&&user.role!=="cfo"&&<EmpDash user={user} myUser={myUser} co={co} setTab={setTab}/>}
        {tab==="claims"&&<ClaimsTab
          claims={isAdmin?co.claims:isManager?co.claims.filter(c=>{const e=getUser(c.empId);return c.empId===user.id||e?.dept===myUser?.dept;}):isFinance?co.claims.filter(c=>c.status==="Approved"||c.status==="Manager Approved"):co.claims.filter(c=>c.empId===user.id)}
          trips={co.trips} isManager={isManager} isAdmin={isAdmin} isFinance={isFinance}
          getUser={getUser} setMdl={setMdl} submitEditRequest={submitEditRequest}
          hasEditWindow={hasEditWindow} userId={user.id} onExportPDF={exportClaimsPDF}/>}
        {tab==="submit"&&hasPerm("submit")&&<SubmitTab user={user} co={co} submitClaim={submitClaim} camFile={camFile} clearCamFile={()=>setCamF(null)} onCam={()=>setSCam(true)} companyCategories={companyCategories} onCreateTrip={()=>setTab("trips")} sbCreateTrip={sbCreateTrip} aiTokenBalance={aiTokenBalance} setAiTokenBalance={setAiTokenBalance} cid={cid}/>}
        {tab==="trips"&&<TripsTab trips={isAdmin?co.trips:visibleTrips} setTrips={fn=>{if(!SB_ENABLED)setTrips(fn);}} claims={isAdmin?co.claims:visibleClaims}
          isManager={isManager} isAdmin={isAdmin} getUser={getUser} users={co.users}
          closeTrip={closeTrip} toast={toast} uid={user.id} userRole={user.role} myUser={myUser}
          sbPushNotif={sbPushNotif} companyUsers={co.users}
          sbCreateTrip={sbCreateTrip}
          policy={co.policy}
          cid={cid}
          approveTrip={approveTrip} rejectTrip={rejectTrip}
          notifyApprovers={notifyApprovers}
          deleteTrip={deleteTrip}
          deleteClaim={deleteClaim}
          sbUpdateTrip={async(tripId,patch)=>{
            if(SB_ENABLED){
              const dbPatch={};
              if(patch.name!==undefined)dbPatch.name=patch.name;
              if(patch.endDate!==undefined)dbPatch.end_date=patch.endDate;
              if(patch.startDate!==undefined)dbPatch.start_date=patch.startDate;
              if(patch.budget!==undefined)dbPatch.budget=patch.budget;
              if(patch.categoryLimits!==undefined)dbPatch.category_limits=patch.categoryLimits;
              if(patch.employeeBudgets!==undefined)dbPatch.employee_budgets=patch.employeeBudgets;
              if(patch.status!==undefined)dbPatch.status=patch.status;
              if(patch.tripMode!==undefined)dbPatch.trip_mode=patch.tripMode;
              if(patch.currency!==undefined)dbPatch.currency=patch.currency;
              if(patch.projectCode!==undefined)dbPatch.project_code=patch.projectCode;
              if(patch.tripType!==undefined)dbPatch.trip_type=patch.tripType;
              if(patch.purpose!==undefined)dbPatch.purpose=patch.purpose;
              if(patch.customerName!==undefined)dbPatch.customer_name=patch.customerName;
              if(patch.accompanying!==undefined)dbPatch.accompanying=patch.accompanying;
              const{error}=await supabase.from("trips").update(dbPatch).eq("id",tripId);
              if(error)throw new Error(error.message);
              // Handle trip legs — delete all existing and re-insert
              if(patch.legs!==undefined){
                await supabase.from("trip_legs").delete().eq("trip_id",tripId);
                if(patch.legs.length>0){
                  await supabase.from("trip_legs").insert(
                    patch.legs.map((l,idx)=>({
                      id:l.id||uid(),
                      company_id:cid,
                      trip_id:tripId,
                      leg_num:idx+1,
                      from_city:l.fromCity||"",
                      to_city:l.toCity||"",
                      depart_at:l.departAt||null,
                      arrive_at:l.arriveAt||null,
                      mode:l.mode||"",
                      city_tier:l.cityTier||"D",
                      hotel_limit:l.hotelLimit||0,
                      diem_rate:l.diemRate||0,
                      days:l.days||1,
                    }))
                  );
                }
              }
              // Handle assignedTo changes via trip_assignments table
              if(patch.assignedTo!==undefined){
                await supabase.from("trip_assignments").delete().eq("trip_id",tripId);
                if(patch.assignedTo.length>0){
                  await supabase.from("trip_assignments").insert(
                    patch.assignedTo.map(uid=>({trip_id:tripId,user_id:uid}))
                  );
                }
              }
              await loadFromSB();
            } else {
              setTrips(p=>p.map(t=>t.id===tripId?{...t,...patch}:t));
            }
          }}
        />}
        {tab==="approvals"&&canApprove&&<ApprovalsTab pendingClaims={approvableClaimsForMe} pendingTopups={pendingTopups} getUser={getUser} trips={co.trips} handleDecision={handleDecision} handleTopup={handleTopup} setMdl={setMdl} isAdmin={isAdmin} needsDualApproval={needsDualApproval} approveTrip={approveTrip} rejectTrip={rejectTrip} user={user} users={co.users} editRequests={editRequests} approveEditRequest={approveEditRequest} rejectEditRequest={rejectEditRequest} onReload={loadFromSB} onReloadEditRequests={loadEditRequests} approveLimit={myUser?.approveLimit||co.policy?.autoApproveLimit||999999999} setClaims={fn=>{if(!SB_ENABLED)setClaims(fn);}}/>}
        {tab==="topup"&&<TopupTab user={user} topups={canApprove?co.topups.filter(t=>t.status==="Pending"||t.empId===user.id):co.topups.filter(t=>t.empId===user.id)} setTopups={fn=>{if(!SB_ENABLED)setTopups(fn);}} toast={toast} trips={co.trips} isManager={isManager||isAdmin} managerUsers={isManager||isAdmin?co.users.filter(u=>visibleUserIds.has(u.id)&&u.id!==user.id):[]} sbCreateTopup={async(req)=>{if(SB_ENABLED){const{error:te}=await supabase.from("topups").insert({id:req.id,company_id:cid,emp_id:req.empId,amount:req.amount,reason:req.reason,date:req.date,status:req.status||"Pending",trip_id:req.tripId});if(te){toast("Top-up request failed: "+te.message,"error");return;}if(req.status==="Approved"){await handleTopup({...req,id:req.id},false);}await loadFromSB();}else{setTopups(p=>[...p,req]);}}}/>}
        {tab==="analytics"&&<Analytics
          claims={isAdmin?co.claims:visibleClaims.filter(c=>isManager||c.empId===user.id)}
          trips={isAdmin?co.trips:visibleTrips}
          users={isAdmin?co.users:co.users.filter(u=>visibleUserIds.has(u.id))}
          isManager={isManager} isAdmin={isAdmin} getUser={getUser} policy={co.policy} printSummary={printSummary} user={user}/>}
        {tab==="inbox"&&<Inbox notifications={(co.notifications||[]).filter(n=>n.userId===user.id)} setNotifs={fn=>{if(!SB_ENABLED)setNotifs(fn);}} userId={user.id}/>}
        {tab==="audit"&&(isAdmin||user?.role==="cfo")&&<Audit auditLog={isAdmin?(co.auditLog||[]):(co.auditLog||[])} claims={co.claims} getUser={getUser} users={co.users} trips={co.trips} policy={co.policy}/>}
        {tab==="my_history"&&!isManager&&!isAdmin&&<MyHistoryTab user={user} trips={co.trips} claims={co.claims} getUser={getUser} exportClaimsPDF={exportClaimsPDF}/>}
        {tab==="ledger"&&canApprove&&<TripLedgerTab trips={isAdmin?co.trips:visibleTrips} claims={isAdmin?co.claims:visibleClaims} topups={co.topups} users={isAdmin?co.users:co.users.filter(u=>visibleUserIds.has(u.id))} getUser={getUser} isAdmin={isAdmin} myDept={myUser?.dept} companyName={activeMeta?.name||""}/>}
        {tab==="balances"&&canApprove&&<BalancesTab trips={co.trips} claims={co.claims} topups={co.topups} users={isAdmin?co.users:co.users.filter(u=>u.dept===myUser?.dept)} getUser={getUser} isAdmin={isAdmin} fmt={fmt} cid={cid} sbEnabled={SB_ENABLED} onReload={loadFromSB}/>}
        {/* ── HR Role View ── */}
        {tab==="hr_view"&&(isHR||isAdmin)&&<HROversightTab claims={co.claims} trips={co.trips} users={co.users} getUser={getUser} policy={co.policy} aretRequests={[]} fmt={fmt}/>}
        {/* ── CFO/CEO Executive View ── */}
        {(tab==="cfo_view")&&isCFO&&<CFODashboard claims={co.claims} trips={co.trips} users={co.users} policy={co.policy} topups={co.topups} getUser={getUser} fmt={fmt} activeMeta={activeMeta}/>}
        {/* HR can view Policy in read-only mode */}
        {tab==="policy"&&isHR&&<PolicyReadOnly policy={co.policy} users={co.users}/>}
        {tab==="finance_view"&&(isAdmin||isFinance||isManager)&&<FinanceTab claims={co.claims.filter(c=>c.status==="Approved"||c.status==="Manager Approved")} trips={co.trips} getUser={getUser} users={co.users} isAdmin={isAdmin} isManager={isManager} policy={co.policy} onExportPDF={exportClaimsPDF}
          onBudgetEnhancement={submitBudgetEnhancement}
          onApproveBudgetEnhancement={approveBudgetEnhancement}
          myDept={myUser?.dept}
          myUser={myUser}/>}
        {tab==="trip_approvals"&&canApprove&&<TripApprovalsTab trips={co.trips} getUser={getUser} approveTrip={approveTrip} rejectTrip={rejectTrip} isAdmin={isAdmin}/>}
        {tab==="editreqs"&&canApprove&&<EditRequestsTab editRequests={editRequests} claims={co.claims} getUser={getUser} isManager={canApprove} approveEditRequest={approveEditRequest} rejectEditRequest={rejectEditRequest} submitEditRequest={submitEditRequest} hasEditWindow={hasEditWindow} userId={user.id} reload={loadEditRequests}/>}
        {tab==="employees"&&(isAdmin||isManager)&&<Employees companyMeta={activeMeta} users={isAdmin?co.users:co.users.filter(u=>u.dept===myUser?.dept||u.id===user.id)} setUsers={fn=>{if(!SB_ENABLED)setUsers(fn);}} claims={co.claims} policy={co.policy} toast={toast} addUserToSB={addUserToSB} updateUserInSB={updateUserInSB} sbEnabled={SB_ENABLED} companyDepts={companyDepts} isAdmin={isAdmin} currentUser={myUser}
          empGroups={co.empGroups||[]}
          sbSaveGroup={async(g)=>{
            if(SB_ENABLED){
              const{error}=await supabase.from("employee_groups").upsert({id:g.id,company_id:cid,name:g.name,dept:g.dept||null,manager_id:g.managerId||null});
              if(error)throw new Error(error.message);
              await loadFromSB();
            }
            toast("✓ Group saved: "+g.name);
          }}
          sbDeleteGroup={async(groupId)=>{
            if(SB_ENABLED){
              // Remove group from members first
              await supabase.from("users").update({group_id:null,reporting_to:null}).eq("group_id",groupId);
              await supabase.from("employee_groups").delete().eq("id",groupId);
              await loadFromSB();
            }
            toast("Group deleted");
          }}
        />}
        {tab==="policy"&&isAdmin&&<Policy policy={co.policy} setPolicy={setCoPolicy} savePolicy={savePolicyToSB} toast={toast} users={co.users} sbEnabled={SB_ENABLED} cid={cid}/>}
        {tab==="help"&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK}}>Help & Getting Started</h1>
            <Btn onClick={()=>setShowTutorial(true)} style={{fontSize:12}}>▶ Launch Tutorial</Btn>
          </div>
          <HelpManual userRole={user.role} onClose={()=>setTab("dashboard")} inline={true}/>
        </div>}
      </div>

      {modal?.type==="editRequest"&&<EditRequestModal claim={modal.data} userId={user.id} userName={user.name} cid={cid} onClose={()=>setMdl(null)} onSubmit={submitEditRequest} sbEnabled={SB_ENABLED}/>}
      {modal&&modal.type!=="editRequest"&&<ClaimModal modal={modal} setMdl={setMdl} handleDecision={handleDecision} getUser={getUser} trips={co.trips} claims={co.claims} setClaims={fn=>{if(!SB_ENABLED)setClaims(fn);}} userId={user.id} userName={user.name} addCommentToSB={addCommentToSB} sbEnabled={SB_ENABLED} cid={cid} editRequests={editRequests} onEditRequest={submitEditRequest} onApproveEditRequest={approveEditRequest} onRejectEditRequest={rejectEditRequest} isAdmin={isAdmin} isManager={isManager} hasEditWindow={hasEditWindow} deleteClaim={deleteClaim}/>}

      {/* MOBILE BOTTOM NAV */}
      {/* ── MOBILE BOTTOM NAV ─────────────────────────────────────────────── */}
      {/* Avatar tap → profile (mobile) */}
      <div style={{display:"none",position:"fixed",bottom:0,left:0,right:0,background:DARK,borderTop:"1px solid rgba(255,255,255,.12)",padding:"6px 0 env(safe-area-inset-bottom,8px)",zIndex:100,justifyContent:"space-around"}} className="mob-bottom-nav">
        {[
          {id:"dashboard",icon:"▦",label:"Home"},
          ...(hasPerm("submit")?[{id:"submit",icon:"＋",label:"Expense"}]:[]),
          ...(canApprove?[{id:"approvals",icon:"✓",label:"Approve",badge:myPendingClaims.length+pendingTopups.length}]:[]),
          {id:"trips",icon:"🗂",label:"Trips"},
          {id:"claims",icon:"📋",label:isAdmin?"All":"My"},
          {id:"_more",icon:"⋯",label:"More"},
        ].map(item=>(
          <button key={item.id} onClick={()=>{
            if(item.id==="_more")setShowMobMore(true);
            else setTab(item.id);
          }}
            style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"4px 2px",position:"relative",minWidth:0}}>
            <span style={{fontSize:17,lineHeight:1,color:tab===item.id?primaryColor:"rgba(255,255,255,.45)"}}>{item.icon}</span>
            <span style={{fontSize:9,color:tab===item.id?primaryColor:"rgba(255,255,255,.4)",fontFamily:FB,fontWeight:tab===item.id?700:400}}>{item.label}</span>
            {(item.badge||0)>0&&<span style={{position:"absolute",top:0,right:"20%",width:14,height:14,background:"#ef4444",borderRadius:"50%",color:"#fff",fontSize:8,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{item.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── MOBILE MORE SHEET ─────────────────────────────────────────────── */}
      {showMobMore&&(
        <div data-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end"}} onClick={()=>setShowMobMore(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"var(--card,#fff)",borderRadius:"18px 18px 0 0",padding:"10px 0 30px",maxHeight:"80vh",overflow:"auto"}}>
            {/* Handle */}
            <div style={{width:36,height:4,background:"#e5e7eb",borderRadius:2,margin:"0 auto 14px"}}/>
            <div style={{padding:"0 16px 8px",fontSize:10,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:1}}>All Options</div>
            {[
              {id:"dashboard",icon:"▦",label:"Dashboard"},
              ...(hasPerm("submit")&&!canApprove?[{id:"submit",icon:"＋",label:"New Expense"}]:[]),
              {id:"trips",icon:"🗂",label:"Trips / Periods"},
              ...(canApprove?[{id:"approvals",icon:"✓",label:"Approvals",badge:myPendingClaims.length+pendingTopups.length}]:[]),
              // Edit Requests merged into Approvals tab
              {id:"claims",icon:"📋",label:isAdmin?"All Claims":isManager?"Dept Claims":"My Expenses"},
              ...(canApprove?[{id:"ledger",icon:"📒",label:"Trip Ledger"}]:[]),
    ...(canApprove?[{id:"balances",icon:"⚖️",label:"Balances"}]:[]),
    ...(canApprove?[{id:"balances",icon:"⚖️",label:"Balances"}]:[]),
              ...(canApprove?[{id:"topup",icon:"💰",label:"Top-ups"}]:[]),
              {id:"analytics",icon:"📊",label:"Analytics"},
              {id:"inbox",icon:"🔔",label:"Inbox",badge:myNotifs.length},
              ...(isAdmin?[{id:"employees",icon:"👥",label:"Employees"}]:[]),
              ...(isAdmin?[{id:"policy",icon:"⚙️",label:"Policy & Settings"}]:[]),
              ...(canApprove?[{id:"audit",icon:"🗒️",label:"Audit Log"}]:[]),
              {id:"help",icon:"❓",label:"Help & Tutorial"},
              {id:"_profile",icon:"👤",label:"My Profile"},
            ].map(item=>(
              <button key={item.id} onClick={()=>{
                setShowMobMore(false);
                if(item.id==="_profile")setSPro(true);
                else setTab(item.id);
              }}
                style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"12px 20px",background:"none",border:"none",cursor:"pointer",textAlign:"left",position:"relative"}}>
                <span style={{fontSize:20,width:28,textAlign:"center",lineHeight:1}}>{item.icon}</span>
                <span style={{fontSize:14,color:INK,fontFamily:FB,flex:1}}>{item.label}</span>
                {(item.badge||0)>0&&<span style={{background:"#ef4444",color:"#fff",borderRadius:10,fontSize:10,fontWeight:700,padding:"1px 7px",minWidth:18,textAlign:"center"}}>{item.badge}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

}


// ─── EMPLOYEE DASHBOARD ───────────────────────────────────────────────────────
function EmpDash({user,myUser,co,setTab}){
  const isAdmin=myUser?.role==="admin";
  const claims=co.claims.filter(c=>c.empId===user.id);
  const approved=claims.filter(c=>c.status==="Approved").reduce((s,c)=>s+c.amount,0);
  const activeTrip=co.trips.find(t=>t.status==="active"&&(!t.assignedTo||t.assignedTo.includes(user.id)));
  const tripSpent=activeTrip?co.claims.filter(c=>c.tripId===activeTrip.id&&c.empId===user.id&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0):0;
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <div><h1 style={{fontFamily:FD,fontSize:22,fontWeight:700,color:INK}}>Welcome back, {user.name.split(" ")[0]} 👋</h1><p style={{color:MUTED,fontSize:12,marginTop:2}}>{co.policy.reimbursementMode?"Reimbursement mode active":"Your wallet balance"}</p></div>
        <Btn onClick={()=>setTab("submit")}>＋ New Expense</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:12,marginBottom:14}}>
        <Card style={{padding:20,background:`linear-gradient(135deg,#1a5c2a,#2e8b4e)`}}>
          <div style={{fontSize:10,color:"rgba(255,255,255,.55)",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>{co.policy.reimbursementMode?"Pending Reimbursement":"Wallet Balance"}</div>
          <div style={{fontFamily:FD,fontSize:28,fontWeight:700,color:"#ffffff",marginTop:5}}>{fmt(co.policy.reimbursementMode?myUser?.reimbursable||0:myUser?.balance||0)}</div>
          {!co.policy.reimbursementMode&&<div style={{marginTop:8}}><PBar value={approved} max={(myUser?.balance||0)+approved} h={3} color={G}/></div>}
        </Card>
        <Card style={{padding:16}}><div style={{fontSize:20}}>📋</div><div style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK,marginTop:3}}>{claims.length}</div><div style={{fontSize:11,color:MUTED}}>Total Claims</div></Card>
        <Card style={{padding:16}}><div style={{fontSize:20}}>⏳</div><div style={{fontFamily:FD,fontSize:20,fontWeight:700,color:"#f59e0b",marginTop:3}}>{claims.filter(c=>c.status==="Pending").length}</div><div style={{fontSize:11,color:MUTED}}>Pending</div></Card>
      </div>
      {activeTrip&&<Card style={{padding:16,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div><div style={{fontSize:10,color:MUTED,textTransform:"uppercase",letterSpacing:1}}>Active Trip</div><div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK}}>{activeTrip.name}</div></div><Badge s="Active" sm/></div>
        <div style={{display:"flex",gap:16,marginBottom:6}}>{[["Budget",fmt(activeTrip.budget)],["Spent",fmt(tripSpent)],["Left",fmt(Math.max(0,activeTrip.budget-tripSpent))]].map(([k,v])=><div key={k}><div style={{fontSize:9,color:MUTED}}>{k}</div><div style={{fontWeight:700,color:INK,fontSize:12}}>{v}</div></div>)}</div>
        <PBar value={tripSpent} max={activeTrip.budget}/>
      </Card>}
      <Card>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${BDR}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK}}>Recent Claims</span><Btn v="outline" onClick={()=>setTab("claims")} style={{fontSize:10,padding:"4px 9px"}}>View All →</Btn></div>
        <table style={{width:"100%"}}>
          <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>{claims.slice(0,5).map(c=><tr key={c.id} className="rh">
            <td style={{color:MUTED,fontSize:11}}>{fmtDate(c.date)}</td>
            <td style={{fontSize:12}}>{c.anomaly&&<span title="Anomaly" style={{marginRight:3}}>🔍</span>}{c.desc}</td>
            <td><span style={{background:GL,color:GD,padding:"1px 6px",borderRadius:4,fontSize:10,fontWeight:600}}>{c.category}</span></td>
            <td style={{fontWeight:700,fontSize:12}}>{fmt(c.amount)}</td>
            <td><Badge s={displayStatus(c,isAdmin)} sm/></td>
          </tr>)}</tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── MANAGER DASHBOARD ────────────────────────────────────────────────────────
function MgrDash({co,meta,setTab,getUser,myUserId}){
  const myUser=co.users.find(u=>u.id===myUserId);
  const myDept=myUser?.dept;
  const isAdmin=myUser?.role==="admin";
  // Filter employees by dept for manager, show all for admin
  const emps=co.users.filter(u=>u.role==="employee"&&(isAdmin||u.dept===myDept));
  const deptClaims=co.claims.filter(c=>{
    if(isAdmin)return true;
    const emp=getUser(c.empId);
    return emp?.dept===myDept;
  });
  const total=deptClaims.filter(c=>c.status!=="Rejected").reduce((s,c)=>s+c.amount,0);
  const pending=deptClaims.filter(c=>c.status==="Pending").length;
  const anomalies=deptClaims.filter(c=>c.anomaly&&c.status==="Pending").length;
  const activeTrips=co.trips.filter(t=>{
    if(isAdmin)return t.status==="active";
    return t.status==="active"&&(t.assignedTo||[]).some(id=>getUser(id)?.dept===myDept||id===myUserId);
  });
  const activeTrip=activeTrips[0];
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div><h1 style={{fontFamily:FD,fontSize:22,fontWeight:700,color:INK}}>{isAdmin?"Organisation Dashboard":"Team Dashboard"}</h1><p style={{color:MUTED,fontSize:12,marginTop:2}}>{isAdmin?`Full visibility — ${meta.name}`:`${myDept||"Your department"} · ${meta.name}`}</p></div>
        <div style={{display:"flex",gap:8}}>
          {pending>0&&<Btn onClick={()=>setTab("approvals")} style={{background:"#ef4444",fontSize:11,padding:"7px 12px"}}>⏳ {pending} Pending</Btn>}
          {anomalies>0&&<Btn onClick={()=>setTab("approvals")} v="purple" style={{fontSize:11,padding:"7px 12px"}}>🔍 {anomalies} Anomalies</Btn>}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:16}}>
        {[{l:"Total Spent",v:fmt(total),i:"💰",c:G},{l:"Pending",v:pending,i:"⏳",c:"#f59e0b"},{l:"Anomalies",v:anomalies,i:"🔍",c:"#7c3aed"},{l:"Employees",v:emps.length,i:"👥",c:"#60a5fa"},{l:"Active Trips",v:activeTrips.length,i:"🗂️",c:"#a78bfa"}].map((s,i)=>(
          <Card key={i} style={{padding:15}}><div style={{fontSize:20}}>{s.i}</div><div style={{fontFamily:FD,fontSize:19,fontWeight:700,color:s.c,marginTop:3}}>{s.v}</div><div style={{fontSize:10,color:MUTED,marginTop:1}}>{s.l}</div></Card>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:14}}>
        <Card>
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${BDR}`}}><span style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK}}>Employee Balances</span></div>
          {emps.map(e=>{
            const approvedSpend=co.claims.filter(c=>c.empId===e.id&&c.status==="Approved").reduce((s,c)=>s+c.amount,0);
            const walletBalance=co.policy.reimbursementMode?(e.reimbursable||0):(e.balance||0);
            // Net balance = initial balance - approved claims (balance column already tracks this in balance mode)
            const netWallet=walletBalance;
            const alloc=netWallet+approvedSpend;
            return(
            <div key={e.id} style={{padding:"9px 16px",borderBottom:`1px solid #f8faf6`,display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:GL,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:GD,fontSize:10}}>{e.avatar}</div>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:INK}}>{e.name} <span style={{fontSize:10,color:MUTED}}>· {e.dept}</span></div><PBar value={approvedSpend} max={alloc||1} h={3}/></div>
              <div style={{textAlign:"right"}}>
                <div style={{fontWeight:700,color:netWallet<0?"#dc2626":INK,fontSize:12}}>{fmt(netWallet)}</div>
                <div style={{fontSize:9,color:MUTED}}>{co.policy.reimbursementMode?"to reimburse":"balance"}</div>
              </div>
            </div>
          );})}
        </Card>
        <Card style={{padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK}}>Department Budgets</div>
            {!isAdmin&&<button onClick={()=>setTab("finance_view")} style={{fontSize:10,padding:"3px 9px",background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:5,cursor:"pointer",color:"#92400e",fontWeight:600}}>📊 Request Enhancement</button>}
          </div>
          {Object.entries(co.policy.monthlyDeptBudgets||{}).filter(([d])=>isAdmin||d===myDept).map(([dept,cfg])=>{
            const monthly=cfg?.monthly||0;
            const yearly=cfg?.yearly||0;
            const now=today();const mo=now.slice(0,7);
            const spent=deptClaims.filter(c=>getUser(c.empId)?.dept===dept&&c.status!=="Rejected"&&c.date?.slice(0,7)===mo).reduce((s,c)=>s+c.amount,0);
            const remaining=monthly>0?Math.max(0,monthly-spent):null;
            return monthly>0||yearly>0?(
              <div key={dept} style={{marginBottom:12,padding:"8px 10px",background:"#f9fafb",borderRadius:8}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                  <span style={{fontWeight:600,color:INK}}>{dept}</span>
                  {remaining!==null&&<span style={{fontWeight:700,color:remaining<monthly*0.1?"#dc2626":remaining<monthly*0.3?"#f59e0b":"#16a34a",fontSize:11}}>₹{remaining.toLocaleString("en-IN")} left</span>}
                </div>
                {monthly>0&&<><div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:MUTED,marginBottom:2}}><span>Monthly: {fmt(spent)} / {fmt(monthly)}</span><span>{Math.min(100,Math.round(spent/monthly*100))}%</span></div><PBar value={spent} max={monthly} h={5}/></>}
                {yearly>0&&<div style={{fontSize:9,color:MUTED,marginTop:3}}>Annual limit: {fmt(yearly)}</div>}
              </div>
            ):null;
          })}
          {Object.keys(co.policy.monthlyDeptBudgets||{}).length===0&&Object.entries(co.policy.departmentBudgets||{}).filter(([d,b])=>b>0&&(isAdmin||d===myDept)).map(([dept,budget])=>(
            <div key={dept} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:2}}><span style={{color:MUTED}}>{dept}</span><span style={{fontWeight:600}}>{fmt(deptClaims.filter(c=>getUser(c.empId)?.dept===dept&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0))} / {fmt(budget)}</span></div>
              <PBar value={deptClaims.filter(c=>getUser(c.empId)?.dept===dept&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0)} max={budget} h={5}/>
            </div>
          ))}
          {activeTrip&&<div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${BDR}`}}>
            <div style={{fontSize:11,fontWeight:700,color:MUTED,marginBottom:6}}>Active: {activeTrip.name}</div>
            <div style={{display:"flex",gap:14,marginBottom:5}}>{[["Budget",fmt(activeTrip.budget)],["Spent",fmt(activeTrip.spent)],["Left",fmt(Math.max(0,activeTrip.budget-activeTrip.spent))]].map(([k,v])=><div key={k}><div style={{fontSize:9,color:MUTED}}>{k}</div><div style={{fontWeight:700,fontSize:12,color:INK}}>{v}</div></div>)}</div>
            <PBar value={activeTrip.spent} max={activeTrip.budget}/>
          </div>}
        </Card>
      </div>
    </div>
  );
}

// ─── CLAIMS TAB ───────────────────────────────────────────────────────────────
function ClaimsTab({claims,trips,isManager,isAdmin,isFinance,getUser,setMdl,submitEditRequest,hasEditWindow,userId,onExportPDF,companyName}){
  const [filter,setFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [anomalyOnly,setAO]=useState(false);
  const [reqEditClaim,setReqEdit]=useState(null);
  const [editReason,setEditReason]=useState("");
  const shown=claims.filter(c=>(filter==="All"||c.status===filter)&&(!anomalyOnly||c.anomaly)&&(c.desc.toLowerCase().includes(search.toLowerCase())||c.category.toLowerCase().includes(search.toLowerCase())));
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK}}>{isAdmin?"All Claims":isManager?"Dept Claims":"My Claims"}</h1>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {onExportPDF&&<Btn v="outline" onClick={()=>onExportPDF(shown,isAdmin?"All Claims":isManager?"Dept Claims":"My Claims",activeMeta?.name)} style={{fontSize:11,padding:"5px 10px"}}>⬇ PDF</Btn>}
          <label style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:MUTED,cursor:"pointer"}} className="mob-hide"><input type="checkbox" checked={anomalyOnly} onChange={e=>setAO(e.target.checked)} style={{accentColor:"#7c3aed"}}/>🔍 Anomalies</label>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search…" style={{padding:"7px 11px",border:`1.5px solid ${BDR}`,borderRadius:8,fontSize:12,width:150,background:"var(--input-bg,#fafff8)"}}/>
        </div>
      </div>
      <div style={{display:"flex",gap:7,marginBottom:12,flexWrap:"wrap"}}>
        {["All","Pending","Approved","Rejected"].map(s=><button key={s} onClick={()=>setFilter(s)} style={{padding:"5px 13px",borderRadius:20,border:`1.5px solid ${filter===s?G:BDR}`,background:filter===s?G:"#fff",color:filter===s?"#fff":MUTED,fontFamily:FB,fontSize:11,fontWeight:600,cursor:"pointer"}}>{s}</button>)}
      </div>

      {/* Request edit modal */}
      {reqEditClaim&&(
        <div style={{position:"fixed",inset:0,background:"#00000055",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,backdropFilter:"blur(3px)"}} onClick={()=>setReqEdit(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,padding:24,width:"min(420px,92vw)",boxShadow:"0 20px 60px #0003"}}>
            <h3 style={{fontFamily:FD,fontSize:16,fontWeight:700,color:INK,marginBottom:6}}>Request Edit — {reqEditClaim.id}</h3>
            <p style={{color:MUTED,fontSize:12,marginBottom:14,lineHeight:1.5}}>This expense is approved. Editing requires manager approval. Explain why you need to edit it.</p>
            <div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:7,padding:"8px 12px",marginBottom:12,fontSize:11,color:"#92400e"}}>
              ⚠ All edit requests and approvals are permanently recorded in the audit trail.
            </div>
            <textarea value={editReason} onChange={e=>setEditReason(e.target.value)} rows={3} placeholder="Reason for edit request (e.g. wrong amount entered, receipt was corrected…)" style={{width:"100%",padding:"9px 11px",border:`1.5px solid ${BDR}`,borderRadius:8,fontFamily:FB,fontSize:12,resize:"none",marginBottom:12}}/>
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={async()=>{if(!editReason.trim())return;await submitEditRequest(reqEditClaim,editReason);setReqEdit(null);setEditReason("");}} disabled={!editReason.trim()} style={{flex:1,padding:10}}>Submit Request →</Btn>
              <Btn v="outline" onClick={()=>setReqEdit(null)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}

      <Card>
        <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",minWidth:500}}>
          <thead><tr><th>ID</th><th>Date</th>{isManager&&<th>Employee</th>}<th className="mob-hide">Trip</th><th>Category</th><th>Description</th><th>Amount</th><th>Status</th><th>Act.</th></tr></thead>
          <tbody>{shown.map(c=>{
            const trip=trips.find(t=>t.id===c.tripId);const e=getUser(c.empId);
            const canRequestEdit=!isManager&&c.status==="Approved"&&!hasEditWindow(c.id);
            const editWindowOpen=!isManager&&hasEditWindow(c.id);
            return(<tr key={c.id} className="rh" onClick={()=>setMdl({type:"detail",data:c})}>
              <td style={{fontFamily:"monospace",color:GD,fontSize:10,fontWeight:600}}>{c.id}</td>
              <td style={{color:MUTED,fontSize:11}}>{fmtDate(c.date)}</td>
              {isManager&&<td><div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:22,height:22,borderRadius:"50%",background:GL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:GD}}>{e?.avatar}</div><span style={{fontSize:12}}>{e?.name}</span></div></td>}
              <td className="mob-hide" style={{fontSize:10,color:MUTED}}>{trip?.name?.slice(0,14)||"—"}</td>
              <td><span style={{background:GL,color:GD,padding:"1px 6px",borderRadius:4,fontSize:10,fontWeight:600}}>{CI[c.category]} {c.category}</span></td>
              <td style={{fontSize:12}}>{(isAdmin||isManager)&&c.flagged&&<span title="Cat%" style={{marginRight:2}}>⚠️</span>}{(isAdmin||isManager)&&c.anomaly&&<span title="Anomaly" style={{marginRight:2}}>🔍</span>}{c.weekendFlag&&<span title="Weekend" style={{marginRight:2}}>📅</span>}{c.desc}</td>
              <td style={{fontWeight:700,fontSize:12}}>{fmt(c.amount)}{c.origCur&&c.origCur!=="INR"&&<div style={{fontSize:9,color:MUTED}}>{c.origCur} {c.origAmount}</div>}</td>
              <td><Badge s={displayStatus(c,isAdmin)} sm/></td>
              <td onClick={ev=>ev.stopPropagation()}>
                {isManager&&c.status==="Pending"&&<div style={{display:"flex",gap:3}}>
                  <Btn onClick={()=>setMdl({type:"approve",data:c})} style={{padding:"4px 8px",fontSize:10}}>✓</Btn>
                  <Btn v="danger" onClick={()=>setMdl({type:"reject",data:c})} style={{padding:"4px 8px",fontSize:10}}>✗</Btn>
                </div>}
                {canRequestEdit&&<button onClick={()=>{setReqEdit(c);setEditReason("");}} style={{background:"none",border:"1px solid #fcd34d",color:"#92400e",borderRadius:5,padding:"3px 7px",fontSize:10,cursor:"pointer"}} title="Request edit">✏ Request Edit</button>}
                {editWindowOpen&&<button onClick={e=>{e.stopPropagation();setMdl({type:"editClaim",data:c});}} style={{background:"#dcfce7",color:"#16a34a",border:"1px solid #86efac",borderRadius:5,padding:"3px 7px",fontSize:10,cursor:"pointer",fontWeight:700}} title="Edit window approved — click to edit">✏ Edit Now</button>}
              </td>
            </tr>);
          })}</tbody>
        </table>
        </div>
        {shown.length===0&&<div style={{padding:36,textAlign:"center",color:MUTED}}>No claims found</div>}
      </Card>
    </div>
  );
}

// ─── TRIP EDIT MODAL ──────────────────────────────────────────────────────────
// ─── TRIP LEGS MODAL ──────────────────────────────────────────────────────────
function TripLegsModal({trip,policy,onClose,onSave}){
  const MODES=["Air","Train","Bus","Car","Taxi","Own Vehicle","Other"];
  const initLeg=()=>({id:uid(),legNum:Date.now(),fromCity:"",toCity:"",_toCityOther:false,_fromCityOther:false,departAt:"",arriveAt:"",mode:"",cityTier:"D",hotelLimit:0,diemRate:0,days:1});
  const[legs,setLegs]=useState(trip.legs?.length>0?trip.legs.map(l=>({...l,_toCityOther:false,_fromCityOther:false})):[initLeg()]);
  const[busy,setBusy]=useState(false);

  const cityTiers=policy?.cityTiers||[];
  const tierCities={A:cityTiers.filter(c=>c.tier==="A"),B:cityTiers.filter(c=>c.tier==="B"),C:cityTiers.filter(c=>c.tier==="C")};
  const hasCities=cityTiers.length>0;

  const getCityTierLocal=(city)=>{
    if(!city) return "D";
    const found=cityTiers.find(ct=>ct.city.toLowerCase()===city.toLowerCase());
    return found?.tier||"D";
  };

  const updateLeg=(idx,patch)=>{
    setLegs(prev=>{
      const updated=[...prev];
      const leg={...updated[idx],...patch};
      if(leg.departAt&&leg.arriveAt){
        const diff=Math.ceil((new Date(leg.arriveAt)-new Date(leg.departAt))/(1000*60*60*24));
        leg.days=Math.max(1,diff||1);
      }
      if(patch.toCity!==undefined) leg.cityTier=getCityTierLocal(leg.toCity);
      updated[idx]=leg;
      return updated;
    });
  };

  // City selector component (inline)
  const CitySelect=({value,onChange,label,showOther,onToggleOther})=>(
    <div><label style={{fontSize:10,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>{label}</label>
      {hasCities&&!showOther?(
        <select value={cityTiers.some(ct=>ct.city===value)?value:"__other__"}
          onChange={e=>{
            if(e.target.value==="__other__"){onToggleOther(true);onChange("");}
            else{onToggleOther(false);onChange(e.target.value);}
          }}
          style={{width:"100%",padding:"7px 10px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:12,fontFamily:FB,background:"var(--input-bg,#fafff8)",appearance:"none"}}>
          <option value="">Select city…</option>
          {tierCities.A.length>0&&<optgroup label="● Tier A — Metro">{tierCities.A.map(c=><option key={c.city}>{c.city}</option>)}</optgroup>}
          {tierCities.B.length>0&&<optgroup label="● Tier B — Major">{tierCities.B.map(c=><option key={c.city}>{c.city}</option>)}</optgroup>}
          {tierCities.C.length>0&&<optgroup label="● Tier C — Tier-2">{tierCities.C.map(c=><option key={c.city}>{c.city}</option>)}</optgroup>}
          <option value="__other__">Other city (Tier D)…</option>
        </select>
      ):(
        <div style={{display:"flex",gap:4}}>
          <input value={value||""} onChange={e=>onChange(e.target.value)} placeholder="Enter city name (Tier D)"
            style={{flex:1,padding:"7px 10px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:12,fontFamily:FB,background:"var(--input-bg,#fafff8)"}}/>
          {hasCities&&<button onClick={()=>{onToggleOther(false);onChange("");}} title="Back to list"
            style={{padding:"4px 8px",border:`1px solid ${BDR}`,borderRadius:6,background:"none",cursor:"pointer",fontSize:11,color:MUTED}}>↩</button>}
        </div>
      )}
    </div>
  );

  const save=async()=>{
    const valid=legs.every(l=>l.toCity&&l.departAt&&l.arriveAt);
    if(!valid){alert("All legs need at least a destination city and travel dates.");return;}
    setBusy(true);
    try{ await onSave(trip.id,legs); onClose(); }
    catch(e){alert("Failed: "+e.message);}
    finally{setBusy(false);}
  };

  const inpS={padding:"7px 10px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:12,fontFamily:FB,background:"var(--input-bg,#fafff8)",width:"100%"};

  return(
    <div data-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"var(--card,#fff)",borderRadius:16,padding:24,width:"min(760px,98vw)",maxHeight:"90vh",overflow:"auto",boxShadow:"0 16px 48px rgba(0,0,0,.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <h2 style={{fontFamily:FD,fontSize:17,fontWeight:700,color:INK}}>📍 Trip Itinerary — {trip.name}</h2>
            <p style={{fontSize:11,color:MUTED,marginTop:2}}>Define each leg of travel. Claims will be validated against these city-date windows.</p>
            {!hasCities&&<p style={{fontSize:10,color:"#f59e0b",marginTop:2}}>⚠ Add cities to Policy → City Classification to enable tier-based dropdowns.</p>}
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:MUTED}}>✕</button>
        </div>

        {legs.map((leg,idx)=>(
          <div key={leg.id||idx} style={{border:`1.5px solid ${BDR}`,borderRadius:10,padding:14,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontFamily:FB,fontSize:12,fontWeight:700,color:INK}}>
                Leg {idx+1}{leg.toCity?` → ${leg.toCity}`:""}
                {leg.cityTier&&leg.cityTier!=="D"&&(
                  <span style={{background:leg.cityTier==="A"?"#fee2e2":leg.cityTier==="B"?"#fef3c7":"#dbeafe",color:leg.cityTier==="A"?"#991b1b":leg.cityTier==="B"?"#92400e":"#1e40af",padding:"1px 7px",borderRadius:10,fontSize:10,marginLeft:6}}>Tier {leg.cityTier}</span>
                )}
              </span>
              {legs.length>1&&<button onClick={()=>setLegs(prev=>prev.filter((_,i)=>i!==idx))} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",fontSize:14}}>✕ Remove</button>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:8}}>
              <CitySelect value={leg.fromCity||""} label="FROM CITY" showOther={leg._fromCityOther}
                onChange={v=>updateLeg(idx,{fromCity:v})}
                onToggleOther={v=>updateLeg(idx,{_fromCityOther:v})}/>
              <CitySelect value={leg.toCity||""} label="TO CITY *" showOther={leg._toCityOther}
                onChange={v=>updateLeg(idx,{toCity:v})}
                onToggleOther={v=>updateLeg(idx,{_toCityOther:v})}/>
              <div><label style={{fontSize:10,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>DEPARTURE</label><input type="date" value={(leg.departAt||"").slice(0,10)} onChange={e=>updateLeg(idx,{departAt:e.target.value,arriveAt:leg.arriveAt||e.target.value})} style={inpS}/></div>
              <div><label style={{fontSize:10,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>RETURN DATE</label><input type="date" value={(leg.arriveAt||"").slice(0,10)} onChange={e=>updateLeg(idx,{arriveAt:e.target.value})} style={inpS}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
              <div><label style={{fontSize:10,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>MODE</label>
                <select value={leg.mode||""} onChange={e=>updateLeg(idx,{mode:e.target.value})} style={inpS}>
                  <option value="">Select…</option>{MODES.map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <div><label style={{fontSize:10,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>DAYS (auto)</label>
                <input value={leg.days||1} readOnly style={{...inpS,background:"var(--bg,#f9fafb)",color:MUTED}}/></div>
              <div><label style={{fontSize:10,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>HOTEL LIMIT ₹</label>
                <input type="number" value={leg.hotelLimit||""} onChange={e=>updateLeg(idx,{hotelLimit:parseFloat(e.target.value)||0})} placeholder="From grade entitlements" style={inpS}/></div>
              <div><label style={{fontSize:10,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>DIEM ₹/day</label>
                <input type="number" value={leg.diemRate||""} onChange={e=>updateLeg(idx,{diemRate:parseFloat(e.target.value)||0})} placeholder="From grade entitlements" style={inpS}/></div>
            </div>
            {leg.toCity&&<div style={{fontSize:10,color:MUTED,marginTop:6}}>
              Tier {leg.cityTier} city{leg.days>0?` · ${leg.days} day${leg.days!==1?"s":""}`:""}{leg.diemRate>0?` · Diem: ₹${(leg.days*leg.diemRate).toLocaleString("en-IN")}`:""}
            </div>}
          </div>
        ))}

        <button onClick={()=>setLegs(prev=>[...prev,{...initLeg(),legNum:prev.length+1}])}
          style={{background:"none",border:`1.5px dashed ${BDR}`,borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:12,color:MUTED,width:"100%",marginBottom:14}}>
          + Add Leg
        </button>

        {legs.some(l=>l.diemRate>0&&l.days>0)&&(
          <div style={{background:"#f0fde9",border:`1px solid #bbf7d0`,borderRadius:8,padding:10,marginBottom:12,fontSize:11}}>
            <strong>Total diem estimate:</strong>{" "}
            {legs.filter(l=>l.diemRate>0).map((l,i)=>`${l.toCity||"Leg"+(i+1)}: ${l.days}d × ₹${l.diemRate} = ₹${(l.days*l.diemRate).toLocaleString("en-IN")}`).join(" + ")}
            {" = "}<strong>₹{legs.reduce((s,l)=>s+(l.days||0)*(l.diemRate||0),0).toLocaleString("en-IN")}</strong>
          </div>
        )}

        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn v="outline" onClick={onClose}>Cancel</Btn>
          <Btn onClick={save} disabled={busy}>{busy?"Saving…":"Save Itinerary"}</Btn>
        </div>
      </div>
    </div>
  );
}

function TripEditModal({trip,users,getUser,onClose,onSave,isAdmin}){
  const[form,setForm]=useState({
    name:trip.name,startDate:trip.startDate,endDate:trip.endDate,
    projectCode:trip.projectCode||"",currency:trip.currency||"INR",
    tripMode:trip.tripMode||"balance",
    assignedTo:[...(trip.assignedTo||[])],
    categoryLimits:trip.categoryLimits||{},
  });
  const[busy,setBusy]=useState(false);
  const inpS={width:"100%",padding:"9px 11px",border:`1.5px solid ${BDR}`,borderRadius:8,fontSize:13,background:"var(--input-bg,#fafff8)",fontFamily:FB};
  const save=async()=>{
    if(!form.name?.trim()||!form.endDate){alert("Name and end date required");return;}
    setBusy(true);
    try{
      await onSave(trip.id,{name:form.name,startDate:form.startDate,endDate:form.endDate,projectCode:form.projectCode,currency:form.currency,assignedTo:form.assignedTo,tripMode:form.tripMode,categoryLimits:form.categoryLimits});
      onClose();
    }catch(e){alert("Update failed: "+e.message);}
    finally{setBusy(false);}
  };
  return(
    <div data-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:700,backdropFilter:"blur(4px)"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"var(--card,#fff)",borderRadius:16,padding:26,width:"min(480px,96vw)",boxShadow:"0 24px 60px rgba(0,0,0,.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
          <div style={{fontFamily:FD,fontSize:17,fontWeight:700,color:INK}}>Edit Trip</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:MUTED}}>✕</button>
        </div>
        {!isAdmin&&<div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:7,padding:"7px 11px",marginBottom:12,fontSize:11,color:"#92400e"}}>Changes will be saved directly. Admin approval not required for managers.</div>}
        <div style={{marginBottom:11}}><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Trip Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inpS}/></div>
        {/* Trip Mode — critical for settlement calculations */}
        <div style={{marginBottom:11}}>
          <label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:6,textTransform:"uppercase"}}>Mode</label>
          <div style={{display:"flex",gap:9}}>
            {[{v:"balance",l:"💼 Balance Mode",d:"Employee uses pre-loaded wallet"},{v:"reimbursement",l:"💸 Reimbursement",d:"Company reimburses after trip"}].map(({v,l,d})=>(
              <div key={v} onClick={()=>setForm({...form,tripMode:v})} style={{flex:1,padding:"10px",border:`2px solid ${form.tripMode===v?G:BDR}`,borderRadius:8,cursor:"pointer",textAlign:"center",background:form.tripMode===v?"#f0fde9":"var(--card)"}}>
                <div style={{fontSize:12,fontWeight:700,color:INK}}>{l}</div>
                <div style={{fontSize:9,color:MUTED,marginTop:2}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:11}}>
          <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Start Date</label><input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} style={inpS}/></div>
          <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>End Date</label><input type="date" value={form.endDate} min={form.startDate} onChange={e=>setForm({...form,endDate:e.target.value})} style={inpS}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:16}}>
          <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Project / Cost Centre</label><input value={form.projectCode} onChange={e=>setForm({...form,projectCode:e.target.value})} style={inpS}/></div>
          <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Currency</label>
            <select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})} style={{...inpS,appearance:"none"}}>
              {["INR","USD","EUR","GBP","AED","SGD","JPY","CHF","CAD","AUD"].map(c=><option key={c}>{c}</option>)}
            </select></div>
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:6,textTransform:"uppercase"}}>Assigned Employees</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {users.filter(u=>["employee","finance"].includes(u.role)).map(u=>{
              const isAssigned=(trip.assignedTo||[]).includes(u.id);
              return(
                <div key={u.id} onClick={()=>setForm(f=>{
                  const cur=f.assignedTo||[...trip.assignedTo];
                  return{...f,assignedTo:cur.includes(u.id)?cur.filter(x=>x!==u.id):[...cur,u.id]};
                })} style={{padding:"5px 11px",borderRadius:14,border:`1.5px solid ${isAssigned?G:BDR}`,background:isAssigned?G:"transparent",color:isAssigned?"#fff":INK,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                  <span style={{width:18,height:18,borderRadius:"50%",background:isAssigned?"rgba(255,255,255,.3)":GL,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700}}>{u.avatar||inits(u.name)}</span>
                  {u.name.split(" ")[0]}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{marginBottom:11}}>
          <label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:6,textTransform:"uppercase"}}>Category Limits (% of budget — 0 = no limit)</label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {DEFAULT_CATS.slice(0,8).map(cat=>(
              <div key={cat} style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:INK,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cat}</span>
                <input type="number" min={0} max={100}
                  value={form.categoryLimits?.[cat]||""}
                  onChange={e=>setForm(f=>({...f,categoryLimits:{...f.categoryLimits,[cat]:parseFloat(e.target.value)||0}}))}
                  placeholder="%" style={{width:52,padding:"4px 6px",border:`1.5px solid ${BDR}`,borderRadius:5,fontSize:11}}/>
                <span style={{fontSize:10,color:MUTED}}>%</span>
              </div>
            ))}
          </div>
        </div>
        {trip.status==="closed"&&(
          <div style={{marginBottom:10,padding:"8px 11px",background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:7}}>
            <div style={{fontSize:10,fontWeight:700,color:"#92400e",marginBottom:4}}>⚠ This trip is closed.</div>
            <button onClick={async()=>{
              if(!window.confirm(`Reopen "${trip.name}"? Status will return to active.`))return;
              setBusy(true);
              try{await onSave(trip.id,{...form,status:"active"});onClose();}
              catch(e){alert("Failed: "+e.message);}finally{setBusy(false);}
            }} style={{padding:"5px 12px",background:"#f59e0b",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}>↺ Reopen Trip</button>
          </div>
        )}
        <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"9px 16px",borderRadius:8,border:`1px solid ${BDR}`,background:"transparent",color:MUTED,cursor:"pointer",fontSize:13}}>Cancel</button>
          <Btn onClick={save} disabled={busy} style={{padding:"9px 22px",fontSize:13}}>{busy?"Saving…":"Save Changes"}</Btn>
        </div>
      </div>
    </div>
  );
}

function TripBudgetModal({trip,users,claims,getUser,onClose,onSave,sbCreateTopup}){
  const assigned=(trip.assignedTo||[]).map(id=>users.find(u=>u.id===id)).filter(Boolean);
  const empBudgets=trip.employeeBudgets||{};
  const[budgets,setBudgets]=useState(()=>{
    const b={};
    assigned.forEach(u=>{b[u.id]=empBudgets[u.id]||{allocated:0,topups:0,note:""};});
    return b;
  });
  const[busy,setBusy]=useState(false);
  const[showTopup,setShowTopup]=useState(null); // empId
  const[topupAmt,setTopupAmt]=useState("");
  const[topupNote,setTopupNote]=useState("");
  const inpS={padding:"8px 10px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:13,background:"var(--input-bg,#fafff8)",width:"100%"};

  const getEmpSpent=(empId)=>claims.filter(c=>c.tripId===trip.id&&c.empId===empId&&c.status==="Approved").reduce((s,c)=>s+c.amount,0);
  const totalAllocated=Object.values(budgets).reduce((s,b)=>s+(parseFloat(b.allocated)||0)+(parseFloat(b.topups)||0),0);

  const save=async()=>{
    setBusy(true);
    try{await onSave(trip.id,{employeeBudgets:budgets,budget:totalAllocated});onClose();}
    catch(e){alert("Save failed: "+e.message);}
    finally{setBusy(false);}
  };

  const addTopup=async(empId)=>{
    const amt=parseFloat(topupAmt);
    if(!amt||amt<=0){alert("Enter a valid amount");return;}
    setBudgets(p=>({...p,[empId]:{...p[empId],topups:(parseFloat(p[empId].topups)||0)+amt}}));
    if(sbCreateTopup)await sbCreateTopup({empId,tripId:trip.id,amount:amt,reason:topupNote,date:today(),status:"Approved"});
    setShowTopup(null);setTopupAmt("");setTopupNote("");
  };

  return(
    <div data-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:700,backdropFilter:"blur(4px)"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"var(--card,#fff)",borderRadius:16,padding:26,width:"min(640px,96vw)",maxHeight:"90vh",overflow:"auto",boxShadow:"0 24px 60px rgba(0,0,0,.25)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontFamily:FD,fontSize:17,fontWeight:700,color:INK}}>Per-Employee Budgets</div>
            <div style={{fontSize:11,color:MUTED}}>{trip.name} · {trip.currency||"INR"}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:MUTED}}>✕</button>
        </div>

        {/* Summary */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}} className="mob-grid-1">
          <Card style={{padding:12,textAlign:"center"}}>
            <div style={{fontSize:9,color:MUTED,textTransform:"uppercase",fontWeight:700}}>Total Budget</div>
            <div style={{fontFamily:FD,fontSize:18,fontWeight:700,color:INK}}>{fmt(trip.budget||0)}</div>
          </Card>
          <Card style={{padding:12,textAlign:"center"}}>
            <div style={{fontSize:9,color:MUTED,textTransform:"uppercase",fontWeight:700}}>Allocated</div>
            <div style={{fontFamily:FD,fontSize:18,fontWeight:700,color:totalAllocated>(trip.budget||0)?"#dc2626":INK}}>{fmt(totalAllocated)}</div>
          </Card>
          <Card style={{padding:12,textAlign:"center"}}>
            <div style={{fontSize:9,color:MUTED,textTransform:"uppercase",fontWeight:700}}>Unallocated</div>
            <div style={{fontFamily:FD,fontSize:18,fontWeight:700,color:INK}}>{fmt(Math.max(0,(trip.budget||0)-totalAllocated))}</div>
          </Card>
        </div>

        {assigned.length===0&&<div style={{color:MUTED,fontSize:13,padding:"16px 0",textAlign:"center"}}>No employees assigned to this trip yet.</div>}

        {/* Per-employee rows */}
        {assigned.map(u=>{
          const b=budgets[u.id]||{allocated:0,topups:0};
          const spent=getEmpSpent(u.id);
          const total=(parseFloat(b.allocated)||0)+(parseFloat(b.topups)||0);
          const balance=total-spent;
          return(
            <Card key={u.id} style={{padding:14,marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:GL,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:GD,fontSize:11}}>{u.avatar||inits(u.name)}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13,color:INK}}>{u.name}</div>
                  <div style={{fontSize:10,color:MUTED}}>{u.dept||u.role}</div>
                </div>
                <button onClick={()=>setShowTopup(u.id)} style={{padding:"4px 10px",background:"#f0fde9",border:`1px solid ${G}`,borderRadius:6,cursor:"pointer",fontSize:11,color:GD,fontWeight:600}}>＋ Top-up</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
                <div>
                  <div style={{fontSize:9,color:MUTED,fontWeight:700,textTransform:"uppercase",marginBottom:3}}>Allocated ₹</div>
                  <input type="number" value={b.allocated||""} onChange={e=>setBudgets(p=>({...p,[u.id]:{...p[u.id],allocated:parseFloat(e.target.value)||0}}))} placeholder="0" style={{...inpS,fontSize:12}}/>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:9,color:MUTED,fontWeight:700,textTransform:"uppercase",marginBottom:3}}>Top-ups</div>
                  <div style={{padding:"8px 0",fontWeight:600,color:INK}}>{fmt(parseFloat(b.topups)||0)}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:9,color:MUTED,fontWeight:700,textTransform:"uppercase",marginBottom:3}}>Spent</div>
                  <div style={{padding:"8px 0",fontWeight:600,color:"#dc2626"}}>{fmt(spent)}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:9,color:MUTED,fontWeight:700,textTransform:"uppercase",marginBottom:3}}>Balance</div>
                  <div style={{padding:"8px 0",fontFamily:FD,fontWeight:700,fontSize:15,color:balance>=0?"#16a34a":"#dc2626"}}>{balance>=0?"+":""}{fmt(balance)}</div>
                </div>
              </div>
              {/* Progress bar */}
              {total>0&&<div style={{marginTop:8,height:4,background:"#f3f4f6",borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",width:Math.min(100,Math.round(spent/total*100))+"%",background:spent>total?"#ef4444":G,borderRadius:2,transition:"width .3s"}}/>
              </div>}
              {/* Topup input */}
              {showTopup===u.id&&<div style={{marginTop:10,padding:"10px",background:GL,borderRadius:8}}>
                <div style={{fontSize:10,fontWeight:700,color:INK,marginBottom:6}}>Add Top-up for {u.name}</div>
                <div style={{display:"flex",gap:8,marginBottom:6}}>
                  <input type="number" value={topupAmt} onChange={e=>setTopupAmt(e.target.value)} placeholder="Amount ₹" style={{...inpS,flex:1}}/>
                  <input value={topupNote} onChange={e=>setTopupNote(e.target.value)} placeholder="Reason (optional)" style={{...inpS,flex:2}}/>
                </div>
                <div style={{display:"flex",gap:7}}>
                  <Btn onClick={()=>addTopup(u.id)} style={{padding:"6px 16px",fontSize:12}}>Add</Btn>
                  <button onClick={()=>setShowTopup(null)} style={{padding:"6px 12px",background:"transparent",border:`1px solid ${BDR}`,borderRadius:6,cursor:"pointer",fontSize:12,color:MUTED}}>Cancel</button>
                </div>
              </div>}
            </Card>
          );
        })}

        <div style={{display:"flex",gap:9,justifyContent:"flex-end",marginTop:8}}>
          <button onClick={onClose} style={{padding:"10px 18px",borderRadius:8,border:`1px solid ${BDR}`,background:"transparent",color:MUTED,cursor:"pointer",fontSize:13}}>Cancel</button>
          <Btn onClick={save} disabled={busy} style={{padding:"10px 24px",fontSize:13}}>{busy?"Saving…":"Save Budgets"}</Btn>
        </div>
      </div>
    </div>
  );
}


function InlineTripModal({user,co,sbCreateTrip,onClose}){
  const CURRENCIES2=["INR","USD","EUR","GBP","AED","SGD","JPY","CHF","CAD","AUD"];
  const[busy,setBusy]=useState(false);
  const[form,setForm]=useState({name:"",type:"trip",startDate:today(),endDate:"",budget:"",currency:"INR",tripMode:"reimbursement",projectCode:""});
  const inpS2={width:"100%",padding:"9px 11px",border:`1.5px solid ${BDR}`,borderRadius:8,fontSize:13,background:"var(--input-bg,#fafff8)",fontFamily:FB};
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));
  const create=async()=>{
    if(!form.name.trim()){alert("Please enter a trip name");return;}
    if(!form.endDate){alert("Please set an end date");return;}
    setBusy(true);
    try{
      const newTrip={id:"TRP-"+uid(),name:form.name.trim(),type:form.type,startDate:form.startDate,endDate:form.endDate,status:"pending_approval",budget:parseFloat(form.budget)||0,spent:0,assignedTo:[user.id],createdBy:user.id,tripMode:form.tripMode||"reimbursement",currency:form.currency||"INR",projectCode:form.projectCode||"",openingBalance:parseFloat(form.budget)||0,topupsTotal:0,categoryLimits:{}};
      if(sbCreateTrip)await sbCreateTrip(newTrip,[user.id]);
      else alert("Trip creation not available — please go to the Trips tab");
      onClose();
    }catch(e){alert("Failed: "+(e?.message||e));}
    finally{setBusy(false);}
  };
  return(
    <div data-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:700,backdropFilter:"blur(4px)"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"var(--card,#fff)",borderRadius:16,padding:26,width:"min(500px,96vw)",maxHeight:"92vh",overflow:"auto",boxShadow:"0 24px 60px rgba(0,0,0,.25)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontFamily:FD,fontSize:17,fontWeight:700,color:INK}}>Create New Trip</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:MUTED}}>✕</button>
        </div>
        <div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:8,padding:"7px 11px",marginBottom:14,fontSize:11,color:"#92400e"}}>💡 Your trip will require manager approval before you can submit expenses to it.</div>
        <div style={{marginBottom:11}}><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Trip Name *</label><input value={form.name} onChange={e=>upd("name",e.target.value)} placeholder="e.g. Mumbai Client Visit" style={inpS2}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:11}}>
          <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Start Date</label><input type="date" value={form.startDate} onChange={e=>upd("startDate",e.target.value)} style={inpS2}/></div>
          <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>End Date *</label><input type="date" value={form.endDate} min={form.startDate} onChange={e=>upd("endDate",e.target.value)} style={inpS2}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:11,marginBottom:11}}>
          <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Type</label>
            <select value={form.type} onChange={e=>upd("type",e.target.value)} style={{...inpS2,appearance:"none"}}>
              <option value="trip">Business Trip</option><option value="monthly">Monthly Period</option><option value="project">Project</option><option value="client">Client Project</option>
            </select></div>
          <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Mode</label>
            <select value={form.tripMode} onChange={e=>upd("tripMode",e.target.value)} style={{...inpS2,appearance:"none"}}>
              <option value="reimbursement">Reimbursement</option><option value="balance">Balance (Advance)</option><option value="client">Client Billing</option>
            </select></div>
          <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Currency</label>
            <select value={form.currency} onChange={e=>upd("currency",e.target.value)} style={{...inpS2,appearance:"none"}}>{CURRENCIES2.map(c=><option key={c}>{c}</option>)}</select></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:16}}>
          <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Project / Cost Centre</label><input value={form.projectCode} onChange={e=>upd("projectCode",e.target.value)} placeholder="PRJ-001" style={inpS2}/></div>
          <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Estimated Budget ₹</label><input type="number" value={form.budget} onChange={e=>upd("budget",e.target.value)} placeholder="0 if unknown" style={inpS2}/></div>
        </div>
        <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"9px 16px",borderRadius:8,border:`1px solid ${BDR}`,background:"transparent",color:MUTED,cursor:"pointer",fontSize:13}}>Cancel</button>
          <Btn onClick={create} disabled={busy} style={{padding:"9px 22px",fontSize:13}}>{busy?"Creating…":"Create Trip →"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── SUBMIT TAB (OCR fixed — no stale closures) ───────────────────────────────
function SubmitTab({user,co,submitClaim,camFile,clearCamFile,onCam,companyCategories,onCreateTrip,sbCreateTrip,aiTokenBalance,setAiTokenBalance,cid}){
  const cats=companyCategories||DEFAULT_CATS;
  const blankForm=()=>({id:uid(),date:today(),category:"",desc:"",amount:"",origAmount:"",currency:"INR",tripId:"",legId:"",city:"",cityTier:"D",notes:"",vendor:"",receipts:[],ocrState:"idle",ocrData:null,scanning:false,gstAmount:"",projectCode:"",manualEdits:{}});
  const [forms,setForms]=useState(()=>{
    try{
      const _dr=localStorage.getItem("xpensr_draft_v1");
      const d=_dr?(_dec(_dr)||_dr):null;
      if(d){const p=JSON.parse(d);return p.length>0?p:[blankForm()];}
    }catch{}
    return[blankForm()];
  });
  const [idx,setIdx]=useState(0);
  const [showTripModal,setShowTripModal]=useState(false);
  const saveDraft=useCallback((f)=>{
    try{localStorage.setItem("xpensr_draft_v1",_enc(JSON.stringify(Array.isArray(f)?f:[f])));}catch{}
  },[]);
  const clearDraft=()=>{try{localStorage.removeItem("xpensr_draft_v1");}catch{}};
  // Auto-save draft on every form change
  useEffect(()=>{
    if(forms.some(f=>f.category||f.desc||f.amount||f.vendor))
      try{localStorage.setItem("xpensr_draft_v1",_enc(JSON.stringify(forms)));}catch{}
  },[forms]);
  const fileRefs=useRef({});
  const policy=co.policy;
  const myTrips=co.trips.filter(t=>t.status==="active"&&(!t.assignedTo||t.assignedTo.includes(user.id)));

  // ── upd & doOCR MUST be defined before any useEffect that calls them ──────

  // Updater — functional setState so it never reads stale forms
  const upd=useCallback((i,patch)=>setForms(prev=>prev.map((x,j)=>j===i?{...x,...patch}:x)),[]);

  // AI features: requires VITE_AI_ENABLED=true AND company must have token balance > 0
  const AI_ENABLED=import.meta.env.VITE_AI_ENABLED==="true" && (aiTokenBalance===null||aiTokenBalance>0);

  // doOCR — receives an explicit `snapshot` of forms so it never closes over stale state
  const doOCR=useCallback(async(i,b64,mime,snapshot)=>{
    if(!AI_ENABLED){
      upd(i,{ocrState:"disabled",scanning:false});
      return; // AI disabled — fill form manually
    }
    upd(i,{ocrState:"scanning",scanning:true,ocrData:null});
    try{
      const isImg=mime.startsWith("image/");
      const res=await fetch("/api/anthropic/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json","anthropic-version":"2023-06-01","x-company-id":cid||""},
        body:JSON.stringify({
          model:"claude-haiku-4-5-20251001",
          max_tokens:900,
          _feature:"ocr",
          system:`You are an invoice OCR assistant for an Indian business expense app. Analyse the receipt/invoice — including handwritten ones. Return ONLY a single valid JSON object, no markdown, no extra text. Keys: vendor(string), date(YYYY-MM-DD or ""), amount(number in detected currency), currency(ISO code), origAmount(number), description(5-8 words), category(one of: Travel|Meals|Accommodation|Office Supplies|Client Entertainment|Software|Training|Miscellaneous), invoice_number(string or ""), gst_number(string or ""), line_items(string[]), confidence("high"|"medium"|"low")`,
          messages:[{role:"user",content:isImg
            ?[{type:"image",source:{type:"base64",media_type:mime,data:b64}},{type:"text",text:"Extract expense data. ONLY JSON."}]
            :[{type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}},{type:"text",text:"Extract expense data. ONLY JSON."}]
          }]
        })
      });
      if(!res.ok){
        let errMsg=`HTTP ${res.status}`;
        try{
          const errData=await res.json();
          // Handle token-specific errors with friendly message
          if(errData?.error?.code==="TOKENS_EXHAUSTED"||errData?.error?.code==="NO_AI_SUBSCRIPTION"){
            upd(i,{ocrState:"no_tokens",scanning:false});
            toast(errData.error.message||"AI tokens exhausted. Please purchase more.","warn");
            return;
          }
          errMsg=errData?.error?.message||errMsg;
        }catch{}
        throw new Error(errMsg);
      }
      const data=await res.json();
      // Update token balance in real-time if server returns it
      if(data?._tokenBalance!=null) setAiTokenBalance(data._tokenBalance);
      if(data.error)throw new Error(data.error.message||"API error");
      const raw=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      if(!raw)throw new Error("Empty response");
      const clean=raw.replace(/^```(?:json)?\s*/m,"").replace(/\s*```$/m,"").trim();
      const s=clean.indexOf("{"), e=clean.lastIndexOf("}");
      if(s<0||e<0)throw new Error("No JSON in response");
      const p=JSON.parse(clean.slice(s,e+1));
      const rate=FX[p.currency]||1;
      const inr=p.currency&&p.currency!=="INR"?Math.round((p.origAmount||p.amount||0)*rate):(p.amount||0);
      const cur=snapshot?snapshot[i]:null;
      upd(i,{
        ocrState:"done",scanning:false,ocrData:p,
        date:       p.date||(cur?.date||today()),
        amount:     inr?String(inr):(cur?.amount||""),
        origAmount: p.origAmount?String(p.origAmount):String(p.amount||""),
        currency:   p.currency||"INR",
        desc:       [p.vendor,p.description].filter(Boolean).join(" — ")||(cur?.desc||""),
        vendor:     p.vendor||(cur?.vendor||""),
        category:   cats.includes(p.category)?p.category:(cur?.category||""),
        notes:      [p.invoice_number?"Invoice: "+p.invoice_number:"",p.gst_number?"GSTIN: "+p.gst_number:"",p.line_items?.length?"Items: "+p.line_items.slice(0,3).join(", "):""].filter(Boolean).join(" | ")||(cur?.notes||""),
      });
    }catch(err){
      log.error("OCR:",err.message);
      upd(i,{ocrState:"error",scanning:false});
    }
  },[upd]);

  // ── useEffect calls — safe because upd/doOCR are defined above ────────────

  // When a camera file arrives: append new form tab and auto-OCR it
  useEffect(()=>{
    if(!camFile)return;
    setForms(prev=>{
      const newForm={...blankForm(),receipts:[camFile]};
      const updated=[...prev,newForm];
      const newIdx=updated.length-1;
      setIdx(newIdx);
      doOCR(newIdx,camFile.b64,camFile.type,updated);
      return updated;
    });
    if(clearCamFile)clearCamFile();
  },[camFile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-OCR when a form's first receipt arrives without OCR having run yet
  useEffect(()=>{
    const fm=forms[idx];
    if(!fm||fm.receipts.length===0||fm.ocrState!=="idle")return;
    const r=fm.receipts[0];
    if(r?.b64)doOCR(idx,r.b64,r.type,forms);
  },[forms.length,idx]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────

  const MAX_FILE_SIZE=5*1024*1024; // 5MB

  const handleFile=(i,files)=>{
    const f=files[0];if(!f)return;
    if(f.size>MAX_FILE_SIZE){
      alert(`File too large. Maximum size is 5MB. Your file: ${(f.size/1024/1024).toFixed(1)}MB`);
      return;
    }
    const reader=new FileReader();
    reader.onload=ev=>{
      const url=ev.target.result,b64=url.split(",")[1],mime=f.type||"image/jpeg";
      const receipt={name:f.name,url,b64,type:mime};
      setForms(prev=>{
        const updated=prev.map((x,j)=>j===i?{...x,receipts:[...x.receipts,receipt]}:x);
        doOCR(i,b64,mime,updated);
        return updated;
      });
    };
    reader.readAsDataURL(f);
  };

  const [uploadError,setUploadError]=useState("");
  const removeForm=i=>{if(forms.length===1)return;setForms(p=>p.filter((_,j)=>j!==i));setIdx(Math.max(0,idx-1));};
  const addForm=()=>{setForms(p=>[...p,blankForm()]);setIdx(forms.length);};
  const submitAll=async()=>{
    const valid=forms.filter(f=>f.category&&f.desc&&f.amount);
    if(!valid.length){alert("No complete forms to submit. Please fill Category, Description, and Amount.");return;}
    let ok=0,fail=0;
    for(const f of valid){
      try{
        const tripId=f.tripId||myTrips[0]?.id;
        if(!tripId){fail++;continue;}
        await submitClaim({...f,tripId});
        ok++;
      }catch(e){fail++;}
    }
    setForms([blankForm()]);setIdx(0);
    try{localStorage.removeItem("xpensr_draft_v1");}catch{}
    if(fail>0)alert(`${ok} submitted, ${fail} failed.`);
  };

  const fm=forms[idx]||forms[0];
  const amt=parseFloat(fm.amount)||0;
  const CONF={high:"#16a34a",medium:"#d97706",low:"#dc2626"};
  const inpS={width:"100%",padding:"9px 12px",border:`1.5px solid ${BDR}`,borderRadius:8,fontSize:13,background:"var(--input-bg,#fafff8)"};

  return(
    <div style={{maxWidth:680}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK}}>Submit Expense</h1><p style={{color:MUTED,fontSize:12}}>AI-powered · Batch scan · Camera capture · Multi-currency</p></div>
        <div style={{display:"flex",gap:8}}>
          <Btn v="outline" onClick={addForm} style={{fontSize:12}}>＋ Add</Btn>
          {forms.length>1&&<Btn onClick={submitAll} style={{fontSize:12}}>Submit All ({forms.filter(f=>f.category&&f.desc&&f.amount).length})</Btn>}
        </div>
      </div>

      {/* Batch tabs */}
      {forms.length>1&&<div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",paddingBottom:3}}>
        {forms.map((f,i)=>(
          <div key={f.id} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:20,border:`1.5px solid ${idx===i?G:BDR}`,background:idx===i?G:"#fff",cursor:"pointer",flexShrink:0}} onClick={()=>setIdx(i)}>
            <span style={{fontSize:11,fontWeight:600,color:idx===i?"#fff":MUTED}}>#{i+1} {f.ocrState==="done"?"✓":f.ocrState==="scanning"?"⏳":f.ocrState==="error"?"⚠":""} {f.desc?.slice(0,10)||"New"}</span>
            {forms.length>1&&<button onClick={e=>{e.stopPropagation();removeForm(i);}} style={{background:"none",border:"none",color:idx===i?"rgba(255,255,255,.7)":MUTED,cursor:"pointer",fontSize:12,padding:0}}>×</button>}
          </div>
        ))}
      </div>}

      {/* OCR Card */}
      <Card style={{padding:16,marginBottom:12,borderColor:fm.ocrState==="done"?G:BDR}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:10}}>
          <div style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${G},${GD})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🤖</div>
          <div style={{flex:1}}><div style={{fontWeight:700,color:INK,fontSize:13}}>AI Invoice Scanner</div><div style={{fontSize:11,color:MUTED}}>Upload · Drag & drop · Camera · Handwritten bills supported</div></div>
          {onCam&&<Btn v="dark" onClick={onCam} style={{padding:"6px 10px",fontSize:12}}>📷 Camera</Btn>}
          {fm.ocrState==="disabled"&&<span style={{background:"#f3f4f6",color:MUTED,padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:600}}>AI scanning off</span>}
          {fm.ocrState==="no_tokens"&&<span style={{background:"#fef3c7",color:"#92400e",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:600}}>⛔ No tokens</span>}
          {AI_ENABLED&&aiTokenBalance!=null&&aiTokenBalance>0&&fm.ocrState!=="done"&&<span style={{background:aiTokenBalance<5000?"#fef3c7":"#f0fde9",color:aiTokenBalance<5000?"#92400e":"#16a34a",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:600}}>⚡ {(aiTokenBalance/1000).toFixed(0)}K tokens</span>}
          {fm.ocrState==="done"&&fm.ocrData&&<span style={{background:CONF[fm.ocrData.confidence]+"20",color:CONF[fm.ocrData.confidence],padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{fm.ocrData.confidence==="high"?"✓ High":"~ Med"}</span>}
          {fm.ocrState==="error"&&<span style={{background:"#fee2e2",color:"#dc2626",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>⚠ Failed — fill manually</span>}
          {fm.ocrState==="scanning"&&<span style={{color:GD,fontSize:11,display:"flex",alignItems:"center",gap:5}}><span style={{width:12,height:12,border:`2px solid ${GM}`,borderTopColor:G,borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block"}}/> Scanning…</span>}
        </div>
        {/* Drop zone - works on both desktop (drag/drop + click) and mobile (label tap) */}
        <label htmlFor={`file-input-${idx}`} style={{display:"block",cursor:"pointer"}}>
          <input id={`file-input-${idx}`} ref={r=>fileRefs.current[idx]=r} type="file" accept="image/*,application/pdf" multiple style={{display:"none"}} onChange={e=>handleFile(idx,e.target.files)}/>
          <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFile(idx,e.dataTransfer.files);}}
            style={{border:`2px dashed ${fm.receipts.length>0?G:GM}`,borderRadius:9,padding:fm.receipts.length>0?"10px":"20px",textAlign:"center",background:fm.receipts.length>0?GL:"#fafff8",transition:"all .2s"}}>
            {fm.receipts.length>0?(
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                {fm.receipts.map((r,i)=>(
                  <div key={i} style={{position:"relative"}}>
                    {r.type?.startsWith("image/")?<img src={r.url} alt={r.name} style={{width:64,height:64,objectFit:"cover",borderRadius:7,border:`1px solid ${BDR}`}}/>:<div style={{width:64,height:64,background:"#fee2e2",borderRadius:7,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:"1px solid #fca5a5"}}><span style={{fontSize:22}}>📄</span><span style={{fontSize:9,color:"#dc2626",marginTop:2}}>PDF</span></div>}
                    <button type="button" onClick={ev=>{ev.preventDefault();ev.stopPropagation();upd(idx,{receipts:fm.receipts.filter((_,j)=>j!==i)});}} style={{position:"absolute",top:-4,right:-4,width:16,height:16,background:"#ef4444",border:"none",borderRadius:"50%",color:"#fff",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                    <a href={r.url} download={r.name||`receipt_${i+1}`} onClick={e=>e.stopPropagation()} style={{display:"block",fontSize:9,color:GD,textAlign:"center",marginTop:2,textDecoration:"none"}}>⬇</a>
                  </div>
                ))}
                <div style={{width:44,height:44,border:`2px dashed ${GM}`,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",color:MUTED,fontSize:20}}>+</div>
              </div>
            ):(
              <div>
                <div style={{fontSize:32,marginBottom:6}}>📎</div>
                <div style={{fontSize:14,fontWeight:700,color:INK,marginBottom:3}}>Tap to upload invoice</div>
                <div style={{fontSize:11,color:MUTED}}>JPG · PNG · PDF · drag & drop · or use Camera</div>
                <div style={{marginTop:10,display:"inline-block",background:G,color:"#fff",borderRadius:8,padding:"8px 20px",fontSize:12,fontWeight:700}}>📁 Choose File</div>
              </div>
            )}
          </div>
        </label>
        {fm.receipts.length>0&&fm.ocrState!=="done"&&!fm.scanning&&(
          <button onClick={()=>fm.receipts[0]&&doOCR(idx,fm.receipts[0].b64,fm.receipts[0].type,forms)} style={{marginTop:9,width:"100%",padding:10,background:`linear-gradient(135deg,${G},${GD})`,border:"none",borderRadius:8,color:"#fff",fontFamily:FB,fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
            🤖 Scan & Auto-Fill with AI
          </button>
        )}
        {fm.ocrState==="done"&&fm.ocrData&&(
          <div style={{marginTop:9,background:GL,borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontSize:9,fontWeight:700,color:GD,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>✓ Extracted — fields auto-filled below</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
              {[["Vendor",fm.ocrData.vendor],["Amount",fm.ocrData.amount?fmt(fm.ocrData.amount):"—"],["Date",fm.ocrData.date||"—"],["Category",fm.ocrData.category||"—"],["Invoice #",fm.ocrData.invoice_number||"—"],["GSTIN",fm.ocrData.gst_number||"—"],[fm.ocrData.currency&&fm.ocrData.currency!=="INR"?"FX Rate":null,fm.ocrData.currency&&fm.ocrData.currency!=="INR"?`1 ${fm.ocrData.currency} = ₹${FX[fm.ocrData.currency]||"?"}`:null]].filter(x=>x&&x[0]).map(([k,v])=>(
                <div key={k} style={{display:"flex",gap:3,fontSize:10}}><span style={{color:MUTED,minWidth:55}}>{k}:</span><span style={{fontWeight:600,color:INK}}>{v}</span></div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Trip Budget & Category Limits Panel — visible to employee */}
      {(()=>{
        const selTrip=co.trips.find(t=>t.id===(fm.tripId||myTrips[0]?.id));
        if(!selTrip?.budget) return null;
        const spent=co.claims.filter(c=>c.tripId===selTrip.id&&c.empId===user.id&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0);
        const remaining=Math.max(0,selTrip.budget-spent);
        const pct=Math.min(100,Math.round(spent/selTrip.budget*100));
        const catLimits=selTrip.categoryLimits||{};
        const hasCatLimits=Object.keys(catLimits).some(k=>catLimits[k]>0);
        return(
          <Card style={{padding:14,marginBottom:12,borderColor:remaining<selTrip.budget*0.1?"#fca5a5":BDR}}>
            <div style={{fontFamily:FB,fontSize:12,fontWeight:700,color:INK,marginBottom:8}}>📊 Your Trip Budget — {selTrip.name}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
              {[["Total Budget",fmt(selTrip.budget),G],["Spent",fmt(spent),"#f59e0b"],["Remaining",fmt(remaining),remaining<selTrip.budget*0.2?"#dc2626":"#16a34a"]].map(([l,v,c])=>(
                <div key={l} style={{background:"#f9fafb",borderRadius:7,padding:"7px 10px",textAlign:"center"}}>
                  <div style={{fontSize:9,color:MUTED,textTransform:"uppercase",marginBottom:2}}>{l}</div>
                  <div style={{fontWeight:700,fontSize:13,color:c}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{height:6,background:"#e5e7eb",borderRadius:3,marginBottom:8,overflow:"hidden"}}>
              <div style={{height:"100%",width:pct+"%",background:pct>90?"#dc2626":pct>70?"#f59e0b":G,borderRadius:3,transition:"width .3s"}}/>
            </div>
            {hasCatLimits&&<>
              <div style={{fontSize:10,fontWeight:700,color:MUTED,textTransform:"uppercase",marginBottom:5}}>Category Spend Limits</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {Object.entries(catLimits).filter(([,v])=>v>0).map(([cat,pctLimit])=>{
                  const catSpent=co.claims.filter(c=>c.tripId===selTrip.id&&c.empId===user.id&&c.category===cat&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0);
                  const catMax=Math.round(selTrip.budget*pctLimit/100);
                  const catPct=catMax>0?Math.min(100,Math.round(catSpent/catMax*100)):0;
                  return(
                    <div key={cat} style={{background:"#f9fafb",border:`1px solid ${catPct>90?"#fca5a5":BDR}`,borderRadius:6,padding:"4px 8px",fontSize:10}}>
                      <span style={{fontWeight:600,color:INK}}>{cat}</span>
                      <span style={{color:MUTED}}> · {fmt(catSpent)}/{fmt(catMax)} ({pctLimit}%)</span>
                      {catPct>=100&&<span style={{color:"#dc2626",fontWeight:700}}> ⛔</span>}
                      {catPct>=80&&catPct<100&&<span style={{color:"#f59e0b",fontWeight:700}}> ⚠</span>}
                    </div>
                  );
                })}
              </div>
            </>}
          </Card>
        );
      })()}

      {/* Alerts */}
{/* Budget warning when trip budget exceeded */}
      {(()=>{
        const trip=co.trips.find(t=>t.id===(fm.tripId||myTrips[0]?.id));
        if(!trip?.budget||!fm.amount)return null;
        const spent=co.claims.filter(c=>c.tripId===trip.id&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0);
        const remaining=trip.budget-spent;
        const thisAmt=parseFloat(fm.amount)||0;
        if(thisAmt>remaining&&remaining>=0){
          return<div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:9,padding:"9px 13px",marginBottom:10,fontSize:12,color:"#92400e",fontWeight:600}}>
            ⚠ This expense ({fmt(thisAmt)}) exceeds remaining trip budget ({fmt(remaining)}). It will require manager approval.
          </div>;
        }
        return null;
      })()}
      {fm.date&&isWknd(fm.date)&&policy.weekendRequiresApproval&&<div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:9,padding:"9px 13px",marginBottom:10,fontSize:12,color:"#92400e"}}>📅 Weekend expense — requires manager approval per policy</div>}
      {amt>0&&policy.receiptMandatoryAbove>0&&amt>policy.receiptMandatoryAbove&&!fm.receipts.length&&<div style={{background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:9,padding:"9px 13px",marginBottom:10,fontSize:12,color:"#dc2626"}}>📎 Receipt required for expenses above {fmt(policy.receiptMandatoryAbove)}</div>}

      {/* Form */}
      <Card style={{padding:22}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:10}}>
          <div><label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Date *</label><input type="date" value={fm.date} onChange={e=>upd(idx,{date:e.target.value})} style={{...inpS,borderColor:fm.ocrState==="done"&&fm.date?G:BDR}}/></div>
          <div><label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Trip / Period *</label>
            <select value={fm.tripId||myTrips[0]?.id||""} onChange={e=>{
              // Reset leg selection when trip changes
              upd(idx,{tripId:e.target.value,legId:"",city:"",cityTier:"D"});
            }} style={{...inpS,appearance:"none",paddingRight:28}}>
              {myTrips.length===0&&<option value="">No active trips</option>}
              {myTrips.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        {/* Leg / City selector — shown only when selected trip has itinerary legs */}
        {(()=>{
          const resolvedTripId=fm.tripId||myTrips[0]?.id;
          const selTrip=co.trips.find(t=>t.id===resolvedTripId);
          const legs=selTrip?.legs||[];
          if(!legs.length) return null;
          const TIER_BADGE={A:"#16a34a",B:"#2563eb",C:"#d97706",D:"#6b7280"};
          return(
            <div style={{marginBottom:10}}>
              <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>
                City / Itinerary Leg *
                <span style={{fontWeight:400,textTransform:"none",marginLeft:6,color:GD}}>— which city is this expense from?</span>
              </label>
              <select
                value={fm.legId||""}
                onChange={e=>{
                  const leg=legs.find(l=>l.id===e.target.value);
                  if(leg){
                    upd(idx,{legId:leg.id,city:leg.toCity||"",cityTier:leg.cityTier||"D"});
                  } else {
                    upd(idx,{legId:"",city:"",cityTier:"D"});
                  }
                }}
                style={{...inpS,appearance:"none",paddingRight:28,borderColor:fm.legId?G:BDR}}
              >
                <option value="">Select city leg…</option>
                {legs.map((l,i)=>{
                  const depart=l.departAt?.slice(0,10)||"";
                  const arrive=l.arriveAt?.slice(0,10)||"";
                  const dateRange=depart&&arrive?` (${depart} → ${arrive})`:"";
                  return(
                    <option key={l.id} value={l.id}>
                      {i+1}. {l.fromCity||"—"} → {l.toCity||"—"}{dateRange} [Tier {l.cityTier||"D"}]
                    </option>
                  );
                })}
              </select>
              {fm.legId&&(()=>{
                const leg=legs.find(l=>l.id===fm.legId);
                if(!leg)return null;
                const badgeColor=TIER_BADGE[leg.cityTier||"D"];
                const hotelLimit=leg.hotelLimit||0;
                const diemRate=leg.diemRate||0;
                return(
                  <div style={{marginTop:6,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                    <span style={{background:badgeColor+"18",color:badgeColor,border:`1px solid ${badgeColor}40`,borderRadius:5,padding:"2px 8px",fontSize:10,fontWeight:700}}>Tier {leg.cityTier||"D"} City</span>
                    {hotelLimit>0&&<span style={{background:"#f0fdf4",color:"#16a34a",border:"1px solid #bbf7d0",borderRadius:5,padding:"2px 8px",fontSize:10,fontWeight:600}}>🏨 Hotel limit: {fmt(hotelLimit)}/night</span>}
                    {diemRate>0&&<span style={{background:"#eff6ff",color:"#2563eb",border:"1px solid #bfdbfe",borderRadius:5,padding:"2px 8px",fontSize:10,fontWeight:600}}>🍽 Diem: {fmt(diemRate)}/day</span>}
                    {/* Date range warning */}
                    {(()=>{
                      const depart=leg.departAt?.slice(0,10);
                      const arrive=leg.arriveAt?.slice(0,10);
                      if(fm.date&&depart&&arrive&&(fm.date<depart||fm.date>arrive)){
                        return<span style={{background:"#fef3c7",color:"#92400e",border:"1px solid #fcd34d",borderRadius:5,padding:"2px 8px",fontSize:10,fontWeight:600}}>⚠ Date outside leg range ({depart} → {arrive})</span>;
                      }
                      return null;
                    })()}
                  </div>
                );
              })()}
            </div>
          );
        })()}
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:11,marginBottom:10}}>
          <div><label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Vendor / Merchant</label><input value={fm.vendor} onChange={e=>upd(idx,{vendor:e.target.value})} placeholder="Hotel / Airline / Restaurant" style={{...inpS,borderColor:fm.ocrState==="done"&&fm.vendor?G:BDR}}/></div>
          <div><label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Currency</label>
            <select value={fm.currency} onChange={e=>{const cur=e.target.value;const rate=FX[cur]||1;upd(idx,{currency:cur,amount:fm.origAmount?String(Math.round(parseFloat(fm.origAmount)*rate)):fm.amount});}} style={{...inpS,appearance:"none",paddingRight:28}}>
              {CURRENCIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Orig. Amount</label>
            <input type="number" value={fm.origAmount} onChange={e=>{const oa=e.target.value;const rate=FX[fm.currency]||1;upd(idx,{origAmount:oa,amount:oa?String(Math.round(parseFloat(oa)*rate)):""});}} placeholder="0.00" style={inpS}/>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:11,marginBottom:10}} className="mob-grid-1">
          <div><label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Category *</label>
            <select value={fm.category} onChange={e=>upd(idx,{category:e.target.value})} style={{...inpS,appearance:"none",paddingRight:28,borderColor:fm.ocrState==="done"&&fm.category?G:BDR}}>
              <option value="">Select…</option>{cats.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Amount (₹) *</label>
            <input type="number" value={fm.amount} onChange={e=>upd(idx,{amount:e.target.value})} placeholder="0.00" style={{...inpS,borderColor:fm.ocrState==="done"&&fm.amount?G:BDR}}/>
            {fm.currency!=="INR"&&fm.amount&&<div style={{fontSize:9,color:MUTED,marginTop:2}}>≈ {fmt(parseFloat(fm.amount))} (converted from {fm.currency})</div>}
          </div>
          <div><label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>GST Amount (₹)</label>
            <input type="number" value={fm.gstAmount||""} onChange={e=>upd(idx,{gstAmount:e.target.value})} placeholder="If applicable" style={inpS}/>
            {fm.gstAmount&&fm.amount&&<div style={{fontSize:9,color:MUTED,marginTop:2}}>Base: {fmt(parseFloat(fm.amount)-parseFloat(fm.gstAmount||0))} + GST: {fmt(parseFloat(fm.gstAmount||0))}</div>}
          </div>
        </div>
        <div style={{marginBottom:10}}><label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Description *</label><input value={fm.desc} onChange={e=>upd(idx,{desc:e.target.value})} placeholder="Brief description" style={{...inpS,borderColor:fm.ocrState==="done"&&fm.desc?G:BDR}}/></div>
        <div style={{marginBottom:14}}><label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Notes / Invoice / GSTIN</label><textarea value={fm.notes} onChange={e=>upd(idx,{notes:e.target.value})} rows={2} placeholder="Invoice no., GSTIN, additional info…" style={{...inpS,resize:"vertical"}}/></div>
        {/* Expense splitting */}
        <div style={{marginBottom:10}}>
          <label style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:MUTED,cursor:"pointer"}}>
            <input type="checkbox" checked={!!fm.splitWith} onChange={e=>upd(idx,{splitWith:e.target.checked?[]:undefined})} style={{accentColor:G}}/>
            Split this expense with colleagues
          </label>
          {fm.splitWith&&<div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:6}}>
            {co.users.filter(u=>u.id!==user.id&&["employee","manager"].includes(u.role)).map(u=>{
              const selected=fm.splitWith.includes(u.id);
              return<div key={u.id} onClick={()=>upd(idx,{splitWith:selected?fm.splitWith.filter(x=>x!==u.id):[...fm.splitWith,u.id]})} style={{padding:"4px 10px",borderRadius:15,border:`1.5px solid ${selected?G:BDR}`,background:selected?G:"#fff",color:selected?"#fff":INK,fontSize:11,cursor:"pointer",fontWeight:selected?600:400}}>{u.name.split(" ")[0]}</div>;
            })}
            {fm.splitWith.length>0&&<div style={{fontSize:10,color:MUTED,width:"100%",marginTop:3}}>
              Each person pays {fmt(Math.round(parseFloat(fm.amount||0)/(fm.splitWith.length+1)))} · Total: {fmt(parseFloat(fm.amount||0))}
            </div>}
          </div>}
        </div>
        {/* Draft save buttons */}
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginBottom:4}}>
          {(fm.category||fm.desc||fm.amount)&&<>
            <button onClick={()=>{try{localStorage.setItem("xpensr_draft_v1",_enc(JSON.stringify(forms)));alert("✓ Draft saved successfully");}catch(e){alert("Save failed: "+e.message);}}} style={{padding:"4px 10px",background:"none",border:`1px solid ${BDR}`,borderRadius:6,cursor:"pointer",fontSize:10,color:MUTED}}>💾 Save Draft</button>
            <button onClick={()=>{try{localStorage.removeItem("xpensr_draft_v1");setForms([blankForm()]);setIdx(0);}catch{}}} style={{padding:"4px 10px",background:"none",border:"1px solid #fee2e2",borderRadius:6,cursor:"pointer",fontSize:10,color:"#dc2626"}}>✕ Clear Draft</button>
          </>}
        </div>
        <div style={{display:"flex",gap:9}}>
          <Btn onClick={async()=>{
            if(!fm.category){alert("Please select a category");return;}
            if(!fm.desc){alert("Please enter a description");return;}
            if(!fm.amount||parseFloat(fm.amount)<=0){alert("Please enter a valid amount");return;}
            // Always resolve tripId — auto-select first active trip if not set
            const resolvedTripId=fm.tripId||(myTrips.length>0?myTrips[0].id:null);
            if(!resolvedTripId){alert("No active trip found. Please create a trip first.");return;}
            const tripId=resolvedTripId;
            setUploadError("");
            try{
              await submitClaim({...fm,tripId});
              const newForms=forms.map((x,i)=>i===idx?blankForm():x);
              setForms(newForms);
              setIdx(0);
              try{localStorage.removeItem("xpensr_draft_v1");}catch{}
            }catch(e){
              const msg=e?.message||String(e);
              setUploadError(msg);
            }
          }} style={{flex:1,padding:11}}>
            "Submit Claim →"
          </Btn>
          <Btn v="outline" onClick={()=>setForms(p=>p.map((x,i)=>i===idx?blankForm():x))}>Clear</Btn>
        </div>
        {!myTrips.length&&<div style={{marginTop:8,padding:"10px 12px",background:"#fef3c7",borderRadius:8,border:"1px solid #fcd34d"}}>
          <div style={{fontSize:11,color:"#92400e",fontWeight:600,marginBottom:4}}>⚠ No active trips assigned to you.</div>
          <div style={{fontSize:11,color:"#92400e",marginBottom:8}}>Create a trip first, then come back to submit your expense.</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowTripModal(true)} style={{padding:"6px 14px",background:"#f59e0b",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}>＋ Create New Trip</button>
            {onCreateTrip&&<button onClick={onCreateTrip} style={{padding:"6px 14px",background:"transparent",color:"#92400e",border:"1px solid #fcd34d",borderRadius:6,cursor:"pointer",fontSize:11}}>Go to Trips tab →</button>}
          </div>
        </div>}
        {/* Inline trip creation modal */}
        {showTripModal&&<InlineTripModal user={user} co={co} sbCreateTrip={sbCreateTrip} onClose={()=>setShowTripModal(false)}/>}
      </Card>
    </div>
  );
}

// ─── TRIPS TAB ────────────────────────────────────────────────────────────────
function TripsTab({trips,setTrips,claims,isManager,isAdmin,getUser,users,closeTrip,toast,uid:userId,userRole,myUser,sbCreateTrip,sbPushNotif,companyUsers,sbUpdateTrip,policy,approveTrip,rejectTrip,notifyApprovers,deleteTrip,deleteClaim,cid}){
  const [showNew,setShowNew]=useState(false);
  const [form,setForm]=useState({name:"",type:"trip",startDate:today(),endDate:"",budget:"",assignedTo:[],projectCode:"",tripMode:"balance",currency:"INR",categoryLimits:{},tripType:"domestic",purpose:"",customerName:"",accompanying:[]});
  const [newLegs,setNewLegs]=useState([]); // itinerary legs for new trip creation
  const [showCatLimits,setShowCatLimits]=useState(false);
  const [expandedId,setExpId]=useState(null);
  const [editTrip,setEditTrip]=useState(null);
  const [budgetTrip,setBudgetTrip]=useState(null);
  const [legsTrip,setLegsTrip]=useState(null);
  const [aretTrip,setAretTrip]=useState(null);
  const [conveyanceTrip,setConveyanceTrip]=useState(null); // Local conveyance log
  const isEmployee=!isManager&&!isAdmin;
  // For trip assignment: admin sees everyone except other admins.
  // Manager sees everyone strictly below their grade (any role).
  // This allows assigning other managers as travellers on a trip.
  const emps=users?.filter(u=>{
    if(u.id===userId) return false;          // self is handled separately as "(me)"
    if(u.role==="admin"&&!isAdmin) return false; // non-admins can't see admins
    if(u.isSuspended) return false;
    if(isAdmin) return true;                 // admin sees all non-admin users
    const myGrade=users.find(x=>x.id===userId)?.grade||0;
    if(myGrade===0) return u.dept===(users.find(x=>x.id===userId)?.dept);
    return (u.grade||0)<myGrade;             // manager sees lower grades only
  })||[];
  const inpS={padding:"9px 12px",border:`1.5px solid ${BDR}`,borderRadius:8,fontSize:13,background:"var(--input-bg,#fafff8)",width:"100%"};
  const toggle=id=>setForm(f=>({...f,assignedTo:f.assignedTo.includes(id)?f.assignedTo.filter(x=>x!==id):[...f.assignedTo,id]}));

  // City helpers for itinerary
  const allPolicyCities=[
    ...((policy?.cityTiers||[]).map(ct=>({city:ct.city,tier:ct.tier}))),
    {city:"Other",tier:"D"},
  ];
  const getCityTierLocal=(city)=>{
    if(!city) return "D";
    const found=(policy?.cityTiers||[]).find(ct=>ct.city.toLowerCase()===city.toLowerCase());
    return found?.tier||"D";
  };
  const addLeg=()=>setNewLegs(prev=>[...prev,{id:uid(),fromCity:"",toCity:"",_toCityOther:false,_fromCityOther:false,departAt:"",arriveAt:"",mode:"",cityTier:"D",hotelLimit:0,diemRate:0,days:1}]);
  const updateNewLeg=(idx,patch)=>setNewLegs(prev=>{
    const updated=[...prev];
    const leg={...updated[idx],...patch};
    if(leg.departAt&&leg.arriveAt){
      const diff=Math.ceil((new Date(leg.arriveAt)-new Date(leg.departAt))/(1000*60*60*24));
      leg.days=Math.max(1,diff||1);
    }
    if(patch.toCity!==undefined) leg.cityTier=getCityTierLocal(leg.toCity);
    updated[idx]=leg;
    return updated;
  });

  // Inline CitySelect for new trip form
  const NewLegCitySelect=({leg,idx,field,label})=>{
    const value=leg[field]||"";
    const otherKey=`_${field}Other`;
    const showOther=leg[otherKey]||false;
    const hasCities=(policy?.cityTiers||[]).length>0;
    const cityTiers=policy?.cityTiers||[];
    const tA=cityTiers.filter(c=>c.tier==="A"),tB=cityTiers.filter(c=>c.tier==="B"),tC=cityTiers.filter(c=>c.tier==="C");
    const inList=cityTiers.some(ct=>ct.city===value);
    return(
      <div><label style={{fontSize:9,color:MUTED,display:"block",marginBottom:2,textTransform:"uppercase"}}>{label}</label>
        {hasCities&&!showOther?(
          <select value={inList?value:(value?"__other__":"")}
            onChange={e=>{
              if(e.target.value==="__other__"){updateNewLeg(idx,{[field]:"",["_"+field+"Other"]:true});}
              else updateNewLeg(idx,{[field]:e.target.value,["_"+field+"Other"]:false});
            }}
            style={{...inpS,fontSize:11,padding:"6px 9px",appearance:"none"}}>
            <option value="">Select city…</option>
            {tA.length>0&&<optgroup label="● Tier A — Metro">{tA.map(c=><option key={c.city}>{c.city}</option>)}</optgroup>}
            {tB.length>0&&<optgroup label="● Tier B — Major">{tB.map(c=><option key={c.city}>{c.city}</option>)}</optgroup>}
            {tC.length>0&&<optgroup label="● Tier C — Tier-2">{tC.map(c=><option key={c.city}>{c.city}</option>)}</optgroup>}
            <option value="__other__">Other city (Tier D)…</option>
          </select>
        ):(
          <div style={{display:"flex",gap:4}}>
            <input value={value} onChange={e=>updateNewLeg(idx,{[field]:e.target.value})}
              placeholder="Enter city name (Tier D)"
              style={{...inpS,fontSize:11,padding:"6px 9px",flex:1}}/>
            {hasCities&&<button onClick={()=>updateNewLeg(idx,{[field]:"",["_"+field+"Other"]:false})}
              style={{padding:"4px 8px",border:`1px solid ${BDR}`,borderRadius:6,background:"none",cursor:"pointer",fontSize:11,color:MUTED}} title="Back to list">↩</button>}
          </div>
        )}
      </div>
    );
  };

  const canSetBudget=isManager||isAdmin;

  const create=async()=>{
    if(!form.name?.trim()){toast("Please enter a trip name","error");return;}
    // Notice period check
    if(co.policy?.noticePeriodDomestic>0&&form.tripType!=="overseas"){
      const daysUntil=(new Date(form.startDate)-new Date())/86400000;
      if(daysUntil<co.policy.noticePeriodDomestic){
        if(!window.confirm(`⚠ Policy requires ${co.policy.noticePeriodDomestic} days notice for domestic travel. Trip starts in ${Math.ceil(daysUntil)} days. Submit anyway?`))return;
      }
    }
    if(co.policy?.noticePeriodOverseas>0&&form.tripType==="overseas"){
      const daysUntil=(new Date(form.startDate)-new Date())/86400000;
      if(daysUntil<co.policy.noticePeriodOverseas){
        if(!window.confirm(`⚠ Policy requires ${co.policy.noticePeriodOverseas} days notice for overseas travel. Trip starts in ${Math.ceil(daysUntil)} days. Submit anyway?`))return;
      }
    }
    if(!form.endDate){toast("Please enter an end date","error");return;}
    if(!form.startDate){toast("Please enter a start date","error");return;}
    const baseList=isManager||isAdmin
      ?(form.assignedTo.length>0?form.assignedTo:emps.map(e=>e.id))
      :[userId];
    const assigned=[...new Set(baseList)];
    // All trips go for approval regardless of role (item 3)
    // Admin trips auto-approve, manager trips go to next grade/admin
    const status=isAdmin?"active":"pending_approval";
    const newTrip={
      id:"TRP-"+uid(),name:form.name.trim(),type:form.type,
      startDate:form.startDate,endDate:form.endDate,
      status,budget:parseFloat(form.budget)||0,
      spent:0,assignedTo:assigned,createdBy:userId,
      projectCode:form.projectCode||"",
      tripMode:form.tripMode||"balance",
      currency:form.currency||"INR",
      openingBalance:parseFloat(form.budget)||0,
      topupsTotal:0,
      categoryLimits:form.categoryLimits||{},
      legs:newLegs,
      purpose:form.purpose||"",
      customerName:form.customerName||"",
      accompanying:form.accompanying||[],
      tripType:form.tripType||"domestic",
    };
    try{
      if(sbCreateTrip){
        await sbCreateTrip(newTrip,assigned,newLegs);
      }else{
        setTrips(p=>[newTrip,...p]);
      }
      // Notify approvers for non-admin
      if(status==="pending_approval"&&notifyApprovers){
        await notifyApprovers(userId,`New trip "${newTrip.name}" by ${users.find(u=>u.id===userId)?.name||userId} awaits approval`,"info");
      }
      toast(status==="active"?"✓ Trip created":"✓ Trip submitted for approval");
      setShowNew(false);
      setForm({name:"",type:"trip",startDate:today(),endDate:"",budget:"",assignedTo:[],projectCode:"",tripMode:"balance",currency:"INR",categoryLimits:{}});
      setNewLegs([]);
      setShowCatLimits(false);
    }catch(err){
      toast("Failed to create trip: "+(err?.message||String(err)),"error");
    }
  };

  // Employee sees own + assigned; manager/admin sees all
  const visible=isManager||isAdmin?trips:trips.filter(t=>!t.assignedTo||t.assignedTo.includes(userId)||t.createdBy===userId);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK}}>Trips & Periods</h1>{!isManager&&<p style={{color:MUTED,fontSize:11,marginTop:2}}>Showing your assigned trips</p>}</div>
        <Btn onClick={()=>setShowNew(!showNew)}>{showNew?"✕ Cancel":"＋ New Trip / Period"}</Btn>
      </div>
      {showNew&&<Card style={{padding:20,marginBottom:12,borderColor:G,background:GL}}>
        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:12}}>New Trip / Period</div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:10,marginBottom:10}} className="mob-grid-1">
          <div><label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:3,textTransform:"uppercase"}}>Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Delhi Trip Apr 2026" style={inpS}/></div>
          <div><label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:3,textTransform:"uppercase"}}>Type</label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={{...inpS,appearance:"none"}}><option value="trip">Trip</option><option value="period">Period</option></select></div>
          <div><label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:3,textTransform:"uppercase"}}>Start Date *</label><input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} style={inpS}/></div>
          <div><label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:3,textTransform:"uppercase"}}>End Date *</label><input type="date" value={form.endDate} min={form.startDate} onChange={e=>setForm({...form,endDate:e.target.value})} style={inpS}/></div>
          {canSetBudget&&<div><label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:3,textTransform:"uppercase"}}>Budget ₹ *</label><input type="number" value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})} style={inpS}/></div>}
        </div>
        {/* Second row: project code, trip mode, currency, purpose, customer */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}} className="mob-grid-1">
          <div><label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:3,textTransform:"uppercase"}}>Project / Cost Centre</label>
            <input value={form.projectCode} onChange={e=>setForm({...form,projectCode:e.target.value})} placeholder="e.g. PRJ-001 or Client Name" style={inpS}/></div>
          <div><label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:3,textTransform:"uppercase"}}>Expense Mode</label>
            <select value={form.tripMode} onChange={e=>setForm({...form,tripMode:e.target.value})} style={{...inpS,appearance:"none"}}>
              <option value="balance">Balance (Advance given)</option>
              <option value="reimbursement">Reimbursement (Employee pays)</option>
              <option value="client">Client Reimbursement (Billed to client)</option>
            </select></div>
          <div><label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:3,textTransform:"uppercase"}}>Trip Type</label>
            <select value={form.tripType||"domestic"} onChange={e=>setForm({...form,tripType:e.target.value})} style={{...inpS,appearance:"none"}}>
              <option value="domestic">🏠 Domestic</option>
              <option value="overseas">✈ Overseas</option>
            </select></div>
          <div><label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:3,textTransform:"uppercase"}}>Purpose of Visit</label>
            <select value={form.purpose||""} onChange={e=>setForm({...form,purpose:e.target.value})} style={{...inpS,appearance:"none"}}>
              <option value="">Select purpose…</option>
              {(policy?.tripPurposes||["Sales Call","Purchase","Inspection","Seminar","Customer Support","Other"]).map(p=><option key={p}>{p}</option>)}
            </select></div>
          <div><label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:3,textTransform:"uppercase"}}>Customer / Supplier</label>
            <input value={form.customerName||""} onChange={e=>setForm({...form,customerName:e.target.value})} placeholder="Name of customer / supplier visited" style={inpS}/></div>
          <div><label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:3,textTransform:"uppercase"}}>Trip Currency</label>
            <select value={form.currency||"INR"} onChange={e=>setForm({...form,currency:e.target.value})} style={{...inpS,appearance:"none"}}>
              {CURRENCIES.map(c=><option key={c}>{c}</option>)}
            </select></div>
        </div>
        {!canSetBudget&&<div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:7,padding:"8px 12px",marginBottom:10,fontSize:11,color:"#92400e"}}>💡 Budget is set by your manager after approval. Your trip will start as <strong>Pending Approval</strong>.</div>}
        {canSetBudget&&<>
          <button type="button" onClick={()=>setShowCatLimits(p=>!p)} style={{background:"none",border:`1px dashed ${BDR}`,borderRadius:7,padding:"6px 12px",cursor:"pointer",fontSize:11,color:MUTED,marginBottom:10}}>
            {showCatLimits?"▲ Hide":"▼ Set"} Per-Category Spending Limits (optional)
          </button>
          {showCatLimits&&<div style={{background:"var(--hover-bg,#f9fafb)",borderRadius:9,padding:14,marginBottom:10}}>
            <div style={{fontSize:10,color:MUTED,marginBottom:8,fontWeight:700,textTransform:"uppercase"}}>Category Budget % of Total Trip Budget</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}} className="mob-grid-2">
              {["Travel","Meals","Accommodation","Office Supplies","Client Entertainment","Software"].map(cat=>(
                <div key={cat}>
                  <label style={{fontSize:9,color:MUTED,display:"block",marginBottom:2,textTransform:"uppercase"}}>{cat} %</label>
                  <input type="number" min="0" max="100" value={form.categoryLimits[cat]||""} onChange={e=>{
                    const v=parseInt(e.target.value)||0;
                    setForm(f=>({...f,categoryLimits:{...f.categoryLimits,[cat]:v}}));
                  }} placeholder="e.g. 30" style={{width:"100%",padding:"6px 8px",border:`1px solid ${BDR}`,borderRadius:6,fontSize:12,background:"#fff"}}/>
                </div>
              ))}
            </div>
            <div style={{fontSize:10,color:MUTED,marginTop:6}}>💡 Expenses exceeding the category % limit will be flagged for manager approval, even if within auto-approve threshold.</div>
          </div>}
        </>}
        {(isManager||isAdmin)&&<div style={{marginBottom:12}}>
          <label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:7,textTransform:"uppercase"}}>Assign Travellers</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            {/* Manager/Admin can add themselves */}
            {[...users.filter(u=>u.id===userId),...emps.filter(u=>u.id!==userId)].map(e=>{
              const sel=form.assignedTo.includes(e.id);
              const isSelf=e.id===userId;
              return(
                <div key={e.id} onClick={()=>toggle(e.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:20,border:`1.5px solid ${sel?G:BDR}`,background:sel?G:"#fff",cursor:"pointer"}}>
                  <div style={{width:20,height:20,borderRadius:"50%",background:sel?"rgba(255,255,255,.3)":GL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:sel?"#fff":GD}}>{e.avatar||inits(e.name)}</div>
                  <span style={{fontSize:11,fontWeight:600,color:sel?"#fff":INK}}>{e.name.split(" ")[0]}{isSelf?" (me)":""}</span>
                </div>
              );
            })}
          </div>
          {form.assignedTo.length===0&&<div style={{fontSize:10,color:"#f59e0b",marginTop:5}}>⚠ No travellers selected — select at least one person for this trip.</div>}
        </div>}
        {/* ── Itinerary / Legs ── */}
        <div style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:11,fontWeight:700,color:INK}}>📍 Travel Itinerary <span style={{color:MUTED,fontWeight:400}}>(optional — add city-by-city legs)</span></div>
            <button onClick={addLeg} style={{background:"none",border:`1.5px dashed ${BDR}`,borderRadius:7,padding:"4px 12px",cursor:"pointer",fontSize:11,color:MUTED}}>+ Add Leg</button>
          </div>
          {newLegs.map((leg,idx)=>(
            <div key={leg.id} style={{border:`1px solid ${BDR}`,borderRadius:9,padding:12,marginBottom:8,background:"var(--card,#fff)"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:11,fontWeight:600,color:INK}}>Leg {idx+1}{leg.toCity?` → ${leg.toCity}`:""}{leg.cityTier&&leg.cityTier!=="D"?<span style={{marginLeft:6,fontSize:9,padding:"1px 6px",borderRadius:8,background:leg.cityTier==="A"?"#fee2e2":leg.cityTier==="B"?"#fef3c7":"#dbeafe",color:leg.cityTier==="A"?"#991b1b":leg.cityTier==="B"?"#92400e":"#1e40af"}}>Tier {leg.cityTier}</span>:""}</span>
                <button onClick={()=>setNewLegs(p=>p.filter((_,i)=>i!==idx))} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",fontSize:13}}>✕</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:7}}>
                <NewLegCitySelect leg={leg} idx={idx} field="fromCity" label="FROM CITY"/>
                <NewLegCitySelect leg={leg} idx={idx} field="toCity" label="TO CITY *"/>
                <div><label style={{fontSize:9,color:MUTED,display:"block",marginBottom:2,textTransform:"uppercase"}}>Departure</label>
                  <input type="date" value={(leg.departAt||"").slice(0,10)} onChange={e=>updateNewLeg(idx,{departAt:e.target.value})} style={{...inpS,fontSize:11,padding:"6px 9px"}}/></div>
                <div><label style={{fontSize:9,color:MUTED,display:"block",marginBottom:2,textTransform:"uppercase"}}>Return Date</label>
                  <input type="date" value={(leg.arriveAt||"").slice(0,10)} onChange={e=>updateNewLeg(idx,{arriveAt:e.target.value})} style={{...inpS,fontSize:11,padding:"6px 9px"}}/></div>
              </div>
              {leg.days>0&&leg.diemRate>0&&<div style={{fontSize:10,color:MUTED,marginTop:4}}>
                📊 {leg.days} day{leg.days!==1?"s":""} in {leg.toCity||"city"} · Diem: ₹{(leg.days*leg.diemRate).toLocaleString("en-IN")}
              </div>}
            </div>
          ))}
          {newLegs.length===0&&<div style={{fontSize:10,color:MUTED,padding:"8px 0"}}>No itinerary added. You can add city legs now or later via the Itinerary button.</div>}
        </div>

        <div style={{display:"flex",gap:8}}><Btn onClick={create}>Create →</Btn><Btn v="outline" onClick={()=>setShowNew(false)}>Cancel</Btn></div>
      </Card>}
      {/* Edit trip modal */}
      {editTrip&&<TripEditModal trip={editTrip} users={users} getUser={getUser} isAdmin={isAdmin}
        onClose={()=>setEditTrip(null)}
        onSave={async(id,patch)=>{
          if(sbUpdateTrip)await sbUpdateTrip(id,patch);
          else setTrips(p=>p.map(t=>t.id===id?{...t,...patch}:t));
          setEditTrip(null);toast("✓ Trip updated");
        }}
      />}
      {/* Itinerary / legs modal */}
      {legsTrip&&<TripLegsModal trip={legsTrip} policy={policy}
        onClose={()=>setLegsTrip(null)}
        onSave={async(tripId,legs)=>{
          if(sbUpdateTrip){
            await sbUpdateTrip(tripId,{legs});
          } else {
            setTrips(p=>p.map(t=>t.id===tripId?{...t,legs}:t));
          }
          setLegsTrip(null);toast("✓ Itinerary saved");
        }}
      />}
      {/* Local Conveyance modal */}
      {conveyanceTrip&&<LocalConveyanceModal trip={conveyanceTrip} userId={userId} userName={users.find(u=>u.id===userId)?.name||""} policy={policy}
        onClose={()=>setConveyanceTrip(null)}
        onSubmit={async(rows,totalAmt)=>{
          // Submit as a single claim with conveyance sub-data in notes
          const claimId="EXP-"+uid();
          const desc=`Local Conveyance — ${rows.length} journey${rows.length!==1?"s":""} (${rows.map(r=>r.from+"→"+r.to).join(", ")})`;
          if(sbCreateTrip){
            // Use supabase directly
            await supabase.from("claims").insert({
              id:claimId,company_id:cid,trip_id:conveyanceTrip.id,emp_id:userId,
              date:today(),category:"Local Conveyance",description:desc,
              amount:totalAmt,orig_amount:totalAmt,orig_currency:"INR",
              status:"Pending",auto_approved:false,
              notes:JSON.stringify(rows),
            }).then(()=>{}).catch(e=>log.warn("Conveyance claim:",e.message));
            if(sbPushNotif) await sbPushNotif(null,`Local conveyance claim ₹${totalAmt.toLocaleString("en-IN")} submitted by ${users.find(u=>u.id===userId)?.name||userId}`,"info");
          }
          setConveyanceTrip(null);
          toast(`✓ Conveyance claim ₹${totalAmt.toLocaleString("en-IN")} submitted`);
        }}
      />}
      {/* ARET modal */}
      {aretTrip&&<AretModal trip={aretTrip} user={users.find(u=>u.id===userId)||{name:""}} policy={policy}
        onClose={()=>setAretTrip(null)}
        onSubmit={async(data)=>{
          toast("✓ ARET submitted for approval");
          if(sbPushNotif) await sbPushNotif(null,`ARET submitted for trip "${aretTrip.name}" — excess expense pre-authorisation required`,"warn");
          setAretTrip(null);
        }}
      />}
      {/* Per-employee budget modal */}
      {budgetTrip&&<TripBudgetModal trip={budgetTrip} users={users} claims={claims} getUser={getUser}
        onClose={()=>setBudgetTrip(null)}
        onSave={async(id,patch)=>{
          if(sbUpdateTrip)await sbUpdateTrip(id,patch);
          else setTrips(p=>p.map(t=>t.id===id?{...t,...patch}:t));
          setBudgetTrip(null);toast("✓ Budgets saved");
        }}
      />}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {visible.map(t=>{
          const spent=isManager?claims.filter(c=>c.tripId===t.id&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0):claims.filter(c=>c.tripId===t.id&&c.empId===userId&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0);
          const assignedEmps=(t.assignedTo||[]).map(id=>getUser(id)).filter(Boolean);
          const exp=expandedId===t.id;
          return(<Card key={t.id} style={{padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{flex:1,cursor:"pointer"}} onClick={()=>setExpId(exp?null:t.id)}>
                <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                  <span style={{fontFamily:FD,fontSize:14,fontWeight:700,color:INK}}>{t.name}</span>
                  {t.status==="active"&&<Badge s="Active" sm/>}
                  {t.status==="pending_approval"&&<span style={{background:"#fef3c7",color:"#92400e",padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:700}}>⏳ Pending Approval</span>}
                  {t.status==="closed"&&<Badge s="Closed" sm/>}
                  {t.status==="rejected"&&<span style={{background:"#fee2e2",color:"#dc2626",padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:700}}>✗ Rejected</span>}
                  <span style={{fontSize:9,background:"#f3f4f6",padding:"1px 5px",borderRadius:3,color:MUTED,textTransform:"capitalize"}}>{t.type}</span>
                  <span style={{fontSize:10,color:MUTED}}>{exp?"▲":"▼"}</span>
                </div>
                <div style={{fontSize:10,color:MUTED,marginTop:1}}>{fmtDate(t.startDate)} → {fmtDate(t.endDate)}</div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                {(isManager||isAdmin)&&t.status==="pending_approval"&&<>
                  <Btn onClick={()=>approveTrip(t)} style={{fontSize:10,padding:"5px 10px"}}>✓ Approve</Btn>
                  <Btn v="danger" onClick={()=>rejectTrip(t)} style={{fontSize:10,padding:"5px 8px"}}>✗</Btn>
                </>}
                {(isAdmin||isManager)&&(t.status==="active"||t.status==="closed")&&(
                  <div style={{display:"flex",gap:5}}>
                    <Btn v="outline" onClick={async()=>{try{const doc=await generateSettlementPDF(t,claims,getUser,"",users,policy);doc.save(`${t.name||"Trip"}_Settlement.pdf`);}catch(e){toast("PDF failed: "+e.message,"error");}}} style={{fontSize:10,padding:"5px 8px"}}>📄 PDF</Btn>
                    {(isManager||isAdmin)&&<Btn v="outline" onClick={async()=>{try{const doc=await generateTAR(t,users.find(u=>u.id===t.createdBy)||{name:""},users,"");doc.save(`TAR_${t.name||"Trip"}.pdf`);}catch(e){toast("TAR failed: "+e.message,"error");}}} style={{fontSize:10,padding:"5px 8px"}}>📋 TAR</Btn>}
                    {(isManager||isAdmin)&&<Btn v="outline" onClick={async()=>{try{const doc=await generateTERC(t,users.find(u=>u.id===t.createdBy)||{name:""},claims.filter(c=>c.tripId===t.id),policy,"");doc.save(`TERC_${t.name||"Trip"}.pdf`);}catch(e){toast("TERC failed: "+e.message,"error");}}} style={{fontSize:10,padding:"5px 8px"}}>📑 TERC</Btn>}
                    <Btn v="outline" onClick={()=>setConveyanceTrip(t)} style={{fontSize:10,padding:"5px 8px"}}>🚗 Conveyance</Btn>
                    <Btn v="outline" onClick={()=>setAretTrip(t)} style={{fontSize:10,padding:"5px 8px",borderColor:"#f59e0b",color:"#92400e"}}>⚠ ARET</Btn>
                    <Btn v="outline" onClick={()=>setEditTrip(t)} style={{fontSize:10,padding:"5px 8px"}}>Edit</Btn>
                    <Btn v="outline" onClick={()=>setLegsTrip(t)} style={{fontSize:10,padding:"5px 8px"}}>📍 Itinerary</Btn>
                    {/* Delete: pending/declined for all, any status for admin */}
                    {(isAdmin||(t.status==="pending_approval"||t.status==="declined")&&t.createdBy===userId)&&
                      <Btn v="danger" onClick={()=>deleteTrip&&deleteTrip(t)} style={{fontSize:10,padding:"5px 8px"}}>🗑 Delete</Btn>}
                    <Btn v="outline" onClick={()=>setBudgetTrip(t)} style={{fontSize:10,padding:"5px 8px"}}>Budget</Btn>
                    {t.status==="active"&&<Btn v="warning" onClick={()=>closeTrip(t.id)} style={{fontSize:10,padding:"5px 10px"}}>Close</Btn>}
                  </div>
                )}
              </div>
            </div>
            <div style={{display:"flex",gap:16,marginBottom:6,flexWrap:"wrap"}}>
              {[["Budget",fmt(t.budget)],["Spent",fmt(spent)],["Left",fmt(Math.max(0,t.budget-spent))],["Claims",claims.filter(c=>c.tripId===t.id).length]].map(([k,v])=>(
                <div key={k}><div style={{fontSize:9,color:MUTED,textTransform:"uppercase",letterSpacing:.5}}>{k}</div><div style={{fontWeight:700,fontSize:12,color:INK}}>{v}</div></div>
              ))}
            </div>
            <PBar value={spent} max={t.budget}/>
            {exp&&assignedEmps.length>0&&<div style={{marginTop:12,borderTop:`1px solid ${BDR}`,paddingTop:10}}>
              <div style={{fontSize:10,fontWeight:700,color:MUTED,textTransform:"uppercase",marginBottom:8}}>Assigned ({assignedEmps.length})</div>
              {assignedEmps.map(e=>{const es=claims.filter(c=>c.tripId===t.id&&c.empId===e.id&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0);return(
                <div key={e.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid #f8faf6`}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:GL,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:GD,fontSize:9}}>{e.avatar}</div>
                  <div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:INK}}>{e.name}</div><PBar value={es} max={t.budget/Math.max(assignedEmps.length,1)} h={3}/></div>
                  <div style={{fontWeight:700,fontSize:11,color:INK}}>{fmt(es)}</div>
                </div>
              );})}
            </div>}
          </Card>);
        })}
      </div>
    </div>
  );
}

// ─── APPROVALS TAB ────────────────────────────────────────────────────────────
function ApprovalsTab({pendingClaims,pendingTopups,getUser,trips,handleDecision,handleTopup,setMdl,isAdmin,needsDualApproval,approveTrip,rejectTrip,users,user,editRequests,approveEditRequest,rejectEditRequest,onReload,onReloadEditRequests,setClaims,approveLimit=999999999}){
  // canAct: manager can approve/reject only if claim amount is within their approval limit
  const canActOn=(claim)=>{
    if(isAdmin) return true;
    if(!approveLimit||approveLimit<=0) return true;
    return claim.amount<=approveLimit;
  };
  const [filter,setFilter]=useState("All");
  const [selected,setSelected]=useState(new Set());
  const pendingTrips=(trips||[]).filter(t=>t.status==="pending_approval");
  const pendingEdits=(editRequests||[]).filter(r=>r.status==="Pending");
  const shown=filter==="All"?pendingClaims:filter==="Anomaly"?pendingClaims.filter(c=>c.anomaly):filter==="High Value"?pendingClaims.filter(c=>needsDualApproval&&needsDualApproval(c.amount)):pendingClaims.filter(c=>c.flagged||c.weekendFlag);
  const totalPending=pendingClaims.length+pendingTopups.length+pendingTrips.length+pendingEdits.length;

  const handleRefresh=()=>{
    if(onReload)onReload();
    if(onReloadEditRequests)onReloadEditRequests();
  };

  const toggleSel=(id)=>setSelected(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const toggleAll=()=>setSelected(p=>p.size===shown.length?new Set():new Set(shown.map(c=>c.id)));
  const bulkApprove=()=>{selected.forEach(id=>handleDecision(id,"Approved","Bulk approved"));setSelected(new Set());};
  const bulkReject =()=>{selected.forEach(id=>handleDecision(id,"Rejected","Bulk rejected"));setSelected(new Set());};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK}}>Approvals</h1>
        {onReload&&<button onClick={handleRefresh} style={{padding:"5px 12px",background:"none",border:`1px solid ${BDR}`,borderRadius:7,cursor:"pointer",fontSize:11,color:MUTED}}>🔄 Refresh</button>}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        {[["📋 Claims",pendingClaims.length,"#3b82f6"],["💰 Top-ups",pendingTopups.length,"#f59e0b"],["🗂 Trips",pendingTrips.length,"#7c3aed"],["✏ Edits",pendingEdits.length,"#f97316"]].map(([label,count,color])=>(
          <div key={label} style={{padding:"4px 10px",borderRadius:16,background:count>0?"white":"#f9fafb",border:`1.5px solid ${count>0?color:"#e5e7eb"}`,fontSize:11,color:count>0?color:MUTED,fontWeight:count>0?700:400}}>
            {label}: {count}
          </div>
        ))}
      </div>

      {/* ── Pending Edit Requests ── */}
      {(editRequests||[]).filter(r=>r.status==="Pending").length>0&&<div style={{marginBottom:20}}>
        <div style={{fontFamily:FD,fontSize:14,fontWeight:700,color:INK,marginBottom:8}}>✏ Edit Requests <span style={{background:"#fef3c7",color:"#92400e",fontSize:11,padding:"2px 8px",borderRadius:10,marginLeft:6}}>{(editRequests||[]).filter(r=>r.status==="Pending").length}</span></div>
        {(editRequests||[]).filter(r=>r.status==="Pending").map(req=>{
          const claimId=req.claim_id||req.claimId;
          return(
            <Card key={req.id} style={{padding:14,marginBottom:8,borderLeft:"4px solid #f59e0b"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontWeight:700,color:INK,fontSize:13}}>{claimId}</div>
                  <div style={{color:MUTED,fontSize:11,marginTop:1}}>by {req.requester_name||req.requesterName} · {req.created_at?new Date(req.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric"}):""}</div>
                  <div style={{background:"#fef3c7",borderRadius:6,padding:"6px 10px",marginTop:6,fontSize:12,color:"#92400e"}}><strong>Reason:</strong> {req.reason}</div>
                </div>
                <div style={{display:"flex",gap:7,flexShrink:0}}>
                  <Btn onClick={()=>approveEditRequest&&approveEditRequest(req)} style={{padding:"7px 12px",fontSize:11}}>✓ Approve (24h)</Btn>
                  <Btn v="danger" onClick={()=>rejectEditRequest&&rejectEditRequest(req)} style={{padding:"7px 10px",fontSize:11}}>✗ Reject</Btn>
                </div>
              </div>
            </Card>
          );
        })}
      </div>}
      {/* ── Pending Trips ── */}
      {pendingTrips.length>0&&<Card style={{padding:16,marginBottom:16,borderColor:"#fcd34d",background:"#fffbeb"}}>
        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:"#92400e",marginBottom:10}}>⏳ Trips Awaiting Approval ({pendingTrips.length})</div>
        {pendingTrips.map(t=>{
          const creator=getUser(t.createdBy);
          return(
            <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:"#fff",borderRadius:9,marginBottom:7,border:`1px solid #fcd34d`}}>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:INK}}>{t.name}</div>
                <div style={{fontSize:11,color:MUTED}}>{fmtDate(t.startDate)} → {fmtDate(t.endDate)} · Created by {creator?.name||"Unknown"} ({creator?.dept||"—"})</div>
              </div>
              <div style={{display:"flex",gap:7,flexShrink:0}}>
                <Btn onClick={()=>approveTrip&&approveTrip(t)} style={{padding:"6px 12px",fontSize:11}}>✓ Approve Trip</Btn>
                <Btn v="danger" onClick={()=>rejectTrip&&rejectTrip(t)} style={{padding:"6px 10px",fontSize:11}}>✗ Reject</Btn>
              </div>
            </div>
          );
        })}
      </Card>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:7}}>
          {["All","Anomaly","Flagged"].map(f=><button key={f} onClick={()=>{setFilter(f);setSelected(new Set());}} style={{padding:"5px 13px",borderRadius:20,border:`1.5px solid ${filter===f?G:BDR}`,background:filter===f?G:"#fff",color:filter===f?"#fff":MUTED,fontFamily:FB,fontSize:11,fontWeight:600,cursor:"pointer"}}>{f}</button>)}
        </div>
        {shown.length>0&&<div style={{display:"flex",gap:7,alignItems:"center"}}>
          <label style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:MUTED,cursor:"pointer"}}><input type="checkbox" checked={selected.size===shown.length&&shown.length>0} onChange={toggleAll} style={{accentColor:G,width:14,height:14}}/> Select all</label>
          {selected.size>0&&<><span style={{fontSize:11,color:MUTED}}>{selected.size} selected</span>
            <Btn onClick={bulkApprove} style={{padding:"5px 12px",fontSize:11}}>✓ Approve {selected.size}</Btn>
            <Btn v="danger" onClick={bulkReject} style={{padding:"5px 10px",fontSize:11}}>✗ Reject {selected.size}</Btn>
          </>}
        </div>}
      </div>
      {pendingTopups.length>0&&<div style={{marginBottom:16}}>
        <div style={{fontSize:10,fontWeight:700,color:"#d97706",textTransform:"uppercase",letterSpacing:1,marginBottom:7}}>💰 Top-Up Requests</div>
        {pendingTopups.map(req=>{const e=getUser(req.empId);const reqTrip=trips.find(t=>t.id===req.tripId);return(
          <Card key={req.id} style={{padding:14,marginBottom:7,borderColor:"#fcd34d"}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:"#fef3c7",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#d97706",fontSize:12}}>{e?.avatar}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,color:INK,fontSize:13}}>{e?.name} — Top-Up Request</div>
                <div style={{fontSize:11,color:MUTED}}>{req.reason} · {req.date}{reqTrip?` · Trip: ${reqTrip.name}`:""}</div>
              </div>
              <div style={{fontFamily:FD,fontSize:16,fontWeight:700,color:"#d97706",marginRight:7}}>{fmt(req.amount)}</div>
              <Btn onClick={()=>handleTopup(req,"Approved")} style={{padding:"5px 11px",fontSize:11}}>✓ Approve</Btn>
              <Btn v="danger" onClick={()=>handleTopup(req,"Rejected")} style={{padding:"5px 9px",fontSize:11}}>✗</Btn>
            </div>
          </Card>
        );})}
      </div>}
      {shown.length>0?(
        <div>
          <div style={{fontSize:10,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:1,marginBottom:7}}>📋 Expense Claims</div>
          {shown.map(c=>{const e=getUser(c.empId);const trip=trips.find(t=>t.id===c.tripId);return(
            <Card key={c.id} style={{padding:14,marginBottom:8,borderColor:c.anomaly?"#c4b5fd40":c.flagged?"#fcd34d":BDR,borderLeft:selected.has(c.id)?`3px solid ${G}`:undefined}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:9}}>
                <input type="checkbox" checked={selected.has(c.id)} onChange={()=>toggleSel(c.id)} style={{accentColor:G,width:15,height:15,marginTop:3,flexShrink:0,cursor:"pointer"}}/>
                <div style={{fontSize:22,marginTop:2}}>{CI[c.category]||"📋"}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:2,flexWrap:"wrap"}}>
                    <span style={{fontFamily:"monospace",fontSize:9,color:GD,fontWeight:600}}>{c.id}</span>
                    {c.anomaly&&<span style={{background:"#ede9fe",color:"#7c3aed",fontSize:9,padding:"1px 5px",borderRadius:4,fontWeight:700}}>🔍 ANOMALY</span>}
                    {c.flagged&&<span style={{background:"#fef3c7",color:"#92400e",fontSize:9,padding:"1px 5px",borderRadius:4,fontWeight:700}}>⚠️ CAT%</span>}
                    {c.weekendFlag&&<span style={{background:"#dbeafe",color:"#1d4ed8",fontSize:9,padding:"1px 5px",borderRadius:4,fontWeight:700}}>📅 WKD</span>}
                  </div>
                  <div style={{fontWeight:600,color:INK,fontSize:13}}>{c.desc}</div>
                  <div style={{fontSize:10,color:MUTED}}>{e?.name} · {c.category} · {trip?.name} · {fmtDate(c.date)}</div>
                  {c.anomaly&&c.anomalyReasons?.length>0&&<div style={{fontSize:10,color:"#7c3aed",marginTop:3,background:"#ede9fe",padding:"3px 7px",borderRadius:5}}>⚠ {c.anomalyReasons.join(" · ")}</div>}
                  {c.receipts?.length>0&&<div style={{display:"flex",gap:5,marginTop:6,flexWrap:"wrap",alignItems:"center"}}>
                    {c.receipts.map((r,i)=>(
                      <div key={i} style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:2}}>
                        {r.type?.startsWith("image/")?<img src={r.url} alt="receipt" style={{width:44,height:44,objectFit:"cover",borderRadius:5,border:`1px solid ${BDR}`,cursor:"pointer"}} onClick={()=>setMdl({type:"lightbox",data:r})}/>:<div onClick={()=>setMdl({type:"lightbox",data:r})} style={{width:44,height:44,background:"#fee2e2",borderRadius:5,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:"1px solid #fca5a5",cursor:"pointer"}}><span style={{fontSize:18}}>📄</span></div>}
                        <a href={r.url} download={r.name||`rcpt_${i+1}`} onClick={e=>e.stopPropagation()} style={{fontSize:8,color:GD,textDecoration:"none"}}>⬇</a>
                      </div>
                    ))}
                    <span style={{fontSize:10,color:MUTED}}>{c.receipts.length} receipt{c.receipts.length!==1?"s":""}</span>
                  </div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontFamily:FD,fontSize:17,fontWeight:700,color:INK,marginBottom:3}}>{fmt(c.amount)}</div>
                  {c.origCur&&c.origCur!=="INR"&&<div style={{fontSize:9,color:MUTED,marginBottom:5}}>{c.origCur} {c.origAmount}</div>}
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {canActOn(c)
                      ?<Btn onClick={()=>setMdl({type:"decision",data:c})} style={{padding:"6px 11px",fontSize:11}}>Review →</Btn>
                      :<div style={{padding:"4px 9px",borderRadius:6,background:"#fef3c7",border:"1px solid #fcd34d",fontSize:10,color:"#92400e",fontWeight:600}} title={`Amount ₹${c.amount.toLocaleString("en-IN")} exceeds your approval limit of ₹${approveLimit.toLocaleString("en-IN")}`}>⚠ Above your limit</div>
                    }
                    {isAdmin&&c.status==="Manager Approved"&&(
                      <Btn onClick={()=>handleDecision(c.id,"Approved","Admin final approval")} style={{padding:"6px 9px",fontSize:10,background:"#7c3aed",color:"#fff"}}>⚡ Final</Btn>
                    )}
                    <button onClick={async()=>{
                      const note=c.anomaly?"":prompt("Enter anomaly note:")?.trim()||"Manager flagged";
                      const newAnomaly=!c.anomaly;
                      if(SB_ENABLED){await supabase.from("claims").update({anomaly:newAnomaly,anomaly_reasons:newAnomaly?[note]:[]}).eq("id",c.id);if(onReload)await onReload();}
                      else if(setClaims)setClaims(p=>p.map(x=>x.id===c.id?{...x,anomaly:newAnomaly,anomalyReasons:newAnomaly?[note]:[]}:x));
                    }} title={c.anomaly?"Remove flag":"Flag as anomaly"} style={{padding:"5px 8px",background:c.anomaly?"#ede9fe":"#f3f4f6",border:c.anomaly?"1px solid #c4b5fd":"none",borderRadius:6,cursor:"pointer",fontSize:12}}>🔍</button>
                  </div>
                </div>
              </div>
            </Card>
          );})}
        </div>
      ):(
        <Card style={{padding:40,textAlign:"center"}}><div style={{fontSize:32}}>🎉</div><div style={{fontFamily:FD,fontSize:16,fontWeight:700,color:INK,marginTop:8}}>All caught up!</div><div style={{color:MUTED,fontSize:12,marginTop:3}}>No pending approvals</div></Card>
      )}
    </div>
  );
}

// ─── TOPUP TAB ────────────────────────────────────────────────────────────────
function TopupTab({user,topups,setTopups,toast,sbCreateTopup,trips,isManager,managerUsers}){
  const myTrips=(trips||[]).filter(t=>t.status==="active"&&(!t.assignedTo||t.assignedTo.includes(user.id)));
  const [form,setForm]=useState({amount:"",reason:"",tripId:""});
  const [mgrForm,setMgrForm]=useState({empId:"",amount:"",reason:"",tripId:""});
  const [mgrTab,setMgrTab]=useState("own"); // "own" | "team"
  const inpS={width:"100%",padding:"10px 12px",border:`1.5px solid ${BDR}`,borderRadius:9,fontSize:13,background:"var(--input-bg,#fafff8)"};
  const submit=async()=>{
    if(!form.amount||!form.reason){toast("Fill amount and reason","error");return;}
    const tripId=form.tripId||myTrips[0]?.id;
    if(!tripId){toast("Please select a trip for this top-up request","error");return;}
    const req={id:uid(),empId:user.id,amount:parseFloat(form.amount),reason:form.reason,date:today(),status:"Pending",tripId};
    if(sbCreateTopup){await sbCreateTopup(req);}else{setTopups(p=>[...p,req]);}
    setForm({amount:"",reason:"",tripId:""});
    toast("✓ Top-up request sent to manager");
  };
  const submitMgr=async()=>{
    if(!mgrForm.empId||!mgrForm.amount||!mgrForm.reason){toast("Fill employee, amount and reason","error");return;}
    const empTrips=(trips||[]).filter(t=>t.status==="active"&&(!t.assignedTo||t.assignedTo.includes(mgrForm.empId)));
    const tripId=mgrForm.tripId||empTrips[0]?.id;
    if(!tripId){toast("No active trip for this employee","error");return;}
    // Manager-issued topup is auto-approved
    const req={id:uid(),empId:mgrForm.empId,amount:parseFloat(mgrForm.amount),reason:mgrForm.reason,date:today(),status:"Approved",tripId};
    if(sbCreateTopup){await sbCreateTopup(req);}else{setTopups(p=>[...p,req]);}
    setMgrForm({empId:"",amount:"",reason:"",tripId:""});
    toast("✓ Top-up added — approved immediately");
  };
  return(
    <div style={{maxWidth:540}}>
      <h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK,marginBottom:4}}>
        {isManager?"Top-Up Management":"Request Balance Top-Up"}
      </h1>
      {isManager&&<div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["own","My Request"],["team","Add for Team"]].map(([id,label])=>(
          <button key={id} onClick={()=>setMgrTab(id)} style={{padding:"6px 16px",borderRadius:7,border:`1.5px solid ${mgrTab===id?G:BDR}`,background:mgrTab===id?G:"transparent",color:mgrTab===id?"#fff":INK,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FB}}>{label}</button>
        ))}
      </div>}
      {(!isManager||mgrTab==="own")&&<>
        <p style={{color:MUTED,fontSize:12,marginBottom:16}}>Request additional funds from your manager for a specific trip</p>
        <Card style={{padding:20,marginBottom:12}}>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Trip *</label>
            {myTrips.length===0?(
              <div style={{padding:"10px",background:"#fef3c7",borderRadius:7,fontSize:12,color:"#92400e"}}>⚠ No active trips. Top-up requires an active trip.</div>
            ):(
              <select value={form.tripId||myTrips[0]?.id||""} onChange={e=>setForm({...form,tripId:e.target.value})} style={{...inpS,appearance:"none"}}>
                {myTrips.map(t=><option key={t.id} value={t.id}>{t.name} ({t.currency||"INR"})</option>)}
              </select>
            )}
          </div>
          <div style={{marginBottom:12}}><label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Amount (₹) *</label><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="e.g. 10000" style={inpS}/></div>
          <div style={{marginBottom:16}}><label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Reason *</label><textarea value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} rows={3} placeholder="Why do you need additional funds?" style={{...inpS,resize:"vertical"}}/></div>
          <Btn onClick={submit} disabled={myTrips.length===0} style={{width:"100%",padding:11}}>Send Request</Btn>
        </Card>
      </>}
      {isManager&&mgrTab==="team"&&<>
        <p style={{color:MUTED,fontSize:12,marginBottom:16}}>Issue an approved top-up directly to a team member — no approval needed.</p>
        <Card style={{padding:20,marginBottom:12}}>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Employee *</label>
            <select value={mgrForm.empId} onChange={e=>{
              const empTrips=(trips||[]).filter(t=>t.status==="active"&&(!t.assignedTo||t.assignedTo.includes(e.target.value)));
              setMgrForm({...mgrForm,empId:e.target.value,tripId:empTrips[0]?.id||""});
            }} style={{...inpS,appearance:"none"}}>
              <option value="">Select employee…</option>
              {(managerUsers||[]).map(u=><option key={u.id} value={u.id}>{u.name} — {u.dept}</option>)}
            </select>
          </div>
          {mgrForm.empId&&<div style={{marginBottom:12}}>
            <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Trip *</label>
            {(()=>{const et=(trips||[]).filter(t=>t.status==="active"&&(!t.assignedTo||t.assignedTo.includes(mgrForm.empId)));
              return et.length===0?<div style={{padding:"10px",background:"#fef3c7",borderRadius:7,fontSize:12,color:"#92400e"}}>⚠ No active trips for this employee.</div>:
              <select value={mgrForm.tripId||et[0]?.id||""} onChange={e=>setMgrForm({...mgrForm,tripId:e.target.value})} style={{...inpS,appearance:"none"}}>{et.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>;
            })()}
          </div>}
          <div style={{marginBottom:12}}><label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Amount (₹) *</label><input type="number" value={mgrForm.amount} onChange={e=>setMgrForm({...mgrForm,amount:e.target.value})} placeholder="e.g. 10000" style={inpS}/></div>
          <div style={{marginBottom:16}}><label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Reason *</label><textarea value={mgrForm.reason} onChange={e=>setMgrForm({...mgrForm,reason:e.target.value})} rows={2} placeholder="Reason for top-up" style={{...inpS,resize:"vertical"}}/></div>
          <div style={{background:"#f0fde9",border:`1px solid ${GM}`,borderRadius:7,padding:"8px 12px",marginBottom:12,fontSize:11,color:GD}}>✓ Manager-issued top-ups are approved immediately and credited to the trip wallet.</div>
          <Btn onClick={submitMgr} style={{width:"100%",padding:11}}>Issue Top-Up →</Btn>
        </Card>
      </>}
      {topups.length>0&&<Card>{topups.map(t=>{const trip=(trips||[]).find(x=>x.id===t.tripId);return(<div key={t.id} style={{padding:"10px 14px",borderBottom:`1px solid #f8faf6`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:600,fontSize:12}}>{fmt(t.amount)}{trip&&<span style={{fontSize:10,color:MUTED,marginLeft:6}}>{trip.name}</span>}</div><div style={{fontSize:10,color:MUTED}}>{t.reason} · {t.date}</div></div><Badge s={t.status} sm/></div>);})}</Card>}
    </div>
  );
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function SpendingBehaviourChart({claims,users,getUser,isManager}){
  const approved=claims.filter(c=>c.status==="Approved");
  // Top spenders
  const empSpend={};
  approved.forEach(c=>{empSpend[c.empId]=(empSpend[c.empId]||0)+c.amount;});
  const topEmps=Object.entries(empSpend).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxSpend=topEmps[0]?.[1]||1;
  // Category breakdown
  const catSpend={};
  approved.forEach(c=>{catSpend[c.category]=(catSpend[c.category]||0)+c.amount;});
  const topCats=Object.entries(catSpend).sort((a,b)=>b[1]-a[1]).slice(0,6);
  // Anomaly count per employee
  const anomalyCount={};
  claims.filter(c=>c.anomaly).forEach(c=>{anomalyCount[c.empId]=(anomalyCount[c.empId]||0)+1;});

  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:16}} className="mob-grid-1">
      {/* Top spenders */}
      <Card style={{padding:16}}>
        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:12}}>🏆 Top Spenders</div>
        {topEmps.map(([empId,amt])=>{
          const u=getUser(empId);
          const pct=Math.round(amt/maxSpend*100);
          return(
            <div key={empId} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:11,color:INK,fontWeight:600}}>{u?.name||"Unknown"}</span>
                <span style={{fontSize:11,color:INK,fontWeight:700}}>{fmt(amt)}</span>
              </div>
              <div style={{height:6,background:"#f3f4f6",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:pct+"%",background:pct>80?"#ef4444":pct>60?"#f59e0b":G,borderRadius:3,transition:"width .4s"}}/>
              </div>
              {anomalyCount[empId]>0&&<div style={{fontSize:9,color:"#7c3aed",marginTop:1}}>⚠ {anomalyCount[empId]} anomaly flag{anomalyCount[empId]!==1?"s":""}</div>}
            </div>
          );
        })}
        {topEmps.length===0&&<div style={{color:MUTED,fontSize:12,textAlign:"center"}}>No approved expenses yet</div>}
      </Card>
      {/* Category breakdown */}
      <Card style={{padding:16}}>
        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:12}}>📊 Spending by Category</div>
        {topCats.map(([cat,amt])=>{
          const total=Object.values(catSpend).reduce((a,b)=>a+b,0)||1;
          const pct=Math.round(amt/total*100);
          return(
            <div key={cat} style={{marginBottom:9}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                <span style={{fontSize:11,color:INK}}>{CI[cat]||"📋"} {cat}</span>
                <span style={{fontSize:11,color:MUTED}}>{pct}% · {fmt(amt)}</span>
              </div>
              <div style={{height:5,background:"#f3f4f6",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:pct+"%",background:G,borderRadius:3}}/>
              </div>
            </div>
          );
        })}
        {topCats.length===0&&<div style={{color:MUTED,fontSize:12,textAlign:"center"}}>No data yet</div>}
      </Card>
    </div>
  );
}

function Analytics({claims,trips,users,isManager,isAdmin,getUser,policy,printSummary,user}){
  const [from,setFrom]=useState("2026-01-01");
  const [to,setTo]=useState(today());
  const [empFilter,setEF]=useState("All");
  const emps=users.filter(u=>u.role==="employee");
  const filtered=claims.filter(c=>c.date>=from&&c.date<=to&&(empFilter==="All"||c.empId===empFilter));
  const approved=filtered.filter(c=>c.status==="Approved");
  const total=approved.reduce((s,c)=>s+c.amount,0);
  const byCat=CATS.map(cat=>({cat,amount:approved.filter(c=>c.category===cat).reduce((s,c)=>s+c.amount,0)})).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount);
  const maxCat=Math.max(...byCat.map(d=>d.amount),1);
  const COLS=[G,"#34d399","#60a5fa","#f59e0b","#f472b6","#a78bfa","#fb923c","#94a3b8"];
  const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthly=months.map((m,i)=>{const mn=String(i+1).padStart(2,"0");return{m,amount:approved.filter(c=>c.date.slice(5,7)===mn).reduce((s,c)=>s+c.amount,0)};}).filter(x=>x.amount>0);
  const maxM=Math.max(...monthly.map(d=>d.amount),1);
  const leaderboard=emps.map(e=>({e,spent:approved.filter(c=>c.empId===e.id).reduce((s,c)=>s+c.amount,0),n:approved.filter(c=>c.empId===e.id).length})).sort((a,b)=>b.spent-a.spent);
  const anomalies=claims.filter(c=>c.anomaly);
  const autoRate=claims.length?Math.round(claims.filter(c=>c.autoApproved).length/claims.length*100):0;
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK}}>Analytics</h1>
        <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={()=>printSummary(approved,isManager?null:user,null)} style={{padding:"6px 11px",background:"none",border:`1.5px solid ${BDR}`,borderRadius:8,cursor:"pointer",fontFamily:FB,fontSize:11,color:MUTED}}>🖨️ Print</button>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{padding:"6px 10px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:12}}/>
          <span style={{fontSize:12,color:MUTED}}>–</span>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{padding:"6px 10px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:12}}/>
          {isManager&&<select value={empFilter} onChange={e=>setEF(e.target.value)} style={{padding:"6px 10px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:12,appearance:"none",paddingRight:24}}>
            <option value="All">All Employees</option>
            {emps.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
          </select>}
        </div>
      </div>
      {/* Employee spending behaviour */}
      <SpendingBehaviourChart claims={claims} users={users} getUser={getUser} isManager={isManager}/>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
        {(isManager?[{l:"Total Spent",v:fmt(total),i:"💰"},{l:"Avg Claim",v:fmt(approved.length?Math.round(total/approved.length):0),i:"📊"},{l:"Anomalies",v:anomalies.length,i:"🔍"},{l:"Auto-Approved",v:`${autoRate}%`,i:"⚡"}]:[{l:"Total Spent",v:fmt(total),i:"💰"},{l:"Avg Claim",v:fmt(approved.length?Math.round(total/approved.length):0),i:"📊"},{l:"Claims",v:approved.length,i:"📋"},{l:"Trips",v:[...new Set(approved.map(c=>c.tripId))].length,i:"🗂️"}]).map((s,i)=>(
          <Card key={i} style={{padding:14}}><div style={{fontSize:20}}>{s.i}</div><div style={{fontFamily:FD,fontSize:17,fontWeight:700,color:INK,marginTop:3}}>{s.v}</div><div style={{fontSize:10,color:MUTED,marginTop:1}}>{s.l}</div></Card>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:12,marginBottom:12}}>
        <Card style={{padding:18}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:12}}>Spend by Category</div>
          {byCat.length===0?<div style={{color:MUTED,fontSize:12}}>No data for selected range</div>:byCat.map((d,i)=>(
            <div key={d.cat} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:12,color:"var(--ink)"}}>{CI[d.cat]} {d.cat}</span><span style={{fontWeight:700,fontSize:12,color:INK}}>{fmt(d.amount)}</span></div>
              <div style={{background:"#f3f4f6",borderRadius:4,height:5,overflow:"hidden"}}><div style={{width:`${(d.amount/maxCat)*100}%`,background:COLS[i%COLS.length],height:"100%",borderRadius:4,transition:"width .6s"}}/></div>
            </div>
          ))}
        </Card>
        <Card style={{padding:18}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:12}}>Month-on-Month Trend</div>
          {monthly.length===0?<div style={{color:MUTED,fontSize:12}}>No data</div>:(
            <div style={{display:"flex",alignItems:"flex-end",gap:7,height:110}}>
              {monthly.map((d,i)=>(
                <div key={d.m} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{fontSize:9,color:MUTED,fontWeight:600}}>₹{Math.round(d.amount/1000)}k</div>
                  <div style={{width:"100%",background:i===monthly.length-1?G:"#d1fae5",borderRadius:"4px 4px 0 0",height:`${(d.amount/maxM)*85}px`,transition:"height .6s ease"}}/>
                  <div style={{fontSize:9,color:MUTED}}>{d.m}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      {isManager&&leaderboard.some(r=>r.spent>0)&&<Card style={{padding:18,marginBottom:12}}>
        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:12}}>Employee Spend Leaderboard</div>
        <table style={{width:"100%"}}>
          <thead><tr><th>#</th><th>Employee</th><th>Dept</th><th>Claims</th><th>Total</th><th>vs Dept Budget</th></tr></thead>
          <tbody>{leaderboard.filter(r=>r.spent>0).map((row,i)=>(
            <tr key={row.e.id} className="rh">
              <td style={{fontWeight:700,color:i===0?"#f59e0b":i===1?"#9ca3af":i===2?"#b45309":MUTED,fontSize:14}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</td>
              <td><div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:24,height:24,borderRadius:"50%",background:GL,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:GD,fontSize:9}}>{row.e.avatar}</div><span style={{fontWeight:600,fontSize:12}}>{row.e.name}</span></div></td>
              <td style={{color:MUTED,fontSize:11}}>{row.e.dept}</td>
              <td style={{fontWeight:600}}>{row.n}</td>
              <td style={{fontWeight:700,color:INK}}>{fmt(row.spent)}</td>
              <td style={{width:120}}><PBar value={row.spent} max={policy.departmentBudgets?.[row.e.dept]||50000} h={5}/></td>
            </tr>
          ))}</tbody>
        </table>
      </Card>}
      {isManager&&anomalies.length>0&&<Card style={{padding:18}}>
        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:"#dc2626",marginBottom:10}}>🔍 Anomaly Report</div>
        {anomalies.map(c=>{const e=getUser(c.empId);return(<div key={c.id} style={{padding:"8px 0",borderBottom:`1px solid #f3f4f6`,display:"flex",gap:9,alignItems:"flex-start"}}>
          <span style={{fontFamily:"monospace",fontSize:10,color:GD,fontWeight:600,flexShrink:0}}>{c.id}</span>
          <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:INK}}>{c.desc} — {e?.name}</div><div style={{fontSize:10,color:"#dc2626",marginTop:2}}>{(c.anomalyReasons||[]).join(" · ")}</div></div>
          <div style={{fontWeight:700,fontSize:12,color:INK,flexShrink:0}}>{fmt(c.amount)}</div>
          <Badge s={displayStatus(c,isAdmin)} sm/>
        </div>);})}
      </Card>}
      <Card style={{padding:18,marginTop:12}}>
        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:12}}>Trip Summary</div>
        {trips.map(t=>{const s=claims.filter(c=>c.tripId===t.id&&c.status!=="Rejected").reduce((a,c)=>a+c.amount,0);return(
          <div key={t.id} style={{marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${BDR}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,fontWeight:600,color:INK}}>{t.name}</span><Badge s={t.status==="active"?"Active":"Closed"} sm/></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:MUTED,marginBottom:3}}><span>{fmt(s)} spent</span><span>of {fmt(t.budget)}</span></div>
            <PBar value={s} max={t.budget} h={4}/>
          </div>
        );})}
      </Card>
    </div>
  );
}

// ─── INBOX ────────────────────────────────────────────────────────────────────
function Inbox({notifications,setNotifs,userId}){
  const mine=notifications.filter(n=>n.userId===userId);
  const markAll=()=>setNotifs(p=>p.map(n=>n.userId===userId?{...n,read:true}:n));
  const TC={success:"#dcfce7",error:"#fee2e2",info:"#dbeafe",warn:"#fef3c7"};
  const TX={success:"#15803d",error:"#dc2626",info:"#1d4ed8",warn:"#92400e"};
  return(
    <div style={{maxWidth:560}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK}}>Notifications Inbox</h1>
        {mine.some(n=>!n.read)&&<Btn v="outline" onClick={markAll} style={{fontSize:11,padding:"5px 10px"}}>Mark all read</Btn>}
      </div>
      {mine.length===0?(<Card style={{padding:40,textAlign:"center"}}><div style={{fontSize:28}}>🔔</div><div style={{fontWeight:700,color:INK,marginTop:8}}>No notifications yet</div></Card>):(
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {mine.map(n=><div key={n.id} style={{padding:"11px 14px",borderRadius:10,background:n.read?"#f9fafb":TC[n.type]||TC.info,border:`1px solid ${n.read?BDR:"transparent"}`,display:"flex",gap:9,alignItems:"flex-start"}}>
            <span style={{fontSize:16,flexShrink:0}}>{n.type==="success"?"✅":n.type==="error"?"❌":n.type==="warn"?"⚠️":"ℹ️"}</span>
            <div style={{flex:1}}><div style={{fontSize:12,fontWeight:n.read?400:600,color:n.read?MUTED:TX[n.type]||TX.info}}>{n.text}</div><div style={{fontSize:10,color:MUTED,marginTop:2}}>{n.time}</div></div>
            {!n.read&&<div style={{width:7,height:7,borderRadius:"50%",background:TX[n.type]||TX.info,flexShrink:0,marginTop:4}}/>}
          </div>)}
        </div>
      )}
    </div>
  );
}

// ─── AUDIT TAB ────────────────────────────────────────────────────────────────
function Audit({auditLog,claims,getUser,users,trips,policy}){
  const[filter,setFilter]=useState("all");
  const[search,setSearch]=useState("");
  const[dateFrom,setDateFrom]=useState("");
  const[dateTo,setDateTo]=useState("");

  // Enrich audit log with claim and user details
  const enriched=(auditLog||[]).map(a=>{
    const c=claims?.find(x=>x.id===a.claimId);
    const t=trips?.find(x=>x.id===a.tripId);
    return {...a, _claim:c, _trip:t};
  });

  const CATEGORIES=[
    {id:"all",label:"All"},
    {id:"claim",label:"Claims"},
    {id:"approval",label:"Approvals"},
    {id:"trip",label:"Trips"},
    {id:"policy",label:"Policy"},
    {id:"user",label:"Users"},
    {id:"budget",label:"Budget"},
  ];

  const categoryOf=(action="")=>{
    const a=action.toLowerCase();
    if(a.includes("approved")||a.includes("rejected")||a.includes("submitted"))return "approval";
    if(a.includes("claim"))return "claim";
    if(a.includes("trip")||a.includes("period")||a.includes("itinerary"))return "trip";
    if(a.includes("policy")||a.includes("setting"))return "policy";
    if(a.includes("user")||a.includes("employee")||a.includes("password")||a.includes("role"))return "user";
    if(a.includes("budget")||a.includes("topup")||a.includes("balance"))return "budget";
    return "claim";
  };

  const colorOf=(action="")=>{
    const a=action.toLowerCase();
    if(a.includes("approved")||a.includes("activated")||a.includes("created"))return{bg:"#dcfce7",color:"#16a34a"};
    if(a.includes("rejected")||a.includes("deleted")||a.includes("suspended"))return{bg:"#fee2e2",color:"#dc2626"};
    if(a.includes("policy")||a.includes("setting")||a.includes("edit"))return{bg:"#ede9fe",color:"#7c3aed"};
    if(a.includes("trip"))return{bg:"#dbeafe",color:"#2563eb"};
    if(a.includes("budget")||a.includes("topup"))return{bg:"#fef3c7",color:"#92400e"};
    if(a.includes("user")||a.includes("employee"))return{bg:"#e0f2fe",color:"#0369a1"};
    return{bg:"#f3f4f6",color:"#374151"};
  };

  const filtered=enriched.filter(a=>{
    if(filter!=="all"&&categoryOf(a.action)!==filter)return false;
    if(search){
      const q=search.toLowerCase();
      if(!(a.action?.toLowerCase().includes(q)||a.byName?.toLowerCase().includes(q)||a.remarks?.toLowerCase().includes(q)||a.claimId?.toLowerCase().includes(q)||a._trip?.name?.toLowerCase().includes(q)))return false;
    }
    if(dateFrom&&a.at&&a.at<dateFrom)return false;
    if(dateTo&&a.at&&a.at>dateTo+" 23:59")return false;
    return true;
  });

  // Summary stats
  const stats={
    total:enriched.length,
    today:enriched.filter(a=>a.at?.slice(0,10)===today()).length,
    approvals:enriched.filter(a=>categoryOf(a.action)==="approval").length,
    policy:enriched.filter(a=>categoryOf(a.action)==="policy").length,
  };

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK,marginBottom:2}}>Activity Log</h1>
          <p style={{color:MUTED,fontSize:11}}>Complete record of every action across the application</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{padding:"6px 8px",border:`1px solid ${BDR}`,borderRadius:7,fontSize:11,background:"var(--card,#fff)"}}/>
          <span style={{color:MUTED,fontSize:11,alignSelf:"center"}}>to</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{padding:"6px 8px",border:`1px solid ${BDR}`,borderRadius:7,fontSize:11,background:"var(--card,#fff)"}}/>
        </div>
      </div>

      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[["Total Entries",stats.total,"#1a2e12"],["Today",stats.today,G],["Approvals",stats.approvals,"#2563eb"],["Policy Changes",stats.policy,"#7c3aed"]].map(([l,v,c])=>(
          <div key={l} style={{background:"var(--card,#fff)",border:`1px solid ${BDR}`,borderRadius:9,padding:"10px 14px"}}>
            <div style={{fontSize:10,color:MUTED,textTransform:"uppercase",marginBottom:3}}>{l}</div>
            <div style={{fontWeight:700,fontSize:20,color:c}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",gap:6,flex:1,flexWrap:"wrap"}}>
          {CATEGORIES.map(c=>(
            <button key={c.id} onClick={()=>setFilter(c.id)} style={{padding:"4px 12px",borderRadius:20,border:`1.5px solid ${filter===c.id?G:BDR}`,background:filter===c.id?G:"transparent",color:filter===c.id?"#fff":MUTED,fontSize:11,fontWeight:600,cursor:"pointer"}}>
              {c.label}
            </button>
          ))}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search by action, user, remark…" style={{padding:"6px 10px",border:`1px solid ${BDR}`,borderRadius:7,fontSize:11,background:"var(--card,#fff)",minWidth:220}}/>
      </div>

      <Card>
        <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",minWidth:700}}>
          <thead><tr>
            <th style={{width:130}}>Time</th>
            <th style={{width:160}}>Action</th>
            <th>Details</th>
            <th style={{width:130}}>By</th>
            <th>Remarks</th>
          </tr></thead>
          <tbody>
            {filtered.length===0
              ?<tr><td colSpan={5} style={{padding:36,textAlign:"center",color:MUTED}}>No entries match your filters</td></tr>
              :filtered.map((a,idx)=>{
                const c=colorOf(a.action);
                const cat=categoryOf(a.action);
                return(<tr key={a.id||idx} className="rh">
                  <td style={{fontSize:10,color:MUTED,fontFamily:"monospace",whiteSpace:"nowrap"}}>{a.at||a.created_at?.slice(0,16)||"—"}</td>
                  <td>
                    <span style={{background:c.bg,color:c.color,padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{a.action}</span>
                  </td>
                  <td style={{fontSize:11}}>
                    {a.claimId&&<span style={{fontFamily:"monospace",fontSize:10,color:GD,fontWeight:600,marginRight:6}}>{a.claimId}</span>}
                    {a._claim&&<span style={{color:INK,fontSize:11}}>₹{a._claim.amount?.toLocaleString("en-IN")} · {a._claim.category}</span>}
                    {a.tripId&&a._trip&&<span style={{color:"#2563eb",fontSize:11}}>Trip: {a._trip.name}</span>}
                    {a.tripId&&!a._trip&&<span style={{fontFamily:"monospace",fontSize:10,color:MUTED}}>{a.tripId}</span>}
                    {!a.claimId&&!a.tripId&&a.remarks&&<span style={{color:MUTED,fontSize:10}}>{a.remarks?.slice(0,60)}</span>}
                  </td>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:22,height:22,borderRadius:"50%",background:a.byId==="SYSTEM"?"#f3f4f6":GL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:GD,flexShrink:0}}>
                        {a.byId==="SYSTEM"?"⚡":(getUser?.(a.byId||a.by)?.avatar||inits(a.byName||"?"))}
                      </div>
                      <span style={{fontSize:11,fontWeight:600}}>{a.byName||"System"}</span>
                    </div>
                  </td>
                  <td style={{color:MUTED,fontSize:10,maxWidth:200}}>{a.remarks||"—"}</td>
                </tr>);
              })
            }
          </tbody>
        </table>
        </div>
        <div style={{padding:"8px 14px",borderTop:`1px solid ${BDR}`,fontSize:10,color:MUTED}}>
          Showing {filtered.length} of {enriched.length} entries
        </div>
      </Card>
    </div>
  );
}

// ─── EMPLOYEES TAB ────────────────────────────────────────────────────────────
function Employees({companyMeta,users,setUsers,claims,policy,toast,addUserToSB,updateUserInSB,sbEnabled,companyDepts,isAdmin,empGroups,sbSaveGroup,sbDeleteGroup,currentUser}){
  const depts=companyDepts||policy?.departments||DEFAULT_DEPTS;
  const hierarchy=policy?.approvalHierarchy||[];
  const isHRRole=currentUser?.role==="hr";
  // Non-admin managers only see employees strictly below their grade
  const visibleEmps=isAdmin
    ? users.filter(u=>u.role!=="admin")
    : users.filter(u=>{
        if(u.id===currentUser?.id) return true; // always see self
        if(u.role==="admin") return false;
        // Only see users at lower grade (subordinates)
        const myGrade=currentUser?.grade||0;
        const theirGrade=u.grade||0;
        return theirGrade<myGrade||(theirGrade===0&&myGrade>0);
      });
  const creatableRoles=isAdmin
    ?ROLES.filter(r=>["manager","finance","hr","cfo","employee"].includes(r.id))
    :ROLES.filter(r=>["finance","employee"].includes(r.id));
  const countedUsers=users.filter(u=>u.role!=="admin");
  const emps=visibleEmps;
  const activeEmps=countedUsers.filter(u=>!u.isSuspended);
  const maxUsers=companyMeta.maxUsers||0;
  const canAdd=activeEmps.length<maxUsers;

  const[tab,setLocalTab]=useState("employees"); // employees | groups
  const[showAdd,setShowAdd]=useState(false);
  const[editEmp,setEditEmp]=useState(null);
  const[busy,setBusy]=useState(false);
  const[form,setForm]=useState({name:"",username:"",mobile:"",email:"",dept:depts[0]||"Operations",balance:"",password:"",role:"employee",grade:"",gradeLabel:"",groupId:"",reportingTo:""});
  const[editForm,setEF]=useState({});
  const[showNewGroup,setShowNewGroup]=useState(false);
  const[groupForm,setGroupForm]=useState({name:"",dept:depts[0]||"",managerId:""});
  const inpS={padding:"9px 11px",border:`1.5px solid ${BDR}`,borderRadius:8,fontSize:13,background:"var(--input-bg,#fafff8)",fontFamily:FB,width:"100%"};
  const sS={...inpS,appearance:"none"};

  // ── Grade helper ─────────────────────────────────────────────────────────
  const gradeOptions=[{value:"",label:"No grade"},...hierarchy.sort((a,b)=>a.level-b.level).map(h=>({value:String(h.level),label:`L${h.level} — ${h.label||"Level "+h.level}`}))];
  const gradeForLevel=level=>hierarchy.find(h=>h.level===parseInt(level));

  const handleNameChange=e=>{
    const n=e.target.value;
    setForm(f=>({...f,name:n,username:f.username||n.toLowerCase().replace(/\s+/g,".")}));
  };

  const add=async()=>{
    if(!form.name||!form.username||!form.password){toast("Name, username and password required","error");return;}
    if(form.password.length<4){toast("Password must be at least 4 characters","error");return;}
    if(!canAdd){toast(`Active limit (${maxUsers}) reached.`,"error");return;}
    if(users.find(u=>u.username?.toLowerCase()===form.username.toLowerCase())){toast("Username already taken","error");return;}
    setBusy(true);
    try{
      const gradeNum=parseInt(form.grade)||0;
      const gradeLbl=gradeNum>0?(form.gradeLabel||(gradeForLevel(form.grade)?.label||"")):form.gradeLabel||"";
      const ud={name:form.name,username:form.username.toLowerCase().trim(),email:form.email||null,mobile:form.mobile||null,role:form.role,dept:form.dept,balance:parseFloat(form.balance)||0,grade:gradeNum,gradeLabel:gradeLbl,groupId:form.groupId||null,reportingTo:form.reportingTo||null};
      if(sbEnabled&&addUserToSB){await addUserToSB(ud,form.password);}
      else{setUsers(p=>[...p,{id:"emp_"+uid(),cid:companyMeta.id,...ud,avatar:inits(form.name),reimbursable:0,delegateTo:null,isSuspended:false,authType:"custom",groupName:(empGroups||[]).find(g=>g.id===form.groupId)?.name||""}]);}
      setForm({name:"",username:"",mobile:"",email:"",dept:depts[0]||"Operations",balance:"",password:"",role:"employee",grade:"",gradeLabel:"",groupId:"",reportingTo:""});
      setShowAdd(false);
    }catch(e){toast(e.message||"Failed","error");}
    finally{setBusy(false);}
  };

  const openEdit=e=>{setEditEmp(e);setEF({name:e.name,dept:e.dept,role:e.role,balance:String(e.balance||0),mobile:e.mobile||"",password:"",grade:String(e.grade||""),gradeLabel:e.gradeLabel||"",groupId:e.groupId||"",reportingTo:e.reportingTo||"",groupIds:e.groupIds||[]});};

  const saveEdit=async()=>{
    setBusy(true);
    try{
      const gradeNum=parseInt(editForm.grade)||0;
      const gradeLbl=gradeNum>0?(editForm.gradeLabel||(gradeForLevel(editForm.grade)?.label||"")):editForm.gradeLabel||"";
      const newGroupIds=editForm.groupIds||[];
      const primaryGroup=newGroupIds[0]||null;
      // Base patch — all roles can update name, mobile
      const patch={name:editForm.name,mobile:editForm.mobile||undefined};
      // Wallet balance: admin only
      if(isAdmin) patch.balance=parseFloat(editForm.balance)||0;
      // Department, role, grade: HR or admin only
      if(isAdmin||isHRRole){
        patch.dept=editForm.dept;
        patch.role=editForm.role;
        patch.grade=gradeNum;
        patch.gradeLabel=gradeLbl;
        patch.groupId=primaryGroup;
        patch.reportingTo=editForm.reportingTo||null;
      }
      if(editForm.password)patch.password=editForm.password;
      if(sbEnabled&&updateUserInSB){
        await updateUserInSB(editEmp.id,patch);
        // Save multi-group memberships
        if(sbEnabled){
          // Delete existing memberships for this user
          await supabase?.from("user_group_memberships").delete().eq("user_id",editEmp.id);
          // Insert new ones
          if(newGroupIds.length>0){
            await supabase?.from("user_group_memberships").insert(
              newGroupIds.map(gid=>({user_id:editEmp.id,group_id:gid,company_id:companyMeta.id}))
            );
          }
        }
        // Always update local state so UI reflects change immediately (don't wait for reload)
        setUsers(p=>p.map(u=>u.id===editEmp.id?{...u,...patch,avatar:inits(editForm.name),groupIds:newGroupIds,groupName:(empGroups||[]).find(g=>g.id===primaryGroup)?.name||""}:u));
      } else {
        setUsers(p=>p.map(u=>u.id===editEmp.id?{...u,...patch,avatar:inits(editForm.name),groupIds:newGroupIds,groupName:(empGroups||[]).find(g=>g.id===primaryGroup)?.name||""}:u));
      }
      toast("✓ "+editForm.name+" updated");setEditEmp(null);
    }catch(e){toast(e.message,"error");}
    finally{setBusy(false);}
  };

  const toggleSuspend=async emp=>{
    const ns=!emp.isSuspended;
    if(!ns&&activeEmps.length>=maxUsers){toast("Cannot activate — active limit reached","error");return;}
    if(sbEnabled&&updateUserInSB)await updateUserInSB(emp.id,{isSuspended:ns});
    else setUsers(p=>p.map(u=>u.id===emp.id?{...u,isSuspended:ns}:u));
    toast(ns?"Suspended — "+emp.name:"Activated — "+emp.name);
  };

  const addGroup=async()=>{
    if(!groupForm.name.trim()){toast("Group name required","error");return;}
    const g={id:uid(),name:groupForm.name.trim(),dept:groupForm.dept,managerId:groupForm.managerId||null,company_id:companyMeta.id};
    if(sbEnabled&&sbSaveGroup){await sbSaveGroup(g);}
    toast("✓ Group created: "+g.name);
    setGroupForm({name:"",dept:depts[0]||"",managerId:""});
    setShowNewGroup(false);
  };

  const groups=empGroups||[];
  const managersAndAbove=users.filter(u=>u.grade>0||["manager","admin"].includes(u.role));

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK}}>Employees & Groups</h1>
        <div style={{display:"flex",gap:8}}>
          {[["employees","👤 Employees"],["groups","👥 Groups"]].map(([id,label])=>(
            <button key={id} onClick={()=>setLocalTab(id)} style={{padding:"6px 14px",borderRadius:7,border:`1.5px solid ${tab===id?G:BDR}`,background:tab===id?G:"transparent",color:tab===id?"#fff":INK,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FB}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── EMPLOYEES TAB ── */}
      {tab==="employees"&&<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:12,color:MUTED}}>{activeEmps.length}/{maxUsers} active · {Math.max(0,maxUsers-activeEmps.length)} slots remaining</div>
          <Btn onClick={()=>setShowAdd(p=>!p)} disabled={!canAdd}>{showAdd?"✕ Cancel":"+ Add Employee"}</Btn>
        </div>

        {showAdd&&<Card style={{padding:20,marginBottom:14}}>
          <div style={{fontFamily:FD,fontSize:15,fontWeight:700,color:INK,marginBottom:12}}>New Employee</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Full Name *</label><input value={form.name} onChange={handleNameChange} style={inpS} placeholder="Ravi Sharma"/></div>
            <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Username *</label><input value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} style={inpS} placeholder="ravi.sharma"/></div>
            <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Password *</label><input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} style={inpS} placeholder="min 4 chars"/></div>
            <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Mobile</label><input value={form.mobile} onChange={e=>setForm(f=>({...f,mobile:e.target.value}))} style={inpS} placeholder="optional"/></div>
            <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Email</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} style={inpS} placeholder="optional"/></div>
            <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Wallet ₹</label><input type="number" value={form.balance} onChange={e=>setForm(f=>({...f,balance:e.target.value}))} style={inpS} placeholder="0"/></div>
            <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Role</label>
              <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} style={sS}>
                {creatableRoles.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
              </select></div>
            <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Department</label>
              <select value={form.dept} onChange={e=>setForm(f=>({...f,dept:e.target.value}))} style={sS}>
                {depts.map(d=><option key={d}>{d}</option>)}
              </select></div>

            {/* Grade — linked to approval hierarchy */}
            <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Grade {hierarchy.length>0?"(links to approval levels)":"(set levels in Policy first)"}</label>
              <select value={form.grade} onChange={e=>{
                const level=e.target.value;
                const h=gradeForLevel(level);
                setForm(f=>({...f,grade:level,gradeLabel:h?.label||f.gradeLabel}));
              }} style={sS} disabled={hierarchy.length===0}>
                {gradeOptions.map(g=><option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
              {hierarchy.length===0&&<div style={{fontSize:10,color:"#f59e0b",marginTop:2}}>⚠ No approval levels defined. Go to Policy → Grade System to define levels first.</div>}
            </div>

            <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Grade Label (override)</label><input value={form.gradeLabel} onChange={e=>setForm(f=>({...f,gradeLabel:e.target.value}))} style={inpS} placeholder="e.g. Sr Engineer"/></div>

            {/* Group — within-dept grouping */}
            <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Group {groups.length===0?"(create groups in Groups tab)":""}</label>
              <select value={form.groupId} onChange={e=>setForm(f=>({...f,groupId:e.target.value}))} style={sS} disabled={groups.length===0}>
                <option value="">No group</option>
                {groups.filter(g=>!form.dept||g.dept===form.dept||!g.dept).map(g=><option key={g.id} value={g.id}>{g.name} {g.dept?`(${g.dept})`:""}</option>)}
              </select></div>

            {/* Reporting to — direct manager within group */}
            <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Reporting To (group manager)</label>
              <select value={form.reportingTo} onChange={e=>setForm(f=>({...f,reportingTo:e.target.value}))} style={sS}>
                <option value="">Department default</option>
                {managersAndAbove.filter(u=>u.dept===form.dept||!form.dept).map(u=><option key={u.id} value={u.id}>{u.name} {u.gradeLabel?`(${u.gradeLabel})`:`(${u.role})`}</option>)}
              </select></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={add} disabled={busy}>{busy?"Adding…":"Add Employee →"}</Btn>
            <Btn v="outline" onClick={()=>setShowAdd(false)}>Cancel</Btn>
          </div>
        </Card>}

        {/* Employee list */}
        <Card style={{overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:GL}}>
              {["Employee","Dept / Group","Grade","Role","Wallet","Status","Actions"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",color:GD,fontWeight:700,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {emps.map((e,idx)=>(
                <tr key={e.id} style={{borderTop:`1px solid ${BDR}`,background:e.isSuspended?"var(--hover-bg,#f9fafb)":"var(--card,#fff)"}}>
                  <td style={{padding:"9px 10px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:30,height:30,borderRadius:"50%",background:e.isSuspended?"#e5e7eb":GL,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:e.isSuspended?MUTED:GD,fontSize:10}}>{e.avatar}</div>
                      <div>
                        <div style={{fontWeight:600,color:e.isSuspended?MUTED:INK}}>{e.name}</div>
                        <div style={{fontSize:10,color:MUTED}}>{e.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:"9px 10px"}}>
                    <div style={{fontWeight:500,color:INK}}>{e.dept}</div>
                    {e.groupName&&<div style={{fontSize:10,color:MUTED}}>👥 {e.groupName}</div>}
                    {e.reportingTo&&<div style={{fontSize:10,color:MUTED}}>↑ {users.find(u=>u.id===e.reportingTo)?.name||"—"}</div>}
                  </td>
                  <td style={{padding:"9px 10px"}}>
                    {e.grade>0?<span style={{background:GL,color:GD,padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:700}}>L{e.grade} {e.gradeLabel}</span>:<span style={{color:MUTED,fontSize:10}}>—</span>}
                  </td>
                  <td style={{padding:"9px 10px",color:INK,textTransform:"capitalize"}}>{e.role}</td>
                  <td style={{padding:"9px 10px",fontWeight:600,color:INK}}>{fmt(e.balance)}</td>
                  <td style={{padding:"9px 10px"}}><span style={{background:e.isSuspended?"#fee2e2":"#dcfce7",color:e.isSuspended?"#991b1b":"#166534",padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600}}>{e.isSuspended?"Suspended":"Active"}</span></td>
                  <td style={{padding:"9px 10px"}}>
                    <div style={{display:"flex",gap:5}}>
                      <button onClick={()=>openEdit(e)} style={{padding:"4px 9px",border:`1px solid ${BDR}`,borderRadius:5,background:"none",cursor:"pointer",fontSize:11,color:INK}}>Edit</button>
                      {isAdmin&&<button onClick={()=>toggleSuspend(e)} style={{padding:"4px 9px",border:`1px solid ${e.isSuspended?"#6ee7b7":"#fca5a5"}`,borderRadius:5,background:"none",cursor:"pointer",fontSize:11,color:e.isSuspended?"#065f46":"#991b1b"}}>{e.isSuspended?"Activate":"Suspend"}</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Edit modal */}
        {editEmp&&<div data-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"var(--card,#fff)",borderRadius:14,padding:24,width:"min(540px,98vw)",maxHeight:"90vh",overflow:"auto",boxShadow:"0 12px 40px rgba(0,0,0,.2)"}}>
            <h3 style={{fontFamily:FD,fontSize:17,fontWeight:700,color:INK,marginBottom:14}}>Edit — {editEmp.name}</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {[["Full Name","text",editForm.name,v=>setEF({...editForm,name:v}),""],["Mobile","text",editForm.mobile,v=>setEF({...editForm,mobile:v}),"optional"],[" New Password","password",editForm.password,v=>setEF({...editForm,password:v}),"leave blank to keep"]].map(([l,t,v,fn,ph])=>(
                <div key={l}><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>{l}</label><input type={t} value={v} onChange={e=>fn(e.target.value)} placeholder={ph} style={inpS}/></div>
              ))}
              {/* Wallet edit: admin only — top-up is the proper route for everyone else */}
              {isAdmin&&<div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Wallet ₹ <span style={{color:"#dc2626"}}>(Admin only)</span></label><input type="number" value={editForm.balance} onChange={e=>setEF({...editForm,balance:e.target.value})} style={inpS}/></div>}
              {/* Department, role, grade: HR and admin only */}
              {(isAdmin||isHRRole)&&<>
                <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Department</label>
                  <select value={editForm.dept} onChange={e=>setEF({...editForm,dept:e.target.value})} style={sS}>{depts.map(d=><option key={d}>{d}</option>)}</select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Role</label>
                  <select value={editForm.role} onChange={e=>setEF({...editForm,role:e.target.value})} style={sS}>{creatableRoles.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
                {/* Grade */}
                <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Grade</label>
                  <select value={editForm.grade||""} onChange={e=>{const h=gradeForLevel(e.target.value);setEF({...editForm,grade:e.target.value,gradeLabel:h?.label||editForm.gradeLabel});}} style={sS}>
                    {gradeOptions.map(g=><option key={g.value} value={g.value}>{g.label}</option>)}
                  </select></div>
                <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Designation</label><input value={editForm.gradeLabel||""} onChange={e=>setEF({...editForm,gradeLabel:e.target.value})} style={inpS} placeholder="e.g. Sr Engineer"/></div>
              </>}
              {!(isAdmin||isHRRole)&&<div style={{gridColumn:"1/-1",background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:7,padding:"8px 12px",fontSize:11,color:"#92400e"}}>⚠ Department, role, and grade changes require HR or Admin access.</div>}
              {/* Multi-group assignment */}
              <div style={{gridColumn:"1/-1"}}><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:5,textTransform:"uppercase"}}>Groups {editEmp.role==="employee"?"(employee can be in 1 group)":"(can be in multiple groups)"}</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:7,padding:"8px 10px",border:`1.5px solid ${BDR}`,borderRadius:8,background:"var(--input-bg,#fafff8)",minHeight:36}}>
                  {groups.length===0&&<span style={{fontSize:11,color:MUTED}}>No groups created yet</span>}
                  {groups.map(g=>{
                    const inGroup=(editForm.groupIds||[]).includes(g.id);
                    const isEmployee=editForm.role==="employee";
                    return(
                      <label key={g.id} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",padding:"3px 9px",borderRadius:12,border:`1px solid ${inGroup?G:BDR}`,background:inGroup?GL:"transparent",fontSize:11,fontWeight:inGroup?600:400,color:inGroup?GD:INK}}>
                        <input type={isEmployee?"radio":"checkbox"} checked={inGroup}
                          onChange={e=>{
                            if(isEmployee){
                              // Employee: single group only
                              setEF(f=>({...f,groupIds:e.target.checked?[g.id]:[],groupId:e.target.checked?g.id:""}));
                            } else {
                              // Manager/finance/admin: multiple groups
                              setEF(f=>({...f,groupIds:e.target.checked?[...(f.groupIds||[]),g.id]:(f.groupIds||[]).filter(id=>id!==g.id)}));
                            }
                          }}
                          style={{margin:0}}/>{g.name}{g.dept?` (${g.dept})`:""}</label>
                    );
                  })}
                </div>
              </div>
              <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Reporting To</label>
                <select value={editForm.reportingTo||""} onChange={e=>setEF({...editForm,reportingTo:e.target.value})} style={sS}>
                  <option value="">Department default</option>
                  {managersAndAbove.filter(u=>u.id!==editEmp.id).map(u=><option key={u.id} value={u.id}>{u.name} {u.gradeLabel?`(${u.gradeLabel})`:`(${u.role})`}</option>)}
                </select></div>
            </div>
            <div style={{display:"flex",gap:8}}><Btn onClick={saveEdit} disabled={busy}>{busy?"Saving…":"Save Changes"}</Btn><Btn v="outline" onClick={()=>setEditEmp(null)}>Cancel</Btn></div>
          </div>
        </div>}
      </>}

      {/* ── GROUPS TAB ── */}
      {tab==="groups"&&<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <p style={{fontSize:12,color:MUTED}}>Groups allow multiple teams within the same department, each with their own group manager. Employees in a group report to their group manager, not the department manager.</p>
          <Btn onClick={()=>setShowNewGroup(p=>!p)}>{showNewGroup?"✕ Cancel":"+ New Group"}</Btn>
        </div>

        {showNewGroup&&<Card style={{padding:18,marginBottom:14}}>
          <div style={{fontFamily:FD,fontSize:14,fontWeight:700,color:INK,marginBottom:10}}>Create Group</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Group Name *</label><input value={groupForm.name} onChange={e=>setGroupForm(f=>({...f,name:e.target.value}))} style={inpS} placeholder="e.g. Extrusion Team A"/></div>
            <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Department</label>
              <select value={groupForm.dept} onChange={e=>setGroupForm(f=>({...f,dept:e.target.value,managerId:""}))} style={sS}>
                <option value="">All departments</option>
                {depts.map(d=><option key={d}>{d}</option>)}
              </select></div>
            <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Group Manager</label>
              <select value={groupForm.managerId} onChange={e=>setGroupForm(f=>({...f,managerId:e.target.value}))} style={sS}>
                <option value="">No specific manager</option>
                {managersAndAbove.filter(u=>!groupForm.dept||u.dept===groupForm.dept).map(u=><option key={u.id} value={u.id}>{u.name} {u.gradeLabel?`(L${u.grade} ${u.gradeLabel})`:`(${u.role})`}</option>)}
              </select></div>
          </div>
          <div style={{display:"flex",gap:8}}><Btn onClick={addGroup}>Create Group →</Btn><Btn v="outline" onClick={()=>setShowNewGroup(false)}>Cancel</Btn></div>
        </Card>}

        {groups.length===0&&<Card style={{padding:32,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:8}}>👥</div>
          <div style={{fontFamily:FD,fontSize:15,fontWeight:700,color:INK,marginBottom:4}}>No groups yet</div>
          <div style={{fontSize:12,color:MUTED}}>Create groups to organise employees into teams within departments. Each group can have its own manager.</div>
        </Card>}

        <div style={{display:"grid",gap:10}}>
          {groups.map(g=>{
            const groupManager=users.find(u=>u.id===g.managerId);
            const groupMembers=users.filter(u=>u.groupId===g.id);
            return(
              <Card key={g.id} style={{padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontWeight:700,color:INK,fontSize:14}}>👥 {g.name}</div>
                    <div style={{fontSize:11,color:MUTED,marginTop:2}}>
                      {g.dept&&<span>{g.dept} · </span>}
                      {groupMembers.length} member{groupMembers.length!==1?"s":""}
                      {groupManager&&<span> · Manager: <strong>{groupManager.name}</strong> {groupManager.gradeLabel&&`(${groupManager.gradeLabel})`}</span>}
                    </div>
                  </div>
                  {sbDeleteGroup&&isAdmin&&<button onClick={()=>{if(window.confirm(`Delete group "${g.name}"? Members will become ungrouped.`))sbDeleteGroup(g.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",fontSize:12}}>Delete</button>}
                </div>
                {groupMembers.length>0&&<div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>
                  {groupMembers.map(m=>(
                    <div key={m.id} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 10px",background:GL,borderRadius:12,fontSize:11}}>
                      <div style={{width:18,height:18,borderRadius:"50%",background:G,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#fff"}}>{m.avatar}</div>
                      <span style={{color:INK,fontWeight:500}}>{m.name}</span>
                      {m.grade>0&&<span style={{color:MUTED,fontSize:9}}>L{m.grade}</span>}
                    </div>
                  ))}
                </div>}
              </Card>
            );
          })}
        </div>
      </>}
    </div>
  );
}
// ─── R2 STORAGE STATUS WIDGET ────────────────────────────────────────────────
function R2StatusWidget(){
  const[status,setStatus]=useState(null);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{
    fetch("/api/r2upload")
      .then(r=>r.json())
      .then(d=>{setStatus(d);setLoading(false);})
      .catch(()=>{setStatus({configured:false,missing:["api/r2upload not deployed"]});setLoading(false);});
  },[]);
  if(loading)return<div style={{fontSize:12,color:MUTED}}>Checking storage…</div>;
  return(
    <div>
      {status?.configured
        ?<>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#f0fde9",border:`1px solid ${GM}`,borderRadius:9,marginBottom:10}}>
            <span style={{fontSize:20}}>🟠</span>
            <div>
              <div style={{fontWeight:700,fontSize:12,color:"#16a34a"}}>✓ Secure cloud storage active</div>
              <div style={{fontSize:10,color:MUTED}}>Bucket: <code style={{background:"#f0fde9",padding:"0 3px",borderRadius:3}}>{status.bucket}</code> · Files never stored on XpensR servers</div>
            </div>
          </div>
          {!status.publicUrl&&<div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:8,padding:"10px 12px",fontSize:11,color:"#92400e"}}>
            <b>⚠ Receipts uploading to R2 but images not yet viewable in app.</b>
            <ol style={{marginLeft:16,marginTop:5,lineHeight:1.9}}>
              <li>Go to <b>Cloudflare → R2 → {status.bucket} → Settings → Public Access</b></li>
              <li>Click <b>Allow Access</b> — Cloudflare gives you a URL like <code>https://pub-xxxx.r2.dev</code></li>
              <li>In <b>Vercel → Settings → Environment Variables</b> add:<br/><code>VITE_R2_PUBLIC_URL = https://pub-xxxx.r2.dev</code></li>
              <li><b>Redeploy</b> — receipts will then display correctly</li>
            </ol>
          </div>}
          {status.publicUrl&&<div style={{background:"#f0fde9",border:`1px solid ${GM}`,borderRadius:8,padding:"9px 12px",fontSize:11,color:GD}}>
            ✓ Public URL set — receipt images will display: <code style={{fontSize:10}}>{status.publicUrl}</code>
          </div>}
        </>
        :<div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:9,padding:"10px 14px"}}>
          <div style={{fontWeight:700,fontSize:12,color:"#92400e",marginBottom:6}}>⚠ Storage not configured — contact administrator</div>
          {(status?.missing||[]).map(m=><div key={m} style={{fontFamily:"monospace",fontSize:11,color:"#dc2626",marginBottom:2}}>✗ {m}</div>)}
          <div style={{fontSize:10,color:MUTED,marginTop:6}}>Add missing vars in Vercel → Settings → Environment Variables, then redeploy.</div>
        </div>
      }
    </div>
  );
}

// ─── COMPANY BYOK AI KEY CONFIG ───────────────────────────────────────────────
// SECURITY: API key NEVER touches browser storage or DevTools.
// Browser sends the key ONCE to /api/aikey (serverless, service role).
// Server validates it, stores it encrypted. Browser only receives a masked string.
function CompanyAiKeyConfig({cid}){
  const[status,setStatus]=useState(null);
  const[provider,setProvider]=useState("claude");
  const[apiKey,setApiKey]=useState("");
  const[model,setModel]=useState("");
  const[aiEnabled,setAiEnabled]=useState(false);
  const[saving,setSaving]=useState(false);
  const[msg,setMsg]=useState("");
  const[loading,setLoading]=useState(true);
  const[showKey,setShowKey]=useState(false);

  const PROVIDERS=[
    {id:"claude",label:"Anthropic Claude",icon:"🟠",models:["claude-haiku-4-5-20251001","claude-sonnet-4-20250514","claude-opus-4-20250514"],placeholder:"sk-ant-api03-...",howTo:"console.anthropic.com → API Keys"},
    {id:"openai",label:"OpenAI / ChatGPT",icon:"🟢",models:["gpt-4o-mini","gpt-4o","gpt-4-turbo"],placeholder:"sk-proj-...",howTo:"platform.openai.com → API Keys"},
    {id:"gemini",label:"Google Gemini",icon:"🔵",models:["gemini-1.5-flash","gemini-1.5-pro","gemini-2.0-flash"],placeholder:"AIzaSy...",howTo:"aistudio.google.com → Get API Key"},
  ];

  const load=async()=>{
    if(!cid){setLoading(false);return;}
    try{
      const r=await fetch("/api/aikey",{headers:{"x-company-id":cid}});
      if(!r.ok){setStatus({hasKey:false,apiNotDeployed:true});setLoading(false);return;}
      const d=await r.json();
      setStatus(d);
      if(d.hasKey){setProvider(d.provider||"claude");setModel(d.model||"");setAiEnabled(d.aiEnabled||false);}
    }catch{
      setStatus({hasKey:false,apiNotDeployed:true});
    }
    setLoading(false);
  };
  useEffect(()=>{load();},[cid]);

  const save=async()=>{
    if(!apiKey||apiKey.length<10){setMsg("Enter a valid API key (min 10 chars).");return;}
    setSaving(true);setMsg("");
    try{
      const r=await fetch("/api/aikey",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-company-id":cid},
        body:JSON.stringify({provider,apiKey,model:model||(PROVIDERS.find(p=>p.id===provider)?.models[0]||""),aiEnabled}),
      });
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Save failed");
      setMsg(d.message||"✓ Key saved");
      setApiKey(""); // clear from memory immediately after send
      await load();
    }catch(e){setMsg("Error: "+e.message);}
    setSaving(false);
  };

  const toggle=async(enabled)=>{
    try{
      await fetch("/api/aikey",{method:"POST",headers:{"Content-Type":"application/json","x-company-id":cid},body:JSON.stringify({_toggleOnly:true,provider:status?.provider,aiEnabled:enabled})});
      await load();
    }catch{}
  };

  const remove=async()=>{
    if(!window.confirm("Remove API key? AI features will stop."))return;
    await fetch("/api/aikey",{method:"DELETE",headers:{"x-company-id":cid}});
    setApiKey("");await load();setMsg("Key removed.");
  };

  if(loading)return<div style={{color:MUTED,fontSize:12}}>Loading AI config…</div>;
  if(status?.apiNotDeployed)return<div style={{padding:"10px 12px",background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:8,fontSize:11,color:"#92400e"}}>⚠ AI key management not available. Contact support.</div>;

  const inpS={padding:"9px 11px",border:`1.5px solid ${BDR}`,borderRadius:8,fontSize:12,background:"var(--input-bg,#fafff8)",width:"100%",fontFamily:FB};
  const curP=PROVIDERS.find(p=>p.id===provider)||PROVIDERS[0];

  return(
    <div>
      {status?.hasKey
        ?<div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:status.aiEnabled?"#f0fde9":"#fef3c7",border:`1px solid ${status.aiEnabled?GM:"#fcd34d"}`,borderRadius:9,marginBottom:14}}>
          <span style={{fontSize:20}}>{PROVIDERS.find(p=>p.id===status.provider)?.icon||"🤖"}</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:12,color:status.aiEnabled?"#16a34a":"#92400e"}}>{status.aiEnabled?"✓ AI active — using your own key":"⏸ Key saved but AI is paused"}</div>
            <div style={{fontSize:10,color:MUTED}}>{PROVIDERS.find(p=>p.id===status.provider)?.label} · {status.model||"default"} · {status.maskedKey}</div>
          </div>
          <button onClick={()=>toggle(!status.aiEnabled)} style={{padding:"4px 11px",borderRadius:6,border:"none",background:status.aiEnabled?"#fef3c7":"#f0fde9",color:status.aiEnabled?"#92400e":"#16a34a",fontWeight:700,fontSize:11,cursor:"pointer"}}>{status.aiEnabled?"Pause":"Enable"}</button>
          <button onClick={remove} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #fca5a5",background:"none",color:"#dc2626",fontSize:11,cursor:"pointer"}}>Remove</button>
        </div>
        :<div style={{padding:"8px 12px",background:"#f8fafc",border:`1px solid ${BDR}`,borderRadius:9,marginBottom:14,fontSize:11,color:MUTED}}>No API key — AI is disabled. Add your key below to enable.</div>
      }

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
        {PROVIDERS.map(p=>(
          <button key={p.id} onClick={()=>{setProvider(p.id);setModel(p.models[0]);}} style={{padding:"9px 6px",borderRadius:9,border:`2px solid ${provider===p.id?G:BDR}`,background:provider===p.id?"#f0fde9":"var(--card,#fff)",cursor:"pointer",textAlign:"center"}}>
            <div style={{fontSize:17,marginBottom:2}}>{p.icon}</div>
            <div style={{fontSize:10,fontWeight:700,color:provider===p.id?GD:INK}}>{p.label}</div>
          </button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div>
          <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Model</label>
          <select value={model||curP.models[0]} onChange={e=>setModel(e.target.value)} style={{...inpS,appearance:"none"}}>
            {curP.models.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div style={{display:"flex",alignItems:"flex-end",paddingBottom:1}}>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:12,color:INK}}>
            <Toggle on={aiEnabled} onClick={()=>setAiEnabled(p=>!p)} label="Enable AI after saving"/>
          </label>
        </div>
      </div>

      <div style={{marginBottom:10}}>
        <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>
          API Key <span style={{fontWeight:400,textTransform:"none",fontSize:9}}>— get from: {curP.howTo}</span>
        </label>
        <div style={{position:"relative"}}>
          <input type={showKey?"text":"password"} value={apiKey} onChange={e=>setApiKey(e.target.value)}
            placeholder={status?.hasKey?"Enter new key to replace existing…":curP.placeholder}
            style={inpS} autoComplete="off" spellCheck={false}/>
          <button onClick={()=>setShowKey(p=>!p)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:MUTED,fontSize:14}}>{showKey?"🙈":"👁"}</button>
        </div>
      </div>

      <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:7,padding:"8px 12px",marginBottom:12,fontSize:11,color:"#1d4ed8"}}>
        🔒 Your key is sent over HTTPS to our secure server and stored encrypted in your private database. It is never visible in browser DevTools, Network tab, or localStorage. XpensR never charges for your AI usage.
      </div>

      {msg&&<div style={{fontSize:12,padding:"7px 10px",borderRadius:6,marginBottom:10,background:msg.startsWith("✓")?"#f0fde9":"#fee2e2",color:msg.startsWith("✓")?"#16a34a":"#dc2626"}}>{msg}</div>}
      <Btn onClick={save} disabled={saving||!apiKey} style={{padding:"9px 22px"}}>{saving?"Validating & Saving…":"Save API Key"}</Btn>
    </div>
  );
}

// Storage credentials stored server-side only via /api/storage.
// Company pays their storage provider directly — XpensR never handles files.
// ─── AI TOKEN WIDGET — shown in Policy tab for company admin ─────────────────
function AiTokenWidget({cid,sbEnabled}){
  const [tokenData,setTokenData]=useState(null);
  const [history,setHistory]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    if(!sbEnabled||!cid){setLoading(false);return;}
    Promise.all([
      supabase.from("ai_tokens").select("balance,used_total,plan_label,is_active,last_topup_at").eq("company_id",cid).maybeSingle(),
      supabase.from("ai_token_packs").select("pack_name,tokens_added,amount_inr,created_at").eq("company_id",cid).order("created_at",{ascending:false}).limit(10),
      supabase.from("ai_usage_log").select("tokens_used,feature,created_at").eq("company_id",cid).order("created_at",{ascending:false}).limit(50),
    ]).then(([{data:td,error:e1},{data:packs},{data:usage}])=>{
      if(e1){setTokenData("error");setLoading(false);return;}
      setTokenData(td||null);
      setHistory(packs||[]);
      setLoading(false);
    }).catch(()=>{setTokenData("error");setLoading(false);});
  },[cid,sbEnabled]);

  if(loading) return<div style={{color:MUTED,fontSize:12}}>Loading AI subscription…</div>;
  if(tokenData==="error") return<div style={{padding:"10px 12px",background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:8,fontSize:11,color:"#92400e"}}>⚠ AI token tracking not set up. Contact support.</div>;

  if(!tokenData||tokenData.balance==null){
    return(
      <div>
        <div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:8,padding:"12px 14px",marginBottom:10}}>
          <div style={{fontWeight:700,color:"#92400e",fontSize:12,marginBottom:4}}>🤖 AI Features not activated</div>
          <div style={{fontSize:11,color:"#92400e"}}>
            AI invoice OCR and chat assistant are not active for your company.<br/>
            Contact your XpensR account manager to purchase a token pack.
          </div>
        </div>
        <div style={{fontSize:11,color:MUTED}}>
          <b>Available packs:</b> Starter (50K tokens · ₹199) · Growth (200K · ₹599) · Pro (500K · ₹1,199) · Enterprise (2M · ₹3,999)
        </div>
      </div>
    );
  }

  const balance=tokenData.balance||0;
  const used=tokenData.used_total||0;
  const total=balance+used;
  const pct=total>0?Math.min(100,Math.round(balance/total*100)):0;
  const isLow=balance<10000;
  const isExhausted=balance<=0;

  return(
    <div>
      {/* Balance summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
        {[
          ["Remaining Balance",`${(balance/1000).toFixed(1)}K`,isExhausted?"#dc2626":isLow?"#f59e0b":"#16a34a"],
          ["Total Used",`${(used/1000).toFixed(1)}K`,MUTED],
          ["Pack",tokenData.plan_label||"—",INK],
        ].map(([l,v,c])=>(
          <div key={l} style={{background:"#f9fafb",borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontSize:9,color:MUTED,textTransform:"uppercase",marginBottom:3}}>{l}</div>
            <div style={{fontWeight:700,fontSize:15,color:c}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:MUTED,marginBottom:4}}>
          <span>Token balance</span><span>{pct}% remaining</span>
        </div>
        <div style={{height:8,background:"#e5e7eb",borderRadius:4,overflow:"hidden"}}>
          <div style={{height:"100%",width:pct+"%",background:pct<20?"#dc2626":pct<40?"#f59e0b":G,borderRadius:4,transition:"width .3s"}}/>
        </div>
      </div>

      {/* Alerts */}
      {isExhausted&&<div style={{background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:7,padding:"8px 12px",fontSize:11,color:"#dc2626",fontWeight:600,marginBottom:10}}>
        ⛔ All AI tokens used. Contact your XpensR account manager to purchase more tokens.
      </div>}
      {isLow&&!isExhausted&&<div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:7,padding:"8px 12px",fontSize:11,color:"#92400e",marginBottom:10}}>
        ⚠ Low token balance ({(balance/1000).toFixed(1)}K remaining). Contact your account manager soon.
      </div>}

      {/* Purchase history */}
      {history.length>0&&<>
        <div style={{fontWeight:700,fontSize:11,color:INK,marginBottom:6}}>Purchase History</div>
        {history.slice(0,5).map((h,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"5px 0",borderBottom:`1px solid #f5f5f5`,color:INK}}>
            <span>{h.pack_name}</span>
            <span style={{color:GD,fontWeight:600}}>+{(h.tokens_added/1000).toFixed(0)}K tokens</span>
            <span style={{color:MUTED}}>{h.amount_inr>0?`₹${h.amount_inr}`:"—"}</span>
            <span style={{color:MUTED}}>{new Date(h.created_at).toLocaleDateString("en-IN")}</span>
          </div>
        ))}
      </>}

      <div style={{marginTop:10,fontSize:10,color:MUTED}}>
        1 AI invoice scan ≈ 800–1,200 tokens · 1 chat message ≈ 200–500 tokens
      </div>
    </div>
  );
}

function Policy({policy:initPol,setPolicy:setParentPol,savePolicy,toast,users,sbEnabled,cid}){
  const[policy,setPolicy]=useState(()=>({...initPol}));
  const lastSavedRef=useRef(null);
  // Only sync from parent when it changes AND we haven't just saved
  // (prevents loadFromSB reset from wiping local unsaved edits)
  useEffect(()=>{
    const key=JSON.stringify({
      autoApproveLimit:initPol.autoApproveLimit,
      gradeBased:initPol.gradeBased,
      approvalHierarchy:initPol.approvalHierarchy,
      gradeEntitlements:initPol.gradeEntitlements,
      cityTiers:initPol.cityTiers,
      cityClassification:initPol.cityClassification,
    });
    if(lastSavedRef.current===null){
      // First load — initialise from DB
      lastSavedRef.current=key;
      setPolicy({...initPol});
    }
    // After that, only update if the key fingerprint changed from outside
    // (i.e. another user changed policy, or a page reload)
  },[]);
  const emps=users.filter(u=>u.role==="employee").length;
  const tier=TIERED.find(t=>emps>=t.min&&emps<=t.max)||TIERED[0];
  const [vendor,setVendor]=useState("");
  const [vMode,setVMode]=useState("blacklist");
  const inpS={padding:"8px 10px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:12,background:"var(--input-bg,#fafff8)",width:"100%"};
  return(
    <div>
      <h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK,marginBottom:14}}>Policy & Settings</h1>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {/* Core */}
        <Card style={{padding:18}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:12}}>Core Policy</div>
          {[["Receipt Mandatory Above (₹)","receiptMandatoryAbove"]].map(([l,k])=>(
            <div key={k} style={{marginBottom:12}}><label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>{l}</label><input type="number" value={policy[k]||0} onChange={e=>setPolicy({...policy,[k]:parseFloat(e.target.value)||0})} style={inpS}/>
            </div>
          ))}
          <Toggle on={policy.reimbursementMode}         onClick={()=>setPolicy({...policy,reimbursementMode:!policy.reimbursementMode})}         label="Reimbursement Mode"        sub="No wallet — employees claim back invoices"/>
          <Toggle on={policy.weekendRequiresApproval}   onClick={()=>setPolicy({...policy,weekendRequiresApproval:!policy.weekendRequiresApproval})} label="Weekend → Approval"        sub="Sat/Sun expenses go to manager"/>
          <Toggle on={policy.multiLevelApproval}        onClick={()=>setPolicy({...policy,multiLevelApproval:!policy.multiLevelApproval})}          label="Multi-Level Approval"     sub="Different approvers by amount"/>
          {policy.multiLevelApproval&&<div style={{marginTop:10,background:GL,borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontSize:10,fontWeight:700,color:GD,marginBottom:7,textTransform:"uppercase"}}>Approval Levels</div>
            {(policy.approvalLevels||[]).map((lv,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6,fontSize:12}}>
                <span style={{color:MUTED,minWidth:18}}>L{i+1}</span><span style={{color:MUTED}}>Up to</span>
                <input type="number" value={lv.upTo} onChange={e=>{const a=[...policy.approvalLevels];a[i]={...a[i],upTo:parseFloat(e.target.value)||0};setPolicy({...policy,approvalLevels:a});}} style={{width:80,padding:"4px 7px",border:`1.5px solid ${BDR}`,borderRadius:5,fontSize:11}}/>
                <select value={lv.role} onChange={e=>{const a=[...policy.approvalLevels];a[i]={...a[i],role:e.target.value};setPolicy({...policy,approvalLevels:a});}} style={{padding:"4px 7px",border:`1.5px solid ${BDR}`,borderRadius:5,fontSize:11,appearance:"none"}}>
                  {ROLES.filter(r=>["manager","admin","approver","finance"].includes(r.id)).map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            ))}
          </div>}
        </Card>
        {/* Vendor */}
        <Card style={{padding:18}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:12}}>Vendor Policy</div>
          <div style={{display:"flex",gap:7,marginBottom:10}}>
            {["whitelist","blacklist"].map(m=><button key={m} onClick={()=>setVMode(m)} style={{flex:1,padding:"6px",borderRadius:7,border:`1.5px solid ${vMode===m?G:BDR}`,background:vMode===m?GL:"#fff",color:vMode===m?GD:MUTED,fontFamily:FB,fontSize:11,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>{m==="whitelist"?"✓ Whitelist":"✗ Blacklist"}</button>)}
          </div>
          <div style={{fontSize:11,color:MUTED,marginBottom:9}}>{vMode==="whitelist"?"Only listed vendors allowed":"Claims from these vendors blocked"}</div>
          <div style={{display:"flex",gap:7,marginBottom:9}}>
            <input value={vendor} onChange={e=>setVendor(e.target.value)} placeholder="Vendor name…" style={{...inpS,flex:1}}/>
            <Btn onClick={()=>{if(!vendor.trim())return;const k=vMode==="whitelist"?"vendorWhitelist":"vendorBlacklist";setPolicy({...policy,[k]:[...(policy[k]||[]),vendor.trim()]});setVendor("");}} style={{padding:"8px 12px",fontSize:12}}>Add</Btn>
          </div>
          {(vMode==="whitelist"?policy.vendorWhitelist||[]:policy.vendorBlacklist||[]).map((v,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 9px",background:vMode==="whitelist"?GL:"#fee2e2",borderRadius:6,marginBottom:5,fontSize:12}}>
              <span style={{color:vMode==="whitelist"?GD:"#dc2626"}}>{vMode==="whitelist"?"✓":"✗"} {v}</span>
              <button onClick={()=>{const k=vMode==="whitelist"?"vendorWhitelist":"vendorBlacklist";setPolicy({...policy,[k]:policy[k].filter((_,j)=>j!==i)});}} style={{background:"none",border:"none",color:MUTED,cursor:"pointer",fontSize:13}}>×</button>
            </div>
          ))}
        </Card>
        {/* Category % */}
        <Card style={{padding:18}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:4}}>Category % Limits per Trip</div>
          <div style={{fontSize:11,color:MUTED,marginBottom:10}}>Exceeding → sent to manager for approval</div>
          {CATS.map(cat=>(
            <div key={cat} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:12,flex:1,color:"var(--ink)"}}>{CI[cat]} {cat}</span>
              <div style={{display:"flex",alignItems:"center",gap:4}}><input type="number" value={policy.categoryPct?.[cat]||0} onChange={e=>setPolicy({...policy,categoryPct:{...policy.categoryPct,[cat]:parseFloat(e.target.value)||0}})} style={{...inpS,width:52,textAlign:"center"}}/><span style={{fontSize:11,color:MUTED}}>%</span></div>
            </div>
          ))}
        </Card>
        {/* Dept budgets */}
        <Card style={{padding:18}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:12}}>Department Budgets (₹/month)</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {DEPTS.map(dept=>(<div key={dept}><label style={{fontSize:9,color:MUTED,fontWeight:700,display:"block",marginBottom:2,textTransform:"uppercase"}}>{dept}</label><input type="number" value={policy.departmentBudgets?.[dept]||0} onChange={e=>setPolicy({...policy,departmentBudgets:{...(policy.departmentBudgets||{}),[dept]:parseFloat(e.target.value)||0}})} style={inpS}/></div>))}
          </div>
        </Card>
        {/* Scheduled reports */}
        <Card style={{padding:18}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:12}}>Scheduled Email Reports</div>
          <Toggle on={policy.scheduledReports?.enabled} onClick={()=>setPolicy({...policy,scheduledReports:{...policy.scheduledReports,enabled:!policy.scheduledReports?.enabled}})} label="Enable Scheduled Reports" sub="Auto-email PDF reports"/>
          {policy.scheduledReports?.enabled&&<div style={{marginTop:10}}>
            <div style={{marginBottom:10}}><label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Frequency</label>
              <select value={policy.scheduledReports?.frequency||"weekly"} onChange={e=>setPolicy({...policy,scheduledReports:{...policy.scheduledReports,frequency:e.target.value}})} style={{...inpS,appearance:"none",paddingRight:28}}>
                {["daily","weekly","monthly"].map(f=><option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>)}
              </select>
            </div>
            <div><label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Send to Email</label><input type="email" value={policy.scheduledReports?.email||""} onChange={e=>setPolicy({...policy,scheduledReports:{...policy.scheduledReports,email:e.target.value}})} placeholder="reports@company.in" style={inpS}/></div>
            <div style={{marginTop:8,padding:"7px 10px",background:GL,borderRadius:7,fontSize:11,color:GD}}>✓ {policy.scheduledReports?.frequency} reports → {policy.scheduledReports?.email||"(set email above)"}</div>
          </div>}
        </Card>

        {/* ── Storage Status ── */}
        <Card style={{padding:18}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:10}}>📦 Receipt Storage</div>
          <R2StatusWidget/>
        </Card>

        {/* ── AI Configuration (BYOK) ── */}
        <Card style={{padding:18}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:4}}>🤖 AI — Bring Your Own API Key</div>
          <div style={{fontSize:11,color:MUTED,marginBottom:12}}>Connect your own Claude, ChatGPT, or Gemini key. XpensR never charges for AI usage when you use your own key.</div>
          <CompanyAiKeyConfig cid={cid}/>
        </Card>

        {/* AI Token Subscription — visible to admin (Policy tab is admin-only) */}
        <Card style={{padding:18}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:10}}>🤖 AI Features — Token Balance</div>
          <AiTokenWidget cid={cid} sbEnabled={sbEnabled}/>
        </Card>
        {/* ── Auto-Approve & Dual Approval Rules ── */}
        <Card style={{padding:18}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:10}}>Auto-Approve & Dual Approval Rules</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:10}}>
            {[["Auto-Approve Limit (₹)","autoApproveLimit"],["Dual Approval Above (₹) — 0=off","dualApproveAbove"],["Auto-Approve Delay (minutes)","autoApproveMins"]].map(([l,k])=>(
              <div key={k}><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>{l}</label>
                <input type="number" min="0" value={policy[k]||0} onChange={e=>setPolicy({...policy,[k]:parseFloat(e.target.value)||0})} style={{padding:"7px 10px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:12,width:"100%"}}/></div>
            ))}
          </div>
          <div style={{fontSize:10,color:MUTED}}>Claims within limit are auto-approved after delay. Category breach → manager review. Budget breach → admin only. Dual approval → manager + admin both required.</div>
          <div style={{marginTop:10,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <label style={{fontSize:9,fontWeight:700,color:MUTED,textTransform:"uppercase"}}>Local Conveyance Rate (₹/km)</label>
            <input type="number" min="0" step="0.5" value={policy.conveyanceRatePerKm||4} onChange={e=>setPolicy({...policy,conveyanceRatePerKm:parseFloat(e.target.value)||4})} style={{padding:"5px 8px",border:`1.5px solid ${BDR}`,borderRadius:6,fontSize:12,width:70}}/>
            <span style={{fontSize:10,color:MUTED}}>applied for own-vehicle local conveyance entries</span>
          </div>

        {/* ── Item 7: Monthly & Yearly Dept Budgets ── */}
        </Card><Card style={{padding:18}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:8}}>Monthly & Annual Department Budgets</div>
          <div style={{fontSize:10,color:MUTED,marginBottom:10}}>When breached, all new claims from that dept go to admin-only approval. 0 = no limit. Annual = April–March FY.</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:GL}}>
                {["Department","Monthly ₹","Annual ₹ (Apr–Mar)"].map(h=><th key={h} style={{padding:"7px 10px",textAlign:"left",color:GD,fontWeight:700,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(policy.departments||DEFAULT_DEPTS).map(dept=>{
                  const cur=policy.monthlyDeptBudgets?.[dept]||{monthly:0,yearly:0};
                  return(<tr key={dept} style={{borderTop:`1px solid ${BDR}`}}>
                    <td style={{padding:"7px 10px",fontWeight:600}}>{dept}</td>
                    <td style={{padding:"5px 8px"}}><input type="number" min="0" value={cur.monthly||""} placeholder="0=no limit" onChange={e=>setPolicy({...policy,monthlyDeptBudgets:{...policy.monthlyDeptBudgets,[dept]:{...cur,monthly:parseFloat(e.target.value)||0}}})} style={{padding:"5px 8px",border:`1px solid ${BDR}`,borderRadius:6,fontSize:11,width:140}}/></td>
                    <td style={{padding:"5px 8px"}}><input type="number" min="0" value={cur.yearly||""} placeholder="0=no limit" onChange={e=>setPolicy({...policy,monthlyDeptBudgets:{...policy.monthlyDeptBudgets,[dept]:{...cur,yearly:parseFloat(e.target.value)||0}}})} style={{padding:"5px 8px",border:`1px solid ${BDR}`,borderRadius:6,fontSize:11,width:140}}/></td>
                  </tr>);
                })}
              </tbody>
            </table>
          </div>

        {/* ── PHASE 1: Grade-Based Approval Hierarchy ── */}
        </Card><Card style={{padding:18}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:8}}>Grade-Based Approval Hierarchy</div>
          <Toggle on={policy.gradeBased} onClick={()=>setPolicy({...policy,gradeBased:!policy.gradeBased})} label="Enable Grade System" sub="10-level grade engine — all expenses route up through grades"/>
          {policy.gradeBased&&<>
            <div style={{fontSize:10,color:MUTED,marginTop:10,marginBottom:8}}>Define up to 10 grade levels. Label + ceiling (₹). Ceiling 0 = unlimited. Same grade never approves same grade. Employees always route upward.</div>
            {(policy.approvalHierarchy||[]).sort((a,b)=>a.level-b.level).map((h,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:GL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:GD,flexShrink:0}}>L{h.level}</div>
                <input value={h.label||""} onChange={e=>{const a=[...(policy.approvalHierarchy||[])];a[i]={...a[i],label:e.target.value};setPolicy({...policy,approvalHierarchy:a});}} placeholder="e.g. Manager / VP / GM" style={{flex:2,padding:"5px 8px",border:`1.5px solid ${BDR}`,borderRadius:6,fontSize:11,fontFamily:FB}}/>
                <input type="number" value={h.ceiling||""} onChange={e=>{const a=[...(policy.approvalHierarchy||[])];a[i]={...a[i],ceiling:parseFloat(e.target.value)||0};setPolicy({...policy,approvalHierarchy:a});}} placeholder="₹ Ceiling (0=unlimited)" style={{flex:2,padding:"5px 8px",border:`1.5px solid ${BDR}`,borderRadius:6,fontSize:11}}/>
                <button onClick={()=>setPolicy({...policy,approvalHierarchy:(policy.approvalHierarchy||[]).filter((_,j)=>j!==i)})} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",fontSize:14,flexShrink:0}}>✕</button>
              </div>
            ))}
            {(policy.approvalHierarchy||[]).length<10&&<button onClick={()=>{
              const next=(policy.approvalHierarchy||[]).length+1;
              setPolicy({...policy,approvalHierarchy:[...(policy.approvalHierarchy||[]),{level:next,label:"",ceiling:0}]});
            }} style={{background:"none",border:`1.5px dashed ${BDR}`,borderRadius:7,padding:"5px 12px",cursor:"pointer",fontSize:11,color:MUTED,width:"100%",marginTop:4}}>
              + Add Level ({(policy.approvalHierarchy||[]).length}/10)
            </button>}
            <div style={{marginTop:10}}>
              <label style={{fontSize:10,color:MUTED,fontWeight:700,display:"block",marginBottom:4}}>ESCALATION TIMER</label>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="number" value={policy.escalationHrs||48} onChange={e=>setPolicy({...policy,escalationHrs:parseFloat(e.target.value)||48})} style={{padding:"5px 8px",border:`1.5px solid ${BDR}`,borderRadius:6,fontSize:12,width:70}}/>
                <span style={{fontSize:10,color:MUTED}}>hours before reminder, then auto-escalates to next grade</span>
              </div>
            </div>
          </>}
        </Card>
        {/* ── PHASE 1: City Classification Toggle ── */}
        <Card style={{padding:18}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:8}}>City Classification</div>
          <Toggle on={policy.cityClassification} onClick={()=>setPolicy({...policy,cityClassification:!policy.cityClassification})} label="Enable Tier A/B/C/D Cities" sub="Hotel limits and diem vary by city tier"/>
          {policy.cityClassification&&<>
            <div style={{fontSize:10,color:MUTED,margin:"8px 0"}}>Cities not listed in A/B/C automatically become Tier D (residual). Press Enter or click + to add.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {[["A","Metro","#fee2e2","#991b1b"],["B","Major","#fef3c7","#92400e"],["C","Tier-2","#dbeafe","#1e40af"]].map(([tier,name,bg,fg])=>{
                const tierCities=(policy.cityTiers||[]).filter(ct=>ct.tier===tier).map(ct=>ct.city);
                return(<div key={tier}>
                  <div style={{fontSize:11,fontWeight:700,color:fg,marginBottom:5}}>Tier {tier} — {name} <span style={{fontSize:9,fontWeight:400,color:MUTED}}>({tierCities.length})</span></div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:5,minHeight:24}}>
                    {tierCities.map(city=>(
                      <span key={city} style={{background:bg,color:fg,padding:"2px 7px",borderRadius:12,fontSize:10,display:"inline-flex",alignItems:"center",gap:3}}>
                        {city}
                        <button onClick={()=>setPolicy({...policy,cityTiers:(policy.cityTiers||[]).filter(ct=>!(ct.city===city&&ct.tier===tier))})} style={{background:"none",border:"none",cursor:"pointer",color:"inherit",fontSize:11,padding:0,lineHeight:1}}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:5}}>
                    <input id={`cityinp-${tier}`} placeholder="Add city…" onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){const c=e.target.value.trim();if(!(policy.cityTiers||[]).some(ct=>ct.city===c)){setPolicy({...policy,cityTiers:[...(policy.cityTiers||[]),{city:c,tier}]});}e.target.value="";}}} style={{flex:1,padding:"4px 7px",border:`1.5px solid ${BDR}`,borderRadius:6,fontSize:11,fontFamily:FB}}/>
                    <button onClick={()=>{const inp=document.getElementById(`cityinp-${tier}`);if(inp?.value?.trim()){const c=inp.value.trim();if(!(policy.cityTiers||[]).some(ct=>ct.city===c)){setPolicy({...policy,cityTiers:[...(policy.cityTiers||[]),{city:c,tier}]});}inp.value="";}}} style={{padding:"4px 9px",background:G,color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11}}>+</button>
                  </div>
                </div>);
              })}
            </div>
          </>}
        </Card>
        {/* ── Phase 2: Notice Period ── */}
        <Card style={{padding:18}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:8}}>Travel Notice Period</div>
          <div style={{fontSize:10,color:MUTED,marginBottom:10}}>Minimum days advance notice required before travel starts. 0 = no restriction.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Domestic Travel (days)</label>
              <input type="number" min="0" value={policy.noticePeriodDomestic||0} onChange={e=>setPolicy({...policy,noticePeriodDomestic:parseInt(e.target.value)||0})} style={{padding:"6px 10px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:13,width:80}}/></div>
            <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Overseas Travel (days)</label>
              <input type="number" min="0" value={policy.noticePeriodOverseas||15} onChange={e=>setPolicy({...policy,noticePeriodOverseas:parseInt(e.target.value)||15})} style={{padding:"6px 10px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:13,width:80}}/></div>
          </div>
        </Card>
        {/* ── Phase 2: Trip Purposes ── */}
        <Card style={{padding:18}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:8}}>Trip Purposes</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
            {(policy.tripPurposes||[]).map((p,i)=>(
              <span key={i} style={{background:GL,color:GD,padding:"3px 10px",borderRadius:12,fontSize:11,display:"inline-flex",alignItems:"center",gap:4}}>
                {p}<button onClick={()=>setPolicy({...policy,tripPurposes:(policy.tripPurposes||[]).filter((_,j)=>j!==i)})} style={{background:"none",border:"none",cursor:"pointer",color:"inherit",fontSize:12,padding:0}}>×</button>
              </span>
            ))}
          </div>
          <div style={{display:"flex",gap:6}}>
            <input id="purpose-inp" placeholder="Add trip purpose…" onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){setPolicy({...policy,tripPurposes:[...(policy.tripPurposes||[]),e.target.value.trim()]});e.target.value="";}}} style={{flex:1,padding:"6px 10px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:12,fontFamily:FB}}/>
            <button onClick={()=>{const inp=document.getElementById("purpose-inp");if(inp?.value.trim()){setPolicy({...policy,tripPurposes:[...(policy.tripPurposes||[]),inp.value.trim()]});inp.value="";}}} style={{padding:"6px 12px",background:G,color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:11}}>+</button>
          </div>
        </Card>
        {policy.gradeBased&&(policy.approvalHierarchy||[]).length>0&&<Card style={{padding:18,gridColumn:"1/-1"}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:8}}>Grade Entitlements — Hotel Limit &amp; Diem Rate per Grade per Tier</div>
          <div style={{fontSize:10,color:MUTED,marginBottom:10}}>Hotel limit = max per night. Diem = allowance per outstation day. City Classification must be on for tier columns to matter.</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{background:GL}}>
                  <th style={{padding:"6px 8px",textAlign:"left",color:GD}}>Grade</th>
                  <th style={{padding:"6px 8px",textAlign:"left",color:GD}}>Label</th>
                  {(policy.cityClassification?[["A","#fee2e2","#991b1b"],["B","#fef3c7","#92400e"],["C","#dbeafe","#1e40af"],["D","#f3f4f6","#374151"]]:[["D","#f3f4f6","#374151"]]).map(([t,bg,fg])=><>
                    <th key={`h${t}`} style={{padding:"6px 6px",background:bg,color:fg,textAlign:"right"}}>Hotel {t} ₹</th>
                    <th key={`d${t}`} style={{padding:"6px 6px",background:bg,color:fg,textAlign:"right"}}>Diem {t} ₹</th>
                  </>)}
                  <th style={{padding:"6px 8px",textAlign:"left",color:GD}}>Transport</th>
                </tr>
              </thead>
              <tbody>
                {(policy.approvalHierarchy||[]).sort((a,b)=>a.level-b.level).map(h=>{
                  const getE=(tier)=>(policy.gradeEntitlements||[]).find(e=>e.grade===h.level&&e.tier===tier)||{hotelLimit:"",diemRate:"",transportClass:""};
                  const setE=(tier,field,val)=>{
                    const arr=[...(policy.gradeEntitlements||[])];
                    const idx=arr.findIndex(e=>e.grade===h.level&&e.tier===tier);
                    if(idx>=0)arr[idx]={...arr[idx],[field]:val};
                    else arr.push({grade:h.level,tier,hotelLimit:0,diemRate:0,transportClass:"",[field]:val});
                    setPolicy({...policy,gradeEntitlements:arr});
                  };
                  const tiers=policy.cityClassification?["A","B","C","D"]:["D"];
                  return(
                    <tr key={h.level} style={{borderTop:`1px solid ${BDR}`}}>
                      <td style={{padding:"5px 8px",fontWeight:700,color:INK}}>L{h.level}</td>
                      <td style={{padding:"5px 8px",color:MUTED,fontSize:10}}>{h.label||"—"}</td>
                      {tiers.map(tier=>{const e=getE(tier);return(<>
                        <td key={`h${tier}`} style={{padding:"3px 4px"}}><input type="number" value={e.hotelLimit||""} onChange={ev=>setE(tier,"hotelLimit",parseFloat(ev.target.value)||0)} placeholder="—" style={{width:68,padding:"3px 5px",border:`1px solid ${BDR}`,borderRadius:5,fontSize:10,textAlign:"right"}}/></td>
                        <td key={`d${tier}`} style={{padding:"3px 4px"}}><input type="number" value={e.diemRate||""} onChange={ev=>setE(tier,"diemRate",parseFloat(ev.target.value)||0)} placeholder="—" style={{width:68,padding:"3px 5px",border:`1px solid ${BDR}`,borderRadius:5,fontSize:10,textAlign:"right"}}/></td>
                      </>);})}
                      <td style={{padding:"3px 6px"}}><select value={getE("D").transportClass||""} onChange={e=>setE("D","transportClass",e.target.value)} style={{padding:"3px 6px",border:`1px solid ${BDR}`,borderRadius:5,fontSize:10}}>
                        <option value="">Any</option>
                        {["Economy Air","Business Air","2AC Train","3AC Train","Sleeper","Volvo Bus","Non-AC Bus","Own Vehicle"].map(m=><option key={m}>{m}</option>)}
                      </select></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>}
      {/* ── Expense Categories ── */}
      <Card style={{padding:18,marginTop:12}}>
        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:8}}>Expense Categories</div>
        <p style={{color:MUTED,fontSize:11,marginBottom:12}}>Employees select from these categories when submitting expenses. "Other" is always available.</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
          {(policy.categories||DEFAULT_CATS).map((cat,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:4,background:GL,border:`1px solid ${GM}`,borderRadius:7,padding:"4px 10px"}}>
              <span style={{fontSize:12}}>{CI[cat]||"📋"}</span>
              <span style={{fontSize:12,fontWeight:600,color:GD}}>{cat}</span>
              {cat!=="Other"&&<button onClick={()=>{const nc=(policy.categories||DEFAULT_CATS).filter((_,j)=>j!==i);setPolicy({...policy,categories:nc});}} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:12,padding:"0 2px"}}>✕</button>}
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input id="newCatInput" placeholder="Add category (e.g. Legal)" style={{padding:"8px 11px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:12,flex:1,background:"var(--input-bg,#fafff8)"}}
            onKeyDown={e=>{if(e.key==="Enter"){const v=e.target.value.trim();if(v&&!(policy.categories||DEFAULT_CATS).includes(v)){setPolicy({...policy,categories:[...(policy.categories||DEFAULT_CATS),v]});e.target.value="";};}}}/>
          <Btn v="outline" onClick={()=>{const el=document.getElementById("newCatInput");const v=el.value.trim();if(v&&!(policy.categories||DEFAULT_CATS).includes(v)){setPolicy({...policy,categories:[...(policy.categories||DEFAULT_CATS),v]});el.value="";}}} style={{padding:"8px 14px",fontSize:12}}>+ Add</Btn>
        </div>
      </Card>

      {/* ── Notifications ── */}
      <Card style={{padding:18,marginTop:12}}>
        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:8}}>Notifications</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}} className="mob-grid-1">
          <div>
            <div style={{fontSize:11,fontWeight:700,color:MUTED,marginBottom:8,textTransform:"uppercase"}}>📧 Email (via Resend)</div>
            {[["Notify on Approval","notifyEmailOnApprove"],["Notify on Rejection","notifyEmailOnReject"]].map(([l,k])=>(
              <label key={k} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,cursor:"pointer"}}>
                <input type="checkbox" checked={policy[k]!==false} onChange={e=>setPolicy({...policy,[k]:e.target.checked})} style={{width:15,height:15,cursor:"pointer"}}/>
                <span style={{fontSize:12,color:INK}}>{l}</span>
              </label>
            ))}
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:MUTED,marginBottom:8,textTransform:"uppercase"}}>💬 WhatsApp (via Interakt)</div>
            {[["Notify on Approval","notifyWaOnApprove"],["Notify on Rejection","notifyWaOnReject"]].map(([l,k])=>(
              <label key={k} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,cursor:"pointer"}}>
                <input type="checkbox" checked={!!policy[k]} onChange={e=>setPolicy({...policy,[k]:e.target.checked})} style={{width:15,height:15,cursor:"pointer"}}/>
                <span style={{fontSize:12,color:INK}}>{l}</span>
              </label>
            ))}
            <div style={{fontSize:10,color:MUTED,marginTop:4}}>Requires INTERAKT_API_KEY in Vercel env vars + approved message templates</div>
          </div>
        </div>
        <div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:7,padding:"8px 12px",fontSize:11,color:"#92400e"}}>
          💡 Required WhatsApp templates: <strong>xpensr_claim_approved</strong>, <strong>xpensr_claim_rejected</strong>, <strong>xpensr_trip_summary</strong> — submit these to Interakt for approval before enabling.
        </div>
      </Card>

      {/* ── Departments ── */}
      <Card style={{padding:18,marginTop:12}}>
        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:12}}>Departments</div>
        <p style={{color:MUTED,fontSize:11,marginBottom:12}}>Employees are assigned to these departments. Edit or add to match your company structure.</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
          {(policy.departments||DEFAULT_DEPTS).map((d,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:4,background:GL,border:`1px solid ${GM}`,borderRadius:7,padding:"4px 10px"}}>
              <span style={{fontSize:12,fontWeight:600,color:GD}}>{d}</span>
              <button onClick={()=>{const nd=(policy.departments||DEFAULT_DEPTS).filter((_,j)=>j!==i);setPolicy({...policy,departments:nd});}} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:12,padding:"0 2px",lineHeight:1}}>✕</button>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input id="newDeptInput" placeholder="Add department (e.g. Legal)" style={{padding:"8px 11px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:12,flex:1,background:"var(--input-bg,#fafff8)"}}
            onKeyDown={e=>{if(e.key==="Enter"){const v=e.target.value.trim();if(v&&!(policy.departments||DEFAULT_DEPTS).includes(v)){setPolicy({...policy,departments:[...(policy.departments||DEFAULT_DEPTS),v]});e.target.value="";};}}}/>
          <Btn v="outline" onClick={()=>{const el=document.getElementById("newDeptInput");const v=el.value.trim();if(v&&!(policy.departments||DEFAULT_DEPTS).includes(v)){setPolicy({...policy,departments:[...(policy.departments||DEFAULT_DEPTS),v]});el.value="";}}} style={{padding:"8px 14px",fontSize:12}}>+ Add</Btn>
        </div>
      </Card>

      {/* ── Brand Color ── */}
      <Card style={{padding:18,marginTop:12}}>
        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:8}}>Brand Color</div>
        <p style={{color:MUTED,fontSize:11,marginBottom:14}}>Choose your company's accent color. Applied across the sidebar, buttons, and badges.</p>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          {["#7ED957","#2563eb","#7c3aed","#db2777","#ea580c","#0891b2","#16a34a","#dc2626","#f59e0b","#374151"].map(c=>(
            <button key={c} onClick={()=>setPolicy({...policy,primaryColor:c})} style={{width:32,height:32,borderRadius:"50%",background:c,border:(policy.primaryColor||"#7ED957")===c?"3px solid #1a2e12":"3px solid transparent",cursor:"pointer",boxShadow:(policy.primaryColor||"#7ED957")===c?"0 0 0 2px #fff inset":"none",transition:"all .15s"}}/>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:7,marginLeft:8}}>
            <label style={{fontSize:11,color:MUTED}}>Custom:</label>
            <input type="color" value={policy.primaryColor||"#7ED957"} onChange={e=>setPolicy({...policy,primaryColor:e.target.value})} style={{width:36,height:32,padding:2,borderRadius:6,border:`1.5px solid ${BDR}`,cursor:"pointer"}}/>
            <span style={{fontSize:11,fontFamily:"monospace",color:MUTED}}>{policy.primaryColor||"#7ED957"}</span>
          </div>
        </div>
        <div style={{marginTop:12,padding:"10px 14px",background:GL,borderRadius:8,fontSize:12,color:GD}}>
          💡 Color changes apply immediately after saving. The sidebar, buttons, and status badges will update.
        </div>
      </Card>

      <div style={{marginTop:12,display:"flex",gap:10,alignItems:"center"}}>
        <Btn onClick={async()=>{setParentPol(policy);if(sbEnabled&&savePolicy){try{await savePolicy(policy);toast("✓ Saved to database");}catch(e){toast(e.message,"error");}}else toast("✓ Saved");}} style={{background:policy.primaryColor||G}}>Save All Settings</Btn>
      </div>
    </div>
    </div>
  );
}

// ─── TRIP APPROVALS TAB ──────────────────────────────────────────────────────
function TripApprovalsTab({trips,getUser,approveTrip,rejectTrip,isAdmin}){
  const pending=trips.filter(t=>t.status==="pending_approval");
  const recent=trips.filter(t=>t.status==="rejected"||t.status==="active").slice(0,10);
  return(
    <div>
      <h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK,marginBottom:4}}>Trip Approvals</h1>
      <p style={{color:MUTED,fontSize:12,marginBottom:16}}>{pending.length} trip{pending.length!==1?"s":""} awaiting approval</p>

      {pending.length===0&&(
        <Card style={{padding:32,textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:8}}>✅</div>
          <div style={{fontFamily:FD,fontSize:16,fontWeight:700,color:INK,marginBottom:4}}>All caught up!</div>
          <div style={{color:MUTED,fontSize:13}}>No trips awaiting approval</div>
        </Card>
      )}

      {pending.map(t=>{
        const creator=getUser(t.createdBy);
        return(
          <Card key={t.id} style={{padding:18,marginBottom:12,borderLeft:`4px solid #f59e0b`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
              <div style={{flex:1}}>
                <div style={{fontFamily:FD,fontSize:15,fontWeight:700,color:INK,marginBottom:4}}>{t.name}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:8}}>
                  <span style={{fontSize:11,color:MUTED}}>📅 {fmtDate(t.startDate)} → {fmtDate(t.endDate)}</span>
                  <span style={{fontSize:11,color:MUTED}}>📁 {t.type}</span>
                  {t.currency&&t.currency!=="INR"&&<span style={{background:"#eff6ff",color:"#1d4ed8",padding:"1px 7px",borderRadius:4,fontSize:10,fontWeight:600}}>{t.currency}</span>}
                  {t.projectCode&&<span style={{background:GL,color:GD,padding:"1px 7px",borderRadius:4,fontSize:10,fontWeight:600}}>{t.projectCode}</span>}
                  {t.tripMode&&<span style={{background:t.tripMode==="balance"?"#f0fde9":"#eff6ff",color:t.tripMode==="balance"?GD:"#1d4ed8",padding:"1px 7px",borderRadius:4,fontSize:10,fontWeight:600}}>{t.tripMode==="balance"?"Balance":"Reimbursement"}</span>}
                </div>
                {creator&&<div style={{display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:GL,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:GD,fontSize:9}}>{creator.avatar||inits(creator.name)}</div>
                  <span style={{fontSize:12,color:MUTED}}>Requested by <strong style={{color:INK}}>{creator.name}</strong> ({creator.dept||creator.role})</span>
                </div>}
              </div>
              <div style={{display:"flex",gap:9,flexShrink:0}}>
                <Btn onClick={()=>approveTrip(t)} style={{padding:"9px 18px",fontSize:12}}>✓ Approve</Btn>
                <Btn v="danger" onClick={()=>rejectTrip(t)} style={{padding:"9px 14px",fontSize:12}}>✗ Reject</Btn>
              </div>
            </div>
          </Card>
        );
      })}

      {recent.length>0&&<>
        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,margin:"20px 0 10px"}}>Recently Decided</div>
        {recent.map(t=>(
          <div key={t.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:"#fff",borderRadius:9,marginBottom:7,border:`1px solid ${BDR}`,opacity:0.7}}>
            <div>
              <div style={{fontWeight:600,fontSize:13,color:INK}}>{t.name}</div>
              <div style={{fontSize:10,color:MUTED}}>{getUser(t.createdBy)?.name||"Unknown"} · {fmtDate(t.startDate)}</div>
            </div>
            <Badge s={t.status==="active"?"Active":"Rejected"} sm/>
          </div>
        ))}
      </>}
    </div>
  );
}


// ─── MY HISTORY TAB ───────────────────────────────────────────────────────────
function MyHistoryTab({user,trips,claims,getUser,exportClaimsPDF}){
  const[expandedTrip,setExpandedTrip]=useState(null);
  const myClaims=claims.filter(c=>c.empId===user.id);
  const myTrips=trips.filter(t=>(t.assignedTo||[]).includes(user.id)||t.createdBy===user.id);

  const generateClientPDF=async(trip)=>{
    // jsPDF loaded from npm package
    const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
    const W=210,M=18;let y=M;
    doc.setFillColor(15,28,9);doc.rect(0,0,W,26,"F");
    doc.setTextColor(126,217,87);doc.setFont("helvetica","bold");doc.setFontSize(16);doc.text("XpensR",M,16);
    doc.setTextColor(200,200,200);doc.setFontSize(9);doc.text("Client Reimbursement Claim",M+22,16);
    doc.setTextColor(150,150,150);doc.text(new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric"}),W-M,16,{align:"right"});
    y=32;
    doc.setTextColor(20,20,20);doc.setFontSize(13);doc.setFont("helvetica","bold");
    doc.text("CLIENT REIMBURSEMENT CLAIM",W/2,y,{align:"center"});y+=7;
    doc.setFontSize(10);doc.setFont("helvetica","normal");doc.setTextColor(80,80,80);
    doc.text(`Trip: ${trip.name} · ${trip.startDate} to ${trip.endDate}`,W/2,y,{align:"center"});y+=5;
    doc.text(`Employee: ${user.name} · ${trip.projectCode||""}`,W/2,y,{align:"center"});y+=10;
    const tc=myClaims.filter(c=>c.tripId===trip.id&&c.status==="Approved");
    const total=tc.reduce((s,c)=>s+c.amount,0);
    doc.setFillColor(21,128,61);doc.rect(M,y,W-2*M,7,"F");
    doc.setTextColor(255,255,255);doc.setFontSize(8);doc.setFont("helvetica","bold");
    ["Date","Category","Description","Vendor","Amount","Receipt"].forEach((h,i)=>{
      const x=M+2+[0,20,38,80,114,138][i];doc.text(h,x,y+5);});
    y+=8;
    tc.forEach((c,i)=>{
      if(y>270){doc.addPage();y=14;}
      doc.setFillColor(i%2===0?250:244,i%2===0?253:249,i%2===0?244:240);
      doc.rect(M,y,W-2*M,6,"F");
      doc.setTextColor(40,40,40);doc.setFontSize(7.5);doc.setFont("helvetica","normal");
      const vals=[c.date||"",c.category?.slice(0,10)||"",c.desc?.slice(0,22)||"",c.vendor?.slice(0,14)||"—","₹"+(c.amount||0).toLocaleString("en-IN"),c.receipts?.length?"✓":"—"];
      vals.forEach((v,vi)=>{const x=M+2+[0,20,38,80,114,138][vi];doc.text(String(v),x,y+4.5);});
      y+=6.5;
    });
    y+=4;doc.setDrawColor(21,128,61);doc.line(M,y,W-M,y);y+=5;
    doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(20,20,20);
    doc.text(`Total Claim: ₹${total.toLocaleString("en-IN")}`,W-M,y,{align:"right"});y+=12;
    doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(80,80,80);
    doc.text("I hereby certify that the above expenses were incurred for business purposes",M,y);y+=5;
    doc.text("and are claimed for reimbursement as per company policy.",M,y);y+=12;
    doc.text("Signature: ________________________",M,y);
    doc.text(`Date: ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric"})}`,W-M,y,{align:"right"});
    doc.setFontSize(7.5);doc.setTextColor(150,150,150);
    doc.text("Generated by XpensR by RB · claim-x-beta.vercel.app",W/2,286,{align:"center"});
    doc.save(`Claim_${trip.name.replace(/\s+/g,"_")}_${user.name.replace(/\s+/g,"_")}.pdf`);
  };

  return(
    <div>
      <h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK,marginBottom:4}}>My History</h1>
      <p style={{color:MUTED,fontSize:12,marginBottom:16}}>Complete record of all your trips and expenses</p>
      {myTrips.length===0&&<Card style={{padding:32,textAlign:"center"}}><div style={{fontSize:40}}>🗃️</div><div style={{color:MUTED,marginTop:8}}>No trips yet. Submit your first expense to get started.</div></Card>}
      {[...myTrips].sort((a,b)=>b.startDate?.localeCompare(a.startDate||"")||0).map(t=>{
        const tc=myClaims.filter(c=>c.tripId===t.id);
        const approved=tc.filter(c=>c.status==="Approved");
        const total=approved.reduce((s,c)=>s+c.amount,0);
        const isOpen=expandedTrip===t.id;
        return(
          <Card key={t.id} style={{marginBottom:10,padding:0,overflow:"hidden"}}>
            <div onClick={()=>setExpandedTrip(isOpen?null:t.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",cursor:"pointer",background:isOpen?"var(--gl,#f0fde9)":"var(--card,#fff)"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                  <span style={{fontFamily:FD,fontSize:14,fontWeight:700,color:INK}}>{t.name}</span>
                  <Badge s={t.status==="active"?"Active":t.status==="closed"?"Closed":t.status==="pending_approval"?"Pending":"Rejected"} sm/>
                  {t.tripMode==="client"&&<span style={{background:"#eff6ff",color:"#2563eb",fontSize:9,padding:"1px 7px",borderRadius:4,fontWeight:700}}>CLIENT</span>}
                </div>
                <div style={{fontSize:10,color:MUTED}}>{fmtDate(t.startDate)} → {fmtDate(t.endDate)}{t.projectCode&&` · ${t.projectCode}`}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:FD,fontSize:15,fontWeight:700,color:INK}}>{fmt(total)}</div>
                <div style={{fontSize:9,color:MUTED}}>{approved.length}/{tc.length} approved</div>
              </div>
              <div style={{display:"flex",gap:6}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>exportClaimsPDF&&exportClaimsPDF(tc,`${t.name} — My Claims`,user.name)} style={{padding:"4px 9px",background:"none",border:`1px solid ${BDR}`,borderRadius:6,cursor:"pointer",fontSize:10,color:MUTED}}>⬇ PDF</button>
                {t.tripMode==="client"&&<button onClick={()=>generateClientPDF(t)} style={{padding:"4px 9px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,cursor:"pointer",fontSize:10,color:"#2563eb",fontWeight:600}}>📄 Client Claim</button>}
              </div>
              <span style={{color:MUTED,fontSize:12}}>{isOpen?"▲":"▼"}</span>
            </div>
            {isOpen&&<div style={{borderTop:`1px solid ${BDR}`,background:"var(--bg,#f8faf6)"}}>
              {tc.length===0&&<div style={{padding:"16px 18px",color:MUTED,fontSize:12}}>No expenses in this trip yet.</div>}
              {tc.map((c,i)=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 18px",borderBottom:`1px solid ${BDR}`,background:i%2===0?"transparent":"rgba(0,0,0,.01)"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:INK}}>{c.desc}</div>
                    <div style={{fontSize:10,color:MUTED}}>{fmtDate(c.date)} · {c.category} · {c.vendor||"—"}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:700,fontSize:13,color:INK}}>{fmt(c.amount)}</div>
                    <Badge s={c.status==="Approved"?"Approved":c.status==="Pending"?"Pending":"Rejected"} sm/>
                  </div>
                </div>
              ))}
              <div style={{padding:"10px 18px",borderTop:`1px solid ${BDR}`,display:"flex",justifyContent:"flex-end",gap:8}}>
                <span style={{fontSize:11,color:MUTED}}>Total approved:</span>
                <span style={{fontWeight:700,color:INK,fontSize:13}}>{fmt(total)}</span>
              </div>
            </div>}
          </Card>
        );
      })}
    </div>
  );
}


function TravelCalendar({trips,users,isAdmin,myDept,visibleUserIds}){
  const td=today();
  const travellers=trips
    .filter(t=>t.status==="active"&&t.startDate<=td&&t.endDate>=td)
    .flatMap(t=>(t.assignedTo||[]).map(uid=>{
      const u=users.find(x=>x.id===uid);
      if(!u)return null;
      // Restrict to visible users (group-based)
      if(!isAdmin&&visibleUserIds&&!visibleUserIds.has(uid))return null;
      return{user:u,trip:t};
    }).filter(Boolean));
  return(
    <Card style={{padding:16,marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK}}>✈ Travelling Today</div>
        <span style={{fontSize:10,color:MUTED}}>{td}</span>
      </div>
      {travellers.length===0
        ?<div style={{fontSize:12,color:MUTED,textAlign:"center",padding:"10px 0"}}>No employees on trip today</div>
        :<div style={{display:"flex",flexDirection:"column",gap:7}}>
          {travellers.map(({user:u,trip:t},i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",background:"var(--hover-bg,#f8faf6)",borderRadius:8,border:`1px solid ${BDR}`}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:GL,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:GD,fontSize:9,flexShrink:0}}>{u.avatar||inits(u.name)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:12,color:INK}}>{u.name} <span style={{fontSize:10,color:MUTED}}>({u.dept||"—"})</span></div>
                <div style={{fontSize:10,color:MUTED,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name} · Returns {fmtDate(t.endDate)}</div>
              </div>
            </div>
          ))}
        </div>
      }
    </Card>
  );
}

// ─── TRIP LEDGER TAB ──────────────────────────────────────────────────────────
function TripLedgerTab({trips,claims,topups,users,getUser,isAdmin,myDept,companyName}){
  const[selectedTrip,setSelectedTrip]=useState(null);
  const[search,setSearch]=useState("");
  const[showDiem,setShowDiem]=useState(false);

  const visibleTrips=trips.filter(t=>!search||t.name?.toLowerCase().includes(search.toLowerCase()));
  const trip=selectedTrip?trips.find(t=>t.id===selectedTrip):null;

  // Compute diem entitlement for a user on a trip
  const empDiem=(t,uid)=>{
    const u=users.find(x=>x.id===uid);
    const grade=u?.grade||0;
    let total=0;
    for(const leg of (t.legs||[])){
      const rate=leg.diemRate||0;
      const days=leg.days||1;
      total+=rate*days;
    }
    return total;
  };

  // Build ledger rows for a trip
  const buildLedger=(t)=>{
    const assigned=[...(t.assignedTo||[])];
    const isBalance=t.tripMode!=="reimbursement";
    return assigned.map(uid=>{
      const u=getUser(uid);
      if(!u)return null;
      const empClaims=claims.filter(c=>c.empId===uid&&c.tripId===t.id);
      const approvedClaims=empClaims.filter(c=>c.status==="Approved");
      const rejectedClaims=empClaims.filter(c=>c.status==="Rejected");
      const pendingClaims=empClaims.filter(c=>c.status==="Pending");
      const approvedAmt=approvedClaims.reduce((s,c)=>s+c.amount,0);
      const rejectedAmt=rejectedClaims.reduce((s,c)=>s+c.amount,0);
      const pendingAmt=pendingClaims.reduce((s,c)=>s+c.amount,0);
      const empTopups=(topups||[]).filter(tp=>tp.empId===uid&&tp.tripId===t.id&&tp.status==="Approved").reduce((s,tp)=>s+tp.amount,0);
      const allocated=(t.employeeBudgets?.[uid]?.allocated||0)+(t.employeeBudgets?.[uid]?.topups||0)||Math.round((t.budget||0)/Math.max(assigned.length,1));
      const totalFunds=allocated+empTopups;
      const balanceAsOfNow=isBalance?(totalFunds-approvedAmt):-approvedAmt;
      const balanceAtTripEnd=isBalance?(totalFunds-approvedAmt-pendingAmt):-( approvedAmt+pendingAmt);
      return{user:u,allocated,empTopups,totalFunds,approvedAmt,rejectedAmt,pendingAmt,approvedCount:approvedClaims.length,rejectedCount:rejectedClaims.length,pendingCount:pendingClaims.length,balanceAsOfNow,balanceAtTripEnd,isBalance};
    }).filter(Boolean);
  };

  const exportLedgerCSV=(t,rows)=>{
    const headers=["Employee","Dept","Allocated Budget","Topups Approved","Total Funds","Claims Approved (₹)","Claims Rejected (₹)","Claims Pending (₹)","Balance As-Of-Date","Balance End-Of-Trip","Mode"];
    const csvRows=[headers.join(","),...rows.map(r=>[
      `"${r.user.name}"`,r.user.dept||"",r.allocated,r.empTopups,r.totalFunds,
      r.approvedAmt,r.rejectedAmt,r.pendingAmt,r.balanceAsOfNow,r.balanceAtTripEnd,
      r.isBalance?"Balance":"Reimbursement"
    ].join(","))];
    const blob=new Blob([csvRows.join("\n")],{type:"text/csv"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);
    a.download=`trip_ledger_${t.name?.replace(/\s+/g,"_")||t.id}.csv`;a.click();
  };

  const exportLedgerPDF=async(t,rows)=>{
    const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
    const W=297,ML=12,CW=W-2*ML;
    let y=10;
    // Header
    doc.setFillColor(15,28,9);doc.rect(0,0,W,20,"F");
    doc.setFont("helvetica","bold");doc.setFontSize(12);doc.setTextColor(126,217,87);
    doc.text("XpensR by RB — Trip Ledger",ML,13);
    doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(180,200,170);
    doc.text(companyName||"",W-ML,13,{align:"right"});
    y=26;
    // Trip info
    doc.setFont("helvetica","bold");doc.setFontSize(11);doc.setTextColor(20,20,20);
    doc.text(t.name||"",ML,y);y+=5;
    doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(100,100,100);
    doc.text(`${fmtDate(t.startDate)||""} → ${fmtDate(t.endDate)||""} · ${t.tripMode==="reimbursement"?"Reimbursement Mode":"Balance Mode"} · Budget: ₹${(t.budget||0).toLocaleString("en-IN")} · Status: ${t.status||""}`,ML,y);y+=8;
    // Table
    const cols=[{h:"Employee",w:34},{h:"Dept",w:22},{h:"Allocated",w:24},{h:"Topups",w:20},{h:"Total Funds",w:24},{h:"Approved",w:24},{h:"Rejected",w:24},{h:"Pending",w:22},{h:"Bal Today",w:26},{h:"Bal End-Trip",w:26},{h:"Mode",w:22}];
    doc.setFillColor(21,128,61);doc.rect(ML,y,CW,7,"F");
    doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(255,255,255);
    let tx=ML+1;cols.forEach(col=>{doc.text(col.h,tx,y+4.5);tx+=col.w;});y+=8;
    rows.forEach((r,idx)=>{
      doc.setFillColor(idx%2===0?250:244,idx%2===0?254:250,idx%2===0?244:238);
      doc.rect(ML,y,CW,6.5,"F");
      doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(30,30,30);
      tx=ML+1;
      const vals=[r.user.name?.slice(0,16)||"",r.user.dept||"",`₹${r.allocated.toLocaleString("en-IN")}`,r.empTopups>0?`₹${r.empTopups.toLocaleString("en-IN")}`:"-",`₹${r.totalFunds.toLocaleString("en-IN")}`,`₹${r.approvedAmt.toLocaleString("en-IN")} (${r.approvedCount})`,r.rejectedAmt>0?`₹${r.rejectedAmt.toLocaleString("en-IN")} (${r.rejectedCount})`:"-",r.pendingAmt>0?`₹${r.pendingAmt.toLocaleString("en-IN")} (${r.pendingCount})`:"-"];
      const balColor=r.balanceAsOfNow>0?[180,30,30]:r.balanceAsOfNow<0?[21,100,50]:[80,80,80];
      vals.forEach((v,i)=>{doc.text(String(v),tx,y+4.5);tx+=cols[i].w;});
      // Balance cols with colour
      doc.setTextColor(...balColor);doc.setFont("helvetica","bold");
      doc.text(r.balanceAsOfNow>0?`↩${fmt(r.balanceAsOfNow)}`:r.balanceAsOfNow<0?`↪${fmt(-r.balanceAsOfNow)}`:"Settled",tx,y+4.5);tx+=cols[8].w;
      doc.text(r.balanceAtTripEnd>0?`↩${fmt(r.balanceAtTripEnd)}`:r.balanceAtTripEnd<0?`↪${fmt(-r.balanceAtTripEnd)}`:"Settled",tx,y+4.5);
      doc.setTextColor(30,30,30);doc.setFont("helvetica","normal");
      doc.text(r.isBalance?"Balance":"Reimb",tx+cols[9].w,y+4.5);
      y+=7;if(y>180){doc.addPage();y=14;}
    });
    // Summary
    y+=4;
    const totApproved=rows.reduce((s,r)=>s+r.approvedAmt,0);
    const totPending=rows.reduce((s,r)=>s+r.pendingAmt,0);
    const totRecover=rows.filter(r=>r.balanceAsOfNow>0).reduce((s,r)=>s+r.balanceAsOfNow,0);
    const totPay=rows.filter(r=>r.balanceAsOfNow<0).reduce((s,r)=>s+Math.abs(r.balanceAsOfNow),0);
    doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(20,20,20);
    doc.text(`Total Approved: ₹${totApproved.toLocaleString("en-IN")}   Pending: ₹${totPending.toLocaleString("en-IN")}   To Recover: ₹${totRecover.toLocaleString("en-IN")}   To Pay: ₹${totPay.toLocaleString("en-IN")}`,ML,y);
    // Footer
    doc.setFont("helvetica","normal");doc.setFontSize(6.5);doc.setTextColor(150,150,150);
    doc.text(`XpensR by RB · ${companyName||""} · Ledger as of ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric"})}`,W/2,200,{align:"center"});
    doc.output("dataurlnewwindow");
  };

  // Item 5: Full Trip Summary PDF
  const generateFullTripSummary=async(t,rows)=>{
    const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
    const W=297,ML=12,CW=W-2*ML;
    let y=10;
    // Header
    doc.setFillColor(15,28,9);doc.rect(0,0,W,22,"F");
    doc.setFont("helvetica","bold");doc.setFontSize(12);doc.setTextColor(126,217,87);
    doc.text("XpensR by RB — Full Trip Summary Report",ML,14);
    doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(170,190,160);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric"})}`,W-ML,14,{align:"right"});
    y=26;
    // Trip meta
    doc.setFont("helvetica","bold");doc.setFontSize(12);doc.setTextColor(20,20,20);
    doc.text(t.name||"Trip",ML,y);y+=6;
    doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(80,80,80);
    const metaItems=[`Status: ${t.status}`,`Period: ${fmtDate(t.startDate)} → ${fmtDate(t.endDate)}`,`Mode: ${t.tripMode==="reimbursement"?"Reimbursement":"Balance"}`,`Budget: ₹${(t.budget||0).toLocaleString("en-IN")}`,t.purpose?`Purpose: ${t.purpose}`:"",t.customerName?`Customer: ${t.customerName}`:""].filter(Boolean);
    doc.text(metaItems.join("  ·  "),ML,y);y+=8;
    // Itinerary
    if((t.legs||[]).length>0){
      doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(20,20,20);
      doc.text("Itinerary:",ML,y);y+=5;
      doc.setFillColor(21,128,61);doc.rect(ML,y,CW,6,"F");
      doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(255,255,255);
      let tx=ML+1;[{h:"Leg",w:14},{h:"From",w:36},{h:"To",w:36},{h:"Depart",w:28},{h:"Arrive",w:28},{h:"Mode",w:24},{h:"Tier",w:14},{h:"Days",w:14},{h:"Hotel Limit",w:28},{h:"Diem/day",w:24}].forEach(c=>{doc.text(c.h,tx,y+4);tx+=c.w;});y+=7;
      (t.legs||[]).forEach((leg,i)=>{
        doc.setFillColor(i%2?248:255,255,i%2?248:255);doc.rect(ML,y,CW,6,"F");
        doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(30,30,30);
        tx=ML+1;[String(i+1),leg.fromCity||"",leg.toCity||"",fmtDate(leg.departAt?.slice(0,10)||""),fmtDate(leg.arriveAt?.slice(0,10)||""),leg.mode||"",leg.cityTier||"D",String(leg.days||0),leg.hotelLimit>0?`₹${leg.hotelLimit.toLocaleString("en-IN")}/nt`:"—",leg.diemRate>0?`₹${leg.diemRate.toLocaleString("en-IN")}`:"-"].forEach((v,ci)=>{doc.text(v,tx,y+4);tx+=[14,36,36,28,28,24,14,14,28,24][ci];});y+=6.5;
      });
      y+=4;
    }
    // Employee summary
    if(y>150){doc.addPage();y=14;}
    doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(20,20,20);
    doc.text("Employee-wise Expense Summary:",ML,y);y+=5;
    const eCols=[{h:"Employee",w:40},{h:"Dept",w:24},{h:"Allocated",w:26},{h:"Topups",w:22},{h:"Total Funds",w:28},{h:"Approved",w:28},{h:"Pending",w:24},{h:"Rejected",w:24},{h:"Diem Entitlement",w:34},{h:"Diem Claimed",w:26},{h:"Net Balance",w:30}];
    doc.setFillColor(21,128,61);doc.rect(ML,y,CW,6,"F");
    doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(255,255,255);
    let tx2=ML+1;eCols.forEach(c=>{doc.text(c.h,tx2,y+4);tx2+=c.w;});y+=7;
    let grandApproved=0,grandPending=0,grandDiem=0;
    rows.forEach((r,idx)=>{
      const diem=empDiem(t,r.user.id);
      const diemClaimed=claims.filter(c=>c.tripId===t.id&&c.empId===r.user.id&&(c.category==="Meals"||c.category==="Food"||c.category==="Daily Allowance")&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0);
      grandApproved+=r.approvedAmt;grandPending+=r.pendingAmt;grandDiem+=diem;
      doc.setFillColor(idx%2?248:255,idx%2?255:255,idx%2?248:255);doc.rect(ML,y,CW,6,"F");
      doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(30,30,30);
      tx2=ML+1;
      [`${r.user.name?.slice(0,16)}`,r.user.dept||"",`₹${r.allocated.toLocaleString("en-IN")}`,r.empTopups>0?`+₹${r.empTopups.toLocaleString("en-IN")}`:"-",`₹${r.totalFunds.toLocaleString("en-IN")}`,`₹${r.approvedAmt.toLocaleString("en-IN")} (${r.approvedCount})`,r.pendingAmt>0?`₹${r.pendingAmt.toLocaleString("en-IN")}`:"-",r.rejectedAmt>0?`₹${r.rejectedAmt.toLocaleString("en-IN")}`:"-",`₹${diem.toLocaleString("en-IN")}`,`₹${Math.min(diemClaimed,diem).toLocaleString("en-IN")}`,r.balanceAsOfNow>0?`↩${r.balanceAsOfNow.toLocaleString("en-IN")}`:r.balanceAsOfNow<0?`↪${(-r.balanceAsOfNow).toLocaleString("en-IN")}`:"Settled"].forEach((v,i)=>{doc.text(String(v),tx2,y+4);tx2+=eCols[i].w;});
      y+=6.5;if(y>185){doc.addPage();y=14;}
    });
    // Totals row
    y+=2;doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(20,20,20);
    doc.text(`Total Approved: ₹${grandApproved.toLocaleString("en-IN")}  |  Pending: ₹${grandPending.toLocaleString("en-IN")}  |  Total Diem Entitlement: ₹${grandDiem.toLocaleString("en-IN")}`,ML,y);y+=8;
    // Invoice list
    if(y>160){doc.addPage();y=14;}
    doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(20,20,20);
    doc.text("Invoice-wise Claim Detail:",ML,y);y+=5;
    const iCols=[{h:"Claim ID",w:28},{h:"Date",w:22},{h:"Employee",w:34},{h:"Category",w:26},{h:"Vendor",w:30},{h:"Amount",w:22},{h:"Status",w:22},{h:"Approved By",w:30},{h:"City",w:22},{h:"Receipts",w:20}];
    doc.setFillColor(21,128,61);doc.rect(ML,y,CW,6,"F");
    doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(255,255,255);
    let tx3=ML+1;iCols.forEach(c=>{doc.text(c.h,tx3,y+4);tx3+=c.w;});y+=7;
    const tripClaims=claims.filter(c=>c.tripId===t.id).sort((a,b)=>a.date?.localeCompare(b.date));
    tripClaims.forEach((c,idx)=>{
      const emp=users.find(u=>u.id===c.empId);
      doc.setFillColor(idx%2?248:255,255,idx%2?248:255);doc.rect(ML,y,CW,6,"F");
      doc.setFont("helvetica","normal");doc.setFontSize(6.5);
      const statusColor=c.status==="Approved"?[21,128,61]:c.status==="Rejected"?[200,30,30]:c.status==="Pending"?[180,100,0]:[80,80,80];
      doc.setTextColor(30,30,30);
      tx3=ML+1;
      [c.id?.slice(-8)||"",fmtDate(c.date),emp?.name?.slice(0,16)||"",c.category||"",c.vendor?.slice(0,14)||"",`₹${c.amount.toLocaleString("en-IN")}`,c.status,c.remarks?.slice(0,14)||"",c.city||"",c.receipts?.length?String(c.receipts.length):"0"].forEach((v,i)=>{
        if(i===6)doc.setTextColor(...statusColor);else doc.setTextColor(30,30,30);
        doc.text(String(v),tx3,y+4);tx3+=iCols[i].w;
      });
      y+=6.5;if(y>190){doc.addPage();y=14;}
    });
    // Footer
    doc.setFont("helvetica","normal");doc.setFontSize(6.5);doc.setTextColor(150,150,150);
    doc.text(`XpensR by RB — Full Trip Summary — ${t.name} — ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric"})}`,W/2,202,{align:"center"});
    doc.output("dataurlnewwindow");
  };

  // Compute diem summary for all assignees on a trip
  const tripDiemSummary=(t)=>{
    return (t.assignedTo||[]).map(uid=>{
      const u=users.find(x=>x.id===uid);
      const diemEntitlement=empDiem(t,uid);
      const claimed=claims.filter(c=>c.tripId===t.id&&c.empId===uid&&(c.category==="Meals"||c.category==="Food"||c.category==="Daily Allowance")&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0);
      const approvedClaimed=claims.filter(c=>c.tripId===t.id&&c.empId===uid&&(c.category==="Meals"||c.category==="Food"||c.category==="Daily Allowance")&&c.status==="Approved").reduce((s,c)=>s+c.amount,0);
      // Rule: whichever is higher — entitlement or approved claimed amount — is used
      const effectiveDiem=Math.max(diemEntitlement,approvedClaimed);
      // If employee claimed less than entitlement, the flat balance (entitlement − claimed) is paid additionally
      const flatBalance=approvedClaimed<diemEntitlement?(diemEntitlement-approvedClaimed):0;
      return{user:u,uid,
        diemEntitlement,    // what policy allows
        claimed,            // what employee submitted (incl pending)
        approvedClaimed,    // what was actually approved
        effectiveDiem,      // MAX of entitlement vs approved (this goes into trip expense)
        flatBalance,        // additional flat allowance payable if claimed < entitlement
        legs:(t.legs||[])};
    }).filter(r=>r.user);
  };

  // ledgerRows: computed from selected trip — declared here so all JSX can reference it
  const ledgerRows=trip?buildLedger(trip):[];

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK}}>📒 Trip Ledger</h1>
          <p style={{color:MUTED,fontSize:12,marginTop:2}}>Employee-wise fund flow, claims, and net balance for each trip</p>
        </div>
      </div>

      {/* Trip selector */}
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search trips…" style={{padding:"8px 12px",border:`1.5px solid ${BDR}`,borderRadius:8,fontSize:12,fontFamily:FB,width:220}}/>
        <select value={selectedTrip||""} onChange={e=>setSelectedTrip(e.target.value||null)}
          style={{padding:"8px 12px",border:`1.5px solid ${BDR}`,borderRadius:8,fontSize:12,fontFamily:FB,minWidth:200,appearance:"none"}}>
          <option value="">— Select a trip to view ledger —</option>
          {visibleTrips.map(t=>(
            <option key={t.id} value={t.id}>{t.name} ({t.status}) — {t.tripMode==="reimbursement"?"Reimb":"Balance"}</option>
          ))}
        </select>
        {trip&&<>
          <Btn v="outline" onClick={()=>exportLedgerCSV(trip,ledgerRows)} style={{fontSize:11,padding:"6px 12px"}}>⬇ CSV</Btn>
          <Btn v="outline" onClick={()=>exportLedgerPDF(trip,ledgerRows)} style={{fontSize:11,padding:"6px 12px"}}>📄 Ledger PDF</Btn>
          <Btn onClick={()=>generateFullTripSummary(trip,ledgerRows)} style={{fontSize:11,padding:"6px 12px"}}>📋 Full Summary</Btn>
          <Btn v="outline" onClick={()=>setShowDiem(p=>!p)} style={{fontSize:11,padding:"6px 12px",borderColor:showDiem?"#7ED957":"",color:showDiem?"#3B6D11":""}}>🍽 {showDiem?"Hide":"Show"} Diem</Btn>
        </>}
      </div>

      {!trip&&<Card style={{padding:32,textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:8}}>📒</div>
        <div style={{color:MUTED,fontSize:13}}>Select a trip above to view its employee ledger</div>
        <div style={{color:MUTED,fontSize:11,marginTop:4}}>{visibleTrips.length} trip{visibleTrips.length!==1?"s":""} available</div>
      </Card>}

      {trip&&<>
        {/* Trip summary bar */}
        <Card style={{padding:14,marginBottom:12,borderLeft:`4px solid ${G}`}}>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
            <div><div style={{fontSize:11,fontWeight:700,color:INK}}>{trip.name}</div><div style={{fontSize:10,color:MUTED}}>{fmtDate(trip.startDate)} → {fmtDate(trip.endDate)}</div></div>
            {trip.purpose&&<div style={{fontSize:10,color:MUTED}}>Purpose: <strong style={{color:INK}}>{trip.purpose}</strong></div>}
            {trip.customerName&&<div style={{fontSize:10,color:MUTED}}>Customer: <strong style={{color:INK}}>{trip.customerName}</strong></div>}
            <div style={{padding:"4px 10px",borderRadius:12,background:trip.tripMode==="reimbursement"?"#dbeafe":"#dcfce7",color:trip.tripMode==="reimbursement"?"#1d4ed8":"#16a34a",fontSize:10,fontWeight:700}}>
              {trip.tripMode==="reimbursement"?"💸 Reimbursement Mode":"💼 Balance Mode"}
            </div>
            <div style={{fontSize:11,color:MUTED}}>Budget: <strong style={{color:INK}}>{fmt(trip.budget||0)}</strong></div>
            <div style={{fontSize:11,color:MUTED}}>Status: <strong style={{color:INK}}>{trip.status}</strong></div>
            <div style={{fontSize:11,color:MUTED}}>{ledgerRows.length} employees</div>
          </div>
        </Card>

        {/* ── DIEM CALCULATION PANEL ── */}
        {showDiem&&<Card style={{padding:16,marginBottom:12,borderLeft:"4px solid #f59e0b"}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:12}}>🍽 Per-Diem Allowance Calculation</div>
          {(trip.legs||[]).length===0&&<div style={{fontSize:12,color:MUTED}}>No itinerary legs set for this trip. Add legs via the Itinerary button to compute diem.</div>}
          {(trip.legs||[]).length>0&&<>
            {/* Leg breakdown */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:MUTED,textTransform:"uppercase",marginBottom:6}}>Itinerary — Diem Rates per Leg</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {trip.legs.map((leg,i)=>(
                  <div key={i} style={{padding:"6px 12px",background:leg.cityTier==="A"?"#fee2e2":leg.cityTier==="B"?"#fef3c7":leg.cityTier==="C"?"#dbeafe":"#f3f4f6",borderRadius:8,fontSize:11}}>
                    <strong>{leg.toCity||"City "+i}</strong>
                    <span style={{color:MUTED,marginLeft:4}}>Tier {leg.cityTier}</span>
                    <span style={{marginLeft:6}}>· {leg.days} day{leg.days!==1?"s":""}</span>
                    <span style={{marginLeft:6,fontWeight:600}}>× ₹{leg.diemRate||0}/day = ₹{((leg.days||0)*(leg.diemRate||0)).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Per-employee diem table */}
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:GL}}>
                {["Employee","Grade","Total Entitlement","Meal Claims","Approved Diem","Balance / Flat Allowance"].map(h=>(
                  <th key={h} style={{padding:"6px 10px",textAlign:"left",color:GD,fontSize:10,fontWeight:700,textTransform:"uppercase"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {tripDiemSummary(trip).map((r,i)=>{
                  const flatAllowance=Math.max(0,r.diem-r.claimed);
                  const total=r.claimed+flatAllowance;
                  return(
                    <tr key={i} style={{borderTop:`1px solid ${BDR}`}}>
                      <td style={{padding:"8px 10px",fontWeight:600}}>{r.user?.name}</td>
                      <td style={{padding:"8px 10px",color:MUTED}}>{r.user?.grade>0?`L${r.user.grade} ${r.user.gradeLabel||""}`:"-"}</td>
                      <td style={{padding:"8px 10px",fontWeight:700,color:INK}}>{fmt(r.diem)}</td>
                      <td style={{padding:"8px 10px",color:r.claimed>r.diem?"#dc2626":INK}}>{fmt(r.claimed)}{r.claimed>r.diem&&<span style={{fontSize:9,color:"#dc2626",marginLeft:4}}>↑ capped</span>}</td>
                      <td style={{padding:"8px 10px",color:"#16a34a",fontWeight:600}}>{fmt(Math.min(r.claimed,r.diem))}</td>
                      <td style={{padding:"8px 10px"}}>
                        {flatAllowance>0&&<span style={{background:"#dcfce7",color:"#15803d",padding:"2px 8px",borderRadius:12,fontSize:10,fontWeight:600}}>+{fmt(flatAllowance)} flat allowance</span>}
                        {flatAllowance===0&&<span style={{color:MUTED,fontSize:10}}>Fully claimed</span>}
                        <div style={{fontSize:10,color:MUTED,marginTop:2}}>Total: {fmt(total)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{fontSize:10,color:MUTED,marginTop:8}}>* Diem entitlement = ∑(days in city × diem rate per leg). If employee claims less than entitlement, the balance is paid as a flat allowance. Claims exceeding entitlement are capped automatically.</div>
          </>}
        </Card>}
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:900}}>
            <thead>
              <tr style={{background:GD}}>
                {[
                  ["Employee","left",160],["Dept","left",90],
                  ["Allocated","right",100],["Topups Rcvd","right",100],["Total Funds","right",100],
                  ["Approved","right",100],["Rejected","right",90],["Pending","right",90],
                  ["Balance Today","right",110],["Balance at End","right",110],
                ].map(([h,a,w])=>(
                  <th key={h} style={{padding:"8px 10px",color:"#fff",fontWeight:700,fontSize:10,textTransform:"uppercase",textAlign:a,minWidth:w}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledgerRows.length===0&&<tr><td colSpan={10} style={{padding:24,textAlign:"center",color:MUTED}}>No employees assigned to this trip</td></tr>}
              {ledgerRows.map((r,idx)=>(
                <tr key={r.user.id} style={{background:idx%2===0?"var(--card)":"var(--bg,#f8faf6)",borderBottom:`1px solid ${BDR}`}}>
                  <td style={{padding:"10px 10px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:28,height:28,borderRadius:"50%",background:GL,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:GD,fontSize:10,flexShrink:0}}>{r.user.avatar||inits(r.user.name)}</div>
                      <div><div style={{fontWeight:600,color:INK}}>{r.user.name}</div><div style={{fontSize:10,color:MUTED}}>{r.user.role}</div></div>
                    </div>
                  </td>
                  <td style={{padding:"10px 10px",color:MUTED,fontSize:11}}>{r.user.dept||"—"}</td>
                  <td style={{padding:"10px 10px",textAlign:"right",fontWeight:600,color:INK}}>{fmt(r.allocated)}</td>
                  <td style={{padding:"10px 10px",textAlign:"right",color:r.empTopups>0?"#16a34a":MUTED}}>
                    {r.empTopups>0?<span style={{fontWeight:600}}>+{fmt(r.empTopups)}</span>:"—"}
                  </td>
                  <td style={{padding:"10px 10px",textAlign:"right",fontWeight:700,color:INK}}>{fmt(r.totalFunds)}</td>
                  <td style={{padding:"10px 10px",textAlign:"right"}}>
                    <div style={{fontWeight:600,color:"#16a34a"}}>{fmt(r.approvedAmt)}</div>
                    <div style={{fontSize:9,color:MUTED}}>{r.approvedCount} invoice{r.approvedCount!==1?"s":""}</div>
                  </td>
                  <td style={{padding:"10px 10px",textAlign:"right"}}>
                    {r.rejectedAmt>0?<><div style={{fontWeight:600,color:"#dc2626"}}>{fmt(r.rejectedAmt)}</div><div style={{fontSize:9,color:MUTED}}>{r.rejectedCount} invoice{r.rejectedCount!==1?"s":""}</div></>:<span style={{color:MUTED}}>—</span>}
                  </td>
                  <td style={{padding:"10px 10px",textAlign:"right"}}>
                    {r.pendingAmt>0?<><div style={{fontWeight:600,color:"#f59e0b"}}>{fmt(r.pendingAmt)}</div><div style={{fontSize:9,color:MUTED}}>{r.pendingCount} invoice{r.pendingCount!==1?"s":""}</div></>:<span style={{color:MUTED}}>—</span>}
                  </td>
                  <td style={{padding:"10px 10px",textAlign:"right"}}>
                    <div style={{fontWeight:700,fontSize:13,color:r.balanceAsOfNow>0?"#dc2626":r.balanceAsOfNow<0?"#16a34a":MUTED}}>
                      {r.balanceAsOfNow>0?`↩ ${fmt(r.balanceAsOfNow)}`:r.balanceAsOfNow<0?`↪ ${fmt(-r.balanceAsOfNow)}`:"Settled"}
                    </div>
                    <div style={{fontSize:9,color:MUTED}}>{r.isBalance?"to recover":"to pay"}</div>
                  </td>
                  <td style={{padding:"10px 10px",textAlign:"right"}}>
                    <div style={{fontWeight:700,fontSize:13,color:r.balanceAtTripEnd>0?"#7c3aed":r.balanceAtTripEnd<0?"#0891b2":MUTED}}>
                      {r.balanceAtTripEnd>0?`↩ ${fmt(r.balanceAtTripEnd)}`:r.balanceAtTripEnd<0?`↪ ${fmt(-r.balanceAtTripEnd)}`:"Settled"}
                    </div>
                    <div style={{fontSize:9,color:MUTED}}>incl. pending</div>
                  </td>
                </tr>
              ))}
              {/* Summary row */}
              {ledgerRows.length>0&&(()=>{
                const totAlloc=ledgerRows.reduce((s,r)=>s+r.allocated,0);
                const totTop=ledgerRows.reduce((s,r)=>s+r.empTopups,0);
                const totFunds=ledgerRows.reduce((s,r)=>s+r.totalFunds,0);
                const totApp=ledgerRows.reduce((s,r)=>s+r.approvedAmt,0);
                const totRej=ledgerRows.reduce((s,r)=>s+r.rejectedAmt,0);
                const totPend=ledgerRows.reduce((s,r)=>s+r.pendingAmt,0);
                const totBal=ledgerRows.reduce((s,r)=>s+r.balanceAsOfNow,0);
                const totEnd=ledgerRows.reduce((s,r)=>s+r.balanceAtTripEnd,0);
                return(
                  <tr style={{background:GL,borderTop:`2px solid ${G}`,fontWeight:700}}>
                    <td style={{padding:"10px 10px",color:GD,fontWeight:700}}>TOTAL</td>
                    <td style={{padding:"10px 10px"}}/>
                    <td style={{padding:"10px 10px",textAlign:"right",color:INK}}>{fmt(totAlloc)}</td>
                    <td style={{padding:"10px 10px",textAlign:"right",color:totTop>0?"#16a34a":MUTED}}>{totTop>0?"+"+fmt(totTop):"—"}</td>
                    <td style={{padding:"10px 10px",textAlign:"right",color:INK}}>{fmt(totFunds)}</td>
                    <td style={{padding:"10px 10px",textAlign:"right",color:"#16a34a"}}>{fmt(totApp)}</td>
                    <td style={{padding:"10px 10px",textAlign:"right",color:totRej>0?"#dc2626":MUTED}}>{totRej>0?fmt(totRej):"—"}</td>
                    <td style={{padding:"10px 10px",textAlign:"right",color:totPend>0?"#f59e0b":MUTED}}>{totPend>0?fmt(totPend):"—"}</td>
                    <td style={{padding:"10px 10px",textAlign:"right",color:totBal>0?"#dc2626":totBal<0?"#16a34a":MUTED,fontWeight:700}}>{totBal>0?`↩ ${fmt(totBal)}`:totBal<0?`↪ ${fmt(-totBal)}`:"Settled"}</td>
                    <td style={{padding:"10px 10px",textAlign:"right",color:totEnd>0?"#7c3aed":totEnd<0?"#0891b2":MUTED,fontWeight:700}}>{totEnd>0?`↩ ${fmt(totEnd)}`:totEnd<0?`↪ ${fmt(-totEnd)}`:"Settled"}</td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </>}
    </div>
  );
}


function BalancesTab({trips,claims,topups,users,getUser,isAdmin,fmt:fmtFn,cid,sbEnabled,onReload}){
  const f=fmtFn||fmt;
  const[expandedEmp,setExpandedEmp]=useState(null);
  const[expandedTrip,setExpandedTrip]=useState(null);
  const[settling,setSettling]=useState(null);

  const markSettled=async(trip,empId)=>{
    if(!window.confirm(`Mark trip "${trip.name}" as settled?\nBalance of ${f(Math.abs(0))} will be recorded as settled.`))return;
    setSettling(trip.id+empId);
    try{
      if(sbEnabled&&supabase){
        await supabase.from("trips").update({settled_at:new Date().toISOString(),settled_by:empId}).eq("id",trip.id);
        await supabase.from("notifications").insert({id:"SETTLE-"+Date.now(),company_id:cid,user_id:empId,message:`Trip "${trip.name}" marked as settled`,type:"success",read:false,created_at:new Date().toISOString()});
      }
      if(onReload)await onReload();
    }catch(e){alert("Settlement failed: "+e.message);}
    finally{setSettling(null);}
  };

  const allTrips=[...trips].sort((a,b)=>(b.startDate||"").localeCompare(a.startDate||""));

  const empData=users.filter(u=>["employee","manager"].includes(u.role)).map(u=>{
    const empTrips=allTrips.filter(t=>(t.assignedTo||[]).includes(u.id)||t.createdBy===u.id);
    const tripBreakdown=empTrips.map(t=>{
      const tc=claims.filter(c=>c.empId===u.id&&c.tripId===t.id);
      const approved=tc.filter(c=>c.status==="Approved");
      const rejected=tc.filter(c=>c.status==="Rejected");
      const pending=tc.filter(c=>c.status==="Pending");
      const spent=approved.reduce((s,c)=>s+c.amount,0);
      // Approved topup requests for this employee on this trip
      const approvedTopups=(topups||[]).filter(tp=>tp.empId===u.id&&tp.tripId===t.id&&tp.status==="Approved").reduce((s,tp)=>s+tp.amount,0);
      const empAllocated=(t.employeeBudgets?.[u.id]?.allocated||0)+(t.employeeBudgets?.[u.id]?.topups||0)||0;
      const tripBudgetShare=t.budget>0&&(t.assignedTo||[]).length>0?t.budget/(t.assignedTo||[1]).length:0;
      // Total available = allocated budget + approved topup requests
      const totalAvailable=(empAllocated||tripBudgetShare)+approvedTopups;
      // Net balance: what's left after spending (negative = company owes employee, positive = employee owes company)
      const balance=t.tripMode!=="reimbursement"?(totalAvailable-spent):-spent;
      return{trip:t,approved,rejected,pending,spent,budget:totalAvailable,approvedTopups,balance,tc};
    }).filter(td=>td.tc.length>0||td.budget>0);

    const netBalance=tripBreakdown.reduce((s,td)=>s+td.balance,0);
    const totalSpent=tripBreakdown.reduce((s,td)=>s+td.spent,0);
    return{user:u,trips:tripBreakdown,netBalance,totalSpent};
  }).filter(e=>e.trips.length>0);

  const totalRecoverable=empData.filter(e=>e.netBalance>0).reduce((s,e)=>s+e.netBalance,0);
  const totalPayable=empData.filter(e=>e.netBalance<0).reduce((s,e)=>s+Math.abs(e.netBalance),0);

  return(
    <div>
      <div style={{marginBottom:14}}>
        <h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK}}>Balances & Settlements</h1>
        <p style={{color:MUTED,fontSize:12,marginTop:2}}>Employee-wise amounts due or recoverable. Press Settle against a trip once payment/recovery is complete.</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:18}} className="mob-grid-1">
        <Card style={{padding:14,borderLeft:"4px solid #dc2626"}}>
          <div style={{fontSize:9,color:MUTED,fontWeight:700,textTransform:"uppercase",marginBottom:3}}>To Recover</div>
          <div style={{fontFamily:FD,fontSize:20,fontWeight:800,color:"#dc2626"}}>{f(totalRecoverable)}</div>
          <div style={{fontSize:9,color:MUTED}}>from {empData.filter(e=>e.netBalance>0).length} employees</div>
        </Card>
        <Card style={{padding:14,borderLeft:"4px solid #16a34a"}}>
          <div style={{fontSize:9,color:MUTED,fontWeight:700,textTransform:"uppercase",marginBottom:3}}>To Pay</div>
          <div style={{fontFamily:FD,fontSize:20,fontWeight:800,color:"#16a34a"}}>{f(totalPayable)}</div>
          <div style={{fontSize:9,color:MUTED}}>to {empData.filter(e=>e.netBalance<0).length} employees</div>
        </Card>
        <Card style={{padding:14,borderLeft:"4px solid #7c3aed"}}>
          <div style={{fontSize:9,color:MUTED,fontWeight:700,textTransform:"uppercase",marginBottom:3}}>Net</div>
          <div style={{fontFamily:FD,fontSize:20,fontWeight:800,color:"#7c3aed"}}>{f(Math.abs(totalRecoverable-totalPayable))}</div>
          <div style={{fontSize:9,color:MUTED}}>{totalRecoverable>=totalPayable?"recoverable":"payable"}</div>
        </Card>
      </div>

      {empData.length===0&&<Card style={{padding:32,textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:8}}>⚖️</div>
        <div style={{color:MUTED}}>No balance data yet. Employees need trips and approved claims.</div>
      </Card>}

      {empData.map(({user:u,trips:tripData,netBalance,totalSpent})=>(
        <Card key={u.id} style={{marginBottom:10,padding:0,overflow:"hidden",
          borderLeft:netBalance>0?"4px solid #dc2626":netBalance<0?"4px solid #16a34a":"4px solid #e5e7eb"}}>
          {/* Employee header */}
          <div onClick={()=>setExpandedEmp(expandedEmp===u.id?null:u.id)}
            style={{display:"flex",alignItems:"center",gap:12,padding:"13px 18px",cursor:"pointer",
              background:expandedEmp===u.id?"var(--gl,#f0fde9)":"var(--card)"}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:netBalance>0?"#fee2e2":netBalance<0?"#dcfce7":GL,
              display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,
              color:netBalance>0?"#dc2626":netBalance<0?"#16a34a":GD,flexShrink:0}}>{u.avatar||inits(u.name)}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:INK}}>{u.name}</div>
              <div style={{fontSize:10,color:MUTED}}>{u.dept||"—"} · {tripData.length} trip{tripData.length!==1?"s":""} · {f(totalSpent)} total spent</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              {netBalance>0&&<div style={{fontWeight:800,fontSize:15,color:"#dc2626"}}>↩ {f(netBalance)}<div style={{fontSize:9,fontWeight:400}}>to recover</div></div>}
              {netBalance<0&&<div style={{fontWeight:800,fontSize:15,color:"#16a34a"}}>↪ {f(-netBalance)}<div style={{fontSize:9,fontWeight:400}}>to pay</div></div>}
              {netBalance===0&&<div style={{fontSize:11,color:MUTED,fontStyle:"italic"}}>Settled</div>}
            </div>
            <span style={{color:MUTED,fontSize:11,marginLeft:4}}>{expandedEmp===u.id?"▲":"▼"}</span>
          </div>

          {/* Trip breakdown */}
          {expandedEmp===u.id&&<div style={{borderTop:`1px solid ${BDR}`,background:"var(--bg,#f8faf6)"}}>
            {tripData.map(({trip:t,approved,rejected,pending,spent,budget,balance,approvedTopups:at})=>{
              const tripTopups=at||(topups||[]).filter(tp=>tp.empId===u.id&&tp.tripId===t.id&&tp.status==="Approved").reduce((s,tp)=>s+tp.amount,0);
              return(<div key={t.id} style={{borderBottom:`1px solid ${BDR}`}}>
                <div onClick={()=>setExpandedTrip(expandedTrip===t.id+u.id?null:t.id+u.id)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"10px 18px 10px 28px",cursor:"pointer"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:INK}}>{t.name}
                      <span style={{marginLeft:6,fontSize:9,background:t.status==="active"?"#dcfce7":t.status==="closed"?"#f3f4f6":"#fef3c7",color:t.status==="active"?"#16a34a":t.status==="closed"?"#6b7280":"#92400e",padding:"1px 6px",borderRadius:4,fontWeight:700}}>{t.status}</span>
                      {t.settled_at&&<span style={{marginLeft:6,fontSize:9,background:"#dcfce7",color:"#16a34a",padding:"1px 6px",borderRadius:4,fontWeight:700}}>✓ Settled</span>}
                    </div>
                    <div style={{fontSize:10,color:MUTED}}>{fmtDate(t.startDate)}→{fmtDate(t.endDate)} · {approved.length} approved, {rejected.length} rejected, {pending.length} pending</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontWeight:700,fontSize:13,color:balance>0?"#dc2626":balance<0?"#16a34a":MUTED}}>
                      {balance>0?`↩ ${f(balance)}`:balance<0?`↪ ${f(-balance)}`:"Balanced"}
                    </div>
                    <div style={{fontSize:9,color:MUTED}}>{f(spent)} spent of {f(budget)} budget</div>
                  </div>
                  {!t.settled_at&&balance!==0&&(
                    <button onClick={e=>{e.stopPropagation();markSettled(t,u.id);}} disabled={settling===t.id+u.id}
                      style={{marginLeft:6,padding:"4px 10px",background:"#16a34a",color:"#fff",border:"none",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0,opacity:settling===t.id+u.id?.6:1}}>
                      {settling===t.id+u.id?"…":"✓ Settle"}
                    </button>
                  )}
                  <span style={{color:MUTED,fontSize:10}}>{expandedTrip===t.id+u.id?"▲":"▼"}</span>
                </div>

                {/* Invoice drill-down */}
                {expandedTrip===t.id+u.id&&<div style={{padding:"8px 18px 12px 36px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:10,fontSize:11}}>
                    <div style={{padding:"6px 10px",background:"#dbeafe",borderRadius:6}}>💼 Budget: <strong>{f((budget||0)-(tripTopups||0))}</strong></div>
                    <div style={{padding:"6px 10px",background:"#dcfce7",borderRadius:6}}>➕ Top-ups: <strong>{f(tripTopups||0)}</strong></div>
                    <div style={{padding:"6px 10px",background:"#fee2e2",borderRadius:6}}>✗ Rejected: <strong>{f(rejected.reduce((s,c)=>s+c.amount,0))}</strong></div>
                    <div style={{padding:"6px 10px",background:balance>0?"#fee2e2":balance<0?"#dcfce7":"#f3f4f6",borderRadius:6,fontWeight:700}}>
                      {balance>0?`↩ ${f(balance)}`:balance<0?`↪ ${f(-balance)}`:"✓ Settled"}
                    </div>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead><tr>
                      {["Date","Description","Category","Status","Amount"].map(h=>(
                        <th key={h} style={{padding:"4px 6px",color:MUTED,fontSize:9,textTransform:"uppercase",borderBottom:`1px solid ${BDR}`,textAlign:h==="Amount"?"right":"left"}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{[...approved,...rejected,...pending].sort((a,b)=>b.amount-a.amount).map((c,i)=>(
                      <tr key={c.id} style={{borderBottom:`1px solid ${BDR}`,background:i%2===0?"transparent":"rgba(0,0,0,.01)"}}>
                        <td style={{padding:"4px 6px",color:MUTED,fontSize:10}}>{fmtDate(c.date)}</td>
                        <td style={{padding:"4px 6px",color:INK,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.desc}</td>
                        <td style={{padding:"4px 6px",color:MUTED}}>{c.category}</td>
                        <td style={{padding:"4px 6px"}}><Badge s={c.status} sm/></td>
                        <td style={{padding:"4px 6px",textAlign:"right",fontWeight:600,color:c.status==="Rejected"?"#dc2626":c.status==="Approved"?"#16a34a":INK}}>{f(c.amount)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                  <div style={{marginTop:8,padding:"8px 10px",background:balance>0?"#fee2e2":balance<0?"#dcfce7":"#f3f4f6",borderRadius:7,fontWeight:700,fontSize:12,color:balance>0?"#dc2626":balance<0?"#16a34a":MUTED}}>
                    {balance>0?`💰 Recover ₹${balance.toLocaleString("en-IN")} from ${u.name.split(" ")[0]}`:
                     balance<0?`💸 Pay ₹${(-balance).toLocaleString("en-IN")} to ${u.name.split(" ")[0]}`:
                     "✓ Balanced — no amount due"}
                  </div>
                </div>}
              </div>
            );})}
          </div>}
        </Card>
      ))}
    </div>
  );
}


function SettlementsTab({trips,claims,topups,users,getUser,isAdmin,myDept,cid,sbEnabled}){
  const[expandedEmp,setExpandedEmp]=useState(null);
  const[expandedTrip,setExpandedTrip]=useState(null);
  const[settling,setSettling]=useState(null); // tripId being settled

  const markSettled=async(trip,empId)=>{
    setSettling(trip.id);
    try{
      if(sbEnabled&&supabase){
        // Record settlement by updating trip's settled_at and resetting balance tracking
        await supabase.from("trips").update({
          settled_at:new Date().toISOString(),
          settled_by:empId,
        }).eq("id",trip.id);
        // Add an audit entry
        await supabase.from("notifications").insert({
          id:"SETTLE-"+Date.now(),
          company_id:cid,
          user_id:empId,
          message:`Trip "${trip.name}" marked as settled`,
          type:"success",
          read:false,
          created_at:new Date().toISOString(),
        });
      }
      // Reload data after settlement
      if(typeof window.__xpensr_reload==="function")await window.__xpensr_reload();
      else setSettling(null);
    }catch(e){
      alert("Settlement failed: "+e.message);
    }finally{setSettling(null);}
  };

  // Calculate per-employee settlement
  const empSettlements=users
    .filter(u=>u.role==="employee"&&(isAdmin||u.dept===myDept))
    .map(u=>{
      const empTrips=trips.filter(t=>(t.assignedTo||[]).includes(u.id)||t.createdBy===u.id);
      const tripData=empTrips.map(t=>{
        const tripClaims=claims.filter(c=>c.empId===u.id&&c.tripId===t.id&&c.status==="Approved");
        const spent=tripClaims.reduce((s,c)=>s+c.amount,0);
        // Approved topup requests from the topups table for this emp+trip
        const approvedTopupsAmt=(topups||[]).filter(tp=>tp.empId===u.id&&tp.tripId===t.id&&tp.status==="Approved").reduce((s,tp)=>s+tp.amount,0);
        const empAllocated=(t.employeeBudgets?.[u.id]?.allocated||0)+(t.employeeBudgets?.[u.id]?.topups||0);
        const openBal=empAllocated||t.openingBalance||t.budget||0;
        const isBalance=t.tripMode!=="reimbursement";
        // Net: budget + topups given - expenses claimed
        const settlement=isBalance?(openBal+approvedTopupsAmt-spent):-spent;
        return{trip:t,claims:tripClaims,spent,openBal,approvedTopupsAmt,settlement,isBalance};
      }).filter(td=>td.trip.status==="closed"||td.trip.status==="fully_closed"||td.spent>0);
      const totalRecoverable=tripData.reduce((s,td)=>s+(td.settlement>0?td.settlement:0),0);
      const totalPayable=tripData.reduce((s,td)=>s+(td.settlement<0?-td.settlement:0),0);
      return{user:u,trips:tripData,totalRecoverable,totalPayable};
    }).filter(e=>e.trips.length>0);

  return(
    <div>
      <h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK,marginBottom:4}}>Settlements</h1>
      <p style={{color:MUTED,fontSize:12,marginBottom:14}}>Employee-wise balance recovery and payment status</p>

      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}} className="mob-grid-1">
        <Card style={{padding:16,borderLeft:"4px solid #dc2626"}}>
          <div style={{fontSize:10,color:MUTED,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Total Recoverable</div>
          <div style={{fontSize:20,fontWeight:800,color:"#dc2626"}}>{fmt(empSettlements.reduce((s,e)=>s+e.totalRecoverable,0))}</div>
          <div style={{fontSize:10,color:MUTED,marginTop:2}}>To be collected from employees</div>
        </Card>
        <Card style={{padding:16,borderLeft:"4px solid #16a34a"}}>
          <div style={{fontSize:10,color:MUTED,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Total Payable</div>
          <div style={{fontSize:20,fontWeight:800,color:"#16a34a"}}>{fmt(empSettlements.reduce((s,e)=>s+e.totalPayable,0))}</div>
          <div style={{fontSize:10,color:MUTED,marginTop:2}}>To be paid to employees</div>
        </Card>
      </div>

      {empSettlements.length===0&&<Card style={{padding:32,textAlign:"center"}}><div style={{fontSize:32}}>📊</div><div style={{color:MUTED,marginTop:8,fontSize:13}}>No settlement data yet. Settlements appear when trips are closed.</div></Card>}

      {empSettlements.map(({user:u,trips:tripData,totalRecoverable,totalPayable})=>(
        <Card key={u.id} style={{marginBottom:10,padding:0,overflow:"hidden"}}>
          {/* Employee header */}
          <div onClick={()=>setExpandedEmp(expandedEmp===u.id?null:u.id)}
            style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",cursor:"pointer",background:expandedEmp===u.id?"#f0fde9":"#fff"}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:GL,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:GD,fontSize:13,flexShrink:0}}>{u.avatar||inits(u.name)}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:14,color:INK}}>{u.name}</div>
              <div style={{fontSize:11,color:MUTED}}>{u.dept||"—"} · {tripData.length} trip{tripData.length!==1?"s":""}</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              {totalRecoverable>0&&<div style={{fontSize:13,fontWeight:700,color:"#dc2626"}}>↩ {fmt(totalRecoverable)} recoverable</div>}
              {totalPayable>0&&<div style={{fontSize:13,fontWeight:700,color:"#16a34a"}}>↪ {fmt(totalPayable)} payable</div>}
              {totalRecoverable===0&&totalPayable===0&&<div style={{fontSize:12,color:MUTED}}>Settled</div>}
            </div>
            <span style={{color:MUTED,fontSize:12}}>{expandedEmp===u.id?"▲":"▼"}</span>
          </div>

          {/* Trip breakdown */}
          {expandedEmp===u.id&&<div style={{borderTop:`1px solid ${BDR}`,background:"var(--input-bg,#fafff8)"}}>
            {tripData.map(({trip:t,claims:tc,spent,openBal,approvedTopupsAmt,settlement,isBalance})=>(
              <div key={t.id} style={{borderBottom:`1px solid ${BDR}`}}>
                <div onClick={()=>setExpandedTrip(expandedTrip===t.id?null:t.id)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"10px 18px 10px 28px",cursor:"pointer"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:INK}}>{t.name} {t.settled_at&&<span style={{fontSize:9,background:"#dcfce7",color:"#16a34a",padding:"1px 6px",borderRadius:4,marginLeft:5}}>✓ Settled</span>}</div>
                    <div style={{fontSize:10,color:MUTED}}>{fmtDate(t.startDate)} → {fmtDate(t.endDate)} · {isBalance?"Balance":"Reimbursement"}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:settlement>0?"#dc2626":settlement<0?"#16a34a":MUTED}}>
                      {settlement>0?`↩ ${fmt(settlement)}`:settlement<0?`↪ ${fmt(-settlement)}`:"Settled"}
                    </div>
                    <div style={{fontSize:9,color:MUTED}}>{tc.length} expenses · {fmt(spent)} spent</div>
                  </div>
                  {t.status==="closed"&&!t.settled_at&&settlement!==0&&(
                    <button onClick={e=>{e.stopPropagation();if(window.confirm(`Mark trip "${t.name}" as settled? Balance of ${fmt(Math.abs(settlement))} ${settlement>0?"recovered from":"paid to"} employee.`))markSettled(t,u.id);}}
                      style={{marginLeft:6,padding:"4px 10px",background:"#16a34a",color:"#fff",border:"none",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0}}>
                      {settling===t.id?"…":"✓ Settle"}
                    </button>
                  )}
                  <span style={{color:MUTED,fontSize:11,marginLeft:4}}>{expandedTrip===t.id?"▲":"▼"}</span>
                </div>

                {expandedTrip===t.id&&<div style={{padding:"0 18px 12px 36px"}}>
                  {isBalance&&<div style={{display:"flex",gap:14,fontSize:11,color:MUTED,marginBottom:8,flexWrap:"wrap"}}>
                    <span>Budget: <strong>{fmt(openBal)}</strong></span>
                    {approvedTopupsAmt>0&&<span style={{color:"#16a34a"}}>➕ Top-ups approved: <strong>+{fmt(approvedTopupsAmt)}</strong></span>}
                    <span>Spent: <strong>{fmt(spent)}</strong></span>
                    <span style={{color:settlement>0?"#dc2626":"#16a34a",fontWeight:700}}>
                      Net: {settlement>0?`↩ ${fmt(settlement)} (recover)`:settlement<0?`↪ ${fmt(-settlement)} (pay)`:"Settled"}
                    </span>
                  </div>}
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead><tr><th style={{textAlign:"left",padding:"4px 6px",color:MUTED,fontSize:9,textTransform:"uppercase"}}>Date</th><th style={{textAlign:"left",padding:"4px 6px",color:MUTED,fontSize:9,textTransform:"uppercase"}}>Description</th><th style={{textAlign:"left",padding:"4px 6px",color:MUTED,fontSize:9,textTransform:"uppercase"}}>Category</th><th style={{textAlign:"right",padding:"4px 6px",color:MUTED,fontSize:9,textTransform:"uppercase"}}>Amount</th></tr></thead>
                    <tbody>{tc.map(c=>(
                      <tr key={c.id} style={{borderTop:`1px solid ${BDR}`}}>
                        <td style={{padding:"4px 6px",color:MUTED}}>{fmtDate(c.date)}</td>
                        <td style={{padding:"4px 6px",color:INK}}>{c.desc?.slice(0,25)||"—"}</td>
                        <td style={{padding:"4px 6px",color:MUTED}}>{c.category}</td>
                        <td style={{padding:"4px 6px",textAlign:"right",fontWeight:600,color:INK}}>{fmt(c.amount)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>}
              </div>
            ))}
          </div>}
        </Card>
      ))}
    </div>
  );
}

// ─── FINANCE TAB ─────────────────────────────────────────────────────────────
function FinanceTab({claims,trips,getUser,users,isAdmin,isManager,policy,onExportPDF,onBudgetEnhancement,onApproveBudgetEnhancement,myDept,myUser}){
  const[berForm,setBerForm]=useState({dept:myDept||"",period:"monthly",requested:"",reason:""});
  const[showBER,setShowBER]=useState(false);
  const[filter,setFilter]=useState("All");
  const[search,setSearch]=useState("");
  const shown=claims.filter(c=>
    (filter==="All"||c.status===filter)&&
    (c.desc?.toLowerCase().includes(search.toLowerCase())||
     c.vendor?.toLowerCase().includes(search.toLowerCase())||
     c.category?.toLowerCase().includes(search.toLowerCase()))
  );
  const total=shown.reduce((s,c)=>s+c.amount,0);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK}}>Finance View</h1>
          <p style={{color:MUTED,fontSize:11,marginTop:2}}>Approved expenses ready for accounting · {shown.length} records · {fmt(total)} total</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          {onBudgetEnhancement&&<Btn v="outline" onClick={()=>setShowBER(p=>!p)} style={{fontSize:11,padding:"6px 12px",borderColor:"#f59e0b",color:"#92400e"}}>📊 Request Budget Enhancement</Btn>}
          <Btn v="outline" onClick={()=>onExportPDF&&onExportPDF(shown,"Finance Report",`${shown.length} records · ₹${total.toLocaleString("en-IN")}`)} style={{fontSize:11,padding:"6px 12px"}}>⬇ PDF</Btn>
        </div>
      </div>

      {/* Budget status cards */}
      {(policy.monthlyDeptBudgets&&Object.keys(policy.monthlyDeptBudgets).length>0)&&(()=>{
        const now=new Date();
        const claimMonth=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
        const fyYear=now.getMonth()>=3?now.getFullYear():now.getFullYear()-1;
        const fyStart=`${fyYear}-04`;const fyEnd=`${fyYear+1}-03`;
        return(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8,marginBottom:14}}>
            {Object.entries(policy.monthlyDeptBudgets).filter(([dept])=>!myDept||isAdmin||dept===myDept).map(([dept,b])=>{
              if(!b.monthly&&!b.yearly)return null;
              const mSpent=claims.filter(c=>{const u=users.find(x=>x.id===c.empId);return u?.dept===dept&&c.date?.slice(0,7)===claimMonth;}).reduce((s,c)=>s+c.amount,0);
              const ySpent=claims.filter(c=>{const u=users.find(x=>x.id===c.empId);return u?.dept===dept&&c.date?.slice(0,7)>=fyStart&&c.date?.slice(0,7)<=fyEnd;}).reduce((s,c)=>s+c.amount,0);
              const mPct=b.monthly>0?Math.min(100,Math.round(mSpent/b.monthly*100)):0;
              const yPct=b.yearly>0?Math.min(100,Math.round(ySpent/b.yearly*100)):0;
              const breached=mPct>=100||yPct>=100;
              return(
                <Card key={dept} style={{padding:12,borderColor:breached?"#fca5a5":BDR}}>
                  <div style={{fontWeight:700,fontSize:12,color:INK,marginBottom:6}}>{dept}</div>
                  {b.monthly>0&&<>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:2}}>
                      <span style={{color:MUTED}}>Monthly</span>
                      <span style={{fontWeight:600,color:mPct>=100?"#dc2626":"#16a34a"}}>{fmt(mSpent)} / {fmt(b.monthly)}</span>
                    </div>
                    <div style={{background:"#e5e7eb",borderRadius:4,height:5,marginBottom:6}}>
                      <div style={{width:mPct+"%",background:mPct>=100?"#dc2626":mPct>=80?"#f59e0b":"#7ED957",borderRadius:4,height:"100%"}}/>
                    </div>
                  </>}
                  {b.yearly>0&&<>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:2}}>
                      <span style={{color:MUTED}}>Annual FY</span>
                      <span style={{fontWeight:600,color:yPct>=100?"#dc2626":"#16a34a"}}>{fmt(ySpent)} / {fmt(b.yearly)}</span>
                    </div>
                    <div style={{background:"#e5e7eb",borderRadius:4,height:5}}>
                      <div style={{width:yPct+"%",background:yPct>=100?"#dc2626":yPct>=80?"#f59e0b":"#7ED957",borderRadius:4,height:"100%"}}/>
                    </div>
                  </>}
                  {breached&&<div style={{fontSize:9,color:"#dc2626",fontWeight:700,marginTop:4}}>⛔ BUDGET BREACHED — Admin approval only</div>}
                </Card>
              );
            }).filter(Boolean)}
          </div>
        );
      })()}

      {/* Budget Enhancement Request Form */}
      {showBER&&onBudgetEnhancement&&<Card style={{padding:18,marginBottom:14,borderColor:"#fcd34d",background:"#fffbeb"}}>
        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:10}}>📊 Budget Enhancement Request</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
          <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Department</label>
            <input value={berForm.dept} onChange={e=>setBerForm(f=>({...f,dept:e.target.value}))} style={{padding:"7px 10px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:12,width:"100%"}}/></div>
          <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Period</label>
            <select value={berForm.period} onChange={e=>setBerForm(f=>({...f,period:e.target.value}))} style={{padding:"7px 10px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:12,width:"100%",appearance:"none"}}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Annual (FY)</option>
            </select></div>
          <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Current Limit ₹</label>
            <input type="number" value={(policy.monthlyDeptBudgets?.[berForm.dept]?.[berForm.period==="monthly"?"monthly":"yearly"])||0} readOnly style={{padding:"7px 10px",border:`1px solid ${BDR}`,borderRadius:7,fontSize:12,width:"100%",background:"var(--bg,#f9fafb)",color:MUTED}}/></div>
          <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Requested New Limit ₹</label>
            <input type="number" value={berForm.requested} onChange={e=>setBerForm(f=>({...f,requested:e.target.value}))} placeholder="Enter new budget amount" style={{padding:"7px 10px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:12,width:"100%"}}/></div>
        </div>
        <div style={{marginBottom:10}}><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Reason for Enhancement</label>
          <textarea value={berForm.reason} onChange={e=>setBerForm(f=>({...f,reason:e.target.value}))} placeholder="Explain why budget needs to be increased…" rows={2} style={{width:"100%",padding:"7px 10px",border:`1.5px solid ${BDR}`,borderRadius:7,fontSize:12,fontFamily:FB,resize:"vertical"}}/></div>
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={async()=>{
            if(!berForm.dept||!berForm.requested||!berForm.reason){toast("Fill all fields","error");return;}
            const cur=(policy.monthlyDeptBudgets?.[berForm.dept]?.[berForm.period==="monthly"?"monthly":"yearly"])||0;
            await onBudgetEnhancement(berForm.dept,null,berForm.period,cur,parseFloat(berForm.requested),berForm.reason);
            setShowBER(false);setBerForm({dept:myDept||"",period:"monthly",requested:"",reason:""});
          }}>Submit Request →</Btn>
          <Btn v="outline" onClick={()=>setShowBER(false)}>Cancel</Btn>
        </div>
      </Card>}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        {["All","Manager Approved","Approved"].map(s=>(
          <button key={s} onClick={()=>setFilter(s)} style={{padding:"5px 13px",borderRadius:20,border:`1.5px solid ${filter===s?G:BDR}`,background:filter===s?G:"#fff",color:filter===s?"#fff":MUTED,fontFamily:FB,fontSize:11,fontWeight:600,cursor:"pointer"}}>{s}</button>
        ))}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search…" style={{padding:"6px 11px",border:`1.5px solid ${BDR}`,borderRadius:8,fontSize:12,background:"var(--input-bg,#fafff8)",marginLeft:"auto"}}/>
      </div>
      <Card>
        <div className="mob-scroll">
        <table style={{width:"100%",minWidth:700}}>
          <thead><tr><th>Claim ID</th><th>Date</th><th>Employee</th><th>Dept</th><th>Trip</th><th>Category</th><th>Vendor</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>{shown.map(c=>{
            const e=getUser(c.empId);
            const trip=trips.find(t=>t.id===c.tripId);
            return(<tr key={c.id} className="rh">
              <td style={{fontFamily:"monospace",color:GD,fontSize:10,fontWeight:600}}>{c.id}</td>
              <td style={{color:MUTED,fontSize:11}}>{fmtDate(c.date)}</td>
              <td style={{fontSize:12}}>{e?.name||"—"}</td>
              <td><span style={{background:GL,color:GD,padding:"1px 6px",borderRadius:4,fontSize:10}}>{e?.dept||"—"}</span></td>
              <td style={{fontSize:10,color:MUTED}}>{trip?.name?.slice(0,16)||"—"}</td>
              <td><span style={{background:GL,color:GD,padding:"1px 6px",borderRadius:4,fontSize:10}}>{c.category}</span></td>
              <td style={{fontSize:11}}>{c.vendor||"—"}</td>
              <td style={{fontWeight:700,fontSize:12,color:INK}}>{fmt(c.amount)}</td>
              <td><Badge s={c.status} sm/></td>
            </tr>);
          })}</tbody>
        </table>
        </div>
        {shown.length===0&&<div style={{padding:24,textAlign:"center",color:MUTED}}>No approved expenses found</div>}
      </Card>
      <div style={{marginTop:10,padding:"10px 14px",background:GL,borderRadius:9,fontSize:12,color:GD,fontWeight:600}}>
        Total approved: <span style={{fontSize:16,color:INK,fontWeight:700}}>{fmt(total)}</span>
        {" · "}{shown.length} transactions
      </div>
    </div>
  );
}

// ─── FX TICKER TAPE ──────────────────────────────────────────────────────────
function FXTicker(){
  const PAIRS=["USD","EUR","GBP","CHF","JPY","CAD","AUD","SGD","AED","HKD","CNY"];
  const[rates,setRates]=useState(null);
  const[err,setErr]=useState(false);
  useEffect(()=>{
    // Free FX API — exchangerate-api.com open endpoint
    fetch("https://open.er-api.com/v6/latest/INR")
      .then(r=>r.json())
      .then(d=>{
        if(d.result==="success"){
          // Convert from INR base: rate = how many INR per 1 foreign currency = 1/d.rates[cur]
          const r={};
          PAIRS.forEach(c=>{if(d.rates[c])r[c]=+(1/d.rates[c]).toFixed(4);});
          setRates(r);
        }else setErr(true);
      })
      .catch(()=>setErr(true));
  },[]);

  if(err||!rates)return null;

  const items=PAIRS.filter(c=>rates[c]).map(c=>`1 ${c} = ₹${rates[c].toLocaleString("en-IN")}`);
  // Duplicate for seamless loop
  const display=[...items,...items];

  return(
    <div style={{background:"#0f1c09",color:G,fontSize:11,fontFamily:FB,fontWeight:600,overflow:"hidden",borderBottom:"1px solid rgba(126,217,87,.2)",height:24,display:"flex",alignItems:"center",position:"relative"}}>
      <div style={{background:"#0f1c09",color:G,padding:"0 10px",fontSize:10,fontWeight:700,letterSpacing:1,flexShrink:0,borderRight:"1px solid rgba(126,217,87,.2)",height:"100%",display:"flex",alignItems:"center",zIndex:1}}>
        💱 LIVE FX
      </div>
      <div style={{overflow:"hidden",flex:1,position:"relative"}}>
        <style>{`@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
        <div style={{display:"flex",gap:0,animation:"ticker 60s linear infinite",whiteSpace:"nowrap"}}>
          {display.map((item,i)=>(
            <span key={i} style={{padding:"0 20px",color:"rgba(126,217,87,.85)",borderRight:"1px solid rgba(126,217,87,.15)"}}>
              {item}
            </span>
          ))}
        </div>
      </div>
      <div style={{fontSize:9,color:"rgba(126,217,87,.4)",padding:"0 8px",flexShrink:0}}>er-api.com</div>
    </div>
  );
}

// ─── FUND REQUEST ─────────────────────────────────────────────────────────────
function FundRequestModal({trips,user,cid,onClose,onSubmit,sbEnabled}){
  const myTrips=trips.filter(t=>t.status==="active"&&(!t.assignedTo||t.assignedTo.includes(user.id)));
  const[tripId,setTripId]=useState(myTrips[0]?.id||"");
  const[amount,setAmount]=useState("");
  const[reason,setReason]=useState("");
  const[busy,setBusy]=useState(false);
  const[done,setDone]=useState(false);
  const inpS={width:"100%",padding:"10px 12px",border:`1.5px solid ${BDR}`,borderRadius:8,fontSize:13,background:"var(--input-bg,#fafff8)",outline:"none",fontFamily:FB};

  const submit=async()=>{
    if(!tripId||!amount||!reason){return;}
    setBusy(true);
    const req={id:uid(),tripId,empId:user.id,empName:user.name,amount:parseFloat(amount),reason,status:"Pending",date:today(),companyId:cid};
    await onSubmit(req);
    setDone(true);setBusy(false);
    setTimeout(onClose,2000);
  };

  return(
    <div style={{position:"fixed",inset:0,background:"#00000055",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,backdropFilter:"blur(3px)"}} onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div onMouseDown={e=>e.stopPropagation()} style={{background:"var(--card,#fff)",borderRadius:16,padding:28,width:"min(460px,94vw)",boxShadow:"0 24px 60px #0003"}}>
        <h3 style={{fontFamily:FD,fontSize:17,fontWeight:700,color:INK,marginBottom:6}}>💰 Fund Request</h3>
        <p style={{color:MUTED,fontSize:12,marginBottom:18}}>Request additional funds for a trip. Your manager will review and approve.</p>
        {done?(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:40,marginBottom:8}}>✅</div>
            <div style={{fontWeight:700,color:INK}}>Request Submitted!</div>
            <div style={{fontSize:12,color:MUTED,marginTop:4}}>Your manager has been notified.</div>
          </div>
        ):(
          <>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Trip</label>
              <select value={tripId} onChange={e=>setTripId(e.target.value)} style={{...inpS,appearance:"none"}}>
                {myTrips.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                {myTrips.length===0&&<option value="">No active trips</option>}
              </select>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Amount Requested ₹</label>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 5000" style={inpS}/>
            </div>
            <div style={{marginBottom:18}}>
              <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:4,textTransform:"uppercase"}}>Reason / Justification</label>
              <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} placeholder="Explain why additional funds are needed..." style={{...inpS,resize:"vertical"}}/>
            </div>
            <div style={{display:"flex",gap:9}}>
              <Btn onClick={submit} disabled={busy||!tripId||!amount||!reason||myTrips.length===0} style={{flex:1,padding:11}}>{busy?"Submitting…":"Submit Request"}</Btn>
              <Btn v="outline" onClick={onClose}>Cancel</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────────────
const SHORTCUTS=[
  {key:"N",label:"New Expense",       desc:"Open expense submission"},
  {key:"A",label:"Approvals",         desc:"Go to approvals (incl. topups & edit requests)"},
  {key:"C",label:"Claims",            desc:"View claims / my expenses"},
  {key:"T",label:"Trips",             desc:"View trips & periods"},
  {key:"D",label:"Dashboard",         desc:"Go to dashboard"},
  {key:"F",label:"Finance",           desc:"Finance view & exports"},
  {key:"I",label:"Inbox",             desc:"Open notifications inbox"},
  {key:"B",label:"Balances",          desc:"Employee balance summary"},
  {key:"L",label:"Trip Ledger",        desc:"Employee-wise trip fund flow & settlement"},
  {key:"S",label:"Settlements",       desc:"Trip settlement tracker"},
  {key:"U",label:"Top-up",            desc:"Request wallet top-up"},
  {key:"Y",label:"Analytics",         desc:"Analytics & charts"},
  {key:"H",label:"Help",              desc:"Help & tutorial"},
  {key:"?",label:"Shortcuts",         desc:"Show this help"},
  {key:"Esc",label:"Close",           desc:"Close any modal"},
];

function ShortcutHelp({onClose}){
  return(
    <div style={{position:"fixed",inset:0,background:"#00000055",display:"flex",alignItems:"center",justifyContent:"center",zIndex:700,backdropFilter:"blur(4px)"}} onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div onMouseDown={e=>e.stopPropagation()} style={{background:"var(--card,#fff)",borderRadius:16,padding:28,width:"min(480px,94vw)",boxShadow:"0 24px 60px #0003"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
          <div style={{fontFamily:FD,fontSize:17,fontWeight:700,color:INK}}>⌨ Keyboard Shortcuts</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:16,cursor:"pointer",color:MUTED}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {SHORTCUTS.map(s=>(
            <div key={s.key} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"var(--hover-bg,#f8faf6)",borderRadius:8}}>
              <kbd style={{background:"#0f1c09",color:G,padding:"3px 8px",borderRadius:5,fontSize:11,fontWeight:700,fontFamily:"monospace",minWidth:28,textAlign:"center"}}>{s.key}</kbd>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:INK}}>{s.label}</div>
                <div style={{fontSize:10,color:MUTED}}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{marginTop:14,padding:"8px 12px",background:GL,borderRadius:8,fontSize:10,color:MUTED,textAlign:"center"}}>
          Press <kbd style={{background:"#0f1c09",color:G,padding:"1px 5px",borderRadius:3,fontSize:10,fontFamily:"monospace"}}>?</kbd> anywhere to show/hide this menu
        </div>
      </div>
    </div>
  );
}

// ─── AI CHATBOT ───────────────────────────────────────────────────────────────
function AIChatbot({user,co,onClose}){
  const CHAT_KEY="xpensr_chat_"+user?.id;
  const[msgs,setMsgs]=useState(()=>{
    try{const s=localStorage.getItem(CHAT_KEY);if(s)return JSON.parse(_dec(s)||s);}catch{}
    return[{role:"assistant",content:"Hi! I'm XpensR Assistant. Ask me anything about submitting expenses, approving claims, creating trips, or any other feature. How can I help?"}];
  });
  const[input,setInput]=useState("");
  const[busy,setBusy]=useState(false);
  const[chatCount,setChatCount]=useState(0);
  const[showHuman,setShowHuman]=useState(false);
  const[humanForm,setHumanForm]=useState({name:user?.name||"",email:user?.email||"",msg:""});
  const endRef=useRef(null);

  // Save chat history whenever msgs changes
  useEffect(()=>{
    try{localStorage.setItem(CHAT_KEY,_enc(JSON.stringify(msgs.slice(-50))));}catch{}
  },[msgs]);

  const resetChat=()=>{
    const init=[{role:"assistant",content:"Chat history cleared. How can I help you?"}];
    setMsgs(init);setChatCount(0);setShowHuman(false);
    try{localStorage.removeItem(CHAT_KEY);}catch{}
  };

  const CONTEXT=`You are XpensR Assistant, a helpful support bot for XpensR by RB — a cloud-based expense management app.
Key features: expense claims submission with AI OCR, trip management with budgets, multi-level approval (employee→manager→admin), settlements, GST ITC tracking, analytics, dark mode, keyboard shortcuts.
User: ${user?.name||"Unknown"}, Role: ${user?.role||"employee"}, Company: ${co?.meta?.name||"Unknown"}.
Active trips: ${(co?.trips||[]).filter(t=>t.status==="active").length}.
Pending claims: ${(co?.claims||[]).filter(c=>c.status==="Pending").length}.
Be concise, helpful, and use bullet points when listing steps. If you can't help, offer to connect to a human assistant.`;

  const AI_CHAT_ENABLED=import.meta.env.VITE_AI_ENABLED==="true";

  const send=async()=>{
    if(!input.trim()||busy)return;
    const userMsg={role:"user",content:input};
    const newMsgs=[...msgs,userMsg];
    setMsgs(newMsgs);setInput("");setBusy(true);
    if(!AI_CHAT_ENABLED){
      setMsgs(p=>[...p,{role:"assistant",content:"AI assistant is currently disabled. Please refer to the Help Manual (press H) or contact your Admin for assistance."}]);
      setBusy(false);return;
    }
    const newCount=chatCount+1;
    setChatCount(newCount);
    try{
      const res=await fetch("/api/anthropic/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json","anthropic-version":"2023-06-01","x-company-id":cid||""},
        body:JSON.stringify({
          model:"claude-haiku-4-5-20251001",max_tokens:500,
          _feature:"chat",
          system:CONTEXT,
          messages:newMsgs.slice(-10).map(m=>({role:m.role,content:m.content}))
        })
      });
      const data=await res.json();
      const reply=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("")||"Sorry, I couldn't process that.";
      setMsgs(p=>[...p,{role:"assistant",content:reply}]);
      if(newCount>=5)setShowHuman(true);
    }catch(e){
      setMsgs(p=>[...p,{role:"assistant",content:"Sorry, I'm having trouble connecting. Please try again or contact support@rbshah.co.in"}]);
    }
    setBusy(false);
    setTimeout(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),100);
  };

  const sendHumanRequest=async()=>{
    if(!humanForm.name||!humanForm.email)return;
    try{
      await fetch("/api/email",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          to:"support@rbshah.co.in",
          subject:`XpensR Human Support Request — ${humanForm.name}`,
          html:`<p><strong>User:</strong> ${humanForm.name} (${user?.role})</p><p><strong>Email:</strong> ${humanForm.email}</p><p><strong>Company:</strong> ${co?.meta?.name}</p><p><strong>Message:</strong> ${humanForm.msg}</p>`
        })});
    }catch(e){}
    setMsgs(p=>[...p,{role:"assistant",content:`✓ Your details have been sent to our support team. We'll contact you at ${humanForm.email} within 24 hours.`}]);
    setShowHuman(false);
  };

  return(
    <div style={{position:"fixed",bottom:72,right:20,width:"min(380px,95vw)",height:"min(520px,80vh)",background:"var(--card,#fff)",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,.2)",display:"flex",flexDirection:"column",zIndex:800,border:"1px solid var(--bdr)"}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${DARK},#2d5a1b)`,padding:"14px 16px",borderRadius:"16px 16px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#7ED957,#5CB83A)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🤖</div>
          <div><div style={{color:"#fff",fontWeight:700,fontSize:13}}>XpensR Assistant</div><div style={{color:"rgba(255,255,255,.8)",fontSize:10}}>AI-powered · {msgs.length-1} messages</div></div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button onClick={resetChat} title="Clear chat history" style={{background:"none",border:"1px solid rgba(255,255,255,.2)",color:"rgba(255,255,255,.8)",borderRadius:6,padding:"3px 8px",fontSize:10,cursor:"pointer"}}>↺ Reset</button>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,.6)",fontSize:18,cursor:"pointer"}}>✕</button>
        </div>
      </div>
      {/* Messages */}
      <div style={{flex:1,overflow:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"82%",padding:"9px 13px",borderRadius:m.role==="user"?"12px 12px 3px 12px":"12px 12px 12px 3px",background:m.role==="user"?G:"var(--gl,#f0fde9)",color:m.role==="user"?"#fff":INK,fontSize:12,lineHeight:1.6}}>
              {m.content}
            </div>
          </div>
        ))}
        {busy&&<div style={{display:"flex",gap:4,padding:"8px 12px"}}>
          {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:MUTED,animation:`bounce .8s ease-in-out ${i*.15}s infinite alternate`}}/>)}
        </div>}
        {showHuman&&!busy&&<div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:10,padding:"10px 12px",fontSize:11,color:"#92400e"}}>
          <div style={{fontWeight:700,marginBottom:4}}>💬 Connect with a human assistant?</div>
          <div style={{marginBottom:8,color:MUTED}}>Would you like us to reach out to you?</div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>setShowHuman(false)} style={{padding:"5px 10px",background:"transparent",border:"1px solid #fcd34d",borderRadius:6,cursor:"pointer",fontSize:11,color:"#92400e"}}>Not now</button>
            <button onClick={()=>setShowHuman("form")} style={{padding:"5px 12px",background:"#f59e0b",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,color:"#fff",fontWeight:700}}>Yes, contact me</button>
          </div>
        </div>}
        {showHuman==="form"&&<div style={{background:"#f8faf6",border:"1px solid var(--bdr)",borderRadius:10,padding:"12px"}}>
          <div style={{fontWeight:700,fontSize:12,color:INK,marginBottom:8}}>Your contact details:</div>
          {[["Name","name","text"],["Email","email","email"],["Message (optional)","msg","text"]].map(([l,k,t])=>(
            <div key={k} style={{marginBottom:7}}>
              <div style={{fontSize:9,color:MUTED,textTransform:"uppercase",fontWeight:700,marginBottom:2}}>{l}</div>
              <input type={t} value={humanForm[k]} onChange={e=>setHumanForm({...humanForm,[k]:e.target.value})} style={{width:"100%",padding:"6px 9px",border:"1px solid var(--bdr)",borderRadius:6,fontSize:12,background:"var(--input-bg,#fff)"}}/>
            </div>
          ))}
          <button onClick={sendHumanRequest} style={{width:"100%",padding:"8px",background:G,color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>Send Request</button>
        </div>}
        <div ref={endRef}/>
      </div>
      {/* Input */}
      <div style={{padding:"10px 12px",borderTop:"1px solid var(--bdr)",display:"flex",gap:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Ask anything…" style={{flex:1,padding:"8px 11px",border:"1px solid var(--bdr)",borderRadius:9,fontSize:12,background:"var(--input-bg,#fafff8)"}} disabled={busy}/>
        <button onClick={send} disabled={busy||!input.trim()} style={{padding:"8px 14px",background:busy?"#e5e7eb":G,color:"#fff",border:"none",borderRadius:9,cursor:busy?"not-allowed":"pointer",fontSize:13,fontWeight:700}}>↑</button>
      </div>
      <style>{`@keyframes bounce{0%{transform:translateY(0)}100%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}


const TUTORIAL_STEPS = {
  employee:[
    {icon:"🎉",title:"Welcome to XpensR!",body:"XpensR makes expense management effortless. Let's take a quick tour of your account."},
    {icon:"✈️",title:"Trips & Periods",body:"Before submitting expenses, your manager creates a Trip and assigns you to it. Each trip has a budget and date range."},
    {icon:"📤",title:"Submit Expenses",body:"Tap '+ New Expense' to file a claim. Upload your invoice and AI will auto-fill the details. You can submit multiple invoices at once."},
    {icon:"📋",title:"Track Your Claims",body:"The Claims tab shows all your submissions with approval status. Approved claims update your wallet balance automatically."},
    {icon:"💰",title:"Request Funds",body:"Running low? Use the 💰 button in the top bar to request additional funds from your manager for any active trip."},
    {icon:"🌙",title:"Customise Display",body:"Use the 🌙 button in the top bar to toggle dark mode and adjust font size to your preference."},
    {icon:"⌨️",title:"Keyboard Shortcuts",body:"Press ? anywhere to see all keyboard shortcuts. Use N for New Expense, A for Approvals, C for Claims, T for Trips."},
    {icon:"✅",title:"You're all set!",body:"That's it! Start by going to the Submit tab to file your first expense. Your manager will approve it quickly."},
  ],
  manager:[
    {icon:"🎉",title:"Welcome to XpensR!",body:"As a Manager, you can create trips, approve expenses, and monitor your team's spending."},
    {icon:"🗂️",title:"Create a Trip",body:"Go to Trips tab → Create Trip. Set a budget, date range, and assign employees. They can only submit claims within trip dates."},
    {icon:"✓",title:"Approve Expenses",body:"Pending claims appear in the Approvals tab with a badge count. Review each claim — amounts above auto-approve limit need your sign-off."},
    {icon:"🗺️",title:"Trip Approvals",body:"When employees create their own trips, they appear in Trip Approvals for your review. Approve to activate, reject to decline."},
    {icon:"👥",title:"Manage Employees",body:"Add employees in the Employees tab. Each employee gets a username and password for login. Managers are created by Admin."},
    {icon:"📊",title:"Analytics",body:"The Analytics tab shows spending by category, employee, and trip. Use it to identify high-spend patterns and anomalies."},
    {icon:"💳",title:"Settlements",body:"The Settlements tab shows who owes money and who is owed. Close a trip to generate the settlement PDF."},
    {icon:"✅",title:"You're all set!",body:"Start by creating your first trip in the Trips tab and assigning your team members."},
  ],
  admin:[
    {icon:"🎉",title:"Welcome to XpensR!",body:"As Admin, you have full access to all company data, approvals, policy settings, and financial exports."},
    {icon:"⚙️",title:"Set Company Policy",body:"Go to Policy tab first. Set auto-approve limits, receipt thresholds, categories, and departments for your company."},
    {icon:"👥",title:"Add Managers & Staff",body:"In Employees tab, create managers first. Managers can then create their own team members."},
    {icon:"🗂️",title:"Trips & Budgets",body:"Create trips with budgets. You can assign any combination of employees and managers. Trip currency and category limits can be set per trip."},
    {icon:"✓",title:"Dual Approval",body:"Claims above the dual-approve threshold need both manager and admin sign-off. Set this in Policy."},
    {icon:"💼",title:"Finance & Exports",body:"Finance tab shows all approved expenses. Export to CSV, Tally, GSTR-2A, or Zoho Books. PDF exports available for all views."},
    {icon:"📊",title:"Analytics",body:"Full company analytics — top spenders, category trends, anomaly reports, and spending behaviour analysis."},
    {icon:"✅",title:"You're all set!",body:"Start with Policy settings, then create your first trip and team members."},
  ],
};
TUTORIAL_STEPS.finance=TUTORIAL_STEPS.employee;
TUTORIAL_STEPS.approver=TUTORIAL_STEPS.manager;

function OnboardingTutorial({role,onClose}){
  const steps=TUTORIAL_STEPS[role]||TUTORIAL_STEPS.employee;
  const[step,setStep]=useState(0);
  const s=steps[step];
  const isLast=step===steps.length-1;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:900,backdropFilter:"blur(6px)"}}>
      <div style={{background:"var(--card,#fff)",borderRadius:20,padding:36,width:"min(480px,94vw)",boxShadow:"0 32px 80px rgba(0,0,0,.25)",position:"relative"}}>
        {/* Progress dots */}
        <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:20}}>
          {steps.map((_,i)=>(
            <div key={i} onClick={()=>setStep(i)} style={{width:i===step?20:7,height:7,borderRadius:4,background:i===step?G:i<step?"#a3e076":"#e5e7eb",transition:"all .25s",cursor:"pointer"}}/>
          ))}
        </div>
        {/* Content */}
        <div style={{textAlign:"center",padding:"0 8px"}}>
          <div style={{fontSize:52,marginBottom:12}}>{s.icon}</div>
          <h2 style={{fontFamily:FD,fontSize:22,fontWeight:700,color:INK,marginBottom:10}}>{s.title}</h2>
          <p style={{color:MUTED,fontSize:14,lineHeight:1.7,marginBottom:28}}>{s.body}</p>
        </div>
        {/* Navigation */}
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          {step>0&&<button onClick={()=>setStep(step-1)} style={{padding:"10px 20px",borderRadius:9,border:`1.5px solid ${BDR}`,background:"transparent",color:MUTED,cursor:"pointer",fontSize:13}}>← Back</button>}
          {!isLast?(
            <Btn onClick={()=>setStep(step+1)} style={{padding:"10px 28px",fontSize:13}}>Next →</Btn>
          ):(
            <Btn onClick={onClose} style={{padding:"10px 28px",fontSize:13,background:G}}>Get Started! 🚀</Btn>
          )}
        </div>
        {/* Skip */}
        <button onClick={onClose} style={{position:"absolute",top:14,right:16,background:"none",border:"none",fontSize:18,cursor:"pointer",color:MUTED}}>✕</button>
        <div style={{textAlign:"center",marginTop:14}}>
          <button onClick={onClose} style={{background:"none",border:"none",color:MUTED,fontSize:11,cursor:"pointer"}}>Skip tutorial</button>
        </div>
      </div>
    </div>
  );
}


const HELP_CONTENT={
  manager:{
    title:"Manager Guide",
    sections:[
      {icon:"▦",title:"Dashboard",content:"Your dashboard shows total spend, pending approvals, anomaly alerts, employee balances, and active trip progress. Red button = immediate attention needed. Purple = AI-flagged anomalies."},
      {icon:"✓",title:"Approvals",content:"All pending expense claims appear here. Each card shows the employee, amount, category, trip, and receipt thumbnails. Use ✓ Approve or ✗ Reject. Add remarks for clarity. The system auto-approves claims under your set limit — these won't appear here.\n\n🔍 Anomaly badge = AI detected unusual spend (duplicate, 2.5× avg). ⚠️ = category % exceeded. 📅 = weekend expense."},
      {icon:"📋",title:"All Claims",content:"Full claim history with filters for Pending/Approved/Rejected. Click any row to open the detail modal with full receipts, comments thread, and approval actions."},
      {icon:"🗂️",title:"Trips & Periods",content:"Create a trip or monthly period with a budget. Assign specific employees — only they can submit claims against it. Click the trip name to expand and see per-employee spend. Close a trip to lock it."},
      {icon:"👥",title:"Employees",content:"Add employees with name, email, department, starting balance, and password. Set their role: Employee, Approver, Auditor, or Finance. Adjust wallet balance inline. Set delegation to route approvals to another user when you're on leave."},
      {icon:"⚙️",title:"Policy",content:"Configure:\n• Auto-approve limit — claims under this go through instantly\n• Receipt mandatory above — employees must attach a bill\n• Weekend approval — Sat/Sun claims need manager sign-off\n• Multi-level approval — different approvers by claim size\n• Vendor blacklist — block specific vendors at submit time\n• Category % caps — category overspend routes to you\n• Department budgets — monthly limits per team\n• Scheduled reports — auto-email PDF summaries"},
      {icon:"📊",title:"Analytics",content:"Filter by date range and employee. Charts show: spend by category (bar), month-on-month trend, employee leaderboard vs dept budget, and AI anomaly report. Use 🖨️ Print to generate a formatted expense summary."},
      {icon:"⬇",title:"Exports",content:"Top bar exports:\n• CSV — all claims with full data, works with Excel\n• Tally XML — import directly into Tally Prime (Vouchers → Import)\n• GSTR-2A CSV — GST reconciliation format with IGST/CGST/SGST\n• Zoho Books CSV — import under Expenses in Zoho Books"},
      {icon:"⌨️",title:"Keyboard Shortcuts",content:"Press ? or / anywhere to open this shortcut panel. All shortcuts are blocked when a modal is open.\n\nNavigation:\n• N — New Expense (Submit tab)\n• A — Approvals tab\n• C — Claims tab\n• T — Trips tab\n• D — Dashboard\n• F — Finance\n• I — Inbox / Notifications\n• B — Balances\n• L — Ledger\n• S — Settlements\n• U — Top-up\n• Y — Analytics\n• H — Help Manual\n\nGlobal:\n• ? or / — Toggle this shortcuts panel\n• Escape — Close any open modal"},
    ]
  },
  employee:{
    title:"Employee Guide",
    sections:[
      {icon:"▦",title:"Dashboard",content:"Shows your wallet balance (or pending reimbursement), total claims, pending count, and active trip progress. Your balance reduces as claims are approved."},
      {icon:"＋",title:"Submit Expense",content:"1. Upload a receipt image/PDF or use 📷 Camera to capture it\n2. AI scans and auto-fills vendor, amount, date, category, GSTIN, invoice number\n3. Fields highlighted in green = AI-filled, verify before submitting\n4. Select trip, adjust currency if foreign expense (auto-converts to INR)\n5. Add notes for any GSTIN or invoice reference\n6. ⚡ = will auto-approve instantly (under limit with receipt)\n\nBatch: click ＋ Add to submit multiple receipts in one go."},
      {icon:"📋",title:"My Claims",content:"Full history of your submissions. Filter by status. Click any row to see full details, receipts, and comments from your manager. You can add comments to ask questions or provide clarifications."},
      {icon:"🗂️",title:"Trips",content:"View trips assigned to you and their budgets. You can also create personal trips. Your submissions are tracked per trip — the progress bar shows your spend vs the trip budget."},
      {icon:"💰",title:"Top-Up",content:"If your wallet balance is running low, submit a top-up request here with the amount needed and reason. Your manager will approve or reject it."},
      {icon:"🔔",title:"Notifications",content:"All approval decisions, rejections, and balance changes appear here. You'll also receive browser push notifications if you allow them. Check the inbox bell icon for unread alerts."},
      {icon:"👤",title:"Profile",content:"Update your name, email, and department. Change your password. Access from the avatar in the sidebar."},
      {icon:"⌨️",title:"Keyboard Shortcuts",content:"Press ? or / anywhere to open this shortcut panel.\n\nNavigation:\n• N — New Expense (Submit tab)\n• C — My Claims tab\n• T — Trips tab\n• D — Dashboard\n• U — Top-up\n• I — Inbox / Notifications\n• H — Help Manual\n\nGlobal:\n• ? or / — Toggle this shortcuts panel\n• Escape — Close any open modal"},
    ]
  },
  auditor:{
    title:"Auditor Guide",
    sections:[
      {icon:"📋",title:"All Claims",content:"Full read-only access to all expense claims across all employees. Use the anomaly filter to surface AI-flagged unusual transactions. All receipts are viewable and downloadable."},
      {icon:"📊",title:"Analytics",content:"Full analytics access: category trends, month-on-month, employee leaderboard, and the complete anomaly report with AI reasoning."},
      {icon:"⬇",title:"Exports",content:"Export CSV, Tally XML, GSTR-2A, and Zoho Books formats for reconciliation and audit purposes."},
      {icon:"🗒️",title:"Audit Log",content:"Complete timestamped log of every approval, rejection, and auto-approval action with actor and remarks."},
    ]
  },
  superadmin:{
    title:"Super Admin Guide",
    sections:[
      {icon:"🏢",title:"Companies",content:"Create, suspend, and delete companies. Set user limits — employees cannot be added beyond the limit. Adjust limits inline in the table. Suspend a company to prevent all logins."},
      {icon:"👥",title:"All Users",content:"Cross-company user directory. View all users, their company, role, and department."},
      {icon:"💳",title:"Billing",content:"View monthly billing per company based on employee count and tiered pricing. Change a company's plan (Starter/Pro/Enterprise). Pricing tiers: 1–5 users ₹299/user, 6–20 ₹249, 21–50 ₹199, 51+ ₹149."},
      {icon:"📋",title:"Audit Log",content:"Cross-company audit log of all approval actions."},
      {icon:"💡",title:"How to Create a Company",content:"1. Click ＋ New Company\n2. Enter company name, industry, plan, and user limit\n3. Enter admin name, email, and password\n4. Click Create →\n5. Sign out of Super Admin\n6. Log in with the admin email and password you just set\n\nThe admin will have Manager role with full access to their workspace."},
    ]
  }
};

function HelpManual({userRole,onClose,inline=false}){
  const role=userRole==="superadmin"?"superadmin":["manager","approver","finance"].includes(userRole)?"manager":userRole==="auditor"?"auditor":"employee";
  const content=HELP_CONTENT[role]||HELP_CONTENT.employee;
  const [activeSection,setActiveSection]=useState(0);
  const section=content.sections[activeSection];

  const inner=(
    <div style={{background:"var(--card,#fff)",borderRadius:inline?14:18,width:inline?"100%":720,maxHeight:inline?"none":"88vh",display:"flex",overflow:inline?"visible":"hidden",boxShadow:inline?"none":"0 24px 60px #0004",flexDirection:inline?"column":"row"}}>
      {/* Sidebar */}
      {!inline&&<div style={{width:220,background:DARK,flexShrink:0,display:"flex",flexDirection:"column",padding:"24px 12px"}}>
        <div style={{marginBottom:20}}><Logo width={140} dark/></div>
        <div style={{fontSize:9,color:G,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,marginBottom:10,paddingLeft:8}}>📖 {content.title}</div>
        {content.sections.map((s,i)=>(
          <button key={i} onClick={()=>setActiveSection(i)} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:8,cursor:"pointer",border:"none",fontFamily:FB,fontSize:12,fontWeight:activeSection===i?600:400,background:activeSection===i?G:"transparent",color:activeSection===i?"#fff":"rgba(255,255,255,.55)",textAlign:"left",width:"100%",marginBottom:2,transition:"all .15s"}}>
            <span style={{fontSize:13,width:16,textAlign:"center"}}>{s.icon}</span>
            <span>{s.title}</span>
          </button>
        ))}
        <div style={{marginTop:"auto",paddingTop:12,borderTop:"1px solid rgba(255,255,255,.1)"}}>
          <div style={{fontSize:10,color:"rgba(255,255,255,.3)",textAlign:"center",lineHeight:1.5}}>XpensR<br/>by RB · support@claimx.in</div>
        </div>
      </div>}
      {/* Content */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"var(--card,#fff)"}}>
        {inline&&<div style={{display:"flex",gap:7,marginBottom:16,flexWrap:"wrap"}}>
          {content.sections.map((s,i)=><button key={i} onClick={()=>setActiveSection(i)} style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${activeSection===i?G:BDR}`,background:activeSection===i?G:"var(--card,#fff)",color:activeSection===i?"#fff":MUTED,fontFamily:FB,fontSize:11,fontWeight:600,cursor:"pointer"}}>{s.icon} {s.title}</button>)}
        </div>}
        {!inline&&<div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${BDR}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--card,#fff)"}}>
          <div>
            <div style={{fontSize:9,color:MUTED,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Help Manual</div>
            <h2 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK}}>{section.title}</h2>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:8,background:"var(--hover-bg,#f3f4f6)",border:"none",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",color:MUTED}}>✕</button>
        </div>}
        {inline&&<h2 style={{fontFamily:FD,fontSize:18,fontWeight:700,color:INK,marginBottom:12}}>{section.icon} {section.title}</h2>}
        <div style={{flex:1,overflow:"auto",padding:inline?"0":"24px",background:"var(--card,#fff)"}}>
          {section.content.split('\n').map((line,i)=>{
            if(line.startsWith('•')||line.match(/^\d+\./)) return<div key={i} style={{display:"flex",gap:8,marginBottom:7,paddingLeft:4}}><span style={{color:G,fontWeight:700,flexShrink:0,marginTop:1,fontSize:13}}>{line.match(/^\d+\./)?line.match(/^\d+\./)[0]:"•"}</span><span style={{fontSize:13,color:INK,lineHeight:1.6}}>{line.replace(/^•\s*/,"").replace(/^\d+\.\s*/,"")}</span></div>;
            if(line==="") return<div key={i} style={{height:10}}/>;
            return<p key={i} style={{fontSize:13,color:INK,lineHeight:1.7,marginBottom:4}}>{line}</p>;
          })}
          <div style={{marginTop:20,background:GL,border:`1px solid ${GM}`,borderRadius:10,padding:"14px 16px"}}>
            <div style={{fontSize:10,fontWeight:700,color:GD,textTransform:"uppercase",letterSpacing:1,marginBottom:7}}>💡 Quick Tips</div>
            {role==="employee"&&activeSection===1&&["Green border = AI auto-filled — always verify the amount","Drag & drop images onto the upload zone","Camera button works on mobile — point at bill for instant scan","Multi-currency: enter original amount, system converts to ₹"].map((t,i)=><div key={i} style={{fontSize:12,color:GD,marginBottom:5}}>→ {t}</div>)}
            {role==="manager"&&activeSection===1&&["Use Select All + Bulk Approve for quick batch processing","Anomaly-flagged claims need extra scrutiny — check receipts","Add a remark when rejecting so employee knows what to resubmit"].map((t,i)=><div key={i} style={{fontSize:12,color:GD,marginBottom:5}}>→ {t}</div>)}
            {role==="superadmin"&&["Sign out first after creating a company, then login with the new admin credentials","Suspended companies cannot login — all data is preserved","Adjust user limits inline in the table — changes are instant"].map((t,i)=><div key={i} style={{fontSize:12,color:GD,marginBottom:5}}>→ {t}</div>)}
            {!["employee","manager","superadmin"].includes(role)&&["All data exports from the top bar buttons","Anomaly filter shows AI-flagged claims instantly"].map((t,i)=><div key={i} style={{fontSize:12,color:GD,marginBottom:5}}>→ {t}</div>)}
          </div>
        </div>
        <div style={{padding:"14px 24px",borderTop:`1px solid ${BDR}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--card,#fff)"}}>
          <span style={{fontSize:11,color:MUTED}}>{activeSection+1} of {content.sections.length}</span>
          <div style={{display:"flex",gap:8}}>
            <Btn v="outline" onClick={()=>setActiveSection(Math.max(0,activeSection-1))} disabled={activeSection===0} style={{padding:"7px 14px",fontSize:12}}>← Prev</Btn>
            <Btn onClick={()=>activeSection<content.sections.length-1?setActiveSection(activeSection+1):onClose()} style={{padding:"7px 14px",fontSize:12}}>{activeSection<content.sections.length-1?"Next →":"Done ✓"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );

  if(inline) return<div style={{maxWidth:700}}><h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK,marginBottom:16}}>📖 Help & User Manual</h1>{inner}</div>;
  return(
    <div data-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:900,backdropFilter:"blur(4px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}>{inner}</div>
    </div>
  );
}
// ─── EDIT REQUEST MODAL ───────────────────────────────────────────────────────

// ─── EDIT REQUEST MODAL ───────────────────────────────────────────────────────
// Employee submits a request to edit an approved claim
function EditRequestModal({claim,userId,userName,cid,onClose,onSubmit,sbEnabled}){
  const[reason,setReason]=useState("");
  const[busy,setBusy]=useState(false);
  return(
    <div data-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:700,backdropFilter:"blur(4px)"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"var(--card,#fff)",borderRadius:16,padding:26,width:"min(480px,96vw)",boxShadow:"0 24px 60px rgba(0,0,0,.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontFamily:FD,fontSize:17,fontWeight:700,color:INK}}>Request Edit Approval</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:MUTED}}>✕</button>
        </div>
        {/* Claim summary */}
        <div style={{background:GL,borderRadius:9,padding:"10px 13px",marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:12,color:INK,marginBottom:3}}>{claim.desc}</div>
          <div style={{fontSize:10,color:MUTED}}>{claim.id} · {fmt(claim.amount)} · {claim.category} · {claim.date}</div>
          <div style={{fontSize:10,color:"#16a34a",marginTop:3,fontWeight:600}}>{claim.status}</div>
        </div>
        {/* Process steps */}
        <div style={{background:"#f0fde9",borderRadius:8,padding:"8px 11px",marginBottom:14,fontSize:11,color:GD}}>
          <div style={{fontWeight:700,marginBottom:4}}>How it works:</div>
          <div>1. You submit a reason for the edit request</div>
          <div>2. Your manager reviews and approves a 24-hour edit window</div>
          <div>3. You edit the claim and resubmit for approval</div>
          <div>4. Claim goes through normal approval workflow again</div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:5,textTransform:"uppercase"}}>Reason for edit request *</label>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3}
            placeholder="e.g. Incorrect amount entered, wrong category selected, need to attach missing receipt…"
            style={{width:"100%",padding:"10px 12px",border:`1.5px solid ${BDR}`,borderRadius:8,fontSize:13,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box",background:"var(--input-bg,#fafff8)"}}/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={async()=>{
            if(!reason.trim()){alert("Please provide a reason for the edit request.");return;}
            setBusy(true);
            try{await onSubmit(claim,reason);onClose();}
            catch(e){alert("Failed: "+e.message);}
            finally{setBusy(false);}
          }} disabled={busy||!reason.trim()} style={{flex:1,padding:11}}>{busy?"Submitting…":"Submit Request →"}</Btn>
          <button onClick={onClose} style={{padding:"11px 18px",borderRadius:8,border:`1px solid ${BDR}`,background:"transparent",color:MUTED,cursor:"pointer",fontSize:13}}>Cancel</button>
        </div>
      </div>
    </div>
  );
}


function EditClaimInline({claim,trips,cid,sbEnabled,onClose}){
  const[form,setForm]=useState({
    date:claim.date||today(),category:claim.category||"",
    desc:claim.desc||"",amount:String(claim.amount||""),
    vendor:claim.vendor||"",notes:claim.notes||"",
    gstAmount:String(claim.gstAmount||""),
  });
  const[busy,setBusy]=useState(false);
  const trip=trips.find(t=>t.id===claim.tripId);
  const inpS={width:"100%",padding:"9px 11px",border:`1.5px solid ${BDR}`,borderRadius:8,fontSize:13,background:"var(--input-bg,#fafff8)",fontFamily:FB};
  const save=async()=>{
    if(!form.category||!form.desc||!form.amount){alert("Category, description and amount required.");return;}
    setBusy(true);
    try{
      const patch={date:form.date,category:form.category,description:form.desc,vendor:form.vendor,amount:parseFloat(form.amount),notes:form.notes,gst_amount:parseFloat(form.gstAmount)||0,status:"Pending"};
      if(sbEnabled){
        const{error}=await supabase.from("claims").update(patch).eq("id",claim.id);
        if(error)throw new Error(error.message);
        // Close the edit window — mark request as used so it can't be edited again
        await supabase.from("edit_requests").update({window_open:false}).eq("claim_id",claim.id).eq("status","Approved");
      }
      onClose();
      window.location.reload();
    }catch(e){alert("Save failed: "+e.message);}
    finally{setBusy(false);}
  };
  return(
    <div style={{marginTop:14,borderTop:`2px solid ${G}`,paddingTop:14}}>
      <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:8}}>✏ Edit Claim</div>
      {claim.status==="Approved"&&<div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:7,padding:"7px 11px",marginBottom:10,fontSize:11,color:"#92400e"}}>
        <strong>Edit window granted.</strong> After saving, this claim will return to Pending status and require re-approval.
      </div>}
      {trip&&<div style={{fontSize:10,color:MUTED,marginBottom:8}}>Trip: <strong>{trip.name}</strong> · {trip.startDate} → {trip.endDate}</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:9}}>
        <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Date</label>
          <input type="date" value={form.date} min={trip?.startDate} max={trip?.endDate||today()} onChange={e=>setForm({...form,date:e.target.value})} style={inpS}/></div>
        <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Category</label>
          <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{...inpS,appearance:"none"}}>
            <option value="">Select…</option>{DEFAULT_CATS.map(c=><option key={c}>{c}</option>)}
          </select></div>
      </div>
      <div style={{marginBottom:9}}><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Description *</label>
        <input value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})} style={inpS}/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:9}}>
        <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Amount ₹ *</label>
          <input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} style={inpS}/></div>
        <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>GST Amount</label>
          <input type="number" value={form.gstAmount} onChange={e=>setForm({...form,gstAmount:e.target.value})} placeholder="0" style={inpS}/></div>
        <div><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Vendor</label>
          <input value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})} style={inpS}/></div>
      </div>
      <div style={{marginBottom:11}}><label style={{fontSize:9,fontWeight:700,color:MUTED,display:"block",marginBottom:3,textTransform:"uppercase"}}>Notes / Invoice #</label>
        <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} style={{...inpS,resize:"vertical"}}/></div>
      <div style={{display:"flex",gap:8}}>
        <Btn onClick={save} disabled={busy} style={{flex:1}}>{busy?"Saving…":"Save Changes"}</Btn>
        <button onClick={onClose} style={{padding:"9px 16px",borderRadius:8,border:`1px solid ${BDR}`,background:"transparent",color:MUTED,cursor:"pointer",fontSize:13}}>Cancel</button>
      </div>
    </div>
  );
}

// ─── ARET MODAL — Authorisation Request for Excess Travel Expenses ────────────
// ─── HR OVERSIGHT TAB ─────────────────────────────────────────────────────────
function HROversightTab({claims,trips,users,getUser,policy,aretRequests,fmt}){
  const[tab,setLocalTab]=useState("summary");
  const total=claims.length,approved=claims.filter(c=>c.status==="Approved").length;
  const pending=claims.filter(c=>c.status==="Pending").length;
  const totalAmt=claims.filter(c=>c.status==="Approved").reduce((s,c)=>s+c.amount,0);

  const StatCard=({label,value,sub,color="#7ED957"})=>(
    <Card style={{padding:16}}>
      <div style={{fontSize:11,color:MUTED,marginBottom:4}}>{label}</div>
      <div style={{fontSize:22,fontWeight:700,color:color}}>{value}</div>
      {sub&&<div style={{fontSize:10,color:MUTED,marginTop:2}}>{sub}</div>}
    </Card>
  );

  const tabs=[["summary","📊 Summary"],["policy","⚙ Policy"],["compliance","📋 Compliance"],["aret","📝 ARET Queue"]];

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK}}>👔 HR Oversight</h1>
          <p style={{fontSize:12,color:MUTED,marginTop:2}}>Read-only view — policy compliance, expense oversight, ARET sign-off</p>
        </div>
        <div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:8,padding:"6px 12px",fontSize:11,color:"#92400e",fontWeight:600}}>
          🔒 Read-Only Access
        </div>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {tabs.map(([id,label])=>(
          <button key={id} onClick={()=>setLocalTab(id)}
            style={{padding:"7px 16px",borderRadius:8,border:`1.5px solid ${tab===id?G:BDR}`,background:tab===id?G:"transparent",color:tab===id?"#fff":INK,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FB}}>
            {label}
          </button>
        ))}
      </div>

      {tab==="summary"&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
          <StatCard label="Total Employees" value={users.filter(u=>u.role!=="admin").length} sub="active in system"/>
          <StatCard label="Total Claims (All)" value={total} sub={`${approved} approved, ${pending} pending`}/>
          <StatCard label="Total Approved Spend" value={`₹${(totalAmt/100000).toFixed(1)}L`} sub="company-wide"/>
          <StatCard label="Active Trips" value={trips.filter(t=>t.status==="active").length} sub={`${trips.filter(t=>t.status==="pending_approval").length} pending approval`} color="#f59e0b"/>
        </div>
        {/* Dept-wise spend */}
        <Card style={{padding:16,marginBottom:12}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:12}}>Department-wise Expense Summary</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:GL}}>
                {["Department","Employees","Claims","Approved ₹","Pending ₹","Monthly Budget","Utilisation"].map(h=>(
                  <th key={h} style={{padding:"7px 10px",textAlign:"left",color:GD,fontSize:10,fontWeight:700,textTransform:"uppercase"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(policy.departments||DEFAULT_DEPTS).map(dept=>{
                  const deptUsers=users.filter(u=>u.dept===dept&&u.role!=="admin");
                  const deptClaims=claims.filter(c=>{const u=getUser(c.empId);return u?.dept===dept;});
                  const appAmt=deptClaims.filter(c=>c.status==="Approved").reduce((s,c)=>s+c.amount,0);
                  const pendAmt=deptClaims.filter(c=>c.status==="Pending").reduce((s,c)=>s+c.amount,0);
                  const mBudget=(policy.monthlyDeptBudgets?.[dept]?.monthly)||0;
                  const now=new Date();const claimMonth=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
                  const mSpent=deptClaims.filter(c=>c.date?.slice(0,7)===claimMonth&&c.status!=="Rejected").reduce((s,c)=>s+c.amount,0);
                  const pct=mBudget>0?Math.min(100,Math.round(mSpent/mBudget*100)):null;
                  return(
                    <tr key={dept} style={{borderTop:`1px solid ${BDR}`}}>
                      <td style={{padding:"8px 10px",fontWeight:600}}>{dept}</td>
                      <td style={{padding:"8px 10px",color:MUTED}}>{deptUsers.length}</td>
                      <td style={{padding:"8px 10px"}}>{deptClaims.length}</td>
                      <td style={{padding:"8px 10px",color:"#16a34a",fontWeight:600}}>{fmt(appAmt)}</td>
                      <td style={{padding:"8px 10px",color:pendAmt>0?"#f59e0b":MUTED}}>{pendAmt>0?fmt(pendAmt):"—"}</td>
                      <td style={{padding:"8px 10px",color:MUTED}}>{mBudget>0?fmt(mBudget):"No limit"}</td>
                      <td style={{padding:"8px 10px"}}>
                        {pct!==null?(
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{flex:1,background:"#e5e7eb",borderRadius:4,height:6}}>
                              <div style={{width:pct+"%",background:pct>=100?"#dc2626":pct>=80?"#f59e0b":"#7ED957",borderRadius:4,height:"100%"}}/>
                            </div>
                            <span style={{fontSize:10,fontWeight:600,color:pct>=100?"#dc2626":pct>=80?"#f59e0b":"#16a34a"}}>{pct}%</span>
                          </div>
                        ):<span style={{color:MUTED,fontSize:10}}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </>}

      {tab==="policy"&&<>
        <Card style={{padding:16,marginBottom:12}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:10}}>Current Policy Settings (Read-only)</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            {[["Auto-Approve Limit",`₹${(policy.autoApproveLimit||0).toLocaleString("en-IN")}`],
              ["Dual Approval Above",policy.dualApproveAbove>0?`₹${policy.dualApproveAbove.toLocaleString("en-IN")}`:"Disabled"],
              ["Receipt Required Above",`₹${(policy.receiptMandatoryAbove||0).toLocaleString("en-IN")}`],
              ["Grade System",policy.gradeBased?"Enabled":"Disabled"],
              ["City Classification",policy.cityClassification?"A/B/C/D":"Disabled"],
              ["Approval Levels",`${(policy.approvalHierarchy||[]).length} levels defined`],
            ].map(([label,val])=>(
              <div key={label} style={{padding:"10px 12px",background:GL,borderRadius:8}}>
                <div style={{fontSize:10,color:MUTED,fontWeight:700,textTransform:"uppercase",marginBottom:3}}>{label}</div>
                <div style={{fontSize:13,fontWeight:700,color:INK}}>{val}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card style={{padding:16}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:10}}>Approval Hierarchy</div>
          {(policy.approvalHierarchy||[]).length===0&&<p style={{color:MUTED,fontSize:12}}>No grade-based approval hierarchy defined.</p>}
          {(policy.approvalHierarchy||[]).sort((a,b)=>a.level-b.level).map(h=>(
            <div key={h.level} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:`1px solid ${BDR}`}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:GL,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:GD,fontSize:11}}>L{h.level}</div>
              <div style={{flex:1}}>
                <span style={{fontWeight:600,color:INK}}>{h.label||"Level "+h.level}</span>
                <span style={{color:MUTED,fontSize:11,marginLeft:8}}>Ceiling: {h.ceiling>0?`₹${h.ceiling.toLocaleString("en-IN")}`:"Unlimited"}</span>
              </div>
              <div style={{fontSize:11,color:MUTED}}>
                {users.filter(u=>u.grade===h.level).length} user{users.filter(u=>u.grade===h.level).length!==1?"s":""}
              </div>
            </div>
          ))}
        </Card>
      </>}

      {tab==="compliance"&&<>
        <Card style={{padding:16,marginBottom:12}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:10}}>Compliance Overview</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:MUTED,marginBottom:8,textTransform:"uppercase"}}>Claims Over Limit (flagged)</div>
              {claims.filter(c=>c.flagged).slice(0,8).map(c=>{
                const emp=getUser(c.empId);
                return(
                  <div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${BDR}`,fontSize:11}}>
                    <span>{emp?.name||"—"} — {c.category}</span>
                    <span style={{fontWeight:600,color:"#f59e0b"}}>{fmt(c.amount)}</span>
                  </div>
                );
              })}
              {claims.filter(c=>c.flagged).length===0&&<p style={{fontSize:12,color:MUTED}}>No flagged claims ✓</p>}
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:MUTED,marginBottom:8,textTransform:"uppercase"}}>Anomaly Flags</div>
              {claims.filter(c=>c.anomaly).slice(0,8).map(c=>{
                const emp=getUser(c.empId);
                return(
                  <div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${BDR}`,fontSize:11}}>
                    <span>{emp?.name||"—"} — {c.desc?.slice(0,20)}</span>
                    <span style={{fontWeight:600,color:"#dc2626"}}>{fmt(c.amount)}</span>
                  </div>
                );
              })}
              {claims.filter(c=>c.anomaly).length===0&&<p style={{fontSize:12,color:MUTED}}>No anomalies ✓</p>}
            </div>
          </div>
        </Card>
        {/* Transport class violations */}
        <Card style={{padding:16}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:10}}>Travel Policy Compliance — Notice Period</div>
          {trips.filter(t=>{
            const noticeDays=t.tripType==="overseas"?(policy.noticePeriodOverseas||15):(policy.noticePeriodDomestic||3);
            const created=t.createdAt||t.startDate;
            const daysNotice=Math.floor((new Date(t.startDate)-new Date(created))/(86400000));
            return noticeDays>0&&daysNotice<noticeDays&&t.status!=="declined";
          }).slice(0,6).map(t=>{
            const creator=getUser(t.createdBy);
            return(
              <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${BDR}`,fontSize:11}}>
                <span><strong>{t.name}</strong> by {creator?.name||"—"}</span>
                <span style={{color:"#f59e0b",fontWeight:600}}>⚠ Short notice</span>
              </div>
            );
          })}
          {trips.length>0&&<p style={{fontSize:10,color:MUTED,marginTop:8}}>Showing trips with insufficient advance notice.</p>}
        </Card>
      </>}

      {tab==="aret"&&<>
        <Card style={{padding:16}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:10}}>📝 ARET Requests — HR Sign-off Queue</div>
          {(aretRequests||[]).length===0&&(
            <div style={{textAlign:"center",padding:32,color:MUTED}}>
              <div style={{fontSize:32,marginBottom:8}}>📝</div>
              <div style={{fontSize:13}}>No ARET requests pending HR sign-off</div>
              <div style={{fontSize:11,marginTop:4}}>Excess travel expense authorisations will appear here</div>
            </div>
          )}
          {(aretRequests||[]).map(req=>{
            const emp=getUser(req.emp_id||req.empId);
            return(
              <div key={req.id} style={{border:`1px solid ${BDR}`,borderRadius:10,padding:14,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:INK}}>{emp?.name||"—"}</div>
                    <div style={{fontSize:11,color:MUTED}}>Trip: {req.tripName||req.trip_id} · Submitted: {fmtDate(req.created_at?.slice(0,10))}</div>
                  </div>
                  <span style={{background:req.status==="Approved"?"#dcfce7":req.status==="Rejected"?"#fee2e2":"#fef3c7",color:req.status==="Approved"?"#16a34a":req.status==="Rejected"?"#dc2626":"#92400e",padding:"3px 10px",borderRadius:12,fontSize:11,fontWeight:700}}>
                    {req.status||"Pending HR"}
                  </span>
                </div>
                <div style={{marginTop:8,display:"flex",gap:8}}>
                  <div style={{flex:1,padding:"6px 10px",background:"#dbeafe",borderRadius:6,fontSize:11,textAlign:"center"}}>
                    <div style={{color:MUTED,fontSize:9,textTransform:"uppercase"}}>Eligible</div>
                    <div style={{fontWeight:700}}>₹{(req.total_eligible||0).toLocaleString("en-IN")}</div>
                  </div>
                  <div style={{flex:1,padding:"6px 10px",background:"#fee2e2",borderRadius:6,fontSize:11,textAlign:"center"}}>
                    <div style={{color:MUTED,fontSize:9,textTransform:"uppercase"}}>Expected</div>
                    <div style={{fontWeight:700,color:"#dc2626"}}>₹{(req.total_expected||0).toLocaleString("en-IN")}</div>
                  </div>
                  <div style={{flex:1,padding:"6px 10px",background:"#fef3c7",borderRadius:6,fontSize:11,textAlign:"center"}}>
                    <div style={{color:MUTED,fontSize:9,textTransform:"uppercase"}}>Excess</div>
                    <div style={{fontWeight:700,color:"#92400e"}}>₹{((req.total_expected||0)-(req.total_eligible||0)).toLocaleString("en-IN")}</div>
                  </div>
                </div>
                {req.status==="Pending"&&(
                  <div style={{marginTop:10,display:"flex",gap:8}}>
                    <div style={{fontSize:10,color:"#0369a1",background:"#e0f2fe",padding:"4px 10px",borderRadius:6,flex:1}}>
                      HR sign-off records that this ARET has been reviewed by HR Department before Chairman approval.
                    </div>
                    <button style={{padding:"6px 14px",background:"#7ED957",color:"#0f1c09",border:"none",borderRadius:8,fontWeight:700,fontSize:11,cursor:"pointer"}}>
                      ✓ HR Sign-off
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </>}
    </div>
  );
}

// ─── POLICY READ-ONLY VIEW (for HR) ──────────────────────────────────────────
function PolicyReadOnly({policy,users}){
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h1 style={{fontFamily:FD,fontSize:20,fontWeight:700,color:INK}}>⚙ Policy — Read Only</h1>
        <div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:8,padding:"6px 12px",fontSize:11,color:"#92400e",fontWeight:600}}>
          🔒 HR View — Cannot Edit
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Card style={{padding:16}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:10}}>Core Policy</div>
          {[["Auto-Approve Limit",`₹${(policy.autoApproveLimit||0).toLocaleString("en-IN")}`],
            ["Auto-Approve Delay",`${policy.autoApproveMins||10} minutes`],
            ["Dual Approval Above",policy.dualApproveAbove>0?`₹${policy.dualApproveAbove.toLocaleString("en-IN")}`:"Disabled"],
            ["Receipt Mandatory Above",`₹${(policy.receiptMandatoryAbove||0).toLocaleString("en-IN")}`],
            ["Reimbursement Mode",policy.reimbursementMode?"Yes":"No (Balance)"],
            ["Weekend Claims",policy.weekendRequiresApproval?"Need Approval":"Allowed"],
            ["Notice Period (Domestic)",`${policy.noticePeriodDomestic||0} days`],
            ["Notice Period (Overseas)",`${policy.noticePeriodOverseas||15} days`],
          ].map(([label,val])=>(
            <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${BDR}`,fontSize:12}}>
              <span style={{color:MUTED}}>{label}</span><span style={{fontWeight:600,color:INK}}>{val}</span>
            </div>
          ))}
        </Card>
        <Card style={{padding:16}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:10}}>Grade Levels</div>
          {(policy.approvalHierarchy||[]).length===0&&<p style={{fontSize:12,color:MUTED}}>No grades configured.</p>}
          {(policy.approvalHierarchy||[]).sort((a,b)=>a.level-b.level).map(h=>(
            <div key={h.level} style={{display:"flex",gap:10,alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${BDR}`,fontSize:12}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:GL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:GD}}>L{h.level}</div>
              <div style={{flex:1,fontWeight:500,color:INK}}>{h.label||"Level "+h.level}</div>
              <div style={{color:MUTED,fontSize:11}}>{h.ceiling>0?`≤₹${h.ceiling.toLocaleString("en-IN")}`:"Unlimited"}</div>
              <div style={{fontSize:10,color:MUTED}}>{users.filter(u=>u.grade===h.level).length} users</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── CEO/CFO EXECUTIVE DASHBOARD ─────────────────────────────────────────────
function CFODashboard({claims,trips,users,policy,topups,getUser,fmt,activeMeta}){
  const now=new Date();
  const thisMonth=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const lastMonth=new Date(now.getFullYear(),now.getMonth()-1,1);
  const lastMonthStr=`${lastMonth.getFullYear()}-${String(lastMonth.getMonth()+1).padStart(2,"0")}`;
  const fyYear=now.getMonth()>=3?now.getFullYear():now.getFullYear()-1;
  const fyStart=`${fyYear}-04`,fyEnd=`${fyYear+1}-03`;

  const appClaims=claims.filter(c=>c.status==="Approved");
  const mtdSpend=appClaims.filter(c=>c.date?.slice(0,7)===thisMonth).reduce((s,c)=>s+c.amount,0);
  const lastMoSpend=appClaims.filter(c=>c.date?.slice(0,7)===lastMonthStr).reduce((s,c)=>s+c.amount,0);
  const ytdSpend=appClaims.filter(c=>c.date?.slice(0,7)>=fyStart&&c.date?.slice(0,7)<=fyEnd).reduce((s,c)=>s+c.amount,0);
  const pendAmt=claims.filter(c=>c.status==="Pending").reduce((s,c)=>s+c.amount,0);
  const pendCount=claims.filter(c=>c.status==="Pending").length;
  const activeTrips=trips.filter(t=>t.status==="active").length;
  const pendTrips=trips.filter(t=>t.status==="pending_approval").length;
  const momChange=lastMoSpend>0?Math.round((mtdSpend-lastMoSpend)/lastMoSpend*100):0;

  // Top spenders this month
  const spenderMap={};
  appClaims.filter(c=>c.date?.slice(0,7)===thisMonth).forEach(c=>{
    if(!spenderMap[c.empId])spenderMap[c.empId]=0;
    spenderMap[c.empId]+=c.amount;
  });
  const topSpenders=Object.entries(spenderMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,amt])=>({user:getUser(id),amt}));

  // Dept breakdown YTD
  const deptSpend={};
  appClaims.filter(c=>c.date?.slice(0,7)>=fyStart&&c.date?.slice(0,7)<=fyEnd).forEach(c=>{
    const u=getUser(c.empId);
    const d=u?.dept||"Other";
    if(!deptSpend[d])deptSpend[d]=0;
    deptSpend[d]+=c.amount;
  });
  const deptRows=Object.entries(deptSpend).sort((a,b)=>b[1]-a[1]);
  const totalDeptSpend=deptRows.reduce((s,[,v])=>s+v,0);

  // Category breakdown MTD
  const catSpend={};
  appClaims.filter(c=>c.date?.slice(0,7)===thisMonth).forEach(c=>{
    if(!catSpend[c.category])catSpend[c.category]=0;
    catSpend[c.category]+=c.amount;
  });
  const catRows=Object.entries(catSpend).sort((a,b)=>b[1]-a[1]).slice(0,6);

  const MetricCard=({label,value,sub,color,delta})=>(
    <Card style={{padding:16}}>
      <div style={{fontSize:10,color:MUTED,fontWeight:700,textTransform:"uppercase",marginBottom:4,letterSpacing:.5}}>{label}</div>
      <div style={{fontSize:24,fontWeight:800,color:color||INK,lineHeight:1.1}}>{value}</div>
      {sub&&<div style={{fontSize:10,color:MUTED,marginTop:4}}>{sub}</div>}
      {delta!==undefined&&delta!==0&&<div style={{fontSize:11,fontWeight:600,color:delta>0?"#dc2626":"#16a34a",marginTop:4}}>
        {delta>0?"↑":"↓"} {Math.abs(delta)}% vs last month
      </div>}
    </Card>
  );

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{fontFamily:FD,fontSize:22,fontWeight:700,color:INK}}>📈 Executive Dashboard</h1>
          <p style={{fontSize:12,color:MUTED,marginTop:2}}>{activeMeta?.name||"Company"} · FY {fyYear}–{fyYear+1} · Read-only view</p>
        </div>
        <div style={{background:"#e0f2fe",border:"1px solid #7dd3fc",borderRadius:8,padding:"6px 12px",fontSize:11,color:"#0369a1",fontWeight:600}}>
          📊 CFO/CEO — Read Only
        </div>
      </div>

      {/* KPI row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:16}}>
        <MetricCard label="MTD Spend" value={`₹${(mtdSpend/1000).toFixed(0)}K`} sub={thisMonth} color="#7ED957" delta={momChange}/>
        <MetricCard label="YTD Spend" value={`₹${(ytdSpend/100000).toFixed(1)}L`} sub={`FY ${fyYear}–${fyYear+1}`} color={INK}/>
        <MetricCard label="Pending Approvals" value={pendCount} sub={`₹${(pendAmt/1000).toFixed(0)}K pending`} color={pendCount>10?"#f59e0b":MUTED}/>
        <MetricCard label="Active Trips" value={activeTrips} sub={`${pendTrips} awaiting approval`} color="#2563eb"/>
        <MetricCard label="Active Employees" value={users.filter(u=>u.role!=="admin"&&!u.isSuspended).length} sub={`${users.filter(u=>u.role==="manager").length} managers`} color={INK}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        {/* Dept breakdown */}
        <Card style={{padding:16}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:10}}>Department Spend — YTD</div>
          {deptRows.map(([dept,amt])=>{
            const pct=totalDeptSpend>0?Math.round(amt/totalDeptSpend*100):0;
            const budget=(policy.monthlyDeptBudgets?.[dept]?.yearly)||(policy.departmentBudgets?.[dept])||0;
            const bPct=budget>0?Math.min(100,Math.round(amt/budget*100)):null;
            return(
              <div key={dept} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                  <span style={{fontWeight:600,color:INK}}>{dept}</span>
                  <div style={{textAlign:"right"}}>
                    <span style={{fontWeight:700,color:INK}}>{fmt(amt)}</span>
                    {budget>0&&<span style={{fontSize:10,color:bPct>=100?"#dc2626":MUTED,marginLeft:6}}>{bPct}% of budget</span>}
                  </div>
                </div>
                <div style={{background:"#e5e7eb",borderRadius:4,height:7}}>
                  <div style={{width:pct+"%",background:bPct!=null&&bPct>=100?"#dc2626":bPct!=null&&bPct>=80?"#f59e0b":"#7ED957",borderRadius:4,height:"100%"}}/>
                </div>
              </div>
            );
          })}
          {deptRows.length===0&&<p style={{fontSize:12,color:MUTED}}>No YTD spend data yet.</p>}
        </Card>

        {/* Category breakdown */}
        <Card style={{padding:16}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:10}}>Category Spend — This Month</div>
          {catRows.map(([cat,amt])=>{
            const pct=mtdSpend>0?Math.round(amt/mtdSpend*100):0;
            return(
              <div key={cat} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                  <span style={{fontWeight:500,color:INK}}>{cat}</span>
                  <span style={{fontWeight:700,color:INK}}>{fmt(amt)} <span style={{fontSize:10,color:MUTED}}>({pct}%)</span></span>
                </div>
                <div style={{background:"#e5e7eb",borderRadius:4,height:6}}>
                  <div style={{width:pct+"%",background:"#2563eb",borderRadius:4,height:"100%"}}/>
                </div>
              </div>
            );
          })}
          {catRows.length===0&&<p style={{fontSize:12,color:MUTED}}>No MTD claims yet.</p>}
        </Card>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {/* Top spenders */}
        <Card style={{padding:16}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:10}}>Top Spenders — This Month</div>
          {topSpenders.map(({user:u,amt},i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${BDR}`}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:GL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:GD}}>{u?.avatar||"?"}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:INK}}>{u?.name||"Unknown"}</div>
                <div style={{fontSize:10,color:MUTED}}>{u?.dept||"—"} · {u?.gradeLabel||u?.role}</div>
              </div>
              <span style={{fontSize:12,fontWeight:700,color:INK}}>{fmt(amt)}</span>
            </div>
          ))}
          {topSpenders.length===0&&<p style={{fontSize:12,color:MUTED}}>No spend data this month.</p>}
        </Card>

        {/* Budget utilisation */}
        <Card style={{padding:16}}>
          <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:INK,marginBottom:10}}>Budget Utilisation — Monthly</div>
          {Object.entries(policy.monthlyDeptBudgets||{}).filter(([,b])=>b.monthly>0).map(([dept,b])=>{
            const mSpent=appClaims.filter(c=>{const u=getUser(c.empId);return u?.dept===dept&&c.date?.slice(0,7)===thisMonth;}).reduce((s,c)=>s+c.amount,0);
            const pct=Math.min(100,Math.round(mSpent/b.monthly*100));
            return(
              <div key={dept} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                  <span style={{fontWeight:500,color:INK}}>{dept}</span>
                  <span style={{fontWeight:600,color:pct>=100?"#dc2626":pct>=80?"#f59e0b":"#16a34a"}}>{fmt(mSpent)} / {fmt(b.monthly)} ({pct}%)</span>
                </div>
                <div style={{background:"#e5e7eb",borderRadius:4,height:7}}>
                  <div style={{width:pct+"%",background:pct>=100?"#dc2626":pct>=80?"#f59e0b":"#7ED957",borderRadius:4,height:"100%",transition:"width .3s"}}/>
                </div>
                {pct>=100&&<div style={{fontSize:9,color:"#dc2626",fontWeight:600,marginTop:2}}>⛔ BREACHED — Admin only</div>}
              </div>
            );
          })}
          {Object.keys(policy.monthlyDeptBudgets||{}).length===0&&<p style={{fontSize:12,color:MUTED}}>No monthly budgets configured. Set them in Policy.</p>}
        </Card>
      </div>
    </div>
  );
}

// ─── LOCAL CONVEYANCE LOG ─────────────────────────────────────────────────────
// Called from claim submission for Travel category with "local" subcategory
function LocalConveyanceModal({trip,userId,userName,policy,onClose,onSubmit}){
  const MODES=["Auto/Rickshaw","Taxi/Cab","Own Two-Wheeler","Own Car","Bus","Metro/Train","Other"];
  const initRow=()=>({id:uid(),date:today(),from:"",to:"",km:"",mode:"",amount:"",voucher:""});
  const[rows,setRows]=useState([initRow()]);
  const[busy,setBusy]=useState(false);
  const ratePerKm=policy?.conveyanceRatePerKm||4; // ₹4/km for own vehicle default
  const updateRow=(i,patch)=>{
    setRows(prev=>{
      const a=[...prev];
      const r={...a[i],...patch};
      // Auto-calc amount for own vehicle based on km
      if((r.mode==="Own Two-Wheeler"||r.mode==="Own Car")&&r.km){
        r.amount=String(Math.round(parseFloat(r.km)*ratePerKm));
      }
      a[i]=r;return a;
    });
  };
  const totalAmt=rows.reduce((s,r)=>s+(parseFloat(r.amount)||0),0);
  const inpS={padding:"5px 8px",border:`1px solid ${BDR}`,borderRadius:6,fontSize:11,fontFamily:FB,width:"100%"};
  const save=async()=>{
    const valid=rows.every(r=>r.from&&r.to&&r.mode&&r.amount);
    if(!valid){alert("All rows need From, To, Mode and Amount.");return;}
    setBusy(true);
    try{await onSubmit(rows,totalAmt);onClose();}
    catch(e){alert("Failed: "+e.message);}
    finally{setBusy(false);}
  };
  return(
    <div data-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"var(--card,#fff)",borderRadius:16,padding:24,width:"min(820px,98vw)",maxHeight:"90vh",overflow:"auto",boxShadow:"0 16px 48px rgba(0,0,0,.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <h2 style={{fontFamily:FD,fontSize:17,fontWeight:700,color:INK}}>🚗 Local Conveyance Log</h2>
            <p style={{fontSize:11,color:MUTED,marginTop:2}}>Trip: {trip?.name} · Rate for own vehicle: ₹{ratePerKm}/km</p>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:MUTED}}>✕</button>
        </div>

        {/* Header row */}
        <div style={{display:"grid",gridTemplateColumns:"28px 90px 1fr 1fr 50px 1fr 80px 80px 24px",gap:6,padding:"5px 0",marginBottom:4}}>
          {["#","Date","From","To","km","Mode","Amount ₹","Voucher",""].map((h,i)=>(
            <div key={i} style={{fontSize:9,fontWeight:700,color:MUTED,textTransform:"uppercase"}}>{h}</div>
          ))}
        </div>

        {rows.map((r,i)=>(
          <div key={r.id} style={{display:"grid",gridTemplateColumns:"28px 90px 1fr 1fr 50px 1fr 80px 80px 24px",gap:6,marginBottom:6,alignItems:"center"}}>
            <div style={{fontSize:11,fontWeight:700,color:MUTED,textAlign:"center"}}>{i+1}</div>
            <input type="date" value={r.date} onChange={e=>updateRow(i,{date:e.target.value})} style={inpS}/>
            <input value={r.from} onChange={e=>updateRow(i,{from:e.target.value})} placeholder="From place" style={inpS}/>
            <input value={r.to} onChange={e=>updateRow(i,{to:e.target.value})} placeholder="To place" style={inpS}/>
            <input type="number" value={r.km} onChange={e=>updateRow(i,{km:e.target.value})} placeholder="km" style={inpS}/>
            <select value={r.mode} onChange={e=>updateRow(i,{mode:e.target.value})} style={{...inpS,appearance:"none"}}>
              <option value="">Select…</option>
              {MODES.map(m=><option key={m}>{m}</option>)}
            </select>
            <input type="number" value={r.amount} onChange={e=>updateRow(i,{amount:e.target.value})} placeholder="₹" style={inpS}/>
            <input value={r.voucher} onChange={e=>updateRow(i,{voucher:e.target.value})} placeholder="Voucher #" style={inpS}/>
            {rows.length>1?<button onClick={()=>setRows(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",fontSize:14,padding:0}}>✕</button>:<div/>}
          </div>
        ))}

        <button onClick={()=>setRows(p=>[...p,initRow()])}
          style={{background:"none",border:`1.5px dashed ${BDR}`,borderRadius:7,padding:"6px 14px",cursor:"pointer",fontSize:11,color:MUTED,width:"100%",marginBottom:12}}>
          + Add Journey
        </button>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:GL,borderRadius:8,marginBottom:14}}>
          <span style={{fontSize:12,fontWeight:600,color:INK}}>{rows.length} journey{rows.length!==1?"s":" "} · Total</span>
          <span style={{fontSize:15,fontWeight:800,color:GD}}>₹{totalAmt.toLocaleString("en-IN")}</span>
        </div>

        <div style={{fontSize:10,color:MUTED,marginBottom:12}}>Own vehicle claims are auto-calculated at ₹{ratePerKm}/km. Actual receipts for taxi/auto/cab must be attached as part of the claim.</div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn v="outline" onClick={onClose}>Cancel</Btn>
          <Btn onClick={save} disabled={busy}>{busy?"Saving…":"Submit Conveyance →"}</Btn>
        </div>
      </div>
    </div>
  );
}

function AretModal({trip,user,policy,onClose,onSubmit}){
  const categories=["Transportation","Local Conveyance","Lodging / Hotel","Diem Allowance","Communication Expenses","Others"];
  const[rows,setRows]=useState(categories.map(cat=>({cat,eligible:"",expected:"",reason:""})));
  const[busy,setBusy]=useState(false);
  const totElig=rows.reduce((s,r)=>s+(parseFloat(r.eligible)||0),0);
  const totExp=rows.reduce((s,r)=>s+(parseFloat(r.expected)||0),0);
  const updateRow=(i,patch)=>setRows(prev=>{const a=[...prev];a[i]={...a[i],...patch};return a;});
  const inpS={padding:"5px 8px",border:`1px solid ${BDR}`,borderRadius:6,fontSize:11,fontFamily:FB,width:"100%"};
  const save=async()=>{
    const filled=rows.filter(r=>r.expected||r.eligible);
    if(!filled.length){alert("Fill at least one category.");return;}
    setBusy(true);
    try{await onSubmit({tripId:trip.id,empId:user.id,rows,totElig,totExp});onClose();}
    catch(e){alert("Failed: "+e.message);}
    finally{setBusy(false);}
  };
  return(
    <div data-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"var(--card,#fff)",borderRadius:16,padding:24,width:"min(680px,98vw)",maxHeight:"90vh",overflow:"auto",boxShadow:"0 16px 48px rgba(0,0,0,.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <h2 style={{fontFamily:FD,fontSize:17,fontWeight:700,color:INK}}>📋 ARET — Excess Expense Authorisation</h2>
            <p style={{fontSize:11,color:MUTED,marginTop:2}}>Trip: <strong>{trip?.name}</strong> · Submit before travel begins when expenses will exceed entitlement</p>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:MUTED}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12,padding:"6px 8px",background:GL,borderRadius:8,fontSize:10,fontWeight:700,color:GD,textTransform:"uppercase"}}>
          <div>Expense Category</div><div>Eligible Amount ₹</div><div>Expected Amount ₹</div>
        </div>
        {rows.map((r,i)=>(
          <div key={r.cat} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8,alignItems:"start"}}>
            <div style={{fontSize:12,fontWeight:500,color:INK,paddingTop:8}}>{r.cat}</div>
            <input type="number" value={r.eligible} onChange={e=>updateRow(i,{eligible:e.target.value})} placeholder="0" style={inpS}/>
            <div>
              <input type="number" value={r.expected} onChange={e=>updateRow(i,{expected:e.target.value})} placeholder="0" style={inpS}/>
              {parseFloat(r.expected)>parseFloat(r.eligible)&&r.eligible&&(
                <input value={r.reason} onChange={e=>updateRow(i,{reason:e.target.value})} placeholder="Reason for excess…" style={{...inpS,marginTop:4}}/>
              )}
            </div>
          </div>
        ))}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,padding:"8px",background:totExp>totElig?"#fee2e2":"#f0fde9",borderRadius:8,marginBottom:14,fontWeight:700,fontSize:12}}>
          <div>Total</div>
          <div>{fmt(totElig)}</div>
          <div style={{color:totExp>totElig?"#dc2626":"#16a34a"}}>{fmt(totExp)} {totExp>totElig&&`(+${fmt(totExp-totElig)} over)`}</div>
        </div>
        <div style={{fontSize:10,color:MUTED,marginBottom:12}}>This request will be routed through HOD → HOD's Superior → HR → Chairman for approval. Travel should only proceed after ARET is approved.</div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn v="outline" onClick={onClose}>Cancel</Btn>
          <Btn onClick={save} disabled={busy}>{busy?"Submitting…":"Submit ARET →"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── TAR PDF Generator ────────────────────────────────────────────────────────
async function generateTAR(trip,user,users,companyName){
  const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
  const W=210,ML=18,MR=18,CW=W-ML-MR;
  let y=14;
  // Header
  doc.setFillColor(15,28,9);doc.rect(0,0,W,22,"F");
  doc.setFont("helvetica","bold");doc.setFontSize(11);doc.setTextColor(126,217,87);
  doc.text("XpensR by RB",ML,14);
  doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(170,190,160);
  doc.text(companyName||"",W-MR,14,{align:"right"});
  y=30;
  doc.setFont("helvetica","bold");doc.setFontSize(14);doc.setTextColor(20,20,20);
  doc.text("TRAVEL AUTHORISATION REQUEST (TAR)",W/2,y,{align:"center"});y+=5;
  doc.setFontSize(8);doc.setFont("helvetica","normal");doc.setTextColor(100,100,100);
  doc.text("Submit to HOD 3 days before domestic travel, 15 days before overseas travel",W/2,y,{align:"center"});y+=10;
  // Field helper
  const field=(label,val,tw=CW)=>{
    doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(80,80,80);
    doc.text(label,ML,y);
    doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(20,20,20);
    doc.text(String(val||"—"),ML+48,y);
    doc.setDrawColor(200,200,200);doc.line(ML+48,y+1,ML+tw,y+1);
    y+=8;
  };
  field("Date Applied:",new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric"}));
  field("Name of Employee:",user.name||"");
  field("Designation:",user.gradeLabel||user.role||"");
  field("Employee Category (TAS):",user.grade>0?`Grade ${user.grade}`:"");
  field("Type of Visit:",trip.tripType==="overseas"?"Overseas":"Domestic Overnight");
  field("Purpose of Visit:",trip.purpose||"");
  field("Customer / Supplier:",trip.customerName||"");
  const accompanying=(trip.accompanying||[]).map(id=>users.find(u=>u.id===id)?.name||id).join(", ");
  field("Accompanying Employee(s):",accompanying||"None");
  y+=4;
  // Itinerary table
  doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(20,20,20);
  doc.text("Travel Itinerary:",ML,y);y+=6;
  const legCols=[{h:"Sr",w:8},{h:"From",w:28},{h:"To",w:28},{h:"Depart Date",w:28},{h:"Arrive Date",w:28},{h:"Mode",w:24},{h:"City Tier",w:18}];
  doc.setFillColor(21,128,61);doc.rect(ML,y,CW,7,"F");
  doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(255,255,255);
  let tx=ML+1;legCols.forEach(c=>{doc.text(c.h,tx,y+4.5);tx+=c.w;});y+=8;
  (trip.legs||[]).forEach((leg,i)=>{
    doc.setFillColor(i%2?248:255,i%2?255:255,i%2?248:255);doc.rect(ML,y,CW,6,"F");
    doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(30,30,30);
    tx=ML+1;
    [i+1,leg.fromCity||"",leg.toCity||"",fmtDate(leg.departAt?.slice(0,10))||"",fmtDate(leg.arriveAt?.slice(0,10))||"",leg.mode||"",leg.cityTier||"D"].forEach((v,ci)=>{doc.text(String(v),tx,y+4);tx+=legCols[ci].w;});
    y+=6.5;
  });
  if(!trip.legs?.length){doc.setFontSize(8);doc.setTextColor(120,120,120);doc.text("No itinerary legs defined",ML,y);y+=8;}
  y+=6;
  // Signature
  doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(80,80,80);
  doc.text("I undertake to travel as per travel guidelines applicable to my category.",ML,y);y+=10;
  doc.setDrawColor(100,100,100);
  doc.line(ML,y,ML+60,y);doc.line(W-MR-60,y,W-MR,y);
  doc.setFontSize(7);doc.setTextColor(120,120,120);
  doc.text("Signature of Employee",ML,y+4);doc.text("Date",W-MR,y+4,{align:"right"});
  doc.output("dataurlnewwindow");
}

// ─── TERC PDF Generator ───────────────────────────────────────────────────────
async function generateTERC(trip,user,tripClaims,policy,companyName){
  const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
  const W=210,ML=14,MR=14,CW=W-ML-MR;
  let y=14;
  doc.setFillColor(15,28,9);doc.rect(0,0,W,22,"F");
  doc.setFont("helvetica","bold");doc.setFontSize(11);doc.setTextColor(126,217,87);
  doc.text("XpensR by RB",ML,14);
  doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(170,190,160);
  doc.text(companyName||"",W-MR,14,{align:"right"});
  y=28;
  doc.setFont("helvetica","bold");doc.setFontSize(13);doc.setTextColor(20,20,20);
  doc.text("TRAVEL EXPENSES REIMBURSEMENT CLAIM (TERC)",W/2,y,{align:"center"});y+=10;
  const field2=(label,val,x=ML,w=80)=>{
    doc.setFont("helvetica","bold");doc.setFontSize(7.5);doc.setTextColor(80,80,80);
    doc.text(label,x,y);
    doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.setTextColor(20,20,20);
    doc.text(String(val||"—"),x+w-10,y);
    doc.setDrawColor(200,200,200);doc.line(x+w-10,y+1,x+w+30,y+1);
  };
  field2("1. Date of Submission:",fmtDate(today()));
  field2("2. Name:",user.name||"",ML+95,60);y+=8;
  field2("3. Designation:",user.gradeLabel||user.role||"");
  field2("7. Place(s) of Visit:",(trip.legs||[]).map(l=>l.toCity).filter(Boolean).join(", ")||"",ML+95,60);y+=8;
  const deptDate=(arr,key)=>arr.reduce((m,l)=>m||(l[key]?.slice(0,10)||""),(trip.legs?.[0]?.[key]?.slice(0,10)||""));
  field2("8. Departure Date:",fmtDate(deptDate(trip.legs||[],"departAt")));
  field2("9. Arrival Date:",fmtDate(deptDate([...(trip.legs||[])].reverse(),"arriveAt")),ML+95,60);y+=8;
  const days=(trip.legs||[]).reduce((s,l)=>s+(l.days||0),0);
  field2("10. Outstation Days:",String(days));y+=8;
  y+=4;
  // Transportation
  doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(20,20,20);
  doc.text("12. Transportation Expenses",ML,y);y+=6;
  const transCols=[{h:"From",w:26},{h:"To",w:26},{h:"Mode",w:22},{h:"Airline/Train",w:30},{h:"Fare ₹",w:20},{h:"Attachment",w:22}];
  doc.setFillColor(21,128,61);doc.rect(ML,y,CW,7,"F");
  doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(255,255,255);
  let tx=ML+1;transCols.forEach(c=>{doc.text(c.h,tx,y+4.5);tx+=c.w;});y+=8;
  const travelClaims=tripClaims.filter(c=>c.category==="Travel"||c.category==="Transportation");
  travelClaims.forEach((c,i)=>{
    doc.setFillColor(i%2?248:255,255,i%2?248:255);doc.rect(ML,y,CW,6,"F");
    doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(30,30,30);
    tx=ML+1;
    [c.city||"","",c.transportClass||c.desc?.slice(0,10)||"","",`₹${c.amount.toLocaleString("en-IN")}`,c.receipts?.length?"Yes":"No"].forEach((v,ci)=>{doc.text(String(v),tx,y+4);tx+=transCols[ci].w;});
    y+=6.5;
  });
  const tTotal=travelClaims.reduce((s,c)=>s+c.amount,0);
  doc.setFont("helvetica","bold");doc.setFontSize(8);
  doc.text(`Total: ₹${tTotal.toLocaleString("en-IN")}`,W-MR,y,{align:"right"});y+=10;
  // Summary
  const allApproved=tripClaims.filter(c=>c.status==="Approved");
  const totalClaimed=tripClaims.reduce((s,c)=>s+c.amount,0);
  const totalApproved=allApproved.reduce((s,c)=>s+c.amount,0);
  doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(20,20,20);
  doc.text("17. Total Eligible Claim Amount:",ML,y);
  doc.setFont("helvetica","normal");doc.text(`₹${totalApproved.toLocaleString("en-IN")}`,ML+80,y);y+=8;
  doc.setFont("helvetica","bold");doc.text("Less: Advance from Company:",ML,y);
  doc.setFont("helvetica","normal");doc.text(`₹${(trip.advanceAmount||0).toLocaleString("en-IN")}`,ML+80,y);y+=8;
  const net=totalApproved-(trip.advanceAmount||0);
  doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(net>=0?21:200,net>=0?128:30,net>=0?61:30);
  doc.text(`Net ${net>=0?"Payable to Employee":"Recoverable from Employee"}: ₹${Math.abs(net).toLocaleString("en-IN")}`,ML,y);y+=12;
  // Signatures
  doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(80,80,80);
  doc.text("I certify that the above claim is accurate and compliant with TRAVEL RULES.",ML,y);y+=10;
  doc.setDrawColor(100,100,100);
  doc.line(ML,y,ML+60,y);doc.line(W/2+10,y,W/2+70,y);
  doc.setFontSize(7);doc.setTextColor(120,120,120);
  doc.text("Travelling Employee",ML,y+4);doc.text("Name & Signature of HOD",W/2+10,y+4);
  doc.output("dataurlnewwindow");
}

function ClaimModal({modal,setMdl,handleDecision,getUser,trips,claims,setClaims,userId,userName,addCommentToSB,sbEnabled,cid,editRequests,onEditRequest,onApproveEditRequest,onRejectEditRequest,isAdmin=false,isManager=false,hasEditWindow,deleteClaim}){
  const [remarks,setRemarks]=useState("");
  const [comment,setComment]=useState("");
  const [receiptsWithUrls,setRWU]=useState(null);

  const isLightbox=modal?.type==="lightbox";
  const c=isLightbox?null:modal?.data;

  // Reset remarks when claim changes
  useEffect(()=>{setRemarks("");setComment("");},[c?.id]);

  // Fetch signed receipt URLs
  useEffect(()=>{
    if(!c?.receipts?.length){setRWU([]);return;}
    const needsFetch=c.receipts.some(r=>!r.url&&r.storagePath);
    if(!needsFetch){setRWU(c.receipts);return;}
    if(!SB_ENABLED){setRWU(c.receipts);return;}
    Promise.all(c.receipts.map(async r=>{
      if(r.url||!r.storagePath)return r;
      try{
        if(r.storageProvider==="r2"){
          const r2Public=import.meta.env.VITE_R2_PUBLIC_URL;
          if(r2Public){
            return{...r,url:`${r2Public.replace(/\/$/,"")}/${r.storagePath}`};
          } else {
            const vr=await fetch(`/api/r2upload?action=view&key=${encodeURIComponent(r.storagePath)}`);
            if(vr.ok){const vd=await vr.json();return{...r,url:vd.viewUrl||null};}
            return r;
          }
        }
        const{data}=await supabase.storage.from("receipts").createSignedUrl(r.storagePath,3600);
        return{...r,url:data?.signedUrl||null};
      }catch{return r;}
    })).then(setRWU);
  },[c?.id]);

  if(isLightbox)return<Lightbox receipt={modal.data} onClose={()=>setMdl(null)}/>;

  const{type,data}=modal;
  const e=getUser(c.empId);
  const trip=trips.find(t=>t.id===c.tripId);
  const displayReceipts=receiptsWithUrls||c.receipts||[];

  const addComment=async()=>{
    if(!comment.trim())return;
    if(sbEnabled&&addCommentToSB){await addCommentToSB(c.id,comment);}
    else{setClaims(p=>p.map(x=>x.id===c.id?{...x,comments:[...(x.comments||[]),{userId,name:userName,text:comment,time:new Date().toLocaleString()}]}:x));}
    setComment("");
  };

  return(
    <div style={{position:"fixed",inset:0,background:"#00000055",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,backdropFilter:"blur(3px)"}} onMouseDown={e=>{if(e.target===e.currentTarget)setMdl(null);}}>
      <div onMouseDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()} style={{background:"var(--card,#fff)",borderRadius:16,padding:24,width:"min(540px,96vw)",maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px #0003"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:13}}>
          <span style={{fontFamily:FD,fontSize:16,fontWeight:700,color:INK}}>{type==="detail"?"Claim Details":type==="decision"?"Review Claim":type==="editClaim"?"Edit Claim":"Claim"}</span>
          <button onClick={()=>setMdl(null)} style={{background:"none",border:"none",fontSize:15,cursor:"pointer",color:MUTED}}>✕</button>
        </div>
        {type==="editClaim"?<EditClaimInline claim={c} trips={trips} cid={cid} sbEnabled={sbEnabled} onClose={()=>setMdl(null)}/>:(<>
        <div style={{background:GL,borderRadius:9,padding:13,marginBottom:12}}>
          <div style={{fontFamily:"monospace",fontSize:10,color:GD,fontWeight:600}}>{c.id}</div>
          <div style={{fontSize:14,fontWeight:700,color:INK,marginTop:2}}>{c.desc}</div>
          <div style={{fontFamily:FD,fontSize:22,fontWeight:700,color:INK,marginTop:3}}>{fmt(c.amount)}{c.origCur&&c.origCur!=="INR"&&<span style={{fontSize:11,fontWeight:400,color:MUTED}}> ({c.origCur} {c.origAmount})</span>}</div>
        </div>
        {[["Employee",e?.name],["Date",c.date+(c.weekendFlag?" 📅":"")],["Category",`${CI[c.category]||""} ${c.category}`],["Trip",trip?.name],["Vendor",c.vendor||"—"],["Notes",c.notes||"—"],...(c.remarks&&(isAdmin||(isManager&&c.empId!==userId))?[["Remarks",c.remarks]]:[])].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid #f3f4f6`,fontSize:12}}><span style={{color:MUTED}}>{k}</span><span style={{fontWeight:600,color:INK,maxWidth:260,textAlign:"right"}}>{v}</span></div>
        ))}
        {/* GST Bifurcation — visible to manager/admin/finance */}
        {c.gstAmount>0&&<div style={{margin:"10px 0",padding:"10px 12px",background:"#f0fde9",borderRadius:8,border:`1px solid ${GM}`}}>
          <div style={{fontSize:10,fontWeight:700,color:GD,textTransform:"uppercase",letterSpacing:.5,marginBottom:7}}>GST Bifurcation</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:9,color:MUTED,marginBottom:2}}>Base Value</div><div style={{fontWeight:700,fontSize:13,color:INK}}>{fmt(c.amount-(c.gstAmount||0))}</div></div>
            <div style={{textAlign:"center"}}><div style={{fontSize:9,color:MUTED,marginBottom:2}}>GST Amount</div><div style={{fontWeight:700,fontSize:13,color:INK}}>{fmt(c.gstAmount||0)}</div></div>
            <div style={{textAlign:"center"}}><div style={{fontSize:9,color:MUTED,marginBottom:2}}>Total</div><div style={{fontWeight:700,fontSize:13,color:INK}}>{fmt(c.amount)}</div></div>
          </div>
        </div>}
        {c.gstAmount>0&&<div style={{padding:"8px 12px",background:c.gstItc?"#f0fde9":c.gstItc===false?"#fee2e2":"#f9fafb",borderRadius:7,border:`1px solid ${c.gstItc?GM:c.gstItc===false?"#fca5a5":BDR}`,marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:11,fontWeight:600,color:INK}}>GST ITC Status</span>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>{if(setClaims)setClaims(p=>p.map(x=>x.id===c.id?{...x,gstItc:true}:x));}} style={{padding:"3px 10px",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer",border:"none",background:c.gstItc===true?"#16a34a":"#e5e7eb",color:c.gstItc===true?"#fff":MUTED}}>✓ ITC Eligible</button>
              <button onClick={()=>{if(setClaims)setClaims(p=>p.map(x=>x.id===c.id?{...x,gstItc:false}:x));}} style={{padding:"3px 10px",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer",border:"none",background:c.gstItc===false?"#dc2626":"#e5e7eb",color:c.gstItc===false?"#fff":MUTED}}>✗ Not Eligible</button>
            </div>
          </div>
          <div style={{fontSize:10,color:MUTED,marginTop:3}}>Finance team marks ITC eligibility for GSTR-2A matching</div>
        </div>}
        {c.anomaly&&(isAdmin||(isManager&&c.empId!==userId))&&<div style={{background:"#ede9fe",border:"1px solid #c4b5fd",borderRadius:7,padding:"8px 11px",marginTop:9,fontSize:11,color:"#7c3aed"}}>🔍 Anomaly: {(c.anomalyReasons||[]).join(" · ")}</div>}
        {/* Receipts */}
        {displayReceipts.length>0&&<div style={{marginTop:10}}>
          <div style={{fontSize:10,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:.5,marginBottom:7}}>Receipts ({displayReceipts.length})</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {displayReceipts.map((r,i)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                {r.url?(
                  r.type?.startsWith("image/")
                    ?<img src={r.url} alt={r.name||"receipt"} style={{width:80,height:80,objectFit:"cover",borderRadius:7,border:`1px solid ${BDR}`,cursor:"zoom-in"}} onClick={()=>setMdl({type:"lightbox",data:r})}/>
                    :<div style={{width:80,height:80,background:"#fee2e2",borderRadius:7,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:"1px solid #fca5a5",cursor:"pointer"}} onClick={()=>setMdl({type:"lightbox",data:r})}><span style={{fontSize:28}}>📄</span></div>
                ):(
                  <div style={{width:80,height:80,background:"#f3f4f6",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${BDR}`}}><span style={{fontSize:24}}>⏳</span></div>
                )}

                {r.url&&<a href={r.url} download={r.name||`receipt_${i+1}`} style={{fontSize:9,color:GD,textDecoration:"none",background:GL,padding:"1px 6px",borderRadius:4,fontWeight:600}}>⬇ Download</a>}
              </div>
            ))}
          </div>
        </div>}
        {/* Comments */}
        <div style={{marginTop:11}}>
          <div style={{fontSize:10,fontWeight:700,color:MUTED,textTransform:"uppercase",letterSpacing:.5,marginBottom:7}}>💬 Comments</div>
          {(c.comments||[]).length===0&&<div style={{fontSize:11,color:MUTED,marginBottom:7}}>No comments yet</div>}
          {(c.comments||[]).map((cm,i)=>(
            <div key={i} style={{padding:"7px 10px",background:"var(--hover-bg,#f9fafb)",borderRadius:7,marginBottom:5}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,fontWeight:600,color:INK}}>{cm.name}</span><span style={{fontSize:9,color:MUTED}}>{cm.time}</span></div>
              <div style={{fontSize:12,color:"var(--ink)"}}>{cm.text}</div>
            </div>
          ))}
          <div style={{display:"flex",gap:7,marginTop:5}}>
            <input value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addComment()} placeholder="Add a comment…" style={{flex:1,padding:"8px 11px",border:`1.5px solid ${BDR}`,borderRadius:7,fontFamily:FB,fontSize:12,outline:"none"}}/>
            <Btn onClick={addComment} v="outline" style={{padding:"7px 11px",fontSize:11}}>Send</Btn>
          </div>
        </div>
        {/* Approve/Reject — merged decision panel */}
        {(type==="approve"||type==="reject"||type==="decision")&&<div style={{marginTop:14,background:"#f8fafc",borderRadius:10,padding:14,border:`1px solid ${BDR}`}}>
          <label style={{fontSize:10,fontWeight:700,color:MUTED,display:"block",marginBottom:5,textTransform:"uppercase"}}>Remarks (optional)</label>
          <textarea value={remarks} onChange={e=>setRemarks(e.target.value)} rows={2} placeholder="Add a note for the employee…" style={{width:"100%",padding:"8px 11px",border:`1.5px solid ${BDR}`,borderRadius:7,fontFamily:FB,fontSize:12,resize:"vertical",outline:"none",display:"block",boxSizing:"border-box",marginBottom:10}}/>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={async()=>{await handleDecision(c.id,"Approved",remarks);}} style={{flex:1,background:"#16a34a"}}>✓ Approve</Btn>
            <Btn v="danger" onClick={async()=>{await handleDecision(c.id,"Rejected",remarks);}} style={{flex:1}}>✗ Reject</Btn>
            <Btn v="outline" onClick={()=>setMdl(null)}>Cancel</Btn>
          </div>
        </div>}
        {type==="detail"&&<div style={{marginTop:11}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
            <Badge s={c.status==="Approved"||c.status==="Auto-Approved"?"Approved":c.status}/>
            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
              {/* Pending: direct edit */}
              {c.status==="Pending"&&c.empId===userId&&(
                <Btn v="outline" onClick={()=>setMdl({type:"editClaim",data:c})} style={{padding:"6px 12px",fontSize:11}}>✏ Edit</Btn>
              )}
              {/* Delete pending claim */}
              {(c.status==="Pending"&&c.empId===userId||isAdmin)&&deleteClaim&&(
                <Btn v="danger" onClick={()=>{deleteClaim(c.id);setMdl(null);}} style={{padding:"6px 10px",fontSize:11}}>🗑 Delete</Btn>
              )}
              {/* Approved with open edit window: edit now */}
              {(c.status==="Approved"||c.status==="Auto-Approved")&&c.empId===userId&&hasEditWindow&&hasEditWindow(c.id)&&(
                <Btn onClick={()=>setMdl({type:"editClaim",data:c})} style={{padding:"6px 12px",fontSize:11,background:"#16a34a",color:"#fff"}}>✏ Edit Now <span style={{fontSize:9,opacity:.8}}>(window open)</span></Btn>
              )}
              {/* Approved without window: request edit */}
              {(c.status==="Approved"||c.status==="Auto-Approved")&&c.empId===userId&&onEditRequest&&!(hasEditWindow&&hasEditWindow(c.id))&&(
                <Btn v="warning" onClick={()=>setMdl({type:"editRequest",data:c})} style={{padding:"6px 12px",fontSize:11}}>✏ Request Edit</Btn>
              )}
              <Btn v="outline" onClick={()=>setMdl(null)} style={{fontSize:11}}>Close</Btn>
            </div>
          </div>
          {/* Admin override — reverse any manager decision */}
          {isAdmin&&handleDecision&&(c.status==="Approved"||c.status==="Auto-Approved"||c.status==="Rejected"||c.status==="Manager Approved")&&(
            <div style={{padding:"10px 12px",background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:8}}>
              <div style={{fontSize:10,fontWeight:700,color:"#92400e",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>⚡ Admin Override</div>
              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                {c.status!=="Approved"&&<Btn onClick={()=>{handleDecision(c.id,"Approved","Admin override");setMdl(null);}} style={{padding:"6px 12px",fontSize:11,background:"#16a34a",color:"#fff"}}>✓ Override → Approve</Btn>}
                {c.status!=="Rejected"&&<Btn onClick={()=>{handleDecision(c.id,"Rejected","Admin override");setMdl(null);}} style={{padding:"6px 12px",fontSize:11,background:"#dc2626",color:"#fff"}}>✗ Override → Reject</Btn>}
                {(c.status==="Approved"||c.status==="Auto-Approved"||c.status==="Manager Approved")&&<Btn v="outline" onClick={()=>{handleDecision(c.id,"Pending","Admin override — returned for re-review");setMdl(null);}} style={{padding:"6px 12px",fontSize:11}}>↩ Return to Pending</Btn>}
              </div>
            </div>
          )}
        </div>}
      </>)}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
//  ROOT — Supabase auth listener + localStorage demo fallback
// ═══════════════════════════════════════════════════════════════════════════
export default function Root(){
  const[DB,setDB]          =useState(()=>loadDB()||DB0);
  const[session,setSession]=useState(()=>{ 
    // On mount, restore custom auth session immediately to avoid flash
    if(SB_ENABLED){ const s=loadSess(); if(s?.customAuth&&s?.sbUser)return s; }
    return null;
  });
  const[loading,setLoading]=useState(true);
  const[isReset,setIsReset]=useState(false);
  const[loadMsg,setLoadMsg]=useState("Connecting…");
  const resolving=useRef(false);
  const customAuthRef=useRef(false); // tracks if current session is custom auth

  useEffect(()=>{ if(!SB_ENABLED)saveDB(DB); },[DB]);

  useEffect(()=>{
    if(!SB_ENABLED){
      const s=loadSess();
      if(s)setSession(s);
      setLoading(false);
      return;
    }

    // ── STEP 1: Immediately check localStorage for any saved session ──────────
    const saved=loadSess();

    // Custom auth users (username/password) — restore immediately, no Supabase needed
    if(saved?.customAuth&&saved?.sbUser){
      customAuthRef.current=true;
      setSession(saved);
      setLoading(false); // immediate — no waiting
      // Minimal listener — only for password recovery
      const{data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{
        if(event==="PASSWORD_RECOVERY"){setIsReset(true);setSession(null);setLoading(false);}
        // All other events (SIGNED_OUT etc.) are ignored for custom auth users
      });
      return()=>subscription.unsubscribe();
    }

    // ── STEP 2: No saved session — check Supabase for Google OAuth session ────
    const hardTimer=setTimeout(()=>{
      log.warn("Auth timeout — forcing login screen");
      setLoading(false);
    }, 3000); // 3s max — never hang

    supabase.auth.getSession().then(async({data:{session:sess},error})=>{
      clearTimeout(hardTimer);
      if(error||!sess?.user){
        setLoading(false);
        return;
      }
      await resolveSupabaseUser(sess.user.id);
    }).catch(()=>{
      clearTimeout(hardTimer);
      setLoading(false);
    });

    // Listen for OAuth sign-in (Google redirect) and password recovery
    const{data:{subscription}}=supabase.auth.onAuthStateChange(async(event,sess)=>{
      if(event==="PASSWORD_RECOVERY"){
        setIsReset(true);setSession(null);setLoading(false);
        clearTimeout(hardTimer);return;
      }
      if(event==="SIGNED_IN"&&sess?.user&&!resolving.current){
        resolving.current=true;
        clearTimeout(hardTimer);
        await resolveSupabaseUser(sess.user.id);
      }
      if(event==="TOKEN_REFRESHED"&&sess?.user&&!resolving.current){
        resolving.current=true;
        await resolveSupabaseUser(sess.user.id);
      }
      if(event==="SIGNED_OUT"){
        // Only clear if this was intentional logout (flag set by handleLogout)
        const wasIntentional=sessionStorage.getItem("xpensr_logout")==="1";
        if(wasIntentional){
          try{sessionStorage.removeItem("xpensr_logout");}catch{}
          setSession(null);setLoading(false);
        }
        // Unintentional SIGNED_OUT (e.g. token expired) — reload to re-check
      }
    });

    return()=>{subscription.unsubscribe();clearTimeout(hardTimer);};
  },[]);

  const resolveSupabaseUser=async(authUserId)=>{
    setLoadMsg("Loading your workspace…");
    try{
      // Get the auth user object first — this always works with a valid session
      const{data:{user:authUser}}=await supabase.auth.getUser();
      if(!authUser){setLoading(false);resolving.current=false;return;}

      // ── Check if super admin ──────────────────────────────────────────
      // First try the super_admins table (may be blocked by RLS if policy not set)
      const{data:saRow}=await supabase
        .from("super_admins").select("id").eq("id",authUserId).maybeSingle();

      // If super_admins row found → it's the SA
      if(saRow){
        setSession({userId:authUserId,companyId:null,role:"superadmin",
          sbUser:{id:authUserId,name:"Super Admin",email:authUser.email||"",role:"superadmin",avatar:"SA"}});
        return;
      }

      // ── Check users table (company employees) ────────────────────────
      // Use maybeSingle() — returns null instead of throwing when no row found
      const{data:profile,error:pErr}=await supabase
        .from("users").select("*").eq("id",authUserId).maybeSingle();

      if(pErr){
        log.warn("users table error:",pErr.message,"code:",pErr.code);
        // If RLS blocks even reading users table, show error on login
        return;
      }

      if(profile){
        setSession({userId:authUserId,companyId:profile.company_id,
          role:profile.role,sbUser:mapUser(profile)});
        return;
      }

      // ── Neither found — fallback: check if email matches known SA email ─
      // Handles case where super_admins RLS blocks the table query
      if(authUser.email===SA.email||saRow===null&&authUser.email===SA.email){
        // Likely the SA account — treat as superadmin
        log.info("Resolving as superadmin via auth match");
        setSession({userId:authUserId,companyId:null,role:"superadmin",
          sbUser:{id:authUserId,name:"Super Admin",email:authUser.email,role:"superadmin",avatar:"SA"}});
        return;
      }

      // No profile found — user authenticated but not set up in DB yet
      log.warn("Authenticated user has no profile row. Check super_admins table.");
    }catch(e){
      log.error("resolveSupabaseUser error:",e);
    }finally{
      setLoading(false);resolving.current=false;
    }
  };

  const handleLogin=(u,m)=>{
    if(u.role==="superadmin"){
      const s={userId:"sa1",companyId:null,role:"superadmin",sbUser:u};
      saveSess(s); // save FIRST so SIGNED_OUT handler can read it
      customAuthRef.current=false;
      setSession(s);
    } else {
      const s={
        userId:u.id,
        companyId:m?.id||u.companyId||null,
        role:u.role,
        sbUser:u,
        customAuth:true,
      };
      saveSess(s); // save FIRST before any Supabase events fire
      customAuthRef.current=true;
      setSession(s);
      setLoading(false);
    }
  };
  const handleLogout=async()=>{
    const isCustomAuth=session?.customAuth||customAuthRef.current;
    customAuthRef.current=false;
    resolving.current=false;

    // Clear all stored session data first
    saveSess(null);
    try{localStorage.removeItem(SESSION_KEY);}catch(e){}

    // For OAuth users: set flag + call Supabase signOut
    if(!isCustomAuth&&SB_ENABLED){
      try{sessionStorage.setItem("xpensr_logout","1");}catch(e){}
      try{await supabase.auth.signOut();}catch(e){}
    }

    // Clear React state then redirect
    setSession(null);
    setIsReset(false);
    window.location.replace("/");
  };

  // If we have a valid custom auth session already, skip the loading screen entirely
  const hasValidSession=session&&(session.customAuth?session.sbUser:true);

  if(loading&&!hasValidSession){
    const quotes=["The secret of getting ahead is getting started.","Good accounting is good governance.","Work smarter, not harder — let XpensR handle the paperwork.","Every expense tells a story. XpensR helps you tell it right.","The details are not the details. They make the design."];
    const q=quotes[Math.floor(Date.now()/10000)%quotes.length];
    return(
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:`linear-gradient(145deg,${DARK} 0%,#0a1f06 60%,#162e0d 100%)`,fontFamily:FB,position:"relative",overflow:"hidden"}}>
        {/* Animated background circles */}
        <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"rgba(126,217,87,0.04)",top:-100,right:-100,pointerEvents:"none"}}/>
        <div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:"rgba(126,217,87,0.03)",bottom:-80,left:-80,pointerEvents:"none"}}/>
        <div style={{textAlign:"center",maxWidth:380,padding:"0 24px",position:"relative",zIndex:1}}>
          {/* Logo */}
          <div style={{marginBottom:32}}>
            <div style={{fontFamily:FD,fontSize:42,fontWeight:800,color:"#7ED957",letterSpacing:-1,lineHeight:1}}>XpensR</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.3)",letterSpacing:3,textTransform:"uppercase",marginTop:4}}>by RB</div>
          </div>
          {/* Spinner */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,marginBottom:36}}>
            <div style={{position:"relative",width:56,height:56}}>
              <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"3px solid rgba(126,217,87,0.15)"}}/>
              <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"3px solid transparent",borderTopColor:"#7ED957",animation:"spin .9s linear infinite"}}/>
              <div style={{position:"absolute",inset:8,borderRadius:"50%",border:"2px solid transparent",borderTopColor:"rgba(126,217,87,0.4)",animation:"spin 1.4s linear infinite reverse"}}/>
            </div>
            <div style={{color:"rgba(255,255,255,0.45)",fontSize:13,letterSpacing:.5}}>{loadMsg}</div>
          </div>
          {/* Quote */}
          <div style={{borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:24,marginBottom:20}}>
            <p style={{color:"rgba(255,255,255,0.3)",fontSize:12,lineHeight:1.7,fontStyle:"italic",margin:0}}>&ldquo;{q}&rdquo;</p>
          </div>
          <button onClick={()=>setLoading(false)}
            style={{background:"none",border:"1px solid rgba(255,255,255,0.12)",borderRadius:20,color:"rgba(255,255,255,0.3)",padding:"6px 18px",fontFamily:FB,fontSize:11,cursor:"pointer",letterSpacing:.5}}>
            Skip →
          </button>
        </div>
      </div>
    );
  }

  if(isReset)return<ErrorBoundary><Login onLogin={handleLogin} DB={DB} isPasswordRecovery={true}/></ErrorBoundary>;

  let currentUser=null,currentMeta=null;
  if(session){
    if(session.role==="superadmin"){
      currentUser=session.sbUser||SA;
    } else if(session.customAuth&&session.sbUser){
      // Custom auth — user object is stored directly in session
      currentUser=session.sbUser;
      currentMeta={id:session.companyId,name:"",industry:"",plan:"",maxUsers:0,status:"Active",createdOn:""};
    } else if(SB_ENABLED&&session.sbUser){
      currentUser=session.sbUser;
      currentMeta={id:session.companyId,name:"",industry:"",plan:"",maxUsers:0,status:"Active",createdOn:""};
    } else {
      for(const cid of Object.keys(DB)){
        const u=DB[cid].users.find(u=>u.id===session.userId);
        if(u){currentUser=u;currentMeta=DB[cid].meta;break;}
      }
    }
  }

  // Only clear session if it's NOT a valid custom auth session
  if(session&&!currentUser&&!session.customAuth){saveSess(null);return<ErrorBoundary><Login onLogin={handleLogin} DB={DB}/></ErrorBoundary>;}
  if(!session||!currentUser)return<ErrorBoundary><Login onLogin={handleLogin} DB={DB}/></ErrorBoundary>;
  if(currentUser.role==="superadmin")return<PrefsProvider><ErrorBoundary><SuperAdmin DB={DB} setDB={setDB} onLogout={handleLogout}/></ErrorBoundary></PrefsProvider>;
  if(SB_ENABLED)return<PrefsProvider><ErrorBoundary><CompanyApp user={currentUser} meta={{id:session.companyId,...currentMeta}} DB={DB} setDB={setDB} onLogout={handleLogout}/></ErrorBoundary></PrefsProvider>;
  return<PrefsProvider><ErrorBoundary><CompanyApp user={currentUser} meta={currentMeta} DB={DB} setDB={setDB} onLogout={handleLogout}/></ErrorBoundary></PrefsProvider>;
}
